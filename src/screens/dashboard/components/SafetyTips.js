/**
 * SafetyTips
 * ==========
 * Rotating carousel of contextual safety tips.
 * Tips change based on time of day and user activity.
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safety tips organized by context
const SAFETY_TIPS = {
  general: [
    {
      id: 'g1',
      icon: '📱',
      title: 'Stay Connected',
      tip: 'Share your route with a trusted contact before walking, especially at night.',
      category: 'awareness',
    },
    {
      id: 'g2',
      icon: '🎧',
      title: 'Keep One Ear Free',
      tip: 'If listening to music, use only one earbud to stay aware of your surroundings.',
      category: 'awareness',
    },
    {
      id: 'g3',
      icon: '👀',
      title: 'Trust Your Instincts',
      tip: 'If something feels wrong, cross the street or enter a safe business.',
      category: 'instinct',
    },
    {
      id: 'g4',
      icon: '🚶',
      title: 'Walk With Confidence',
      tip: 'Keep your head up and walk with purpose. Confident body language deters trouble.',
      category: 'behavior',
    },
  ],
  night: [
    {
      id: 'n1',
      icon: '🔦',
      title: 'Stay Visible',
      tip: 'Stick to well-lit paths and main streets. Avoid shortcuts through dark areas.',
      category: 'routing',
    },
    {
      id: 'n2',
      icon: '🏪',
      title: 'Know Safe Spots',
      tip: 'Identify 24-hour stores and emergency call boxes along your route.',
      category: 'planning',
    },
    {
      id: 'n3',
      icon: '👥',
      title: 'Walk With Others',
      tip: 'When possible, walk with friends or in well-populated areas at night.',
      category: 'social',
    },
  ],
  evening: [
    {
      id: 'e1',
      icon: '🌆',
      title: 'Beat the Dark',
      tip: 'Plan your route before sunset. Know where street lighting begins and ends.',
      category: 'planning',
    },
    {
      id: 'e2',
      icon: '📍',
      title: 'Share Your ETA',
      tip: 'Let someone know when you expect to arrive at your destination.',
      category: 'communication',
    },
  ],
  community: [
    {
      id: 'c1',
      icon: '📝',
      title: 'Report What You See',
      tip: 'Your reports help others. Mark broken lights, unsafe areas, and hazards.',
      category: 'contribution',
    },
    {
      id: 'c2',
      icon: '🤝',
      title: 'Community Strength',
      tip: 'Join or organize walking groups in your neighborhood for safety in numbers.',
      category: 'social',
    },
  ],
};

const SafetyTips = memo(() => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tips, setTips] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Get contextual tips based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    let contextualTips = [...SAFETY_TIPS.general];

    if (hour >= 21 || hour < 5) {
      // Night: 9pm - 5am
      contextualTips = [...SAFETY_TIPS.night, ...contextualTips];
    } else if (hour >= 17 && hour < 21) {
      // Evening: 5pm - 9pm
      contextualTips = [...SAFETY_TIPS.evening, ...contextualTips];
    }

    // Add community tips randomly
    contextualTips.push(...SAFETY_TIPS.community);

    // Shuffle tips
    const shuffled = contextualTips.sort(() => Math.random() - 0.5);
    setTips(shuffled.slice(0, 5)); // Keep top 5
  }, []);

  // Auto-rotate tips
  useEffect(() => {
    if (tips.length === 0) return;

    const interval = setInterval(() => {
      animateToNextTip();
    }, 8000);

    return () => clearInterval(interval);
  }, [tips, currentTipIndex]);

  const animateToNextTip = useCallback(() => {
    // Fade out and slide left
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      slideAnim.setValue(20);

      // Fade in and slide from right
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [tips.length]);

  const handleDotPress = useCallback((index) => {
    if (index === currentTipIndex) return;
    Haptics.selectionAsync();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentTipIndex(index);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [currentTipIndex]);

  if (tips.length === 0) return null;

  const currentTip = tips[currentTipIndex];

  return (
    <View style={styles.container}>
      {/* Tip card */}
      <Animated.View
        style={[
          styles.tipCard,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.bg.tertiary, colors.bg.elevated]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Icon and category */}
          <View style={styles.tipHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.tipIcon}>{currentTip.icon}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {currentTip.category.charAt(0).toUpperCase() + currentTip.category.slice(1)}
              </Text>
            </View>
          </View>

          {/* Title and tip text */}
          <Text style={styles.tipTitle}>{currentTip.title}</Text>
          <Text style={styles.tipText}>{currentTip.tip}</Text>

          {/* Pagination dots */}
          <View style={styles.pagination}>
            {tips.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <View
                  style={[
                    styles.dot,
                    index === currentTipIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Quick action */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Haptics.selectionAsync()}
      >
        <Text style={styles.actionIcon}>📚</Text>
        <Text style={styles.actionText}>View All Safety Tips</Text>
        <Text style={styles.actionArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  tipCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },

  gradient: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.glassBorder,
    borderRadius: radius.xl,
  },

  // Header
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.safety.cautionMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipIcon: {
    fontSize: 22,
  },

  categoryBadge: {
    backgroundColor: colors.bg.primary + '80',
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  categoryText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content
  tipTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  tipText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ui.border,
  },

  dotActive: {
    width: 20,
    backgroundColor: colors.safety.caution,
  },

  // Action button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  actionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  actionText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    flex: 1,
  },

  actionArrow: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
  },
});

SafetyTips.displayName = 'SafetyTips';

export default SafetyTips;
