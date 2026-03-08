/**
 * SafeStep Contexts
 * =================
 * Export all context providers and hooks
 */

// Auth Context
export { AuthProvider, useAuth } from './AuthContext';
export { default as AuthContext } from './AuthContext';

// Settings Context
export { SettingsProvider, useSettings, DEFAULT_SETTINGS } from './SettingsContext';
export { default as SettingsContext } from './SettingsContext';

// App Context
export { AppProvider, useApp } from './AppContext';
export { default as AppContext } from './AppContext';

/**
 * Combined Provider Component
 * Wraps all context providers for easy setup in App.js
 */
import React from 'react';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';
import { AppProvider } from './AppContext';

export const SafeStepProviders = ({ children }) => (
  <AuthProvider>
    <SettingsProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </SettingsProvider>
  </AuthProvider>
);

export default SafeStepProviders;
