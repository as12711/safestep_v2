/**
 * NavigationPanel
 * ===============
 * Bottom HUD shown during active navigation. Displays the current turn
 * instruction, next-up preview, distance remaining, and ETA.
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

const { colors, typography, spacing, radius, shadows, layout, getSafetyColor } = theme;

// Map direction keys to arrow characters rendered in the direction circle
const DIR_ARROW = {
  straight: '↑',
  left:     '←',
  right:    '→',
  arrive:   '✓',
};

const NavigationPanel = memo(({
  route,
  navStep = 0,
  onEnd,
}) => {
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const instructions = route?.instructions ?? [];
  const totalSteps   = Math.max(1, instructions.length - 1);
  const current      = instructions[navStep];
  const next         = instructions[navStep + 1];

  const stepsLeft       = Math.max(0, totalSteps - navStep);
  const progressFrac    = navStep / totalSteps;
  const distRemaining   = ((route?.distance ?? 0.6) * (1 - progressFrac)).toFixed(1);
  const minsRemaining   = Math.max(1, Math.round(stepsLeft * 0.45));
  const safetyColor     = getSafetyColor(route?.safetyScore ?? 75);

  const dir    = current?.dir ?? 'straight';
  const arrow  = DIR_ARROW[dir] ?? '↑';
  const isArrive = dir === 'arrive';

  return (
    <Animated.View
      style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
    >
      {/* Instruction row */}
      <View style={styles.instructionRow}>
        <View style={[
          styles.dirCircle,
          { backgroundColor: isArrive ? colors.safety.safe : safetyColor },
        ]}>
          <Text style={styles.dirArrow}>{arrow}</Text>
        </View>

        <View style={styles.instructionTextBlock}>
          <Text style={styles.instructionMain} numberOfLines={2}>
            {current?.text ?? 'Continue to destination'}
          </Text>
          {next && !isArrive && (
            <Text style={styles.instructionNext} numberOfLines={1}>
              Then: {next.text}
            </Text>
          )}
        </View>
      </View>

      {/* Stats + end button */}
      <View style={styles.statsRow}>
        <View style={styles.statsLeft}>
          <StatItem value={`${distRemaining} mi`} label="remaining" />
          <View style={styles.statDivider} />
          <StatItem value={`${minsRemaining} min`} label="left" />
          <View style={styles.statDivider} />
          <StatItem
            value={`${route?.safetyScore ?? 75}`}
            label="score"
            valueStyle={{ color: safetyColor }}
          />
        </View>

        <TouchableOpacity style={styles.endButton} onPress={onEnd} activeOpacity={0.8}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const StatItem = memo(({ value, label, valueStyle }) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, valueStyle]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 48 + layout.safeArea.bottom,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.lg,
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
  },

  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  dirCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },

  dirArrow: {
    fontSize: 26,
    color: '#000',
    fontWeight: '800',
    lineHeight: 30,
  },

  instructionTextBlock: {
    flex: 1,
  },

  instructionMain: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 26,
    marginBottom: 3,
  },

  instructionNext: {
    ...theme.typography.bodySmall,
    color: colors.text.tertiary,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
    paddingTop: spacing.md,
  },

  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    ...theme.typography.labelMedium,
    color: colors.text.primary,
    fontWeight: '700',
  },

  statLabel: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },

  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.ui.border,
  },

  endButton: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  endButtonText: {
    ...theme.typography.labelMedium,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});

StatItem.displayName = 'StatItem';
NavigationPanel.displayName = 'NavigationPanel';

export default NavigationPanel;
