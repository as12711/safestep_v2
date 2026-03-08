/**
 * AppNavigator
 * =============
 * Main application navigator with authentication flow.
 * Handles onboarding, main tabs, and modal presentations.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../theme/designSystem';
import { RootRoutes, defaultScreenOptions, modalScreenOptions } from './types';
import MainTabNavigator from './MainTabNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import ReportingNavigator from './ReportingNavigator';

const { colors } = theme;

const Stack = createNativeStackNavigator();

// Storage keys
const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@safestep_onboarding_complete',
  USER_TOKEN: '@safestep_user_token',
};

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check initial state
  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      const [onboardingStatus, userToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
      ]);

      setIsOnboardingComplete(onboardingStatus === 'true');
      setIsAuthenticated(!!userToken);
    } catch (error) {
      console.error('Error checking initial state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  // Navigation theme (fonts required by React Navigation v7)
  const navigationTheme = {
    dark: true,
    colors: {
      primary: colors.community.primary,
      background: colors.bg.primary,
      card: colors.bg.secondary,
      text: colors.text.primary,
      border: colors.ui.border,
      notification: colors.safety.alert,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '900' },
    },
  };

  // Loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
        <ActivityIndicator size="large" color={colors.community.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
      <Stack.Navigator
        screenOptions={{
          ...defaultScreenOptions,
          contentStyle: { backgroundColor: colors.bg.primary },
        }}
      >
        {!isOnboardingComplete ? (
          // Onboarding flow
          <Stack.Screen
            name={RootRoutes.ONBOARDING}
            options={{ headerShown: false }}
          >
            {(props) => (
              <OnboardingNavigator
                {...props}
                onComplete={handleOnboardingComplete}
              />
            )}
          </Stack.Screen>
        ) : (
          // Main app
          <>
            <Stack.Screen
              name={RootRoutes.MAIN}
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />

            {/* Modal screens accessible from anywhere */}
            <Stack.Screen
              name="ReportingModal"
              component={ReportingNavigator}
              options={modalScreenOptions}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
  },
});

export default AppNavigator;
