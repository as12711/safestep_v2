"""Unit tests for the P1-1 verified-community-report ingest in risk_service.py.

Covers the pure JSON->Incident mapping (_reports_to_incidents) and the module
constants that define the coarse, non-granular severity model (agent-context
§2.1). No live network / Supabase: the async fetch path builds on this same
pure helper, so testing the helper exercises the real conversion logic.

Time handling: rows are timestamped relative to now() and placed well inside
(or outside) the window, never on the boundary, to avoid microsecond flakiness.
"""

from datetime import datetime, timedelta

import pytest

from routing.risk_service import (
    Incident,
    RiskService,
    _reports_to_incidents,
    _require_schema,
    COMMUNITY_SEVERITY,
    COMMUNITY_DEFAULT_SEVERITY,
    COMMUNITY_WINDOW_DAYS,
    REQUIRED_COMMUNITY_FIELDS,
)


def _ms(dt: datetime) -> int:
    """Epoch milliseconds for a datetime, matching the app's Date.now() writes."""
    return int(dt.timestamp() * 1000)


def _row(report_type="dark", lat=40.7300, lng=-73.9950, ts=None, id="r1", when=None):
    """Build a PostgREST reports row. `when` (a datetime) sets ts if given."""
    if ts is None:
        ts = _ms(when if when is not None else datetime.now() - timedelta(hours=1))
    return {"id": id, "type": report_type, "lat": lat, "lng": lng, "ts": ts}


# A cutoff comfortably in the past so fresh test rows are always inside it.
def _default_cutoff():
    return datetime.now() - timedelta(days=COMMUNITY_WINDOW_DAYS)


# =========================================
# _reports_to_incidents -- field mapping
# =========================================

class TestReportsToIncidents:
    def test_parses_basic_fields_and_source(self):
        rows = [_row(report_type="dark", lat=40.7301, lng=-73.9951, id="abc")]
        incidents = _reports_to_incidents(rows, _default_cutoff())
        assert len(incidents) == 1
        inc = incidents[0]
        assert isinstance(inc, Incident)
        assert inc.id == "abc"
        assert inc.type == "dark"
        assert inc.lat == 40.7301
        assert inc.lng == -73.9951
        assert inc.source == "community"

    def test_ts_ms_converts_to_datetime(self):
        when = datetime.now() - timedelta(hours=2)
        rows = [_row(when=when)]
        incidents = _reports_to_incidents(rows, _default_cutoff())
        assert len(incidents) == 1
        # ms -> datetime is the inverse of the epoch-ms we wrote, to within the
        # sub-millisecond truncation of int(ts*1000).
        expected = datetime.fromtimestamp(_ms(when) / 1000)
        assert incidents[0].timestamp == expected

    def test_type_is_lowercased(self):
        rows = [_row(report_type="Dark")]
        incidents = _reports_to_incidents(rows, _default_cutoff())
        assert incidents[0].type == "dark"

    def test_zero_coordinates_are_skipped(self):
        rows = [_row(lat=0, lng=-73.99), _row(lat=40.73, lng=0)]
        assert _reports_to_incidents(rows, _default_cutoff()) == []

    def test_empty_rows_yield_empty_list(self):
        assert _reports_to_incidents([], _default_cutoff()) == []

    def test_malformed_row_is_skipped_not_fatal(self):
        rows = [
            {"id": "bad", "type": "dark", "lat": "not-a-number", "lng": -73.99,
             "ts": _ms(datetime.now())},
            _row(report_type="dark", id="good"),
        ]
        incidents = _reports_to_incidents(rows, _default_cutoff())
        assert [i.id for i in incidents] == ["good"]

    def test_absurd_ts_is_skipped_not_raised(self):
        # datetime.fromtimestamp on an out-of-range ts raises OverflowError
        # (OSError on some platforms). The bad row must be dropped, not abort
        # the whole batch and discard the valid rows alongside it.
        rows = [
            {"id": "corrupt", "type": "dark", "lat": 40.73, "lng": -73.99, "ts": 1e30},
            _row(report_type="dark", id="good"),
        ]
        incidents = _reports_to_incidents(rows, _default_cutoff())
        assert [i.id for i in incidents] == ["good"]


# =========================================
# Severity mapping (agent-context §2.1)
# =========================================

class TestCommunitySeverityMapping:
    def test_known_hazard_type_maps_to_configured_severity(self):
        rows = [_row(report_type="dark")]
        inc = _reports_to_incidents(rows, _default_cutoff())[0]
        assert inc.severity == COMMUNITY_SEVERITY["dark"]
        assert inc.severity == 0.35

    def test_unknown_type_gets_small_default(self):
        rows = [_row(report_type="totally-made-up-type")]
        inc = _reports_to_incidents(rows, _default_cutoff())[0]
        assert inc.severity == COMMUNITY_DEFAULT_SEVERITY
        assert inc.severity == 0.15

    def test_reassuring_report_carries_zero_risk(self):
        # "lit" (well lit) is a positive signal; the grid only accumulates
        # risk, so it must add none.
        rows = [_row(report_type="lit")]
        inc = _reports_to_incidents(rows, _default_cutoff())[0]
        assert inc.severity == 0.0

    def test_all_community_severities_below_violent_crime_tier(self):
        # Coarse community flags must never reach the violent-crime tier
        # (ROBBERY = 0.80 is the floor in INCIDENT_SEVERITY).
        assert max(COMMUNITY_SEVERITY.values()) < 0.80
        assert COMMUNITY_DEFAULT_SEVERITY < 0.80


# =========================================
# Recent-window filter
# =========================================

class TestWindowFilter:
    def test_stale_row_before_cutoff_is_excluded(self):
        cutoff = datetime.now() - timedelta(days=COMMUNITY_WINDOW_DAYS)
        stale = _row(id="stale", when=datetime.now() - timedelta(days=COMMUNITY_WINDOW_DAYS + 2))
        fresh = _row(id="fresh", when=datetime.now() - timedelta(hours=1))
        incidents = _reports_to_incidents([stale, fresh], cutoff)
        assert [i.id for i in incidents] == ["fresh"]

    def test_row_inside_window_is_included(self):
        cutoff = datetime.now() - timedelta(days=COMMUNITY_WINDOW_DAYS)
        row = _row(id="recent", when=datetime.now() - timedelta(days=1))
        incidents = _reports_to_incidents([row], cutoff)
        assert [i.id for i in incidents] == ["recent"]


# =========================================
# Schema-drift guard on the reports payload
# =========================================

class TestCommunitySchema:
    def test_valid_reports_payload_passes(self):
        rows = [{f: "x" for f in REQUIRED_COMMUNITY_FIELDS}]
        assert _require_schema(rows, REQUIRED_COMMUNITY_FIELDS, "Supabase reports") is None

    def test_missing_field_raises_and_names_it(self):
        # Payload missing `ts` (e.g. an API/schema change) must fail loudly.
        rows = [{"id": "1", "type": "dark", "lat": 40.73, "lng": -73.99}]
        with pytest.raises(ValueError, match="ts"):
            _require_schema(rows, REQUIRED_COMMUNITY_FIELDS, "Supabase reports")

    def test_non_list_payload_raises(self):
        with pytest.raises(ValueError, match="expected a JSON array"):
            _require_schema({"message": "no rows"}, REQUIRED_COMMUNITY_FIELDS, "Supabase reports")


# =========================================
# Async fetch_community_reports -- stubbed aiohttp (no live network)
# =========================================

# (north, south, east, west) -- matches the fetch_incidents bounds convention.
_BOUNDS = (40.7400, 40.7200, -73.9800, -74.0100)


class _FakeResponse:
    """Minimal stand-in for an aiohttp response used as an async context mgr."""

    def __init__(self, status, payload):
        self.status = status
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def json(self):
        return self._payload


class _FakeSession:
    """Captures the last session.get(url, headers=...) call for assertions."""

    def __init__(self, status=200, payload=None):
        self._status = status
        self._payload = payload if payload is not None else []
        self.calls = []

    def get(self, url, headers=None):
        self.calls.append({"url": url, "headers": headers})
        return _FakeResponse(self._status, self._payload)


def _configure_supabase(monkeypatch, url="https://proj.supabase.co", key="anon-key-xyz"):
    import routing.risk_service as rs
    monkeypatch.setattr(rs.settings, "supabase_url", url)
    monkeypatch.setattr(rs.settings, "supabase_key", key)


class TestFetchCommunityReportsAsync:
    async def test_configured_issues_bounded_verified_query_with_auth_headers(self, monkeypatch):
        _configure_supabase(monkeypatch, key="anon-key-xyz")
        service = RiskService()
        row = _row(report_type="dark", id="r1")
        session = _FakeSession(status=200, payload=[row])

        incidents = await service.fetch_community_reports(session, _BOUNDS)

        assert len(session.calls) == 1
        call = session.calls[0]
        url = call["url"]
        # Verified-only, recent-window, four bounds filters, and a bound.
        assert "verified=eq.true" in url
        assert "ts=gte." in url
        north, south, east, west = _BOUNDS
        assert f"lat=gte.{south}" in url
        assert f"lat=lte.{north}" in url
        assert f"lng=gte.{west}" in url
        assert f"lng=lte.{east}" in url
        assert "limit=" in url
        # Auth headers for the anon PostgREST SELECT.
        assert call["headers"]["apikey"] == "anon-key-xyz"
        assert call["headers"]["Authorization"] == "Bearer anon-key-xyz"
        # And the payload is mapped through to community incidents.
        assert [i.id for i in incidents] == ["r1"]
        assert incidents[0].source == "community"

    async def test_unconfigured_returns_empty_and_logs_once(self, monkeypatch, capsys):
        _configure_supabase(monkeypatch, url=None, key=None)
        service = RiskService()
        session = _FakeSession()

        first = await service.fetch_community_reports(session, _BOUNDS)
        second = await service.fetch_community_reports(session, _BOUNDS)

        assert first == [] and second == []
        # No HTTP attempted when unconfigured.
        assert session.calls == []
        # Skip notice printed exactly once across both calls.
        out = capsys.readouterr().out
        assert out.count("skipping community-report pull") == 1

    async def test_missing_only_key_is_treated_as_unconfigured(self, monkeypatch):
        _configure_supabase(monkeypatch, url="https://proj.supabase.co", key=None)
        service = RiskService()
        session = _FakeSession()

        result = await service.fetch_community_reports(session, _BOUNDS)

        assert result == []
        assert session.calls == []

    async def test_non_200_returns_empty(self, monkeypatch):
        _configure_supabase(monkeypatch)
        service = RiskService()
        session = _FakeSession(status=503, payload={"error": "unavailable"})

        result = await service.fetch_community_reports(session, _BOUNDS)

        assert result == []
        # It did attempt the request before giving up.
        assert len(session.calls) == 1
