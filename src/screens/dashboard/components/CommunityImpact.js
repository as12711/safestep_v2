/**
 * CommunityImpact
 * ================
 * Card showing the user's contribution to community safety.
 * Visualizes how their reports help other pedestrians.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;

const CommunityImpact = memo(({
  reportsSubmitted = 0,
  peopleHelped = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate counter
    Animated.timing(countAnim, {
      toValue: peopleHelped,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [peopleHelped]);

  // Calculate impact level
  const getImpactLevel = () => {
    if (reportsSubmitted >= 50) return { level: 'Guardian', icon: '🛡️', color: colors.safety.safe };
    if (reportsSubmitted >= 25) return { level: 'Protector', icon: '⭐', color: colors.community.primary };
    if (reportsSubmitted >= 10) return { level: 'Helper', icon: '🤝', color: colors.feature.blueLight };
    if (reportsSubmitted >= 5) return { level: 'Contributor', icon: '📝', color: colors.safety.caution };
    return { level: 'Newcomer', icon: '👋', color: colors.text.secondary };
  };

  const impact = getImpactLevel();

  // Calculate progress to next level
  const getProgressToNext = () => {
    if (reportsSubmitted >= 50) return { current: reportsSubmitted, next: reportsSubmitted, progress: 1 };
    if (reportsSubmitted >= 25) return { current: reportsSubmitted - 25, next: 50 - 25, progress: (reportsSubmitted - 25) / 25 };
    if (reportsSubmitted >= 10) return { current: reportsSubmitted - 10, next: 25 - 10, progress: (reportsSubmitted - 10) / 15 };
    if (reportsSubmitted >= 5) return { current: reportsSubmitted - 5, next: 10 - 5, progress: (reportsSubmitted - 5) / 5 };
    return { current: reportsSubmitted, next: 5, progress: reportsSubmitted / 5 };
  };

  const progress = getProgressToNext();

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      },
    ]}>
      <LinearGradient
        colors={[colors.community.muted, colors.bg.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Impact level badge */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelIcon}>{impact.icon}</Text>
          <Text style={[styles.levelText, { color: impact.color }]}>
            {impact.level}
          </Text>
        </View>

        {/* Main stats */}
        <View style={styles.statsContainer}>
          {/* Reports submitted */}
          <View style={styles.statColumn}>
            <View style={[styles.statIconBg, { backgroundColor: colors.community.primary + '20' }]}>
              <Text style={styles.statEmoji}>📝</Text>
            </View>
            <Text style={styles.statValue}>{reportsSubmitted}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>

          {/* Divider with connection visualization */}
          <View style={styles.connectionVisual}>
            <View style={styles.connectionLine} />
            <View style={[styles.connectionDot, { backgroundColor: colors.community.primary }]} />
            <View style={[styles.connectionDot, styles.connectionDotMiddle, { backgroundColor: colors.safety.safe }]} />
            <View style={[styles.connectionDot, { backgroundColor: colors.community.primary }]} />
            <View style={styles.connectionLine} />
          </View>

          {/* People helped */}
          <View style={styles.statColumn}>
            <View style={[styles.statIconBg, { backgroundColor: colors.safety.safe + '20' }]}>
              <Text style={styles.statEmoji}>👥</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.safety.safe }]}>
              ~{peopleHelped}
            </Text>
            <Text style={styles.statLabel}>People Helped</Text>
          </View>
        </View>

        {/* Progress to next level */}
        {impact.level !== 'Guardian' && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress to next level</Text>
              <Text style={styles.progressCount}>
                {progress.current}/{progress.next} reports
              </Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress.progress * 100, 100)}%`,
                    backgroundColor: impact.color,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Impact message */}
        <View style={styles.impactMessage}>
          <Text style={styles.impactIcon}>💡</Text>
          <Text style={styles.impactText}>
            {peopleHelped > 0
              ? `Your reports have helped approximately ${peopleHelped} pedestrians walk safer routes.`
              : 'Submit your first report to start helping your community!'}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },

  gradient: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.glassBorder,
    borderRadius: radius.xl,
  },

  // Level badge
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.primary + '80',
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },

  levelIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },

  levelText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },

  statColumn: {
    alignItems: 'center',
    flex: 1,
  },

  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  statEmoji: {
    fontSize: 22,
  },

  statValue: {
    ...typography.headlineMedium,
    color: colors.community.primary,
    fontWeight: '700',
  },

  statLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Connection visual
  connectionVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },

  connectionLine: {
    height: 2,
    flex: 1,
    backgroundColor: colors.ui.border,
  },

  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  connectionDotMiddle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },

  // Progress
  progressSection: {
    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  progressLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  progressCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  progressBar: {
    height: 6,
    backgroundColor: colors.ui.border,
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Impact message
  impactMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg.primary + '60',
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  impactIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 2,
  },

  impactText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
});

CommunityImpact.displayName = 'CommunityImpact';

export default CommunityImpact;
