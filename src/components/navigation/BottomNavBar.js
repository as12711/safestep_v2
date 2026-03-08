/**
 * BottomNavBar
 * ============
 * Primary navigation bar with floating action button.
 * Inspired by Waze/Citizen but with SafeStep's Urban Guardian aesthetic.
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/designSystem';
import { usePressAnimation } from '../../hooks';

const { colors, typography, spacing, radius, shadows, layout } = theme;

// Tab configuration
const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'community', label: 'Community', icon: '👥' },
  { id: 'navigate', label: '', icon: null, isFab: true },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

const TabItem = memo(({ tab, isActive, onPress, alertCount }) => {
  const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation({ pressedScale: 0.9 });

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(tab.id);
  }, [tab.id, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={[
            styles.tabIcon,
            isActive && styles.tabIconActive,
          ]}>
            {tab.icon}
          </Text>

          {/* Alert badge */}
          {tab.id === 'alerts' && alertCount > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {alertCount > 9 ? '9+' : alertCount}
              </Text>
            </View>
          )}
        </View>

        <Text style={[
          styles.tabLabel,
          isActive && styles.tabLabelActive,
        ]}>
          {tab.label}
        </Text>

        {/* Active indicator */}
        {isActive && <View style={styles.activeIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
});

const FloatingActionButton = memo(({ onPress, isNavigating }) => {
  const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation({ pressedScale: 0.9 });

  // Pulse animation when navigating
  useEffect(() => {
    if (isNavigating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isNavigating, scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.fabOuter,
            { transform: [{ scale: scaleAnim }] },
            isNavigating && styles.fabNavigating,
          ]}
        >
          <LinearGradient
            colors={
              isNavigating
                ? [colors.safety.safe, colors.safety.moderate]
                : [colors.safety.safe, '#D4940B']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <View style={styles.fabInner}>
              <Text style={styles.fabIcon}>
                {isNavigating ? '🧭' : '🚶'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Label below FAB */}
      <Text style={styles.fabLabel}>
        {isNavigating ? 'Navigating' : 'Navigate'}
      </Text>
    </View>
  );
});

const BottomNavBar = memo(({
  activeTab = 'home',
  onTabPress,
  onNavigatePress,
  isNavigating = false,
  alertCount = 0,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Background blur effect */}
      <View style={styles.background} />

      {/* Navigation items */}
      <View style={styles.navContent}>
        {TABS.map((tab) => {
          if (tab.isFab) {
            return (
              <FloatingActionButton
                key={tab.id}
                onPress={onNavigatePress}
                isNavigating={isNavigating}
              />
            );
          }

          return (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={onTabPress}
              alertCount={tab.id === 'alerts' ? alertCount : 0}
            />
          );
        })}
      </View>

      {/* Safe area spacer for iOS */}
      {Platform.OS === 'ios' && <View style={styles.safeAreaSpacer} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
  },

  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    height: 48,
  },

  // Tab item styles
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },

  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },

  iconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabIcon: {
    fontSize: 18,
    opacity: 0.5,
  },

  tabIconActive: {
    opacity: 1,
  },

  tabLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  tabLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },

  activeIndicator: {
    position: 'absolute',
    top: -spacing.sm,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.safety.safe,
  },

  // Alert badge
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.safety.alert,
    borderRadius: radius.round,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  alertBadgeText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 10,
  },

  // Floating action button
  fabContainer: {
    alignItems: 'center',
    marginTop: -18,
  },

  fabOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    ...shadows.lg,
  },

  fabNavigating: {
    ...shadows.safetyGlow,
  },

  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabIcon: {
    fontSize: 22,
  },

  fabLabel: {
    ...typography.labelSmall,
    color: colors.safety.safe,
    marginTop: spacing.xs,
    fontWeight: '600',
  },

  safeAreaSpacer: {
    height: layout.safeArea.bottom,
  },
});

TabItem.displayName = 'TabItem';
FloatingActionButton.displayName = 'FloatingActionButton';
BottomNavBar.displayName = 'BottomNavBar';

export default BottomNavBar;
