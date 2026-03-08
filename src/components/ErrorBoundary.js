/**
 * Error Boundary Component
 * ========================
 * Catches and handles React errors gracefully.
 * Prevents full app crashes and provides recovery options.
 * Integrates with Sentry for crash reporting.
 */

import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { COLORS } from '../theme/colors';
import { captureException, addBreadcrumb } from '../config/sentry';

/**
 * Error fallback UI
 */
const ErrorFallback = ({ error, componentStack, resetError }) => (
  <View style={styles.container}>
    <ScrollView 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.icon}>😵</Text>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.message}>
        The app encountered an unexpected error. Don't worry, your data is safe.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={resetError}>
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error?.message || 'Unknown error'}
            </Text>
          </View>
          {componentStack && (
            <View style={styles.stackBox}>
              <Text style={styles.stackText}>
                {componentStack.slice(0, 500)}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  </View>
);

/**
 * Simple Error Fallback for smaller components
 */
export const SimpleErrorFallback = ({ resetError }) => (
  <View style={styles.simpleContainer}>
    <Text style={styles.simpleIcon}>⚠️</Text>
    <Text style={styles.simpleText}>Something went wrong</Text>
    {resetError && (
      <TouchableOpacity onPress={resetError} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Error Boundary Class Component
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      componentStack: errorInfo?.componentStack,
    });

    // Log to console in development
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to analytics/crash reporting
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    const errorReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    };

    if (__DEV__) {
      console.log('[ErrorBoundary] Error report:', errorReport);
    }

    // Add breadcrumb for context
    addBreadcrumb('error', 'React error boundary caught error', {
      componentStack: errorInfo?.componentStack?.slice(0, 500),
    });

    // Send to Sentry
    captureException(error, {
      componentStack: errorInfo?.componentStack,
      boundaryName: this.props.name || 'ErrorBoundary',
    });
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
    });

    // Call reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error, componentStack } = this.state;
    const { children, FallbackComponent, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            componentStack={componentStack}
            resetError={this.resetError}
          />
        );
      }

      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <ErrorFallback
          error={error}
          componentStack={componentStack}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithErrorBoundary;
};

/**
 * Hook-based error boundary helper
 * Note: This doesn't catch errors in event handlers or async code
 * Use try-catch for those cases
 */
export const useErrorHandler = (givenError) => {
  const [error, setError] = React.useState(null);

  if (givenError) throw givenError;
  if (error) throw error;

  return setError;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 100,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  debugSection: {
    width: '100%',
    marginTop: 32,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: COLORS.dangerDim,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.danger,
  },
  stackBox: {
    backgroundColor: COLORS.surface2,
    padding: 12,
    borderRadius: 8,
  },
  stackText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.text3,
  },
  // Simple fallback styles
  simpleContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    margin: 16,
  },
  simpleIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  simpleText: {
    fontSize: 14,
    color: COLORS.text2,
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryDim,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default ErrorBoundary;
