/**
 * ReadyStep
 * ==========
 * Final step - celebrate completion and launch into the app.
 * Creates excitement and confidence to start walking safely.
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../theme/designSystem';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, shadows, layout } = theme;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReadyStep = memo(({ isActive, userData, onComplete, onBack }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shieldAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confettiAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Main entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Shield pop-in
      setTimeout(() => {
        Animated.spring(shieldAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 300);

      // Continuous pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Confetti burst
      setTimeout(() => {
        confettiAnims.forEach((anim, index) => {
          const angle = (index / 12) * 2 * Math.PI;
          const distance = 100 + Math.random() * 50;

          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim.x, {
              toValue: Math.cos(angle) * distance,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim.y, {
              toValue: Math.sin(angle) * distance - 50,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: Math.random() * 4 - 2,
              duration: 800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start();
          });
        });
      }, 500);

      return () => pulse.stop();
    }
  }, [isActive]);

  const getCompletionMessage = () => {
    const items = [];
    if (userData.locationEnabled) items.push('Location enabled');
    if (userData.homeAddress) items.push('Home saved');
    if (userData.workAddress) items.push('Work saved');
    if (userData.communityPledge) items.push('Community member');
    return items;
  };

  const completionItems = getCompletionMessage();

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Confetti */}
      <View style={styles.confettiContainer}>
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: [
                  colors.safety.safe,
                  colors.community.primary,
                  colors.feature.blueLight,
                  colors.safety.caution,
                ][index % 4],
                opacity: anim.opacity,
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [-2, 2],
                      outputRange: ['-180deg', '180deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Shield icon with pulse */}
        <View style={styles.shieldContainer}>
          <Animated.View
            style={[
              styles.shieldPulse,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.3, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.shieldIcon,
              {
                transform: [{
                  scale: shieldAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.safety.safe, '#D4940B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shieldGradient}
            >
              <Text style={styles.shieldEmoji}>🛡️</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.title}>You're ready!</Text>
        <Text style={styles.subtitle}>
          SafeStep is set up and ready to offer route suggestions.
        </Text>

        {/* Completion summary */}
        {completionItems.length > 0 && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Your setup</Text>
            <View style={styles.completionItems}>
              {completionItems.map((item, index) => (
                <View key={index} style={styles.completionItem}>
                  <View style={styles.completionCheck}>
                    <Text style={styles.completionCheckIcon}>✓</Text>
                  </View>
                  <Text style={styles.completionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* First route suggestion */}
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionIcon}>
            <Text style={styles.suggestionEmoji}>🚶</Text>
          </View>
          <View style={styles.suggestionContent}>
            <Text style={styles.suggestionTitle}>Ready for your first walk?</Text>
            <Text style={styles.suggestionText}>
              Search for a destination or tap the map to start.
            </Text>
          </View>
        </View>

        {/* Safety reminder */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderIcon}>💡</Text>
          <Text style={styles.reminderText}>
            Remember: SafeStep enhances your safety awareness but always trust
            your instincts and stay alert.
          </Text>
        </View>
      </Animated.View>

      {/* Launch button */}
      <View style={styles.actions}>
        <OnboardingButton
          label="Start Walking"
          onPress={onComplete}
          variant="primary"
          icon="→"
        />

        <View style={styles.madeWith}>
          <Text style={styles.madeWithText}>
            Made with ❤️ for safer communities
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },

  // Shield
  shieldContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shieldPulse: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.safety.safe,
  },

  shieldIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },

  shieldGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shieldEmoji: {
    fontSize: 56,
  },

  // Title
  title: {
    ...typography.displayMedium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    maxWidth: 280,
  },

  // Completion card
  completionCard: {
    width: '100%',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  completionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  completionItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.safety.safeMuted,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  completionCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },

  completionCheckIcon: {
    fontSize: 10,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  completionText: {
    ...typography.labelMedium,
    color: colors.safety.safe,
  },

  // Suggestion card
  suggestionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  suggestionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  suggestionEmoji: {
    fontSize: 24,
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionTitle: {
    ...typography.titleSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  suggestionText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Reminder
  reminderCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.safety.caution,
  },

  reminderIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },

  reminderText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  madeWith: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },

  madeWithText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
});

ReadyStep.displayName = 'ReadyStep';

export default ReadyStep;
