/**
 * ReportingNavigator
 * ===================
 * Modal navigator for the community reporting flow.
 * Presented as a modal from the main navigation.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { defaultScreenOptions } from './types';
import { ReportingScreen } from '../screens/reporting';

const Stack = createNativeStackNavigator();

const ReportingNavigator = ({ navigation }) => {
  const handleClose = () => {
    navigation.goBack();
  };

  const handleSubmitSuccess = () => {
    // Could show a success toast here
    navigation.goBack();
  };

  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name="ReportingFlow">
        {(props) => (
          <ReportingScreen
            {...props}
            onClose={handleClose}
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default ReportingNavigator;
