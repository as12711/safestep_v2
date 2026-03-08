/**
 * OnboardingNavigator
 * ====================
 * Navigator for the onboarding flow.
 * Wraps the OnboardingScreen which handles its own internal navigation.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingStackRoutes, defaultScreenOptions } from './types';
import { OnboardingScreen } from '../screens/onboarding';

const Stack = createNativeStackNavigator();

const OnboardingNavigator = ({ onComplete }) => {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="OnboardingFlow">
        {(props) => (
          <OnboardingScreen
            {...props}
            onComplete={onComplete}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
