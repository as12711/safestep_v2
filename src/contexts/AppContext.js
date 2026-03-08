/**
 * App Context
 * ===========
 * Manages shared app state including navigation, location, reports, etc.
 * This is the main coordinator for app-wide state.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { locationService, LOCATION_STATUS } from '../services';
import { supabase } from '../services';

// ===========================================
// APP CONTEXT
// ===========================================
const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/**
 * AppProvider - Wraps the app to provide shared state
 */
export const AppProvider = ({ children }) => {
  // ===========================================
  // NAVIGATION STATE
  // ===========================================
  const [activeSheet, setActiveSheet] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // ===========================================
  // LOCATION STATE
  // ===========================================
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(LOCATION_STATUS.INITIALIZING);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // ===========================================
  // REPORTS STATE
  // ===========================================
  const [reports, setReports] = useState([]);
  const [dismissedReportIds, setDismissedReportIds] = useState(new Set());

  // ===========================================
  // UI STATE
  // ===========================================
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ===========================================
  // REFS
  // ===========================================
  const mapRef = useRef(null);

  // ===========================================
  // LOCATION MANAGEMENT
  // ===========================================
  
  useEffect(() => {
    initializeLocation();
    loadDismissedReports();
    return () => {
      locationService.destroy?.();
    };
  }, []);

  const initializeLocation = async () => {
    try {
      // Set up location callbacks
      locationService.onLocationUpdate = (loc) => {
        setLocation(loc);
        setGpsAccuracy(loc.accuracy);
      };
      
      locationService.onStatusChange = (status) => {
        setLocationStatus(status);
      };

      // Initialize location service (only start tracking if permission granted)
      const initialized = await locationService.initialize();
      if (initialized) {
        await locationService.startTracking();
      }
    } catch (e) {
      console.warn('[AppContext] Location initialization failed:', e);
      setLocationStatus(LOCATION_STATUS.ERROR);
    }
  };

  // ===========================================
  // REPORTS MANAGEMENT
  // ===========================================

  const loadDismissedReports = async () => {
    try {
      const stored = await AsyncStorage.getItem('ss_dismissed_reports');
      if (stored) {
        setDismissedReportIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn('[AppContext] Failed to load dismissed reports:', e);
    }
  };

  const dismissReport = useCallback(async (reportId) => {
    setDismissedReportIds(prev => {
      const updated = new Set(prev);
      updated.add(reportId);
      AsyncStorage.setItem('ss_dismissed_reports', JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  const refreshReports = useCallback(async () => {
    try {
      const result = await supabase?.getReports?.(6); // Last 6 hours
      if (result?.data) {
        setReports(result.data);
      }
    } catch (e) {
      console.warn('[AppContext] Failed to refresh reports:', e);
    }
  }, []);

  const addReport = useCallback((report) => {
    setReports(prev => [report, ...prev]);
  }, []);

  // ===========================================
  // SHEET MANAGEMENT
  // ===========================================

  const openSheet = useCallback((sheetName) => {
    setActiveSheet(sheetName);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const navigateToSheet = useCallback((sheetName) => {
    setActiveSheet(sheetName);
  }, []);

  // ===========================================
  // NAVIGATION MANAGEMENT
  // ===========================================

  const startNavigation = useCallback(async (dest, routeData) => {
    setDestination(dest);
    setRoute(routeData?.coords);
    setRouteInfo({
      distance: routeData?.distance,
      duration: routeData?.duration,
    });
    setIsNavigating(true);
    setActiveSheet(null);
    
    // Start high-accuracy tracking
    await locationService.startTracking({ isNavigating: true });
  }, []);

  const stopNavigation = useCallback(async () => {
    setIsNavigating(false);
    setDestination(null);
    setRoute(null);
    setRouteInfo(null);
    
    // Return to normal tracking
    await locationService.startTracking({ isNavigating: false });
  }, []);

  // ===========================================
  // HAPTIC FEEDBACK
  // ===========================================

  const hapticFeedback = useCallback((type = 'impact') => {
    if (Platform.OS === 'web') return;
    
    try {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'impact':
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
      }
    } catch (e) {
      // Ignore haptics errors
    }
  }, []);

  // ===========================================
  // TOAST NOTIFICATIONS
  // ===========================================

  const showToast = useCallback((message, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // ===========================================
  // VISIBLE REPORTS (filtered)
  // ===========================================

  const visibleReports = useMemo(() => {
    return reports.filter(r => !dismissedReportIds.has(r.id));
  }, [reports, dismissedReportIds]);

  // ===========================================
  // CONTEXT VALUE
  // ===========================================

  const value = useMemo(
    () => ({
      // Navigation state
      activeSheet,
      isNavigating,
      destination,
      route,
      routeInfo,
      
      // Location state
      location,
      locationStatus,
      gpsAccuracy,
      
      // Reports state
      reports,
      visibleReports,
      dismissedReportIds,
      
      // UI state
      toastMessage,
      isLoading,
      
      // Refs
      mapRef,
      
      // Sheet actions
      openSheet,
      closeSheet,
      navigateToSheet,
      setActiveSheet,
      
      // Navigation actions
      startNavigation,
      stopNavigation,
      
      // Report actions
      refreshReports,
      addReport,
      dismissReport,
      
      // UI actions
      showToast,
      hideToast,
      hapticFeedback,
      setIsLoading,
    }),
    [
      activeSheet,
      isNavigating,
      destination,
      route,
      routeInfo,
      location,
      locationStatus,
      gpsAccuracy,
      reports,
      visibleReports,
      dismissedReportIds,
      toastMessage,
      isLoading,
      openSheet,
      closeSheet,
      navigateToSheet,
      startNavigation,
      stopNavigation,
      refreshReports,
      addReport,
      dismissReport,
      showToast,
      hideToast,
      hapticFeedback,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
