/**
 * PressableScale
 * ===============
 * Animated touchable wrapper with scale feedback.
 * Consolidates press animation logic into a single component.
 */

import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePressAnimation } from '../../hooks/usePressAnimation';

/**
 * A touchable component with animated scale feedback.
 *
 * @param {Object} props
 * @param {Function} props.onPress - Press handler
 * @param {number} props.pressedScale - Scale when pressed (default: 0.95)
 * @param {boolean} props.haptic - Enable haptic feedback (default: true)
 * @param {string} props.hapticStyle - Haptic style: 'light', 'medium', 'heavy' (default: 'light')
 * @param {number} props.activeOpacity - TouchableOpacity activeOpacity (default: 0.9)
 * @param {Object} props.style - Container style
 * @param {React.ReactNode} props.children - Child elements
 *
 * @example
 * <PressableScale onPress={handlePress} pressedScale={0.97}>
 *   <View style={styles.card}>
 *     <Text>Press me</Text>
 *   </View>
 * </PressableScale>
 */
const PressableScale = memo(({
  children,
  onPress,
  pressedScale = 0.95,
  haptic = true,
  hapticStyle = 'light',
  activeOpacity = 0.9,
  style,
  disabled = false,
  ...rest
}) => {
  const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation({
    pressedScale,
  });

  const handlePress = useCallback(() => {
    if (haptic) {
      const feedbackStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[hapticStyle] || Haptics.ImpactFeedbackStyle.Light;

      Haptics.impactAsync(feedbackStyle);
    }
    onPress?.();
  }, [haptic, hapticStyle, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});

PressableScale.displayName = 'PressableScale';

export default PressableScale;
