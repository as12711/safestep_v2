/**
 * Mapbox Service
 */

import { ENV, isDevelopment } from '../config/env';

class MapboxService {
  constructor() {
    this.token = ENV.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = 'https://api.mapbox.com';
    this.isConfigured = !!this.token && this.token.startsWith('pk.');
    
    // NYC area bounding box for search bias
    this.searchBbox = [-74.1, 40.6, -73.7, 40.9]; // [minLng, minLat, maxLng, maxLat]
    this.searchCenter = [-73.9965, 40.7295]; // NYU area
  }

  /**
   * Search for places/addresses using Mapbox Geocoding API
   * @param {string} query - Search text
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Array of search results
   */
  async searchPlaces(query, options = {}) {
    if (!this.isConfigured || !query || query.length < 2) {
      return [];
    }

    try {
      const {
        limit = 8,
        types = 'poi,address,place,neighborhood',
        proximity = this.searchCenter,
      } = options;

      const params = new URLSearchParams({
        access_token: this.token,
        limit: limit.toString(),
        types,
        proximity: `${proximity[0]},${proximity[1]}`,
        bbox: this.searchBbox.join(','),
        language: 'en',
      });

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      return data.features.map((feature, index) => ({
        id: feature.id || `search-${index}`,
        name: feature.text || feature.place_name,
        fullAddress: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
        category: this._getPlaceCategory(feature),
        distance: options.userLocation 
          ? this.calculateDistance(options.userLocation, { lat: feature.center[1], lng: feature.center[0] })
          : null,
      }));
    } catch (error) {
      if (isDevelopment()) console.error('Geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object|null>} - Address info or null
   */
  async reverseGeocode(lat, lng) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.token}&types=address,poi&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return null;
      }

      const feature = data.features[0];
      return {
        name: feature.text || 'Unknown Location',
        fullAddress: feature.place_name,
        lat,
        lng,
      };
    } catch (error) {
      if (isDevelopment()) console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  _getPlaceCategory(feature) {
    const types = feature.properties?.category || feature.place_type?.[0] || '';
    
    if (types.includes('food') || types.includes('restaurant') || types.includes('cafe')) return '🍽️';
    if (types.includes('hotel') || types.includes('lodging')) return '🏨';
    if (types.includes('store') || types.includes('shop') || types.includes('mall')) return '🛒';
    if (types.includes('school') || types.includes('college') || types.includes('university')) return '🎓';
    if (types.includes('hospital') || types.includes('medical')) return '🏥';
    if (types.includes('transit') || types.includes('station')) return '🚇';
    if (types.includes('park') || types.includes('garden')) return '🌳';
    if (types.includes('bar') || types.includes('nightlife')) return '🍸';
    if (types.includes('gym') || types.includes('fitness')) return '💪';
    if (types.includes('library')) return '📚';
    if (feature.place_type?.includes('address')) return '📍';
    if (feature.place_type?.includes('poi')) return '📌';
    return '📍';
  }

  async getWalkingRoute(start, end) {
    if (!this.isConfigured) {
      if (isDevelopment()) console.warn('⚠️ Mapbox not configured - using fallback');
      return this._fallbackRoute(start, end);
    }

    try {
      const url = `${this.baseUrl}/directions/v5/mapbox/walking/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${this.token}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.[0]) {
        return this._fallbackRoute(start, end);
      }

      const route = data.routes[0];
      return {
        success: true,
        coords: route.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] })),
        duration: Math.round(route.duration / 60),
        distance: Math.round(route.distance),
        isFallback: false,
      };
    } catch (error) {
      if (isDevelopment()) console.error('Mapbox error:', error);
      return this._fallbackRoute(start, end);
    }
  }

  calculateDistance(p1, p2) {
    const R = 6371e3;
    const φ1 = (p1.lat * Math.PI) / 180;
    const φ2 = (p2.lat * Math.PI) / 180;
    const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
    const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _fallbackRoute(start, end) {
    const coords = [];
    for (let i = 0; i <= 25; i++) {
      const t = i / 25;
      coords.push({
        latitude: start.lat + (end.lat - start.lat) * t,
        longitude: start.lng + (end.lng - start.lng) * t,
      });
    }
    const distance = this.calculateDistance(start, end);
    return {
      success: true,
      coords,
      duration: Math.max(1, Math.round(distance / 1.4 / 60)),
      distance: Math.round(distance),
      isFallback: true,
    };
  }

  isAvailable() {
    return this.isConfigured;
  }
}

export const mapbox = new MapboxService();
export default mapbox;