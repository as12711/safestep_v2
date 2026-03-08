/**
 * Card Component
 * ==============
 * Reusable card component with variants for different use cases.
 * Part of the Industrial Steel design system.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, GRADIENTS } from '../theme/colors';

/**
 * Card - Container component with consistent styling
 * 
 * @param {React.ReactNode} children - Card content
 * @param {object} style - Additional styles
 * @param {string} variant - 'default' | 'elevated' | 'glass' | 'gradient' | 'alert' | 'success'
 * @param {boolean} noPadding - Remove default padding
 * @param {number} borderRadius - Custom border radius
 */
const Card = memo(({
  children,
  style,
  variant = 'default',
  noPadding = false,
  borderRadius,
}) => {
  const getVariantStyles = () => {
    const baseRadius = borderRadius ?? 16;
    
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: COLORS.surface3,
          borderRadius: baseRadius,
          borderWidth: 1,
          borderColor: COLORS.borderActive,
          ...styles.elevatedShadow,
        };
      case 'glass':
        return {
          backgroundColor: COLORS.surfaceGlass,
          borderRadius: baseRadius,
          borderWidth: 1,
          borderColor: COLORS.border,
        };
      case 'alert':
        return {
          backgroundColor: COLORS.dangerDim,
          borderRadius: baseRadius,
          borderWidth: 1,
          borderColor: COLORS.danger,
        };
      case 'success':
        return {
          backgroundColor: COLORS.safeDim,
          borderRadius: baseRadius,
          borderWidth: 1,
          borderColor: COLORS.safe,
        };
      case 'default':
      default:
        return {
          backgroundColor: COLORS.surface,
          borderRadius: baseRadius,
          borderWidth: 1,
          borderColor: COLORS.border,
        };
    }
  };

  // Gradient card needs special handling
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={GRADIENTS.dark}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.gradientCard,
          { borderRadius: borderRadius ?? 16 },
          !noPadding && styles.padding,
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        getVariantStyles(),
        !noPadding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
});

Card.displayName = 'Card';

const styles = StyleSheet.create({
  padding: {
    padding: 16,
  },
  elevatedShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: 'rgba(168, 181, 196, 0.15)',
    overflow: 'hidden',
  },
});

export default Card;
