/**
 * SafeStep
 * =========
 * Pedestrian Safety Navigation App
 * "Waze for pedestrians"
 *
 * Routes users through safer streets using crowdsourced safety data,
 * street lighting information, and community reports.
 */

import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

import { AppNavigator } from './src/navigation';
import { SafeStepProviders } from './src/contexts';
import { theme } from './src/theme/designSystem';
import { initializeSentry } from './src/config/sentry';

// Initialize Sentry as early as possible
initializeSentry();

const { colors } = theme;

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// Location permissions are handled by locationService via AppContext.
// See src/contexts/AppContext.js and src/services/locationService.js.

const App = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SafeStepProviders>
          <View style={styles.container}>
            <AppNavigator />
          </View>
        </SafeStepProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
});

// Wrap with Sentry for automatic error capturing
export default Sentry.wrap(App);
