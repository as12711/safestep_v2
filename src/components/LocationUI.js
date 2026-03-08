/**
 * SafeStep GPS/Location UI Components
 * ====================================
 * Citizen-inspired brutalist design + Apple Maps minimalist action buttons
 * 
 * Features:
 * - GPS signal strength indicator
 * - Location status banners
 * - Smooth animated transitions
 * - Modern emoji-style markers
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LOCATION_STATUS, MOVEMENT_STATE } from '../services/locationService';

// ============================================
// THEME - Futuristic Brutalist Steel
// ============================================
const THEME = {
  // Steel/Silver brutalist palette
  bg: '#000000',
  surface: '#0d0d0f',
  surface2: '#1a1a1f',
  surfaceGlass: 'rgba(15, 15, 18, 0.95)',
  border: 'rgba(168, 181, 196, 0.15)',
  
  // Status colors - Steel accent
  primary: '#A8B5C4',
  active: '#A8B5C4',
  warning: '#FFB347',
  danger: '#FF6B6B',
  info: '#7A8A9A',
  
  // Text
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  
  // Shadows - More dramatic for brutalist
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
};

// ============================================
// GPS SIGNAL STRENGTH INDICATOR
// ============================================
/**
 * Visual GPS signal bars like cell signal
 * Citizen-inspired with animated bars
 */
export function GPSSignalIndicator({ level = 0, animated = true }) {
  const barAnims = useRef([
    new Animated.Value(level >= 1 ? 1 : 0.3),
    new Animated.Value(level >= 2 ? 1 : 0.3),
    new Animated.Value(level >= 3 ? 1 : 0.3),
  ]).current;
  
  const colors = {
    0: THEME.danger,
    1: THEME.warning,
    2: THEME.active,
    3: THEME.active,
  };
  
  useEffect(() => {
    if (animated) {
      barAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: level >= i + 1 ? 1 : 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [level, animated]);
  
  return (
    <View style={styles.signalContainer}>
      <Text style={styles.signalIcon}>📡</Text>
      <View style={styles.signalBars}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.signalBar,
              { height: 8 + i * 4 },
              { 
                backgroundColor: level > i ? colors[level] : 'rgba(255,255,255,0.2)',
                opacity: animated ? barAnims[i] : (level > i ? 1 : 0.3),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================
// LOCATION STATUS BANNER
// ============================================
/**
 * Full-width status banner for GPS alerts
 * Shows when searching, low signal, or error
 */
export function LocationStatusBanner({ 
  status, 
  accuracy,
  onDismiss,
  onRetry,
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [visible, setVisible] = useState(false);
  
  const statusConfig = {
    [LOCATION_STATUS.SEARCHING]: {
      show: true,
      icon: '🔍',
      text: 'Searching for GPS signal...',
      subtext: 'Move to an open area for better reception',
      color: THEME.warning,
      showRetry: false,
      autoDismiss: false,
    },
    [LOCATION_STATUS.LOW_ACCURACY]: {
      show: true,
      icon: '⚠️',
      text: 'Low GPS accuracy',
      subtext: accuracy ? `±${Math.round(accuracy)}m` : 'Signal is weak',
      color: THEME.warning,
      showRetry: true,
      autoDismiss: true,
    },
    [LOCATION_STATUS.NO_SIGNAL]: {
      show: true,
      icon: '❌',
      text: 'GPS signal lost',
      subtext: 'Check if location services are enabled',
      color: THEME.danger,
      showRetry: true,
      autoDismiss: false,
    },
    [LOCATION_STATUS.PERMISSION_DENIED]: {
      show: true,
      icon: '🚫',
      text: 'Location access denied',
      subtext: 'Enable location in Settings to use navigation',
      color: THEME.danger,
      showRetry: true,
      autoDismiss: false,
    },
    [LOCATION_STATUS.SERVICES_DISABLED]: {
      show: true,
      icon: '📵',
      text: 'Location services off',
      subtext: 'Enable Location Services in your device settings',
      color: THEME.danger,
      showRetry: true,
      autoDismiss: false,
    },
    [LOCATION_STATUS.ACTIVE]: {
      show: false,
    },
    [LOCATION_STATUS.INITIALIZING]: {
      show: true,
      icon: '📡',
      text: 'Starting GPS...',
      subtext: 'Please wait',
      color: THEME.info,
      showRetry: false,
      autoDismiss: true,
    },
  };
  
  const config = statusConfig[status] || { show: false };
  
  useEffect(() => {
    if (config.show) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
      
      // Auto-dismiss after 5 seconds if configured
      if (config.autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [status, config.show]);
  
  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    });
  };
  
  if (!visible) return null;
  
  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { 
          transform: [{ translateY: slideAnim }],
          borderLeftColor: config.color,
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>{config.icon}</Text>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: config.color }]}>
            {config.text}
          </Text>
          <Text style={styles.bannerSubtext}>{config.subtext}</Text>
        </View>
      </View>
      
      <View style={styles.bannerActions}>
        {config.showRetry && onRetry && (
          <TouchableOpacity 
            style={[styles.bannerButton, { backgroundColor: config.color + '20' }]}
            onPress={onRetry}
          >
            <Text style={[styles.bannerButtonText, { color: config.color }]}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.bannerDismiss} onPress={handleDismiss}>
          <Text style={styles.bannerDismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// ACCURACY BADGE
// ============================================
/**
 * Small badge showing GPS accuracy in meters
 * Apple Maps style minimal design
 */
export function AccuracyBadge({ accuracy, style }) {
  if (!accuracy) return null;
  
  const color = accuracy <= 5 ? THEME.active 
    : accuracy <= 15 ? THEME.active 
    : accuracy <= 50 ? THEME.warning 
    : THEME.danger;
  
  const label = accuracy <= 5 ? 'Excellent' 
    : accuracy <= 15 ? 'Good' 
    : accuracy <= 50 ? 'Fair' 
    : 'Poor';
  
  return (
    <View style={[styles.accuracyBadge, { borderColor: color + '40' }, style]}>
      <View style={[styles.accuracyDot, { backgroundColor: color }]} />
      <Text style={styles.accuracyText}>±{Math.round(accuracy)}m</Text>
      <Text style={[styles.accuracyLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================
// MOVEMENT STATE INDICATOR
// ============================================
/**
 * Shows current movement state with animated icon
 */
export function MovementIndicator({ state, speed }) {
  const icons = {
    [MOVEMENT_STATE.STATIONARY]: '🧍',
    [MOVEMENT_STATE.WALKING]: '🚶',
    [MOVEMENT_STATE.RUNNING]: '🏃',
    [MOVEMENT_STATE.VEHICLE]: '🚗',
  };
  
  const labels = {
    [MOVEMENT_STATE.STATIONARY]: 'Stationary',
    [MOVEMENT_STATE.WALKING]: 'Walking',
    [MOVEMENT_STATE.RUNNING]: 'Running',
    [MOVEMENT_STATE.VEHICLE]: 'In Vehicle',
  };
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (state === MOVEMENT_STATE.WALKING || state === MOVEMENT_STATE.RUNNING) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);
  
  return (
    <View style={styles.movementContainer}>
      <Animated.Text 
        style={[styles.movementIcon, { transform: [{ scale: pulseAnim }] }]}
      >
        {icons[state]}
      </Animated.Text>
      <View style={styles.movementInfo}>
        <Text style={styles.movementLabel}>{labels[state]}</Text>
        {speed > 0 && (
          <Text style={styles.movementSpeed}>
            {(speed * 3.6).toFixed(1)} km/h
          </Text>
        )}
      </View>
    </View>
  );
}

// ============================================
// PULSING USER MARKER
// ============================================
/**
 * Animated user location marker with pulse effect
 * Citizen-style with accuracy ring
 */
export function PulsingUserMarker({ 
  accuracy,
  heading,
  isNavigating = false,
  style,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  
  // Calculate accuracy ring size (capped at 100px)
  const accuracyRingSize = accuracy ? Math.min(accuracy * 2, 100) : 40;
  
  return (
    <View style={[styles.userMarkerContainer, style]}>
      {/* Accuracy ring */}
      <Animated.View
        style={[
          styles.accuracyRing,
          {
            width: accuracyRingSize,
            height: accuracyRingSize,
            borderRadius: accuracyRingSize / 2,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      
      {/* Direction indicator (arrow) */}
      {isNavigating && heading !== undefined && (
        <View 
          style={[
            styles.directionArrow,
            { transform: [{ rotate: `${heading}deg` }] },
          ]}
        >
          <View style={styles.directionArrowInner} />
        </View>
      )}
      
      {/* Center dot */}
      <View style={styles.userDotOuter}>
        <View style={styles.userDotInner} />
      </View>
    </View>
  );
}

// ============================================
// ANIMATED EMOJI MARKER
// ============================================
/**
 * Citizen-style animated emoji markers for reports
 * Modern, animated, brutalist design
 */
export function AnimatedEmojiMarker({
  emoji,
  label,
  color = THEME.active,
  verified = false,
  pulsate = false,
  size = 'medium',
  onPress,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    if (pulsate) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }
  }, [pulsate]);
  
  const sizes = {
    small: { container: 32, emoji: 16, glow: 40 },
    medium: { container: 44, emoji: 22, glow: 56 },
    large: { container: 56, emoji: 28, glow: 72 },
  };
  
  const s = sizes[size];
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.emojiMarkerContainer, { width: s.glow, height: s.glow }]}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.emojiGlow,
            {
              backgroundColor: color,
              width: s.glow,
              height: s.glow,
              borderRadius: s.glow / 2,
              transform: [{ scale: scaleAnim }],
              opacity: glowAnim,
            },
          ]}
        />
        
        {/* Main marker */}
        <Animated.View
          style={[
            styles.emojiMarker,
            {
              backgroundColor: THEME.surface,
              borderColor: color,
              width: s.container,
              height: s.container,
              borderRadius: s.container / 2,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.emojiIcon, { fontSize: s.emoji }]}>{emoji}</Text>
          
          {/* Verified badge */}
          {verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          )}
        </Animated.View>
        
        {/* Label (optional) */}
        {label && (
          <View style={[styles.emojiLabel, { backgroundColor: color + '20' }]}>
            <Text style={[styles.emojiLabelText, { color }]}>{label}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// ACTION BUTTON (Apple Maps Style)
// ============================================
/**
 * Minimalist floating action button
 * Apple Maps inspired design
 */
export function ActionButton({
  icon,
  label,
  onPress,
  primary = false,
  disabled = false,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.actionButton,
          primary && styles.actionButtonPrimary,
          disabled && styles.actionButtonDisabled,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        <Text style={[
          styles.actionIcon,
          primary && styles.actionIconPrimary,
        ]}>
          {icon}
        </Text>
        {label && (
          <Text style={[
            styles.actionLabel,
            primary && styles.actionLabelPrimary,
          ]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// NAVIGATION BOTTOM BAR
// ============================================
/**
 * Apple Maps style navigation bar with ETA, distance
 * Clean, minimal design with glanceable info
 */
export function NavigationBar({
  destination,
  eta,
  distance,
  instruction,
  progress,
  onEnd,
  onRecenter,
  style,
}) {
  return (
    <View style={[styles.navBar, style]}>
      {/* Main instruction */}
      <View style={styles.navInstruction}>
        <View style={styles.navInstructionIcon}>
          <Text style={styles.navInstructionIconText}>{instruction?.icon || '↑'}</Text>
        </View>
        <View style={styles.navInstructionContent}>
          <Text style={styles.navInstructionText}>{instruction?.text || 'Continue'}</Text>
          {instruction?.distance && (
            <Text style={styles.navInstructionDistance}>{instruction.distance}</Text>
          )}
        </View>
      </View>
      
      {/* Progress bar */}
      <View style={styles.navProgressContainer}>
        <View style={styles.navProgressBar}>
          <View style={[styles.navProgressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      
      {/* Stats row */}
      <View style={styles.navStats}>
        <View style={styles.navStat}>
          <Text style={styles.navStatValue}>{eta}</Text>
          <Text style={styles.navStatLabel}>min</Text>
        </View>
        <View style={styles.navStatDivider} />
        <View style={styles.navStat}>
          <Text style={styles.navStatValue}>{distance}</Text>
          <Text style={styles.navStatLabel}>away</Text>
        </View>
        <View style={styles.navStatDivider} />
        <TouchableOpacity style={styles.navRecenter} onPress={onRecenter}>
          <Text style={styles.navRecenterIcon}>◎</Text>
        </TouchableOpacity>
      </View>
      
      {/* Destination & End */}
      <View style={styles.navBottom}>
        <View style={styles.navDestination}>
          <Text style={styles.navDestinationIcon}>🎯</Text>
          <Text style={styles.navDestinationText} numberOfLines={1}>{destination}</Text>
        </View>
        <TouchableOpacity style={styles.navEndButton} onPress={onEnd}>
          <Text style={styles.navEndText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Signal indicator
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  signalIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  
  // Status banner - Industrial Steel Brutalist (positioned below SafeStep header)
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(8, 8, 10, 0.96)',
    borderRadius: 4,
    borderWidth: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 14,
    opacity: 0.9,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  bannerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bannerButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerDismiss: {
    padding: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bannerDismissText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },
  
  // Accuracy badge
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  accuracyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  accuracyText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  accuracyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Movement indicator
  movementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  movementIcon: {
    fontSize: 20,
  },
  movementInfo: {
    flexDirection: 'column',
  },
  movementLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  movementSpeed: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  
  // User marker
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  accuracyRing: {
    position: 'absolute',
    backgroundColor: THEME.active,
  },
  directionArrow: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
  },
  directionArrowInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: THEME.active,
  },
  userDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.active,
    borderWidth: 3,
    borderColor: '#fff',
  },
  
  // Emoji marker
  emojiMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGlow: {
    position: 'absolute',
  },
  emojiMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...THEME.shadow,
  },
  emojiIcon: {},
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.active,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  emojiLabel: {
    position: 'absolute',
    bottom: -20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emojiLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Action button - Industrial Brutalist
  actionButton: {
    backgroundColor: 'rgba(12, 12, 14, 0.95)',
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(168, 181, 196, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonPrimary: {
    backgroundColor: THEME.primary,
    borderLeftColor: THEME.primary,
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  actionIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  actionIconPrimary: {
    color: '#000',
  },
  actionLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actionLabelPrimary: {
    color: '#000',
  },
  
  // Navigation bar
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.surfaceGlass,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...THEME.shadow,
  },
  navInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  navInstructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.active + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navInstructionIconText: {
    fontSize: 24,
  },
  navInstructionContent: {
    flex: 1,
  },
  navInstructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
  },
  navInstructionDistance: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 2,
  },
  navProgressContainer: {
    marginBottom: 16,
  },
  navProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  navProgressFill: {
    height: '100%',
    backgroundColor: THEME.active,
    borderRadius: 2,
  },
  navStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  navStat: {
    flex: 1,
    alignItems: 'center',
  },
  navStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
  },
  navStatLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  navStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navRecenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRecenterIcon: {
    fontSize: 28,
    color: THEME.text,
  },
  navBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  navDestinationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  navDestinationText: {
    fontSize: 14,
    color: THEME.textMuted,
    flex: 1,
  },
  navEndButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  navEndText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.danger,
  },
});

export default {
  GPSSignalIndicator,
  LocationStatusBanner,
  AccuracyBadge,
  MovementIndicator,
  PulsingUserMarker,
  AnimatedEmojiMarker,
  ActionButton,
  NavigationBar,
};
