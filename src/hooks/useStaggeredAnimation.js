/**
 * useStaggeredAnimation
 * ======================
 * Reusable hook for staggered list item animations.
 * Used for grids, timelines, and list entries.
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Creates staggered animation values for a list of items.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.count - Number of items to animate
 * @param {boolean} options.trigger - When true, animation plays (default: true)
 * @param {number} options.staggerDelay - Delay between items in ms (default: 80)
 * @param {number} options.tension - Spring tension (default: 50)
 * @param {number} options.friction - Spring friction (default: 8)
 * @returns {Object} { anims, getAnimatedStyle, reset, play }
 *
 * @example
 * const { anims, getAnimatedStyle } = useStaggeredAnimation({ count: items.length });
 *
 * {items.map((item, index) => (
 *   <Animated.View key={item.id} style={getAnimatedStyle(index)}>
 *     ...
 *   </Animated.View>
 * ))}
 */
export function useStaggeredAnimation({
  count,
  trigger = true,
  staggerDelay = 80,
  tension = 50,
  friction = 8,
} = {}) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  const play = useCallback(() => {
    Animated.stagger(
      staggerDelay,
      anims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension,
          friction,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [staggerDelay, tension, friction]);

  const reset = useCallback(() => {
    anims.forEach((anim) => anim.setValue(0));
  }, []);

  useEffect(() => {
    if (trigger) {
      play();
    }
  }, [trigger, play]);

  // Get animated style for a specific index
  const getAnimatedStyle = useCallback(
    (index, options = {}) => {
      const { slideDirection = 'up', slideDistance = 20 } = options;
      const anim = anims[index];

      if (!anim) return {};

      const translateKey =
        slideDirection === 'left' || slideDirection === 'right'
          ? 'translateX'
          : 'translateY';

      const slideFrom =
        slideDirection === 'up' || slideDirection === 'left'
          ? slideDistance
          : -slideDistance;

      return {
        opacity: anim,
        transform: [
          {
            [translateKey]: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [slideFrom, 0],
            }),
          },
        ],
      };
    },
    [anims]
  );

  return {
    anims,
    getAnimatedStyle,
    reset,
    play,
  };
}

export default useStaggeredAnimation;
