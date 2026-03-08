/**
 * SafetyScoreBadge
 * ================
 * Visual indicator showing safety score with contextual coloring.
 * Core UI element used throughout SafeStep.
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/designSystem';

const { colors, typography, spacing, radius, getSafetyColor, getSafetyLabel, getSafetyBackground } = theme;

const SafetyScoreBadge = memo(({
  score,
  size = 'medium', // 'small' | 'medium' | 'large'
  showLabel = true,
  showGlow = false,
  animated = true,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  const safetyColor = getSafetyColor(score);
  const safetyLabel = getSafetyLabel(score);
  const safetyBg = getSafetyBackground(score);

  // Animate score changes
  useEffect(() => {
    if (animated) {
      Animated.spring(scoreAnim, {
        toValue: score,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    }
  }, [score, animated]);

  // Pulse animation for lower safety scores
  useEffect(() => {
    if (showGlow && score < 40) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showGlow, score]);

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      score: styles.scoreSmall,
      label: styles.labelSmall,
    },
    medium: {
      container: styles.containerMedium,
      score: styles.scoreMedium,
      label: styles.labelMedium,
    },
    large: {
      container: styles.containerLarge,
      score: styles.scoreLarge,
      label: styles.labelLarge,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Animated.View
      style={[
        styles.container,
        currentSize.container,
        { backgroundColor: safetyBg },
        showGlow && {
          transform: [{ scale: pulseAnim }],
          shadowColor: safetyColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        },
        style,
      ]}
    >
      <View style={styles.scoreContainer}>
        <Text style={[currentSize.score, { color: safetyColor }]}>
          {Math.round(score)}
        </Text>
      </View>

      {showLabel && (
        <Text style={[currentSize.label, { color: safetyColor }]}>
          {safetyLabel}
        </Text>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },

  // Small variant
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 40,
  },
  scoreSmall: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  labelSmall: {
    ...typography.labelSmall,
    marginTop: 2,
  },

  // Medium variant
  containerMedium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 64,
  },
  scoreMedium: {
    ...typography.headlineMedium,
    fontWeight: '700',
  },
  labelMedium: {
    ...typography.labelMedium,
    marginTop: spacing.xs,
  },

  // Large variant
  containerLarge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minWidth: 100,
  },
  scoreLarge: {
    ...typography.displaySmall,
    fontWeight: '700',
  },
  labelLarge: {
    ...typography.labelLarge,
    marginTop: spacing.sm,
  },

  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  scoreMax: {
    ...typography.labelSmall,
    opacity: 0.6,
    marginLeft: 2,
  },
});

SafetyScoreBadge.displayName = 'SafetyScoreBadge';

export default SafetyScoreBadge;
