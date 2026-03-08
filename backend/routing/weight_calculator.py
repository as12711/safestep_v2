"""
SafeStep Weight Calculator
==========================
Calculates edge traversal costs with:
- Hard constraints (accessibility) - return INFINITY to block
- Soft constraints (safety) - add penalty to base cost

Cost Formula:
    cost = base_cost + safety_penalty + time_penalty
    
Where:
    base_cost = edge.length (meters)
    safety_penalty = crime_score * alpha
    time_penalty = time-of-day adjustments
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from enum import Enum
import math
from datetime import datetime


# Effectively infinite cost - blocks the path
INFINITY = float("inf")

# Maximum allowed slope for wheelchair (ADA standard ~8.33%)
MAX_WHEELCHAIR_SLOPE = 8.0

# Maximum slope for comfortable walking
MAX_COMFORTABLE_SLOPE = 12.0


class MobilityLevel(Enum):
    """User mobility capability levels."""
    FULL = "full"                    # No restrictions
    LIMITED = "limited"              # Avoid steep slopes
    WHEELCHAIR = "wheelchair"        # Requires accessible paths
    CRUTCHES = "crutches"           # Avoid stairs, steep slopes
    STROLLER = "stroller"           # Similar to wheelchair


@dataclass
class UserProfile:
    """User preferences and accessibility needs."""
    
    # Accessibility
    mobility: MobilityLevel = MobilityLevel.FULL
    needs_accessible: bool = False
    max_slope: float = 15.0           # Maximum slope in percent
    avoid_stairs: bool = False
    min_path_width: float = 0.9       # Minimum width in meters
    
    # Safety preferences
    alpha: float = 1.0                # Safety priority factor (0-5)
    avoid_high_risk: bool = True
    high_risk_threshold: float = 0.7  # Risk score above this = avoid
    
    # Time preferences
    prefer_lit_paths: bool = True     # Stronger preference at night
    prefer_busy_areas: bool = True    # Prefer areas with foot traffic
    
    # Route preferences
    prefer_sidewalks: bool = True
    avoid_highways: bool = True
    
    @classmethod
    def accessible(cls) -> "UserProfile":
        """Preset for wheelchair users."""
        return cls(
            mobility=MobilityLevel.WHEELCHAIR,
            needs_accessible=True,
            max_slope=MAX_WHEELCHAIR_SLOPE,
            avoid_stairs=True,
            min_path_width=1.2,
            alpha=1.5,  # Slightly higher safety priority
        )
    
    @classmethod
    def default(cls) -> "UserProfile":
        """Default profile."""
        return cls()
    
    @classmethod
    def safety_first(cls) -> "UserProfile":
        """Preset prioritizing safety."""
        return cls(
            alpha=3.0,
            avoid_high_risk=True,
            high_risk_threshold=0.5,
            prefer_lit_paths=True,
            prefer_busy_areas=True,
        )


@dataclass
class EdgeData:
    """Edge attributes for weight calculation."""
    
    # Physical properties
    length: float = 50.0              # meters
    slope: float = 0.0                # percent grade
    width: float = 2.0                # meters
    surface: str = "paved"
    has_stairs: bool = False
    has_sidewalk: bool = True
    
    # Safety scores (0 = safe, 1 = dangerous)
    crime_score: float = 0.0
    
    # Environment scores (0 = bad, 1 = good)
    infrastructure_score: float = 0.5
    lighting_score: float = 0.5
    crowd_score: float = 0.5
    
    # Metadata
    highway_type: str = "footway"
    is_lit: bool = False
    name: Optional[str] = None
    
    @classmethod
    def from_networkx(cls, edge_data: Dict[str, Any]) -> "EdgeData":
        """Create from NetworkX edge data dict."""
        return cls(
            length=edge_data.get("length", 50.0),
            slope=abs(edge_data.get("slope", edge_data.get("grade", 0.0))),
            width=edge_data.get("width", 2.0),
            surface=edge_data.get("surface", "unknown"),
            has_stairs=edge_data.get("has_stairs", edge_data.get("highway") == "steps"),
            has_sidewalk=edge_data.get("has_sidewalk", True),
            crime_score=edge_data.get("crime_score", 0.0),
            infrastructure_score=edge_data.get("infrastructure_score", 0.5),
            lighting_score=edge_data.get("lighting_score", 0.5),
            crowd_score=edge_data.get("crowd_score", 0.5),
            highway_type=edge_data.get("highway", "footway"),
            is_lit=edge_data.get("is_lit", edge_data.get("lit") == "yes"),
            name=edge_data.get("name"),
        )


class WeightCalculator:
    """
    Calculates edge traversal costs.
    
    Design:
    - HARD constraints return INFINITY (path is blocked)
    - SOFT constraints add penalties to base cost
    """
    
    def __init__(self):
        self.is_night = self._check_night_time()
    
    def calculate_weight(
        self,
        edge: EdgeData,
        user_profile: UserProfile,
    ) -> float:
        """
        Calculate the traversal cost for an edge.
        
        Args:
            edge: Edge attributes
            user_profile: User preferences and needs
            
        Returns:
            Cost in "safety-adjusted meters" or INFINITY if blocked
        """
        
        # ==========================================
        # 1. HARD CONSTRAINTS (return INFINITY)
        # ==========================================
        
        # Accessibility: Stairs
        if user_profile.avoid_stairs and edge.has_stairs:
            return INFINITY
        
        # Accessibility: Slope too steep
        if edge.slope > user_profile.max_slope:
            return INFINITY
        
        # Accessibility: Path too narrow
        if edge.width < user_profile.min_path_width:
            return INFINITY
        
        # Safety: Hard-avoid high-risk areas
        if user_profile.avoid_high_risk:
            if edge.crime_score > user_profile.high_risk_threshold:
                return INFINITY
        
        # ==========================================
        # 2. BASE COST
        # ==========================================
        
        base_cost = edge.length  # Start with physical distance
        
        # ==========================================
        # 3. SOFT CONSTRAINTS (add penalties)
        # ==========================================
        
        # --- Safety Penalty ---
        # cost += length * alpha * crime_score
        safety_penalty = edge.length * user_profile.alpha * edge.crime_score
        
        # --- Slope Penalty ---
        # Uphill is harder, steeper = more penalty
        if edge.slope > 0:
            # Each 1% grade adds 10% to the cost
            slope_penalty = edge.length * (edge.slope / 100) * 1.5
        else:
            slope_penalty = 0
        
        # --- Surface Penalty ---
        surface_penalty = self._get_surface_penalty(edge.surface, edge.length)
        
        # --- Night-time Adjustments ---
        night_penalty = 0
        if self.is_night:
            # Penalty for poorly lit paths
            if user_profile.prefer_lit_paths and not edge.is_lit:
                night_penalty += edge.length * 0.3 * (1 - edge.lighting_score)
            
            # Penalty for quiet areas at night
            if user_profile.prefer_busy_areas:
                night_penalty += edge.length * 0.2 * (1 - edge.crowd_score)
        
        # --- Sidewalk Preference ---
        sidewalk_penalty = 0
        if user_profile.prefer_sidewalks and not edge.has_sidewalk:
            sidewalk_penalty = edge.length * 0.15
        
        # --- Infrastructure Bonus (negative penalty) ---
        # Areas with good safety infrastructure get a discount
        infrastructure_bonus = edge.length * 0.1 * (edge.infrastructure_score - 0.5)
        
        # ==========================================
        # 4. TOTAL COST
        # ==========================================
        
        total_cost = (
            base_cost
            + safety_penalty
            + slope_penalty
            + surface_penalty
            + night_penalty
            + sidewalk_penalty
            - infrastructure_bonus  # Subtract bonus
        )
        
        # Ensure non-negative
        return max(0.01, total_cost)
    
    def _get_surface_penalty(self, surface: str, length: float) -> float:
        """Penalty for difficult surfaces."""
        penalties = {
            "paved": 0,
            "asphalt": 0,
            "concrete": 0,
            "cobblestone": 0.2,
            "gravel": 0.3,
            "unpaved": 0.4,
            "dirt": 0.4,
            "grass": 0.5,
            "sand": 0.6,
            "mud": 0.8,
            "unknown": 0.1,
        }
        factor = penalties.get(surface.lower(), 0.1)
        return length * factor
    
    def _check_night_time(self) -> bool:
        """Check if it's currently night (8 PM - 6 AM)."""
        hour = datetime.now().hour
        return hour >= 20 or hour < 6
    
    def update_time(self):
        """Refresh the night-time flag."""
        self.is_night = self._check_night_time()


def create_weight_function(user_profile: UserProfile):
    """
    Create a weight function compatible with NetworkX shortest_path.
    
    Usage:
        weight_func = create_weight_function(profile)
        path = nx.shortest_path(G, source, target, weight=weight_func)
    
    Args:
        user_profile: User preferences and accessibility needs
        
    Returns:
        Callable that takes (u, v, edge_data) and returns weight
    """
    calculator = WeightCalculator()
    
    def weight_function(u: int, v: int, edge_data: Dict[str, Any]) -> float:
        edge = EdgeData.from_networkx(edge_data)
        return calculator.calculate_weight(edge, user_profile)
    
    return weight_function


# Convenience presets
def fastest_weight(u: int, v: int, edge_data: Dict[str, Any]) -> float:
    """Pure distance optimization (ignores safety)."""
    return edge_data.get("length", 50)


def safe_weight(u: int, v: int, edge_data: Dict[str, Any]) -> float:
    """Standard safety-weighted routing."""
    profile = UserProfile.default()
    return create_weight_function(profile)(u, v, edge_data)


def accessible_weight(u: int, v: int, edge_data: Dict[str, Any]) -> float:
    """Wheelchair-accessible routing."""
    profile = UserProfile.accessible()
    return create_weight_function(profile)(u, v, edge_data)

