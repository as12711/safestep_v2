/**
 * OnboardingButton
 * =================
 * Consistent button styling for onboarding flow.
 */

import React, { memo, useCallback, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;

const OnboardingButton = memo(({
  label,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  icon,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  }, [disabled, loading, onPress]);

  const variantStyles = {
    primary: {
      container: styles.primaryContainer,
      text: styles.primaryText,
      gradient: [colors.safety.safe, '#D4940B'],
    },
    secondary: {
      container: styles.secondaryContainer,
      text: styles.secondaryText,
      gradient: null,
    },
    ghost: {
      container: styles.ghostContainer,
      text: styles.ghostText,
      gradient: null,
    },
    danger: {
      container: styles.dangerContainer,
      text: styles.dangerText,
      gradient: [colors.safety.alert, colors.safety.critical],
    },
  };

  const currentVariant = variantStyles[variant];

  const content = (
    <View style={styles.content}>
      {icon && iconPosition === 'left' && (
        <Text style={[styles.icon, currentVariant.text]}>{icon}</Text>
      )}
      <Text style={[styles.label, currentVariant.text, disabled && styles.labelDisabled]}>
        {loading ? 'Loading...' : label}
      </Text>
      {icon && iconPosition === 'right' && (
        <Text style={[styles.icon, currentVariant.text]}>{icon}</Text>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          styles.container,
          currentVariant.container,
          disabled && styles.containerDisabled,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {currentVariant.gradient ? (
          <LinearGradient
            colors={currentVariant.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 56,
  },

  containerDisabled: {
    opacity: 0.5,
  },

  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  label: {
    ...typography.titleMedium,
    fontWeight: '600',
  },

  labelDisabled: {
    opacity: 0.7,
  },

  icon: {
    fontSize: 18,
    marginHorizontal: spacing.sm,
  },

  // Primary
  primaryContainer: {
    ...shadows.md,
  },

  primaryText: {
    color: colors.bg.primary,
  },

  // Secondary
  secondaryContainer: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  secondaryText: {
    color: colors.text.primary,
  },

  // Ghost
  ghostContainer: {
    backgroundColor: 'transparent',
  },

  ghostText: {
    color: colors.text.secondary,
  },

  // Danger
  dangerContainer: {
    ...shadows.md,
  },

  dangerText: {
    color: colors.text.primary,
  },
});

OnboardingButton.displayName = 'OnboardingButton';

export default OnboardingButton;
