/**
 * GPS Accuracy Banner Component
 * =============================
 * Modern, non-intrusive GPS status indicator with actionable suggestions.
 */

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Platform,
} from 'react-native';

import { COLORS } from '../theme/colors';
import { LOCATION_STATUS } from '../services/locationService';

/**
 * GPS Signal Bar visualization
 */
const SignalBars = memo(({ accuracy, status }) => {
  const getBarsActive = () => {
    if (status === LOCATION_STATUS.NO_SIGNAL || status === LOCATION_STATUS.ERROR) return 0;
    if (status === LOCATION_STATUS.SEARCHING || status === LOCATION_STATUS.INITIALIZING) return 1;
    if (!accuracy) return 0;
    if (accuracy <= 5) return 4;
    if (accuracy <= 15) return 3;
    if (accuracy <= 50) return 2;
    return 1;
  };

  const activeBars = getBarsActive();
  const barColor = activeBars >= 3 ? COLORS.safe : activeBars >= 2 ? COLORS.warn : COLORS.danger;

  return (
    <View style={styles.signalBars}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[
            styles.signalBar,
            { height: 4 + bar * 4 },
            bar <= activeBars && { backgroundColor: barColor },
          ]}
        />
      ))}
    </View>
  );
});

SignalBars.displayName = 'SignalBars';

/**
 * Pulsing indicator for searching state
 */
const PulsingDot = memo(() => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        { transform: [{ scale: pulseAnim }] },
      ]}
    />
  );
});

PulsingDot.displayName = 'PulsingDot';

/**
 * Main GPS Accuracy Banner
 */
const GPSAccuracyBanner = memo(({
  accuracy,
  status,
  onDismiss,
  isNavigating = false,
  showAlways = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Determine if we should show the banner
  const shouldShow = useCallback(() => {
    if (dismissed && !showAlways) return false;
    if (status === LOCATION_STATUS.PERMISSION_DENIED) return true;
    if (status === LOCATION_STATUS.SERVICES_DISABLED) return true;
    if (status === LOCATION_STATUS.NO_SIGNAL) return true;
    if (status === LOCATION_STATUS.ERROR) return true;
    if (status === LOCATION_STATUS.SEARCHING) return true;
    if (status === LOCATION_STATUS.LOW_ACCURACY && accuracy > 50) return true;
    if (isNavigating && accuracy > 30) return true;
    return false;
  }, [accuracy, status, dismissed, showAlways, isNavigating]);

  const visible = shouldShow();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Get status info
  const getStatusInfo = useCallback(() => {
    switch (status) {
      case LOCATION_STATUS.PERMISSION_DENIED:
        return {
          icon: '🚫',
          title: 'Location Access Needed',
          subtitle: 'Enable location in settings for navigation',
          color: COLORS.danger,
          action: 'Open Settings',
          onAction: openSettings,
        };
      case LOCATION_STATUS.SERVICES_DISABLED:
        return {
          icon: '📵',
          title: 'Location Services Off',
          subtitle: 'Turn on location services to use SafeStep',
          color: COLORS.danger,
          action: 'Open Settings',
          onAction: openSettings,
        };
      case LOCATION_STATUS.NO_SIGNAL:
        return {
          icon: '📡',
          title: 'No GPS Signal',
          subtitle: 'Move to an open area for better signal',
          color: COLORS.danger,
          tips: [
            'Move away from tall buildings',
            'Go outside or near a window',
            'Wait 30 seconds for signal lock',
          ],
        };
      case LOCATION_STATUS.SEARCHING:
      case LOCATION_STATUS.INITIALIZING:
        return {
          icon: '🔍',
          title: 'Finding Your Location',
          subtitle: 'This may take a few moments...',
          color: COLORS.warn,
          isSearching: true,
        };
      case LOCATION_STATUS.LOW_ACCURACY:
        return {
          icon: '⚠️',
          title: accuracy ? `Low Accuracy (±${Math.round(accuracy)}m)` : 'Low GPS Accuracy',
          subtitle: isNavigating 
            ? 'Navigation may be less precise' 
            : 'Your location may be approximate',
          color: COLORS.warn,
          tips: [
            'Move to an open area',
            'Ensure Wi-Fi is enabled',
            'Check for obstructions',
          ],
        };
      case LOCATION_STATUS.ERROR:
        return {
          icon: '❌',
          title: 'Location Error',
          subtitle: 'Unable to determine your location',
          color: COLORS.danger,
          action: 'Retry',
        };
      default:
        return null;
    }
  }, [status, accuracy, isNavigating, openSettings]);

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={[styles.banner, { borderColor: info.color + '40' }]}>
        {/* Main Content */}
        <TouchableOpacity
          style={styles.mainContent}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            {info.isSearching ? (
              <PulsingDot />
            ) : (
              <Text style={styles.icon}>{info.icon}</Text>
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{info.title}</Text>
            <Text style={styles.subtitle}>{info.subtitle}</Text>
          </View>

          <View style={styles.rightSection}>
            <SignalBars accuracy={accuracy} status={status} />
            {info.tips && (
              <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Tips */}
        {expanded && info.tips && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Try these:</Text>
            {info.tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Button */}
        {info.action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: info.color }]}
            onPress={info.onAction}
          >
            <Text style={styles.actionText}>{info.action}</Text>
          </TouchableOpacity>
        )}

        {/* Dismiss Button */}
        {!info.action && status !== LOCATION_STATUS.SEARCHING && (
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

GPSAccuracyBanner.displayName = 'GPSAccuracyBanner';

/**
 * Compact GPS indicator for navigation bar
 */
export const GPSStatusPill = memo(({ accuracy, status, onPress }) => {
  const getConfig = () => {
    if (status === LOCATION_STATUS.NO_SIGNAL || status === LOCATION_STATUS.ERROR) {
      return { color: COLORS.danger, icon: '📡', text: 'No GPS' };
    }
    if (status === LOCATION_STATUS.SEARCHING) {
      return { color: COLORS.warn, icon: '🔍', text: 'Searching' };
    }
    if (!accuracy) return { color: COLORS.text3, icon: '📍', text: 'GPS' };
    if (accuracy <= 10) return { color: COLORS.safe, icon: '✓', text: 'GPS' };
    if (accuracy <= 30) return { color: COLORS.safe, icon: '✓', text: `±${Math.round(accuracy)}m` };
    if (accuracy <= 50) return { color: COLORS.warn, icon: '⚠️', text: `±${Math.round(accuracy)}m` };
    return { color: COLORS.danger, icon: '⚠️', text: `±${Math.round(accuracy)}m` };
  };

  const config = getConfig();

  return (
    <TouchableOpacity
      style={[styles.pill, { borderColor: config.color + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.pillIcon}>{config.icon}</Text>
      <Text style={[styles.pillText, { color: config.color }]}>{config.text}</Text>
    </TouchableOpacity>
  );
});

GPSStatusPill.displayName = 'GPSStatusPill';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.warn,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'center',
    gap: 6,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 20,
  },
  signalBar: {
    width: 4,
    backgroundColor: COLORS.border,
    borderRadius: 1,
  },
  expandIcon: {
    fontSize: 10,
    color: COLORS.text3,
  },
  tipsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text2,
    marginBottom: 8,
    marginTop: 10,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tipBullet: {
    fontSize: 12,
    color: COLORS.text3,
    marginRight: 6,
    width: 10,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.text3,
    flex: 1,
  },
  actionButton: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dismissText: {
    fontSize: 13,
    color: COLORS.text3,
  },
  // Pill styles
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  pillIcon: {
    fontSize: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GPSAccuracyBanner;
