/**
 * CommunityStep
 * ==============
 * Optional community pledge - encourages contribution.
 * Builds emotional connection to the mission.
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, shadows, layout } = theme;

const COMMUNITY_STATS = [
  { value: '50K+', label: 'Community Members' },
  { value: '1.2M', label: 'Safety Reports' },
  { value: '98%', label: 'Feel Safer' },
];

const PLEDGE_ITEMS = [
  {
    id: 'report',
    icon: '📝',
    title: 'Report what I see',
    description: 'Share safety conditions to help others',
  },
  {
    id: 'verify',
    icon: '✅',
    title: 'Confirm reports',
    description: 'Validate safety updates when I pass by',
  },
  {
    id: 'respect',
    icon: '🤝',
    title: 'Respect privacy',
    description: 'Keep the community safe and welcoming',
  },
];

const CommunityStep = memo(({
  isActive,
  userData,
  onUpdateData,
  onNext,
  onBack,
}) => {
  const [pledgeAccepted, setPledgeAccepted] = useState(userData.communityPledge || false);
  const [animatedItems, setAnimatedItems] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger animate pledge items
      PLEDGE_ITEMS.forEach((_, index) => {
        setTimeout(() => {
          setAnimatedItems(prev => [...prev, index]);
        }, 800 + index * 200);
      });
    }
  }, [isActive]);

  const handleTogglePledge = useCallback(() => {
    const newValue = !pledgeAccepted;
    setPledgeAccepted(newValue);
    onUpdateData('communityPledge', newValue);

    if (newValue) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(checkAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [pledgeAccepted, onUpdateData]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepLabel}>COMMUNITY</Text>
          <Text style={styles.title}>
            Together we're{'\n'}stronger
          </Text>
          <Text style={styles.subtitle}>
            SafeStep works because people like you share what they see.
          </Text>
        </View>

        {/* Community stats */}
        <View style={styles.statsRow}>
          {COMMUNITY_STATS.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Community pledge card */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleTogglePledge}
          style={styles.pledgeContainer}
        >
          <LinearGradient
            colors={pledgeAccepted
              ? [colors.safety.safeMuted, colors.community.muted]
              : [colors.bg.tertiary, colors.bg.tertiary]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.pledgeCard,
              pledgeAccepted && styles.pledgeCardActive,
            ]}
          >
            {/* Pledge header */}
            <View style={styles.pledgeHeader}>
              <View style={styles.pledgeIconContainer}>
                <Text style={styles.pledgeEmoji}>🛡️</Text>
              </View>
              <View style={styles.pledgeTitleContainer}>
                <Text style={styles.pledgeTitle}>Community Pledge</Text>
                <Text style={styles.pledgeSubtitle}>
                  {pledgeAccepted ? "You're committed!" : 'Optional but impactful'}
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.pledgeCheck,
                  pledgeAccepted && styles.pledgeCheckActive,
                  {
                    transform: [{
                      scale: checkAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    }],
                  },
                ]}
              >
                {pledgeAccepted ? (
                  <Text style={styles.pledgeCheckIcon}>✓</Text>
                ) : (
                  <View style={styles.pledgeCheckEmpty} />
                )}
              </Animated.View>
            </View>

            {/* Pledge items */}
            <View style={styles.pledgeItems}>
              {PLEDGE_ITEMS.map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.pledgeItem,
                    {
                      opacity: animatedItems.includes(index) ? 1 : 0.3,
                      transform: [{
                        translateX: animatedItems.includes(index) ? 0 : 20,
                      }],
                    },
                  ]}
                >
                  <Text style={styles.pledgeItemIcon}>{item.icon}</Text>
                  <View style={styles.pledgeItemContent}>
                    <Text style={styles.pledgeItemTitle}>{item.title}</Text>
                    <Text style={styles.pledgeItemDesc}>{item.description}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Impact message */}
        <View style={styles.impactMessage}>
          <Text style={styles.impactIcon}>💬</Text>
          <Text style={styles.impactText}>
            "A single report can redirect hundreds of people to safer routes
            that night. Your eyes on the street matter."
          </Text>
        </View>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.actions}>
        <View style={styles.buttonRow}>
          <OnboardingButton
            label="Back"
            onPress={onBack}
            variant="ghost"
            icon="←"
            iconPosition="left"
            style={styles.backButton}
          />
          <OnboardingButton
            label="Continue"
            onPress={onNext}
            variant="primary"
            icon="→"
            style={styles.continueButton}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },

  stepLabel: {
    ...typography.labelMedium,
    color: colors.community.primary,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },

  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    lineHeight: 38,
    marginBottom: spacing.md,
  },

  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    ...typography.headlineLarge,
    color: colors.community.primary,
    fontWeight: '700',
  },

  statLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Pledge card
  pledgeContainer: {
    marginBottom: spacing.xl,
  },

  pledgeCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.ui.border,
  },

  pledgeCardActive: {
    borderColor: colors.community.primary,
  },

  pledgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  pledgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  pledgeEmoji: {
    fontSize: 24,
  },

  pledgeTitleContainer: {
    flex: 1,
  },

  pledgeTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  pledgeSubtitle: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  pledgeCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ui.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },

  pledgeCheckActive: {
    backgroundColor: colors.community.primary,
    borderColor: colors.community.primary,
  },

  pledgeCheckIcon: {
    fontSize: 16,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  pledgeCheckEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ui.border,
  },

  pledgeItems: {
    gap: spacing.md,
  },

  pledgeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  pledgeItemIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    marginTop: 2,
  },

  pledgeItemContent: {
    flex: 1,
  },

  pledgeItemTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: 2,
  },

  pledgeItemDesc: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Impact message
  impactMessage: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.community.primary,
  },

  impactIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },

  impactText: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  backButton: {
    flex: 1,
  },

  continueButton: {
    flex: 2,
  },
});

CommunityStep.displayName = 'CommunityStep';

export default CommunityStep;
