"""
SafeStep Routing API
====================
FastAPI endpoints for safe route calculation.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime
import asyncio

from .config import settings
from .safe_router import safe_router, Route, SafeRouter
from .weight_calculator import UserProfile, MobilityLevel
from .risk_service import risk_service
from .graph_manager import AREA_CONFIGS



# =========================================
# API MODELS
# =========================================

class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


class RouteRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates
    
    # Safety preferences
    alpha: float = Field(1.0, ge=0, le=10, description="Safety priority factor (0=fastest, 5=safest)")
    avoid_high_risk: bool = Field(True, description="Avoid high-risk areas entirely")
    high_risk_threshold: float = Field(0.7, ge=0, le=1, description="Risk threshold for avoidance")
    
    # Accessibility
    needs_accessible: bool = Field(False, description="Requires wheelchair-accessible route")
    avoid_stairs: bool = Field(False, description="Avoid stairs")
    max_slope: float = Field(15.0, ge=0, le=30, description="Maximum slope percentage")
    
    # Preferences
    prefer_lit_paths: bool = Field(True, description="Prefer well-lit paths at night")
    prefer_busy_areas: bool = Field(True, description="Prefer areas with foot traffic")
    
    # Algorithm
    algorithm: str = Field("dijkstra", description="Routing algorithm: dijkstra, astar, bellman-ford")
    alternatives: bool = Field(True, description="Return alternative routes")


class RouteSegmentResponse(BaseModel):
    from_coords: List[float]  # [lat, lng]
    to_coords: List[float]
    distance: float
    risk_level: str
    color: str
    street_name: Optional[str]


class RouteResponse(BaseModel):
    distance: float           # meters
    duration: float           # minutes
    safety_score: int         # 0-100
    risk_level: str           # safe, moderate, caution, high_risk
    is_accessible: bool
    has_stairs: bool
    max_slope: float
    algorithm: str
    compute_time_ms: float
    coordinates: List[dict]   # [{lat, lng}]
    segments: List[RouteSegmentResponse]
    geojson: dict


class RoutesResponse(BaseModel):
    routes: List[RouteResponse]
    area_id: str
    timestamp: str
    cached: bool = False


# =========================================
# FRONTEND-SHAPED MODELS
# =========================================

METERS_TO_MILES = 0.000621371
ROUTE_NAMES = ["Safest Route", "Balanced Route", "Fastest Route"]


class FrontendRoute(BaseModel):
    id: str
    name: str
    safetyScore: int
    distance: float         # miles (e.g. 0.6) — RouteCard formats with formatDistance
    duration: int           # minutes, integer
    viaStreets: List[str]
    crowdLevel: str         # "busy" | "moderate" | "caution"
    hasLighting: bool
    isAccessible: bool
    alerts: List[dict]
    coordinates: List[dict]  # [{latitude, longitude}] — MapView/react-native-maps format


class FrontendRoutesResponse(BaseModel):
    routes: List[FrontendRoute]
    timestamp: str


class InitializeRequest(BaseModel):
    area_id: str = Field(..., description="Area to initialize (e.g., 'manhattan', 'nyu')")
    force_rebuild: bool = Field(False, description="Force rebuild of graph cache")


class IncidentReport(BaseModel):
    lat: float
    lng: float
    type: str
    severity: float = Field(0.5, ge=0, le=1)


# =========================================
# FASTAPI APP
# =========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail loudly on invalid configuration before serving any request.
    settings.validate()
    # Warm up in the background so startup (and the container healthcheck) is
    # never blocked by a first-time graph build. With the durable graph cache
    # (P0-1), subsequent boots load from pickle and are fast.
    warmup = asyncio.create_task(_startup_warmup())
    try:
        yield
    finally:
        warmup.cancel()


async def _startup_warmup():
    """Self-initialize the default area, load risk data, then refresh on a loop.

    Making the backend self-initialize means the routing path works right after
    deploy without a manual POST /initialize. Risk data is re-derived from its
    durable external sources on every boot and on a fixed schedule, so no
    separate risk-state persistence layer is required.
    """
    try:
        area = settings.default_area
        print(f"[SafeStep API] Warming up area '{area}'...")
        # initialize() is synchronous and CPU/IO heavy; run off the event loop.
        ok = await asyncio.to_thread(safe_router.initialize, area)
        if not ok:
            print(f"[SafeStep API] Warmup could not initialize area '{area}'")
            return
        router_state["initialized"] = True
        router_state["area_id"] = area
        await fetch_risk_data()

        # Scheduled refresh worker.
        while True:
            await asyncio.sleep(settings.risk_refresh_minutes * 60)
            try:
                await fetch_risk_data()
            except Exception as e:  # never let one failed refresh kill the loop
                print(f"[SafeStep API] Scheduled risk refresh failed: {e}")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[SafeStep API] Warmup error: {e}")


app = FastAPI(
    title="SafeStep Routing API",
    description="A* weighted graph routing for safe pedestrian navigation",
    # API contract version. This is the backend API version and is intentionally
    # independent of the mobile app version (package.json / app.config.js): they
    # track different things (API contract vs app release).
    version="2.0.0",
    lifespan=lifespan,
)

# CORS. The React Native app does not send an Origin header, so it is unaffected
# by this allowlist. Origins come from CORS_ALLOW_ORIGINS (empty by default).
# allow_credentials stays False: wildcard + credentials is invalid per the CORS
# spec and browsers reject it, and the API uses no cookie-based auth.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track initialization state
router_state = {
    "initialized": False,
    "area_id": None,
    "last_risk_update": None,
}


# =========================================
# ENDPOINTS
# =========================================

@app.get("/")
async def root():
    """API health check."""
    return {
        "service": "SafeStep Routing API",
        "version": "2.0.0",
        "status": "healthy",
        "router_ready": router_state["initialized"],
        "area_id": router_state["area_id"],
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "router": safe_router.get_stats(),
        "risk_service": {
            "incidents_loaded": len(risk_service.incidents),
            "grid_cells": len(risk_service.grid),
            "is_stale": risk_service.is_stale(),
            "last_fetch": risk_service.last_fetch.isoformat() if risk_service.last_fetch else None,
        },
    }


@app.get("/areas")
async def list_areas():
    """List available routing areas."""
    return {
        "areas": list(AREA_CONFIGS.keys()),
        "current": router_state["area_id"],
    }


@app.post("/initialize")
async def initialize_router(request: InitializeRequest, background_tasks: BackgroundTasks):
    """
    Initialize the routing engine for a specific area.
    This must be called before routing requests.
    """
    if request.area_id not in AREA_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown area: {request.area_id}. Available: {list(AREA_CONFIGS.keys())}",
        )
    
    try:
        # Initialize router (this may take a while for large areas)
        success = safe_router.initialize(request.area_id, force_rebuild=request.force_rebuild)
        
        if success:
            router_state["initialized"] = True
            router_state["area_id"] = request.area_id
            
            # Schedule risk data fetch in background
            background_tasks.add_task(fetch_risk_data)
            
            return {
                "success": True,
                "area_id": request.area_id,
                "stats": safe_router.get_stats(),
            }
        else:
            raise HTTPException(status_code=500, detail="Router initialization failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/route", response_model=RoutesResponse)
async def get_route(request: RouteRequest):
    """
    Calculate safe route(s) between two points.
    
    The alpha parameter controls safety priority:
    - 0.0: Fastest route (ignores safety)
    - 1.0: Balanced (standard safety consideration)
    - 2.0+: Strong safety priority (accepts longer routes)
    - 5.0: Maximum safety
    """
    if not router_state["initialized"]:
        raise HTTPException(
            status_code=400,
            detail="Router not initialized. Call POST /initialize first.",
        )
    
    # Build user profile from request
    profile = UserProfile(
        mobility=MobilityLevel.WHEELCHAIR if request.needs_accessible else MobilityLevel.FULL,
        needs_accessible=request.needs_accessible,
        max_slope=request.max_slope,
        avoid_stairs=request.avoid_stairs,
        min_path_width=1.2 if request.needs_accessible else 0.9,
        alpha=request.alpha,
        avoid_high_risk=request.avoid_high_risk,
        high_risk_threshold=request.high_risk_threshold,
        prefer_lit_paths=request.prefer_lit_paths,
        prefer_busy_areas=request.prefer_busy_areas,
    )
    
    try:
        origin = (request.origin.lat, request.origin.lng)
        destination = (request.destination.lat, request.destination.lng)
        
        if request.alternatives:
            # Generate 10 diverse paths using Dijkstra with edge penalties
            routes = safe_router.find_multiple_paths(
                origin,
                destination,
                profile,
                num_paths=10,
            )
        else:
            route = safe_router.find_route(
                origin,
                destination,
                profile,
                algorithm=request.algorithm,
            )
            routes = [route]
        
        return RoutesResponse(
            routes=[RouteResponse(**r.to_dict()) for r in routes],
            area_id=router_state["area_id"],
            timestamp=datetime.now().isoformat(),
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


@app.post("/route/app", response_model=FrontendRoutesResponse)
async def get_route_for_app(request: RouteRequest):
    """
    Calculate safe routes and return data shaped for the React Native frontend.
    Distance in miles (float), coordinates as [{latitude, longitude}] for MapView.
    """
    if not router_state["initialized"]:
        raise HTTPException(
            status_code=400,
            detail="Router not initialized. Call POST /initialize first.",
        )

    profile = UserProfile(
        mobility=MobilityLevel.WHEELCHAIR if request.needs_accessible else MobilityLevel.FULL,
        needs_accessible=request.needs_accessible,
        avoid_stairs=request.avoid_stairs,
        alpha=request.alpha,
        avoid_high_risk=request.avoid_high_risk,
        high_risk_threshold=request.high_risk_threshold,
        prefer_lit_paths=request.prefer_lit_paths,
        prefer_busy_areas=request.prefer_busy_areas,
    )

    try:
        origin = (request.origin.lat, request.origin.lng)
        destination = (request.destination.lat, request.destination.lng)
        # Generate 10 diverse paths using Dijkstra with edge penalties
        raw_routes = safe_router.find_multiple_paths(origin, destination, profile, num_paths=10)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")

    frontend_routes = []
    # Map names: first 3 are primary (Safest/Balanced/Fastest), rest are alternatives
    extended_names = [
        "Safest Route",
        "Balanced Route", 
        "Fastest Route",
        "Alternative 1",
        "Alternative 2",
        "Alternative 3",
        "Alternative 4",
        "Alternative 5",
        "Alternative 6",
        "Alternative 7",
    ]
    
    for idx, r in enumerate(raw_routes):
        route_dict = r.to_dict()
        via = list(dict.fromkeys(
            seg["street_name"] for seg in route_dict["segments"]
            if seg.get("street_name")
        ))[:3]

        crowd = (
            "busy" if r.risk_level == "safe"
            else "caution" if r.risk_level in ("high_risk", "caution")
            else "moderate"
        )

        frontend_routes.append(FrontendRoute(
            id=f"route_{idx + 1}",
            name=extended_names[idx] if idx < len(extended_names) else f"Route {idx + 1}",
            safetyScore=r.safety_score,
            distance=round(r.total_distance * METERS_TO_MILES, 2),
            duration=max(1, round(r.estimated_time)),
            viaStreets=via if via else ["Street route"],
            crowdLevel=crowd,
            hasLighting=r.safety_score >= 70,
            isAccessible=r.is_accessible,
            alerts=(
                [{"type": "warning", "message": "High-risk area on this route"}]
                if r.risk_level == "high_risk" else []
            ),
            # MapView / react-native-maps expects {latitude, longitude} objects
            coordinates=[{"latitude": c[0], "longitude": c[1]} for c in r.coordinates],
        ))

    return FrontendRoutesResponse(
        routes=frontend_routes,
        timestamp=datetime.now().isoformat(),
    )


@app.get("/route/quick")
async def quick_route(
    origin_lat: float = Query(..., ge=-90, le=90),
    origin_lng: float = Query(..., ge=-180, le=180),
    dest_lat: float = Query(..., ge=-90, le=90),
    dest_lng: float = Query(..., ge=-180, le=180),
    alpha: float = Query(1.0, ge=0, le=10),
    accessible: bool = Query(False),
):
    """
    Quick route calculation via GET request.
    For simple use cases without full request body.
    """
    request = RouteRequest(
        origin=Coordinates(lat=origin_lat, lng=origin_lng),
        destination=Coordinates(lat=dest_lat, lng=dest_lng),
        alpha=alpha,
        needs_accessible=accessible,
        alternatives=False,
    )

    return await get_route(request)


@app.post("/incident")
async def report_incident(report: IncidentReport, background_tasks: BackgroundTasks):
    """
    Report a safety incident.
    Updates edge risk scores near the incident location.
    """
    if not router_state["initialized"]:
        raise HTTPException(status_code=400, detail="Router not initialized")
    
    # Update graph edge risks
    safe_router.update_edge_risk(
        report.lat,
        report.lng,
        report.severity,
        radius_meters=150,
    )
    
    return {
        "success": True,
        "message": "Incident reported and risks updated",
        "location": {"lat": report.lat, "lng": report.lng},
    }


@app.post("/refresh-risks")
async def refresh_risk_data():
    """
    Manually trigger refresh of risk data from NYC Open Data.
    """
    if not router_state["initialized"]:
        raise HTTPException(status_code=400, detail="Router not initialized")
    
    await fetch_risk_data()
    
    return {
        "success": True,
        "incidents_loaded": len(risk_service.incidents),
        "edges_updated": len(risk_service.grid),
    }


# =========================================
# BACKGROUND TASKS
# =========================================

async def fetch_risk_data():
    """Fetch risk data and update graph edges."""
    if safe_router.graph is None:
        return
    
    # Get graph bounds
    config = AREA_CONFIGS.get(router_state["area_id"])
    if config and config.get("bounds"):
        bounds = config["bounds"]
    else:
        # Calculate bounds from graph
        lats = [data["y"] for _, data in safe_router.graph.nodes(data=True)]
        lngs = [data["x"] for _, data in safe_router.graph.nodes(data=True)]
        bounds = (max(lats), min(lats), max(lngs), min(lngs))
    
    # Fetch incidents
    await risk_service.fetch_incidents(bounds, hours_back=48)
    
    # Update graph edges
    updated = risk_service.update_graph_risks(safe_router.graph)
    
    router_state["last_risk_update"] = datetime.now().isoformat()
    print(f"[API] Updated {updated} edge risk scores")


# Startup/shutdown is handled by the lifespan handler defined above
# (_startup_warmup): self-initialization + scheduled risk refresh.


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

