/**
 * GradientButton Component
 * ========================
 * A beautiful gradient button with loading state and haptic feedback.
 * Part of the Industrial Steel design system.
 */

import React, { memo, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { COLORS, GRADIENTS } from '../theme/colors';

/**
 * GradientButton - Primary action button with gradient background
 * 
 * @param {function} onPress - Press handler
 * @param {object} style - Additional container styles
 * @param {object} textStyle - Additional text styles
 * @param {React.ReactNode} children - Button text/content
 * @param {boolean} disabled - Disable the button
 * @param {boolean} loading - Show loading indicator
 * @param {array} gradient - Custom gradient colors (defaults to GRADIENTS.primary)
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'safe'
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {boolean} haptic - Enable haptic feedback (default true)
 * @param {boolean} fullWidth - Make button full width
 */
const GradientButton = memo(({
  onPress,
  style,
  textStyle,
  children,
  disabled = false,
  loading = false,
  gradient,
  variant = 'primary',
  size = 'large',
  haptic = true,
  fullWidth = false,
}) => {
  // Get gradient colors based on variant
  const getGradientColors = useCallback(() => {
    if (gradient) return gradient;
    if (disabled) return GRADIENTS.disabled;
    
    switch (variant) {
      case 'danger':
        return GRADIENTS.danger;
      case 'safe':
        return GRADIENTS.safe;
      case 'secondary':
        return GRADIENTS.dark;
      case 'primary':
      default:
        return GRADIENTS.primary;
    }
  }, [gradient, disabled, variant]);

  // Get text color based on variant
  const getTextColor = useCallback(() => {
    if (disabled) return COLORS.text3;
    
    switch (variant) {
      case 'secondary':
        return COLORS.text;
      case 'danger':
      case 'safe':
      case 'primary':
      default:
        return COLORS.textInverse;
    }
  }, [disabled, variant]);

  // Get size styles
  const getSizeStyles = useCallback(() => {
    switch (size) {
      case 'small':
        return {
          container: { padding: 12, borderRadius: 24 },
          text: { fontSize: 14 },
        };
      case 'medium':
        return {
          container: { padding: 14, borderRadius: 32 },
          text: { fontSize: 15 },
        };
      case 'large':
      default:
        return {
          container: { padding: 18, borderRadius: 50 },
          text: { fontSize: 17 },
        };
    }
  }, [size]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    
    // Haptic feedback
    if (haptic && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Ignore haptics errors
      }
    }
    
    onPress?.();
  }, [disabled, loading, haptic, onPress]);

  const sizeStyles = getSizeStyles();
  const gradientColors = getGradientColors();
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={fullWidth && styles.fullWidth}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          sizeStyles.container,
          !disabled && styles.shadow,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text
            style={[
              styles.text,
              sizeStyles.text,
              { color: textColor },
              textStyle,
            ]}
          >
            {children}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
});

GradientButton.displayName = 'GradientButton';

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default GradientButton;
