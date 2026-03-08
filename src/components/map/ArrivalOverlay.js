/**
 * ArrivalOverlay
 * ==============
 * Full-screen celebration shown when the user reaches their destination.
 * Animates in with a spring entrance and shows walk stats.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, getSafetyColor } = theme;

const ArrivalOverlay = memo(({ route, onDone }) => {
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in backdrop + scale up card
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then pop the check circle
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 180,
        friction: 6,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const safetyColor = getSafetyColor(route?.safetyScore ?? 87);

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>

        {/* Check circle */}
        <Animated.View style={[
          styles.checkCircle,
          { backgroundColor: safetyColor, transform: [{ scale: checkAnim }] },
        ]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>

        <Text style={styles.title}>You've arrived!</Text>
        <Text style={styles.destination}>Washington Square Park</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill icon="🚶" value={`${route?.distance ?? 0.6} mi`} label="walked" />
          <StatPill icon="⏱" value={`${route?.duration ?? 12} min`} label="time" />
          <StatPill
            icon="🛡"
            value={`${route?.safetyScore ?? 87}`}
            label="score"
            valueColor={safetyColor}
          />
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: safetyColor }]}
          onPress={onDone}
          activeOpacity={0.85}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

const StatPill = memo(({ icon, value, label, valueColor }) => (
  <View style={styles.statPill}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, valueColor && { color: valueColor }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },

  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    width: '82%',
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  checkIcon: {
    fontSize: 40,
    color: '#000',
    fontWeight: '800',
    lineHeight: 44,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },

  destination: {
    ...theme.typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },

  statPill: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },

  statValue: {
    ...theme.typography.labelMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 1,
  },

  doneButton: {
    width: '100%',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  doneText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
});

StatPill.displayName = 'StatPill';
ArrivalOverlay.displayName = 'ArrivalOverlay';

export default ArrivalOverlay;
