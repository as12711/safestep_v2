/**
 * SafeStep Design System - "Urban Guardian"
 * ==========================================
 * A design language that feels like a trusted companion in the city at night.
 * Grounded, protective, community-powered.
 *
 * Design Principles:
 * 1. Night-forward - Dark mode essential, optimized for low-light use
 * 2. Clarity under stress - High contrast, immediate comprehension
 * 3. Streetlamp warmth - Amber/gold signals safety and guidance
 * 4. Community trust - Teal accents for connection and solidarity
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================
// COLOR SYSTEM
// ============================================================

export const colors = {
  // === BASE PALETTE ===
  // Warm slate foundation - not pure black, more inviting
  bg: {
    primary: '#0A0D10',      // Main background - deep with slight warmth
    secondary: '#0F1419',    // Elevated surfaces
    tertiary: '#1A1F26',     // Cards, sheets
    elevated: '#232A33',     // Highly elevated elements
    overlay: 'rgba(10, 13, 16, 0.85)', // Modal overlays
  },

  // Text hierarchy
  text: {
    primary: '#F7F9FA',      // Primary text - slightly warm white
    secondary: '#9BA8B5',    // Secondary info
    tertiary: '#5C6C7A',     // Disabled, hints
    inverse: '#0A0D10',      // Text on light backgrounds
  },

  // === SAFETY SPECTRUM ===
  // The core emotional language of SafeStep
  safety: {
    // Safe - Streetlamp amber glow
    safe: '#F5A623',
    safeMuted: 'rgba(245, 166, 35, 0.15)',
    safeGlow: 'rgba(245, 166, 35, 0.4)',

    // Moderate - Balanced
    moderate: '#E8B749',
    moderateMuted: 'rgba(232, 183, 73, 0.15)',

    // Caution - Soft orange
    caution: '#FF9F43',
    cautionMuted: 'rgba(255, 159, 67, 0.15)',

    // Alert - Coral (not aggressive red)
    alert: '#FF6B6B',
    alertMuted: 'rgba(255, 107, 107, 0.15)',

    // Critical - Deep coral
    critical: '#EE5A5A',
    criticalMuted: 'rgba(238, 90, 90, 0.15)',
  },

  // === COMMUNITY TEAL ===
  // Connection, solidarity, shared safety
  community: {
    primary: '#2DD4BF',      // Main teal
    muted: 'rgba(45, 212, 191, 0.15)',
    glow: 'rgba(45, 212, 191, 0.4)',
    light: '#5EEAD4',
    dark: '#14B8A6',
  },

  // === FEATURE COLORS ===
  feature: {
    blueLight: '#60A5FA',    // Campus blue light beacons
    blueLightMuted: 'rgba(96, 165, 250, 0.15)',

    safeHaven: '#A78BFA',    // Safe haven locations
    safeHavenMuted: 'rgba(167, 139, 250, 0.15)',

    homeBeacon: '#34D399',   // Home location
    homeBeaconMuted: 'rgba(52, 211, 153, 0.15)',

    route: '#F5A623',        // Active route
    routeAlt: '#9BA8B5',     // Alternative routes
  },

  // === UI ACCENTS ===
  ui: {
    border: 'rgba(155, 168, 181, 0.12)',
    borderFocus: 'rgba(245, 166, 35, 0.5)',
    divider: 'rgba(155, 168, 181, 0.08)',

    // Glass effect
    glass: 'rgba(26, 31, 38, 0.8)',
    glassBorder: 'rgba(247, 249, 250, 0.08)',

    // Interactive states
    pressed: 'rgba(247, 249, 250, 0.05)',
    hover: 'rgba(247, 249, 250, 0.08)',
  },

  // === STATUS INDICATORS ===
  status: {
    success: '#34D399',
    successMuted: 'rgba(52, 211, 153, 0.15)',

    info: '#60A5FA',
    infoMuted: 'rgba(96, 165, 250, 0.15)',

    warning: '#FBBF24',
    warningMuted: 'rgba(251, 191, 36, 0.15)',

    error: '#F87171',
    errorMuted: 'rgba(248, 113, 113, 0.15)',
  },

  // === MAP SPECIFIC ===
  map: {
    routeSafe: '#34D399',
    routeModerate: '#FBBF24',
    routeCaution: '#FB923C',
    routeDanger: '#F87171',

    heatmapSafe: 'rgba(52, 211, 153, 0.3)',
    heatmapDanger: 'rgba(248, 113, 113, 0.3)',
  },
};


// ============================================================
// TYPOGRAPHY
// ============================================================

// Font families - Plus Jakarta Sans for display, system for body
const fontFamily = {
  // Display and headings - distinctive
  display: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),

  // Body text - maximum legibility
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),

  // Monospace for data
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

export const typography = {
  // === DISPLAY - For big moments ===
  displayLarge: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  displayMedium: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.25,
  },

  // === HEADLINES ===
  headlineLarge: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  headlineMedium: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  headlineSmall: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },

  // === TITLES ===
  titleLarge: {
    fontFamily: fontFamily.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  titleMedium: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  titleSmall: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  // === BODY TEXT ===
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },

  // === LABELS ===
  labelLarge: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
  labelSmall: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // === DATA/MONO ===
  dataLarge: {
    fontFamily: fontFamily.mono,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  dataMedium: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  dataSmall: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
};


// ============================================================
// SPACING SYSTEM (8px base grid)
// ============================================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  massive: 96,
};


// ============================================================
// BORDER RADIUS
// ============================================================

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
};


// ============================================================
// SHADOWS & ELEVATION
// ============================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },

  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },

  // Colored glows for emphasis
  glow: (color, intensity = 0.4) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: intensity,
    shadowRadius: 20,
    elevation: 8,
  }),

  safetyGlow: {
    shadowColor: colors.safety.safe,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  alertGlow: {
    shadowColor: colors.safety.alert,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};


// ============================================================
// ANIMATION PRESETS
// ============================================================

export const animation = {
  // Durations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    glacial: 1000,
  },

  // Easing curves (for useNativeDriver compatible animations)
  easing: {
    // Standard Material curves approximated
    standard: { type: 'timing', duration: 300 },
    emphasized: { type: 'spring', damping: 15, stiffness: 150 },
    gentle: { type: 'spring', damping: 20, stiffness: 100 },
    bouncy: { type: 'spring', damping: 10, stiffness: 180 },
  },

  // Common animation patterns
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 300,
  },

  slideUp: {
    from: { translateY: 20, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: 400,
  },

  scaleIn: {
    from: { scale: 0.9, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 300,
  },

  pulse: {
    scale: [1, 1.05, 1],
    duration: 1500,
  },
};


// ============================================================
// LAYOUT CONSTANTS
// ============================================================

export const layout = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // Safe areas
  safeArea: {
    top: Platform.OS === 'ios' ? 47 : 24,
    bottom: Platform.OS === 'ios' ? 34 : 16,
  },

  // Navigation
  bottomNav: {
    height: 80,
    iconSize: 24,
    labelSize: 10,
  },

  // Headers
  header: {
    height: 56,
    compactHeight: 44,
  },

  // Sheets
  sheet: {
    handleHeight: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    peek: 200,
  },

  // Map
  map: {
    padding: {
      top: 120,
      right: 16,
      bottom: 200,
      left: 16,
    },
  },

  // Touch targets (accessibility)
  touch: {
    minSize: 44,
    comfortable: 48,
    large: 56,
  },
};


// ============================================================
// COMPONENT PRESETS
// ============================================================

export const components = {
  // Button variants
  button: {
    primary: {
      backgroundColor: colors.safety.safe,
      textColor: colors.bg.primary,
      borderRadius: radius.lg,
      height: 56,
    },
    secondary: {
      backgroundColor: colors.bg.tertiary,
      textColor: colors.text.primary,
      borderColor: colors.ui.border,
      borderRadius: radius.lg,
      height: 56,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: colors.text.primary,
      borderRadius: radius.md,
      height: 48,
    },
    danger: {
      backgroundColor: colors.safety.alert,
      textColor: colors.text.primary,
      borderRadius: radius.lg,
      height: 56,
    },
    community: {
      backgroundColor: colors.community.primary,
      textColor: colors.bg.primary,
      borderRadius: radius.lg,
      height: 56,
    },
  },

  // Card variants
  card: {
    default: {
      backgroundColor: colors.bg.tertiary,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    elevated: {
      backgroundColor: colors.bg.elevated,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.md,
    },
    glass: {
      backgroundColor: colors.ui.glass,
      borderColor: colors.ui.glassBorder,
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    safety: {
      backgroundColor: colors.safety.safeMuted,
      borderColor: colors.safety.safe,
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    alert: {
      backgroundColor: colors.safety.alertMuted,
      borderColor: colors.safety.alert,
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
  },

  // Input styles
  input: {
    default: {
      backgroundColor: colors.bg.tertiary,
      borderColor: colors.ui.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      height: 52,
      paddingHorizontal: spacing.lg,
    },
    focused: {
      borderColor: colors.safety.safe,
      borderWidth: 2,
    },
    error: {
      borderColor: colors.status.error,
      borderWidth: 2,
    },
  },

  // Badge/chip styles
  badge: {
    safe: {
      backgroundColor: colors.safety.safeMuted,
      textColor: colors.safety.safe,
      borderRadius: radius.round,
    },
    caution: {
      backgroundColor: colors.safety.cautionMuted,
      textColor: colors.safety.caution,
      borderRadius: radius.round,
    },
    alert: {
      backgroundColor: colors.safety.alertMuted,
      textColor: colors.safety.alert,
      borderRadius: radius.round,
    },
    community: {
      backgroundColor: colors.community.muted,
      textColor: colors.community.primary,
      borderRadius: radius.round,
    },
  },

  // Map markers
  marker: {
    user: {
      size: 24,
      color: colors.safety.safe,
      pulseColor: colors.safety.safeGlow,
    },
    destination: {
      size: 32,
      color: colors.community.primary,
    },
    blueLight: {
      size: 28,
      color: colors.feature.blueLight,
      glowColor: colors.feature.blueLightMuted,
    },
    safeHaven: {
      size: 28,
      color: colors.feature.safeHaven,
      glowColor: colors.feature.safeHavenMuted,
    },
    incident: {
      size: 24,
      color: colors.safety.alert,
      glowColor: colors.safety.alertMuted,
    },
    homeBeacon: {
      size: 32,
      color: colors.feature.homeBeacon,
      glowColor: colors.feature.homeBeaconMuted,
    },
  },
};


// ============================================================
// SAFETY SCORE HELPERS
// ============================================================

export const getSafetyColor = (score) => {
  if (score >= 80) return colors.safety.safe;
  if (score >= 60) return colors.safety.moderate;
  if (score >= 40) return colors.safety.caution;
  if (score >= 20) return colors.safety.alert;
  return colors.safety.critical;
};

export const getSafetyLabel = (score) => {
  if (score >= 80) return 'Very Safe';
  if (score >= 60) return 'Safe';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Use Caution';
  return 'High Risk';
};

export const getSafetyBackground = (score) => {
  if (score >= 80) return colors.safety.safeMuted;
  if (score >= 60) return colors.safety.moderateMuted;
  if (score >= 40) return colors.safety.cautionMuted;
  if (score >= 20) return colors.safety.alertMuted;
  return colors.safety.criticalMuted;
};


// ============================================================
// EXPORT UNIFIED THEME
// ============================================================

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  layout,
  components,
  getSafetyColor,
  getSafetyLabel,
  getSafetyBackground,
};

export default theme;
