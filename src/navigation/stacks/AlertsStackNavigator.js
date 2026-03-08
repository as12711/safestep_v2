/**
 * AlertsStackNavigator
 * =====================
 * Stack navigator for the Alerts tab.
 * Shows safety alerts and notifications.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AlertsStackRoutes, defaultScreenOptions } from '../types';
import { PlaceholderScreen } from '../../components/shared';

const Stack = createNativeStackNavigator();

const AlertsListScreen = () => (
  <PlaceholderScreen
    icon="🚨"
    title="Safety Alerts"
    description="Real-time alerts about safety conditions in your area"
  />
);

const AlertsStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions}>
    <Stack.Screen
      name={AlertsStackRoutes.ALERTS_LIST}
      component={AlertsListScreen}
    />
  </Stack.Navigator>
);

export default AlertsStackNavigator;
