import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect, G } from 'react-native-svg';

// SafeStep Logo Component
// Based on the brand logo: Location pin with gradient over geometric grid

const Logo = ({ 
  size = 80, 
  showText = true, 
  showTagline = false,
  textColor = '#A8B5C4',
  variant = 'full' // 'full', 'icon', 'splash'
}) => {
  const pinWidth = size;
  const pinHeight = size * 1.35;
  const gridSize = size * 0.8;
  
  return (
    <View style={styles.container}>
      {/* Logo Icon */}
      <View style={[styles.logoWrap, { width: pinWidth, height: pinHeight }]}>
        <Svg width={pinWidth} height={pinHeight} viewBox="0 0 100 135">
          <Defs>
            {/* Main gradient - purple to cyan */}
            <LinearGradient id="pinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#8B5CF6" />
              <Stop offset="50%" stopColor="#3B82F6" />
              <Stop offset="100%" stopColor="#22D3EE" />
            </LinearGradient>
            
            {/* Grid gradient for depth */}
            <LinearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4B5563" />
              <Stop offset="100%" stopColor="#374151" />
            </LinearGradient>
          </Defs>
          
          {/* Geometric Grid Background (inverted triangle) */}
          <G transform="translate(15, 55)">
            {/* Row 1 - 5 squares */}
            <Rect x="0" y="0" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="15" y="0" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="30" y="0" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="45" y="0" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="60" y="0" width="13" height="13" fill="#4B5563" rx="1" />
            
            {/* Row 2 - 5 squares */}
            <Rect x="0" y="15" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="15" y="15" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="30" y="15" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="45" y="15" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="60" y="15" width="13" height="13" fill="#4B5563" rx="1" />
            
            {/* Row 3 - 3 squares */}
            <Rect x="15" y="30" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="30" y="30" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="45" y="30" width="13" height="13" fill="#4B5563" rx="1" />
            
            {/* Row 4 - 3 squares */}
            <Rect x="15" y="45" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="30" y="45" width="13" height="13" fill="#4B5563" rx="1" />
            <Rect x="45" y="45" width="13" height="13" fill="#4B5563" rx="1" />
            
            {/* Row 5 - 1 square (point) */}
            <Rect x="30" y="60" width="13" height="13" fill="#4B5563" rx="1" />
          </G>
          
          {/* Location Pin */}
          <Path
            d="M50 5 C30 5 15 22 15 42 C15 65 50 85 50 85 C50 85 85 65 85 42 C85 22 70 5 50 5 Z"
            fill="url(#pinGradient)"
          />
          
          {/* Pin hole (center circle) */}
          <Circle cx="50" cy="40" r="12" fill="#0a0a0c" />
        </Svg>
      </View>
      
      {/* Text */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[
            styles.logoText, 
            { color: textColor },
            variant === 'splash' && styles.logoTextLarge
          ]}>
            SAFESTEP
          </Text>
          {showTagline && (
            <Text style={[styles.tagline, { color: textColor }]}>
              WALK SAFER WALK SMARTER
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Compact version for headers/nav
export const LogoCompact = ({ size = 32 }) => {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      <Defs>
        <LinearGradient id="pinGradientCompact" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="50%" stopColor="#3B82F6" />
          <Stop offset="100%" stopColor="#22D3EE" />
        </LinearGradient>
      </Defs>
      
      {/* Simplified grid */}
      <G transform="translate(20, 60)">
        <Rect x="0" y="0" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="18" y="0" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="36" y="0" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="54" y="0" width="15" height="15" fill="#4B5563" rx="2" />
        
        <Rect x="9" y="18" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="27" y="18" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="45" y="18" width="15" height="15" fill="#4B5563" rx="2" />
        
        <Rect x="18" y="36" width="15" height="15" fill="#4B5563" rx="2" />
        <Rect x="36" y="36" width="15" height="15" fill="#4B5563" rx="2" />
      </G>
      
      {/* Pin */}
      <Path
        d="M50 0 C28 0 10 20 10 42 C10 68 50 90 50 90 C50 90 90 68 90 42 C90 20 72 0 50 0 Z"
        fill="url(#pinGradientCompact)"
      />
      <Circle cx="50" cy="38" r="14" fill="#0a0a0c" />
    </Svg>
  );
};

// Mini icon only (no grid) for tight spaces
export const LogoIcon = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
      <Defs>
        <LinearGradient id="pinGradientIcon" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="50%" stopColor="#3B82F6" />
          <Stop offset="100%" stopColor="#22D3EE" />
        </LinearGradient>
      </Defs>
      
      {/* Pin only */}
      <Path
        d="M50 5 C25 5 5 28 5 52 C5 82 50 125 50 125 C50 125 95 82 95 52 C95 28 75 5 50 5 Z"
        fill="url(#pinGradientIcon)"
      />
      <Circle cx="50" cy="48" r="16" fill="#0a0a0c" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    fontStyle: 'italic',
  },
  logoTextLarge: {
    fontSize: 36,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
    marginTop: 8,
    opacity: 0.7,
  },
});

export default Logo;
