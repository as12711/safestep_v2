/**
 * Navigation Notifications Service
 * =================================
 * Handles lock screen and notification updates during walks.
 * Shows ETA, distance remaining, and safety alerts.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification IDs
const NOTIFICATION_IDS = {
  NAVIGATION: 'safestep-navigation',
  SAFETY_ALERT: 'safestep-safety-alert',
  ETA_UPDATE: 'safestep-eta-update',
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

class NavigationNotifications {
  constructor() {
    this.isEnabled = true;
    this.currentWalk = null;
    this.updateInterval = null;
    this.lastNotificationTime = 0;
  }

  /**
   * Initialize notification permissions
   */
  async initialize() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NavigationNotifications] Permission not granted');
        return false;
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('navigation', {
          name: 'Navigation Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250],
          lightColor: '#00f5d4',
        });

        await Notifications.setNotificationChannelAsync('safety', {
          name: 'Safety Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#ff6b6b',
        });
      }

      return true;
    } catch (error) {
      console.error('[NavigationNotifications] Init error:', error);
      return false;
    }
  }

  /**
   * Start navigation session with lock screen updates
   */
  async startNavigationSession(walkData) {
    this.currentWalk = {
      id: walkData.id || Date.now(),
      destination: walkData.destination,
      totalDistance: walkData.distance,
      remainingDistance: walkData.distance,
      estimatedTime: walkData.estimatedTime,
      startTime: Date.now(),
    };

    // Show initial notification
    await this.showNavigationNotification({
      title: `Navigating to ${walkData.destination?.name || 'destination'}`,
      body: `${this.formatDistance(walkData.distance)} • ${this.formatTime(walkData.estimatedTime)}`,
      subtitle: 'SafeStep is guiding you',
    });

    // Start periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Update navigation progress
   */
  async updateProgress(progressData) {
    if (!this.currentWalk) return;

    const {
      remainingDistance,
      remainingTime,
      currentStreet,
      nextDirection,
    } = progressData;

    this.currentWalk.remainingDistance = remainingDistance;
    this.currentWalk.remainingTime = remainingTime;

    // Throttle updates to every 30 seconds
    const now = Date.now();
    if (now - this.lastNotificationTime < 30000) return;
    this.lastNotificationTime = now;

    const title = nextDirection 
      ? `${nextDirection.instruction}`
      : `Continue on ${currentStreet || 'current route'}`;

    await this.showNavigationNotification({
      title,
      body: `${this.formatDistance(remainingDistance)} remaining • ${this.formatTime(remainingTime)}`,
      subtitle: this.currentWalk.destination?.name,
    });
  }

  /**
   * Show turn-by-turn direction
   */
  async showDirectionUpdate(direction) {
    await this.showNavigationNotification({
      title: direction.instruction,
      body: `in ${this.formatDistance(direction.distance)}`,
      priority: 'high',
    });
  }

  /**
   * Show safety alert on lock screen
   */
  async showSafetyAlert(alertData) {
    const {
      type,
      title,
      message,
      distance,
    } = alertData;

    const alertConfig = this.getAlertConfig(type);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: alertConfig.icon + ' ' + title,
        body: message + (distance ? ` (${this.formatDistance(distance)} away)` : ''),
        sound: alertConfig.sound,
        priority: 'max',
        vibrate: alertConfig.vibrate,
        data: { type: 'safety_alert', alertType: type },
        ...(Platform.OS === 'android' && {
          channelId: 'safety',
          color: alertConfig.color,
        }),
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Show nearby safety resource
   */
  async showNearbyResource(resource) {
    await this.showNavigationNotification({
      title: `${resource.icon || '📍'} ${resource.name} nearby`,
      body: `${resource.type} - ${this.formatDistance(resource.distance)} away`,
      subtitle: 'Safety resource available',
    });
  }

  /**
   * End navigation session
   */
  async endNavigationSession(summary = {}) {
    this.stopPeriodicUpdates();

    if (summary.completed) {
      await this.showNavigationNotification({
        title: '🎉 You\'ve arrived!',
        body: `${summary.destination?.name || 'Destination'} • Walk completed safely`,
        autoHide: true,
      });
    }

    // Dismiss navigation notification after delay
    setTimeout(() => {
      this.dismissAllNotifications();
    }, 5000);

    this.currentWalk = null;
  }

  /**
   * Show navigation notification
   */
  async showNavigationNotification(options) {
    const {
      title,
      body,
      subtitle,
      priority = 'default',
      autoHide = false,
    } = options;

    try {
      // Cancel existing navigation notification
      await Notifications.dismissNotificationAsync(NOTIFICATION_IDS.NAVIGATION);

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.NAVIGATION,
        content: {
          title,
          body,
          subtitle,
          sound: null, // Silent for navigation updates
          priority,
          sticky: !autoHide, // Keep visible on lock screen
          data: { type: 'navigation' },
          ...(Platform.OS === 'android' && {
            channelId: 'navigation',
            ongoing: !autoHide, // Persistent notification
            color: '#00f5d4',
          }),
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.warn('[NavigationNotifications] Show error:', error);
    }
  }

  /**
   * Start periodic notification updates
   */
  startPeriodicUpdates() {
    this.stopPeriodicUpdates();

    this.updateInterval = setInterval(() => {
      if (this.currentWalk) {
        // Calculate elapsed time
        const elapsed = Date.now() - this.currentWalk.startTime;
        const elapsedMinutes = Math.floor(elapsed / 60000);

        // Show periodic update
        this.showNavigationNotification({
          title: `Walking to ${this.currentWalk.destination?.name || 'destination'}`,
          body: `${this.formatDistance(this.currentWalk.remainingDistance)} remaining`,
          subtitle: `${elapsedMinutes} min walking`,
        });
      }
    }, 60000); // Update every minute
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Dismiss all SafeStep notifications
   */
  async dismissAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get alert configuration by type
   */
  getAlertConfig(type) {
    const configs = {
      danger: {
        icon: '🚨',
        color: '#ff6b6b',
        sound: true,
        vibrate: [0, 500, 250, 500],
      },
      warning: {
        icon: '⚠️',
        color: '#FFB347',
        sound: false,
        vibrate: [0, 250],
      },
      safe_haven: {
        icon: '🛡️',
        color: '#BF5AF2',
        sound: false,
        vibrate: null,
      },
      blue_light: {
        icon: '🔵',
        color: '#64D2FF',
        sound: false,
        vibrate: null,
      },
      police: {
        icon: '👮',
        color: '#0A84FF',
        sound: false,
        vibrate: null,
      },
    };

    return configs[type] || configs.warning;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters) {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    if (!seconds) return '';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled() {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  }

  /**
   * Enable/disable navigation notifications
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.dismissAllNotifications();
      this.stopPeriodicUpdates();
    }
  }
}

export const navigationNotifications = new NavigationNotifications();
export default navigationNotifications;
