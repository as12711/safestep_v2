/**
 * Navigation Hooks
 * =================
 * Custom hooks for navigation utilities.
 */

import { useCallback } from 'react';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { TabRoutes, NavigateStackRoutes, HomeStackRoutes, ProfileStackRoutes } from './types';

/**
 * Hook to navigate to the map with optional destination
 */
export const useNavigateToMap = () => {
  const navigation = useNavigation();

  return useCallback((destination = null) => {
    navigation.navigate(TabRoutes.NAVIGATE, {
      screen: NavigateStackRoutes.MAP,
      params: destination ? { destination } : undefined,
    });
  }, [navigation]);
};

/**
 * Hook to open the reporting modal
 */
export const useOpenReporting = () => {
  const navigation = useNavigation();

  return useCallback((category = null, location = null) => {
    navigation.navigate('ReportingModal', {
      initialCategory: category,
      initialLocation: location,
    });
  }, [navigation]);
};

/**
 * Hook to navigate to dashboard
 */
export const useNavigateToDashboard = () => {
  const navigation = useNavigation();

  return useCallback(() => {
    navigation.navigate(TabRoutes.HOME, {
      screen: HomeStackRoutes.DASHBOARD,
    });
  }, [navigation]);
};

/**
 * Hook to navigate to profile/settings
 */
export const useNavigateToProfile = () => {
  const navigation = useNavigation();

  return useCallback((screen = ProfileStackRoutes.PROFILE) => {
    navigation.navigate(TabRoutes.PROFILE, {
      screen,
    });
  }, [navigation]);
};

/**
 * Hook to reset navigation to a specific route
 */
export const useResetNavigation = () => {
  const navigation = useNavigation();

  return useCallback((routeName, params = {}) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      })
    );
  }, [navigation]);
};

/**
 * Hook to go back with optional fallback
 */
export const useGoBack = () => {
  const navigation = useNavigation();

  return useCallback((fallbackRoute = null) => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute);
    }
  }, [navigation]);
};

/**
 * Hook to get current route params
 */
export const useRouteParams = () => {
  const route = useRoute();
  return route.params || {};
};

/**
 * Hook to check if current tab is active
 */
export const useIsTabFocused = (tabName) => {
  const route = useRoute();
  // This is a simplified check - in practice you might need more complex logic
  return route.name === tabName;
};
