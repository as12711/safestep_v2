/**
 * SafeStep Design System
 * ======================
 * Industrial Steel Theme - Dark Mode
 * 
 * Design Philosophy:
 * - High contrast, sharp edges
 * - Bold typography with hierarchy
 * - Animated 3D markers with pulse effects
 * - Prominent CTAs with haptic feedback
 * - Industrial steel aesthetic
 * 
 * Inspiration: Citizen app meets Apple Maps with brutalist accents
 */

import { Dimensions, Platform } from 'react-native';

// Import centralized colors
import { COLORS, GRADIENTS, C, G, getStatusColor, getStatusDimColor } from './colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Re-export colors from centralized source
export { COLORS, GRADIENTS, C, G, getStatusColor, getStatusDimColor };

// ===========================================
// TYPOGRAPHY SYSTEM
// ===========================================
export const TYPOGRAPHY = {
  // === Display (Hero headers) ===
  displayLarge: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  displayMedium: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 40,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  
  // === Headlines ===
  headlineLarge: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },
  
  // === Body Text ===
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 21,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  
  // === Labels & Captions ===
  labelLarge: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  
  // === Monospace (for data/stats) ===
  mono: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0,
  },
};

// ===========================================
// SPACING & LAYOUT
// ===========================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ===========================================
// SHADOWS - BRUTALIST (minimal but impactful)
// ===========================================
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// ===========================================
// ANIMATION PRESETS
// ===========================================
export const ANIMATION = {
  // Timing
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  
  // Easing (for react-native Animated)
  easeOut: { 
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  },
  spring: {
    friction: 8,
    tension: 100,
    useNativeDriver: true,
  },
  bounce: {
    friction: 4,
    tension: 80,
    useNativeDriver: true,
  },
  
  // Pulse animation values
  pulse: {
    minScale: 1,
    maxScale: 1.5,
    duration: 1500,
  },
  
  // Marker elevation
  markerFloat: {
    minY: 0,
    maxY: -8,
    duration: 2000,
  },
};

// ===========================================
// MARKER STYLES - 3D ANIMATED SAFETY MARKERS
// ===========================================
export const MARKERS = {
  // Base marker sizes
  size: {
    sm: 32,
    md: 44,
    lg: 56,
    xl: 72,
  },
  
  // Blue Light Emergency beacons
  blueLight: {
    icon: '🔵',
    backgroundColor: COLORS.blueLightGlow,
    borderColor: COLORS.blueLight,
    pulseColor: COLORS.blueLight,
    size: 'lg',
  },
  
  // Safe Haven locations
  safeHaven: {
    icon: '🛡️',
    backgroundColor: COLORS.safeHavenGlow,
    borderColor: COLORS.safeHaven,
    pulseColor: COLORS.safeHaven,
    size: 'md',
  },
  
  // Campus Safety
  campusSafety: {
    icon: '👮',
    backgroundColor: COLORS.safeDim,
    borderColor: COLORS.safe,
    pulseColor: COLORS.safe,
    size: 'xl',
  },
  
  // User location
  user: {
    icon: '📍',
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
    pulseColor: COLORS.primary,
    size: 'md',
  },
  
  // Destination
  destination: {
    icon: '🎯',
    backgroundColor: COLORS.secondaryDim,
    borderColor: COLORS.secondary,
    pulseColor: COLORS.secondary,
    size: 'lg',
  },
  
  // Danger/Report zones
  danger: {
    icon: '⚠️',
    backgroundColor: COLORS.dangerDim,
    borderColor: COLORS.danger,
    pulseColor: COLORS.danger,
    size: 'md',
  },
  
  // Home beacon points
  homeBeacon: {
    icon: '🏠',
    backgroundColor: COLORS.homeBeaconGlow,
    borderColor: COLORS.homeBeacon,
    pulseColor: COLORS.homeBeacon,
    size: 'lg',
  },
};

// ===========================================
// BUTTON PRESETS - BOLD CTAs
// ===========================================
export const BUTTONS = {
  // Primary action (Navigate, Start)
  primary: {
    backgroundColor: COLORS.primary,
    textColor: COLORS.textInverse,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...TYPOGRAPHY.labelLarge,
    ...SHADOWS.md,
  },
  
  // Secondary action
  secondary: {
    backgroundColor: COLORS.surface2,
    textColor: COLORS.text,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...TYPOGRAPHY.labelLarge,
  },
  
  // Danger action (Report, Emergency)
  danger: {
    backgroundColor: COLORS.danger,
    textColor: COLORS.text,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...TYPOGRAPHY.labelLarge,
    ...SHADOWS.glow(COLORS.danger),
  },
  
  // Ghost button
  ghost: {
    backgroundColor: 'transparent',
    textColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...TYPOGRAPHY.labelMedium,
  },
  
  // Home Beacon special button
  homeBeacon: {
    backgroundColor: COLORS.homeBeacon,
    textColor: COLORS.textInverse,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    ...TYPOGRAPHY.headlineMedium,
    ...SHADOWS.glow(COLORS.homeBeacon),
  },
  
  // Floating Action Button
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
};

// ===========================================
// CARD PRESETS
// ===========================================
export const CARDS = {
  // Standard card
  default: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  
  // Elevated card (for important info)
  elevated: {
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  
  // Glass card (for overlays)
  glass: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    backdropFilter: 'blur(12px)',
  },
  
  // Alert card (for warnings)
  alert: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    padding: SPACING.lg,
  },
  
  // Success card
  success: {
    backgroundColor: COLORS.safeDim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.safe,
    padding: SPACING.lg,
  },
};

// ===========================================
// LAYOUT CONSTANTS
// ===========================================
export const LAYOUT = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  headerHeight: 100,
  bottomSheetPeek: 200,
  bottomNavHeight: 85,
  mapPadding: { top: 120, right: 20, bottom: 250, left: 20 },
  safeAreaTop: Platform.OS === 'ios' ? 47 : 24,
  safeAreaBottom: Platform.OS === 'ios' ? 34 : 16,
};

// ===========================================
// SAFETY MESSAGING
// ===========================================
export const SAFETY_MESSAGES = {
  reportFooter: "Your reports help inform our safe route building algorithm",
  homeBeaconSetup: "Set up Home Beacon to automatically notify your emergency contacts when you arrive home safely. No more 'did you make it home?' texts!",
  homeBeaconReady: "Your emergency contacts will be notified when you arrive at your saved home location.",
  photoUploadNotice: "Uploading a photo with your report helps verify information more quickly",
  emergencyReminder: "In an emergency, call 911 first",
};

// ===========================================
// URBAN GUARDIAN DESIGN SYSTEM (NEW)
// ===========================================
// The new design system used by all v2.0 screens
// Import directly: import { theme } from './theme/designSystem';
export { theme, theme as urbanGuardian } from './designSystem';

// Export all as default for convenience
// NOTE: This is the legacy "Industrial Steel" theme
// New screens should use the Urban Guardian theme from designSystem.js
export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  MARKERS,
  BUTTONS,
  CARDS,
  LAYOUT,
  SAFETY_MESSAGES,
};
