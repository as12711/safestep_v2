/**
 * SafeStep Temporal Routing Service v1.0
 * ======================================
 * Time-Dependent Shortest Path (TDSP) extensions for A* routing.
 * 
 * Key Enhancement:
 *   cost(edge, time) = distance × (1 + α × risk(time)) × densityModifier(time)
 * 
 * This service wraps the base A* service to add:
 *   - Time-parameterized edge costs
 *   - Density-aware routing (prefer crowded paths)
 *   - Departure time optimization
 *   - Route caching for popular origin-destination pairs
 * 
 * Integration:
 *   The A* algorithm remains unchanged. We modify the edge lookup:
 *   edge.getCost(alpha) → getTemporalCost(edge, alpha, time, options)
 */

import { astarService, PriorityQueue, AStarResult } from './astarService';
import { navigationGraph } from './graphService';
import { densityPredictionService } from './densityPredictionService';
import { riskScoringService } from './riskScoringService';

// Cache configuration
const CACHE_CONFIG = {
  maxEntries: 1000,
  ttlMs: 15 * 60 * 1000, // 15 minutes
  popularRouteTTL: 60 * 60 * 1000, // 1 hour for pre-computed routes
};

// Time buckets for caching (15-minute intervals)
const TIME_BUCKET_MINUTES = 15;

/**
 * Route cache entry
 */
class CachedRoute {
  constructor(route, timeBucket, options) {
    this.route = route;
    this.timeBucket = timeBucket;
    this.options = options;
    this.createdAt = Date.now();
    this.hits = 0;
  }

  isExpired(ttl = CACHE_CONFIG.ttlMs) {
    return Date.now() - this.createdAt > ttl;
  }

  isValid(currentTimeBucket) {
    return !this.isExpired() && this.timeBucket === currentTimeBucket;
  }
}

/**
 * Temporal Routing Service
 */
class TemporalRoutingService {
  constructor() {
    // Route cache: Map<cacheKey, CachedRoute>
    this.routeCache = new Map();
    
    // Popular routes (pre-computed): Map<routeId, Map<timeBucket, route>>
    this.popularRoutes = new Map();
    
    // Weight for density in routing (0 = ignore density, 1 = maximize density)
    this.densityWeight = 0.3;
    
    // Feature flags
    this.useTemporalRisk = true;
    this.useDensityRouting = true;
    this.useCaching = true;
  }

  // =========================================
  // MAIN ROUTING API
  // =========================================

  /**
   * Find optimal path with temporal awareness
   * 
   * @param {Object} start - Start coordinates {lat, lng}
   * @param {Object} goal - Goal coordinates {lat, lng}
   * @param {Object} options - Routing options
   * @returns {Object} Route result with temporal metadata
   */
  async findTemporalPath(start, goal, options = {}) {
    const {
      alpha = 1.0,                    // Safety priority
      departureTime = new Date(),     // When user leaves
      optimizeForDensity = true,      // Prefer crowded paths
      useCache = this.useCaching,     // Check cache first
      maxNodes = 10000,
    } = options;

    const timeBucket = this._getTimeBucket(departureTime);
    
    // Check cache first
    if (useCache) {
      const cached = this._getCachedRoute(start, goal, timeBucket, options);
      if (cached) {
        cached.hits++;
        return this._enrichRouteWithTemporal(cached.route, departureTime);
      }
    }

    // Use modified A* with temporal cost function
    const graph = navigationGraph;
    const result = await this._runTemporalAStar(
      graph, start, goal, 
      { alpha, departureTime, optimizeForDensity, maxNodes }
    );

    // Cache the result
    if (useCache && result.success) {
      this._cacheRoute(start, goal, timeBucket, options, result);
    }

    return this._enrichRouteWithTemporal(result, departureTime);
  }

  /**
   * Find optimal departure time for a route
   * Maximizes density/visibility along the path
   */
  async findOptimalDeparture(start, goal, options = {}) {
    const {
      desiredArrival = new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
      windowMinutes = 60,
      alpha = 1.0,
    } = options;

    // First, find a reference route
    const referenceRoute = await this.findTemporalPath(start, goal, {
      alpha,
      departureTime: new Date(),
      optimizeForDensity: false,
    });

    if (!referenceRoute.success) {
      return { error: 'Could not find route' };
    }

    // Use density service to find optimal departure
    const optimal = densityPredictionService.getOptimalDepartureTime(
      referenceRoute.edges || [],
      desiredArrival,
      windowMinutes
    );

    // Get routes for top 3 departure times
    const detailedAlternatives = [];
    for (const alt of optimal.alternatives.slice(0, 3)) {
      const route = await this.findTemporalPath(start, goal, {
        alpha,
        departureTime: alt.departureTime,
        optimizeForDensity: true,
      });

      if (route.success) {
        detailedAlternatives.push({
          ...route,
          departureTime: alt.departureTime,
          avgDensity: alt.avgDensity,
          densityMessage: alt.message,
        });
      }
    }

    return {
      optimal: optimal.optimal,
      onTime: optimal.onTime,
      routes: detailedAlternatives,
      referenceRoute,
    };
  }

  /**
   * Get real-time updates for an active route
   * Called periodically during navigation
   */
  async getRouteUpdates(currentRoute, currentPosition, options = {}) {
    const {
      recheckInterval = 5 * 60 * 1000, // 5 minutes
      lastCheck = 0,
    } = options;

    const now = Date.now();
    
    // Only recheck if enough time has passed
    if (now - lastCheck < recheckInterval) {
      return { shouldReroute: false };
    }

    // Check if conditions have changed significantly
    const currentTimeBucket = this._getTimeBucket(new Date());
    const originalTimeBucket = this._getTimeBucket(new Date(currentRoute.departureTime));

    // If time bucket changed, conditions may have changed
    if (currentTimeBucket !== originalTimeBucket) {
      // Get updated density for remaining route
      const remainingEdges = this._getRemainingEdges(currentRoute, currentPosition);
      
      let newAvgDensity = 0;
      for (const edge of remainingEdges) {
        const edgeId = `${edge.from}-${edge.to}`;
        const { density } = densityPredictionService.getPredictedDensity(edgeId, new Date());
        newAvgDensity += density;
      }
      newAvgDensity /= Math.max(1, remainingEdges.length);

      // Significant density drop = suggest reroute
      if (newAvgDensity < currentRoute.avgDensity * 0.5) {
        return {
          shouldReroute: true,
          reason: 'density_drop',
          newDensity: newAvgDensity,
          oldDensity: currentRoute.avgDensity,
        };
      }
    }

    return { shouldReroute: false };
  }

  // =========================================
  // TEMPORAL A* IMPLEMENTATION
  // =========================================

  /**
   * Modified A* with temporal edge costs
   */
  async _runTemporalAStar(graph, start, goal, options) {
    const { alpha, departureTime, optimizeForDensity, maxNodes } = options;
    const startTime = performance.now();
    const result = new AStarResult();

    // Find nearest nodes
    const startResult = graph.findNearestNode(start.lat, start.lng);
    const goalResult = graph.findNearestNode(goal.lat, goal.lng);

    if (!startResult || !goalResult) {
      result.success = false;
      result.error = 'Could not find nodes near start or goal';
      return result;
    }

    const startNode = startResult.node;
    const goalNode = goalResult.node;

    if (startNode.id === goalNode.id) {
      result.success = true;
      result.path = [startNode.id];
      return result;
    }

    // A* data structures
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();
    const arrivalTime = new Map(); // Track estimated arrival time at each node

    // Initialize
    gScore.set(startNode.id, 0);
    arrivalTime.set(startNode.id, departureTime);
    const startH = this._heuristic(startNode, goalNode);
    fScore.set(startNode.id, startH);
    openSet.insertOrUpdate(startNode.id, startH);

    let nodesExplored = 0;

    while (!openSet.isEmpty() && nodesExplored < maxNodes) {
      const current = openSet.extractMin();
      const currentId = current.nodeId;
      const currentNode = graph.getNode(currentId);
      const currentArrival = arrivalTime.get(currentId);

      nodesExplored++;

      if (currentId === goalNode.id) {
        result.success = true;
        result.nodesExplored = nodesExplored;
        result.computeTimeMs = performance.now() - startTime;
        this._reconstructTemporalPath(result, cameFrom, arrivalTime, goalNode, graph);
        return result;
      }

      closedSet.add(currentId);

      for (const edge of currentNode.getOutgoingEdges()) {
        const neighborId = edge.to;
        if (closedSet.has(neighborId)) continue;

        const neighborNode = graph.getNode(neighborId);
        if (!neighborNode) continue;

        // Calculate temporal edge cost
        const edgeCost = await this._getTemporalEdgeCost(
          edge, alpha, currentArrival, optimizeForDensity
        );

        const tentativeG = gScore.get(currentId) + edgeCost;
        const currentNeighborG = gScore.get(neighborId) ?? Infinity;

        if (tentativeG < currentNeighborG) {
          // Estimate arrival time at neighbor
          const travelTimeMs = (edge.distance / 1.4) * 1000; // 1.4 m/s walking
          const neighborArrival = new Date(currentArrival.getTime() + travelTimeMs);

          cameFrom.set(neighborId, { prevNodeId: currentId, edge });
          gScore.set(neighborId, tentativeG);
          arrivalTime.set(neighborId, neighborArrival);

          const h = this._heuristic(neighborNode, goalNode);
          const f = tentativeG + h;
          fScore.set(neighborId, f);

          openSet.insertOrUpdate(neighborId, f, { g: tentativeG, h });
        }
      }
    }

    result.success = false;
    result.nodesExplored = nodesExplored;
    result.computeTimeMs = performance.now() - startTime;
    result.error = nodesExplored >= maxNodes ? 'Search limit exceeded' : 'No path found';

    return result;
  }

  /**
   * Calculate temporal edge cost
   * cost = distance × (1 + α × risk(time)) × densityModifier(time)
   */
  async _getTemporalEdgeCost(edge, alpha, time, useDensity) {
    // Base distance cost
    let cost = edge.distance;

    // Risk factor (may vary by time of day)
    let riskScore = edge.riskScore;
    
    // If temporal risk is enabled and risk is stale, recalculate
    if (this.useTemporalRisk && edge.isRiskStale()) {
      // Use cached risk or estimate from time
      const isNight = time.getHours() >= 20 || time.getHours() < 6;
      riskScore = isNight ? Math.min(1, riskScore * 1.3) : riskScore;
    }

    // Apply safety weighting
    cost *= (1 + alpha * riskScore);

    // Apply density modifier (prefer crowded paths)
    if (useDensity && this.useDensityRouting) {
      const edgeId = `${edge.from}-${edge.to}`;
      const densityModifier = densityPredictionService.getDensityCostModifier(
        edgeId, time, this.densityWeight
      );
      cost *= densityModifier;
    }

    return cost;
  }

  /**
   * Heuristic function (Euclidean distance)
   */
  _heuristic(node, goalNode) {
    return this._haversineDistance(
      node.lat, node.lng,
      goalNode.lat, goalNode.lng
    );
  }

  /**
   * Reconstruct path with temporal metadata
   */
  _reconstructTemporalPath(result, cameFrom, arrivalTime, goalNode, graph) {
    const path = [];
    const edges = [];
    let currentId = goalNode.id;

    while (cameFrom.has(currentId)) {
      path.unshift(currentId);
      const { prevNodeId, edge } = cameFrom.get(currentId);
      edges.unshift(edge);
      currentId = prevNodeId;
    }
    path.unshift(currentId);

    result.path = path;
    result.edges = edges;

    // Build coordinates and segments
    let totalDistance = 0;
    let totalWeightedRisk = 0;
    let totalDensity = 0;
    let maxRisk = 0;

    for (let i = 0; i < path.length; i++) {
      const node = graph.getNode(path[i]);
      result.pathCoordinates.push({ lat: node.lat, lng: node.lng });

      if (i > 0) {
        const edge = edges[i - 1];
        const edgeTime = arrivalTime.get(path[i - 1]) || new Date();
        const edgeId = `${edge.from}-${edge.to}`;
        
        // Get density for this segment
        const { density } = densityPredictionService.getPredictedDensity(edgeId, edgeTime);

        totalDistance += edge.distance;
        totalWeightedRisk += edge.riskScore * edge.distance;
        totalDensity += density;
        maxRisk = Math.max(maxRisk, edge.riskScore);

        const prevNode = graph.getNode(path[i - 1]);
        result.segments.push({
          from: path[i - 1],
          to: path[i],
          startLat: prevNode.lat,
          startLng: prevNode.lng,
          endLat: node.lat,
          endLng: node.lng,
          distance: edge.distance,
          riskScore: edge.riskScore,
          density,
          arrivalTime: arrivalTime.get(path[i]),
        });
      }
    }

    result.totalDistance = totalDistance;
    result.avgRiskScore = totalDistance > 0 ? totalWeightedRisk / totalDistance : 0;
    result.maxRiskScore = maxRisk;
    result.avgDensity = edges.length > 0 ? totalDensity / edges.length : 0;
  }

  // =========================================
  // CACHING
  // =========================================

  _getCacheKey(start, goal, timeBucket, options) {
    const startKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}`;
    const goalKey = `${goal.lat.toFixed(4)},${goal.lng.toFixed(4)}`;
    return `${startKey}|${goalKey}|${timeBucket}|${options.alpha}`;
  }

  _getCachedRoute(start, goal, timeBucket, options) {
    const key = this._getCacheKey(start, goal, timeBucket, options);
    const cached = this.routeCache.get(key);
    
    if (cached && cached.isValid(timeBucket)) {
      return cached;
    }
    
    // Clean up expired entry
    if (cached) {
      this.routeCache.delete(key);
    }
    
    return null;
  }

  _cacheRoute(start, goal, timeBucket, options, route) {
    // Evict old entries if cache is full
    if (this.routeCache.size >= CACHE_CONFIG.maxEntries) {
      this._evictOldestCacheEntries(100);
    }

    const key = this._getCacheKey(start, goal, timeBucket, options);
    this.routeCache.set(key, new CachedRoute(route, timeBucket, options));
  }

  _evictOldestCacheEntries(count) {
    const entries = [...this.routeCache.entries()];
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.routeCache.delete(entries[i][0]);
    }
  }

  // =========================================
  // POPULAR ROUTE PRE-COMPUTATION
  // =========================================

  /**
   * Pre-compute routes for popular origin-destination pairs
   * Call this in a background job (e.g., nightly)
   */
  async precomputePopularRoutes(popularPairs, alphaValues = [0.5, 1.0, 2.0]) {
    console.log(`[TemporalRouting] Pre-computing ${popularPairs.length} popular routes...`);
    
    const timeBuckets = this._getAllTimeBuckets();
    let computed = 0;

    for (const pair of popularPairs) {
      const routeMap = new Map();

      for (const bucket of timeBuckets) {
        const bucketTime = this._timeBucketToDate(bucket);

        for (const alpha of alphaValues) {
          const route = await this.findTemporalPath(pair.origin, pair.destination, {
            alpha,
            departureTime: bucketTime,
            optimizeForDensity: true,
            useCache: false, // Don't use cache, we're building it
          });

          if (route.success) {
            const key = `${bucket}|${alpha}`;
            routeMap.set(key, route);
          }
        }
        computed++;
      }

      this.popularRoutes.set(pair.id, routeMap);
    }

    console.log(`[TemporalRouting] Pre-computed ${computed} route variants`);
    return { computed, pairs: popularPairs.length };
  }

  /**
   * Get pre-computed route for popular pair
   */
  getPrecomputedRoute(pairId, timeBucket, alpha) {
    const routeMap = this.popularRoutes.get(pairId);
    if (!routeMap) return null;

    const key = `${timeBucket}|${alpha}`;
    return routeMap.get(key) || null;
  }

  // =========================================
  // HELPERS
  // =========================================

  _enrichRouteWithTemporal(route, departureTime) {
    if (!route.success) return route;

    return {
      ...route,
      departureTime,
      arrivalTime: new Date(departureTime.getTime() + (route.totalDistance / 1.4) * 1000),
      temporal: {
        avgDensity: route.avgDensity || 0,
        densityLevel: this._getDensityLevel(route.avgDensity || 0),
        visibilityMessage: this._getVisibilityMessage(route.avgDensity || 0),
      },
    };
  }

  _getDensityLevel(density) {
    if (density >= 0.7) return 'high';
    if (density >= 0.5) return 'moderate';
    if (density >= 0.3) return 'light';
    return 'low';
  }

  _getVisibilityMessage(density) {
    if (density >= 0.7) return 'High visibility corridor';
    if (density >= 0.5) return 'Moderate foot traffic';
    if (density >= 0.3) return 'Light foot traffic';
    return 'Low visibility area';
  }

  _getRemainingEdges(route, currentPosition) {
    // Find which segment the user is on
    // Return edges from that point forward
    if (!route.segments) return [];
    
    let closestIdx = 0;
    let closestDist = Infinity;

    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i];
      const dist = this._haversineDistance(
        currentPosition.lat, currentPosition.lng,
        seg.startLat, seg.startLng
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    return route.edges?.slice(closestIdx) || [];
  }

  _getTimeBucket(time) {
    const minutes = time.getHours() * 60 + time.getMinutes();
    return Math.floor(minutes / TIME_BUCKET_MINUTES);
  }

  _timeBucketToDate(bucket) {
    const now = new Date();
    const minutes = bucket * TIME_BUCKET_MINUTES;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    now.setHours(hours, mins, 0, 0);
    return now;
  }

  _getAllTimeBuckets() {
    const buckets = [];
    for (let i = 0; i < 96; i++) { // 96 15-minute buckets per day
      buckets.push(i);
    }
    return buckets;
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
}

// Export singleton
export const temporalRoutingService = new TemporalRoutingService();
export { CachedRoute, CACHE_CONFIG };
export default TemporalRoutingService;






