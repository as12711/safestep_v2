"""
SafeStep Safe Router
====================
Main routing engine using OSMnx/NetworkX for pathfinding.
Supports multiple routing algorithms with custom weight functions.
"""

import networkx as nx
import osmnx as ox
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import heapq

from .graph_manager import graph_manager, AREA_CONFIGS
from .weight_calculator import (
    UserProfile,
    WeightCalculator,
    EdgeData,
    create_weight_function,
    INFINITY,
)


@dataclass
class RouteSegment:
    """A single segment of a route."""
    from_node: int
    to_node: int
    from_coords: Tuple[float, float]  # (lat, lng)
    to_coords: Tuple[float, float]
    distance: float                    # meters
    cost: float                        # weighted cost
    crime_score: float
    is_lit: bool
    has_stairs: bool
    surface: str
    street_name: Optional[str]
    
    @property
    def risk_level(self) -> str:
        if self.crime_score <= 0.2:
            return "safe"
        elif self.crime_score <= 0.5:
            return "moderate"
        elif self.crime_score <= 0.7:
            return "caution"
        else:
            return "high_risk"
    
    @property
    def color(self) -> str:
        """Color for map rendering."""
        colors = {
            "safe": "#00f5d4",
            "moderate": "#7dffb3",
            "caution": "#FFB347",
            "high_risk": "#ff6b6b",
        }
        return colors.get(self.risk_level, "#888")


@dataclass
class Route:
    """Complete route with segments and metadata."""
    
    # Path data
    nodes: List[int] = field(default_factory=list)
    segments: List[RouteSegment] = field(default_factory=list)
    coordinates: List[Tuple[float, float]] = field(default_factory=list)
    
    # Metrics
    total_distance: float = 0         # meters
    total_cost: float = 0             # weighted cost
    estimated_time: float = 0         # minutes (at 1.4 m/s walking)
    
    # Safety
    avg_crime_score: float = 0
    max_crime_score: float = 0
    safety_score: int = 0             # 0-100
    risk_level: str = "safe"
    
    # Accessibility
    has_stairs: bool = False
    max_slope: float = 0
    is_accessible: bool = True
    
    # Metadata
    algorithm: str = "dijkstra"
    compute_time_ms: float = 0
    alpha: float = 1.0
    
    def to_geojson(self) -> Dict:
        """Convert route to GeoJSON for mapping."""
        return {
            "type": "Feature",
            "properties": {
                "distance": self.total_distance,
                "duration": self.estimated_time * 60,  # seconds
                "safety_score": self.safety_score,
                "risk_level": self.risk_level,
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[lng, lat] for lat, lng in self.coordinates],
            },
        }
    
    def to_dict(self) -> Dict:
        """Convert to API response format."""
        return {
            "distance": round(self.total_distance, 1),
            "duration": round(self.estimated_time, 1),
            "safety_score": self.safety_score,
            "risk_level": self.risk_level,
            "is_accessible": self.is_accessible,
            "has_stairs": self.has_stairs,
            "max_slope": round(self.max_slope, 1),
            "algorithm": self.algorithm,
            "compute_time_ms": round(self.compute_time_ms, 2),
            "coordinates": [{"lat": lat, "lng": lng} for lat, lng in self.coordinates],
            "segments": [
                {
                    "from_coords": list(seg.from_coords),
                    "to_coords": list(seg.to_coords),
                    "distance": round(seg.distance, 1),
                    "risk_level": seg.risk_level,
                    "color": seg.color,
                    "street_name": (
                        ", ".join(seg.street_name)
                        if isinstance(seg.street_name, list)
                        else seg.street_name
                    ),
                }
                for seg in self.segments
            ],
            "geojson": self.to_geojson(),
        }


class SafeRouter:
    """
    Main routing engine.
    
    Usage:
        router = SafeRouter()
        router.initialize("manhattan")
        route = router.find_route(origin, destination, profile)
    """
    
    def __init__(self):
        self.graph: Optional[nx.MultiDiGraph] = None
        self.area_id: Optional[str] = None
        self.calculator = WeightCalculator()
    
    def initialize(self, area_id: str, force_rebuild: bool = False) -> bool:
        """
        Initialize router for a specific area.
        
        Args:
            area_id: Area identifier (e.g., "manhattan", "nyu")
            force_rebuild: Force rebuild of graph
            
        Returns:
            True if successful
        """
        config = AREA_CONFIGS.get(area_id)
        if not config:
            raise ValueError(f"Unknown area: {area_id}. Available: {list(AREA_CONFIGS.keys())}")
        
        self.graph = graph_manager.get_graph(
            area_id=area_id,
            bounds=config.get("bounds"),
            place_name=config.get("place_name"),
            force_rebuild=force_rebuild,
        )
        self.area_id = area_id
        return True
    
    def find_route(
        self,
        origin: Tuple[float, float],      # (lat, lng)
        destination: Tuple[float, float],  # (lat, lng)
        profile: Optional[UserProfile] = None,
        algorithm: str = "dijkstra",
    ) -> Route:
        """
        Find the optimal safe route.
        
        Args:
            origin: (lat, lng) starting point
            destination: (lat, lng) ending point
            profile: User preferences and accessibility needs
            algorithm: "dijkstra", "astar", or "bellman-ford"
            
        Returns:
            Route object with path and metadata
        """
        if self.graph is None:
            raise RuntimeError("Router not initialized. Call initialize() first.")
        
        start_time = datetime.now()
        profile = profile or UserProfile.default()
        
        # Find nearest nodes
        origin_node = graph_manager.get_nearest_node(self.graph, origin[0], origin[1])
        dest_node = graph_manager.get_nearest_node(self.graph, destination[0], destination[1])
        
        if origin_node == dest_node:
            # Already at destination
            return self._create_empty_route(origin)
        
        # Create weight function
        weight_func = create_weight_function(profile)
        
        # Find shortest path
        try:
            if algorithm == "astar":
                # A* with Euclidean heuristic
                path = nx.astar_path(
                    self.graph,
                    origin_node,
                    dest_node,
                    heuristic=self._euclidean_heuristic,
                    weight=weight_func,
                )
            elif algorithm == "bellman-ford":
                # Bellman-Ford (handles negative weights)
                path = nx.bellman_ford_path(
                    self.graph,
                    origin_node,
                    dest_node,
                    weight=weight_func,
                )
            else:
                # Dijkstra (default, most efficient for positive weights)
                path = nx.dijkstra_path(
                    self.graph,
                    origin_node,
                    dest_node,
                    weight=weight_func,
                )
        except nx.NetworkXNoPath:
            raise ValueError("No path exists between origin and destination")
        except nx.NodeNotFound as e:
            raise ValueError(f"Node not found in graph: {e}")
        
        # Build route from path
        route = self._build_route(path, profile, algorithm)
        route.compute_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        route.alpha = profile.alpha
        
        return route
    
    def find_multiple_paths(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: Optional[UserProfile] = None,
        num_paths: int = 10,
    ) -> List[Route]:
        """
        Generate multiple diverse paths using Dijkstra with edge penalties.
        Routes ranked by diversity while maintaining safety.
        
        Args:
            origin: Starting point (lat, lng)
            destination: Ending point (lat, lng)
            profile: User preferences
            num_paths: Number of paths to generate (default 10)
            
        Returns:
            List of Route objects with diverse paths
        """
        if self.graph is None:
            raise RuntimeError("Router not initialized. Call initialize() first.")
        
        profile = profile or UserProfile.default()
        start_time = datetime.now()
        
        # Find nearest nodes
        origin_node = graph_manager.get_nearest_node(self.graph, origin[0], origin[1])
        dest_node = graph_manager.get_nearest_node(self.graph, destination[0], destination[1])
        
        if origin_node == dest_node:
            return [self._create_empty_route(origin)]
        
        routes = []
        used_edges = {}  # Track edge usage across routes
        weight_func = create_weight_function(profile)
        
        # Generate 10 paths with escalating diversity penalties
        diversity_multipliers = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.5, 8.0, 10.0, 12.0]
        
        for path_idx, diversity_mult in enumerate(diversity_multipliers):
            if len(routes) >= num_paths:
                break
            
            try:
                # Create custom weight function with edge penalties
                def weighted_cost(u, v, d):
                    base_cost = weight_func(u, v, d)
                    # Add penalty for previously used edges
                    edge_key = (u, v, 0) if (u, v, 0) in self.graph.edges else (u, v)
                    penalty = used_edges.get(edge_key, 0) * diversity_mult * 500
                    return base_cost + penalty
                
                # Find path with penalties
                path = nx.dijkstra_path(
                    self.graph,
                    origin_node,
                    dest_node,
                    weight=weighted_cost,
                )
                
                # Check if this path is unique enough
                path_edges = set((path[i], path[i+1]) for i in range(len(path)-1))
                
                # Reject if too similar to existing routes (>85% overlap)
                too_similar = False
                for existing_route in routes:
                    existing_edges = set((existing_route.nodes[i], existing_route.nodes[i+1]) 
                                        for i in range(len(existing_route.nodes)-1))
                    overlap = len(path_edges & existing_edges) / max(len(path_edges), len(existing_edges), 1)
                    if overlap > 0.85:
                        too_similar = True
                        break
                
                if too_similar:
                    continue
                
                # Build route from path
                route = self._build_route(path, profile, "dijkstra")
                route.compute_time_ms = (datetime.now() - start_time).total_seconds() * 1000
                route.alpha = profile.alpha
                routes.append(route)
                
                # Track edge usage
                for u, v in path_edges:
                    key = (u, v, 0) if (u, v, 0) in self.graph.edges else (u, v)
                    used_edges[key] = used_edges.get(key, 0) + 1
                    
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue
        
        # Sort by safety score (safest first)
        routes.sort(key=lambda r: r.safety_score, reverse=True)
        
        return routes if routes else [self._create_empty_route(origin)]
    
    def find_alternatives(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: Optional[UserProfile] = None,
        num_alternatives: int = 3,
    ) -> List[Route]:
        """
        Find multiple alternative routes with different safety priorities.
        
        Args:
            origin: Starting point
            destination: Ending point
            profile: Base user profile
            num_alternatives: Number of alternatives to find
            
        Returns:
            List of routes sorted by safety score (safest first)
        """
        profile = profile or UserProfile.default()
        routes = []
        seen_paths = set()
        
        # Try different alpha values
        alpha_values = [0, 0.5, 1.0, 2.0, 5.0]
        
        for alpha in alpha_values:
            try:
                variant_profile = UserProfile(
                    mobility=profile.mobility,
                    needs_accessible=profile.needs_accessible,
                    max_slope=profile.max_slope,
                    avoid_stairs=profile.avoid_stairs,
                    alpha=alpha,
                    avoid_high_risk=profile.avoid_high_risk if alpha > 0 else False,
                )
                
                route = self.find_route(origin, destination, variant_profile)
                
                # Check if this is a unique path
                path_key = tuple(route.nodes)
                if path_key not in seen_paths:
                    seen_paths.add(path_key)
                    routes.append(route)
                
                if len(routes) >= num_alternatives:
                    break
                    
            except Exception as e:
                print(f"[SafeRouter] Alternative route failed (alpha={alpha}): {e}")
                continue
        
        # Sort by safety score (highest first)
        routes.sort(key=lambda r: r.safety_score, reverse=True)
        
        return routes
    
    def _build_route(
        self,
        path: List[int],
        profile: UserProfile,
        algorithm: str,
    ) -> Route:
        """Build Route object from node path."""
        route = Route(nodes=path, algorithm=algorithm)
        
        calculator = WeightCalculator()
        total_crime = 0
        
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            
            # Get edge data (use first edge if multiple)
            edge_data = self.graph.edges[u, v, 0]
            edge = EdgeData.from_networkx(edge_data)
            
            # Calculate cost
            cost = calculator.calculate_weight(edge, profile)
            
            # Get coordinates
            u_coords = graph_manager.get_node_coords(self.graph, u)
            v_coords = graph_manager.get_node_coords(self.graph, v)
            
            # Create segment
            segment = RouteSegment(
                from_node=u,
                to_node=v,
                from_coords=u_coords,
                to_coords=v_coords,
                distance=edge.length,
                cost=cost,
                crime_score=edge.crime_score,
                is_lit=edge.is_lit,
                has_stairs=edge.has_stairs,
                surface=edge.surface,
                street_name=edge.name,
            )
            route.segments.append(segment)
            
            # Add coordinates (avoid duplicates)
            edge_geometry = graph_manager.get_edge_geometry(self.graph, u, v)
            for coord in edge_geometry:
                if not route.coordinates or route.coordinates[-1] != coord:
                    route.coordinates.append(coord)
            
            # Accumulate metrics
            route.total_distance += edge.length
            route.total_cost += cost
            total_crime += edge.crime_score * edge.length
            route.max_crime_score = max(route.max_crime_score, edge.crime_score)
            route.max_slope = max(route.max_slope, edge.slope)
            
            if edge.has_stairs:
                route.has_stairs = True
                route.is_accessible = False
        
        # Calculate averages
        if route.total_distance > 0:
            route.avg_crime_score = total_crime / route.total_distance
        
        # Walking time at 1.4 m/s (average walking speed)
        route.estimated_time = route.total_distance / 84  # meters/minute
        
        # Safety score (0-100, higher is safer)
        route.safety_score = int(100 * (1 - route.avg_crime_score))
        
        # Risk level
        if route.avg_crime_score <= 0.2:
            route.risk_level = "safe"
        elif route.avg_crime_score <= 0.4:
            route.risk_level = "moderate"
        elif route.avg_crime_score <= 0.6:
            route.risk_level = "caution"
        else:
            route.risk_level = "high_risk"
        
        return route
    
    def _create_empty_route(self, origin: Tuple[float, float]) -> Route:
        """Create empty route when already at destination."""
        return Route(
            coordinates=[origin],
            total_distance=0,
            safety_score=100,
            risk_level="safe",
        )
    
    def _euclidean_heuristic(self, u: int, v: int) -> float:
        """Euclidean distance heuristic for A*."""
        u_coords = graph_manager.get_node_coords(self.graph, u)
        v_coords = graph_manager.get_node_coords(self.graph, v)
        
        # Haversine distance in meters
        return ox.distance.great_circle(
            u_coords[0], u_coords[1],
            v_coords[0], v_coords[1],
        )
    
    def update_edge_risk(
        self,
        lat: float,
        lng: float,
        crime_score: float,
        radius_meters: float = 100,
    ):
        """
        Update crime scores for edges near a location.
        Called when new incidents are reported.
        """
        if self.graph is None:
            return
        
        # Find nearby edges and update their crime scores
        # This is a simplified version - production would use spatial indexing
        for u, v, key, data in self.graph.edges(keys=True, data=True):
            u_coords = graph_manager.get_node_coords(self.graph, u)
            
            # Check if edge is within radius
            dist = ox.distance.great_circle(lat, lng, u_coords[0], u_coords[1])
            if dist <= radius_meters:
                # Blend new score with existing (proximity-weighted)
                proximity_factor = 1 - (dist / radius_meters)
                old_score = data.get("crime_score", 0)
                new_score = old_score + (crime_score - old_score) * proximity_factor * 0.5
                data["crime_score"] = min(1.0, new_score)
    
    def get_stats(self) -> Dict:
        """Get router statistics."""
        if self.graph is None:
            return {"status": "not_initialized"}
        
        return {
            "status": "ready",
            "area_id": self.area_id,
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
        }


# Singleton instance
safe_router = SafeRouter()

