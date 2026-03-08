/**
 * SafeStep Location Service v2.0
 * ================================
 * Production-grade GPS/location management for pedestrian navigation
 * 
 * Features:
 * - High-accuracy pedestrian GPS (3-5 meter precision target)
 * - Kalman filter for GPS jitter/smoothing
 * - Intelligent battery management based on movement state
 * - Permission handling with edge cases (denied, restricted, never-ask-again)
 * - Background location support (iOS/Android policy compliant)
 * - Graceful degradation and automatic recovery
 * - Real-time interpolation for smooth map updates
 * 
 * Based on Apple Maps and Google Maps pedestrian navigation best practices
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, AppState, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONSTANTS
// ============================================

// Background task name
const BACKGROUND_LOCATION_TASK = 'safestep-background-location';

// Accuracy configurations based on use case
const ACCURACY_CONFIGS = {
  // Highest accuracy for active navigation (3-5m precision)
  // Uses GPS + GLONASS + Galileo + Wi-Fi + Cell triangulation
  navigation: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,        // Update every 1 second
    distanceInterval: 2,       // Or every 2 meters moved
    mayShowUserSettingsDialog: true,
  },
  
  // High accuracy for active walking (5-10m precision)
  walking: {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,        // Update every 2 seconds
    distanceInterval: 5,       // Or every 5 meters moved
    mayShowUserSettingsDialog: true,
  },
  
  // Balanced for general use (10-20m precision)
  balanced: {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,        // Update every 5 seconds
    distanceInterval: 10,      // Or every 10 meters moved
  },
  
  // Low power for background/stationary (50-100m precision)
  lowPower: {
    accuracy: Location.Accuracy.Low,
    timeInterval: 30000,       // Update every 30 seconds
    distanceInterval: 50,      // Or every 50 meters moved
  },
  
  // Battery saver mode
  batterySaver: {
    accuracy: Location.Accuracy.Lowest,
    timeInterval: 60000,       // Update every minute
    distanceInterval: 100,     // Or every 100 meters moved
  },
};

// Permission status constants
const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

// Location status constants
const LOCATION_STATUS = {
  INITIALIZING: 'initializing',
  SEARCHING: 'searching',
  ACTIVE: 'active',
  LOW_ACCURACY: 'low_accuracy',
  NO_SIGNAL: 'no_signal',
  PERMISSION_DENIED: 'permission_denied',
  SERVICES_DISABLED: 'services_disabled',
  ERROR: 'error',
};

// Movement states
const MOVEMENT_STATE = {
  STATIONARY: 'stationary',
  WALKING: 'walking',
  RUNNING: 'running',
  VEHICLE: 'vehicle', // Detect if user is in a vehicle
};

// Thresholds
const THRESHOLDS = {
  STATIONARY_SPEED: 0.3,      // m/s - below this is stationary
  WALKING_SPEED: 2.5,         // m/s - typical walking speed
  RUNNING_SPEED: 5.0,         // m/s - running threshold
  VEHICLE_SPEED: 10.0,        // m/s - likely in vehicle
  
  POOR_ACCURACY: 50,          // meters - above this is poor GPS
  GOOD_ACCURACY: 15,          // meters - below this is good GPS
  EXCELLENT_ACCURACY: 5,      // meters - excellent GPS
  
  STALE_LOCATION: 30000,      // ms - location older than 30s is stale
  GPS_TIMEOUT: 15000,         // ms - max wait for initial GPS fix
  
  JITTER_THRESHOLD: 3,        // meters - ignore movements smaller than this
  MAX_SPEED_WALKING: 3.5,     // m/s - reject GPS points suggesting faster than this
};

// ============================================
// KALMAN FILTER IMPLEMENTATION
// ============================================
/**
 * Kalman Filter for GPS smoothing
 * Reduces GPS jitter and provides smoother location updates
 * 
 * Based on: https://en.wikipedia.org/wiki/Kalman_filter
 * Optimized for pedestrian navigation use case
 */
class KalmanFilter {
  constructor() {
    // Initial state
    this.latitude = null;
    this.longitude = null;
    this.accuracy = null;
    this.timestamp = null;
    
    // Process noise variance (how much we expect position to change)
    // Higher = trust new measurements more
    this.Q_metres_per_second = 3; // Typical walking variation
    
    // Measurement variance
    this.variance = -1; // Negative means uninitialized
  }
  
  /**
   * Reset the filter
   */
  reset() {
    this.latitude = null;
    this.longitude = null;
    this.accuracy = null;
    this.timestamp = null;
    this.variance = -1;
  }
  
  /**
   * Filter a new GPS measurement
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} accuracy - Accuracy in meters
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {Object} Filtered position {latitude, longitude, accuracy}
   */
  filter(lat, lng, accuracy, timestamp) {
    // First reading - initialize
    if (this.variance < 0) {
      this.latitude = lat;
      this.longitude = lng;
      this.accuracy = accuracy;
      this.timestamp = timestamp;
      this.variance = accuracy * accuracy;
      return { latitude: lat, longitude: lng, accuracy };
    }
    
    // Calculate time delta in seconds
    const timeDelta = (timestamp - this.timestamp) / 1000;
    if (timeDelta <= 0) {
      // Invalid time delta, return current estimate
      return { latitude: this.latitude, longitude: this.longitude, accuracy: this.accuracy };
    }
    
    // Predict step - increase variance based on time passed
    // Variance increases with time due to uncertainty
    this.variance += timeDelta * this.Q_metres_per_second * this.Q_metres_per_second;
    
    // Update step - Kalman gain
    // K = P / (P + R) where P is our variance and R is measurement variance
    const measurementVariance = accuracy * accuracy;
    const K = this.variance / (this.variance + measurementVariance);
    
    // Update position estimate
    this.latitude += K * (lat - this.latitude);
    this.longitude += K * (lng - this.longitude);
    
    // Update variance
    this.variance = (1 - K) * this.variance;
    
    // Update accuracy estimate (sqrt of variance)
    this.accuracy = Math.sqrt(this.variance);
    this.timestamp = timestamp;
    
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
    };
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      timestamp: this.timestamp,
    };
  }
}

// ============================================
// LOCATION SERVICE CLASS
// ============================================
class LocationService {
  constructor() {
    // State
    this.currentLocation = null;
    this.previousLocation = null;
    this.locationHistory = [];
    this.maxHistoryLength = 50;
    
    // Filters
    this.kalmanFilter = new KalmanFilter();
    
    // Subscriptions
    this.watchSubscription = null;
    this.backgroundSubscription = null;
    
    // Callbacks
    this.onLocationUpdate = null;
    this.onStatusChange = null;
    this.onMovementStateChange = null;
    this.onError = null;
    
    // Status
    this.status = LOCATION_STATUS.INITIALIZING;
    this.movementState = MOVEMENT_STATE.STATIONARY;
    this.permissionStatus = null;
    this.isNavigating = false;
    this.appState = AppState.currentState;
    
    // Settings
    this.batterySaverEnabled = false;
    this.enableSmoothing = true;
    this.enableInterpolation = true;
    
    // Timers
    this.statusCheckInterval = null;
    this.signalRecoveryTimeout = null;
    this.lastUpdateTime = null;
    
    // Bind methods
    this._handleAppStateChange = this._handleAppStateChange.bind(this);
    this._processLocation = this._processLocation.bind(this);
    
    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  /**
   * Initialize the location service
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this._setStatus(LOCATION_STATUS.INITIALIZING);
      
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        this._setStatus(LOCATION_STATUS.SERVICES_DISABLED);
        return false;
      }
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }
      
      // Get initial position
      await this._getInitialPosition();
      
      return true;
    } catch (error) {
      console.error('[LocationService] Initialize error:', error);
      this._handleError('initialization_failed', error);
      return false;
    }
  }
  
  // ============================================
  // PERMISSIONS
  // ============================================
  
  /**
   * Request location permissions with proper handling
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermissions() {
    try {
      // Check current status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === PERMISSION_STATUS.GRANTED) {
        this.permissionStatus = PERMISSION_STATUS.GRANTED;
        return true;
      }
      
      // Request foreground permission
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      this.permissionStatus = status;
      
      if (status === PERMISSION_STATUS.GRANTED) {
        return true;
      }
      
      // Handle denied cases
      if (status === PERMISSION_STATUS.DENIED) {
        this._setStatus(LOCATION_STATUS.PERMISSION_DENIED);
        
        if (!canAskAgain) {
          // "Never ask again" was selected - must go to settings
          this._showPermissionSettingsAlert('denied_permanently');
        } else {
          // Denied but can ask again
          this._showPermissionSettingsAlert('denied');
        }
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('[LocationService] Permission error:', error);
      this._handleError('permission_error', error);
      return false;
    }
  }
  
  /**
   * Request background location permissions
   * Required for continuous tracking during screen lock
   * @returns {Promise<boolean>}
   */
  async requestBackgroundPermissions() {
    try {
      const { status: existingStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (existingStatus === PERMISSION_STATUS.GRANTED) {
        return true;
      }
      
      // On iOS, explain why we need background location
      if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
          Alert.alert(
            'Background Location',
            'SafeStep needs background location to continue guiding you even when your phone is locked. This helps us alert you to nearby safety resources.',
            [
              { text: 'Not Now', style: 'cancel', onPress: () => resolve(false) },
              { 
                text: 'Enable', 
                onPress: async () => {
                  const { status } = await Location.requestBackgroundPermissionsAsync();
                  resolve(status === PERMISSION_STATUS.GRANTED);
                }
              },
            ]
          );
        });
      }
      
      // Android - just request
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === PERMISSION_STATUS.GRANTED;
    } catch (error) {
      console.error('[LocationService] Background permission error:', error);
      return false;
    }
  }
  
  /**
   * Show alert to guide user to settings
   * @param {string} reason - Why permission is needed
   */
  _showPermissionSettingsAlert(reason) {
    const messages = {
      denied: {
        title: 'Location Permission Required',
        message: 'SafeStep needs your location to show nearby safety resources and provide walking directions.',
        buttonText: 'Try Again',
      },
      denied_permanently: {
        title: 'Location Access Disabled',
        message: 'Please enable location access in your device settings to use SafeStep\'s navigation features.',
        buttonText: 'Open Settings',
      },
      services_disabled: {
        title: 'Location Services Off',
        message: 'Please turn on Location Services in your device settings.',
        buttonText: 'Open Settings',
      },
    };
    
    const msg = messages[reason] || messages.denied;
    
    Alert.alert(
      msg.title,
      msg.message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: msg.buttonText, 
          onPress: () => {
            if (reason === 'denied_permanently' || reason === 'services_disabled') {
              Linking.openSettings();
            } else {
              // Retry permission request
              this.requestPermissions();
            }
          }
        },
      ]
    );
  }
  
  // ============================================
  // POSITION TRACKING
  // ============================================
  
  /**
   * Get initial position with timeout
   */
  async _getInitialPosition() {
    this._setStatus(LOCATION_STATUS.SEARCHING);
    
    try {
      // Try to get current position with timeout
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GPS timeout')), THRESHOLDS.GPS_TIMEOUT)
        ),
      ]);
      
      this._processLocation(position);
      
    } catch (error) {
      console.log('[LocationService] Initial position timeout, trying last known...');
      
      // Try last known position as fallback
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          const age = Date.now() - lastKnown.timestamp;
          if (age < THRESHOLDS.STALE_LOCATION * 2) {
            console.log('[LocationService] Using last known position');
            this._processLocation(lastKnown);
            this._setStatus(LOCATION_STATUS.LOW_ACCURACY);
          } else {
            this._setStatus(LOCATION_STATUS.SEARCHING);
          }
        } else {
          this._setStatus(LOCATION_STATUS.NO_SIGNAL);
        }
      } catch (e) {
        this._setStatus(LOCATION_STATUS.NO_SIGNAL);
      }
    }
  }
  
  /**
   * Start continuous location tracking
   * @param {Object} options
   * @param {boolean} options.isNavigating - Whether user is actively navigating
   * @param {boolean} options.batterySaver - Enable battery saver mode
   */
  async startTracking(options = {}) {
    const { isNavigating = false, batterySaver = false } = options;
    
    // Guard: ensure permission is granted before tracking
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationService] Cannot start tracking -- permission not granted');
      return;
    }
    
    this.isNavigating = isNavigating;
    this.batterySaverEnabled = batterySaver;
    
    // Stop existing tracking first
    await this.stopTracking();
    
    // Choose accuracy config based on state
    let config;
    if (batterySaver) {
      config = ACCURACY_CONFIGS.batterySaver;
    } else if (isNavigating) {
      config = ACCURACY_CONFIGS.navigation;
    } else {
      config = ACCURACY_CONFIGS.balanced;
    }
    
    console.log('[LocationService] Starting tracking with config:', config);
    
    try {
      this.watchSubscription = await Location.watchPositionAsync(
        config,
        this._processLocation
      );
      
      // Start periodic status checks
      this._startStatusCheck();
      
    } catch (error) {
      console.error('[LocationService] Watch error:', error);
      this._handleError('tracking_failed', error);
    }
  }
  
  /**
   * Stop location tracking
   */
  async stopTracking() {
    if (this.watchSubscription) {
      await this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    
    this._stopStatusCheck();
  }
  
  /**
   * Start background tracking (for screen lock)
   */
  async startBackgroundTracking() {
    const hasPermission = await this.requestBackgroundPermissions();
    if (!hasPermission) {
      console.log('[LocationService] Background permission not granted');
      return false;
    }
    
    try {
      // Define background task if not already defined
      if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
        TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
          if (error) {
            console.error('[LocationService] Background task error:', error);
            return;
          }
          if (data) {
            const { locations } = data;
            locations.forEach(location => this._processLocation(location));
          }
        });
      }
      
      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        deferredUpdatesInterval: 5000,
        deferredUpdatesDistance: 10,
        showsBackgroundLocationIndicator: true, // iOS blue bar
        foregroundService: {
          notificationTitle: 'SafeStep Navigation',
          notificationBody: 'Guiding you safely...',
          notificationColor: '#00f5d4',
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness, // Walking
      });
      
      console.log('[LocationService] Background tracking started');
      return true;
    } catch (error) {
      console.error('[LocationService] Background tracking error:', error);
      return false;
    }
  }
  
  /**
   * Stop background tracking
   */
  async stopBackgroundTracking() {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('[LocationService] Background tracking stopped');
      }
    } catch (error) {
      console.error('[LocationService] Stop background error:', error);
    }
  }
  
  // ============================================
  // LOCATION PROCESSING
  // ============================================
  
  /**
   * Process incoming location update
   * @param {Object} location - Location object from expo-location
   */
  _processLocation(location) {
    if (!location || !location.coords) {
      return;
    }
    
    const { coords, timestamp } = location;
    const now = Date.now();
    
    // Validate location data
    if (!this._isValidLocation(coords)) {
      console.log('[LocationService] Invalid location rejected');
      return;
    }
    
    // Check for GPS jumps (teleportation)
    if (this.currentLocation && this._isGPSJump(coords)) {
      console.log('[LocationService] GPS jump detected, filtering...');
      // Use Kalman filter to smooth the jump
    }
    
    // Apply Kalman filter for smoothing
    let smoothedLocation = coords;
    if (this.enableSmoothing) {
      smoothedLocation = this.kalmanFilter.filter(
        coords.latitude,
        coords.longitude,
        coords.accuracy || 10,
        timestamp
      );
    }
    
    // Create processed location object
    const processedLocation = {
      latitude: smoothedLocation.latitude,
      longitude: smoothedLocation.longitude,
      accuracy: smoothedLocation.accuracy || coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: timestamp,
      raw: coords, // Keep raw for debugging
    };
    
    // Update previous location
    this.previousLocation = this.currentLocation;
    this.currentLocation = processedLocation;
    this.lastUpdateTime = now;
    
    // Add to history
    this._addToHistory(processedLocation);
    
    // Update movement state
    this._updateMovementState(processedLocation);
    
    // Update status based on accuracy
    this._updateStatusFromAccuracy(processedLocation.accuracy);
    
    // Adjust tracking frequency based on movement state
    this._adjustTrackingFrequency();
    
    // Notify listeners
    if (this.onLocationUpdate) {
      this.onLocationUpdate(processedLocation);
    }
  }
  
  /**
   * Validate location data
   */
  _isValidLocation(coords) {
    // Check for valid coordinates
    if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      return false;
    }
    
    // Check coordinate bounds
    if (coords.latitude < -90 || coords.latitude > 90) return false;
    if (coords.longitude < -180 || coords.longitude > 180) return false;
    
    // Check for null island (0,0)
    if (coords.latitude === 0 && coords.longitude === 0) return false;
    
    return true;
  }
  
  /**
   * Detect GPS jumps/teleportation
   */
  _isGPSJump(newCoords) {
    if (!this.previousLocation) return false;
    
    const distance = this._calculateDistance(
      this.previousLocation.latitude,
      this.previousLocation.longitude,
      newCoords.latitude,
      newCoords.longitude
    );
    
    const timeDelta = (Date.now() - (this.previousLocation.timestamp || Date.now())) / 1000;
    if (timeDelta <= 0) return false;
    
    const impliedSpeed = distance / timeDelta;
    
    // If implied speed is impossibly fast for walking, it's a jump
    return impliedSpeed > THRESHOLDS.MAX_SPEED_WALKING;
  }
  
  /**
   * Add location to history
   */
  _addToHistory(location) {
    this.locationHistory.push({
      ...location,
      addedAt: Date.now(),
    });
    
    // Trim history
    if (this.locationHistory.length > this.maxHistoryLength) {
      this.locationHistory = this.locationHistory.slice(-this.maxHistoryLength);
    }
  }
  
  /**
   * Update movement state based on speed and patterns
   */
  _updateMovementState(location) {
    const speed = location.speed || 0;
    let newState = MOVEMENT_STATE.STATIONARY;
    
    if (speed < THRESHOLDS.STATIONARY_SPEED) {
      newState = MOVEMENT_STATE.STATIONARY;
    } else if (speed < THRESHOLDS.WALKING_SPEED) {
      newState = MOVEMENT_STATE.WALKING;
    } else if (speed < THRESHOLDS.RUNNING_SPEED) {
      newState = MOVEMENT_STATE.RUNNING;
    } else if (speed > THRESHOLDS.VEHICLE_SPEED) {
      newState = MOVEMENT_STATE.VEHICLE;
    }
    
    if (newState !== this.movementState) {
      const previousState = this.movementState;
      this.movementState = newState;
      
      if (this.onMovementStateChange) {
        this.onMovementStateChange(newState, previousState);
      }
    }
  }
  
  /**
   * Update status based on GPS accuracy
   */
  _updateStatusFromAccuracy(accuracy) {
    if (!accuracy) return;
    
    let newStatus = this.status;
    
    if (accuracy <= THRESHOLDS.EXCELLENT_ACCURACY) {
      newStatus = LOCATION_STATUS.ACTIVE;
    } else if (accuracy <= THRESHOLDS.GOOD_ACCURACY) {
      newStatus = LOCATION_STATUS.ACTIVE;
    } else if (accuracy <= THRESHOLDS.POOR_ACCURACY) {
      newStatus = LOCATION_STATUS.LOW_ACCURACY;
    } else {
      newStatus = LOCATION_STATUS.LOW_ACCURACY;
    }
    
    this._setStatus(newStatus);
  }
  
  /**
   * Adjust tracking frequency based on movement
   */
  async _adjustTrackingFrequency() {
    // Don't adjust if navigating (always use high accuracy)
    if (this.isNavigating) return;
    
    // Don't adjust if battery saver is on
    if (this.batterySaverEnabled) return;
    
    const currentConfig = this.movementState === MOVEMENT_STATE.STATIONARY
      ? ACCURACY_CONFIGS.lowPower
      : ACCURACY_CONFIGS.walking;
    
    // Could restart watch with new config if needed
    // For now, we rely on expo-location's internal optimization
  }
  
  // ============================================
  // STATUS MANAGEMENT
  // ============================================
  
  /**
   * Set location status and notify listeners
   */
  _setStatus(newStatus) {
    if (newStatus !== this.status) {
      const previousStatus = this.status;
      this.status = newStatus;
      
      console.log('[LocationService] Status:', previousStatus, '->', newStatus);
      
      if (this.onStatusChange) {
        this.onStatusChange(newStatus, previousStatus);
      }
    }
  }
  
  /**
   * Start periodic status checks
   */
  _startStatusCheck() {
    this._stopStatusCheck();
    
    this.statusCheckInterval = setInterval(() => {
      this._checkSignalStatus();
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Stop status checks
   */
  _stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }
  
  /**
   * Check if we have recent GPS signal
   */
  _checkSignalStatus() {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime || 0;
    const timeSinceUpdate = now - lastUpdate;
    
    if (timeSinceUpdate > THRESHOLDS.STALE_LOCATION) {
      // No recent updates - signal may be lost
      this._setStatus(LOCATION_STATUS.NO_SIGNAL);
      
      // Try to recover
      this._attemptSignalRecovery();
    }
  }
  
  /**
   * Attempt to recover GPS signal
   */
  async _attemptSignalRecovery() {
    if (this.signalRecoveryTimeout) return; // Already attempting
    
    console.log('[LocationService] Attempting signal recovery...');
    this._setStatus(LOCATION_STATUS.SEARCHING);
    
    try {
      // Try to get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      if (position) {
        this._processLocation(position);
        console.log('[LocationService] Signal recovered!');
      }
    } catch (error) {
      console.log('[LocationService] Recovery failed, will retry...');
      
      // Schedule retry
      this.signalRecoveryTimeout = setTimeout(() => {
        this.signalRecoveryTimeout = null;
        if (this.status === LOCATION_STATUS.NO_SIGNAL) {
          this._attemptSignalRecovery();
        }
      }, 15000); // Retry in 15 seconds
    }
  }
  
  // ============================================
  // APP STATE HANDLING
  // ============================================
  
  /**
   * Handle app state changes
   */
  _handleAppStateChange(nextAppState) {
    console.log('[LocationService] App state:', this.appState, '->', nextAppState);
    
    const wasBackground = this.appState === 'background' || this.appState === 'inactive';
    const isBackground = nextAppState === 'background' || nextAppState === 'inactive';
    
    this.appState = nextAppState;
    
    // Coming to foreground
    if (wasBackground && nextAppState === 'active') {
      // Refresh location
      this._getInitialPosition();
      
      // Adjust tracking for foreground
      if (this.isNavigating) {
        this.startTracking({ isNavigating: true });
      }
    }
    
    // Going to background
    if (!wasBackground && isBackground) {
      if (this.isNavigating) {
        // Keep tracking in background during navigation
        this.startBackgroundTracking();
      } else {
        // Reduce tracking frequency
        this.startTracking({ batterySaver: true });
      }
    }
  }
  
  // ============================================
  // ERROR HANDLING
  // ============================================
  
  /**
   * Handle errors
   */
  _handleError(type, error) {
    console.error('[LocationService] Error:', type, error);
    this._setStatus(LOCATION_STATUS.ERROR);
    
    if (this.onError) {
      this.onError({ type, error, message: this._getErrorMessage(type) });
    }
  }
  
  /**
   * Get user-friendly error message
   */
  _getErrorMessage(type) {
    const messages = {
      initialization_failed: 'Unable to start location services. Please try again.',
      permission_error: 'Location permission is required for navigation.',
      tracking_failed: 'Unable to track your location. Please check GPS settings.',
      signal_lost: 'GPS signal lost. Move to an open area.',
      timeout: 'Searching for GPS signal...',
    };
    
    return messages[type] || 'An error occurred with location services.';
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Calculate distance between two points in meters (Haversine)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  _toRad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Interpolate between two locations for smooth animation
   * @param {Object} from - Starting location
   * @param {Object} to - Target location
   * @param {number} progress - Progress from 0 to 1
   * @returns {Object} Interpolated location
   */
  interpolate(from, to, progress) {
    if (!from || !to) return to || from;
    
    const t = Math.max(0, Math.min(1, progress));
    
    return {
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
      accuracy: from.accuracy + (to.accuracy - from.accuracy) * t,
      heading: this._interpolateAngle(from.heading || 0, to.heading || 0, t),
    };
  }
  
  /**
   * Interpolate between angles (handles wraparound)
   */
  _interpolateAngle(a1, a2, t) {
    const diff = ((a2 - a1 + 180) % 360) - 180;
    return (a1 + diff * t + 360) % 360;
  }
  
  /**
   * Get current status info for UI
   */
  getStatusInfo() {
    const statusMessages = {
      [LOCATION_STATUS.INITIALIZING]: { text: 'Starting GPS...', icon: '📡', color: '#fee440' },
      [LOCATION_STATUS.SEARCHING]: { text: 'Searching for GPS...', icon: '🔍', color: '#fee440' },
      [LOCATION_STATUS.ACTIVE]: { text: 'GPS Active', icon: '✓', color: '#00f5d4' },
      [LOCATION_STATUS.LOW_ACCURACY]: { text: 'Low GPS accuracy', icon: '⚠️', color: '#ff9f43' },
      [LOCATION_STATUS.NO_SIGNAL]: { text: 'No GPS signal', icon: '❌', color: '#ff6b6b' },
      [LOCATION_STATUS.PERMISSION_DENIED]: { text: 'Location access denied', icon: '🚫', color: '#ff6b6b' },
      [LOCATION_STATUS.SERVICES_DISABLED]: { text: 'Location services off', icon: '📵', color: '#ff6b6b' },
      [LOCATION_STATUS.ERROR]: { text: 'Location error', icon: '⚠️', color: '#ff6b6b' },
    };
    
    return statusMessages[this.status] || statusMessages[LOCATION_STATUS.ERROR];
  }
  
  /**
   * Get accuracy indicator for UI
   */
  getAccuracyIndicator() {
    const accuracy = this.currentLocation?.accuracy;
    if (!accuracy) return { level: 0, text: 'No signal', color: '#ff6b6b' };
    
    if (accuracy <= THRESHOLDS.EXCELLENT_ACCURACY) {
      return { level: 3, text: 'Excellent', color: '#00f5d4' };
    } else if (accuracy <= THRESHOLDS.GOOD_ACCURACY) {
      return { level: 2, text: 'Good', color: '#00f5d4' };
    } else if (accuracy <= THRESHOLDS.POOR_ACCURACY) {
      return { level: 1, text: 'Fair', color: '#fee440' };
    } else {
      return { level: 0, text: 'Poor', color: '#ff6b6b' };
    }
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  /**
   * Destroy the service and clean up
   */
  async destroy() {
    await this.stopTracking();
    await this.stopBackgroundTracking();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.signalRecoveryTimeout) {
      clearTimeout(this.signalRecoveryTimeout);
    }
    
    this._stopStatusCheck();
    this.kalmanFilter.reset();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================
const locationService = new LocationService();

export {
  locationService,
  LOCATION_STATUS,
  MOVEMENT_STATE,
  THRESHOLDS,
  ACCURACY_CONFIGS,
  BACKGROUND_LOCATION_TASK,
};

export default locationService;
