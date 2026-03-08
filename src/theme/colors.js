/**
 * SafeStep Unified Color System
 * ==============================
 * Industrial Steel Theme - Dark Mode
 * 
 * Single source of truth for all colors across the app.
 * Import this file instead of defining colors locally.
 */

// ===========================================
// CORE COLOR PALETTE - INDUSTRIAL STEEL
// ===========================================
export const COLORS = {
  // === Base Dark Theme ===
  bg: '#000000',                           // Pure black background
  surface: '#0d0d0f',                      // Slightly lifted surface
  surface2: '#1a1a1f',                     // Card backgrounds
  surface3: '#1C1C1F',                     // Elevated elements
  surfaceGlass: 'rgba(20, 20, 25, 0.85)',  // Glassmorphism overlay
  
  // === Borders & Dividers ===
  border: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(255, 255, 255, 0.15)',
  divider: 'rgba(255, 255, 255, 0.04)',
  
  // === Brand Colors - Industrial Steel ===
  primary: '#A8B5C4',                      // Steel silver - main branding
  primaryDim: 'rgba(168, 181, 196, 0.15)',
  primaryMuted: '#8B9AAB',                 // Muted steel for secondary
  
  secondary: '#6B7B8C',                    // Darker steel
  secondaryDim: 'rgba(107, 123, 140, 0.15)',
  
  accent: '#C0C8D0',                       // Light silver accent
  accentDim: 'rgba(192, 200, 208, 0.15)',
  
  // === Steel Variants ===
  steel: '#8B9AAB',                        // Steel blue-gray
  steelDim: 'rgba(139, 154, 171, 0.15)',
  silver: '#C0C8D0',                       // Light silver
  silverDim: 'rgba(192, 200, 208, 0.15)',
  
  // === Status Colors ===
  safe: '#00f5d4',                         // Teal for safe routes
  safeDim: 'rgba(0, 245, 212, 0.12)',
  safeGlow: 'rgba(0, 245, 212, 0.4)',
  
  warn: '#FFB347',                         // Soft orange warning
  warnDim: 'rgba(255, 179, 71, 0.12)',
  warnGlow: 'rgba(255, 179, 71, 0.4)',
  
  caution: '#FF9F0A',                      // Orange - caution zones
  cautionDim: 'rgba(255, 159, 10, 0.12)',
  cautionGlow: 'rgba(255, 159, 10, 0.4)',
  
  danger: '#ff6b6b',                       // Red danger
  dangerDim: 'rgba(255, 107, 107, 0.12)',
  dangerGlow: 'rgba(255, 107, 107, 0.5)',
  
  // === Feature Colors ===
  blue: '#00bbf9',                         // Bright blue
  blueDim: 'rgba(0, 187, 249, 0.15)',
  
  blueLight: '#64D2FF',                    // Blue light beacons
  blueLightGlow: 'rgba(100, 210, 255, 0.6)',
  
  safeHaven: '#BF5AF2',                    // Purple - safe havens
  safeHavenGlow: 'rgba(191, 90, 242, 0.5)',
  
  homeBeacon: '#00f5d4',                   // Teal - home beacon feature
  homeBeaconGlow: 'rgba(0, 245, 212, 0.4)',
  
  purple: '#7C8A9A',                       // Muted purple-gray
  purpleDim: 'rgba(124, 138, 154, 0.15)',
  
  pink: '#9BA8B8',                         // Muted pink-gray
  pinkDim: 'rgba(155, 168, 184, 0.15)',
  
  // === Text Colors ===
  text: '#ffffff',                         // Primary text
  text2: '#9ca3af',                        // Secondary text
  text3: '#6b7280',                        // Tertiary/disabled
  textInverse: '#000000',                  // Text on light backgrounds
  
  // === Legacy Aliases (for backwards compatibility) ===
  gold: '#A8B5C4',                         // Alias to steel primary
  goldDim: 'rgba(168, 181, 196, 0.15)',
  amber: '#8B9AAB',                        // Alias to steel
  amberDim: 'rgba(139, 154, 171, 0.15)',
  
  // === Special ===
  overlay: 'rgba(0, 0, 0, 0.85)',
  glass: 'rgba(28, 28, 34, 0.92)',
};

// ===========================================
// GRADIENT PRESETS
// ===========================================
export const GRADIENTS = {
  // Primary steel gradient - main buttons
  primary: ['#B8C5D4', '#A8B5C4', '#8B9AAB'],
  
  // Silver highlight gradient - hero cards
  silver: ['#D0D8E0', '#C0C8D0', '#A8B5C4'],
  
  // Subtle dark gradient - cards
  dark: ['rgba(45, 50, 60, 0.9)', 'rgba(30, 35, 42, 0.95)', 'rgba(20, 22, 28, 1)'],
  
  // Glass effect - overlays
  glass: ['rgba(168, 181, 196, 0.2)', 'rgba(168, 181, 196, 0.05)', 'transparent'],
  
  // Safe route gradient
  safe: ['#00f5d4', '#00d4b8', '#00b89c'],
  
  // Status gradients
  danger: ['#ff6b6b', '#ff5252', '#ff4040'],
  warn: ['#FFB347', '#FFA033', '#FF8C00'],
  
  // Feature gradients
  purple: ['#BF5AF2', '#9D4EDD', '#7C3AED'],
  blue: ['#0A84FF', '#64D2FF', '#00bbf9'],
  
  // Disabled state
  disabled: ['#4a5568', '#3d4552', '#2d3748'],
};

// ===========================================
// SEMANTIC COLOR HELPERS
// ===========================================
export const getStatusColor = (status) => {
  switch (status) {
    case 'safe':
    case 'success':
    case 'active':
      return COLORS.safe;
    case 'warning':
    case 'caution':
      return COLORS.warn;
    case 'danger':
    case 'error':
      return COLORS.danger;
    default:
      return COLORS.text2;
  }
};

export const getStatusDimColor = (status) => {
  switch (status) {
    case 'safe':
    case 'success':
    case 'active':
      return COLORS.safeDim;
    case 'warning':
    case 'caution':
      return COLORS.warnDim;
    case 'danger':
    case 'error':
      return COLORS.dangerDim;
    default:
      return COLORS.primaryDim;
  }
};

// Shorthand alias for convenience
export const C = COLORS;
export const G = GRADIENTS;

export default COLORS;
