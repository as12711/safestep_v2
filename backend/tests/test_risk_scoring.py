"""Unit tests for the deterministic scoring and validation logic in
risk_service.py.

Agent-context mandate: every scoring function gets unit tests including
boundary behavior -- empty cell, single max-severity incident, decay tier
edges, and normalization limits.

risk_service imports only aiohttp, stdlib, and .config (no osmnx), so these
run in the light unit environment without any geospatial deps.

Time handling: _calculate_cell_crime_score derives "hours since incident" from
datetime.now() at call time. To avoid flakiness we build incident timestamps
relative to now() and place them well inside a decay tier (never exactly on a
boundary, where the microseconds spent between constructing the timestamp and
the internal now() call could tip the comparison the wrong way).
"""

import math
from datetime import datetime, timedelta

import pytest

from routing.risk_service import (
    Incident,
    GridCell,
    RiskService,
    _require_schema,
    _nyc_headers,
    REQUIRED_911_FIELDS,
    REQUIRED_COMPLAINT_FIELDS,
)


def _incident(severity, hours_ago, lat=40.7300, lng=-73.9950):
    """Build an Incident whose timestamp is `hours_ago` hours before now."""
    return Incident(
        id="test",
        type="TEST",
        lat=lat,
        lng=lng,
        timestamp=datetime.now() - timedelta(hours=hours_ago),
        severity=severity,
        source="test",
    )


# =========================================
# _calculate_cell_crime_score
# =========================================

class TestCalculateCellCrimeScore:
    def setup_method(self):
        self.service = RiskService()

    def test_empty_cell_scores_zero(self):
        assert self.service._calculate_cell_crime_score([]) == 0.0

    def test_single_max_severity_recent_incident(self):
        # severity 1.0, within the last hour -> time_factor 1.0.
        # total = 1.0; normalized = min(1.0, 1.0 / 3) = 0.3333...
        incident = _incident(severity=1.0, hours_ago=0.5)
        score = self.service._calculate_cell_crime_score([incident])
        assert score == pytest.approx(1.0 / 3, abs=1e-6)

    # --- decay tier interiors (single incident, severity 1.0) --------------
    # score for one incident = severity * time_factor / 3

    def test_decay_tier_within_1h(self):
        score = self.service._calculate_cell_crime_score([_incident(1.0, 0.5)])
        assert score == pytest.approx(1.0 * 1.0 / 3, abs=1e-6)

    def test_decay_tier_within_6h(self):
        score = self.service._calculate_cell_crime_score([_incident(1.0, 3)])
        assert score == pytest.approx(1.0 * 0.8 / 3, abs=1e-6)

    def test_decay_tier_within_24h(self):
        score = self.service._calculate_cell_crime_score([_incident(1.0, 12)])
        assert score == pytest.approx(1.0 * 0.5 / 3, abs=1e-6)

    def test_decay_tier_within_72h(self):
        score = self.service._calculate_cell_crime_score([_incident(1.0, 48)])
        assert score == pytest.approx(1.0 * 0.3 / 3, abs=1e-6)

    def test_decay_tier_beyond_72h(self):
        score = self.service._calculate_cell_crime_score([_incident(1.0, 100)])
        assert score == pytest.approx(1.0 * 0.1 / 3, abs=1e-6)

    def test_decay_is_monotonic_non_increasing_across_tiers(self):
        scores = [
            self.service._calculate_cell_crime_score([_incident(1.0, h)])
            for h in (0.5, 3, 12, 48, 100)
        ]
        assert scores == sorted(scores, reverse=True)

    def test_normalization_clamps_at_one(self):
        # Many recent max-severity incidents: raw total = 10 -> 10/3 = 3.33,
        # clamped to the 1.0 ceiling.
        incidents = [_incident(1.0, 0.5) for _ in range(10)]
        assert self.service._calculate_cell_crime_score(incidents) == 1.0

    def test_score_just_below_clamp(self):
        # Two recent max-severity incidents: total 2.0 -> 2/3 = 0.6667, no clamp.
        incidents = [_incident(1.0, 0.5), _incident(1.0, 0.5)]
        score = self.service._calculate_cell_crime_score(incidents)
        assert score == pytest.approx(2.0 / 3, abs=1e-6)
        assert score < 1.0


# =========================================
# _get_cell_key and grid_size
# =========================================

class TestCellKey:
    def test_default_grid_size(self):
        assert RiskService().grid_size == 0.001

    def test_custom_grid_size(self):
        assert RiskService(grid_size=0.005).grid_size == 0.005

    def test_cell_key_is_deterministic_integer_pair(self):
        service = RiskService()  # grid_size 0.001
        # int(40.7128 / 0.001) = 40712, int(-73.9950 / 0.001) = -73995
        assert service._get_cell_key(40.7128, -73.9950) == (40712, -73995)

    def test_nearby_points_share_a_cell(self):
        service = RiskService()
        a = service._get_cell_key(40.73001, -73.99501)
        b = service._get_cell_key(40.73009, -73.99509)
        assert a == b

    def test_points_a_cell_apart_differ(self):
        service = RiskService()
        a = service._get_cell_key(40.7300, -73.9950)
        b = service._get_cell_key(40.7311, -73.9950)  # > one 0.001 step away
        assert a != b


# =========================================
# _haversine
# =========================================

class TestHaversine:
    def setup_method(self):
        self.service = RiskService()

    def test_zero_distance_for_same_point(self):
        assert self.service._haversine(40.73, -73.99, 40.73, -73.99) == pytest.approx(0.0, abs=1e-6)

    def test_one_degree_longitude_at_equator(self):
        # At the equator one degree of longitude ~ R * radians(1).
        expected = 6371000 * math.radians(1)
        got = self.service._haversine(0.0, 0.0, 0.0, 1.0)
        assert got == pytest.approx(expected, rel=1e-6)

    def test_symmetry(self):
        d1 = self.service._haversine(40.73, -73.99, 40.74, -73.98)
        d2 = self.service._haversine(40.74, -73.98, 40.73, -73.99)
        assert d1 == pytest.approx(d2, rel=1e-9)

    def test_known_short_distance_is_plausible(self):
        # ~0.001 deg latitude near NYC is roughly 111 m (the grid cell size).
        d = self.service._haversine(40.7300, -73.9950, 40.7310, -73.9950)
        assert 100 < d < 120


# =========================================
# _require_schema
# =========================================

class TestRequireSchema:
    def test_valid_rows_pass(self):
        rows = [{f: "x" for f in REQUIRED_911_FIELDS}]
        assert _require_schema(rows, REQUIRED_911_FIELDS, "911") is None

    def test_empty_list_is_valid(self):
        # An empty result means "no rows in the window", not schema drift.
        assert _require_schema([], REQUIRED_911_FIELDS, "911") is None

    def test_non_list_raises(self):
        with pytest.raises(ValueError, match="expected a JSON array"):
            _require_schema({"error": "boom"}, REQUIRED_911_FIELDS, "911")

    def test_none_raises(self):
        with pytest.raises(ValueError, match="expected a JSON array"):
            _require_schema(None, REQUIRED_911_FIELDS, "911")

    def test_missing_field_raises_and_names_it(self):
        rows = [{"latitude": "1", "longitude": "2", "typ_desc": "X"}]  # missing create_date
        with pytest.raises(ValueError, match="create_date"):
            _require_schema(rows, REQUIRED_911_FIELDS, "911")

    def test_complaint_schema_drift_detected(self):
        rows = [{"latitude": "1", "longitude": "2", "ofns_desc": "X"}]  # missing 2 fields
        with pytest.raises(ValueError):
            _require_schema(rows, REQUIRED_COMPLAINT_FIELDS, "complaints")


# =========================================
# _nyc_headers
# =========================================

class TestNycHeaders:
    def test_returns_token_header_when_set(self, monkeypatch):
        import routing.risk_service as rs
        monkeypatch.setattr(rs.settings, "nyc_app_token", "secret-token")
        assert _nyc_headers() == {"X-App-Token": "secret-token"}

    def test_returns_empty_when_unset(self, monkeypatch):
        import routing.risk_service as rs
        monkeypatch.setattr(rs.settings, "nyc_app_token", None)
        assert _nyc_headers() == {}


# =========================================
# dataclasses
# =========================================

class TestDataclasses:
    def test_incident_fields(self):
        ts = datetime(2024, 1, 1)
        inc = Incident(id="1", type="ROBBERY", lat=40.7, lng=-73.9, timestamp=ts, severity=0.8, source="911")
        assert inc.severity == 0.8
        assert inc.timestamp == ts

    def test_grid_cell_defaults(self):
        cell = GridCell(lat_min=0, lat_max=1, lng_min=0, lng_max=1, incidents=[])
        assert cell.crime_score == 0.0
        assert cell.infrastructure_score == 0.5
        assert cell.lighting_score == 0.5
        assert cell.last_update is None
