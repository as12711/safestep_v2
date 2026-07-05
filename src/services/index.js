/**
 * Services Index - Central export point
 * Routing is server-side via the backend /route/app endpoint (see MapScreen).
 * The former on-device A-star, temporal, and density stack was removed as dead code.
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
