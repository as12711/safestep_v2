/**
 * WelcomeStep
 * ===========
 * The first impression - establishes trust and purpose.
 * "SafeStep is your trusted companion for walking safely."
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

const { colors, typography, spacing, radius, layout } = theme;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const WelcomeStep = memo(({ isActive, onNext, onSkip }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Staggered entrance animation
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Continuous glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isActive]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative elements */}
      <Animated.View style={[styles.glowOrb, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={[colors.safety.safeGlow, 'transparent']}
          style={styles.glowOrbGradient}
        />
      </Animated.View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.safety.safe, '#D4940B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoEmoji}>🛡️</Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>SafeStep</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Walk with confidence.{'\n'}
          Powered by community.
        </Text>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            SafeStep helps you navigate your city with real-time safety
            information from your community and official sources.
          </Text>
        </View>

        {/* Trust indicators */}
        <View style={styles.trustIndicators}>
          <TrustBadge icon="👥" label="Community-Powered" />
          <TrustBadge icon="🔒" label="Privacy-First" />
          <TrustBadge icon="📍" label="Real-Time" />
        </View>
      </Animated.View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <OnboardingButton
          label="Get Started"
          onPress={onNext}
          variant="primary"
          icon="→"
        />

        <OnboardingButton
          label="Skip Setup"
          onPress={onSkip}
          variant="ghost"
          style={styles.skipButton}
        />
      </View>
    </View>
  );
});

const TrustBadge = memo(({ icon, label }) => (
  <View style={styles.trustBadge}>
    <Text style={styles.trustIcon}>{icon}</Text>
    <Text style={styles.trustLabel}>{label}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Decorative glow
  glowOrb: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
  },

  glowOrbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },

  // Logo
  logoContainer: {
    marginBottom: spacing.xl,
  },

  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoEmoji: {
    fontSize: 48,
  },

  // Typography
  title: {
    ...typography.displayLarge,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  tagline: {
    ...typography.headlineMedium,
    color: colors.safety.safe,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 32,
  },

  descriptionContainer: {
    maxWidth: 320,
    marginBottom: spacing.xxl,
  },

  description: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Trust indicators
  trustIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  trustIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  trustLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  // Actions
  actions: {
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  skipButton: {
    marginTop: spacing.md,
  },
});

TrustBadge.displayName = 'TrustBadge';
WelcomeStep.displayName = 'WelcomeStep';

export default WelcomeStep;
