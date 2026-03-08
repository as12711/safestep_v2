/**
 * MainTabNavigator
 * =================
 * Bottom tab navigation with custom tab bar component.
 * Handles the 5 main sections: Home, Community, Navigate, Alerts, Profile.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme/designSystem';
import { TabRoutes } from './types';
import BottomNavBar from '../components/navigation/BottomNavBar';

// Stack navigators for each tab
import HomeStackNavigator from './stacks/HomeStackNavigator';
import CommunityStackNavigator from './stacks/CommunityStackNavigator';
import NavigateStackNavigator from './stacks/NavigateStackNavigator';
import AlertsStackNavigator from './stacks/AlertsStackNavigator';
import ProfileStackNavigator from './stacks/ProfileStackNavigator';

const { colors } = theme;

const Tab = createBottomTabNavigator();

// Custom tab bar component that uses our BottomNavBar
const CustomTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  // Map route names to our tab structure
  const getActiveTab = () => {
    const routeName = state.routes[state.index].name;
    switch (routeName) {
      case TabRoutes.HOME: return 'home';
      case TabRoutes.COMMUNITY: return 'community';
      case TabRoutes.NAVIGATE: return 'navigate';
      case TabRoutes.ALERTS: return 'alerts';
      case TabRoutes.PROFILE: return 'profile';
      default: return 'home';
    }
  };

  const handleTabPress = useCallback((tab) => {
    switch (tab) {
      case 'home':
        navigation.navigate(TabRoutes.HOME);
        break;
      case 'community':
        navigation.navigate(TabRoutes.COMMUNITY);
        break;
      case 'navigate':
        navigation.navigate(TabRoutes.NAVIGATE);
        break;
      case 'alerts':
        navigation.navigate(TabRoutes.ALERTS);
        break;
      case 'profile':
        navigation.navigate(TabRoutes.PROFILE);
        break;
    }
  }, [navigation]);

  const handleNavigatePress = useCallback(() => {
    // Navigate to the main map/navigation screen
    navigation.navigate(TabRoutes.NAVIGATE);
  }, [navigation]);

  const handleReportPress = useCallback(() => {
    // Open the reporting modal
    navigation.navigate('ReportingModal');
  }, [navigation]);

  return (
    <BottomNavBar
      activeTab={getActiveTab()}
      onTabPress={handleTabPress}
      onNavigatePress={handleNavigatePress}
      onReportPress={handleReportPress}
      isNavigating={false} // This could be connected to navigation state
      alertCount={3} // This could be connected to alerts state
    />
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      initialRouteName={TabRoutes.HOME}
    >
      <Tab.Screen
        name={TabRoutes.HOME}
        component={HomeStackNavigator}
      />
      <Tab.Screen
        name={TabRoutes.COMMUNITY}
        component={CommunityStackNavigator}
      />
      <Tab.Screen
        name={TabRoutes.NAVIGATE}
        component={NavigateStackNavigator}
      />
      <Tab.Screen
        name={TabRoutes.ALERTS}
        component={AlertsStackNavigator}
      />
      <Tab.Screen
        name={TabRoutes.PROFILE}
        component={ProfileStackNavigator}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
