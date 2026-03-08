/**
 * SafeStep Graph Builder v1.0
 * ===========================
 * Builds the navigation graph from various data sources:
 * - OpenStreetMap (OSM) Overpass API
 * - Mapbox Vector Tiles
 * - Pre-built graph files
 * 
 * The graph represents the pedestrian-walkable street network.
 */

import { NavigationGraph, GraphNode, GraphEdge } from './graphService';
import { riskScoringService } from './riskScoringService';
import { ENV } from '../config/env';

// OSM Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Highway types that pedestrians can use
const WALKABLE_HIGHWAYS = [
  'footway',
  'pedestrian', 
  'path',
  'steps',
  'residential',
  'living_street',
  'tertiary',
  'secondary',
  'primary',
  'unclassified',
  'service',
  'track',
  'cycleway', // Often shared with pedestrians
];

// One-way street handling
const ONE_WAY_VALUES = ['yes', '1', 'true', '-1', 'reverse'];

class GraphBuilder {
  constructor() {
    this.graph = null;
    this.buildProgress = { status: 'idle', progress: 0, message: '' };
  }

  /**
   * Build graph for a geographic area
   * @param {Object} bounds - {minLat, maxLat, minLng, maxLng}
   * @param {Object} options - Build options
   */
  async buildFromOSM(bounds, options = {}) {
    const {
      includeRiskScores = true,
      onProgress = null,
    } = options;

    this.graph = new NavigationGraph();
    this.buildProgress = { status: 'fetching', progress: 0, message: 'Fetching OSM data...' };
    this._notifyProgress(onProgress);

    try {
      // Step 1: Fetch OSM data
      const osmData = await this._fetchOSMData(bounds);
      this.buildProgress = { status: 'parsing', progress: 20, message: 'Parsing ways and nodes...' };
      this._notifyProgress(onProgress);

      // Step 2: Build nodes from OSM nodes
      const nodeIdMap = this._buildNodes(osmData.elements);
      this.buildProgress = { status: 'edges', progress: 40, message: 'Building edges...' };
      this._notifyProgress(onProgress);

      // Step 3: Build edges from OSM ways
      this._buildEdges(osmData.elements, nodeIdMap);
      this.buildProgress = { status: 'scoring', progress: 60, message: 'Calculating risk scores...' };
      this._notifyProgress(onProgress);

      // Step 4: Calculate risk scores for all edges
      if (includeRiskScores) {
        await this._calculateAllRiskScores(onProgress);
      }

      this.buildProgress = { status: 'complete', progress: 100, message: 'Graph ready!' };
      this._notifyProgress(onProgress);

      console.log(`[GraphBuilder] Built graph:`, this.graph.getStats());
      return this.graph;

    } catch (error) {
      this.buildProgress = { status: 'error', progress: 0, message: error.message };
      this._notifyProgress(onProgress);
      throw error;
    }
  }

  /**
   * Build graph for a specific campus/university
   * Uses pre-defined bounds for known campuses
   */
  async buildForCampus(campusId, options = {}) {
    const campusBounds = CAMPUS_BOUNDS[campusId];
    
    if (!campusBounds) {
      throw new Error(`Unknown campus: ${campusId}`);
    }

    return this.buildFromOSM(campusBounds, options);
  }

  /**
   * Build graph from a Mapbox route result (fallback method)
   * Creates a simplified graph from an existing route
   */
  buildFromMapboxRoute(routeData) {
    this.graph = new NavigationGraph();
    
    const coordinates = routeData.geometry?.coordinates || [];
    if (coordinates.length < 2) {
      throw new Error('Route has insufficient coordinates');
    }

    // Create nodes for each coordinate
    const nodeIds = [];
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      const nodeId = `route_${i}`;
      this.graph.addNode(nodeId, lat, lng, { index: i });
      nodeIds.push(nodeId);
    }

    // Create edges between consecutive nodes
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromNode = this.graph.getNode(nodeIds[i]);
      const toNode = this.graph.getNode(nodeIds[i + 1]);
      
      const distance = this._haversineDistance(
        fromNode.lat, fromNode.lng,
        toNode.lat, toNode.lng
      );

      // Bidirectional edges
      this.graph.addBidirectionalEdge(nodeIds[i], nodeIds[i + 1], distance, {
        source: 'mapbox',
        geometry: [[fromNode.lng, fromNode.lat], [toNode.lng, toNode.lat]],
      });
    }

    return this.graph;
  }

  /**
   * Load pre-built graph from storage
   */
  async loadFromCache(cacheKey) {
    try {
      const cachedData = await this._loadFromStorage(cacheKey);
      if (cachedData) {
        this.graph = NavigationGraph.fromJSON(cachedData);
        return this.graph;
      }
      return null;
    } catch (error) {
      console.warn('[GraphBuilder] Cache load failed:', error.message);
      return null;
    }
  }

  /**
   * Save graph to storage for later use
   */
  async saveToCache(cacheKey) {
    if (!this.graph) return false;
    
    try {
      const data = this.graph.toJSON();
      await this._saveToStorage(cacheKey, data);
      return true;
    } catch (error) {
      console.warn('[GraphBuilder] Cache save failed:', error.message);
      return false;
    }
  }

  // =========================================
  // OSM DATA FETCHING
  // =========================================

  async _fetchOSMData(bounds) {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    
    // Overpass QL query for walkable ways
    const query = `
      [out:json][timeout:60];
      (
        way["highway"~"^(${WALKABLE_HIGHWAYS.join('|')})$"]
          (${minLat},${minLng},${maxLat},${maxLng});
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`OSM fetch failed: ${response.status}`);
    }

    return response.json();
  }

  // =========================================
  // GRAPH CONSTRUCTION
  // =========================================

  _buildNodes(elements) {
    const nodeIdMap = new Map(); // OSM node ID -> our node ID
    let nodeCounter = 0;

    // First pass: collect all nodes
    for (const element of elements) {
      if (element.type === 'node') {
        const nodeId = `n${nodeCounter++}`;
        nodeIdMap.set(element.id, nodeId);
        
        this.graph.addNode(nodeId, element.lat, element.lon, {
          osmId: element.id,
          tags: element.tags || {},
        });
      }
    }

    return nodeIdMap;
  }

  _buildEdges(elements, nodeIdMap) {
    for (const element of elements) {
      if (element.type !== 'way') continue;
      
      const tags = element.tags || {};
      const highway = tags.highway;
      
      if (!highway || !WALKABLE_HIGHWAYS.includes(highway)) continue;

      const nodes = element.nodes || [];
      if (nodes.length < 2) continue;

      // Determine if one-way
      const oneWay = ONE_WAY_VALUES.includes(tags.oneway);
      const reverseOneWay = tags.oneway === '-1' || tags.oneway === 'reverse';

      // Create edges between consecutive nodes
      for (let i = 0; i < nodes.length - 1; i++) {
        const fromOsmId = nodes[i];
        const toOsmId = nodes[i + 1];
        
        const fromId = nodeIdMap.get(fromOsmId);
        const toId = nodeIdMap.get(toOsmId);
        
        if (!fromId || !toId) continue;

        const fromNode = this.graph.getNode(fromId);
        const toNode = this.graph.getNode(toId);

        const distance = this._haversineDistance(
          fromNode.lat, fromNode.lng,
          toNode.lat, toNode.lng
        );

        const edgeProps = {
          osmWayId: element.id,
          highway: highway,
          name: tags.name,
          lit: tags.lit,
          surface: tags.surface,
          sidewalk: tags.sidewalk,
          geometry: [[fromNode.lng, fromNode.lat], [toNode.lng, toNode.lat]],
        };

        // Add forward edge (unless reverse one-way)
        if (!reverseOneWay) {
          const edge = this.graph.addEdge(fromId, toId, distance, edgeProps);
          if (edge) {
            edge.startLat = fromNode.lat;
            edge.startLng = fromNode.lng;
            edge.endLat = toNode.lat;
            edge.endLng = toNode.lng;
          }
        }

        // Add backward edge (unless one-way forward)
        if (!oneWay || reverseOneWay) {
          const reverseProps = { ...edgeProps, reverse: true };
          const edge = this.graph.addEdge(toId, fromId, distance, reverseProps);
          if (edge) {
            edge.startLat = toNode.lat;
            edge.startLng = toNode.lng;
            edge.endLat = fromNode.lat;
            edge.endLng = fromNode.lng;
          }
        }
      }
    }
  }

  async _calculateAllRiskScores(onProgress) {
    const edges = this.graph.getAllEdges();
    const totalEdges = edges.length;
    const batchSize = 100;
    
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      
      await riskScoringService.updateEdgeRisks(batch);
      
      const progress = 60 + Math.round(40 * (i + batch.length) / totalEdges);
      this.buildProgress = { 
        status: 'scoring', 
        progress, 
        message: `Scoring edges: ${i + batch.length}/${totalEdges}` 
      };
      this._notifyProgress(onProgress);
    }
  }

  // =========================================
  // STORAGE HELPERS
  // =========================================

  async _loadFromStorage(key) {
    try {
      // Try AsyncStorage (React Native) first
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const data = await AsyncStorage.getItem(`graph_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      // Fallback to localStorage (web)
      try {
        const data = localStorage.getItem(`graph_${key}`);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }
  }

  async _saveToStorage(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      
      // Try AsyncStorage first
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(`graph_${key}`, jsonData);
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`graph_${key}`, JSON.stringify(data));
      } catch (e) {
        console.warn('Storage save failed:', e.message);
      }
    }
  }

  // =========================================
  // UTILITIES
  // =========================================

  _notifyProgress(callback) {
    if (callback) {
      callback(this.buildProgress);
    }
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

  getGraph() {
    return this.graph;
  }

  getProgress() {
    return this.buildProgress;
  }
}

// =========================================
// PRE-DEFINED CAMPUS BOUNDS
// =========================================

const CAMPUS_BOUNDS = {
  // New York University (Manhattan)
  'nyu': {
    minLat: 40.7270,
    maxLat: 40.7350,
    minLng: -74.0030,
    maxLng: -73.9920,
  },
  
  // Columbia University
  'columbia': {
    minLat: 40.8030,
    maxLat: 40.8150,
    minLng: -73.9680,
    maxLng: -73.9550,
  },
  
  // CUNY City College
  'ccny': {
    minLat: 40.8180,
    maxLat: 40.8240,
    minLng: -73.9520,
    maxLng: -73.9440,
  },
  
  // Fordham University (Lincoln Center)
  'fordham-lc': {
    minLat: 40.7700,
    maxLat: 40.7760,
    minLng: -73.9900,
    maxLng: -73.9820,
  },
  
  // New School
  'newschool': {
    minLat: 40.7340,
    maxLat: 40.7400,
    minLng: -73.9980,
    maxLng: -73.9900,
  },
  
  // Manhattan (broader area)
  'manhattan': {
    minLat: 40.7000,
    maxLat: 40.8500,
    minLng: -74.0200,
    maxLng: -73.9300,
  },
  
  // Brooklyn (broader area)
  'brooklyn': {
    minLat: 40.6300,
    maxLat: 40.7100,
    minLng: -74.0100,
    maxLng: -73.9200,
  },
};

// Export singleton and constants
export const graphBuilder = new GraphBuilder();
export { CAMPUS_BOUNDS, WALKABLE_HIGHWAYS };
export default GraphBuilder;

