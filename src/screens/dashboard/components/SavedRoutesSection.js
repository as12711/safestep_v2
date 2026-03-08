/**
 * SavedRoutesSection
 * ===================
 * Horizontal scroll of saved/favorite routes.
 */

import React, { memo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, getSafetyColor, getSafetyLabel } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const SavedRoutesSection = memo(({ routes, onRouteSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={CARD_WIDTH + spacing.md}
      decelerationRate="fast"
    >
      {routes.map((route, index) => (
        <RouteCard
          key={route.id}
          route={route}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRouteSelect?.(route);
          }}
          index={index}
        />
      ))}

      {/* Add new route card */}
      <TouchableOpacity style={styles.addCard}>
        <View style={styles.addIconContainer}>
          <Text style={styles.addIcon}>+</Text>
        </View>
        <Text style={styles.addLabel}>Save a new route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

const RouteCard = memo(({ route, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const safetyColor = getSafetyColor(route.safetyScore);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.routeCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Favorite badge */}
        {route.isFavorite && (
          <View style={styles.favoriteBadge}>
            <Text style={styles.favoriteIcon}>⭐</Text>
          </View>
        )}

        {/* Route name */}
        <Text style={styles.routeName}>{route.name}</Text>

        {/* From/To */}
        <View style={styles.routeDetails}>
          <View style={styles.routePoint}>
            <View style={[styles.pointDot, styles.pointDotFrom]} />
            <Text style={styles.pointLabel}>{route.from}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.pointDot, styles.pointDotTo]} />
            <Text style={styles.pointLabel}>{route.to}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🚶</Text>
            <Text style={styles.statText}>{route.duration} min</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📏</Text>
            <Text style={styles.statText}>{route.distance} mi</Text>
          </View>
          <View style={[
            styles.safetyBadge,
            { backgroundColor: safetyColor + '20' },
          ]}>
            <Text style={[styles.safetyScore, { color: safetyColor }]}>
              {route.safetyScore}
            </Text>
            <Text style={[styles.safetyLabel, { color: safetyColor }]}>
              {getSafetyLabel(route.safetyScore)}
            </Text>
          </View>
        </View>

        {/* Start button */}
        <View style={[styles.startButton, { backgroundColor: safetyColor }]}>
          <Text style={styles.startButtonText}>Start Walking</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: spacing.xl,
    gap: spacing.md,
  },

  routeCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    ...shadows.sm,
  },

  favoriteBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },

  favoriteIcon: {
    fontSize: 16,
  },

  routeName: {
    ...typography.titleLarge,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Route details
  routeDetails: {
    marginBottom: spacing.lg,
  },

  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },

  pointDotFrom: {
    backgroundColor: colors.community.primary,
  },

  pointDotTo: {
    backgroundColor: colors.safety.safe,
  },

  pointLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },

  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.ui.border,
    marginLeft: 4,
    marginVertical: 4,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  statText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: 'auto',
  },

  safetyScore: {
    ...typography.labelMedium,
    fontWeight: '700',
    marginRight: spacing.xs,
  },

  safetyLabel: {
    ...typography.labelSmall,
  },

  // Start button
  startButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  startButtonText: {
    ...typography.labelLarge,
    color: colors.bg.primary,
    fontWeight: '600',
  },

  // Add card
  addCard: {
    width: CARD_WIDTH * 0.5,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ui.border,
    borderStyle: 'dashed',
  },

  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  addIcon: {
    fontSize: 24,
    color: colors.text.secondary,
  },

  addLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

RouteCard.displayName = 'RouteCard';
SavedRoutesSection.displayName = 'SavedRoutesSection';

export default SavedRoutesSection;
