/**
 * useEntranceAnimation
 * =====================
 * Reusable hook for fade-in/slide-up entrance animations.
 * Used across onboarding steps, screens, and cards.
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Creates entrance animation values and handlers.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.trigger - When true, animation plays (default: true)
 * @param {number} options.fadeFrom - Initial opacity (default: 0)
 * @param {number} options.slideFrom - Initial Y offset (default: 30)
 * @param {number} options.duration - Fade duration in ms (default: 500)
 * @param {number} options.delay - Delay before animation starts (default: 0)
 * @param {number} options.tension - Spring tension for slide (default: 50)
 * @param {number} options.friction - Spring friction for slide (default: 8)
 * @returns {Object} { fadeAnim, slideAnim, animatedStyle, reset, play }
 *
 * @example
 * const { animatedStyle } = useEntranceAnimation({ trigger: isActive });
 *
 * <Animated.View style={[styles.container, animatedStyle]}>
 *   ...
 * </Animated.View>
 */
export function useEntranceAnimation({
  trigger = true,
  fadeFrom = 0,
  slideFrom = 30,
  duration = 500,
  delay = 0,
  tension = 50,
  friction = 8,
} = {}) {
  const fadeAnim = useRef(new Animated.Value(fadeFrom)).current;
  const slideAnim = useRef(new Animated.Value(slideFrom)).current;

  const play = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension,
        friction,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration, delay, tension, friction]);

  const reset = useCallback(() => {
    fadeAnim.setValue(fadeFrom);
    slideAnim.setValue(slideFrom);
  }, [fadeFrom, slideFrom]);

  useEffect(() => {
    if (trigger) {
      play();
    } else {
      reset();
    }
  }, [trigger, play, reset]);

  // Pre-composed animated style for convenience
  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return {
    fadeAnim,
    slideAnim,
    animatedStyle,
    reset,
    play,
  };
}

export default useEntranceAnimation;
