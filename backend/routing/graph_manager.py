"""
SafeStep Graph Manager
======================
Manages the street network graph using OSMnx/NetworkX.
Handles graph construction, caching, and updates.
"""

import osmnx as ox
import networkx as nx
import pickle
import os
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta

# Configure OSMnx
ox.settings.use_cache = True
ox.settings.log_console = False
ox.settings.cache_folder = Path(__file__).parent / ".cache"


class GraphManager:
    """
    Manages pedestrian network graphs for routing.
    """
    
    def __init__(self, cache_dir: str = "./graph_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.graphs: Dict[str, nx.MultiDiGraph] = {}
        self.graph_metadata: Dict[str, Dict] = {}
    
    # =========================================
    # GRAPH CONSTRUCTION
    # =========================================
    
    def get_graph(
        self,
        area_id: str,
        bounds: Optional[Tuple[float, float, float, float]] = None,
        place_name: Optional[str] = None,
        force_rebuild: bool = False
    ) -> nx.MultiDiGraph:
        """
        Get or build a pedestrian network graph for an area.
        
        Args:
            area_id: Unique identifier for the area (e.g., "nyu", "manhattan")
            bounds: (north, south, east, west) bounding box
            place_name: OSM place name (e.g., "Manhattan, New York, USA")
            force_rebuild: Force rebuild even if cached
            
        Returns:
            NetworkX MultiDiGraph with pedestrian network
        """
        # Check memory cache first
        if area_id in self.graphs and not force_rebuild:
            return self.graphs[area_id]
        
        # Check disk cache
        cache_path = self.cache_dir / f"{area_id}.pkl"
        if cache_path.exists() and not force_rebuild:
            graph = self._load_from_cache(cache_path)
            if graph is not None:
                self.graphs[area_id] = graph
                return graph
        
        # Build fresh graph
        print(f"[GraphManager] Building graph for {area_id}...")
        
        if place_name:
            graph = self._build_from_place(place_name)
        elif bounds:
            graph = self._build_from_bounds(bounds)
        else:
            raise ValueError("Must provide either bounds or place_name")
        
        # Add custom edge attributes
        graph = self._enrich_graph(graph)
        
        # Cache to disk and memory
        self._save_to_cache(graph, cache_path, area_id)
        self.graphs[area_id] = graph
        
        print(f"[GraphManager] Graph ready: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
        return graph
    
    def _build_from_place(self, place_name: str) -> nx.MultiDiGraph:
        """Build graph from a place name (geocoded)."""
        return ox.graph_from_place(
            place_name,
            network_type="walk",
            simplify=True,
            retain_all=False,
            truncate_by_edge=True,
            custom_filter='["highway"~"footway|pedestrian|path|steps|residential|living_street|tertiary|secondary|primary|unclassified|service|cycleway"]'
        )
    
    def _build_from_bounds(self, bounds: Tuple[float, float, float, float]) -> nx.MultiDiGraph:
        """Build graph from bounding box (north, south, east, west)."""
        north, south, east, west = bounds
        # OSMnx 2.x uses bbox=(west, south, east, north) tuple format
        return ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type="walk",
            simplify=True,
            retain_all=False,
            truncate_by_edge=True,
        )
    
    def _enrich_graph(self, graph: nx.MultiDiGraph) -> nx.MultiDiGraph:
        """Add custom attributes to edges for routing."""
        
        # Add elevation data if available (requires Google API key)
        # graph = ox.elevation.add_node_elevations_google(graph, api_key=GOOGLE_API_KEY)
        # graph = ox.elevation.add_edge_grades(graph)
        
        for u, v, key, data in graph.edges(keys=True, data=True):
            # Ensure length exists
            if "length" not in data:
                data["length"] = 50  # Default 50m
            
            # Initialize safety/accessibility attributes
            data["crime_score"] = 0.0        # Will be updated by RiskService
            data["infrastructure_score"] = 0.5
            data["lighting_score"] = 0.5
            data["crowd_score"] = 0.5
            
            # Accessibility attributes
            data["has_stairs"] = data.get("highway") == "steps"
            data["slope"] = data.get("grade", 0.0)  # Grade in percent
            data["surface"] = data.get("surface", "unknown")
            data["width"] = self._parse_width(data.get("width"))
            
            # Is it lit?
            data["is_lit"] = data.get("lit") == "yes"
            
            # Sidewalk info
            data["has_sidewalk"] = data.get("sidewalk") not in [None, "no", "none"]
        
        return graph
    
    def _parse_width(self, width_str: Optional[str]) -> float:
        """Parse OSM width string to meters."""
        if not width_str:
            return 2.0  # Default 2m
        try:
            # Handle "2.5 m", "2.5m", "2.5"
            return float(width_str.replace("m", "").strip())
        except:
            return 2.0
    
    # =========================================
    # CACHE MANAGEMENT
    # =========================================
    
    def _load_from_cache(self, cache_path: Path) -> Optional[nx.MultiDiGraph]:
        """Load graph from pickle cache."""
        try:
            with open(cache_path, "rb") as f:
                data = pickle.load(f)
            
            # Check cache age (rebuild if > 7 days old)
            cache_time = data.get("timestamp", datetime.min)
            if datetime.now() - cache_time > timedelta(days=7):
                print(f"[GraphManager] Cache expired: {cache_path}")
                return None
            
            return data["graph"]
        except Exception as e:
            print(f"[GraphManager] Cache load failed: {e}")
            return None
    
    def _save_to_cache(self, graph: nx.MultiDiGraph, cache_path: Path, area_id: str):
        """Save graph to pickle cache."""
        try:
            data = {
                "graph": graph,
                "timestamp": datetime.now(),
                "area_id": area_id,
                "nodes": graph.number_of_nodes(),
                "edges": graph.number_of_edges(),
            }
            with open(cache_path, "wb") as f:
                pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
            print(f"[GraphManager] Cached graph: {cache_path}")
        except Exception as e:
            print(f"[GraphManager] Cache save failed: {e}")
    
    def clear_cache(self, area_id: Optional[str] = None):
        """Clear cached graphs."""
        if area_id:
            cache_path = self.cache_dir / f"{area_id}.pkl"
            if cache_path.exists():
                cache_path.unlink()
            self.graphs.pop(area_id, None)
        else:
            for f in self.cache_dir.glob("*.pkl"):
                f.unlink()
            self.graphs.clear()
    
    # =========================================
    # GRAPH QUERIES
    # =========================================
    
    def get_nearest_node(
        self, 
        graph: nx.MultiDiGraph, 
        lat: float, 
        lng: float
    ) -> int:
        """Find nearest graph node to a coordinate."""
        return ox.distance.nearest_nodes(graph, lng, lat)
    
    def get_node_coords(self, graph: nx.MultiDiGraph, node_id: int) -> Tuple[float, float]:
        """Get (lat, lng) for a node."""
        return (graph.nodes[node_id]["y"], graph.nodes[node_id]["x"])
    
    def get_edge_geometry(
        self, 
        graph: nx.MultiDiGraph, 
        u: int, 
        v: int, 
        key: int = 0
    ) -> list:
        """Get edge geometry as list of (lat, lng) coords."""
        edge_data = graph.edges[u, v, key]
        
        if "geometry" in edge_data:
            # Has detailed geometry
            coords = list(edge_data["geometry"].coords)
            return [(lat, lng) for lng, lat in coords]
        else:
            # Straight line between nodes
            u_coords = self.get_node_coords(graph, u)
            v_coords = self.get_node_coords(graph, v)
            return [u_coords, v_coords]


# Pre-defined area configurations
AREA_CONFIGS = {
    "nyu": {
        "bounds": (40.7350, 40.7270, -73.9920, -74.0030),  # N, S, E, W
        "place_name": None,
    },
    "columbia": {
        "bounds": (40.8150, 40.8030, -73.9550, -73.9680),
        "place_name": None,
    },
    "manhattan": {
        "bounds": None,
        "place_name": "Manhattan, New York City, New York, USA",
    },
    "brooklyn": {
        "bounds": None,
        "place_name": "Brooklyn, New York City, New York, USA",
    },
}


# Singleton instance
graph_manager = GraphManager()

