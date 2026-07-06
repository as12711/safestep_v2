/**
 * ConsentStep
 * ============
 * Explicit, opt-in consent gate (P1-4). Shown before any data is collected
 * (before the Permissions step that requests location) and before the user's
 * first route. The user must affirmatively agree; nothing is pre-checked.
 *
 * Consent is recorded in two places:
 *  1. Locally and durably via SettingsContext (AsyncStorage) so the decision
 *     persists across launches.
 *  2. As a `consent_granted` analytics event when the backend is reachable,
 *     capturing which scopes were accepted (no extra identifying data).
 *
 * NOTE: The user-facing copy in this file is a DRAFT for founder/legal review.
 */

import React, { memo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '../../../theme/designSystem';
import { useSettings } from '../../../contexts/SettingsContext';
import { supabase } from '../../../services';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, layout } = theme;

// Version tag stored with the consent record so a future copy/scope change can
// be distinguished from prior consents during founder/legal review.
const CONSENT_VERSION = 'draft-2026-07';

// Scopes surfaced to the user. Each is a distinct, plain-language use.
const CONSENT_SCOPES = [
  {
    icon: '📍',
    title: 'Location',
    // DRAFT COPY - pending founder/legal review
    body:
      'SafeStep uses your location to suggest walking routes informed by ' +
      'community reports and public data, and to show nearby safety resources. ' +
      'Your location is not shared with other users.',
  },
  {
    icon: '📝',
    title: 'Reports you submit',
    // DRAFT COPY - pending founder/legal review
    body:
      'If you submit a report, SafeStep stores it so it can inform routing for ' +
      'you and the community. Reports are anonymized.',
  },
  {
    icon: '📊',
    title: 'Pilot analytics',
    // DRAFT COPY - pending founder/legal review
    body:
      'During this pilot, SafeStep records basic, non-identifying usage events ' +
      'to improve the app. No advertising and no third-party tracking.',
  },
];

const ConsentStep = memo(({
  isActive,
  onUpdateData,
  onNext,
  onBack,
}) => {
  const { updateSettings } = useSettings();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Re-entrancy guard: a fast double-tap on the agree button must not log a
  // duplicate consent_granted event or call onNext twice (which would skip the
  // Permissions step). handleAgree runs exactly once.
  const submitted = useRef(false);

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

  const handleAgree = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timestamp = new Date().toISOString();

    // 1. Persist the decision durably (local flag via SettingsContext).
    updateSettings({
      consentGranted: true,
      consentLocation: true,
      consentReportStorage: true,
      consentAnalytics: true,
      consentTimestamp: timestamp,
      consentVersion: CONSENT_VERSION,
    });

    // 2. Open the analytics gate immediately so the consent_granted event
    //    itself is allowed through (updateSettings syncs the gate too, but its
    //    state update is async, so set it directly here first).
    supabase?.setAnalyticsConsent?.(true);

    // 3. Record the consent event when a backend is reachable. Only captures
    //    which scopes were accepted and the copy version, nothing new about
    //    the user.
    supabase?.logEvent?.('consent_granted', {
      scopes: ['location', 'report_storage', 'pilot_analytics'],
      consent_version: CONSENT_VERSION,
      granted_at: timestamp,
    });

    onUpdateData?.('consentGranted', true);
    onNext?.();
  }, [updateSettings, onUpdateData, onNext]);

  return (
    <View style={styles.container}>
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
          <Text style={styles.stepLabel}>YOUR CHOICE</Text>
          {/* DRAFT COPY - pending founder/legal review */}
          <Text style={styles.title}>
            Before you{'\n'}start
          </Text>
          <Text style={styles.subtitle}>
            Here is what SafeStep collects and why. You decide before anything is
            collected.
          </Text>
        </View>

        {/* Consent scopes */}
        <View style={styles.scopeCards}>
          {CONSENT_SCOPES.map((scope) => (
            <View key={scope.title} style={styles.scopeCard}>
              <View style={styles.scopeIconContainer}>
                <Text style={styles.scopeIcon}>{scope.icon}</Text>
              </View>
              <View style={styles.scopeTextContainer}>
                <Text style={styles.scopeTitle}>{scope.title}</Text>
                <Text style={styles.scopeBody}>{scope.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Framing note */}
        <View style={styles.framingNote}>
          <View style={styles.framingIcon}>
            <Text style={styles.framingIconText}>🧭</Text>
          </View>
          <View style={styles.framingContent}>
            {/* DRAFT COPY - pending founder/legal review */}
            <Text style={styles.framingText}>
              SafeStep offers informed routing decisions and alternative route
              suggestions. It does not guarantee any outcome. Always use your own
              judgment and stay aware of your surroundings.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* DRAFT COPY - pending founder/legal review */}
        <Text style={styles.consentStatement}>
          By tapping I Agree, you consent to the three uses above for this pilot.
        </Text>
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
            label="I Agree and Continue"
            onPress={handleAgree}
            variant="primary"
            icon="→"
            iconPosition="right"
            style={styles.continueButton}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },

  // Scope cards
  scopeCards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  scopeCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  scopeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  scopeIcon: {
    fontSize: 22,
  },

  scopeTextContainer: {
    flex: 1,
  },

  scopeTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  scopeBody: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // Framing note
  framingNote: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.safety.safe,
  },

  framingIcon: {
    marginRight: spacing.md,
  },

  framingIconText: {
    fontSize: 20,
  },

  framingContent: {
    flex: 1,
  },

  framingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  consentStatement: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
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
});

ConsentStep.displayName = 'ConsentStep';

export default ConsentStep;
