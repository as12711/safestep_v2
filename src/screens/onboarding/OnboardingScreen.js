/**
 * OnboardingScreen
 * =================
 * First-time user experience that builds trust and sets up SafeStep.
 *
 * Flow:
 * 1. Welcome - The hook, what SafeStep is
 * 2. How It Works - Community-powered safety explanation
 * 3. Permissions - Location & notifications
 * 4. Personalization - Home/work addresses
 * 5. Community - Optional pledge to contribute
 * 6. Ready - First route suggestion
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '../../theme/designSystem';

// Onboarding steps
import WelcomeStep from './steps/WelcomeStep';
import HowItWorksStep from './steps/HowItWorksStep';
import PermissionsStep from './steps/PermissionsStep';
import PersonalizationStep from './steps/PersonalizationStep';
import CommunityStep from './steps/CommunityStep';
import ReadyStep from './steps/ReadyStep';

const { colors, spacing, radius, layout } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { id: 'welcome', Component: WelcomeStep },
  { id: 'how-it-works', Component: HowItWorksStep },
  { id: 'permissions', Component: PermissionsStep },
  { id: 'personalization', Component: PersonalizationStep },
  { id: 'community', Component: CommunityStep },
  { id: 'ready', Component: ReadyStep },
];

const OnboardingScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    homeAddress: null,
    workAddress: null,
    notificationsEnabled: false,
    locationEnabled: false,
    communityPledge: false,
  });

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      scrollViewRef.current?.scrollTo({
        x: nextStep * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentStep]);

  // Navigate to previous step
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      scrollViewRef.current?.scrollTo({
        x: prevStep * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentStep]);

  // Skip to end (for users who want to skip)
  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lastStep = STEPS.length - 1;
    setCurrentStep(lastStep);

    scrollViewRef.current?.scrollTo({
      x: lastStep * SCREEN_WIDTH,
      animated: true,
    });
  }, []);

  // Update user data from steps
  const handleUpdateData = useCallback((key, value) => {
    setUserData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Complete onboarding
  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.(userData);
  }, [userData, onComplete]);

  // Handle scroll events (for swipe navigation)
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = useCallback((e) => {
    const newStep = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newStep !== currentStep) {
      setCurrentStep(newStep);
    }
  }, [currentStep]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Progress indicator */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={STEPS.length}
        scrollX={scrollX}
      />

      {/* Steps */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false} // Disable swipe, use buttons
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {STEPS.map(({ id, Component }, index) => (
          <View key={id} style={styles.stepContainer}>
            <Component
              isActive={currentStep === index}
              userData={userData}
              onUpdateData={handleUpdateData}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              onComplete={handleComplete}
              stepIndex={index}
              totalSteps={STEPS.length}
            />
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
};

// Progress bar component
const ProgressBar = ({ currentStep, totalSteps, scrollX }) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <Animated.View
              key={index}
              style={[
                styles.progressDot,
                isCompleted && styles.progressDotCompleted,
                isCurrent && styles.progressDotCurrent,
                {
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Progress line */}
      <View style={styles.progressLineContainer}>
        <View style={styles.progressLineTrack} />
        <Animated.View
          style={[
            styles.progressLineFill,
            {
              width: scrollX.interpolate({
                inputRange: [0, (totalSteps - 1) * SCREEN_WIDTH],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Progress bar
  progressContainer: {
    paddingTop: layout.safeArea.top + spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },

  progressTrack: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },

  progressDotCompleted: {
    backgroundColor: colors.safety.safe,
  },

  progressDotCurrent: {
    backgroundColor: colors.safety.safe,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  progressLineContainer: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },

  progressLineTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ui.border,
  },

  progressLineFill: {
    height: '100%',
    backgroundColor: colors.safety.safe,
    borderRadius: 1,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },

  stepContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});

export default OnboardingScreen;
