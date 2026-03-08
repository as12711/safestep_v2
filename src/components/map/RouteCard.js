/**
 * RouteCard
 * =========
 * Displays a route option with safety score, duration, and distance.
 * Core component for route selection in SafeStep.
 */

import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/designSystem';
import SafetyScoreBadge from '../ui/SafetyScoreBadge';

const {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  getSafetyColor,
  getSafetyLabel,
} = theme;

const RouteCard = memo(({
  route,
  isSelected = false,
  isRecommended = false,
  onSelect,
  onPreview,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const {
    id,
    safetyScore = 75,
    duration = 15,         // minutes
    distance = 0.8,        // miles
    alerts = [],           // active alerts on route
    viaStreets = [],       // main streets
    isAccessible = true,
    hasLighting = true,
    crowdLevel = 'moderate',
  } = route || {};

  const safetyColor = getSafetyColor(safetyScore);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect?.(route);
  }, [route, onSelect]);

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const formatDistance = (miles) => {
    if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
    return `${miles.toFixed(1)} mi`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.container,
          isSelected && styles.containerSelected,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {/* Main content */}
        <View style={styles.content}>
          {/* Left: Safety score */}
          <View style={styles.safetySection}>
            <SafetyScoreBadge
              score={safetyScore}
              size="medium"
              showLabel={true}
              showGlow={isSelected}
            />
          </View>

          {/* Center: Route info */}
          <View style={styles.infoSection}>
            {/* Duration and distance */}
            <View style={styles.primaryInfo}>
              <Text style={styles.duration}>{formatDuration(duration)}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.distance}>{formatDistance(distance)}</Text>
              {isRecommended && (
                <View style={styles.recommendedPill}>
                  <Text style={styles.recommendedPillText}>★ Best</Text>
                </View>
              )}
            </View>

            {/* Via streets */}
            {viaStreets.length > 0 && (
              <Text style={styles.viaText} numberOfLines={1}>
                via {viaStreets.slice(0, 2).join(', ')}
              </Text>
            )}

            {/* Route attributes */}
            <View style={styles.attributes}>
              {hasLighting && (
                <AttributeChip icon="💡" label="Well-lit" positive />
              )}
              {crowdLevel === 'busy' && (
                <AttributeChip icon="👥" label="Busy area" positive />
              )}
              {crowdLevel === 'quiet' && (
                <AttributeChip icon="🤫" label="Quiet" />
              )}
              {isAccessible && (
                <AttributeChip icon="♿" label="Accessible" />
              )}
            </View>

            {/* Alerts on route */}
            {alerts.length > 0 && (
              <View style={styles.alertsContainer}>
                {alerts.slice(0, 2).map((alert, index) => (
                  <View key={index} style={styles.alertItem}>
                    <Text style={styles.alertIcon}>{alert.icon || '⚠️'}</Text>
                    <Text style={styles.alertText} numberOfLines={1}>
                      {alert.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right: Action indicator */}
          <View style={styles.actionSection}>
            <View style={[
              styles.selectIndicator,
              isSelected && styles.selectIndicatorActive,
            ]}>
              {isSelected ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <View style={styles.selectDot} />
              )}
            </View>
          </View>
        </View>

        {/* Selection border */}
        {isSelected && (
          <View style={[styles.selectionBorder, { borderColor: safetyColor }]} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

const AttributeChip = memo(({ icon, label, positive }) => (
  <View style={[styles.attributeChip, positive && styles.attributeChipPositive]}>
    <Text style={styles.attributeIcon}>{icon}</Text>
    <Text style={[styles.attributeLabel, positive && styles.attributeLabelPositive]}>
      {label}
    </Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.ui.border,
    overflow: 'hidden',
    ...shadows.sm,
  },

  containerSelected: {
    backgroundColor: colors.bg.elevated,
    ...shadows.md,
  },

  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 2,
    pointerEvents: 'none',
  },

  recommendedPill: {
    backgroundColor: colors.safety.safeMuted,
    borderRadius: radius.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },

  recommendedPillText: {
    ...typography.labelSmall,
    color: colors.safety.safe,
    fontWeight: '700',
    fontSize: 10,
  },

  // Main content
  content: {
    flexDirection: 'row',
    padding: spacing.md,
  },

  // Safety section
  safetySection: {
    marginRight: spacing.md,
  },

  // Info section
  infoSection: {
    flex: 1,
  },

  primaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  duration: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },

  dot: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },

  distance: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },

  viaText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },

  // Attributes
  attributes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },

  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  attributeChipPositive: {
    backgroundColor: colors.safety.safeMuted,
  },

  attributeIcon: {
    fontSize: 10,
    marginRight: 3,
  },

  attributeLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  attributeLabelPositive: {
    color: colors.safety.safe,
  },

  // Alerts
  alertsContainer: {
    marginTop: spacing.xs,
  },

  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },

  alertIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },

  alertText: {
    ...typography.bodySmall,
    color: colors.safety.caution,
    flex: 1,
  },

  // Action section
  actionSection: {
    justifyContent: 'center',
    marginLeft: spacing.md,
  },

  selectIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectIndicatorActive: {
    backgroundColor: colors.safety.safe,
    borderColor: colors.safety.safe,
  },

  selectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ui.border,
  },

  checkmark: {
    ...typography.labelMedium,
    color: colors.bg.primary,
    fontWeight: '700',
  },
});

AttributeChip.displayName = 'AttributeChip';
RouteCard.displayName = 'RouteCard';

export default RouteCard;
