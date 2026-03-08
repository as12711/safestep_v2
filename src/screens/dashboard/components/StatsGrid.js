/**
 * StatsGrid
 * ==========
 * Grid of personal statistics cards.
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

const StatsGrid = memo(({ stats }) => {
  const fadeAnims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.stagger(100, fadeAnims.map(anim =>
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
      label: 'Total Walks',
      icon: '🚶',
      color: colors.community.primary,
    },
    {
      value: `${stats.totalDistance} mi`,
      label: 'Distance',
      icon: '📏',
      color: colors.feature.blueLight,
    },
    {
      value: stats.reportsSubmitted,
      label: 'Reports',
      icon: '📝',
      color: colors.safety.caution,
    },
    {
      value: `${stats.averageSafetyScore}%`,
      label: 'Avg Safety',
      icon: '🛡️',
      color: colors.safety.safe,
    },
  ];

  return (
    <View style={styles.container}>
      {statItems.map((stat, index) => (
        <Animated.View
          key={index}
          style={[
            styles.statCard,
            {
              opacity: fadeAnims[index],
              transform: [{
                translateY: fadeAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
            <Text style={styles.icon}>{stat.icon}</Text>
          </View>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  statCard: {
    width: '48%',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  icon: {
    fontSize: 20,
  },

  value: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },

  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
});

StatsGrid.displayName = 'StatsGrid';

export default StatsGrid;
