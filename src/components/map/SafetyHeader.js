/**
 * SafetyHeader
 * ============
 * Floating header showing current safety status and search functionality.
 * The command center of the SafeStep map experience.
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/designSystem';
import SafetyScoreBadge from '../ui/SafetyScoreBadge';

const { colors, typography, spacing, radius, shadows, layout } = theme;

const DEMO_USER = { name: 'Alex' };

const SafetyHeader = memo(({
  safetyScore = 75,
  onSearchFocus,
  onMenuPress,
  onSafetyPress,
  isSearching = false,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Subtle glow animation based on safety
  useEffect(() => {
    if (safetyScore < 50) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    }
  }, [safetyScore]);

  const handleSearchFocus = useCallback(() => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.spring(expandAnim, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();

    onSearchFocus?.();
  }, [onSearchFocus]);

  const handleSearchBlur = useCallback(() => {
    setIsFocused(false);

    Animated.spring(expandAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, []);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    const suffix = DEMO_USER.name ? `, ${DEMO_USER.name}` : '';
    if (hour >= 5 && hour < 12) return { greeting: `Good morning${suffix}`, icon: '☀️' };
    if (hour >= 12 && hour < 17) return { greeting: `Good afternoon${suffix}`, icon: '🌤️' };
    if (hour >= 17 && hour < 21) return { greeting: `Good evening${suffix}`, icon: '🌆' };
    return { greeting: `Stay safe tonight${suffix}`, icon: '🌙' };
  };

  const timeOfDay = getTimeOfDay();

  return (
    <View style={[styles.container, style]}>
      {/* Glassmorphism background */}
      <View style={styles.glassBackground} />

      {/* Top row: Menu, Location, Safety badge */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.locationContainer}>
          <Text style={styles.greeting}>
            {timeOfDay.icon} {timeOfDay.greeting}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onSafetyPress}
          activeOpacity={0.8}
        >
          <SafetyScoreBadge
            score={safetyScore}
            size="small"
            showLabel={false}
            showGlow={safetyScore < 50}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar / locked destination display */}
      <Animated.View
        style={[
          styles.searchContainer,
          searchValue.length > 0 && styles.searchContainerLocked,
          isFocused && styles.searchContainerFocused,
        ]}
      >
        <View style={styles.searchIconContainer}>
          <Text style={styles.searchIcon}>{searchValue.length > 0 ? '📍' : '🔍'}</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Where are you heading?"
          placeholderTextColor={colors.text.tertiary}
          value={searchValue}
          onChangeText={onSearchChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onSubmitEditing={onSearchSubmit}
          returnKeyType="search"
          autoCorrect={false}
          editable={searchValue.length === 0 || isFocused}
        />

        {searchValue.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onSearchChange?.('')}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick action chips */}
      <View style={styles.chipsContainer}>
        <QuickChip icon="🏠" label="Home" onPress={() => {}} />
        <QuickChip icon="💼" label="Work" onPress={() => {}} />
        <QuickChip icon="🚨" label="Safe Zone" onPress={() => {}} highlight />
        <QuickChip icon="📍" label="Saved" onPress={() => {}} />
      </View>
    </View>
  );
});

const QuickChip = memo(({ icon, label, onPress, highlight }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.chip,
          highlight && styles.chipHighlight,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.chipIcon}>{icon}</Text>
        <Text style={[
          styles.chipLabel,
          highlight && styles.chipLabelHighlight,
        ]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: layout.safeArea.top,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 100,
  },

  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ui.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.glassBorder,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  menuIcon: {
    fontSize: 18,
    color: colors.text.primary,
  },

  locationContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },

  greeting: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  locationText: {
    ...typography.titleSmall,
    color: colors.text.primary,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    height: 52,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  searchContainerLocked: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.ui.border,
  },

  searchContainerFocused: {
    borderColor: colors.safety.safe,
    borderWidth: 2,
  },

  searchIconContainer: {
    marginRight: spacing.sm,
  },

  searchIcon: {
    fontSize: 18,
    opacity: 0.6,
  },

  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    height: '100%',
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },

  clearIcon: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Quick chips
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  chipHighlight: {
    backgroundColor: colors.safety.safeMuted,
    borderColor: colors.safety.safe,
  },

  chipIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  chipLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  chipLabelHighlight: {
    color: colors.safety.safe,
    fontWeight: '600',
  },
});

QuickChip.displayName = 'QuickChip';
SafetyHeader.displayName = 'SafetyHeader';

export default SafetyHeader;
