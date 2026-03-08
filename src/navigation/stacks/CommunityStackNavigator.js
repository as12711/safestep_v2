/**
 * CommunityStackNavigator
 * ========================
 * Stack navigator for the Community tab.
 * Shows community feed, reports, and contributions.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CommunityStackRoutes, defaultScreenOptions } from '../types';
import { PlaceholderScreen } from '../../components/shared';

const Stack = createNativeStackNavigator();

const CommunityFeedScreen = () => (
  <PlaceholderScreen
    icon="👥"
    title="Community Feed"
    description="See reports and updates from your community"
  />
);

const CommunityStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultScreenOptions}>
    <Stack.Screen
      name={CommunityStackRoutes.FEED}
      component={CommunityFeedScreen}
    />
  </Stack.Navigator>
);

export default CommunityStackNavigator;
