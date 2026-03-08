/**
 * NavigateStackNavigator
 * =======================
 * Stack navigator for the main Map/Navigation tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { NavigateStackRoutes, defaultScreenOptions } from '../types';
import MapScreen from '../../screens/MapScreen';

const Stack = createNativeStackNavigator();

const NavigateStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={NavigateStackRoutes.MAP}
        component={MapScreen}
      />
      {/* Add more screens as needed */}
      {/* <Stack.Screen name={NavigateStackRoutes.ROUTE_PREVIEW} component={RoutePreviewScreen} /> */}
      {/* <Stack.Screen name={NavigateStackRoutes.ACTIVE_NAVIGATION} component={ActiveNavigationScreen} /> */}
      {/* <Stack.Screen name={NavigateStackRoutes.SEARCH} component={SearchScreen} /> */}
    </Stack.Navigator>
  );
};

export default NavigateStackNavigator;
