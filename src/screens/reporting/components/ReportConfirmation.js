/**
 * ReportConfirmation
 * ===================
 * Success animation after submitting a report.
 * Celebrates contribution and shows impact.
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
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReportConfirmation = memo(({ visible, report }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  // Ripple animations
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
      textAnim.setValue(0);
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);

      // Entrance animation
      Animated.sequence([
        // Fade in backdrop
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Pop in circle
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        // Draw checkmark
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Show text
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Ripple effect
      Animated.stagger(200, [
        createRippleAnimation(ripple1),
        createRippleAnimation(ripple2),
        createRippleAnimation(ripple3),
      ]).start();
    }
  }, [visible]);

  const createRippleAnimation = (anim) => {
    return Animated.timing(anim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });
  };

  if (!visible) return null;

  const getImpactMessage = () => {
    if (!report) return 'Your report has been submitted';

    const messages = {
      positive: 'Thanks for confirming this area is safe!',
      high: 'Alert sent to nearby SafeStep users',
      critical: 'Priority alert broadcasted',
      medium: 'Report added to safety map',
      info: 'Information logged for routing',
    };

    return messages[report.severity] || 'Your report helps keep others safe';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacityAnim },
      ]}
      pointerEvents="none"
    >
      {/* Ripples */}
      {[ripple1, ripple2, ripple3].map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.ripple,
            {
              transform: [{
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 2 + index * 0.3],
                }),
              }],
              opacity: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 0.3, 0],
              }),
            },
          ]}
        />
      ))}

      {/* Success circle */}
      <Animated.View
        style={[
          styles.successCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.safety.safe, colors.community.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Checkmark */}
          <Animated.View
            style={[
              styles.checkContainer,
              {
                opacity: checkAnim,
                transform: [{
                  scale: checkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                }],
              },
            ]}
          >
            <Text style={styles.checkIcon}>✓</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Text content */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textAnim,
            transform: [{
              translateY: textAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}
      >
        <Text style={styles.title}>Thank you!</Text>
        <Text style={styles.message}>{getImpactMessage()}</Text>

        {report && (
          <View style={styles.reportSummary}>
            <View style={styles.reportBadge}>
              <Text style={styles.reportIcon}>{report.icon}</Text>
              <Text style={styles.reportLabel}>{report.label}</Text>
            </View>
          </View>
        )}

        <View style={styles.impactStats}>
          <ImpactStat value="~50" label="people helped" />
          <View style={styles.statDivider} />
          <ImpactStat value="12" label="your reports" />
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const ImpactStat = memo(({ value, label }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  // Ripples
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.safety.safe,
  },

  // Success circle
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    ...shadows.lg,
  },

  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkIcon: {
    fontSize: 40,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  // Text content
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },

  title: {
    ...typography.headlineLarge,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  message: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Report summary
  reportSummary: {
    marginBottom: spacing.lg,
  },

  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  reportIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  reportLabel: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },

  // Impact stats
  impactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },

  stat: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },

  statValue: {
    ...typography.headlineMedium,
    color: colors.safety.safe,
    fontWeight: '700',
  },

  statLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.ui.divider,
    marginHorizontal: spacing.md,
  },
});

ImpactStat.displayName = 'ImpactStat';
ReportConfirmation.displayName = 'ReportConfirmation';

export default ReportConfirmation;
