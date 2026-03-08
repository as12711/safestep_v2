/**
 * Environment Configuration
 * =========================
 * Centralized environment variable management.
 * Values are loaded from EAS build environment or app.config.js extras.
 */

import Constants from 'expo-constants';

const getEnvVar = (key, fallback = '') => {
  // Check expo config extras first (set by EAS build)
  const expoValue = Constants.expoConfig?.extra?.[key];
  if (expoValue) return expoValue;
  return fallback;
};

// Detect environment
const nodeEnv = getEnvVar('NODE_ENV', __DEV__ ? 'development' : 'production');

export const ENV = {
  // Environment
  NODE_ENV: nodeEnv,

  // Supabase (set via EAS env or .env file -- see .env.example)
  SUPABASE_URL: getEnvVar('SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', ''),

  // Mapbox (set via EAS env or .env file -- see .env.example)
  MAPBOX_ACCESS_TOKEN: getEnvVar('MAPBOX_ACCESS_TOKEN', ''),

  // Sentry (crash reporting)
  SENTRY_DSN: getEnvVar('SENTRY_DSN', ''),

  // App info
  APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),

  // Feature flags
  ENABLE_ANALYTICS: getEnvVar('ENABLE_ANALYTICS', 'true') === 'true',
  DEBUG_MODE: getEnvVar('DEBUG_MODE', __DEV__ ? 'true' : 'false') === 'true',

  // Routing backend
  // Production URL should be set via EAS environment variables
  ROUTING_API_URL: getEnvVar(
    'ROUTING_API_URL',
    __DEV__ ? 'http://localhost:8000' : 'https://api.safestep.app'
  ),
};

export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isProduction = () => ENV.NODE_ENV === 'production';

export const validateEnv = () => {
  const errors = [];
  const warnings = [];

  // Required
  if (!ENV.SUPABASE_URL) errors.push('Missing SUPABASE_URL');
  if (!ENV.SUPABASE_ANON_KEY) errors.push('Missing SUPABASE_ANON_KEY');

  // Recommended
  if (!ENV.MAPBOX_ACCESS_TOKEN) warnings.push('Missing MAPBOX_ACCESS_TOKEN');
  if (!ENV.SENTRY_DSN && isProduction()) warnings.push('Missing SENTRY_DSN for production');
  if (ENV.ROUTING_API_URL.includes('localhost') && isProduction()) {
    warnings.push('ROUTING_API_URL is set to localhost in production');
  }

  return { errors, warnings, isValid: errors.length === 0 };
};

export default ENV;
