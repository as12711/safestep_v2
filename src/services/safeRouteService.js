/**
 * SafeStep Safe Route Service v2.0
 * =================================
 * Unified routing service that combines:
 * - A* weighted graph pathfinding (primary)
 * - Mapbox fallback for areas without graph data
 * - Real-time safety scoring and updates
 * 
 * This replaces/wraps the original routingService with true
 * safety-weighted pathfinding capabilities.
 */

import { astarService } from './astarService';
import { graphBuilder, CAMPUS_BOUNDS } from './graphBuilder';
import { riskScoringService } from './riskScoringService';
import { navigationGraph } from './graphService';
import { ENV } from '../config/env';

// Mapbox fallback
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/walking';

// Default safety priority presets
const SAFETY_PRESETS = {
  fastest: { alpha: 0, label: 'Fastest Route', description: 'Shortest distance, ignores safety' },
  balanced: { alpha: 0.5, label: 'Balanced', description: 'Moderate safety consideration' },
  safe: { alpha: 1.0, label: 'Safe Route', description: 'Standard safety priority' },
  safer: { alpha: 2.0, label: 'Safer Route', description: 'Strong safety priority' },
  safest: { alpha: 5.0, label: 'Safest Route', description: 'Maximum safety, may be longer' },
};

class SafeRouteService {
  constructor() {
    this.graph = null;
    this.graphReady = false;
    this.currentCampus = null;
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN;
    
    // User preferences
    this.defaultAlpha = 1.0;
    this.avoidHighRisk = true;
    this.highRiskThreshold = 0.8;
  }

  // =========================================
  // INITIALIZATION
  // =========================================

  /**
   * Initialize the routing service for a campus/area
   */
  async initialize(campusId = 'manhattan', options = {}) {
    const { forceRefresh = false, onProgress = null } = options;

    try {
      // Try to load from cache first
      if (!forceRefresh) {
        const cached = await graphBuilder.loadFromCache(campusId);
        if (cached) {
          this.graph = cached;
          astarService.setGraph(this.graph);
          this.graphReady = true;
          this.currentCampus = campusId;
          console.log(`[SafeRoute] Loaded graph from cache: ${campusId}`);
          return { success: true, cached: true };
        }
      }

      // Build fresh graph from OSM
      this.graph = await graphBuilder.buildForCampus(campusId, {
        includeRiskScores: true,
        onProgress,
      });

      astarService.setGraph(this.graph);
      this.graphReady = true;
      this.currentCampus = campusId;

      // Cache for next time
      await graphBuilder.saveToCache(campusId);

      console.log(`[SafeRoute] Built and cached graph: ${campusId}`);
      return { success: true, cached: false, stats: this.graph.getStats() };

    } catch (error) {
      console.error('[SafeRoute] Initialization failed:', error);
      this.graphReady = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if we have graph data for a location
   */
  hasGraphCoverage(lat, lng) {
    if (!this.graph) return false;
    
    const bounds = this.graph.metadata.bounds;
    if (!bounds) return false;

    return lat >= bounds.minLat && lat <= bounds.maxLat &&
           lng >= bounds.minLng && lng <= bounds.maxLng;
  }

  // =========================================
  // MAIN ROUTING API
  // =========================================

  /**
   * Get safe route between two points
   * 
   * @param {Object} origin - {lat, lng}
   * @param {Object} destination - {lat, lng}
   * @param {Object} options - Routing options
   * @returns {Object} Route result with alternatives
   */
  async getRoute(origin, destination, options = {}) {
    const {
      alpha = this.defaultAlpha,
      alternatives = true,
      preset = null,
      avoidHighRisk = this.avoidHighRisk,
      highRiskThreshold = this.highRiskThreshold,
    } = options;

    // Apply preset if specified
    const effectiveAlpha = preset ? (SAFETY_PRESETS[preset]?.alpha ?? alpha) : alpha;

    // Check if we can use A* routing
    const canUseAStar = this.graphReady && 
                        this.hasGraphCoverage(origin.lat, origin.lng) &&
                        this.hasGraphCoverage(destination.lat, destination.lng);

    if (canUseAStar) {
      return this._getAStarRoute(origin, destination, {
        alpha: effectiveAlpha,
        alternatives,
        avoidHighRisk,
        highRiskThreshold,
      });
    } else {
      // Fallback to Mapbox with post-hoc scoring
      console.log('[SafeRoute] Using Mapbox fallback (no graph coverage)');
      return this._getMapboxRoute(origin, destination, { alternatives });
    }
  }

  /**
   * Get route using A* on our graph
   */
  async _getAStarRoute(origin, destination, options) {
    const { alpha, alternatives, avoidHighRisk, highRiskThreshold } = options;

    try {
      let routes;

      if (alternatives) {
        // Get multiple routes with different alpha values
        routes = astarService.findAlternatives(
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
          {
            alphaValues: [0, alpha * 0.5, alpha, alpha * 2],
            avoidHighRisk,
            highRiskThreshold,
          }
        );
      } else {
        // Single route
        const result = astarService.findPath(
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
          { alpha, avoidHighRisk, highRiskThreshold }
        );

        if (!result.success) {
          throw new Error(result.error || 'No path found');
        }

        routes = [result.toRouteFormat()];
      }

      // Mark best route
      if (routes.length > 0) {
        routes[0].recommended = true;
        routes[0].id = 'route-0';
        routes.forEach((r, i) => { r.id = `route-${i}`; });
      }

      return {
        success: true,
        routes,
        algorithm: 'A*',
        graphStats: this.graph.getStats(),
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('[SafeRoute] A* routing failed:', error);
      // Fallback to Mapbox
      return this._getMapboxRoute(origin, destination, { alternatives: true });
    }
  }

  /**
   * Fallback: Get route from Mapbox and score it
   */
  async _getMapboxRoute(origin, destination, options) {
    const { alternatives = true } = options;

    try {
      const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        alternatives: alternatives.toString(),
      });

      const url = `${MAPBOX_DIRECTIONS_URL}/${coords}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes) {
        throw new Error(data.message || 'No routes found');
      }

      // Convert and score routes
      const routes = await Promise.all(data.routes.map(async (route, index) => {
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        
        // Score the route segments
        const safetyScore = await this._scoreRouteSegments(coordinates);

        return {
          id: `route-${index}`,
          geometry: route.geometry,
          coordinates,
          distance: route.distance,
          duration: route.duration,
          safety: safetyScore,
          recommended: index === 0,
          label: index === 0 ? 'Recommended' : 'Alternative',
        };
      }));

      // Sort by safety
      routes.sort((a, b) => b.safety.score - a.safety.score);
      routes[0].recommended = true;
      routes[0].label = 'Safest Route';

      return {
        success: true,
        routes,
        algorithm: 'Mapbox+Scoring',
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('[SafeRoute] Mapbox routing failed:', error);
      return {
        success: false,
        error: error.message,
        routes: [],
      };
    }
  }

  /**
   * Score route segments for Mapbox fallback
   */
  async _scoreRouteSegments(coordinates) {
    let totalRisk = 0;
    let maxRisk = 0;
    let totalDistance = 0;
    const warnings = [];

    // Sample every ~50 meters
    for (let i = 0; i < coordinates.length - 1; i++) {
      const from = coordinates[i];
      const to = coordinates[i + 1];
      
      const segmentDistance = this._haversineDistance(from.lat, from.lng, to.lat, to.lng);
      totalDistance += segmentDistance;

      // Get risk at midpoint
      const midLat = (from.lat + to.lat) / 2;
      const midLng = (from.lng + to.lng) / 2;

      try {
        const riskResult = await riskScoringService.calculateEdgeRisk({
          startLat: from.lat,
          startLng: from.lng,
          endLat: to.lat,
          endLng: to.lng,
          distance: segmentDistance,
          properties: {},
        });

        const risk = riskResult.riskScore;
        totalRisk += risk * segmentDistance;
        maxRisk = Math.max(maxRisk, risk);

        if (risk > 0.6) {
          warnings.push({
            type: 'high_risk',
            lat: midLat,
            lng: midLng,
            severity: risk,
          });
        }
      } catch (e) {
        // Skip scoring errors
      }
    }

    const avgRisk = totalDistance > 0 ? totalRisk / totalDistance : 0;
    const score = Math.round(100 * (1 - avgRisk));

    return {
      score,
      level: this._getLevel(score),
      color: this._getColor(score),
      avgRisk,
      maxRisk,
      warnings,
    };
  }

  // =========================================
  // REAL-TIME UPDATES
  // =========================================

  /**
   * Update risks when a new incident is reported
   */
  async onIncidentReported(lat, lng, incidentType) {
    if (!this.graphReady) return;

    const update = await riskScoringService.updateRisksNearIncident(
      lat, lng, incidentType, 200
    );

    // Update affected edges in graph
    this.graph.updateRiskNearLocation(
      lat, lng, 
      update.radius, 
      update.riskDelta,
      { incident: incidentType, timestamp: Date.now() }
    );

    return update;
  }

  /**
   * Check if active route is still safe
   */
  async checkRouteSafety(route) {
    if (!route?.coordinates) return { safe: true };

    let maxRisk = 0;
    let unsafeSegment = null;

    for (let i = 0; i < route.coordinates.length - 1; i++) {
      const from = route.coordinates[i];
      const to = route.coordinates[i + 1];

      const riskResult = await riskScoringService.calculateEdgeRisk({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        distance: this._haversineDistance(from.lat, from.lng, to.lat, to.lng),
        properties: {},
      });

      if (riskResult.riskScore > maxRisk) {
        maxRisk = riskResult.riskScore;
        if (riskResult.riskScore > this.highRiskThreshold) {
          unsafeSegment = { from, to, risk: riskResult.riskScore };
        }
      }
    }

    return {
      safe: maxRisk < this.highRiskThreshold,
      maxRisk,
      unsafeSegment,
      shouldReroute: maxRisk > this.highRiskThreshold,
    };
  }

  // =========================================
  // USER PREFERENCES
  // =========================================

  /**
   * Set default safety priority
   */
  setDefaultAlpha(alpha) {
    this.defaultAlpha = Math.max(0, Math.min(10, alpha));
  }

  /**
   * Set high-risk avoidance
   */
  setAvoidHighRisk(avoid, threshold = 0.8) {
    this.avoidHighRisk = avoid;
    this.highRiskThreshold = threshold;
  }

  /**
   * Get available presets
   */
  getPresets() {
    return SAFETY_PRESETS;
  }

  // =========================================
  // UTILITIES
  // =========================================

  _getLevel(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'low';
    return 'unsafe';
  }

  _getColor(score) {
    if (score >= 80) return '#00f5d4';
    if (score >= 60) return '#FFB347';
    if (score >= 40) return '#ff9f43';
    return '#ff6b6b';
  }

  _haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // =========================================
  // STATUS
  // =========================================

  getStatus() {
    return {
      graphReady: this.graphReady,
      currentCampus: this.currentCampus,
      graphStats: this.graph?.getStats() || null,
      defaultAlpha: this.defaultAlpha,
      avoidHighRisk: this.avoidHighRisk,
    };
  }
}

// Export singleton
export const safeRouteService = new SafeRouteService();
export { SAFETY_PRESETS };
export default SafeRouteService;

