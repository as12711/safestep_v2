/**
 * SafeStep Animation Utilities
 * ============================
 * Reusable animation configurations and utilities for smooth,
 * delightful micro-interactions throughout the app.
 *
 * Features:
 * - Spring animations for natural feel
 * - Entrance/exit transitions
 * - Loading states
 * - Success/error feedback
 * - Map camera animations
 */

import { Animated, Easing, Platform } from 'react-native';

// ===========================================
// ANIMATION PRESETS
// ===========================================

export const TIMING = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

export const SPRING = {
  // Default spring - snappy and responsive
  default: {
    friction: 8,
    tension: 100,
    useNativeDriver: true,
  },
  // Gentle spring - for subtle movements
  gentle: {
    friction: 10,
    tension: 60,
    useNativeDriver: true,
  },
  // Bouncy spring - for playful feedback
  bouncy: {
    friction: 4,
    tension: 80,
    useNativeDriver: true,
  },
  // Stiff spring - for quick snaps
  stiff: {
    friction: 12,
    tension: 200,
    useNativeDriver: true,
  },
};

export const EASING = {
  ease: Easing.bezier(0.25, 0.1, 0.25, 1),
  easeIn: Easing.bezier(0.42, 0, 1, 1),
  easeOut: Easing.bezier(0, 0, 0.58, 1),
  easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
  // Custom SafeStep curves
  smooth: Easing.bezier(0.4, 0, 0.2, 1),
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
};

// ===========================================
// ANIMATION FACTORIES
// ===========================================

/**
 * Create a fade animation
 */
export const createFadeAnimation = (
  animValue,
  { toValue = 1, duration = TIMING.normal, delay = 0, useNativeDriver = true } = {}
) => {
  return Animated.timing(animValue, {
    toValue,
    duration,
    delay,
    easing: EASING.easeOut,
    useNativeDriver,
  });
};

/**
 * Create a scale animation
 */
export const createScaleAnimation = (
  animValue,
  { toValue = 1, duration = TIMING.fast, useNativeDriver = true } = {}
) => {
  return Animated.spring(animValue, {
    toValue,
    ...SPRING.default,
    useNativeDriver,
  });
};

/**
 * Create a slide animation
 */
export const createSlideAnimation = (
  animValue,
  { toValue = 0, duration = TIMING.normal, useNativeDriver = true } = {}
) => {
  return Animated.timing(animValue, {
    toValue,
    duration,
    easing: EASING.decelerate,
    useNativeDriver,
  });
};

// ===========================================
// COMPOSITE ANIMATIONS
// ===========================================

/**
 * Entrance animation - fade in + scale up
 */
export const entranceAnimation = (opacity, scale, { delay = 0, duration = TIMING.normal } = {}) => {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      delay,
      ...SPRING.default,
    }),
  ]);
};

/**
 * Exit animation - fade out + scale down
 */
export const exitAnimation = (opacity, scale, { duration = TIMING.fast } = {}) => {
  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      easing: EASING.easeIn,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 0.9,
      duration,
      easing: EASING.easeIn,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Slide up entrance (for bottom sheets)
 */
export const slideUpEntrance = (
  translateY,
  opacity,
  { distance = 100, duration = TIMING.normal } = {}
) => {
  translateY.setValue(distance);
  opacity.setValue(0);

  return Animated.parallel([
    Animated.spring(translateY, {
      toValue: 0,
      ...SPRING.default,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Pulse animation for attention
 */
export const createPulseAnimation = (
  animValue,
  { minScale = 1, maxScale = 1.05, duration = 1000 } = {}
) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: maxScale,
        duration: duration / 2,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: minScale,
        duration: duration / 2,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Shake animation for error feedback
 */
export const createShakeAnimation = (translateX, { intensity = 10, duration = 400 } = {}) => {
  return Animated.sequence([
    Animated.timing(translateX, {
      toValue: intensity,
      duration: duration / 6,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: -intensity,
      duration: duration / 6,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: intensity * 0.7,
      duration: duration / 6,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: -intensity * 0.7,
      duration: duration / 6,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, {
      toValue: intensity * 0.3,
      duration: duration / 6,
      useNativeDriver: true,
    }),
    Animated.timing(translateX, { toValue: 0, duration: duration / 6, useNativeDriver: true }),
  ]);
};

/**
 * Success checkmark animation
 */
export const createSuccessAnimation = (scale, opacity, { duration = TIMING.normal } = {}) => {
  scale.setValue(0);
  opacity.setValue(0);

  return Animated.sequence([
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.2,
        ...SPRING.bouncy,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ]),
    Animated.spring(scale, {
      toValue: 1,
      ...SPRING.default,
    }),
  ]);
};

// ===========================================
// MAP CAMERA ANIMATIONS
// ===========================================

/**
 * Animate map to user location with street-level zoom
 */
export const animateToStreetLevel = (
  mapRef,
  location,
  { bearing = 0, pitch = 60, zoom = 18, duration = 1000 } = {}
) => {
  if (!mapRef?.current || !location) return;

  try {
    mapRef.current.animateCamera(
      {
        center: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        pitch,
        heading: bearing,
        zoom,
      },
      { duration }
    );
  } catch (e) {
    console.log('Map animation error:', e?.message);
  }
};

/**
 * Fit map to show route with padding
 */
export const fitToRoute = (
  mapRef,
  coordinates,
  { edgePadding = { top: 150, right: 50, bottom: 250, left: 50 }, animated = true } = {}
) => {
  if (!mapRef?.current || !coordinates?.length) return;

  try {
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding,
      animated,
    });
  } catch (e) {
    console.log('Fit to route error:', e?.message);
  }
};

/**
 * Smooth camera transition for navigation
 * Shows route overview first, then zooms to street level
 */
export const startNavigationCameraSequence = async (
  mapRef,
  location,
  routeCoords,
  bearing,
  { overviewDuration = 1500, zoomDuration = 1000 } = {}
) => {
  if (!mapRef?.current) return;

  // Step 1: Show route overview
  fitToRoute(mapRef, routeCoords);

  // Step 2: Zoom to street level after delay
  await new Promise(resolve => setTimeout(resolve, overviewDuration));

  animateToStreetLevel(mapRef, location, {
    bearing,
    pitch: 60,
    zoom: 18,
    duration: zoomDuration,
  });
};

// ===========================================
// STAGGERED LIST ANIMATIONS
// ===========================================

/**
 * Create staggered entrance animations for a list
 */
export const createStaggeredEntrance = (
  items,
  animValues,
  { staggerDelay = 50, duration = TIMING.normal } = {}
) => {
  const animations = items.map((_, index) => {
    return Animated.timing(animValues[index], {
      toValue: 1,
      duration,
      delay: index * staggerDelay,
      easing: EASING.easeOut,
      useNativeDriver: true,
    });
  });

  return Animated.parallel(animations);
};

// ===========================================
// INTERPOLATION HELPERS
// ===========================================

/**
 * Create opacity interpolation from 0-1 range
 */
export const interpolateOpacity = (
  animValue,
  { inputRange = [0, 1], outputRange = [0, 1] } = {}
) => {
  return animValue.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });
};

/**
 * Create scale interpolation with bounce effect
 */
export const interpolateScaleBounce = animValue => {
  return animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.1, 1],
    extrapolate: 'clamp',
  });
};

/**
 * Create translate Y interpolation for slide effects
 */
export const interpolateSlideY = (animValue, distance = 50) => {
  return animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
    extrapolate: 'clamp',
  });
};

// ===========================================
// HOOK: useAnimatedValue
// ===========================================

import { useRef, useEffect, useMemo } from 'react';

/**
 * Hook to create and manage an animated value
 */
export const useAnimatedValue = (initialValue = 0) => {
  const animValue = useRef(new Animated.Value(initialValue)).current;

  useEffect(() => {
    return () => {
      animValue.stopAnimation();
    };
  }, [animValue]);

  return animValue;
};

/**
 * Hook for entrance animation
 *
 * @param {Array} deps - Dependency array. Values are compared by serialization,
 *   so inline array literals will work correctly without causing infinite loops.
 *   Pass undefined or omit the parameter to run only on mount.
 */
export const useEntranceAnimation = (deps = []) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const prevDepsKeyRef = useRef(null);

  // Serialize dependencies for comparison to avoid infinite loops when callers
  // pass inline array literals like useEntranceAnimation([someVar])
  const depsKey = useMemo(
    () => {
      if (!deps || deps.length === 0) return 'empty';
      try {
        return JSON.stringify(deps);
      } catch (e) {
        // Fallback: use array length and first few values if serialization fails
        return `${deps.length}:${String(deps[0])}`;
      }
      // Spread deps array so useMemo tracks individual values, not the array reference
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    deps.length === 0 ? [] : [...deps]
  );

  useEffect(() => {
    // Only run animation if dependencies actually changed
    if (prevDepsKeyRef.current !== depsKey) {
      entranceAnimation(opacity, scale).start();
      prevDepsKeyRef.current = depsKey;
    }
  }, [depsKey, opacity, scale]);

  return { opacity, scale };
};

// ===========================================
// EXPORTS
// ===========================================

export default {
  TIMING,
  SPRING,
  EASING,
  createFadeAnimation,
  createScaleAnimation,
  createSlideAnimation,
  entranceAnimation,
  exitAnimation,
  slideUpEntrance,
  createPulseAnimation,
  createShakeAnimation,
  createSuccessAnimation,
  animateToStreetLevel,
  fitToRoute,
  startNavigationCameraSequence,
  createStaggeredEntrance,
  interpolateOpacity,
  interpolateScaleBounce,
  interpolateSlideY,
  useAnimatedValue,
  useEntranceAnimation,
};
