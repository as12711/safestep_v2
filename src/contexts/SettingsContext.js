/**
 * Settings Context
 * =================
 * Manages app settings and user preferences.
 * Persists settings to AsyncStorage.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key
const SETTINGS_KEY = 'ss_settings';

// ===========================================
// DEFAULT SETTINGS
// ===========================================
export const DEFAULT_SETTINGS = {
  // Audio & Feedback
  haptics: true,
  sounds: false,
  voiceGuidance: false,
  voiceAlerts: true,

  // Battery & Performance
  batterySaver: false,
  reducedMotion: false,

  // Privacy & Safety
  shareLocation: false,        // Ghost mode by default
  incognitoMode: true,         // Don't save trip history by default
  anonymousReports: true,      // Reports are anonymous
  showOnLeaderboard: false,    // Community leaderboard opt-in

  // Notifications
  pushNotifications: true,
  safetyAlerts: true,
  communityUpdates: false,
  marketingEmails: false,

  // Display
  mapStyle: 'dark',
  showSafeHavens: true,
  showBlueLights: true,
  showReports: true,

  // Home Beacon
  homeBeaconEnabled: true,
  autoNotifyOnArrival: true,
  sosEnabled: true,
};

// ===========================================
// SETTINGS CONTEXT
// ===========================================
const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

/**
 * SettingsProvider - Wraps the app to provide settings state
 */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // ===========================================
  // PERSISTENCE
  // ===========================================

  /**
   * Load settings from storage on mount
   */
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new settings are included
        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...parsed }));
      }
    } catch (e) {
      console.warn('[SettingsContext] Failed to load settings:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('[SettingsContext] Failed to save settings:', e);
    }
  };

  // ===========================================
  // SETTINGS ACTIONS
  // ===========================================

  /**
   * Get a single setting value
   */
  const getSetting = useCallback((key) => {
    return settings[key] ?? DEFAULT_SETTINGS[key];
  }, [settings]);

  /**
   * Update a single setting
   */
  const setSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      saveSettings(updated);
      return updated;
    });
  }, []);

  /**
   * Update multiple settings at once
   */
  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      saveSettings(updated);
      return updated;
    });
  }, []);

  /**
   * Toggle a boolean setting
   */
  const toggleSetting = useCallback((key) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      saveSettings(updated);
      return updated;
    });
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  /**
   * Reset a single setting to default
   */
  const resetSetting = useCallback((key) => {
    if (key in DEFAULT_SETTINGS) {
      setSetting(key, DEFAULT_SETTINGS[key]);
    }
  }, [setSetting]);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================

  const isPrivacyMode = useMemo(() => {
    return settings.incognitoMode || !settings.shareLocation;
  }, [settings.incognitoMode, settings.shareLocation]);

  const isHomeBeaconEnabled = useMemo(() => {
    return settings.homeBeaconEnabled;
  }, [settings.homeBeaconEnabled]);

  // ===========================================
  // CONTEXT VALUE
  // ===========================================
  const value = useMemo(
    () => ({
      // State
      settings,
      isLoaded,
      
      // Getters
      getSetting,
      isPrivacyMode,
      isHomeBeaconEnabled,
      
      // Actions
      setSetting,
      updateSettings,
      toggleSetting,
      resetSettings,
      resetSetting,
      
      // Defaults for reference
      DEFAULT_SETTINGS,
    }),
    [
      settings,
      isLoaded,
      getSetting,
      isPrivacyMode,
      isHomeBeaconEnabled,
      setSetting,
      updateSettings,
      toggleSetting,
      resetSettings,
      resetSetting,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
