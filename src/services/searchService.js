/**
 * SafeStep Search Service v2.1
 * ============================
 * Comprehensive location search with:
 * - Mapbox Geocoding autocomplete
 * - Reverse geocoding for map taps
 * - University campus search
 * - Search history management
 * - Saved locations (Home, Work, Favorites)
 * - Smart suggestions based on time of day
 *
 * v2.1 Enhancements:
 * - Debounced autocomplete for better performance
 * - In-memory caching to reduce API calls
 * - Improved fuzzy matching for campus locations
 * - Better error handling and fallbacks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

// ===========================================
// DEBOUNCE UTILITY
// ===========================================
const createDebounce = (delay = 300) => {
  let timeoutId = null;
  return fn => {
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      return new Promise(resolve => {
        timeoutId = setTimeout(async () => {
          const result = await fn(...args);
          resolve(result);
        }, delay);
      });
    };
  };
};

// ===========================================
// SEARCH CACHE
// ===========================================
class SearchCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

// Storage keys
const STORAGE_KEYS = {
  SEARCH_HISTORY: 'ss_search_history',
  SAVED_LOCATIONS: 'ss_saved_locations',
  FREQUENT_DESTINATIONS: 'ss_frequent_destinations',
  RECENT_MAP_LOCATIONS: 'ss_recent_map_locations',
};

// Supported universities with their data
export const UNIVERSITIES = [
  {
    id: 'nyu_wsq',
    name: 'NYU Washington Square',
    shortName: 'NYU WSQ',
    address: 'Washington Square, New York, NY',
    lat: 40.7295,
    lng: -73.9965,
    bounds: [-74.005, 40.7235, -73.988, 40.7355],
    icon: '🟣',
    domain: 'nyu.edu',
  },
  {
    id: 'nyu_tandon',
    name: 'NYU Tandon School of Engineering',
    shortName: 'NYU Tandon',
    address: 'MetroTech Center, Brooklyn, NY',
    lat: 40.6942,
    lng: -73.9866,
    bounds: [-73.992, 40.69, -73.982, 40.698],
    icon: '🟣',
    domain: 'nyu.edu',
  },
  {
    id: 'new_school',
    name: 'The New School',
    shortName: 'New School',
    address: 'Greenwich Village, New York, NY',
    lat: 40.7352,
    lng: -73.9972,
    bounds: [-74.002, 40.732, -73.992, 40.738],
    icon: '🔴',
    domain: 'newschool.edu',
  },
  {
    id: 'liu',
    name: 'Long Island University Brooklyn',
    shortName: 'LIU Brooklyn',
    address: 'DeKalb Avenue, Brooklyn, NY',
    lat: 40.6896,
    lng: -73.9813,
    bounds: [-73.985, 40.686, -73.977, 40.693],
    icon: '🔵',
    domain: 'liu.edu',
  },
  {
    id: 'columbia',
    name: 'Columbia University',
    shortName: 'Columbia',
    address: 'Morningside Heights, New York, NY',
    lat: 40.8075,
    lng: -73.9626,
    bounds: [-73.97, 40.802, -73.955, 40.813],
    icon: '🔵',
    domain: 'columbia.edu',
  },
  {
    id: 'fordham_lc',
    name: 'Fordham University Lincoln Center',
    shortName: 'Fordham LC',
    address: 'Lincoln Center, New York, NY',
    lat: 40.7718,
    lng: -73.9877,
    bounds: [-73.992, 40.768, -73.983, 40.775],
    icon: '🟤',
    domain: 'fordham.edu',
  },
];

// Search result categories
export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🔍', mapboxTypes: null },
  { id: 'campus', label: 'Campus', icon: '🏛️', mapboxTypes: null, isLocal: true },
  { id: 'food', label: 'Food', icon: '🍕', mapboxTypes: 'poi', keywords: 'restaurant food dining' },
  { id: 'coffee', label: 'Coffee', icon: '☕', mapboxTypes: 'poi', keywords: 'coffee cafe' },
  {
    id: 'transit',
    label: 'Transit',
    icon: '🚇',
    mapboxTypes: 'poi',
    keywords: 'subway metro bus station',
  },
  { id: 'safety', label: 'Safety', icon: '🛡️', mapboxTypes: null, isLocal: true },
  { id: 'library', label: 'Library', icon: '📚', mapboxTypes: 'poi', keywords: 'library study' },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: '💊',
    mapboxTypes: 'poi',
    keywords: 'pharmacy cvs walgreens',
  },
];

// Saved location types
export const SAVED_LOCATION_TYPES = {
  HOME: 'home',
  WORK: 'work',
  SCHOOL: 'school',
  GYM: 'gym',
  FAVORITE: 'favorite',
};

const SAVED_LOCATION_ICONS = {
  home: '🏠',
  work: '💼',
  school: '🎓',
  gym: '💪',
  favorite: '⭐',
};

class SearchService {
  constructor() {
    this.mapboxToken = ENV.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = 'https://api.mapbox.com/search/searchbox/v1';
    this.geocodeUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

    // NYC/Campus area for search bias
    this.searchCenter = [-73.9965, 40.7295]; // NYU area
    this.searchBbox = [-74.05, 40.68, -73.9, 40.82]; // Greater NYC area

    // In-memory cache
    this.searchHistory = [];
    this.savedLocations = {};
    this.frequentDestinations = [];
    this.initialized = false;

    // v2.1: Performance optimizations
    this.searchCache = new SearchCache(100, 5 * 60 * 1000); // 5 min TTL
    this.debounce = createDebounce(250); // 250ms debounce
    this.debouncedAutocomplete = this.debounce(this._autocompleteInternal.bind(this));

    // Pending request tracking for cancellation
    this.pendingRequests = new Map();
  }

  /**
   * Initialize service - load cached data
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const [history, saved, frequent] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.FREQUENT_DESTINATIONS),
      ]);

      this.searchHistory = history ? JSON.parse(history) : [];
      this.savedLocations = saved ? JSON.parse(saved) : {};
      this.frequentDestinations = frequent ? JSON.parse(frequent) : [];
      this.initialized = true;
    } catch (e) {
      console.warn('[SearchService] Failed to load cached data:', e);
    }
  }

  /**
   * Autocomplete search using Mapbox Geocoding API
   * v2.1: Now with caching for better performance
   */
  async autocomplete(query, options = {}) {
    return this._autocompleteInternal(query, options);
  }

  /**
   * Debounced autocomplete - use this for real-time search input
   * Automatically cancels previous requests and debounces by 250ms
   */
  async autocompleteDebounced(query, options = {}) {
    if (!query || query.length < 2) return [];
    return this.debouncedAutocomplete(query, options);
  }

  /**
   * Internal autocomplete implementation with caching
   */
  async _autocompleteInternal(query, options = {}) {
    if (!query || query.length < 2) return [];

    // Generate cache key
    const cacheKey = `ac:${query.toLowerCase()}:${JSON.stringify(options)}`;

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const {
        limit = 8,
        proximity = this.searchCenter,
        types = 'poi,address,place,neighborhood',
      } = options;

      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        limit: limit.toString(),
        types,
        proximity: `${proximity[0]},${proximity[1]}`,
        bbox: this.searchBbox.join(','),
        language: 'en',
        autocomplete: 'true',
      });

      const url = `${this.geocodeUrl}/${encodeURIComponent(query)}.json?${params}`;

      // Create AbortController for this request
      const controller = new AbortController();
      const requestId = `${cacheKey}:${Date.now()}`;

      // Cancel any previous requests with the same query (normalized) to prevent race conditions
      // Key format: "ac:query:options:timestamp", so we match by query prefix
      const normalizedQuery = query.toLowerCase();
      const queryPrefix = `ac:${normalizedQuery}:`;
      this.pendingRequests.forEach((ctrl, key) => {
        // Match keys that start with the same query prefix (same query, any options/timestamp)
        if (key.startsWith(queryPrefix)) {
          ctrl.abort();
          this.pendingRequests.delete(key);
        }
      });

      this.pendingRequests.set(requestId, controller);

      const response = await fetch(url, { signal: controller.signal });

      this.pendingRequests.delete(requestId);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      const results = data.features.map((feature, idx) => ({
        id: feature.id || `mapbox-${idx}`,
        name: feature.text || feature.place_name?.split(',')[0],
        fullName: feature.place_name,
        address: this._formatAddress(feature),
        lat: feature.center[1],
        lng: feature.center[0],
        category: this._categorizePlace(feature),
        source: 'mapbox',
        relevance: feature.relevance || 0,
      }));

      // Cache the results
      this.searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return [];
      }
      console.warn('[SearchService] Autocomplete error:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Category-based search
   */
  async searchByCategory(categoryId, userLocation = null) {
    const category = SEARCH_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return [];

    if (category.isLocal) {
      // Handle local categories (campus, safety) - these come from static data
      return [];
    }

    try {
      const proximity = userLocation ? [userLocation.lng, userLocation.lat] : this.searchCenter;

      const results = await this.autocomplete(category.keywords, {
        limit: 15,
        proximity,
        types: category.mapboxTypes || 'poi',
      });

      return results.map(r => ({
        ...r,
        categoryId,
        categoryIcon: category.icon,
      }));
    } catch (error) {
      console.warn('[SearchService] Category search error:', error);
      return [];
    }
  }

  /**
   * Get smart suggestions based on time of day and patterns
   */
  async getSmartSuggestions(userLocation = null) {
    await this.initialize();

    const suggestions = [];
    const hour = new Date().getHours();

    // Add saved locations first
    if (this.savedLocations.home) {
      suggestions.push({
        ...this.savedLocations.home,
        type: 'saved',
        icon: '🏠',
        label: 'Home',
      });
    }

    if (this.savedLocations.work) {
      suggestions.push({
        ...this.savedLocations.work,
        type: 'saved',
        icon: '💼',
        label: 'Work',
      });
    }

    // Time-based suggestions
    if (hour >= 6 && hour < 10) {
      // Morning - suggest coffee, transit
      suggestions.push({ type: 'category', id: 'coffee', label: 'Coffee nearby', icon: '☕' });
      suggestions.push({ type: 'category', id: 'transit', label: 'Transit', icon: '🚇' });
    } else if (hour >= 11 && hour < 14) {
      // Lunch
      suggestions.push({ type: 'category', id: 'food', label: 'Lunch spots', icon: '🍕' });
    } else if (hour >= 20 || hour < 2) {
      // Late night - prioritize safety
      suggestions.push({ type: 'category', id: 'safety', label: 'Safe Havens', icon: '🛡️' });
    }

    // Add recent searches
    const recentUnique = this.searchHistory.slice(0, 3);
    recentUnique.forEach(recent => {
      if (!suggestions.find(s => s.name === recent.name)) {
        suggestions.push({
          ...recent,
          type: 'recent',
          icon: '🕐',
        });
      }
    });

    // Add frequent destinations
    this.frequentDestinations.slice(0, 2).forEach(freq => {
      if (!suggestions.find(s => s.name === freq.name)) {
        suggestions.push({
          ...freq,
          type: 'frequent',
          icon: '📍',
        });
      }
    });

    return suggestions.slice(0, 8);
  }

  // ===========================================
  // SEARCH HISTORY MANAGEMENT
  // ===========================================

  async addToHistory(place) {
    await this.initialize();

    const entry = {
      id: place.id || `history-${Date.now()}`,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
      timestamp: Date.now(),
    };

    // Remove duplicate if exists
    this.searchHistory = this.searchHistory.filter(h => h.name !== place.name);

    // Add to front
    this.searchHistory.unshift(entry);

    // Keep only last 20
    this.searchHistory = this.searchHistory.slice(0, 20);

    // Update frequent destinations
    this._updateFrequentDestinations(place);

    // Persist
    await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(this.searchHistory));

    return this.searchHistory;
  }

  async getSearchHistory(limit = 10) {
    await this.initialize();
    return this.searchHistory.slice(0, limit);
  }

  async clearSearchHistory() {
    this.searchHistory = [];
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  }

  // ===========================================
  // SAVED LOCATIONS MANAGEMENT
  // ===========================================

  async saveLocation(type, place) {
    await this.initialize();

    const location = {
      id: `saved-${type}-${Date.now()}`,
      type,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      icon: SAVED_LOCATION_ICONS[type] || '📍',
      savedAt: Date.now(),
    };

    this.savedLocations[type] = location;

    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(this.savedLocations));

    return location;
  }

  async getSavedLocations() {
    await this.initialize();
    return this.savedLocations;
  }

  async getSavedLocation(type) {
    await this.initialize();
    return this.savedLocations[type] || null;
  }

  async removeSavedLocation(type) {
    await this.initialize();
    delete this.savedLocations[type];
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(this.savedLocations));
  }

  async addFavorite(place) {
    await this.initialize();

    const favorites = this.savedLocations.favorites || [];

    // Check if already favorited
    if (favorites.find(f => f.name === place.name)) {
      return favorites;
    }

    const favorite = {
      id: `fav-${Date.now()}`,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      icon: '⭐',
      savedAt: Date.now(),
    };

    favorites.unshift(favorite);
    this.savedLocations.favorites = favorites.slice(0, 10); // Max 10 favorites

    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(this.savedLocations));

    return this.savedLocations.favorites;
  }

  async getFavorites() {
    await this.initialize();
    return this.savedLocations.favorites || [];
  }

  async removeFavorite(placeId) {
    await this.initialize();

    if (!this.savedLocations.favorites) return;

    this.savedLocations.favorites = this.savedLocations.favorites.filter(f => f.id !== placeId);

    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(this.savedLocations));
  }

  // ===========================================
  // PRIVATE HELPERS
  // ===========================================

  _formatAddress(feature) {
    if (!feature.context) return feature.place_name?.split(',').slice(1).join(',').trim() || '';

    const parts = [];
    const ctx = feature.context || [];

    // Extract neighborhood, locality, region
    const neighborhood = ctx.find(c => c.id?.startsWith('neighborhood'));
    const locality = ctx.find(c => c.id?.startsWith('locality') || c.id?.startsWith('place'));

    if (neighborhood) parts.push(neighborhood.text);
    if (locality) parts.push(locality.text);

    return parts.join(', ') || feature.place_name?.split(',').slice(1, 3).join(',').trim() || '';
  }

  _categorizePlace(feature) {
    const properties = feature.properties || {};
    const categories = properties.category || '';
    const placeType = feature.place_type?.[0] || '';

    // Map to our categories
    if (categories.includes('food') || categories.includes('restaurant')) return 'food';
    if (categories.includes('cafe') || categories.includes('coffee')) return 'coffee';
    if (categories.includes('transit') || categories.includes('station')) return 'transit';
    if (categories.includes('pharmacy') || categories.includes('health')) return 'pharmacy';
    if (categories.includes('library') || categories.includes('education')) return 'library';
    if (placeType === 'address') return 'address';
    if (placeType === 'poi') return 'poi';

    return 'place';
  }

  async _updateFrequentDestinations(place) {
    // Find existing or create new entry
    const existingIdx = this.frequentDestinations.findIndex(f => f.name === place.name);

    if (existingIdx >= 0) {
      // Increment count
      this.frequentDestinations[existingIdx].count += 1;
      this.frequentDestinations[existingIdx].lastUsed = Date.now();
    } else {
      // Add new
      this.frequentDestinations.push({
        ...place,
        count: 1,
        lastUsed: Date.now(),
      });
    }

    // Sort by count (descending) and keep top 10
    this.frequentDestinations.sort((a, b) => b.count - a.count);
    this.frequentDestinations = this.frequentDestinations.slice(0, 10);

    await AsyncStorage.setItem(
      STORAGE_KEYS.FREQUENT_DESTINATIONS,
      JSON.stringify(this.frequentDestinations)
    );
  }

  // ===========================================
  // REVERSE GEOCODING (Map Taps)
  // ===========================================

  /**
   * Get location name from coordinates (reverse geocoding)
   */
  async reverseGeocode(lat, lng) {
    try {
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        types: 'poi,address,neighborhood,locality',
        limit: '1',
        language: 'en',
      });

      const url = `${this.geocodeUrl}/${lng},${lat}.json?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return {
          name: 'Dropped Pin',
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          source: 'coordinates',
        };
      }

      const feature = data.features[0];
      return {
        id: feature.id,
        name: feature.text || feature.place_name?.split(',')[0],
        fullName: feature.place_name,
        address: this._formatAddress(feature),
        lat,
        lng,
        category: this._categorizePlace(feature),
        source: 'reverse_geocode',
      };
    } catch (error) {
      console.warn('[SearchService] Reverse geocode error:', error);
      return {
        name: 'Selected Location',
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        source: 'coordinates',
      };
    }
  }

  /**
   * Save a map-tapped location
   */
  async saveMapLocation(location) {
    await this.initialize();

    const recentMapLocations = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_MAP_LOCATIONS);
    let locations = recentMapLocations ? JSON.parse(recentMapLocations) : [];

    // Add new location
    locations.unshift({
      ...location,
      savedAt: Date.now(),
    });

    // Keep only last 10
    locations = locations.slice(0, 10);

    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_MAP_LOCATIONS, JSON.stringify(locations));

    return location;
  }

  /**
   * Get recent map-tapped locations
   */
  async getRecentMapLocations(limit = 5) {
    const recentMapLocations = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_MAP_LOCATIONS);
    const locations = recentMapLocations ? JSON.parse(recentMapLocations) : [];
    return locations.slice(0, limit);
  }

  // ===========================================
  // UNIVERSITY SEARCH
  // ===========================================

  /**
   * Search universities by name or domain
   */
  searchUniversities(query) {
    if (!query || query.length < 2) return UNIVERSITIES;

    const lowerQuery = query.toLowerCase();
    return UNIVERSITIES.filter(
      uni =>
        uni.name.toLowerCase().includes(lowerQuery) ||
        uni.shortName.toLowerCase().includes(lowerQuery) ||
        uni.domain?.toLowerCase().includes(lowerQuery) ||
        uni.id.includes(lowerQuery)
    );
  }

  /**
   * Get university by ID
   */
  getUniversity(id) {
    return UNIVERSITIES.find(uni => uni.id === id) || null;
  }

  /**
   * Get university from email domain
   */
  getUniversityByEmail(email) {
    if (!email || !email.includes('@')) return null;

    const domain = email.split('@')[1]?.toLowerCase();
    return UNIVERSITIES.find(uni => domain?.endsWith(uni.domain)) || null;
  }

  /**
   * Check if coordinates are within a university campus
   */
  getUniversityAtLocation(lat, lng) {
    return (
      UNIVERSITIES.find(uni => {
        if (!uni.bounds) return false;
        const [minLng, minLat, maxLng, maxLat] = uni.bounds;
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      }) || null
    );
  }

  // ===========================================
  // CAMPUS POINTS OF INTEREST
  // ===========================================

  /**
   * Get campus-specific locations
   */
  getCampusLocations(universityId) {
    // Campus-specific POIs - can be expanded
    const campusPOIs = {
      nyu_wsq: [
        { name: 'Bobst Library', type: 'library', lat: 40.7295, lng: -73.9972, icon: '📚' },
        { name: 'Kimmel Center', type: 'student_center', lat: 40.7298, lng: -73.998, icon: '🏛️' },
        { name: 'Silver Center', type: 'academic', lat: 40.7289, lng: -73.9963, icon: '🎓' },
        {
          name: 'Washington Square Park',
          type: 'landmark',
          lat: 40.7308,
          lng: -73.9973,
          icon: '🌳',
        },
        { name: 'Stern School', type: 'academic', lat: 40.7287, lng: -73.996, icon: '💼' },
        { name: 'Public Safety', type: 'safety', lat: 40.7294, lng: -73.9978, icon: '🛡️' },
      ],
      nyu_tandon: [
        { name: 'Jacobs Building', type: 'academic', lat: 40.6945, lng: -73.986, icon: '🎓' },
        { name: 'Dibner Library', type: 'library', lat: 40.6943, lng: -73.9862, icon: '📚' },
        { name: 'Rogers Hall', type: 'academic', lat: 40.6948, lng: -73.9858, icon: '🏛️' },
      ],
      new_school: [
        {
          name: 'University Center',
          type: 'student_center',
          lat: 40.7352,
          lng: -73.9941,
          icon: '🏛️',
        },
        { name: 'Parsons Building', type: 'academic', lat: 40.7355, lng: -73.9948, icon: '🎨' },
        { name: '65 Fifth Avenue', type: 'academic', lat: 40.7356, lng: -73.9946, icon: '🎓' },
      ],
      liu: [
        { name: 'Library', type: 'library', lat: 40.6894, lng: -73.9816, icon: '📚' },
        { name: 'Wellness Center', type: 'health', lat: 40.6897, lng: -73.981, icon: '🏥' },
      ],
    };

    return campusPOIs[universityId] || [];
  }

  // ===========================================
  // COMBINED SEARCH (All Sources)
  // ===========================================

  /**
   * Comprehensive search across all sources
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) return [];

    const {
      userLocation = null,
      includeUniversities = true,
      includeCampus = true,
      universityId = null,
    } = options;

    const results = [];

    // 1. Search universities
    if (includeUniversities) {
      const uniResults = this.searchUniversities(query);
      results.push(
        ...uniResults.map(uni => ({
          ...uni,
          type: 'university',
          icon: uni.icon,
          source: 'universities',
        }))
      );
    }

    // 2. Search campus locations
    if (includeCampus && universityId) {
      const campusResults = this.getCampusLocations(universityId);
      const filtered = campusResults.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      results.push(
        ...filtered.map(loc => ({
          ...loc,
          universityId,
          type: 'campus_poi',
          source: 'campus',
        }))
      );
    }

    // 3. Search Mapbox
    try {
      const mapboxResults = await this.autocomplete(query, {
        limit: 8,
        proximity: userLocation ? [userLocation.lng, userLocation.lat] : this.searchCenter,
      });
      results.push(...mapboxResults);
    } catch (e) {
      console.warn('[SearchService] Mapbox search failed:', e);
    }

    // Sort by relevance and distance
    if (userLocation) {
      return this.sortByDistance(results, userLocation);
    }

    return results;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Sort results by distance from user
   */
  sortByDistance(results, userLocation) {
    if (!userLocation) return results;

    return results
      .map(r => ({
        ...r,
        distance: this.calculateDistance(userLocation.lat, userLocation.lng, r.lat, r.lng),
      }))
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }

  /**
   * Format distance for display
   */
  formatDistance(meters) {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
