/**
 * PermissionsStep
 * ================
 * Requests location and notification permissions with clear explanations.
 * Emphasizes privacy and user control.
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';
import OnboardingButton from '../components/OnboardingButton';

const { colors, typography, spacing, radius, shadows, layout } = theme;

const PermissionsStep = memo(({
  isActive,
  userData,
  onUpdateData,
  onNext,
  onBack,
}) => {
  const [locationStatus, setLocationStatus] = useState('pending'); // pending, granted, denied
  const [notificationStatus, setNotificationStatus] = useState('pending');
  const [isRequesting, setIsRequesting] = useState(false);

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

      // Check existing permissions
      checkExistingPermissions();
    }
  }, [isActive]);

  const checkExistingPermissions = async () => {
    try {
      const { status: locStatus } = await Location.getForegroundPermissionsAsync();
      setLocationStatus(locStatus === 'granted' ? 'granted' : 'pending');

      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      setNotificationStatus(notifStatus === 'granted' ? 'granted' : 'pending');
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };

  const requestLocationPermission = useCallback(async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setLocationStatus('granted');
        onUpdateData('locationEnabled', true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Also request background permission for navigation
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        console.log('Background location:', bgStatus);
      } else {
        setLocationStatus('denied');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.log('Error requesting location:', error);
      setLocationStatus('denied');
    } finally {
      setIsRequesting(false);
    }
  }, [onUpdateData]);

  const requestNotificationPermission = useCallback(async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        setNotificationStatus('granted');
        onUpdateData('notificationsEnabled', true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setNotificationStatus('denied');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.log('Error requesting notifications:', error);
      setNotificationStatus('denied');
    } finally {
      setIsRequesting(false);
    }
  }, [onUpdateData]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const canContinue = locationStatus === 'granted';

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
          <Text style={styles.stepLabel}>PERMISSIONS</Text>
          <Text style={styles.title}>
            A couple of{'\n'}permissions
          </Text>
          <Text style={styles.subtitle}>
            SafeStep needs a few permissions to offer route suggestions and show
            nearby safety resources.
          </Text>
        </View>

        {/* Permission cards */}
        <View style={styles.permissionCards}>
          {/* Location - Required */}
          <PermissionCard
            icon="📍"
            title="Location"
            description="Suggest safety-informed routes and show nearby safety resources"
            required={true}
            status={locationStatus}
            onRequest={requestLocationPermission}
            onOpenSettings={openSettings}
            isRequesting={isRequesting}
          />

          {/* Notifications - Optional */}
          <PermissionCard
            icon="🔔"
            title="Notifications"
            description="Get alerts about safety conditions on your route"
            required={false}
            status={notificationStatus}
            onRequest={requestNotificationPermission}
            onOpenSettings={openSettings}
            isRequesting={isRequesting}
          />
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <View style={styles.privacyIcon}>
            <Text style={styles.privacyIconText}>🔒</Text>
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Your location stays private</Text>
            <Text style={styles.privacyText}>
              We never share your exact location with other users. Only you can
              see where you are. Reports you make are anonymized.
            </Text>
          </View>
        </View>

        {/* Missing permission warning */}
        {locationStatus === 'denied' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Location is required</Text>
              <Text style={styles.warningText}>
                SafeStep cannot suggest safety-informed routes without knowing your location.
                You can enable it in Settings.
              </Text>
              <TouchableOpacity onPress={openSettings}>
                <Text style={styles.settingsLink}>Open Settings →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

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
            label={canContinue ? 'Continue' : 'Enable Location'}
            onPress={canContinue ? onNext : requestLocationPermission}
            variant="primary"
            icon={canContinue ? '→' : '📍'}
            iconPosition={canContinue ? 'right' : 'left'}
            disabled={isRequesting}
            style={styles.continueButton}
          />
        </View>
      </View>
    </View>
  );
});

// Permission card component
const PermissionCard = memo(({
  icon,
  title,
  description,
  required,
  status,
  onRequest,
  onOpenSettings,
  isRequesting,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (status === 'denied') {
      onOpenSettings();
    } else if (status === 'pending') {
      onRequest();
    }
  }, [status, onRequest, onOpenSettings]);

  const statusConfig = {
    pending: {
      buttonLabel: 'Enable',
      buttonVariant: 'secondary',
      borderColor: colors.ui.border,
    },
    granted: {
      buttonLabel: 'Enabled',
      buttonVariant: 'ghost',
      borderColor: colors.safety.safe,
    },
    denied: {
      buttonLabel: 'Open Settings',
      buttonVariant: 'secondary',
      borderColor: colors.safety.caution,
    },
  };

  const config = statusConfig[status];

  return (
    <Animated.View
      style={[
        styles.permissionCard,
        { borderColor: config.borderColor },
        status === 'granted' && styles.permissionCardGranted,
      ]}
    >
      <View style={styles.permissionLeft}>
        <View style={[
          styles.permissionIconContainer,
          status === 'granted' && styles.permissionIconGranted,
        ]}>
          <Text style={styles.permissionIcon}>{icon}</Text>
          {status === 'granted' && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.permissionCenter}>
        <View style={styles.permissionTitleRow}>
          <Text style={styles.permissionTitle}>{title}</Text>
          {required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>

      <View style={styles.permissionRight}>
        {status !== 'granted' ? (
          <TouchableOpacity
            style={[
              styles.enableButton,
              status === 'denied' && styles.enableButtonDenied,
            ]}
            onPress={handlePress}
            disabled={isRequesting}
          >
            <Text style={[
              styles.enableButtonText,
              status === 'denied' && styles.enableButtonTextDenied,
            ]}>
              {config.buttonLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enabledIndicator}>
            <Text style={styles.enabledIcon}>✓</Text>
          </View>
        )}
      </View>
    </Animated.View>
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
    marginBottom: spacing.xxl,
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

  // Permission cards
  permissionCards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 2,
  },

  permissionCardGranted: {
    backgroundColor: colors.safety.safeMuted,
  },

  permissionLeft: {
    marginRight: spacing.md,
  },

  permissionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  permissionIconGranted: {
    backgroundColor: colors.safety.safe,
  },

  permissionIcon: {
    fontSize: 24,
  },

  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg.tertiary,
  },

  checkIcon: {
    fontSize: 10,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  permissionCenter: {
    flex: 1,
  },

  permissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  permissionTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  requiredBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.safety.cautionMuted,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },

  requiredText: {
    ...typography.labelSmall,
    color: colors.safety.caution,
  },

  permissionDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  permissionRight: {
    marginLeft: spacing.md,
  },

  enableButton: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  enableButtonDenied: {
    backgroundColor: colors.safety.cautionMuted,
  },

  enableButtonText: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },

  enableButtonTextDenied: {
    color: colors.safety.caution,
  },

  enabledIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },

  enabledIcon: {
    fontSize: 16,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.safety.safe,
  },

  privacyIcon: {
    marginRight: spacing.md,
  },

  privacyIconText: {
    fontSize: 20,
  },

  privacyContent: {
    flex: 1,
  },

  privacyTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  privacyText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Warning card
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.safety.cautionMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.safety.caution,
  },

  warningIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    ...typography.labelLarge,
    color: colors.safety.caution,
    marginBottom: spacing.xs,
  },

  warningText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  settingsLink: {
    ...typography.labelMedium,
    color: colors.safety.safe,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
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

PermissionCard.displayName = 'PermissionCard';
PermissionsStep.displayName = 'PermissionsStep';

export default PermissionsStep;
