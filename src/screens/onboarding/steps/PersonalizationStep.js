/**
 * PersonalizationStep
 * ====================
 * Set up home and work addresses for quick access to safe routes.
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, layout } = theme;

const PersonalizationStep = memo(({
  isActive,
  userData,
  onUpdateData,
  onNext,
  onBack,
}) => {
  const [homeAddress, setHomeAddress] = useState(userData.homeAddress || '');
  const [workAddress, setWorkAddress] = useState(userData.workAddress || '');
  const [focusedInput, setFocusedInput] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const handleHomeChange = useCallback((text) => {
    setHomeAddress(text);
    onUpdateData('homeAddress', text);
  }, [onUpdateData]);

  const handleWorkChange = useCallback((text) => {
    setWorkAddress(text);
    onUpdateData('workAddress', text);
  }, [onUpdateData]);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  }, [onNext]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepLabel}>PERSONALIZE</Text>
            <Text style={styles.title}>
              Your safe{'\n'}places
            </Text>
            <Text style={styles.subtitle}>
              Save your frequented destinations for quick, safe routing.
              You can always change these later.
            </Text>
          </View>

          {/* Address inputs */}
          <View style={styles.addressCards}>
            {/* Home address */}
            <AddressInput
              icon="🏠"
              label="Home"
              placeholder="Enter your home address"
              value={homeAddress}
              onChangeText={handleHomeChange}
              isFocused={focusedInput === 'home'}
              onFocus={() => setFocusedInput('home')}
              onBlur={() => setFocusedInput(null)}
              description="We'll help you find safe routes home anytime"
            />

            {/* Work address */}
            <AddressInput
              icon="💼"
              label="Work"
              placeholder="Enter your work address"
              value={workAddress}
              onChangeText={handleWorkChange}
              isFocused={focusedInput === 'work'}
              onFocus={() => setFocusedInput('work')}
              onBlur={() => setFocusedInput(null)}
              description="Quick access to your daily commute"
              optional
            />
          </View>

          {/* Quick tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Pro tip</Text>
              <Text style={styles.tipText}>
                You can also save favorite places like your gym, grocery store,
                or a friend's house from the main map.
              </Text>
            </View>
          </View>

          {/* Saved locations preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Your saved places</Text>
            <View style={styles.previewGrid}>
              <SavedPlacePreview
                icon="🏠"
                label="Home"
                isSet={!!homeAddress}
              />
              <SavedPlacePreview
                icon="💼"
                label="Work"
                isSet={!!workAddress}
              />
              <SavedPlacePreview
                icon="➕"
                label="Add more"
                isAdd
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.actions}>
        <View style={styles.buttonRow}>
          <OnboardingButton
            label="Back"
            onPress={onBack}
            variant="ghost"
            icon="←"
            iconPosition="left"
            style={styles.backButton}
          />
          <OnboardingButton
            label="Continue"
            onPress={handleContinue}
            variant="primary"
            icon="→"
            style={styles.continueButton}
          />
        </View>
        <Text style={styles.skipHint}>
          You can skip this and add addresses later
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
});

// Address input component
const AddressInput = memo(({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  isFocused,
  onFocus,
  onBlur,
  description,
  optional = false,
}) => (
  <View style={[
    styles.addressCard,
    isFocused && styles.addressCardFocused,
    value && styles.addressCardFilled,
  ]}>
    <View style={styles.addressHeader}>
      <View style={styles.addressLabelRow}>
        <View style={[
          styles.addressIconContainer,
          value && styles.addressIconFilled,
        ]}>
          <Text style={styles.addressIcon}>{icon}</Text>
        </View>
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.addressLabel}>{label}</Text>
            {optional && (
              <Text style={styles.optionalBadge}>Optional</Text>
            )}
          </View>
          <Text style={styles.addressDescription}>{description}</Text>
        </View>
      </View>
    </View>

    <View style={styles.inputContainer}>
      <TextInput
        style={styles.addressInput}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCorrect={false}
        returnKeyType="done"
      />
      {value ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearButton}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
      )}
    </View>
  </View>
));

// Saved place preview chip
const SavedPlacePreview = memo(({ icon, label, isSet, isAdd }) => (
  <View style={[
    styles.savedPlace,
    isSet && styles.savedPlaceSet,
    isAdd && styles.savedPlaceAdd,
  ]}>
    <Text style={styles.savedPlaceIcon}>{icon}</Text>
    <Text style={[
      styles.savedPlaceLabel,
      isSet && styles.savedPlaceLabelSet,
    ]}>
      {label}
    </Text>
    {isSet && (
      <View style={styles.savedPlaceCheck}>
        <Text style={styles.savedPlaceCheckIcon}>✓</Text>
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },

  stepLabel: {
    ...typography.labelMedium,
    color: colors.safety.safe,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },

  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    lineHeight: 38,
    marginBottom: spacing.md,
  },

  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  // Address cards
  addressCards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  addressCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.ui.border,
  },

  addressCardFocused: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.bg.elevated,
  },

  addressCardFilled: {
    borderColor: colors.safety.safe + '60',
  },

  addressHeader: {
    marginBottom: spacing.md,
  },

  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  addressIconFilled: {
    backgroundColor: colors.safety.safeMuted,
  },

  addressIcon: {
    fontSize: 20,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  addressLabel: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  optionalBadge: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },

  addressDescription: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },

  addressInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },

  clearButton: {
    padding: spacing.sm,
  },

  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
  },

  searchIcon: {
    padding: spacing.sm,
  },

  searchIconText: {
    fontSize: 16,
    opacity: 0.5,
  },

  // Tip card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  tipIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    ...typography.labelMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  tipText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Preview section
  previewSection: {
    marginBottom: spacing.xl,
  },

  previewTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  previewGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  savedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  savedPlaceSet: {
    backgroundColor: colors.safety.safeMuted,
    borderColor: colors.safety.safe,
  },

  savedPlaceAdd: {
    borderStyle: 'dashed',
  },

  savedPlaceIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  savedPlaceLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  savedPlaceLabelSet: {
    color: colors.safety.safe,
  },

  savedPlaceCheck: {
    marginLeft: spacing.xs,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedPlaceCheckIcon: {
    fontSize: 10,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg.primary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  backButton: {
    flex: 1,
  },

  continueButton: {
    flex: 2,
  },

  skipHint: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

AddressInput.displayName = 'AddressInput';
SavedPlacePreview.displayName = 'SavedPlacePreview';
PersonalizationStep.displayName = 'PersonalizationStep';

export default PersonalizationStep;
