/**
 * SafeStep Routing Service v1.0
 * =============================
 * Route calculation with safety scoring using:
 * - Mapbox Directions API for base routes
 * - Real-time safety reports for scoring
 * - Alternative route generation
 * - Dynamic rerouting based on conditions
 */

import { ENV } from '../config/env';
import { supabase } from './supabase';

// Mapbox Directions API base URL
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/walking';

// Safety scoring weights
const SAFETY_WEIGHTS = {
  // Positive influences (increase safety score)
  police: 15,
  security: 12,
  lit: 10,
  crowd: 8,
  'open-business': 5,
  
  // Negative influences (decrease safety score)
  hazard: -20,
  closed: -50, // Should avoid completely
  construction: -15,
  dark: -12,
  quiet: -5, // Slightly negative at night
};

// Report influence radius in meters
const REPORT_INFLUENCE_RADIUS = {
  police: 100,
  security: 75,
  lit: 50,
  crowd: 60,
  'open-business': 30,
  hazard: 80,
  closed: 100,
  construction: 60,
  dark: 70,
  quiet: 50,
};

// Time-based modifiers (night = 8PM-6AM)
const TIME_MODIFIERS = {
  night: {
    lit: 1.5,      // Lighting more important at night
    dark: 1.5,     // Dark areas more dangerous
    crowd: 1.3,    // Crowds more reassuring
    quiet: 1.5,    // Quiet areas more concerning
    police: 1.2,   // Police presence more valued
  },
  day: {
    lit: 0.5,      // Lighting less important
    dark: 0.5,     // Dark areas less concerning
    crowd: 1.0,    // Crowds neutral
    quiet: 0.3,    // Quiet areas less concerning
    police: 1.0,   // Police presence neutral
  },
};

class RoutingService {
  constructor() {
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN;
    this.cachedReports = [];
    this.lastReportFetch = 0;
    this.reportCacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get route with safety scoring
   */
  async getRoute(origin, destination, options = {}) {
    const {
      alternatives = true,
      safetyFirst = true,
      avoidTypes = [],
      accessibilityNeeds = null,
    } = options;

    try {
      // Fetch base routes from Mapbox
      const routes = await this.fetchMapboxRoutes(origin, destination, alternatives);

      if (!routes || routes.length === 0) {
        return { error: 'No routes found' };
      }

      // Fetch current safety reports
      const reports = await this.fetchSafetyReports();

      // Score each route
      const scoredRoutes = routes.map((route, index) => {
        const safetyAnalysis = this.analyzeRouteSafety(route, reports, options);
        
        return {
          id: `route-${index}`,
          ...route,
          safety: safetyAnalysis,
          recommended: index === 0 && safetyFirst,
        };
      });

      // Sort by safety score if safety first
      if (safetyFirst) {
        scoredRoutes.sort((a, b) => b.safety.score - a.safety.score);
        scoredRoutes[0].recommended = true;
      }

      // Add labels
      scoredRoutes.forEach((route, idx) => {
        if (idx === 0) {
          route.label = safetyFirst ? 'Safest Route' : 'Fastest Route';
        } else if (route.safety.score > scoredRoutes[0].safety.score - 10) {
          route.label = 'Safe Alternative';
        } else {
          route.label = route.duration < scoredRoutes[0].duration * 0.8 
            ? 'Faster but Less Safe' 
            : 'Alternative';
        }
      });

      return {
        routes: scoredRoutes,
        reports: this.getReportsNearRoutes(scoredRoutes, reports),
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('[RoutingService] Error:', error);
      return { error: error.message || 'Failed to calculate route' };
    }
  }

  /**
   * Fetch routes from Mapbox Directions API
   */
  async fetchMapboxRoutes(origin, destination, alternatives = true) {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    const params = new URLSearchParams({
      access_token: this.mapboxToken,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      alternatives: alternatives.toString(),
      annotations: 'distance,duration',
      voice_instructions: 'true',
      banner_instructions: 'true',
      roundabout_exits: 'true',
    });

    const url = `${MAPBOX_DIRECTIONS_URL}/${coords}?${params}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes) {
      throw new Error(data.message || 'No routes found');
    }

    return data.routes.map(route => ({
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.legs?.[0]?.steps || [],
      coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    }));
  }

  /**
   * Fetch safety reports from Supabase
   */
  async fetchSafetyReports() {
    // Use cache if recent
    const now = Date.now();
    if (now - this.lastReportFetch < this.reportCacheDuration && this.cachedReports.length > 0) {
      return this.cachedReports;
    }

    try {
      const { data, error } = await supabase.getReports(6); // Last 6 hours
      
      if (error || !data) {
        console.warn('[RoutingService] Failed to fetch reports, using cache');
        return this.cachedReports;
      }

      this.cachedReports = data;
      this.lastReportFetch = now;
      return data;

    } catch (e) {
      console.warn('[RoutingService] Report fetch error:', e);
      return this.cachedReports;
    }
  }

  /**
   * Analyze route safety
   */
  analyzeRouteSafety(route, reports, options = {}) {
    const coordinates = route.coordinates;
    const isNight = this.isNightTime();
    const timeModifier = isNight ? TIME_MODIFIERS.night : TIME_MODIFIERS.day;

    let baseScore = 70; // Start with 70/100
    let totalInfluence = 0;
    const influences = [];
    const warnings = [];
    const positives = [];

    // Analyze each report's influence on the route
    for (const report of reports) {
      const distance = this.getMinDistanceToRoute(report, coordinates);
      const influenceRadius = REPORT_INFLUENCE_RADIUS[report.type] || 50;

      if (distance <= influenceRadius) {
        // Calculate influence (closer = stronger)
        const proximityFactor = 1 - (distance / influenceRadius);
        const baseWeight = SAFETY_WEIGHTS[report.type] || 0;
        const modifier = timeModifier[report.type] || 1;
        const influence = baseWeight * proximityFactor * modifier;

        totalInfluence += influence;

        // Track for UI
        if (influence < -5) {
          warnings.push({
            type: report.type,
            lat: report.lat,
            lng: report.lng,
            distance: Math.round(distance),
            severity: Math.abs(influence),
          });
        } else if (influence > 5) {
          positives.push({
            type: report.type,
            lat: report.lat,
            lng: report.lng,
            distance: Math.round(distance),
            benefit: influence,
          });
        }

        influences.push({
          type: report.type,
          influence,
          distance: Math.round(distance),
        });
      }
    }

    // Calculate final score
    const finalScore = Math.max(0, Math.min(100, baseScore + totalInfluence));

    // Determine safety level
    let safetyLevel = 'moderate';
    let safetyColor = '#FFB347';
    
    if (finalScore >= 80) {
      safetyLevel = 'high';
      safetyColor = '#00f5d4';
    } else if (finalScore >= 60) {
      safetyLevel = 'moderate';
      safetyColor = '#FFB347';
    } else if (finalScore >= 40) {
      safetyLevel = 'low';
      safetyColor = '#ff9f43';
    } else {
      safetyLevel = 'unsafe';
      safetyColor = '#ff6b6b';
    }

    // Check for blocking conditions
    const hasBlocker = warnings.some(w => w.type === 'closed');
    if (hasBlocker) {
      safetyLevel = 'blocked';
      safetyColor = '#ff6b6b';
    }

    return {
      score: Math.round(finalScore),
      level: safetyLevel,
      color: safetyColor,
      isNight,
      warnings: warnings.sort((a, b) => b.severity - a.severity),
      positives: positives.sort((a, b) => b.benefit - a.benefit),
      influences,
      summary: this.generateSafetySummary(finalScore, warnings, positives, isNight),
    };
  }

  /**
   * Get minimum distance from report to route
   */
  getMinDistanceToRoute(report, routeCoordinates) {
    let minDistance = Infinity;

    for (const coord of routeCoordinates) {
      const distance = this.calculateDistance(
        report.lat, report.lng,
        coord.lat, coord.lng
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Get reports near all routes
   */
  getReportsNearRoutes(routes, reports, maxDistance = 150) {
    const nearbyReports = new Map();

    for (const route of routes) {
      for (const report of reports) {
        const distance = this.getMinDistanceToRoute(report, route.coordinates);
        if (distance <= maxDistance) {
          if (!nearbyReports.has(report.id)) {
            nearbyReports.set(report.id, {
              ...report,
              distanceToRoute: Math.round(distance),
            });
          }
        }
      }
    }

    return Array.from(nearbyReports.values());
  }

  /**
   * Generate safety summary text
   */
  generateSafetySummary(score, warnings, positives, isNight) {
    const parts = [];

    if (score >= 80) {
      parts.push('This route is well-lit and has good visibility.');
    } else if (score >= 60) {
      parts.push('This route is generally safe.');
    } else if (score >= 40) {
      parts.push('Exercise caution on this route.');
    } else {
      parts.push('This route may have safety concerns.');
    }

    if (positives.length > 0) {
      const topPositive = positives[0];
      if (topPositive.type === 'police') {
        parts.push('Police presence nearby.');
      } else if (topPositive.type === 'lit') {
        parts.push('Area is well-lit.');
      } else if (topPositive.type === 'crowd') {
        parts.push('People around.');
      }
    }

    if (warnings.length > 0) {
      const topWarning = warnings[0];
      if (topWarning.type === 'closed') {
        parts.push('⚠️ Path may be closed ahead.');
      } else if (topWarning.type === 'hazard') {
        parts.push('⚠️ Hazard reported nearby.');
      } else if (topWarning.type === 'dark') {
        parts.push('Dark area on route.');
      }
    }

    if (isNight && score < 70) {
      parts.push('Consider alternatives at night.');
    }

    return parts.join(' ');
  }

  /**
   * Check if current time is night
   */
  isNightTime() {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 6;
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if route needs rerouting based on new reports
   */
  shouldReroute(currentRoute, newReports) {
    for (const report of newReports) {
      // Check if any new blocking reports affect current route
      if (report.type === 'closed' || report.type === 'hazard') {
        const distance = this.getMinDistanceToRoute(report, currentRoute.coordinates);
        if (distance < 50) {
          return {
            shouldReroute: true,
            reason: report.type === 'closed' ? 'Path closed ahead' : 'Hazard reported on route',
            report,
          };
        }
      }
    }

    return { shouldReroute: false };
  }

  /**
   * Get turn-by-turn instructions
   */
  getInstructions(route) {
    if (!route.steps) return [];

    return route.steps.map(step => ({
      instruction: step.maneuver?.instruction || 'Continue',
      distance: step.distance,
      duration: step.duration,
      type: step.maneuver?.type || 'continue',
      modifier: step.maneuver?.modifier,
      location: {
        lat: step.maneuver?.location?.[1],
        lng: step.maneuver?.location?.[0],
      },
    }));
  }

  /**
   * Format distance for display
   */
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
}

export const routingService = new RoutingService();
export default routingService;
