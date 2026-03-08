/**
 * ActivityTimeline
 * =================
 * Timeline of recent walks, reports, and achievements.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, getSafetyColor } = theme;

const ActivityTimeline = memo(({ activities, limit = 5, onActivityPress }) => {
  const fadeAnims = useRef(
    Array.from({ length: limit }, () => new Animated.Value(0))
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

  const displayActivities = activities.slice(0, limit);

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getActivityConfig = (activity) => {
    switch (activity.type) {
      case 'walk':
        return {
          icon: '🚶',
          color: colors.safety.safe,
          bgColor: colors.safety.safeMuted,
        };
      case 'report':
        return {
          icon: activity.icon || '📝',
          color: colors.community.primary,
          bgColor: colors.community.muted,
        };
      case 'achievement':
        return {
          icon: activity.icon || '🏆',
          color: colors.safety.caution,
          bgColor: colors.safety.cautionMuted,
        };
      default:
        return {
          icon: '📍',
          color: colors.text.secondary,
          bgColor: colors.bg.tertiary,
        };
    }
  };

  return (
    <View style={styles.container}>
      {displayActivities.map((activity, index) => {
        const config = getActivityConfig(activity);
        const isLast = index === displayActivities.length - 1;

        return (
          <Animated.View
            key={activity.id}
            style={[
              styles.activityItem,
              {
                opacity: fadeAnims[index],
                transform: [{
                  translateX: fadeAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Timeline connector */}
            <View style={styles.timelineConnector}>
              <View style={[styles.dot, { backgroundColor: config.color }]} />
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Activity card */}
            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => onActivityPress?.(activity)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                <Text style={styles.icon}>{config.icon}</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  {activity.safetyScore && (
                    <View style={[
                      styles.scoreBadge,
                      { backgroundColor: getSafetyColor(activity.safetyScore) + '20' },
                    ]}>
                      <Text style={[
                        styles.scoreText,
                        { color: getSafetyColor(activity.safetyScore) },
                      ]}>
                        {activity.safetyScore}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subtitle}>{activity.subtitle}</Text>
                <Text style={styles.timestamp}>{formatTime(activity.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  activityItem: {
    flexDirection: 'row',
  },

  // Timeline connector
  timelineConnector: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.lg,
  },

  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.ui.border,
    marginTop: spacing.xs,
  },

  // Activity card
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  icon: {
    fontSize: 18,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  title: {
    ...typography.titleSmall,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },

  scoreBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },

  scoreText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },

  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  timestamp: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
});

ActivityTimeline.displayName = 'ActivityTimeline';

export default ActivityTimeline;
