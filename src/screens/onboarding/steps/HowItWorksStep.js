/**
 * HowItWorksStep
 * ===============
 * Explains the community-powered safety model.
 * Builds understanding and trust before asking for permissions.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { theme } from '../../../theme/designSystem';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, layout } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  {
    id: 'crowdsourced',
    icon: '👥',
    title: 'Community Reports',
    description: 'Real-time safety reports from people walking the same streets as you.',
    color: colors.community.primary,
  },
  {
    id: 'official',
    icon: '🏛️',
    title: 'Official Data',
    description: '911 calls, crime statistics, and public safety information.',
    color: colors.feature.blueLight,
  },
  {
    id: 'routing',
    icon: '🗺️',
    title: 'Smart Routing',
    description: 'AI-powered routes that prioritize your safety, not just speed.',
    color: colors.safety.safe,
  },
  {
    id: 'realtime',
    icon: '⚡',
    title: 'Real-Time Updates',
    description: 'Routes adapt to changing conditions as you walk.',
    color: colors.safety.caution,
  },
];

const HowItWorksStep = memo(({ isActive, onNext, onBack }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

      // Auto-cycle features
      const interval = setInterval(() => {
        setActiveFeature(prev => (prev + 1) % FEATURES.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isActive]);

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
          <Text style={styles.stepLabel}>HOW IT WORKS</Text>
          <Text style={styles.title}>
            Safety in numbers.{'\n'}
            Powered by you.
          </Text>
        </View>

        {/* Feature visualization */}
        <View style={styles.visualization}>
          <CommunityVisualization activeFeature={activeFeature} />
        </View>

        {/* Feature cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuresScroll}
          snapToInterval={SCREEN_WIDTH * 0.75 + spacing.md}
          decelerationRate="fast"
        >
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isActive={index === activeFeature}
              onPress={() => setActiveFeature(index)}
            />
          ))}
        </ScrollView>

        {/* Explanation */}
        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>
            🔐 Your privacy matters
          </Text>
          <Text style={styles.explanationText}>
            Reports are anonymous. We never share your exact location or identity
            with other users. Your data stays yours.
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

// Visual representation of community safety
const CommunityVisualization = memo(({ activeFeature }) => {
  const pulseAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Staggered pulse animation
    const animations = pulseAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();

    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.vizContainer}>
      {/* Center icon */}
      <View style={styles.vizCenter}>
        <Text style={styles.vizCenterIcon}>
          {FEATURES[activeFeature].icon}
        </Text>
      </View>

      {/* Orbiting nodes */}
      {pulseAnims.map((anim, index) => {
        const angle = (index / 8) * 2 * Math.PI;
        const radius = 80;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <Animated.View
            key={index}
            style={[
              styles.vizNode,
              {
                transform: [
                  { translateX: x },
                  { translateY: y },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1, 0.5],
                }),
              },
            ]}
          >
            <View
              style={[
                styles.vizNodeInner,
                { backgroundColor: FEATURES[activeFeature].color + '40' },
              ]}
            />
          </Animated.View>
        );
      })}

      {/* Connection lines */}
      <View style={[styles.vizRing, { borderColor: FEATURES[activeFeature].color + '30' }]} />
    </View>
  );
});

// Feature card component
const FeatureCard = memo(({ feature, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.95,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        isActive && styles.featureCardActive,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
        <Text style={styles.featureIcon}>{feature.icon}</Text>
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </Animated.View>
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
    color: colors.safety.safe,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },

  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    lineHeight: 38,
  },

  // Visualization
  visualization: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  vizContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vizCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.safety.safe,
    zIndex: 10,
  },

  vizCenterIcon: {
    fontSize: 28,
  },

  vizNode: {
    position: 'absolute',
    width: 24,
    height: 24,
  },

  vizNodeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  vizRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
  },

  // Features scroll
  featuresScroll: {
    paddingRight: spacing.xl,
    gap: spacing.md,
  },

  featureCard: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  featureCardActive: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.bg.elevated,
  },

  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  featureIcon: {
    fontSize: 24,
  },

  featureTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  featureDescription: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // Explanation
  explanation: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.safety.safe,
  },

  explanationTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  explanationText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
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

CommunityVisualization.displayName = 'CommunityVisualization';
FeatureCard.displayName = 'FeatureCard';
HowItWorksStep.displayName = 'HowItWorksStep';

export default HowItWorksStep;
