/**
 * SafeStep Risk Scoring Service v1.0
 * ===================================
 * Computes risk scores for graph edges based on:
 * - Crime/incident data (NYC 911 API, NYPD complaints)
 * - Infrastructure (call boxes, lighting, safe havens)
 * - Crowdsourced reports
 * - Time-of-day adjustments
 * 
 * Risk Score Formula:
 *   RiskScore = 1 - VibrancyScore
 *   
 *   VibrancyScore = (40% × Infrastructure) + 
 *                   (30% × Incident_Inverse) + 
 *                   (20% × Crowd_Reports) + 
 *                   (10% × Lighting)
 *   
 * Each component normalized to 0-1 scale.
 */

import { crimeDataService } from './crimeData';
import { supabase } from './supabase';

// Weight distribution for risk components
const RISK_WEIGHTS = {
  incidents: 0.35,      // Crime/911 incidents (higher weight = more impact)
  infrastructure: 0.30, // Safety infrastructure
  crowdsource: 0.20,    // User reports
  lighting: 0.15,       // Lighting conditions
};

// Nighttime adjustments (applied after sunset)
const NIGHT_WEIGHT_ADJUSTMENTS = {
  incidents: 0.30,
  infrastructure: 0.25,
  crowdsource: 0.15,
  lighting: 0.30,       // Lighting becomes much more important
};

// Incident severity impact on risk (normalized to 0-1)
const INCIDENT_SEVERITY = {
  // Violent crimes (highest impact)
  'MURDER': 1.0,
  'HOMICIDE': 1.0,
  'RAPE': 0.95,
  'SHOOTING': 0.95,
  'FELONY ASSAULT': 0.85,
  'ROBBERY': 0.80,
  
  // Property crimes (medium impact)
  'BURGLARY': 0.50,
  'GRAND LARCENY': 0.45,
  'ASSAULT': 0.60,
  
  // Minor incidents (lower impact)
  'HARASSMENT': 0.35,
  'PETIT LARCENY': 0.30,
  'CRIMINAL MISCHIEF': 0.25,
  'DISORDERLY CONDUCT': 0.20,
  'TRESPASS': 0.15,
  'NOISE': 0.05,
};

// Infrastructure types that reduce risk
const INFRASTRUCTURE_SAFETY = {
  'call_box': 0.15,           // Emergency call box nearby
  'security_post': 0.20,      // Campus security location
  'safe_haven': 0.25,         // 24/7 safe haven
  'police_station': 0.30,     // Police presence
  'hospital': 0.20,           // Emergency services
  'fire_station': 0.15,       // Emergency services
  'well_lit': 0.10,           // Good lighting
  'busy_intersection': 0.10,  // High foot traffic
};

// Time decay for incident impact (recent = more impact)
const TIME_DECAY = {
  0: 1.0,    // 0-1 hours ago
  1: 0.9,    // 1-3 hours ago
  3: 0.7,    // 3-6 hours ago
  6: 0.5,    // 6-12 hours ago
  12: 0.3,   // 12-24 hours ago
  24: 0.2,   // 1-3 days ago
  72: 0.1,   // 3-7 days ago
  168: 0.05, // 7+ days ago
};

class RiskScoringService {
  constructor() {
    this.cachedInfrastructure = null;
    this.infrastructureCacheTime = null;
    this.infrastructureCacheDuration = 24 * 60 * 60 * 1000; // 24 hours
    
    this.cachedIncidents = new Map(); // Grid-based cache
    this.incidentCacheDuration = 15 * 60 * 1000; // 15 minutes
  }

  // =========================================
  // MAIN SCORING FUNCTIONS
  // =========================================

  /**
   * Calculate risk score for a single edge
   * @param {GraphEdge} edge - The edge to score
   * @param {Object} options - Scoring options
   * @returns {Object} Risk score and breakdown
   */
  async calculateEdgeRisk(edge, options = {}) {
    const {
      forceRefresh = false,
      includeBreakdown = true,
    } = options;

    // Get edge midpoint for spatial queries
    const midLat = (edge.startLat + edge.endLat) / 2;
    const midLng = (edge.startLng + edge.endLng) / 2;
    
    // Use edge length to determine influence radius
    const influenceRadius = Math.max(50, Math.min(150, edge.distance * 0.75));

    // Gather all risk components in parallel
    const [
      incidentScore,
      infrastructureScore,
      crowdsourceScore,
      lightingScore,
    ] = await Promise.all([
      this._calculateIncidentRisk(midLat, midLng, influenceRadius, forceRefresh),
      this._calculateInfrastructureScore(midLat, midLng, influenceRadius),
      this._calculateCrowdsourceScore(midLat, midLng, influenceRadius),
      this._calculateLightingScore(midLat, midLng, edge.properties),
    ]);

    // Get appropriate weights based on time
    const weights = this._getCurrentWeights();

    // Calculate weighted vibrancy score (0 = dangerous, 1 = safe)
    const vibrancyScore = 
      (weights.incidents * (1 - incidentScore)) +
      (weights.infrastructure * infrastructureScore) +
      (weights.crowdsource * crowdsourceScore) +
      (weights.lighting * lightingScore);

    // Risk is inverse of vibrancy (0 = safe, 1 = dangerous)
    const riskScore = Math.max(0, Math.min(1, 1 - vibrancyScore));

    const result = {
      riskScore,
      vibrancyScore,
      isNight: this._isNightTime(),
      timestamp: Date.now(),
    };

    if (includeBreakdown) {
      result.breakdown = {
        incidents: {
          score: incidentScore,
          weight: weights.incidents,
          contribution: weights.incidents * incidentScore,
        },
        infrastructure: {
          score: infrastructureScore,
          weight: weights.infrastructure,
          contribution: weights.infrastructure * infrastructureScore,
        },
        crowdsource: {
          score: crowdsourceScore,
          weight: weights.crowdsource,
          contribution: weights.crowdsource * crowdsourceScore,
        },
        lighting: {
          score: lightingScore,
          weight: weights.lighting,
          contribution: weights.lighting * lightingScore,
        },
      };
    }

    return result;
  }

  /**
   * Batch update risk scores for multiple edges
   * More efficient than individual updates
   */
  async updateEdgeRisks(edges, options = {}) {
    const { batchSize = 50, onProgress = null } = options;
    
    const results = [];
    let processed = 0;

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(edge => this.calculateEdgeRisk(edge, { includeBreakdown: false }))
      );

      // Apply scores to edges
      batch.forEach((edge, idx) => {
        const { riskScore, breakdown } = batchResults[idx];
        edge.updateRisk(riskScore, breakdown || {});
      });

      results.push(...batchResults);
      processed += batch.length;

      if (onProgress) {
        onProgress({ processed, total: edges.length });
      }
    }

    return results;
  }

  /**
   * Update risks for edges near a new incident
   */
  async updateRisksNearIncident(lat, lng, incidentType, radiusMeters = 200) {
    // Calculate risk increase based on incident severity
    const severity = INCIDENT_SEVERITY[incidentType?.toUpperCase()] || 0.3;
    
    return {
      lat,
      lng,
      radius: radiusMeters,
      severity,
      riskDelta: severity * 0.5, // Partial contribution
    };
  }

  // =========================================
  // RISK COMPONENT CALCULATIONS
  // =========================================

  /**
   * Calculate incident-based risk (crimes, 911 calls)
   */
  async _calculateIncidentRisk(lat, lng, radiusMeters, forceRefresh = false) {
    try {
      // Check cache first
      const cacheKey = this._getGridKey(lat, lng);
      const cached = this.cachedIncidents.get(cacheKey);
      
      if (!forceRefresh && cached && Date.now() - cached.timestamp < this.incidentCacheDuration) {
        return cached.score;
      }

      // Fetch recent incidents
      const [calls, crimes] = await Promise.all([
        crimeDataService.getRecent911Calls(lat, lng, radiusMeters, 12), // Last 12 hours
        crimeDataService.getRecentCrimes(lat, lng, radiusMeters, 7),    // Last 7 days
      ]);

      if (calls.length === 0 && crimes.length === 0) {
        this.cachedIncidents.set(cacheKey, { score: 0, timestamp: Date.now() });
        return 0;
      }

      // Calculate cumulative risk from incidents
      let totalRisk = 0;

      for (const incident of [...calls, ...crimes]) {
        const severity = INCIDENT_SEVERITY[incident.type?.toUpperCase()] || 0.2;
        const timeDecay = this._getTimeDecay(incident.timestamp);
        const distance = this._haversineDistance(lat, lng, incident.lat, incident.lng);
        const proximityFactor = 1 - (distance / radiusMeters);

        totalRisk += severity * timeDecay * proximityFactor;
      }

      // Normalize to 0-1 (cap at 1.0)
      const normalizedRisk = Math.min(1, totalRisk / 2); // Divide by 2 to normalize typical load

      this.cachedIncidents.set(cacheKey, { score: normalizedRisk, timestamp: Date.now() });
      return normalizedRisk;

    } catch (error) {
      console.warn('[RiskScoring] Incident fetch failed:', error.message);
      return 0.3; // Default moderate risk on failure
    }
  }

  /**
   * Calculate infrastructure-based safety boost
   */
  async _calculateInfrastructureScore(lat, lng, radiusMeters) {
    try {
      // Fetch infrastructure from Supabase
      if (!this.cachedInfrastructure || 
          Date.now() - this.infrastructureCacheTime > this.infrastructureCacheDuration) {
        await this._refreshInfrastructureCache();
      }

      if (!this.cachedInfrastructure || this.cachedInfrastructure.length === 0) {
        return 0.5; // Neutral if no data
      }

      let safetyBoost = 0;

      for (const item of this.cachedInfrastructure) {
        const distance = this._haversineDistance(lat, lng, item.lat, item.lng);
        
        if (distance <= radiusMeters) {
          const boost = INFRASTRUCTURE_SAFETY[item.type] || 0.05;
          const proximityFactor = 1 - (distance / radiusMeters);
          safetyBoost += boost * proximityFactor;
        }
      }

      // Normalize to 0-1
      return Math.min(1, safetyBoost + 0.3); // Base 0.3 + boosts

    } catch (error) {
      console.warn('[RiskScoring] Infrastructure fetch failed:', error.message);
      return 0.5;
    }
  }

  /**
   * Calculate crowdsource-based score
   */
  async _calculateCrowdsourceScore(lat, lng, radiusMeters) {
    try {
      const reports = await supabase.getReportsNearLocation?.(lat, lng, radiusMeters, 24);
      
      if (!reports || reports.length === 0) {
        return 0.5; // Neutral if no reports
      }

      let positiveScore = 0;
      let negativeScore = 0;

      for (const report of reports) {
        const distance = this._haversineDistance(lat, lng, report.lat, report.lng);
        const proximityFactor = 1 - (distance / radiusMeters);
        const timeDecay = this._getTimeDecay(report.created_at);
        const weight = proximityFactor * timeDecay;

        // Categorize report type
        if (['police', 'security', 'lit', 'crowd', 'open-business'].includes(report.type)) {
          positiveScore += weight * 0.2;
        } else if (['hazard', 'closed', 'construction', 'dark', 'quiet'].includes(report.type)) {
          negativeScore += weight * 0.3;
        }
      }

      // Calculate net score (0.5 baseline)
      const netScore = 0.5 + positiveScore - negativeScore;
      return Math.max(0, Math.min(1, netScore));

    } catch (error) {
      console.warn('[RiskScoring] Crowdsource fetch failed:', error.message);
      return 0.5;
    }
  }

  /**
   * Calculate lighting-based score
   */
  _calculateLightingScore(lat, lng, edgeProperties = {}) {
    // Check if edge has lighting data
    const hasStreetLights = edgeProperties.lit === 'yes' || edgeProperties.highway === 'primary';
    const isResidential = edgeProperties.highway === 'residential';
    const isPath = edgeProperties.highway === 'path' || edgeProperties.highway === 'footway';

    // Time-based adjustment
    const isNight = this._isNightTime();
    
    if (!isNight) {
      // Daytime - lighting doesn't matter much
      return 0.9;
    }

    // Nighttime scoring
    if (hasStreetLights) {
      return 0.8; // Well-lit street
    } else if (isResidential) {
      return 0.5; // Some ambient lighting
    } else if (isPath) {
      return 0.3; // Likely poorly lit
    }

    return 0.4; // Default moderate lighting
  }

  // =========================================
  // HELPER FUNCTIONS
  // =========================================

  async _refreshInfrastructureCache() {
    try {
      // Fetch safety infrastructure from Supabase
      const { data } = await supabase.client
        ?.from('safety_infrastructure')
        ?.select('*');
      
      this.cachedInfrastructure = data || [];
      this.infrastructureCacheTime = Date.now();
    } catch (error) {
      console.warn('[RiskScoring] Failed to refresh infrastructure cache');
      this.cachedInfrastructure = [];
    }
  }

  _getCurrentWeights() {
    return this._isNightTime() ? NIGHT_WEIGHT_ADJUSTMENTS : RISK_WEIGHTS;
  }

  _isNightTime() {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 6; // 8 PM to 6 AM
  }

  _getTimeDecay(timestamp) {
    if (!timestamp) return 0.1;
    
    const hoursAgo = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    
    for (const [threshold, decay] of Object.entries(TIME_DECAY)) {
      if (hoursAgo <= Number(threshold)) {
        return decay;
      }
    }
    return 0.05; // Very old
  }

  _getGridKey(lat, lng) {
    // ~100m grid cells
    const gridLat = Math.floor(lat * 1000);
    const gridLng = Math.floor(lng * 1000);
    return `${gridLat}:${gridLng}`;
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
export const riskScoringService = new RiskScoringService();
export { RISK_WEIGHTS, INCIDENT_SEVERITY, INFRASTRUCTURE_SAFETY };
export default RiskScoringService;

