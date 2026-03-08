/**
 * ProfileStackNavigator
 * ======================
 * Stack navigator for the Profile/Settings tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileStackRoutes, defaultScreenOptions } from '../types';
import { ProfileScreen } from '../../screens/profile';

const Stack = createNativeStackNavigator();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={ProfileStackRoutes.PROFILE}
        component={ProfileScreen}
      />
      {/* Add more screens as needed */}
      {/* <Stack.Screen name={ProfileStackRoutes.EDIT_PROFILE} component={EditProfileScreen} /> */}
      {/* <Stack.Screen name={ProfileStackRoutes.SAVED_PLACES} component={SavedPlacesScreen} /> */}
      {/* <Stack.Screen name={ProfileStackRoutes.EMERGENCY_CONTACTS} component={EmergencyContactsScreen} /> */}
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
