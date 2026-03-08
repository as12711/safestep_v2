/**
 * SafeStep Density Prediction Service v1.0
 * =========================================
 * "Predictive Stream" engine for crowd-based routing.
 * 
 * Key Concept:
 *   Route students through high-density (safer) paths based on:
 *   - Academic schedule data (class dismissals)
 *   - Historical foot traffic patterns
 *   - Real-time user density (when available)
 * 
 * Branding: "Visibility & Crowd-Sourced Routing" (CPTED principles)
 * NOT safety guarantees - we optimize for crowd density.
 * 
 * Implementation Phases:
 *   Phase 1: Static schedule-based predictions (no live data needed)
 *   Phase 2: Monte Carlo simulation for density estimation
 *   Phase 3: Real-time Kalman filtering from GPS pings
 * 
 * Data Dependencies (future):
 *   - Registrar data: Class schedules, building capacities
 *   - Historical patterns: Library exits, dining hall traffic
 *   - Live GPS: Opt-in location sharing
 */

// Time buckets for density predictions (15-minute intervals)
const TIME_BUCKET_MINUTES = 15;
const BUCKETS_PER_DAY = (24 * 60) / TIME_BUCKET_MINUTES; // 96 buckets

// Days of week for pattern matching
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Default density patterns based on typical university schedule
 * Values represent relative foot traffic (0.0 = empty, 1.0 = peak)
 * 
 * These are placeholders until we have registrar data
 */
const DEFAULT_PATTERNS = {
  // Weekday patterns (Mon-Fri)
  weekday: {
    // Early morning (6-8am): Low
    6: 0.15, 7: 0.25,
    // Morning rush (8-10am): High
    8: 0.70, 9: 0.85,
    // Late morning (10-12pm): Moderate
    10: 0.65, 11: 0.60,
    // Lunch (12-2pm): High
    12: 0.75, 13: 0.80,
    // Afternoon (2-5pm): Moderate-High
    14: 0.65, 15: 0.70, 16: 0.60,
    // Evening (5-8pm): High (class dismissals + dinner)
    17: 0.75, 18: 0.85, 19: 0.80,
    // Night (8-10pm): Moderate (library crowd)
    20: 0.55, 21: 0.45,
    // Late night (10pm-12am): Low-Moderate
    22: 0.35, 23: 0.20,
    // Very late (12-6am): Very low
    0: 0.10, 1: 0.08, 2: 0.05, 3: 0.03, 4: 0.02, 5: 0.05,
  },
  // Weekend patterns (Sat-Sun)
  weekend: {
    6: 0.05, 7: 0.08, 8: 0.15, 9: 0.25,
    10: 0.35, 11: 0.45, 12: 0.50, 13: 0.55,
    14: 0.50, 15: 0.45, 16: 0.40, 17: 0.45,
    18: 0.50, 19: 0.55, 20: 0.45, 21: 0.35,
    22: 0.25, 23: 0.15,
    0: 0.10, 1: 0.08, 2: 0.05, 3: 0.03, 4: 0.02, 5: 0.05,
  },
};

/**
 * High-density locations (buildings with known dismissal patterns)
 * These will be replaced with registrar data in production
 */
const HIGH_DENSITY_LOCATIONS = [
  // NYU buildings with known heavy traffic
  { id: 'bobst', name: 'Bobst Library', lat: 40.7295, lng: -73.9972, capacity: 2000, 
    peakHours: [9, 12, 17, 20], type: 'library' },
  { id: 'kimmel', name: 'Kimmel Center', lat: 40.7297, lng: -73.9975, capacity: 1500, 
    peakHours: [12, 13, 18, 19], type: 'student_center' },
  { id: 'silver', name: 'Silver Center', lat: 40.7298, lng: -73.9955, capacity: 1000, 
    peakHours: [9, 10, 14, 15, 17], type: 'academic' },
  { id: 'stern', name: 'Stern School', lat: 40.7289, lng: -73.9963, capacity: 800, 
    peakHours: [9, 12, 15, 18], type: 'academic' },
  { id: 'tisch', name: 'Tisch Hall', lat: 40.7283, lng: -73.9974, capacity: 600, 
    peakHours: [10, 14, 16, 19], type: 'academic' },
  { id: 'washington_sq', name: 'Washington Square', lat: 40.7308, lng: -73.9973, capacity: 5000, 
    peakHours: [12, 13, 17, 18, 19], type: 'outdoor' },
];

/**
 * Density Prediction Service
 */
class DensityPredictionService {
  constructor() {
    this.scheduleData = null;      // Will hold registrar data when available
    this.historicalPatterns = {};  // Edge-level historical density
    this.liveDensity = new Map();  // Real-time density from user pings
    this.lastLiveUpdate = null;
    
    // Simulation cache
    this.simulationCache = new Map(); // Map<timeBucket, edgeDensities>
    this.simulationCacheTime = null;
    
    // Feature flags
    this.useScheduleData = false;  // Toggle when registrar data available
    this.useLiveDensity = false;   // Toggle when GPS pings available
  }

  // =========================================
  // PUBLIC API
  // =========================================

  /**
   * Get predicted density for an edge at a specific time
   * This is the main function called by the routing engine
   * 
   * @param {string} edgeId - Edge identifier
   * @param {Date|number} time - Time to predict for
   * @returns {Object} Density prediction with confidence
   */
  getPredictedDensity(edgeId, time = new Date()) {
    const timestamp = time instanceof Date ? time : new Date(time);
    const bucket = this._getTimeBucket(timestamp);
    const dayType = this._getDayType(timestamp);

    // Priority 1: Live density (if available and fresh)
    if (this.useLiveDensity && this.liveDensity.has(edgeId)) {
      const live = this.liveDensity.get(edgeId);
      if (Date.now() - live.timestamp < 5 * 60 * 1000) { // 5 min freshness
        return {
          density: live.value,
          confidence: 0.95,
          source: 'live',
          studentCount: live.count || null,
        };
      }
    }

    // Priority 2: Simulation cache
    const cachedSimulation = this._getSimulationCache(bucket);
    if (cachedSimulation && cachedSimulation.has(edgeId)) {
      const simulated = cachedSimulation.get(edgeId);
      return {
        density: simulated.density,
        confidence: simulated.confidence,
        source: 'simulation',
        studentCount: simulated.estimatedCount,
      };
    }

    // Priority 3: Historical patterns (if we have them)
    if (this.historicalPatterns[edgeId]) {
      const historical = this.historicalPatterns[edgeId][bucket];
      if (historical) {
        return {
          density: historical.avgDensity,
          confidence: historical.confidence,
          source: 'historical',
          studentCount: null,
        };
      }
    }

    // Priority 4: Default patterns based on time of day
    const defaultDensity = this._getDefaultDensity(timestamp, dayType);
    return {
      density: defaultDensity,
      confidence: 0.3, // Low confidence for default
      source: 'default',
      studentCount: null,
    };
  }

  /**
   * Get optimal departure time to maximize crowd density on route
   * "Walk with 300 people leaving Bobst at 8 PM"
   * 
   * @param {Array} edges - Route edges
   * @param {Date} desiredArrival - When user wants to arrive
   * @param {number} windowMinutes - How far to search
   * @returns {Object} Optimal departure info
   */
  getOptimalDepartureTime(edges, desiredArrival, windowMinutes = 60) {
    const candidates = [];
    const slotMinutes = 5; // Check every 5 minutes
    const numSlots = Math.floor(windowMinutes / slotMinutes);

    const arrivalTime = desiredArrival instanceof Date ? desiredArrival : new Date(desiredArrival);

    for (let i = -numSlots; i <= numSlots; i++) {
      const departureTime = new Date(arrivalTime.getTime() - (i * slotMinutes * 60 * 1000));
      
      // Calculate average density along route at this departure time
      let totalDensity = 0;
      let totalDistance = 0;
      let minDensity = 1;

      for (const edge of edges) {
        const { density } = this.getPredictedDensity(edge.id || `${edge.from}-${edge.to}`, departureTime);
        totalDensity += density * edge.distance;
        totalDistance += edge.distance;
        minDensity = Math.min(minDensity, density);
      }

      const avgDensity = totalDistance > 0 ? totalDensity / totalDistance : 0;

      candidates.push({
        departureTime,
        avgDensity,
        minDensity,
        peakStudentEstimate: this._estimatePeakStudents(edges, departureTime),
      });
    }

    // Sort by average density (descending)
    candidates.sort((a, b) => b.avgDensity - a.avgDensity);

    const optimal = candidates[0];
    const onTimeOption = candidates.find(c => 
      Math.abs(c.departureTime.getTime() - arrivalTime.getTime()) < slotMinutes * 60 * 1000
    );

    return {
      optimal: {
        departureTime: optimal.departureTime,
        density: optimal.avgDensity,
        message: this._formatDensityMessage(optimal),
      },
      onTime: onTimeOption ? {
        departureTime: onTimeOption.departureTime,
        density: onTimeOption.avgDensity,
        message: this._formatDensityMessage(onTimeOption),
      } : null,
      alternatives: candidates.slice(0, 5), // Top 5 options
    };
  }

  /**
   * Get all edges with predicted density above threshold
   * Used for showing "high visibility" corridors on map
   */
  getHighDensityEdges(graph, time = new Date(), threshold = 0.5) {
    const highDensityEdges = [];
    
    for (const node of graph.nodes.values()) {
      for (const edge of node.getOutgoingEdges()) {
        const edgeId = `${edge.from}-${edge.to}`;
        const { density, studentCount } = this.getPredictedDensity(edgeId, time);
        
        if (density >= threshold) {
          highDensityEdges.push({
            edge,
            density,
            studentCount,
            color: this._getDensityColor(density),
          });
        }
      }
    }

    return highDensityEdges.sort((a, b) => b.density - a.density);
  }

  // =========================================
  // DENSITY-AWARE ROUTING INTEGRATION
  // =========================================

  /**
   * Get edge cost modifier based on density
   * Lower cost for higher density (more people = safer)
   * 
   * This is the key integration point with A* routing
   * 
   * @param {string} edgeId - Edge identifier
   * @param {Date} time - Time of traversal
   * @param {number} densityWeight - How much to weight density (0-1)
   * @returns {number} Cost multiplier (< 1 for high density, > 1 for low)
   */
  getDensityCostModifier(edgeId, time, densityWeight = 0.3) {
    const { density } = this.getPredictedDensity(edgeId, time);
    
    // High density = lower cost (prefer busy streets)
    // densityBonus ranges from 0 (empty) to densityWeight (crowded)
    const densityBonus = density * densityWeight;
    
    // Return multiplier: 1.0 - bonus (so high density = lower cost)
    return Math.max(0.5, 1.0 - densityBonus);
  }

  // =========================================
  // MONTE CARLO SIMULATION
  // =========================================

  /**
   * Run Monte Carlo simulation to estimate density distribution
   * Call this periodically (e.g., hourly) to update predictions
   * 
   * @param {NavigationGraph} graph - The navigation graph
   * @param {number} numSimulations - Number of simulation runs
   */
  async runDensitySimulation(graph, numSimulations = 100) {
    console.log(`[DensityPrediction] Running ${numSimulations} simulations...`);
    
    const edgeDensities = new Map(); // Map<edgeId, {counts: [], timestamps: []}>
    const now = new Date();

    for (let sim = 0; sim < numSimulations; sim++) {
      // Simulate students leaving high-density locations
      for (const location of HIGH_DENSITY_LOCATIONS) {
        const isNearPeak = this._isNearPeakHour(now, location.peakHours);
        
        if (isNearPeak) {
          // Generate students leaving this location
          const numStudents = Math.floor(
            location.capacity * (0.3 + Math.random() * 0.2) // 30-50% of capacity
          );
          
          // Simulate each student's path (simplified)
          for (let s = 0; s < numStudents; s++) {
            const destination = this._sampleDestination(location);
            const path = this._samplePath(graph, location, destination);
            
            // Mark edges as traversed
            for (const edgeId of path) {
              if (!edgeDensities.has(edgeId)) {
                edgeDensities.set(edgeId, { counts: [], totalCount: 0 });
              }
              edgeDensities.get(edgeId).totalCount++;
            }
          }
        }
      }
    }

    // Calculate average density per edge
    const timeBucket = this._getTimeBucket(now);
    const simulationResults = new Map();

    for (const [edgeId, data] of edgeDensities) {
      const avgCount = data.totalCount / numSimulations;
      // Normalize to 0-1 scale (assuming max ~50 students per edge)
      const density = Math.min(1, avgCount / 50);
      
      simulationResults.set(edgeId, {
        density,
        estimatedCount: Math.round(avgCount),
        confidence: Math.min(0.8, 0.3 + (numSimulations / 500)), // More sims = more confidence
      });
    }

    // Cache results
    this.simulationCache.set(timeBucket, simulationResults);
    this.simulationCacheTime = Date.now();

    console.log(`[DensityPrediction] Simulation complete: ${simulationResults.size} edges with density data`);
    
    return simulationResults;
  }

  // =========================================
  // LIVE DENSITY UPDATES (Phase 3)
  // =========================================

  /**
   * Update live density from user GPS ping
   * Called when user shares their location
   */
  updateLiveDensity(edgeId, increment = 1) {
    const current = this.liveDensity.get(edgeId) || { value: 0, count: 0, timestamp: 0 };
    
    this.liveDensity.set(edgeId, {
      value: Math.min(1, current.value + (increment * 0.05)), // Each user adds ~5% density
      count: current.count + increment,
      timestamp: Date.now(),
    });
    
    this.lastLiveUpdate = Date.now();
  }

  /**
   * Decay live density values over time
   * Call periodically (e.g., every minute)
   */
  decayLiveDensity(decayFactor = 0.95) {
    for (const [edgeId, data] of this.liveDensity) {
      const age = Date.now() - data.timestamp;
      
      if (age > 10 * 60 * 1000) { // 10 minutes old
        this.liveDensity.delete(edgeId);
      } else {
        data.value *= decayFactor;
        data.count = Math.floor(data.count * decayFactor);
      }
    }
  }

  // =========================================
  // REGISTRAR DATA INTEGRATION (Phase 2)
  // =========================================

  /**
   * Load academic schedule data
   * Called when registrar data becomes available
   */
  loadScheduleData(scheduleData) {
    this.scheduleData = scheduleData;
    this.useScheduleData = true;
    
    // Pre-compute density patterns from schedule
    this._computeSchedulePatterns();
    
    console.log('[DensityPrediction] Schedule data loaded:', 
      scheduleData?.classes?.length || 0, 'classes');
  }

  /**
   * Get predicted density at a building at specific time
   * Based on class schedule data
   */
  getBuildingDensity(buildingId, time) {
    if (!this.scheduleData || !this.useScheduleData) {
      // Fall back to default patterns
      const location = HIGH_DENSITY_LOCATIONS.find(l => l.id === buildingId);
      if (location) {
        const hour = time.getHours();
        const isNearPeak = location.peakHours.some(h => Math.abs(h - hour) <= 1);
        return isNearPeak ? 0.75 : 0.3;
      }
      return 0.3;
    }

    // Compute from schedule data
    const dayOfWeek = DAYS[time.getDay()];
    const timeSlot = `${String(time.getHours()).padStart(2, '0')}:${String(Math.floor(time.getMinutes() / 15) * 15).padStart(2, '0')}`;
    
    // Count students with classes ending in this time window
    const endingClasses = this.scheduleData.classes?.filter(c => 
      c.building === buildingId &&
      c.days.includes(dayOfWeek) &&
      c.endTime === timeSlot
    ) || [];

    const startingClasses = this.scheduleData.classes?.filter(c =>
      c.building === buildingId &&
      c.days.includes(dayOfWeek) &&
      c.startTime === timeSlot
    ) || [];

    const totalStudents = endingClasses.reduce((sum, c) => sum + (c.enrollment || 30), 0);
    const arrivingStudents = startingClasses.reduce((sum, c) => sum + (c.enrollment || 30), 0);

    // Normalize (assuming building capacity)
    const location = HIGH_DENSITY_LOCATIONS.find(l => l.id === buildingId);
    const capacity = location?.capacity || 500;
    
    return Math.min(1, (totalStudents + arrivingStudents) / capacity);
  }

  // =========================================
  // INTERNAL HELPERS
  // =========================================

  _getTimeBucket(time) {
    const minutes = time.getHours() * 60 + time.getMinutes();
    return Math.floor(minutes / TIME_BUCKET_MINUTES);
  }

  _getDayType(time) {
    const day = time.getDay();
    return (day === 0 || day === 6) ? 'weekend' : 'weekday';
  }

  _getDefaultDensity(time, dayType) {
    const hour = time.getHours();
    const patterns = DEFAULT_PATTERNS[dayType] || DEFAULT_PATTERNS.weekday;
    return patterns[hour] || 0.3;
  }

  _getSimulationCache(bucket) {
    // Check if cache is fresh (within 1 hour)
    if (this.simulationCacheTime && 
        Date.now() - this.simulationCacheTime < 60 * 60 * 1000) {
      return this.simulationCache.get(bucket);
    }
    return null;
  }

  _isNearPeakHour(time, peakHours) {
    const hour = time.getHours();
    return peakHours.some(h => Math.abs(h - hour) <= 1);
  }

  _estimatePeakStudents(edges, time) {
    // Rough estimate based on nearby high-density locations
    let totalEstimate = 0;
    
    for (const location of HIGH_DENSITY_LOCATIONS) {
      if (this._isNearPeakHour(time, location.peakHours)) {
        totalEstimate += Math.floor(location.capacity * 0.4); // 40% leaving
      }
    }
    
    return totalEstimate;
  }

  _sampleDestination(origin) {
    // Simplified: pick a random direction
    // In production, use actual destination data
    return {
      lat: origin.lat + (Math.random() - 0.5) * 0.02,
      lng: origin.lng + (Math.random() - 0.5) * 0.02,
    };
  }

  _samplePath(graph, origin, destination) {
    // Simplified: return empty path
    // In production, use A* to find actual paths
    return [];
  }

  _computeSchedulePatterns() {
    // Pre-compute patterns from schedule data
    // This is called when registrar data is loaded
    if (!this.scheduleData) return;
    
    // Implementation would iterate through all classes
    // and build edge-level density predictions
  }

  _formatDensityMessage(option) {
    const count = option.peakStudentEstimate;
    const density = option.avgDensity;

    if (density >= 0.7 && count > 200) {
      return `Walk with ~${count} students (high visibility)`;
    } else if (density >= 0.5) {
      return `Moderate foot traffic (~${Math.round(count * 0.6)} students)`;
    } else if (density >= 0.3) {
      return `Light foot traffic`;
    } else {
      return `Low visibility corridor`;
    }
  }

  _getDensityColor(density) {
    if (density >= 0.7) return '#00f5d4';  // Cyan - high visibility
    if (density >= 0.5) return '#7dffb3';  // Green - moderate
    if (density >= 0.3) return '#FFB347';  // Orange - light
    return '#ff6b6b';                       // Red - low visibility
  }
}

// Export singleton
export const densityPredictionService = new DensityPredictionService();
export { HIGH_DENSITY_LOCATIONS, DEFAULT_PATTERNS };
export default DensityPredictionService;






