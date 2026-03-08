/**
 * SafeStep Graph Service v1.0
 * ===========================
 * Weighted directed graph data structure for campus/city navigation.
 * 
 * Graph Model:
 * - Nodes (V): Intersections with geographic coordinates
 * - Edges (E): Street segments connecting intersections
 * - Directed: A→B can have different weight than B→A (one-way streets, uphill, etc.)
 * 
 * Edge Weight Formula:
 *   cost(e) = distance(e) × (1 + α × riskScore(e))
 * 
 * Where:
 *   - distance(e) = physical length in meters
 *   - riskScore(e) = normalized safety risk (0.0 = safe, 1.0 = dangerous)
 *   - α = safety priority factor (user-adjustable, typically 0.0 to 5.0)
 */

// Spatial indexing grid size for fast nearest-node lookups
const GRID_CELL_SIZE = 0.001; // ~111 meters at equator

/**
 * Graph Node representing an intersection or waypoint
 */
export class GraphNode {
  constructor(id, lat, lng, properties = {}) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.properties = properties; // Additional metadata (name, type, etc.)
    this.edges = new Map(); // Map<targetNodeId, Edge[]> - supports parallel edges
  }

  /**
   * Add an outgoing edge from this node
   */
  addEdge(edge) {
    const targetId = edge.to;
    if (!this.edges.has(targetId)) {
      this.edges.set(targetId, []);
    }
    this.edges.get(targetId).push(edge);
  }

  /**
   * Get all outgoing edges
   */
  getOutgoingEdges() {
    const allEdges = [];
    for (const edges of this.edges.values()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }

  /**
   * Get edges to a specific neighbor
   */
  getEdgesTo(targetNodeId) {
    return this.edges.get(targetNodeId) || [];
  }
}

/**
 * Graph Edge representing a street segment
 */
export class GraphEdge {
  constructor(from, to, distance, properties = {}) {
    this.from = from;           // Source node ID
    this.to = to;               // Target node ID
    this.distance = distance;   // Physical distance in meters
    this.properties = properties; // Street name, type, etc.
    
    // Safety data (computed and cached)
    this.riskScore = 0;         // 0.0 (safe) to 1.0 (dangerous)
    this.riskFactors = {};      // Breakdown of risk components
    this.lastRiskUpdate = null; // Timestamp of last risk calculation
    
    // Geometry for rendering
    this.geometry = properties.geometry || null; // Array of [lng, lat] for polyline
  }

  /**
   * Calculate traversal cost with safety weighting
   * @param {number} alpha - Safety priority factor (0 = distance only, higher = more safety)
   * @returns {number} Weighted cost
   */
  getCost(alpha = 1.0) {
    return this.distance * (1 + alpha * this.riskScore);
  }

  /**
   * Update risk score with component breakdown
   */
  updateRisk(riskScore, factors = {}) {
    this.riskScore = Math.max(0, Math.min(1, riskScore)); // Clamp to [0, 1]
    this.riskFactors = factors;
    this.lastRiskUpdate = Date.now();
  }

  /**
   * Check if risk data is stale (older than threshold)
   */
  isRiskStale(maxAgeMs = 15 * 60 * 1000) { // Default 15 minutes
    if (!this.lastRiskUpdate) return true;
    return Date.now() - this.lastRiskUpdate > maxAgeMs;
  }
}

/**
 * Weighted Directed Graph for pedestrian routing
 */
export class NavigationGraph {
  constructor() {
    this.nodes = new Map();     // Map<nodeId, GraphNode>
    this.spatialIndex = new Map(); // Map<gridKey, Set<nodeId>> for fast lookups
    this.metadata = {
      bounds: null,             // { minLat, maxLat, minLng, maxLng }
      nodeCount: 0,
      edgeCount: 0,
      lastUpdate: null,
    };
  }

  // =========================================
  // GRAPH CONSTRUCTION
  // =========================================

  /**
   * Add a node to the graph
   */
  addNode(id, lat, lng, properties = {}) {
    if (this.nodes.has(id)) {
      console.warn(`[Graph] Node ${id} already exists, updating...`);
    }

    const node = new GraphNode(id, lat, lng, properties);
    this.nodes.set(id, node);
    
    // Add to spatial index
    const gridKey = this._getGridKey(lat, lng);
    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, new Set());
    }
    this.spatialIndex.get(gridKey).add(id);

    this.metadata.nodeCount = this.nodes.size;
    this._updateBounds(lat, lng);
    
    return node;
  }

  /**
   * Add a directed edge between two nodes
   */
  addEdge(fromId, toId, distance, properties = {}) {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) {
      console.warn(`[Graph] Cannot add edge: node ${fromId} or ${toId} not found`);
      return null;
    }

    const edge = new GraphEdge(fromId, toId, distance, properties);
    fromNode.addEdge(edge);
    
    this.metadata.edgeCount++;
    this.metadata.lastUpdate = Date.now();

    return edge;
  }

  /**
   * Add a bidirectional edge (two directed edges)
   */
  addBidirectionalEdge(nodeId1, nodeId2, distance, properties = {}) {
    const edge1 = this.addEdge(nodeId1, nodeId2, distance, properties);
    const edge2 = this.addEdge(nodeId2, nodeId1, distance, { ...properties, reverse: true });
    return [edge1, edge2];
  }

  // =========================================
  // NODE LOOKUPS
  // =========================================

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Find the nearest node to a coordinate
   */
  findNearestNode(lat, lng, maxDistance = 500) {
    const gridKey = this._getGridKey(lat, lng);
    const candidates = new Set();

    // Check current cell and adjacent cells
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        const adjacentKey = this._getAdjacentGridKey(gridKey, dLat, dLng);
        const cellNodes = this.spatialIndex.get(adjacentKey);
        if (cellNodes) {
          cellNodes.forEach(id => candidates.add(id));
        }
      }
    }

    let nearestNode = null;
    let nearestDistance = Infinity;

    for (const nodeId of candidates) {
      const node = this.nodes.get(nodeId);
      const distance = this._haversineDistance(lat, lng, node.lat, node.lng);
      
      if (distance < nearestDistance && distance <= maxDistance) {
        nearestDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode ? { node: nearestNode, distance: nearestDistance } : null;
  }

  /**
   * Find nodes within a radius
   */
  findNodesInRadius(lat, lng, radiusMeters) {
    const results = [];
    const radiusDegrees = radiusMeters / 111000; // Approximate
    
    // Calculate grid cells to check
    const minGridLat = Math.floor((lat - radiusDegrees) / GRID_CELL_SIZE);
    const maxGridLat = Math.floor((lat + radiusDegrees) / GRID_CELL_SIZE);
    const minGridLng = Math.floor((lng - radiusDegrees) / GRID_CELL_SIZE);
    const maxGridLng = Math.floor((lng + radiusDegrees) / GRID_CELL_SIZE);

    for (let gLat = minGridLat; gLat <= maxGridLat; gLat++) {
      for (let gLng = minGridLng; gLng <= maxGridLng; gLng++) {
        const key = `${gLat}:${gLng}`;
        const cellNodes = this.spatialIndex.get(key);
        
        if (cellNodes) {
          for (const nodeId of cellNodes) {
            const node = this.nodes.get(nodeId);
            const distance = this._haversineDistance(lat, lng, node.lat, node.lng);
            
            if (distance <= radiusMeters) {
              results.push({ node, distance });
            }
          }
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  // =========================================
  // EDGE OPERATIONS
  // =========================================

  /**
   * Get all edges in the graph
   */
  getAllEdges() {
    const edges = [];
    for (const node of this.nodes.values()) {
      edges.push(...node.getOutgoingEdges());
    }
    return edges;
  }

  /**
   * Get edges within a bounding box (for risk updates)
   */
  getEdgesInBounds(minLat, maxLat, minLng, maxLng) {
    const edges = [];
    
    for (const node of this.nodes.values()) {
      if (node.lat >= minLat && node.lat <= maxLat &&
          node.lng >= minLng && node.lng <= maxLng) {
        edges.push(...node.getOutgoingEdges());
      }
    }
    
    return edges;
  }

  /**
   * Update risk scores for edges near an incident
   */
  updateRiskNearLocation(lat, lng, radiusMeters, riskDelta, factors = {}) {
    const affectedNodes = this.findNodesInRadius(lat, lng, radiusMeters);
    const updatedEdges = [];

    for (const { node, distance } of affectedNodes) {
      // Risk influence decreases with distance
      const proximityFactor = 1 - (distance / radiusMeters);
      
      for (const edge of node.getOutgoingEdges()) {
        const adjustedRisk = edge.riskScore + (riskDelta * proximityFactor);
        edge.updateRisk(adjustedRisk, { ...edge.riskFactors, ...factors });
        updatedEdges.push(edge);
      }
    }

    return updatedEdges;
  }

  // =========================================
  // SERIALIZATION
  // =========================================

  /**
   * Export graph to JSON for caching/storage
   */
  toJSON() {
    const nodes = [];
    const edges = [];

    for (const node of this.nodes.values()) {
      nodes.push({
        id: node.id,
        lat: node.lat,
        lng: node.lng,
        properties: node.properties,
      });

      for (const edge of node.getOutgoingEdges()) {
        edges.push({
          from: edge.from,
          to: edge.to,
          distance: edge.distance,
          riskScore: edge.riskScore,
          riskFactors: edge.riskFactors,
          properties: edge.properties,
          geometry: edge.geometry,
        });
      }
    }

    return {
      version: '1.0',
      metadata: this.metadata,
      nodes,
      edges,
    };
  }

  /**
   * Import graph from JSON
   */
  static fromJSON(json) {
    const graph = new NavigationGraph();

    for (const nodeData of json.nodes) {
      graph.addNode(nodeData.id, nodeData.lat, nodeData.lng, nodeData.properties);
    }

    for (const edgeData of json.edges) {
      const edge = graph.addEdge(
        edgeData.from,
        edgeData.to,
        edgeData.distance,
        edgeData.properties
      );
      if (edge) {
        edge.riskScore = edgeData.riskScore || 0;
        edge.riskFactors = edgeData.riskFactors || {};
        edge.geometry = edgeData.geometry;
      }
    }

    graph.metadata = json.metadata || graph.metadata;
    return graph;
  }

  // =========================================
  // INTERNAL HELPERS
  // =========================================

  _getGridKey(lat, lng) {
    const gridLat = Math.floor(lat / GRID_CELL_SIZE);
    const gridLng = Math.floor(lng / GRID_CELL_SIZE);
    return `${gridLat}:${gridLng}`;
  }

  _getAdjacentGridKey(baseKey, dLat, dLng) {
    const [baseLat, baseLng] = baseKey.split(':').map(Number);
    return `${baseLat + dLat}:${baseLng + dLng}`;
  }

  _updateBounds(lat, lng) {
    if (!this.metadata.bounds) {
      this.metadata.bounds = { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng };
    } else {
      this.metadata.bounds.minLat = Math.min(this.metadata.bounds.minLat, lat);
      this.metadata.bounds.maxLat = Math.max(this.metadata.bounds.maxLat, lat);
      this.metadata.bounds.minLng = Math.min(this.metadata.bounds.minLng, lng);
      this.metadata.bounds.maxLng = Math.max(this.metadata.bounds.maxLng, lng);
    }
  }

  _haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // =========================================
  // DEBUG / STATS
  // =========================================

  getStats() {
    let totalEdgeDistance = 0;
    let avgRiskScore = 0;
    let maxRiskScore = 0;
    let staleEdgeCount = 0;
    const edgeCount = this.metadata.edgeCount;

    for (const node of this.nodes.values()) {
      for (const edge of node.getOutgoingEdges()) {
        totalEdgeDistance += edge.distance;
        avgRiskScore += edge.riskScore;
        maxRiskScore = Math.max(maxRiskScore, edge.riskScore);
        if (edge.isRiskStale()) staleEdgeCount++;
      }
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      totalDistanceKm: (totalEdgeDistance / 1000).toFixed(2),
      avgRiskScore: edgeCount > 0 ? (avgRiskScore / edgeCount).toFixed(3) : 0,
      maxRiskScore: maxRiskScore.toFixed(3),
      staleEdgeCount,
      bounds: this.metadata.bounds,
    };
  }
}

// Export singleton for app-wide use
export const navigationGraph = new NavigationGraph();
export default NavigationGraph;

