/**
 * QuickStats
 * ===========
 * Compact stats row showing key user metrics.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;

const QuickStats = memo(({ stats }) => {
  const fadeAnims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.stagger(80, fadeAnims.map(anim =>
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    )).start();
  }, []);

  const statItems = [
    {
      value: stats.totalWalks,
      label: 'Walks',
      icon: '🚶',
    },
    {
      value: `${stats.totalDistance}`,
      suffix: 'mi',
      label: 'Distance',
      icon: '📏',
    },
    {
      value: stats.reportsSubmitted,
      label: 'Reports',
      icon: '📝',
    },
    {
      value: stats.safeArrivals,
      label: 'Safe',
      icon: '✓',
      isSuccess: true,
    },
  ];

  return (
    <View style={styles.container}>
      {statItems.map((stat, index) => (
        <Animated.View
          key={index}
          style={[
            styles.statItem,
            {
              opacity: fadeAnims[index],
              transform: [{
                translateY: fadeAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              }],
            },
          ]}
        >
          <View style={[
            styles.iconContainer,
            stat.isSuccess && styles.iconContainerSuccess,
          ]}>
            <Text style={[
              styles.icon,
              stat.isSuccess && styles.iconSuccess,
            ]}>
              {stat.icon}
            </Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.value}>
              {stat.value}
              {stat.suffix && <Text style={styles.suffix}>{stat.suffix}</Text>}
            </Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  iconContainerSuccess: {
    backgroundColor: colors.safety.safeMuted,
  },

  icon: {
    fontSize: 16,
  },

  iconSuccess: {
    color: colors.safety.safe,
    fontWeight: '700',
  },

  valueContainer: {
    alignItems: 'center',
  },

  value: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },

  suffix: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: '400',
  },

  label: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});

QuickStats.displayName = 'QuickStats';

export default QuickStats;
