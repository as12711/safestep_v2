"""
SafeStep Risk Service
=====================
Fetches and processes safety data to compute edge risk scores.
Integrates with:
- NYC Open Data (911 calls, crime complaints)
- Infrastructure data (call boxes, safe havens)
- Crowdsourced reports
"""

import aiohttp
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
import math

from .config import settings


# NYC Open Data endpoints
NYC_911_CALLS = "https://data.cityofnewyork.us/resource/n2zq-pubd.json"  # NYPD Calls for Service (YTD); 8zsp-zqpf retired (404)
NYC_COMPLAINTS = "https://data.cityofnewyork.us/resource/5uac-w243.json"

# Fields the ingest depends on. If a returned row is missing these, the dataset
# schema likely drifted: fail loudly rather than silently coercing to empty.
REQUIRED_911_FIELDS = ("latitude", "longitude", "typ_desc", "create_date")
REQUIRED_COMPLAINT_FIELDS = ("latitude", "longitude", "ofns_desc", "cmplnt_fr_dt", "law_cat_cd")


def _nyc_headers() -> Dict[str, str]:
    """Auth header for Socrata when an app token is configured."""
    return {"X-App-Token": settings.nyc_app_token} if settings.nyc_app_token else {}


def _require_schema(rows: Any, required: Tuple[str, ...], source: str) -> None:
    """Fail loudly on schema drift. An empty result is valid (no rows in window)."""
    if not isinstance(rows, list):
        raise ValueError(f"{source}: expected a JSON array, got {type(rows).__name__}")
    if not rows:
        return
    missing = [f for f in required if f not in rows[0]]
    if missing:
        raise ValueError(
            f"{source}: response missing expected field(s) {missing}. "
            f"Schema may have changed; received keys {sorted(rows[0].keys())}."
        )


# Incident severity scores (0 = minor, 1 = severe)
INCIDENT_SEVERITY = {
    # Violent crimes (highest impact)
    "MURDER": 1.0,
    "HOMICIDE": 1.0,
    "RAPE": 0.95,
    "SHOOTING": 0.95,
    "FELONY ASSAULT": 0.85,
    "ROBBERY": 0.80,
    
    # Medium severity
    "ASSAULT": 0.60,
    "BURGLARY": 0.50,
    "GRAND LARCENY": 0.45,
    "HARASSMENT": 0.35,
    
    # Low severity
    "PETIT LARCENY": 0.25,
    "CRIMINAL MISCHIEF": 0.20,
    "DISORDERLY CONDUCT": 0.15,
    "TRESPASS": 0.10,
    "NOISE": 0.05,
}


# Community report ingest (P1-1)
# ------------------------------
# Verified community reports live in Supabase's public `reports` table and are
# pulled on each scheduled risk refresh (PULL model, no push/edge-function).
# Equity constraint (agent-context §2.1): these are COARSE hazard / lighting /
# "avoid" flags, NOT granular crime incidents. Each report `type` maps to a
# conservative environmental-hazard severity kept well below the violent-crime
# tier in INCIDENT_SEVERITY (max here is 0.5; the violent tier starts at 0.80),
# so a community flag can nudge edge weighting without ever reading like a
# felony. Reassuring reports (well lit, busy, police present, etc.) carry 0.0:
# the grid only accumulates risk, so they simply add no weight. Unknown types
# get a small default. The `type` strings are the report category ids the app
# writes -- see src/screens/reporting/ReportingScreen.js REPORT_CATEGORIES and
# src/services/supabase.js AMBIENT_TYPES / HIGH_PRIORITY_TYPES.
SUPABASE_REPORTS_PATH = "/rest/v1/reports"

# Fields the community ingest depends on (mirrors the NYC _require_schema guard).
REQUIRED_COMMUNITY_FIELDS = ("id", "type", "lat", "lng", "ts")

# Only pull reports from the recent window. The grid's temporal decay already
# drives anything past ~72h toward negligible weight (see
# _calculate_cell_crime_score), so a 7-day window captures every report that can
# still matter, with margin.
COMMUNITY_WINDOW_DAYS = 7

COMMUNITY_SEVERITY = {
    # Lighting (a core SafeStep signal)
    "dark": 0.35,          # poor lighting
    "broken": 0.35,        # broken street light
    "lit": 0.0,            # well lit (reassuring; adds no risk)
    # Crowd / isolation
    "empty": 0.30,         # deserted
    "quiet": 0.20,         # very quiet / low foot traffic
    "busy": 0.0,           # busy area (reassuring)
    "crowd": 0.0,          # legacy alias for a busy/crowd report
    # Environmental hazards (force caution or reroute)
    "flooding": 0.35,
    "blocked": 0.30,       # path blocked
    "hazard": 0.30,        # legacy generic hazard flag
    "construction": 0.25,
    "slippery": 0.25,
    "closed": 0.25,        # legacy closed path / business
    # Safety observations (coarse community flags, NOT verified crimes)
    "harassment": 0.50,
    "suspicious": 0.40,
    "police": 0.0,         # police present (reassuring)
    "security": 0.0,       # security present (reassuring)
    # Accessibility
    "elevator-out": 0.20,
    "stairs": 0.15,
    "ramp": 0.0,           # ramp available (reassuring)
    # Positive
    "safe": 0.0,           # all clear
    "clean": 0.0,
    "open-business": 0.0,
}

# Unknown types get a small, conservative default -- present enough to register,
# far below any crime severity.
COMMUNITY_DEFAULT_SEVERITY = 0.15


@dataclass
class Incident:
    """A safety incident."""
    id: str
    type: str
    lat: float
    lng: float
    timestamp: datetime
    severity: float
    source: str  # "911", "nypd", "community", "crowdsource"


def _reports_to_incidents(rows: Any, cutoff: datetime) -> List[Incident]:
    """Map verified-report rows (PostgREST JSON) to community Incidents.

    Pure and synchronous so it can be unit-tested without a live Supabase.
    `ts` is epoch MILLISECONDS; we convert to a naive local datetime to match
    the timestamps the NYC ingest produces (datetime.fromisoformat of a naive
    string), keeping the grid's `datetime.now() - timestamp` decay consistent
    across sources. Rows older than `cutoff` are dropped as defense in depth --
    the query already filters by ts, but a stale row must never leak in.
    Malformed rows are skipped, matching the NYC per-row tolerance.
    """
    cutoff_ms = cutoff.timestamp() * 1000
    incidents: List[Incident] = []
    for item in rows:
        try:
            ts_ms = float(item["ts"])
            if ts_ms < cutoff_ms:
                continue

            lat = float(item["lat"])
            lng = float(item["lng"])
            if lat == 0 or lng == 0:
                continue

            report_type = str(item.get("type", "")).lower()
            severity = COMMUNITY_SEVERITY.get(report_type, COMMUNITY_DEFAULT_SEVERITY)

            incidents.append(Incident(
                id=str(item.get("id", hash(str(item)))),
                type=report_type,
                lat=lat,
                lng=lng,
                timestamp=datetime.fromtimestamp(ts_ms / 1000),
                severity=severity,
                source="community",
            ))
        except (KeyError, TypeError, ValueError):
            continue

    return incidents


@dataclass
class GridCell:
    """Aggregated safety data for a grid cell."""
    lat_min: float
    lat_max: float
    lng_min: float
    lng_max: float
    incidents: List[Incident]
    crime_score: float = 0.0
    infrastructure_score: float = 0.5
    lighting_score: float = 0.5
    last_update: Optional[datetime] = None


class RiskService:
    """
    Manages safety risk data and scoring.
    """
    
    def __init__(self, grid_size: float = 0.001):  # ~111m cells
        self.grid_size = grid_size
        self.grid: Dict[Tuple[int, int], GridCell] = {}
        self.incidents: List[Incident] = []
        self.last_fetch: Optional[datetime] = None
        self.cache_duration = timedelta(minutes=15)
        # Log the "Supabase unconfigured, skipping community pull" notice once,
        # not on every scheduled refresh.
        self._community_skip_logged = False
    
    # =========================================
    # DATA FETCHING
    # =========================================
    
    async def fetch_incidents(
        self,
        bounds: Tuple[float, float, float, float],  # (north, south, east, west)
        hours_back: int = 24,
    ) -> List[Incident]:
        """
        Fetch recent incidents from NYC Open Data.
        
        Args:
            bounds: Geographic bounds
            hours_back: How many hours of data to fetch
            
        Returns:
            List of incidents
        """
        north, south, east, west = bounds
        cutoff = datetime.now() - timedelta(hours=hours_back)
        
        incidents = []
        
        async with aiohttp.ClientSession() as session:
            # Fetch 911 calls
            calls = await self._fetch_911_calls(session, bounds, cutoff)
            incidents.extend(calls)
            
            # Fetch crime complaints (last 7 days)
            crimes = await self._fetch_crimes(session, bounds, days_back=7)
            incidents.extend(crimes)

            # Pull verified community reports (P1-1 PULL model). Coarse
            # hazard/lighting flags that weight edges alongside NYC data;
            # skipped gracefully when Supabase is unconfigured. Added to the
            # combined list BEFORE _update_grid so they land in the same grid.
            community = await self.fetch_community_reports(session, bounds)
            incidents.extend(community)

        self.incidents = incidents
        self.last_fetch = datetime.now()
        
        # Update grid
        self._update_grid(incidents)
        
        return incidents
    
    async def _fetch_911_calls(
        self,
        session: aiohttp.ClientSession,
        bounds: Tuple[float, float, float, float],
        cutoff: datetime,
    ) -> List[Incident]:
        """Fetch 911 calls from NYC Open Data."""
        north, south, east, west = bounds
        
        query = (
            f"$where=latitude between {south} and {north} "
            f"AND longitude between {west} and {east}"
            f"&$limit=500&$order=create_date DESC"
        )
        url = f"{NYC_911_CALLS}?{query}"

        try:
            async with session.get(url, headers=_nyc_headers()) as response:
                if response.status != 200:
                    print(f"[RiskService] 911 API error: {response.status}")
                    return []
                data = await response.json()
        except Exception as e:
            print(f"[RiskService] 911 fetch error: {e}")
            return []

        # Validate schema outside the network try/except so drift fails loudly
        # instead of being swallowed as a transient fetch error.
        _require_schema(data, REQUIRED_911_FIELDS, "NYC 911 (n2zq-pubd)")

        incidents = []
        for item in data:
            try:
                lat = float(item.get("latitude", 0))
                lng = float(item.get("longitude", 0))
                if lat == 0 or lng == 0:
                    continue

                incident_type = item.get("typ_desc", "UNKNOWN").upper()
                severity = INCIDENT_SEVERITY.get(incident_type, 0.2)

                incidents.append(Incident(
                    id=item.get("cad_evnt_id", str(hash(str(item)))),
                    type=incident_type,
                    lat=lat,
                    lng=lng,
                    timestamp=datetime.fromisoformat(
                        item.get("create_date", "2024-01-01T00:00:00")
                    ),
                    severity=severity,
                    source="911",
                ))
            except Exception:
                continue

        return incidents
    
    async def _fetch_crimes(
        self,
        session: aiohttp.ClientSession,
        bounds: Tuple[float, float, float, float],
        days_back: int = 7,
    ) -> List[Incident]:
        """Fetch crime complaints from NYC Open Data."""
        north, south, east, west = bounds
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        query = (
            f"$where=latitude between {south} and {north} "
            f"AND longitude between {west} and {east} "
            f"AND cmplnt_fr_dt >= '{cutoff_date}'"
            f"&$limit=200&$order=cmplnt_fr_dt DESC"
        )
        url = f"{NYC_COMPLAINTS}?{query}"

        try:
            async with session.get(url, headers=_nyc_headers()) as response:
                if response.status != 200:
                    print(f"[RiskService] Crimes API error: {response.status}")
                    return []
                data = await response.json()
        except Exception as e:
            print(f"[RiskService] Crimes fetch error: {e}")
            return []

        _require_schema(data, REQUIRED_COMPLAINT_FIELDS, "NYC complaints (5uac-w243)")

        incidents = []
        for item in data:
            try:
                lat = float(item.get("latitude", 0))
                lng = float(item.get("longitude", 0))
                if lat == 0 or lng == 0:
                    continue

                offense = item.get("ofns_desc", "UNKNOWN").upper()
                category = item.get("law_cat_cd", "")

                # Severity based on category
                if category == "FELONY":
                    base_severity = 0.7
                elif category == "MISDEMEANOR":
                    base_severity = 0.4
                else:
                    base_severity = 0.2

                severity = INCIDENT_SEVERITY.get(offense, base_severity)

                incidents.append(Incident(
                    id=item.get("cmplnt_num", str(hash(str(item)))),
                    type=offense,
                    lat=lat,
                    lng=lng,
                    timestamp=datetime.fromisoformat(
                        item.get("cmplnt_fr_dt", "2024-01-01")
                    ),
                    severity=severity,
                    source="nypd",
                ))
            except Exception:
                continue

        return incidents

    async def fetch_community_reports(
        self,
        session: aiohttp.ClientSession,
        bounds: Tuple[float, float, float, float],
        window_days: int = COMMUNITY_WINDOW_DAYS,
    ) -> List[Incident]:
        """Pull verified community reports from Supabase (PULL model, P1-1).

        Returns coarse community Incidents (source="community") for the recent
        window, mapped conservatively via COMMUNITY_SEVERITY. Gated on Supabase
        config: if SUPABASE_URL / SUPABASE_ANON_KEY are unset this deployment
        has no community source, so we skip (logging once) and return []. A
        network error degrades to [] like the NYC fetchers -- a community
        outage must never break a risk refresh.
        """
        base = settings.supabase_url
        key = settings.supabase_key
        if not base or not key:
            if not self._community_skip_logged:
                print(
                    "[RiskService] Supabase not configured (SUPABASE_URL / "
                    "SUPABASE_ANON_KEY unset); skipping community-report pull."
                )
                self._community_skip_logged = True
            return []

        north, south, east, west = bounds
        cutoff = datetime.now() - timedelta(days=window_days)
        cutoff_ms = int(cutoff.timestamp() * 1000)

        # PostgREST: verified rows only, recent window, area bounds, minimal
        # projection. RLS policy "Reports are viewable by everyone" permits this
        # anonymous SELECT with the anon key.
        query = (
            "verified=eq.true"
            "&select=id,type,lat,lng,ts"
            f"&ts=gte.{cutoff_ms}"
            f"&lat=gte.{south}&lat=lte.{north}"
            f"&lng=gte.{west}&lng=lte.{east}"
        )
        url = f"{base.rstrip('/')}{SUPABASE_REPORTS_PATH}?{query}"
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}

        try:
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    print(f"[RiskService] Community reports API error: {response.status}")
                    return []
                data = await response.json()
        except Exception as e:
            print(f"[RiskService] Community reports fetch error: {e}")
            return []

        # Validate schema outside the network try/except so drift fails loudly
        # instead of being swallowed as a transient fetch error.
        _require_schema(data, REQUIRED_COMMUNITY_FIELDS, "Supabase reports")

        return _reports_to_incidents(data, cutoff)

    # =========================================
    # GRID MANAGEMENT
    # =========================================
    
    def _update_grid(self, incidents: List[Incident]):
        """Update grid cells with incident data."""
        # Group incidents by grid cell
        cells = defaultdict(list)
        
        for incident in incidents:
            cell_key = self._get_cell_key(incident.lat, incident.lng)
            cells[cell_key].append(incident)
        
        # Update grid
        for cell_key, cell_incidents in cells.items():
            lat_idx, lng_idx = cell_key
            
            cell = GridCell(
                lat_min=lat_idx * self.grid_size,
                lat_max=(lat_idx + 1) * self.grid_size,
                lng_min=lng_idx * self.grid_size,
                lng_max=(lng_idx + 1) * self.grid_size,
                incidents=cell_incidents,
                last_update=datetime.now(),
            )
            
            # Calculate crime score
            cell.crime_score = self._calculate_cell_crime_score(cell_incidents)
            
            self.grid[cell_key] = cell
    
    def _calculate_cell_crime_score(self, incidents: List[Incident]) -> float:
        """Calculate aggregated crime score for a cell."""
        if not incidents:
            return 0.0
        
        now = datetime.now()
        total_score = 0.0
        
        for incident in incidents:
            # Time decay: recent incidents have more impact
            hours_ago = (now - incident.timestamp).total_seconds() / 3600
            
            if hours_ago <= 1:
                time_factor = 1.0
            elif hours_ago <= 6:
                time_factor = 0.8
            elif hours_ago <= 24:
                time_factor = 0.5
            elif hours_ago <= 72:
                time_factor = 0.3
            else:
                time_factor = 0.1
            
            total_score += incident.severity * time_factor
        
        # Normalize (cap at 1.0)
        return min(1.0, total_score / 3)  # Divide by 3 to normalize typical loads
    
    def _get_cell_key(self, lat: float, lng: float) -> Tuple[int, int]:
        """Get grid cell key for a coordinate."""
        lat_idx = int(lat / self.grid_size)
        lng_idx = int(lng / self.grid_size)
        return (lat_idx, lng_idx)
    
    # =========================================
    # SCORE QUERIES
    # =========================================
    
    def get_crime_score(self, lat: float, lng: float) -> float:
        """Get crime score at a location."""
        cell_key = self._get_cell_key(lat, lng)
        cell = self.grid.get(cell_key)
        
        if cell:
            return cell.crime_score
        
        return 0.0  # No data = assume safe
    
    def get_crime_score_for_edge(
        self,
        from_lat: float,
        from_lng: float,
        to_lat: float,
        to_lng: float,
    ) -> float:
        """Get average crime score along an edge."""
        # Sample multiple points along the edge
        samples = 5
        total_score = 0.0
        
        for i in range(samples):
            t = i / (samples - 1)
            lat = from_lat + t * (to_lat - from_lat)
            lng = from_lng + t * (to_lng - from_lng)
            total_score += self.get_crime_score(lat, lng)
        
        return total_score / samples
    
    def get_incidents_near(
        self,
        lat: float,
        lng: float,
        radius_meters: float = 200,
    ) -> List[Incident]:
        """Get incidents within radius of a location."""
        results = []
        
        for incident in self.incidents:
            dist = self._haversine(lat, lng, incident.lat, incident.lng)
            if dist <= radius_meters:
                results.append(incident)
        
        return results
    
    def _haversine(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points in meters."""
        R = 6371000  # Earth radius
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)
        
        a = math.sin(dphi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    # =========================================
    # GRAPH UPDATE
    # =========================================
    
    def update_graph_risks(self, graph) -> int:
        """
        Update crime_score on all edges in a NetworkX graph.
        
        Args:
            graph: NetworkX MultiDiGraph
            
        Returns:
            Number of edges updated
        """
        updated = 0
        
        for u, v, key, data in graph.edges(keys=True, data=True):
            # Get node coordinates
            u_lat = graph.nodes[u]["y"]
            u_lng = graph.nodes[u]["x"]
            v_lat = graph.nodes[v]["y"]
            v_lng = graph.nodes[v]["x"]
            
            # Calculate edge crime score
            crime_score = self.get_crime_score_for_edge(u_lat, u_lng, v_lat, v_lng)
            data["crime_score"] = crime_score
            updated += 1
        
        return updated
    
    def is_stale(self) -> bool:
        """Check if data needs refresh."""
        if self.last_fetch is None:
            return True
        return datetime.now() - self.last_fetch > self.cache_duration


# Singleton
risk_service = RiskService()

