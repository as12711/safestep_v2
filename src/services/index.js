/**
 * Services Index - Central export point
 * v4.0: Added A* routing, temporal routing, density prediction, spatial indexing
 */

// Core infrastructure
export { supabase } from './supabase';
export { mapbox } from './mapbox';
export { connectionManager } from './connectionManager';

// Location and search
export { 
  locationService, 
  LOCATION_STATUS, 
  MOVEMENT_STATE,
  THRESHOLDS,
  ACCURACY_CONFIGS,
} from './locationService';
export { 
  searchService, 
  SEARCH_CATEGORIES, 
  SAVED_LOCATION_TYPES 
} from './searchService';

// Safety data
export { crimeDataService, INCIDENT_WEIGHTS } from './crimeData';
export {
  riskScoringService,
  RISK_WEIGHTS,
  INCIDENT_SEVERITY,
  INFRASTRUCTURE_SAFETY,
} from './riskScoringService';

// Graph and routing (A* weighted graph traversal)
export { navigationGraph, GraphNode, GraphEdge, NavigationGraph } from './graphService';
export { astarService, PriorityQueue, AStarResult } from './astarService';
export { safeRouteService } from './safeRouteService';

// Temporal and density-aware routing
export { 
  temporalRoutingService, 
  CachedRoute,
  CACHE_CONFIG,
} from './temporalRoutingService';
export { 
  densityPredictionService, 
  HIGH_DENSITY_LOCATIONS,
  DEFAULT_PATTERNS,
} from './densityPredictionService';

// Spatial indexing
export { 
  spatialIndexService, 
  RTree, 
  BoundingBox,
} from './spatialIndexService';

// User features
export {
  promptingService,
  PROMPT_TYPES,
} from './promptingService';
export {
  homeBeaconService,
  BEACON_STATUS,
} from './homeBeaconService';
