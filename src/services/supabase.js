/**
 * Supabase Service v2.0
 * =====================
 * Handles authentication, reports, analytics, and user profiles
 * 
 * Improvements:
 * - Better session management with auto-refresh
 * - Proper user_id handling in reports
 * - Token expiry tracking
 * - Offline queue for reports
 */

import { ENV, isDevelopment } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ===========================================
// SECURE STORAGE HELPERS
// ===========================================
const SecureStorage = {
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      // Fallback to AsyncStorage if SecureStore fails (web, etc.)
      await AsyncStorage.setItem(`secure_${key}`, value);
    }
  },
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return await AsyncStorage.getItem(`secure_${key}`);
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      await AsyncStorage.removeItem(`secure_${key}`);
    }
  },
};

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ss_access_token',
  REFRESH_TOKEN: 'ss_refresh_token',
  USER: 'ss_user',
  TOKEN_EXPIRY: 'ss_token_expiry',
  OFFLINE_QUEUE: 'ss_offline_queue',
};

class SupabaseService {
  constructor() {
    this.url = ENV.SUPABASE_URL;
    this.key = ENV.SUPABASE_ANON_KEY;
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.tokenExpiry = null;
    this.refreshPromise = null; // Prevent concurrent refreshes
    this.initialized = false;
    this.offlineQueue = [];
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  /**
   * Initialize service - restore session from storage
   */
  async initialize() {
    if (this.initialized) return this.user;

    try {
      const [accessToken, refreshToken, userStr, expiryStr, queueStr] = await Promise.all([
        SecureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY),
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE),
      ]);

      if (accessToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = expiryStr ? parseInt(expiryStr, 10) : null;
        
        if (userStr) {
          this.user = JSON.parse(userStr);
        }

        // Check if token needs refresh
        if (this.isTokenExpired()) {
          await this.refreshSession();
        }
      }

      if (queueStr) {
        this.offlineQueue = JSON.parse(queueStr);
        // Process any queued items
        this.processOfflineQueue();
      }

      this.initialized = true;
      return this.user;
    } catch (e) {
      console.warn('[Supabase] Failed to restore session:', e);
      this.initialized = true;
      return null;
    }
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Refresh 5 minutes before expiry
    return Date.now() > (this.tokenExpiry - 5 * 60 * 1000);
  }

  /**
   * Get current user ID (for reports, etc.)
   */
  getUserId() {
    return this.user?.id || null;
  }

  /**
   * Get user ID string for reports (falls back to 'anonymous')
   */
  getReportUserId() {
    return this.user?.id || 'anonymous';
  }

  // ===========================================
  // HTTP REQUEST HELPER
  // ===========================================

  async request(endpoint, options = {}) {
    if (!this.key) {
      console.warn('⚠️ Supabase not configured');
      return { data: null, error: 'Not configured' };
    }

    // Auto-refresh token if needed
    if (this.accessToken && this.isTokenExpired() && this.refreshToken) {
      await this.refreshSession();
    }

    try {
      const authToken = this.accessToken || this.key;

      const response = await fetch(`${this.url}${endpoint}`, {
        ...options,
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Prefer: options.prefer || '',
          ...options.headers,
        },
      });

      const text = await response.text();

      if (!response.ok) {
        // Check if it's an auth error
        if (response.status === 401 && this.refreshToken) {
          // Try to refresh and retry
          const refreshed = await this.refreshSession();
          if (refreshed) {
            return this.request(endpoint, options);
          }
        }
        return { data: null, error: text };
      }

      return { data: text ? JSON.parse(text) : null, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }

  // ===========================================
  // AUTHENTICATION
  // ===========================================

  parseAuthError(error) {
    if (!error) return null;
    const msg = error.message || error.msg || String(error);

    if (msg.includes('already registered') || msg.includes('already exists')) {
      return 'This email is already registered.';
    }
    if (msg.includes('Invalid login') || msg.includes('invalid credentials')) {
      return 'Invalid email or password.';
    }
    if (msg.includes('Password should be') || msg.includes('weak password')) {
      return 'Password is too weak. Use at least 6 characters.';
    }
    if (msg.includes('Invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many attempts. Please wait a moment.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Please confirm your email before signing in.';
    }
    return msg || 'Authentication failed';
  }

  async signUp(email, password, metadata = {}) {
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/signup`, {
        method: 'POST',
        headers: { 
          apikey: this.key, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          email, 
          password,
          data: metadata, // Pass user metadata
        }),
      });
      const data = await response.json();

      if (data.error || data.msg) {
        return { error: { message: this.parseAuthError(data.error || data) } };
      }

      // Store session if signup auto-confirms
      if (data.access_token) {
        await this.saveSession(data);
      }

      return data;
    } catch (error) {
      return { error: { message: 'Connection failed. Check your network.' } };
    }
  }

  async signIn(email, password) {
    if (!email || !password) {
      return { error: { message: 'Email and password are required' } };
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 
          apikey: this.key, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.error || data.error_description) {
        return { error: { message: this.parseAuthError(data.error_description || data.error) } };
      }

      // Save session
      if (data.access_token) {
        await this.saveSession(data);
      }

      return data;
    } catch (error) {
      return { error: { message: 'Connection failed. Check your network.' } };
    }
  }

  async refreshSession() {
    // Prevent concurrent refreshes
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 
            apikey: this.key, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
        const data = await response.json();

        if (data.access_token) {
          await this.saveSession(data);
          return data;
        }

        // Refresh failed - clear session
        await this.clearSession();
        return null;
      } catch (error) {
        console.warn('[Supabase] Session refresh failed:', error);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async saveSession(data) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token || this.refreshToken;
    this.user = data.user || this.user;
    
    // Calculate token expiry (default 1 hour)
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);

    await Promise.all([
      SecureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.accessToken),
      this.refreshToken && SecureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken),
      this.user && AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user)),
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(this.tokenExpiry)),
    ]);

    if (isDevelopment()) {
      console.log('[Supabase] Session saved, expires:', new Date(this.tokenExpiry).toISOString());
    }
  }

  async clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.tokenExpiry = null;

    await Promise.all([
      SecureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
    ]);
  }

  async signOut() {
    await this.clearSession();
    return { error: null };
  }

  /**
   * Get current session state
   */
  getSession() {
    return {
      user: this.user,
      accessToken: this.accessToken,
      isAuthenticated: !!this.accessToken && !this.isTokenExpired(),
      expiresAt: this.tokenExpiry,
    };
  }

  // ===========================================
  // REPORTS
  // ===========================================

  async getReports(hours = 6) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.request(
      `/rest/v1/reports?ts=gt.${cutoff}&select=id,type,lat,lng,ts,user_id,verified,description&order=ts.desc&limit=100`
    );
  }

  async createReport(report) {
    const reportData = {
      id: report.id || `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      ts: report.ts || Date.now(),
      user_id: this.getReportUserId(), // Always use current user ID
      verified: report.verified || false,
      photo_uri: report.photo_uri || null,
      description: report.description || null,
    };

    if (isDevelopment()) {
      console.log('📍 Creating report:', reportData.type, 'user:', reportData.user_id);
    }

    const result = await this.request('/rest/v1/reports', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify(reportData),
    });

    // If offline, queue the report
    if (result.error && result.error.includes('network')) {
      await this.queueOfflineReport(reportData);
      return { data: reportData, error: null, queued: true };
    }

    return result;
  }

  // ===========================================
  // PENDING REPORTS (Verification Queue)
  // ===========================================

  static AMBIENT_TYPES = ['lit', 'crowd', 'quiet', 'dark'];
  static HIGH_PRIORITY_TYPES = ['police', 'security', 'closed', 'hazard'];
  static PROXIMITY_THRESHOLD = 15;

  async createPendingReport(report) {
    const isAmbient = SupabaseService.AMBIENT_TYPES.includes(report.type);
    const isHighPriority = SupabaseService.HIGH_PRIORITY_TYPES.includes(report.type);

    // Check for nearby duplicate reports first
    const { data: duplicates } = await this.checkDuplicateReport(report.type, report.lat, report.lng);

    if (duplicates && duplicates.length > 0) {
      const existingId = duplicates[0].existing_id;
      if (isDevelopment()) console.log('📍 Found nearby duplicate, verifying existing:', existingId);
      return this.submitVerification(existingId, 'confirm', report.lat, report.lng);
    }

    const pendingReport = {
      id: report.id || `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      ts: report.ts || Date.now(),
      user_id: this.getReportUserId(),
      photo_uri: report.photo_uri || null,
      description: report.description || null,
      is_ambient: isAmbient,
      priority: isHighPriority ? 10 : (isAmbient ? 0 : 5),
      verification_threshold: isHighPriority ? 2 : 3,
    };

    const result = await this.request('/rest/v1/pending_reports', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify(pendingReport),
    });

    // If ambient, also add to main reports immediately (for routing algorithm)
    if (isAmbient && !result.error) {
      await this.createReport({ ...report, verified: false });
    }

    return result;
  }

  async checkDuplicateReport(type, lat, lng) {
    return this.request('/rest/v1/rpc/check_duplicate_report', {
      method: 'POST',
      body: JSON.stringify({
        report_type: type,
        report_lat: lat,
        report_lng: lng,
        proximity_threshold: SupabaseService.PROXIMITY_THRESHOLD,
      }),
    });
  }

  async getPendingReports(status = 'pending') {
    return this.request(
      `/rest/v1/pending_reports?status=eq.${status}&select=*&order=priority.desc,verification_count.desc,created_at.asc`
    );
  }

  async getNearbyPendingReports(lat, lng, radiusMeters = 50) {
    return this.request('/rest/v1/rpc/find_nearby_pending_reports', {
      method: 'POST',
      body: JSON.stringify({
        user_lat: lat,
        user_lng: lng,
        radius_meters: radiusMeters,
      }),
    });
  }

  async submitVerification(reportId, verificationType, userLat = null, userLng = null) {
    return this.request('/rest/v1/rpc/submit_verification', {
      method: 'POST',
      body: JSON.stringify({
        p_report_id: reportId,
        p_verification_type: verificationType,
        p_user_lat: userLat,
        p_user_lng: userLng,
      }),
    });
  }

  // ===========================================
  // ADMIN FUNCTIONS
  // ===========================================

  async adminReviewReport(reportId, action, reason = null) {
    return this.request('/rest/v1/rpc/admin_review_report', {
      method: 'POST',
      body: JSON.stringify({
        p_report_id: reportId,
        p_action: action,
        p_reason: reason,
      }),
    });
  }

  async isAdmin() {
    if (!this.user?.id) return false;
    const { data } = await this.request(
      `/rest/v1/admin_users?user_id=eq.${this.user.id}&select=role`
    );
    return data && data.length > 0;
  }

  // ===========================================
  // USER PROFILES
  // ===========================================

  async getProfile(userId) {
    const id = userId || this.user?.id;
    if (!id) return { data: null, error: 'No user ID' };
    return this.request(`/rest/v1/user_profiles?id=eq.${id}&select=*`);
  }

  async updateProfile(userId, profileData) {
    const id = userId || this.user?.id;
    if (!id) return { data: null, error: 'No user ID' };

    return this.request(`/rest/v1/user_profiles?id=eq.${id}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({
        ...profileData,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async createProfile(userId, profileData) {
    const id = userId || this.user?.id;
    if (!id) return { data: null, error: 'No user ID' };

    return this.request('/rest/v1/user_profiles', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        id,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async upsertProfile(userId, profileData) {
    const id = userId || this.user?.id;
    if (!id) return { data: null, error: 'No user ID' };

    const { data: existing } = await this.getProfile(id);

    if (existing && existing.length > 0) {
      return this.updateProfile(id, profileData);
    } else {
      return this.createProfile(id, profileData);
    }
  }

  // ===========================================
  // OFFLINE QUEUE
  // ===========================================

  async queueOfflineReport(report) {
    this.offlineQueue.push({
      ...report,
      queuedAt: Date.now(),
    });
    await AsyncStorage.setItem(
      STORAGE_KEYS.OFFLINE_QUEUE,
      JSON.stringify(this.offlineQueue)
    );
    if (isDevelopment()) {
      console.log('[Supabase] Report queued for offline sync:', report.id);
    }
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const report of queue) {
      const result = await this.createReport(report);
      if (result.error) {
        // Re-queue if still failing
        this.offlineQueue.push(report);
      }
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.OFFLINE_QUEUE,
      JSON.stringify(this.offlineQueue)
    );

    if (isDevelopment()) {
      console.log('[Supabase] Offline queue processed, remaining:', this.offlineQueue.length);
    }
  }

  // ===========================================
  // ANALYTICS
  // ===========================================

  async logEvent(eventType, eventData = {}) {
    if (!ENV.ENABLE_ANALYTICS) return { data: null, error: null };

    return this.request('/rest/v1/analytics', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        user_id: this.getReportUserId(),
        version: ENV.APP_VERSION,
      }),
    });
  }

  // ===========================================
  // WALKS/TRIPS
  // ===========================================

  async startWalk(walkData) {
    return this.request('/rest/v1/walks', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        user_id: this.user?.id || null,
        origin_lat: walkData.origin.lat,
        origin_lng: walkData.origin.lng,
        origin_name: walkData.origin.name,
        dest_lat: walkData.destination.lat,
        dest_lng: walkData.destination.lng,
        dest_name: walkData.destination.name,
        distance_meters: walkData.distance,
        route_coords: walkData.routeCoords,
        status: 'in_progress',
      }),
    });
  }

  async completeWalk(walkId, metrics = {}) {
    return this.request(`/rest/v1/walks?id=eq.${walkId}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: metrics.duration,
        reports_encountered: metrics.reportsEncountered || 0,
        safety_score: metrics.safetyScore,
      }),
    });
  }

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  async healthCheck() {
    const start = Date.now();
    const { error } = await this.request('/rest/v1/?limit=0');
    return { 
      status: error ? 'unhealthy' : 'healthy', 
      latency: Date.now() - start,
      authenticated: !!this.accessToken,
    };
  }
}

export const supabase = new SupabaseService();
export default supabase;
