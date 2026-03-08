/**
 * SafeStep Home Beacon Service
 * ============================
 * Alerts a predetermined emergency contact when the user arrives home safely.
 * 
 * Features:
 * - Set home address
 * - Add emergency contacts (phone/email)
 * - Auto-detect arrival at home
 * - Send "Arrived Safely" notification
 * - Manual trigger option
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Storage keys
const HOME_ADDRESS_KEY = 'ss_home_address';
const EMERGENCY_CONTACTS_KEY = 'ss_emergency_contacts';
const BEACON_SETTINGS_KEY = 'ss_beacon_settings';

// Beacon status
export const BEACON_STATUS = {
  INACTIVE: 'inactive',
  MONITORING: 'monitoring',
  ARRIVED: 'arrived',
  SENT: 'sent',
  FAILED: 'failed',
};

// Default arrival radius (meters)
const DEFAULT_ARRIVAL_RADIUS = 50;

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  autoDetect: true,
  arrivalRadius: DEFAULT_ARRIVAL_RADIUS,
  sendSMS: true,
  sendEmail: false,
  customMessage: '',
};

class HomeBeaconService {
  constructor() {
    this.homeAddress = null;
    this.emergencyContacts = [];
    this.settings = DEFAULT_SETTINGS;
    this.status = BEACON_STATUS.INACTIVE;
    this.currentTrip = null;
    this.locationSubscription = null;
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  /**
   * Initialize the service - load saved data
   */
  async initialize() {
    try {
      const [homeData, contactsData, settingsData] = await Promise.all([
        AsyncStorage.getItem(HOME_ADDRESS_KEY),
        AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY),
        AsyncStorage.getItem(BEACON_SETTINGS_KEY),
      ]);

      if (homeData) {
        this.homeAddress = JSON.parse(homeData);
      }
      if (contactsData) {
        this.emergencyContacts = JSON.parse(contactsData);
      }
      if (settingsData) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) };
      }

      return {
        homeAddress: this.homeAddress,
        emergencyContacts: this.emergencyContacts,
        settings: this.settings,
      };
    } catch (error) {
      console.warn('[HomeBeacon] Initialize failed:', error);
      return { homeAddress: null, emergencyContacts: [], settings: DEFAULT_SETTINGS };
    }
  }

  // ===========================================
  // HOME ADDRESS
  // ===========================================

  /**
   * Set home address
   */
  async setHomeAddress(address) {
    this.homeAddress = {
      name: address.name || 'Home',
      address: address.address || address.name,
      lat: address.lat,
      lng: address.lng,
      savedAt: Date.now(),
    };

    await AsyncStorage.setItem(HOME_ADDRESS_KEY, JSON.stringify(this.homeAddress));
    return this.homeAddress;
  }

  /**
   * Set home to current location
   */
  async setHomeToCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const formattedAddress = address
        ? `${address.streetNumber || ''} ${address.street || ''}, ${address.city || ''}`
        : 'Current Location';

      return this.setHomeAddress({
        name: 'Home',
        address: formattedAddress.trim(),
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.warn('[HomeBeacon] Failed to get current location:', error);
      throw new Error('Could not get current location');
    }
  }

  /**
   * Get home address
   */
  getHomeAddress() {
    return this.homeAddress;
  }

  /**
   * Clear home address
   */
  async clearHomeAddress() {
    this.homeAddress = null;
    await AsyncStorage.removeItem(HOME_ADDRESS_KEY);
  }

  // ===========================================
  // EMERGENCY CONTACTS
  // ===========================================

  /**
   * Add an emergency contact
   */
  async addContact(contact) {
    const newContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: contact.name,
      phone: contact.phone || null,
      email: contact.email || null,
      relationship: contact.relationship || 'Emergency Contact',
      addedAt: Date.now(),
    };

    // Validate - must have at least phone or email
    if (!newContact.phone && !newContact.email) {
      throw new Error('Contact must have a phone number or email address');
    }

    this.emergencyContacts.push(newContact);
    await this._saveContacts();
    return newContact;
  }

  /**
   * Update an emergency contact
   */
  async updateContact(contactId, updates) {
    const index = this.emergencyContacts.findIndex(c => c.id === contactId);
    if (index === -1) {
      throw new Error('Contact not found');
    }

    this.emergencyContacts[index] = {
      ...this.emergencyContacts[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await this._saveContacts();
    return this.emergencyContacts[index];
  }

  /**
   * Remove an emergency contact
   */
  async removeContact(contactId) {
    this.emergencyContacts = this.emergencyContacts.filter(c => c.id !== contactId);
    await this._saveContacts();
  }

  /**
   * Get all emergency contacts
   */
  getContacts() {
    return this.emergencyContacts;
  }

  async _saveContacts() {
    await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(this.emergencyContacts));
  }

  // ===========================================
  // BEACON MONITORING
  // ===========================================

  /**
   * Start monitoring for arrival at home
   */
  async startMonitoring(tripInfo = {}) {
    if (!this.homeAddress) {
      throw new Error('No home address set');
    }

    if (this.emergencyContacts.length === 0) {
      throw new Error('No emergency contacts configured');
    }

    this.currentTrip = {
      startedAt: Date.now(),
      destination: tripInfo.destination || this.homeAddress,
      origin: tripInfo.origin,
    };

    this.status = BEACON_STATUS.MONITORING;

    // If auto-detect is enabled, start location monitoring
    if (this.settings.autoDetect) {
      this._startLocationMonitoring();
    }

    return {
      status: this.status,
      trip: this.currentTrip,
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.status = BEACON_STATUS.INACTIVE;
    this.currentTrip = null;
  }

  /**
   * Start location updates to detect arrival
   */
  _startLocationMonitoring() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20, // Update every 20 meters
        timeInterval: 10000,  // Or every 10 seconds
      },
      (location) => {
        this._checkArrival(location.coords);
      }
    ).then(subscription => {
      this.locationSubscription = subscription;
    }).catch(error => {
      console.warn('[HomeBeacon] Location monitoring failed:', error);
    });
  }

  /**
   * Check if user has arrived at home
   */
  _checkArrival(coords) {
    if (!this.homeAddress || this.status !== BEACON_STATUS.MONITORING) {
      return;
    }

    const distance = this._calculateDistance(
      coords.latitude,
      coords.longitude,
      this.homeAddress.lat,
      this.homeAddress.lng
    );

    if (distance <= this.settings.arrivalRadius) {
      this.status = BEACON_STATUS.ARRIVED;
      this._onArrival();
    }
  }

  /**
   * Handle arrival at home
   */
  async _onArrival() {
    // Stop monitoring
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Auto-send notification if enabled
    if (this.settings.autoDetect) {
      await this.sendArrivedNotification();
    }
  }

  // ===========================================
  // NOTIFICATIONS
  // ===========================================

  /**
   * Send "Arrived Safely" notification to all contacts
   */
  async sendArrivedNotification(customMessage = null) {
    if (this.emergencyContacts.length === 0) {
      throw new Error('No emergency contacts configured');
    }

    const message = customMessage || this.settings.customMessage || this._getDefaultMessage();
    const results = [];

    for (const contact of this.emergencyContacts) {
      try {
        const result = await this._sendToContact(contact, message);
        results.push({ contact: contact.id, success: true, method: result.method });
      } catch (error) {
        results.push({ contact: contact.id, success: false, error: error.message });
      }
    }

    this.status = results.every(r => r.success) ? BEACON_STATUS.SENT : BEACON_STATUS.FAILED;

    // Log the notification
    await this._logNotification(message, results);

    return {
      status: this.status,
      results,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * Send notification to a single contact
   */
  async _sendToContact(contact, message) {
    // In a production app, this would integrate with:
    // - Twilio/SMS API for text messages
    // - SendGrid/email API for emails
    // - Push notification service
    
    // For now, we simulate the send and use Linking for SMS
    const method = contact.phone ? 'sms' : 'email';

    // In production, make API call here
    // await fetch('https://api.safestep.com/notify', { ... });

    console.log(`[HomeBeacon] Sending ${method} to ${contact.name}: ${message}`);

    return {
      method,
      sentAt: Date.now(),
    };
  }

  /**
   * Get SMS deep link for manual sending
   */
  getSMSLink(contact, customMessage = null) {
    if (!contact?.phone) return null;
    
    const message = encodeURIComponent(
      customMessage || this.settings.customMessage || this._getDefaultMessage()
    );
    return `sms:${contact.phone}?body=${message}`;
  }

  /**
   * Get default arrival message
   */
  _getDefaultMessage() {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `✅ I arrived home safely at ${time}. Sent via SafeStep.`;
  }

  /**
   * Log notification for history
   */
  async _logNotification(message, results) {
    try {
      const historyKey = 'ss_beacon_history';
      const historyData = await AsyncStorage.getItem(historyKey);
      const history = historyData ? JSON.parse(historyData) : [];

      history.unshift({
        timestamp: Date.now(),
        message,
        results,
        homeAddress: this.homeAddress?.address,
      });

      // Keep last 50 notifications
      const trimmedHistory = history.slice(0, 50);
      await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.warn('[HomeBeacon] Failed to log notification:', error);
    }
  }

  // ===========================================
  // SETTINGS
  // ===========================================

  /**
   * Update settings
   */
  async updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };
    await AsyncStorage.setItem(BEACON_SETTINGS_KEY, JSON.stringify(this.settings));
    return this.settings;
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.settings;
  }

  // ===========================================
  // STATUS & UTILITIES
  // ===========================================

  /**
   * Get current status
   */
  getStatus() {
    return {
      status: this.status,
      isMonitoring: this.status === BEACON_STATUS.MONITORING,
      hasHome: !!this.homeAddress,
      hasContacts: this.emergencyContacts.length > 0,
      currentTrip: this.currentTrip,
    };
  }

  /**
   * Check if beacon is ready (home + contacts configured)
   */
  isReady() {
    return !!this.homeAddress && this.emergencyContacts.length > 0;
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  _calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Export singleton
export const homeBeaconService = new HomeBeaconService();
export default homeBeaconService;

