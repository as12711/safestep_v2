/**
 * HomeStackNavigator
 * ===================
 * Stack navigator for the Home/Dashboard tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeStackRoutes, defaultScreenOptions } from '../types';
import { DashboardScreen } from '../../screens/dashboard';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={HomeStackRoutes.DASHBOARD}
        component={DashboardScreen}
      />
      {/* Add more screens as needed */}
      {/* <Stack.Screen name={HomeStackRoutes.ROUTE_DETAILS} component={RouteDetailsScreen} /> */}
      {/* <Stack.Screen name={HomeStackRoutes.ACTIVITY_DETAILS} component={ActivityDetailsScreen} /> */}
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
