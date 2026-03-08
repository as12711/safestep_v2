/**
 * usePressAnimation
 * ==================
 * Reusable hook for press-in/press-out scale animations.
 * Eliminates duplicate animation logic across components.
 */

import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Creates press animation handlers and animated value.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.pressedScale - Scale when pressed (default: 0.95)
 * @param {number} options.tension - Spring tension (default: 300)
 * @param {number} options.friction - Spring friction (default: 10)
 * @returns {Object} { scaleAnim, handlePressIn, handlePressOut, animatedStyle }
 *
 * @example
 * const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation({ pressedScale: 0.97 });
 *
 * <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut}>
 *   <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
 *     ...
 *   </Animated.View>
 * </TouchableOpacity>
 */
export function usePressAnimation({
  pressedScale = 0.95,
  tension = 300,
  friction = 10,
} = {}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: pressedScale,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  }, [pressedScale, tension, friction]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  }, [tension, friction]);

  // Pre-composed animated style for convenience
  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  return {
    scaleAnim,
    handlePressIn,
    handlePressOut,
    animatedStyle,
  };
}

export default usePressAnimation;
