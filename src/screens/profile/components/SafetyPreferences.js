/**
 * SafetyPreferences
 * ==================
 * Safety-specific settings with visual sliders and toggles.
 * Controls routing preferences and alert thresholds.
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, getSafetyColor } = theme;

// Safety priority slider component
const SafetyPrioritySlider = memo(({ value, onChange }) => {
  const options = [
    { value: 'fastest', label: 'Fastest', icon: '⚡', description: 'Prioritize speed' },
    { value: 'balanced', label: 'Balanced', icon: '⚖️', description: 'Mix of both' },
    { value: 'safest', label: 'Safest', icon: '🛡️', description: 'Prioritize safety' },
  ];

  const handleSelect = useCallback((newValue) => {
    Haptics.selectionAsync();
    onChange?.(newValue);
  }, [onChange]);

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>Route Priority</Text>
      <View style={styles.sliderOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sliderOption,
              value === option.value && styles.sliderOptionActive,
            ]}
            onPress={() => handleSelect(option.value)}
          >
            <Text style={styles.sliderOptionIcon}>{option.icon}</Text>
            <Text style={[
              styles.sliderOptionLabel,
              value === option.value && styles.sliderOptionLabelActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.sliderDescription}>
        {options.find(o => o.value === value)?.description}
      </Text>
    </View>
  );
});

// Safety threshold selector
const SafetyThreshold = memo(({ value, onChange }) => {
  const thresholds = [
    { value: 50, label: 'Low', color: colors.safety.alert },
    { value: 65, label: 'Medium', color: colors.safety.caution },
    { value: 80, label: 'High', color: colors.safety.safe },
  ];

  const handleSelect = useCallback((newValue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange?.(newValue);
  }, [onChange]);

  return (
    <View style={styles.thresholdContainer}>
      <View style={styles.thresholdHeader}>
        <Text style={styles.thresholdLabel}>Minimum Safety Score</Text>
        <View style={[
          styles.thresholdBadge,
          { backgroundColor: getSafetyColor(value) + '20' },
        ]}>
          <Text style={[
            styles.thresholdValue,
            { color: getSafetyColor(value) },
          ]}>
            {value}+
          </Text>
        </View>
      </View>

      <View style={styles.thresholdOptions}>
        {thresholds.map((threshold) => (
          <TouchableOpacity
            key={threshold.value}
            style={[
              styles.thresholdOption,
              value === threshold.value && {
                borderColor: threshold.color,
                backgroundColor: threshold.color + '10',
              },
            ]}
            onPress={() => handleSelect(threshold.value)}
          >
            <View style={[
              styles.thresholdDot,
              { backgroundColor: threshold.color },
            ]} />
            <Text style={[
              styles.thresholdOptionLabel,
              value === threshold.value && { color: threshold.color },
            ]}>
              {threshold.label}
            </Text>
            <Text style={styles.thresholdOptionValue}>{threshold.value}+</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.thresholdDescription}>
        Routes below this score will show a warning
      </Text>
    </View>
  );
});

// Feature toggle row
const FeatureToggle = memo(({ icon, label, description, value, onChange }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onChange?.(!value);
  }, [value, onChange]);

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
      <Animated.View style={[
        styles.featureToggle,
        value && styles.featureToggleActive,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={styles.featureLeft}>
          <View style={[
            styles.featureIcon,
            value && styles.featureIconActive,
          ]}>
            <Text style={styles.featureEmoji}>{icon}</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureLabel}>{label}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
          </View>
        </View>
        <View style={[
          styles.toggleIndicator,
          value && styles.toggleIndicatorActive,
        ]}>
          <View style={[
            styles.toggleDot,
            value && styles.toggleDotActive,
          ]} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const SafetyPreferences = memo(() => {
  const [routePriority, setRoutePriority] = useState('balanced');
  const [safetyThreshold, setSafetyThreshold] = useState(65);
  const [avoidDarkAreas, setAvoidDarkAreas] = useState(true);
  const [preferBusyStreets, setPreferBusyStreets] = useState(true);
  const [accessibleRoutes, setAccessibleRoutes] = useState(false);

  return (
    <View style={styles.container}>
      {/* Route priority slider */}
      <SafetyPrioritySlider
        value={routePriority}
        onChange={setRoutePriority}
      />

      {/* Safety threshold */}
      <SafetyThreshold
        value={safetyThreshold}
        onChange={setSafetyThreshold}
      />

      {/* Feature toggles */}
      <View style={styles.togglesSection}>
        <FeatureToggle
          icon="🌙"
          label="Avoid Dark Areas"
          description="Prefer well-lit streets at night"
          value={avoidDarkAreas}
          onChange={setAvoidDarkAreas}
        />
        <FeatureToggle
          icon="👥"
          label="Prefer Busy Streets"
          description="Route through populated areas"
          value={preferBusyStreets}
          onChange={setPreferBusyStreets}
        />
        <FeatureToggle
          icon="♿"
          label="Accessible Routes"
          description="Avoid stairs and steep inclines"
          value={accessibleRoutes}
          onChange={setAccessibleRoutes}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  // Slider
  sliderContainer: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  sliderLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  sliderOptions: {
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },

  sliderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },

  sliderOptionActive: {
    backgroundColor: colors.bg.tertiary,
  },

  sliderOptionIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  sliderOptionLabel: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
  },

  sliderOptionLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },

  sliderDescription: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Threshold
  thresholdContainer: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  thresholdLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  thresholdBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  thresholdValue: {
    ...typography.labelMedium,
    fontWeight: '700',
  },

  thresholdOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  thresholdOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.ui.border,
    backgroundColor: colors.bg.elevated,
  },

  thresholdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },

  thresholdOptionLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  thresholdOptionValue: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  thresholdDescription: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Feature toggles
  togglesSection: {
    gap: spacing.sm,
  },

  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  featureToggleActive: {
    borderColor: colors.community.primary + '40',
    backgroundColor: colors.community.muted + '30',
  },

  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  featureIconActive: {
    backgroundColor: colors.community.muted,
  },

  featureEmoji: {
    fontSize: 18,
  },

  featureContent: {
    flex: 1,
  },

  featureLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },

  featureDescription: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  toggleIndicator: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ui.border,
    padding: 2,
    justifyContent: 'center',
  },

  toggleIndicatorActive: {
    backgroundColor: colors.community.primary,
  },

  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text.tertiary,
  },

  toggleDotActive: {
    backgroundColor: colors.bg.primary,
    alignSelf: 'flex-end',
  },
});

SafetyPrioritySlider.displayName = 'SafetyPrioritySlider';
SafetyThreshold.displayName = 'SafetyThreshold';
FeatureToggle.displayName = 'FeatureToggle';
SafetyPreferences.displayName = 'SafetyPreferences';

export default SafetyPreferences;
