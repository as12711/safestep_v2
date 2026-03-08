/**
 * Crime & Safety Data Service
 * 
 * Aggregates safety data from multiple public sources to enhance route safety scoring.
 * Since Citizen app doesn't have a public API, we use official open data sources.
 * 
 * Data Sources:
 * - NYC Open Data: Real-time 911 calls, NYPD complaint data
 * - Police Department crime statistics
 * - Community reports (from our own Supabase)
 */

import { ENV } from '../config/env';

// NYC Open Data API endpoints (free, no API key required for basic access)
const NYC_OPEN_DATA = {
  // NYPD Calls for Service (real-time 911 data)
  CALLS_FOR_SERVICE: 'https://data.cityofnewyork.us/resource/8zsp-zqpf.json',
  // NYPD Complaint Data (historical crimes)
  COMPLAINTS: 'https://data.cityofnewyork.us/resource/5uac-w243.json',
  // NYPD Shooting Incidents
  SHOOTINGS: 'https://data.cityofnewyork.us/resource/833y-fsy8.json',
};

// Incident types that affect safety scores
const INCIDENT_WEIGHTS = {
  // High severity (major impact on route safety)
  'FELONY ASSAULT': -50,
  'ROBBERY': -50,
  'GRAND LARCENY': -30,
  'BURGLARY': -30,
  'RAPE': -80,
  'MURDER': -100,
  'SHOOTING': -80,
  
  // Medium severity
  'HARASSMENT': -20,
  'ASSAULT': -30,
  'PETIT LARCENY': -15,
  'CRIMINAL MISCHIEF': -15,
  
  // Low severity (minor impact)
  'DISORDERLY CONDUCT': -10,
  'TRESPASS': -5,
  'NOISE': -2,
  
  // Positive indicators
  'POLICE_PRESENCE': +20,
  'COMMUNITY_PATROL': +15,
};

// Cache for API responses
let crimeDataCache = {
  data: null,
  timestamp: null,
  expiresIn: 15 * 60 * 1000, // 15 minutes
};

class CrimeDataService {
  constructor() {
    this.appToken = null; // Optional: NYC Open Data app token for higher rate limits
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
    
    const a = Math.sin(deltaPhi / 2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Fetch recent 911 calls near a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude  
   * @param {number} radiusMeters - Search radius in meters
   * @param {number} hoursBack - How many hours of data to fetch
   */
  async getRecent911Calls(lat, lng, radiusMeters = 500, hoursBack = 6) {
    try {
      // NYC Open Data uses SoQL (SQL-like queries)
      const hoursAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      const timestamp = hoursAgo.toISOString();
      
      // Bounding box for faster queries (approximate)
      const latDelta = radiusMeters / 111000; // ~111km per degree latitude
      const lngDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
      
      const query = `$where=latitude between ${lat - latDelta} and ${lat + latDelta} AND longitude between ${lng - lngDelta} and ${lng + lngDelta}&$limit=100&$order=create_date DESC`;
      
      const url = `${NYC_OPEN_DATA.CALLS_FOR_SERVICE}?${query}`;
      
      const response = await fetch(url, {
        headers: this.appToken ? { 'X-App-Token': this.appToken } : {},
      });
      
      if (!response.ok) {
        console.warn('911 data fetch failed:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      // Filter by exact distance and map to our format
      return data
        .filter(incident => {
          if (!incident.latitude || !incident.longitude) return false;
          const dist = this.calculateDistance(lat, lng, parseFloat(incident.latitude), parseFloat(incident.longitude));
          return dist <= radiusMeters;
        })
        .map(incident => ({
          id: incident.cad_evnt_id || `911_${Date.now()}_${Math.random()}`,
          type: incident.typ_desc || incident.incident_type || 'UNKNOWN',
          category: this.categorizeIncident(incident.typ_desc),
          lat: parseFloat(incident.latitude),
          lng: parseFloat(incident.longitude),
          timestamp: incident.create_date,
          source: '911',
          severity: this.getSeverity(incident.typ_desc),
        }));
    } catch (error) {
      console.warn('Error fetching 911 data:', error.message);
      return [];
    }
  }

  /**
   * Fetch recent crime complaints near a location
   */
  async getRecentCrimes(lat, lng, radiusMeters = 500, daysBack = 7) {
    try {
      const daysAgo = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const dateStr = daysAgo.toISOString().split('T')[0];
      
      const latDelta = radiusMeters / 111000;
      const lngDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
      
      const query = `$where=latitude between ${lat - latDelta} and ${lat + latDelta} AND longitude between ${lng - lngDelta} and ${lng + lngDelta} AND cmplnt_fr_dt >= '${dateStr}'&$limit=50&$order=cmplnt_fr_dt DESC`;
      
      const url = `${NYC_OPEN_DATA.COMPLAINTS}?${query}`;
      
      const response = await fetch(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      
      return data
        .filter(crime => {
          if (!crime.latitude || !crime.longitude) return false;
          const dist = this.calculateDistance(lat, lng, parseFloat(crime.latitude), parseFloat(crime.longitude));
          return dist <= radiusMeters;
        })
        .map(crime => ({
          id: crime.cmplnt_num || `crime_${Date.now()}_${Math.random()}`,
          type: crime.ofns_desc || 'UNKNOWN',
          category: crime.law_cat_cd, // FELONY, MISDEMEANOR, VIOLATION
          lat: parseFloat(crime.latitude),
          lng: parseFloat(crime.longitude),
          timestamp: crime.cmplnt_fr_dt,
          source: 'NYPD',
          severity: this.getSeverityFromCategory(crime.law_cat_cd),
          location: crime.prem_typ_desc, // STREET, RESIDENCE, etc.
        }));
    } catch (error) {
      console.warn('Error fetching crime data:', error.message);
      return [];
    }
  }

  /**
   * Get aggregated safety incidents for a route
   * @param {Array} routeCoords - Array of {latitude, longitude} coordinates
   * @param {number} corridorWidth - Width of safety corridor in meters
   */
  async getRouteIncidents(routeCoords, corridorWidth = 100) {
    if (!routeCoords || routeCoords.length < 2) return [];
    
    // Sample points along the route (every ~200m)
    const samplePoints = [];
    let totalDist = 0;
    
    for (let i = 1; i < routeCoords.length; i++) {
      const dist = this.calculateDistance(
        routeCoords[i-1].latitude, routeCoords[i-1].longitude,
        routeCoords[i].latitude, routeCoords[i].longitude
      );
      totalDist += dist;
      
      if (totalDist >= 200 || i === routeCoords.length - 1) {
        samplePoints.push(routeCoords[i]);
        totalDist = 0;
      }
    }
    
    // Add start and end points
    samplePoints.unshift(routeCoords[0]);
    
    // Fetch incidents for all sample points in parallel
    const incidentPromises = samplePoints.map(point =>
      Promise.all([
        this.getRecent911Calls(point.latitude, point.longitude, corridorWidth, 6),
        this.getRecentCrimes(point.latitude, point.longitude, corridorWidth, 3),
      ])
    );
    
    const results = await Promise.all(incidentPromises);
    
    // Flatten and deduplicate
    const allIncidents = [];
    const seenIds = new Set();
    
    results.forEach(([calls, crimes]) => {
      [...calls, ...crimes].forEach(incident => {
        if (!seenIds.has(incident.id)) {
          seenIds.add(incident.id);
          allIncidents.push(incident);
        }
      });
    });
    
    return allIncidents;
  }

  /**
   * Calculate a safety score for a location (0-100, higher is safer)
   */
  async calculateLocationSafetyScore(lat, lng, radiusMeters = 200) {
    const [calls, crimes] = await Promise.all([
      this.getRecent911Calls(lat, lng, radiusMeters, 12),
      this.getRecentCrimes(lat, lng, radiusMeters, 7),
    ]);
    
    let score = 100; // Start with perfect score
    
    // Deduct points based on incidents
    [...calls, ...crimes].forEach(incident => {
      const weight = INCIDENT_WEIGHTS[incident.type] || -5;
      score += weight;
      
      // Recent incidents have more impact
      const hoursAgo = (Date.now() - new Date(incident.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 1) score -= 10; // Very recent
      else if (hoursAgo < 3) score -= 5;
    });
    
    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate safety score for an entire route
   */
  async calculateRouteSafetyScore(routeCoords) {
    const incidents = await this.getRouteIncidents(routeCoords, 100);
    
    let score = 100;
    
    incidents.forEach(incident => {
      const weight = INCIDENT_WEIGHTS[incident.type] || -5;
      score += weight * 0.5; // Routes spread the impact
    });
    
    return {
      score: Math.max(0, Math.min(100, score)),
      incidentCount: incidents.length,
      incidents: incidents.slice(0, 10), // Return top 10 for display
      rating: this.scoreToRating(score),
    };
  }

  /**
   * Convert score to human-readable rating
   */
  scoreToRating(score) {
    if (score >= 80) return { label: 'Very Safe', color: '#10b981', emoji: '🟢' };
    if (score >= 60) return { label: 'Safe', color: '#00f5d4', emoji: '🔵' };
    if (score >= 40) return { label: 'Moderate', color: '#f59e0b', emoji: '🟡' };
    if (score >= 20) return { label: 'Caution', color: '#f97316', emoji: '🟠' };
    return { label: 'Avoid', color: '#ef4444', emoji: '🔴' };
  }

  /**
   * Categorize incident type
   */
  categorizeIncident(type) {
    if (!type) return 'unknown';
    const upper = type.toUpperCase();
    
    if (upper.includes('ASSAULT') || upper.includes('ROBBERY') || upper.includes('SHOOTING')) {
      return 'violent';
    }
    if (upper.includes('LARCENY') || upper.includes('BURGLARY') || upper.includes('THEFT')) {
      return 'property';
    }
    if (upper.includes('DRUG') || upper.includes('NARCOTIC')) {
      return 'drug';
    }
    if (upper.includes('NOISE') || upper.includes('DISORDERLY')) {
      return 'nuisance';
    }
    return 'other';
  }

  /**
   * Get severity level (1-5) from incident type
   */
  getSeverity(type) {
    if (!type) return 2;
    const upper = type.toUpperCase();
    
    if (upper.includes('MURDER') || upper.includes('HOMICIDE') || upper.includes('SHOOTING')) return 5;
    if (upper.includes('RAPE') || upper.includes('ROBBERY') || upper.includes('ASSAULT')) return 4;
    if (upper.includes('BURGLARY') || upper.includes('GRAND LARCENY')) return 3;
    if (upper.includes('HARASSMENT') || upper.includes('PETIT LARCENY')) return 2;
    return 1;
  }

  /**
   * Get severity from crime category
   */
  getSeverityFromCategory(category) {
    switch (category) {
      case 'FELONY': return 4;
      case 'MISDEMEANOR': return 2;
      case 'VIOLATION': return 1;
      default: return 2;
    }
  }
}

export const crimeDataService = new CrimeDataService();
export default crimeDataService;

// Export constants for use elsewhere
export { INCIDENT_WEIGHTS, NYC_OPEN_DATA };
