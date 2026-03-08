/**
 * SafeStep A* Pathfinding Service v1.0
 * ====================================
 * A* search algorithm implementation for safety-weighted pedestrian routing.
 * 
 * Core Algorithm:
 *   f(n) = g(n) + h(n)
 *   
 *   Where:
 *   - g(n) = actual safety-weighted cost from start to current node
 *   - h(n) = heuristic estimate of remaining cost to destination
 *   
 * Cost Function:
 *   cost(edge) = distance(edge) × (1 + α × riskScore(edge))
 *   
 *   Where:
 *   - α (alpha) = safety priority factor (0.0 to 5.0+)
 *     - 0.0 = pure distance optimization (shortest path)
 *     - 1.0 = balanced (standard safety consideration)
 *     - 2.0+ = high safety priority (accepts longer routes for safety)
 */

import { navigationGraph } from './graphService';

/**
 * Priority Queue implementation using binary min-heap
 * Optimized for A* where we need efficient extractMin and decreaseKey
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
    this.indices = new Map(); // Map<nodeId, heapIndex> for O(1) lookup
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Insert or update a node with given priority (f-score)
   */
  insertOrUpdate(nodeId, priority, data = {}) {
    if (this.indices.has(nodeId)) {
      // Update existing - decrease key operation
      const index = this.indices.get(nodeId);
      const oldPriority = this.heap[index].priority;
      
      if (priority < oldPriority) {
        this.heap[index].priority = priority;
        this.heap[index].data = data;
        this._bubbleUp(index);
      }
    } else {
      // Insert new
      const entry = { nodeId, priority, data };
      this.heap.push(entry);
      this.indices.set(nodeId, this.heap.length - 1);
      this._bubbleUp(this.heap.length - 1);
    }
  }

  /**
   * Extract node with minimum f-score
   */
  extractMin() {
    if (this.isEmpty()) return null;

    const min = this.heap[0];
    const last = this.heap.pop();
    this.indices.delete(min.nodeId);

    if (!this.isEmpty()) {
      this.heap[0] = last;
      this.indices.set(last.nodeId, 0);
      this._bubbleDown(0);
    }

    return min;
  }

  /**
   * Check if node is in queue
   */
  contains(nodeId) {
    return this.indices.has(nodeId);
  }

  /**
   * Get priority of a node
   */
  getPriority(nodeId) {
    if (!this.indices.has(nodeId)) return Infinity;
    return this.heap[this.indices.get(nodeId)].priority;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      
      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && 
          this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      
      if (rightChild < length && 
          this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }

      if (smallest === index) break;
      
      this._swap(index, smallest);
      index = smallest;
    }
  }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.indices.set(this.heap[i].nodeId, i);
    this.indices.set(this.heap[j].nodeId, j);
  }
}

/**
 * A* Search Result
 */
class AStarResult {
  constructor() {
    this.success = false;
    this.path = [];              // Array of node IDs
    this.pathCoordinates = [];   // Array of {lat, lng}
    this.edges = [];             // Array of edges traversed
    this.totalDistance = 0;      // Physical distance in meters
    this.totalCost = 0;          // Safety-weighted cost
    this.avgRiskScore = 0;       // Average risk along path
    this.maxRiskScore = 0;       // Maximum risk segment
    this.nodesExplored = 0;      // Algorithm stats
    this.computeTimeMs = 0;      // Performance metric
    this.segments = [];          // Detailed segment info for UI
  }

  /**
   * Convert to route format compatible with existing UI
   */
  toRouteFormat() {
    return {
      geometry: {
        type: 'LineString',
        coordinates: this.pathCoordinates.map(c => [c.lng, c.lat]),
      },
      coordinates: this.pathCoordinates,
      distance: this.totalDistance,
      duration: Math.round(this.totalDistance / 1.4), // ~1.4 m/s walking speed
      safety: {
        score: Math.round(100 * (1 - this.avgRiskScore)),
        level: this._getRiskLevel(this.avgRiskScore),
        color: this._getRiskColor(this.avgRiskScore),
        maxRiskSegment: this.maxRiskScore,
        warnings: this._getWarnings(),
      },
      segments: this.segments,
      meta: {
        algorithm: 'A*',
        nodesExplored: this.nodesExplored,
        computeTimeMs: this.computeTimeMs,
      },
    };
  }

  _getRiskLevel(risk) {
    if (risk <= 0.2) return 'high';
    if (risk <= 0.4) return 'moderate';
    if (risk <= 0.6) return 'low';
    return 'unsafe';
  }

  _getRiskColor(risk) {
    if (risk <= 0.2) return '#00f5d4';  // Cyan - safe
    if (risk <= 0.4) return '#FFB347';  // Orange - moderate
    if (risk <= 0.6) return '#ff9f43';  // Dark orange - caution
    return '#ff6b6b';                    // Red - unsafe
  }

  _getWarnings() {
    const warnings = [];
    for (const segment of this.segments) {
      if (segment.riskScore > 0.6) {
        warnings.push({
          type: 'high_risk',
          lat: segment.startLat,
          lng: segment.startLng,
          message: `High risk area: ${segment.riskFactors?.join(', ') || 'unknown factors'}`,
          severity: segment.riskScore,
        });
      }
    }
    return warnings;
  }
}

/**
 * A* Pathfinding Service
 */
class AStarService {
  constructor() {
    this.graph = null;
    this.defaultAlpha = 1.0; // Default safety priority
  }

  /**
   * Set the navigation graph to use
   */
  setGraph(graph) {
    this.graph = graph;
  }

  /**
   * Calculate heuristic (h-score) - Euclidean distance to goal
   * Admissible heuristic: never overestimates actual cost
   */
  heuristic(node, goalNode, alpha = 1.0) {
    const distance = this._haversineDistance(
      node.lat, node.lng,
      goalNode.lat, goalNode.lng
    );
    // Minimum possible cost (assuming best-case risk = 0)
    return distance;
  }

  /**
   * Main A* search algorithm
   * 
   * @param {Object} start - Start coordinates {lat, lng}
   * @param {Object} goal - Goal coordinates {lat, lng}
   * @param {Object} options - Search options
   * @returns {AStarResult} Search result
   */
  findPath(start, goal, options = {}) {
    const startTime = performance.now();
    const result = new AStarResult();

    const {
      alpha = this.defaultAlpha,        // Safety priority factor
      maxNodes = 10000,                  // Limit exploration
      maxDistanceRatio = 2.0,            // Max path length vs straight line
      avoidHighRisk = false,             // Hard avoid risk > threshold
      highRiskThreshold = 0.8,           // Risk threshold for avoidance
    } = options;

    // Use provided graph or default
    const graph = this.graph || navigationGraph;

    // Find nearest nodes to start and goal coordinates
    const startResult = graph.findNearestNode(start.lat, start.lng);
    const goalResult = graph.findNearestNode(goal.lat, goal.lng);

    if (!startResult || !goalResult) {
      result.success = false;
      result.error = 'Could not find nodes near start or goal location';
      return result;
    }

    const startNode = startResult.node;
    const goalNode = goalResult.node;

    // Check if start and goal are the same
    if (startNode.id === goalNode.id) {
      result.success = true;
      result.path = [startNode.id];
      result.pathCoordinates = [{ lat: startNode.lat, lng: startNode.lng }];
      return result;
    }

    // Straight-line distance for limiting search
    const straightLineDistance = this._haversineDistance(
      startNode.lat, startNode.lng,
      goalNode.lat, goalNode.lng
    );
    const maxDistance = straightLineDistance * maxDistanceRatio;

    // Initialize data structures
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const gScore = new Map();  // Map<nodeId, cost from start>
    const fScore = new Map();  // Map<nodeId, g + h>
    const cameFrom = new Map(); // Map<nodeId, {prevNodeId, edge}>

    // Initialize start node
    gScore.set(startNode.id, 0);
    const startH = this.heuristic(startNode, goalNode, alpha);
    fScore.set(startNode.id, startH);
    openSet.insertOrUpdate(startNode.id, startH);

    let nodesExplored = 0;

    // Main A* loop
    while (!openSet.isEmpty() && nodesExplored < maxNodes) {
      // Get node with lowest f-score
      const current = openSet.extractMin();
      const currentNodeId = current.nodeId;
      const currentNode = graph.getNode(currentNodeId);

      nodesExplored++;

      // Goal reached!
      if (currentNodeId === goalNode.id) {
        result.success = true;
        result.nodesExplored = nodesExplored;
        result.computeTimeMs = performance.now() - startTime;
        
        // Reconstruct path
        this._reconstructPath(result, cameFrom, goalNode, graph);
        return result;
      }

      closedSet.add(currentNodeId);

      // Explore neighbors
      const edges = currentNode.getOutgoingEdges();

      for (const edge of edges) {
        const neighborId = edge.to;
        
        // Skip if already evaluated
        if (closedSet.has(neighborId)) continue;

        // Skip high-risk edges if avoiding
        if (avoidHighRisk && edge.riskScore > highRiskThreshold) continue;

        const neighborNode = graph.getNode(neighborId);
        if (!neighborNode) continue;

        // Calculate tentative g-score
        const edgeCost = edge.getCost(alpha);
        const tentativeG = gScore.get(currentNodeId) + edgeCost;

        // Skip if path is too long
        if (tentativeG > maxDistance * (1 + alpha)) continue;

        // Check if this is a better path
        const currentNeighborG = gScore.get(neighborId) ?? Infinity;

        if (tentativeG < currentNeighborG) {
          // This path is better
          cameFrom.set(neighborId, { prevNodeId: currentNodeId, edge });
          gScore.set(neighborId, tentativeG);
          
          const h = this.heuristic(neighborNode, goalNode, alpha);
          const f = tentativeG + h;
          fScore.set(neighborId, f);

          openSet.insertOrUpdate(neighborId, f, { g: tentativeG, h });
        }
      }
    }

    // No path found
    result.success = false;
    result.nodesExplored = nodesExplored;
    result.computeTimeMs = performance.now() - startTime;
    result.error = nodesExplored >= maxNodes 
      ? 'Search limit exceeded' 
      : 'No path exists between start and goal';

    return result;
  }

  /**
   * Reconstruct path from A* search result
   */
  _reconstructPath(result, cameFrom, goalNode, graph) {
    const path = [];
    const edges = [];
    let currentId = goalNode.id;

    // Walk backwards from goal to start
    while (cameFrom.has(currentId)) {
      path.unshift(currentId);
      const { prevNodeId, edge } = cameFrom.get(currentId);
      edges.unshift(edge);
      currentId = prevNodeId;
    }
    path.unshift(currentId); // Add start node

    result.path = path;
    result.edges = edges;

    // Build coordinates and segments
    let totalDistance = 0;
    let totalWeightedRisk = 0;
    let maxRisk = 0;

    for (let i = 0; i < path.length; i++) {
      const node = graph.getNode(path[i]);
      result.pathCoordinates.push({ lat: node.lat, lng: node.lng });

      if (i > 0) {
        const edge = edges[i - 1];
        totalDistance += edge.distance;
        totalWeightedRisk += edge.riskScore * edge.distance;
        maxRisk = Math.max(maxRisk, edge.riskScore);

        // Add segment info for UI
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
          riskFactors: Object.keys(edge.riskFactors),
          color: this._getSegmentColor(edge.riskScore),
        });
      }
    }

    result.totalDistance = totalDistance;
    result.totalCost = edges.reduce((sum, e) => sum + e.getCost(this.defaultAlpha), 0);
    result.avgRiskScore = totalDistance > 0 ? totalWeightedRisk / totalDistance : 0;
    result.maxRiskScore = maxRisk;
  }

  /**
   * Find multiple alternative routes with different alpha values
   */
  findAlternatives(start, goal, options = {}) {
    const {
      alphaValues = [0, 0.5, 1.0, 2.0], // Different priority levels
      ...searchOptions
    } = options;

    const routes = [];
    const seenPaths = new Set();

    for (const alpha of alphaValues) {
      const result = this.findPath(start, goal, { ...searchOptions, alpha });
      
      if (result.success) {
        // Check if this is a unique path
        const pathKey = result.path.join(',');
        
        if (!seenPaths.has(pathKey)) {
          seenPaths.add(pathKey);
          routes.push({
            alpha,
            label: this._getAlphaLabel(alpha),
            ...result.toRouteFormat(),
          });
        }
      }
    }

    // Sort by safety score (highest first)
    routes.sort((a, b) => b.safety.score - a.safety.score);

    // Label routes
    if (routes.length > 0) {
      routes[0].recommended = true;
      routes[0].label = 'Safest Route';
    }
    if (routes.length > 1) {
      const fastest = routes.reduce((min, r) => r.distance < min.distance ? r : min, routes[0]);
      if (fastest !== routes[0]) {
        fastest.label = 'Fastest Route';
      }
    }

    return routes;
  }

  _getAlphaLabel(alpha) {
    if (alpha === 0) return 'Fastest';
    if (alpha <= 0.5) return 'Balanced';
    if (alpha <= 1.5) return 'Safe';
    return 'Safest';
  }

  _getSegmentColor(risk) {
    if (risk <= 0.2) return '#00f5d4';  // Cyan - very safe
    if (risk <= 0.4) return '#7dffb3';  // Green - safe
    if (risk <= 0.6) return '#FFB347';  // Orange - moderate
    if (risk <= 0.8) return '#ff9f43';  // Dark orange - caution
    return '#ff6b6b';                    // Red - dangerous
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
export const astarService = new AStarService();
export { PriorityQueue, AStarResult };
export default AStarService;

