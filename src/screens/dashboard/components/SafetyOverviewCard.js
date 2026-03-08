/**
 * SafetyOverviewCard
 * ===================
 * Hero card showing overall safety score and streak.
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, getSafetyColor, getSafetyLabel } = theme;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SafetyOverviewCard = memo(({
  currentScore = 82,
  streakDays = 14,
  safeArrivals = 47,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const safetyColor = getSafetyColor(currentScore);
  const safetyLabel = getSafetyLabel(currentScore);

  useEffect(() => {
    // Animate progress ring
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: currentScore / 100,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();

    // Continuous subtle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [currentScore]);

  // Circle progress calculations
  const size = 140;
  const strokeWidth = 10;
  const circleRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * circleRadius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={[colors.bg.tertiary, colors.bg.elevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Left side - Score ring */}
        <Animated.View style={[
          styles.scoreContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}>
          {/* Background ring */}
          <Svg width={size} height={size} style={styles.svg}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={circleRadius}
              stroke={colors.ui.border}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={circleRadius}
              stroke={safetyColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>

          {/* Score text overlay */}
          <View style={styles.scoreOverlay}>
            <Text style={[styles.scoreValue, { color: safetyColor }]}>
              {currentScore}
            </Text>
            <Text style={styles.scoreLabel}>{safetyLabel}</Text>
          </View>

          {/* Glow effect */}
          <View style={[styles.scoreGlow, { backgroundColor: safetyColor }]} />
        </Animated.View>

        {/* Right side - Stats */}
        <View style={styles.statsContainer}>
          {/* Streak */}
          <View style={styles.statRow}>
            <View style={[styles.statIcon, styles.statIconStreak]}>
              <Text style={styles.statEmoji}>🔥</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{streakDays} days</Text>
              <Text style={styles.statLabel}>Safety streak</Text>
            </View>
          </View>

          {/* Safe arrivals */}
          <View style={styles.statRow}>
            <View style={[styles.statIcon, styles.statIconArrivals]}>
              <Text style={styles.statEmoji}>✓</Text>
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{safeArrivals}</Text>
              <Text style={styles.statLabel}>Safe arrivals</Text>
            </View>
          </View>

          {/* Status message */}
          <View style={styles.statusMessage}>
            <Text style={styles.statusIcon}>🛡️</Text>
            <Text style={styles.statusText}>
              You're doing great! Keep walking safely.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },

  gradient: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.glassBorder,
    borderRadius: radius.xxl,
  },

  // Score ring
  scoreContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  svg: {
    position: 'absolute',
  },

  scoreOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreValue: {
    ...typography.displayMedium,
    fontWeight: '700',
  },

  scoreLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  scoreGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.15,
  },

  // Stats
  statsContainer: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'center',
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  statIconStreak: {
    backgroundColor: colors.safety.cautionMuted,
  },

  statIconArrivals: {
    backgroundColor: colors.safety.safeMuted,
  },

  statEmoji: {
    fontSize: 16,
  },

  statContent: {
    flex: 1,
  },

  statValue: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  statLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  // Status message
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.safety.safeMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },

  statusIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  statusText: {
    ...typography.labelSmall,
    color: colors.safety.safe,
    flex: 1,
  },
});

SafetyOverviewCard.displayName = 'SafetyOverviewCard';

export default SafetyOverviewCard;
