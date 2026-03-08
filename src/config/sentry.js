/**
 * Sentry Configuration
 * ====================
 * Error tracking and crash reporting for SafeStep
 */

import * as Sentry from '@sentry/react-native';
import { ENV, isProduction, isDevelopment } from './env';

// Sentry DSN - will be set via environment variable
const SENTRY_DSN = ENV.SENTRY_DSN || '';

/**
 * Initialize Sentry
 * Call this at app startup before any other code
 */
export const initializeSentry = () => {
  if (!SENTRY_DSN) {
    if (isDevelopment()) {
      console.log('[Sentry] No DSN configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment configuration
    environment: isProduction() ? 'production' : 'development',

    // Release tracking
    release: `safestep@${ENV.APP_VERSION}`,

    // Only send errors in production by default
    enabled: isProduction() || ENV.DEBUG_MODE,

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,

    // Sample rate for performance transactions
    tracesSampleRate: isProduction() ? 0.2 : 1.0,

    // Attach stack traces to all messages
    attachStacktrace: true,

    // Don't send PII by default
    sendDefaultPii: false,

    // Before send hook - filter or modify events
    beforeSend(event, hint) {
      // Filter out certain errors if needed
      const error = hint?.originalException;

      // Don't send network errors in development
      if (isDevelopment() && error?.message?.includes('Network request failed')) {
        return null;
      }

      return event;
    },

    // Integrations
    integrations: [
      Sentry.reactNativeTracingIntegration(),
    ],
  });

  if (isDevelopment()) {
    console.log('[Sentry] Initialized successfully');
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (error, context = {}) => {
  if (!SENTRY_DSN && isDevelopment()) {
    console.error('[Sentry] Would capture exception:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (!SENTRY_DSN && isDevelopment()) {
    console.log(`[Sentry] Would capture ${level}:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
export const setUser = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Don't include sensitive info like names
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (category, message, data = {}, level = 'info') => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
  });
};

/**
 * Set tag for filtering in Sentry dashboard
 */
export const setTag = (key, value) => {
  Sentry.setTag(key, value);
};

/**
 * Wrap component with Sentry error boundary
 */
export const withSentryErrorBoundary = Sentry.wrap;

/**
 * Navigation integration for tracking screen views
 */
export const sentryNavigationIntegration = Sentry.reactNavigationIntegration;

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  withSentryErrorBoundary,
  sentryNavigationIntegration,
};
