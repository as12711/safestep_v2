/**
 * SettingsSheet Screen
 * ====================
 * App settings with toggles for privacy, notifications, battery, etc.
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';

import { COLORS } from '../theme/colors';
import { LogoIcon } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { isDevelopment } from '../config/env';

// App version - should come from config
const APP_VERSION = '5.0.0';

/**
 * SettingToggle - Reusable setting row with switch
 */
const SettingToggle = memo(({
  label,
  hint,
  value,
  onValueChange,
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {hint && <Text style={styles.settingHint}>{hint}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: COLORS.primary, false: COLORS.surface2 }}
      thumbColor={value ? '#fff' : '#ccc'}
    />
  </View>
));

SettingToggle.displayName = 'SettingToggle';

/**
 * SettingButton - Reusable setting button
 */
const SettingButton = memo(({
  label,
  onPress,
  isDanger = false,
}) => (
  <TouchableOpacity
    style={[styles.settingBtn, isDanger && styles.dangerBtn]}
    onPress={onPress}
  >
    <Text style={[styles.settingBtnTxt, isDanger && styles.dangerBtnTxt]}>
      {label}
    </Text>
  </TouchableOpacity>
));

SettingButton.displayName = 'SettingButton';

/**
 * SettingsSheet - Main settings screen component
 */
const SettingsSheet = memo(({
  onClose,
  onUpgrade,
  onViewReportHistory,
  onViewTripHistory,
  onClearHistory,
  reportsCount = 0,
  tripCount = 0,
}) => {
  const { user, signOut } = useAuth();
  const { getSetting, setSetting, toggleSetting } = useSettings();

  const isHomeBeaconReady = getSetting('homeBeaconEnabled');

  const handleSignOut = useCallback(() => {
    onClose?.();
    signOut();
  }, [onClose, signOut]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear Trip History',
      'This will permanently delete all saved trips. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: onClearHistory },
      ]
    );
  }, [onClearHistory]);

  return (
    <View style={styles.sheet}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Home Beacon Setup Banner */}
        {!isHomeBeaconReady && (
          <TouchableOpacity style={styles.homeBeaconBanner} onPress={onUpgrade}>
            <Text style={styles.homeBeaconEmoji}>🏠</Text>
            <View style={styles.homeBeaconInfo}>
              <Text style={styles.homeBeaconTitle}>Set Up Home Beacon</Text>
              <Text style={styles.homeBeaconDescText}>Notify contacts when you arrive safely</Text>
            </View>
            <Text style={styles.homeBeaconArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Privacy Section */}
        <Text style={styles.sectionHeader}>🔒 PRIVACY</Text>
        <SettingToggle
          label="Ghost Mode 👻"
          hint="Your location stays private by default"
          value={!getSetting('shareLocation')}
          onValueChange={(v) => setSetting('shareLocation', !v)}
        />
        <SettingToggle
          label="Incognito Trips"
          hint="Don't save trip history"
          value={getSetting('incognitoMode')}
          onValueChange={(v) => setSetting('incognitoMode', v)}
        />

        {/* History Section */}
        <Text style={styles.sectionHeader}>📍 HISTORY</Text>
        <SettingButton
          label={`View Report History (${reportsCount} reports)`}
          onPress={onViewReportHistory}
        />
        <SettingButton
          label={`View Trip History (${tripCount} trips)`}
          onPress={onViewTripHistory}
        />
        <SettingButton
          label="Clear All History"
          onPress={handleClearHistory}
        />

        {/* Voice & Sound Section */}
        <Text style={styles.sectionHeader}>🎙️ VOICE & SOUND</Text>
        <SettingToggle
          label="Voice Guidance"
          hint="Turn-by-turn directions"
          value={getSetting('voiceGuidance')}
          onValueChange={(v) => setSetting('voiceGuidance', v)}
        />
        <SettingToggle
          label="Voice Alerts"
          hint="Hazard and incident warnings"
          value={getSetting('voiceAlerts')}
          onValueChange={(v) => setSetting('voiceAlerts', v)}
        />
        <SettingToggle
          label="Sound Effects"
          hint="Button taps and confirmations"
          value={getSetting('sounds')}
          onValueChange={(v) => setSetting('sounds', v)}
        />

        {/* Feedback Section */}
        <Text style={styles.sectionHeader}>📳 FEEDBACK</Text>
        <SettingToggle
          label="Haptic Feedback"
          hint="Vibration on actions"
          value={getSetting('haptics')}
          onValueChange={(v) => setSetting('haptics', v)}
        />

        {/* Battery Section */}
        <Text style={styles.sectionHeader}>🔋 BATTERY</Text>
        <SettingToggle
          label="Battery Saver"
          hint="Reduce GPS updates when idle"
          value={getSetting('batterySaver')}
          onValueChange={(v) => setSetting('batterySaver', v)}
        />
        <SettingToggle
          label="Reduce Motion"
          hint="Simpler animations"
          value={getSetting('reducedMotion')}
          onValueChange={(v) => setSetting('reducedMotion', v)}
        />

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>🔔 NOTIFICATIONS</Text>
        <SettingToggle
          label="Safety Alerts"
          hint="Nearby hazards and incidents"
          value={getSetting('safetyAlerts')}
          onValueChange={(v) => setSetting('safetyAlerts', v)}
        />

        {/* Account Section */}
        <Text style={styles.sectionHeader}>👤 ACCOUNT</Text>
        <View style={styles.accountInfo}>
          <Text style={styles.accountEmail}>
            {user?.name || user?.email || 'Guest User'}
          </Text>
          <Text style={styles.accountType}>
            {user?.guest 
              ? '👻 Anonymous' 
              : user?.university 
                ? `🎓 ${user.university.replace('_', ' ').toUpperCase()}` 
                : '✓ Verified'}
          </Text>
        </View>
        <SettingButton
          label="Contact Support"
          onPress={() => Linking.openURL('mailto:hello@safestep.app')}
        />
        <SettingButton
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://safestep.app/privacy')}
        />
        <SettingButton
          label="Sign Out"
          onPress={handleSignOut}
          isDanger
        />

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <LogoIcon size={28} />
          <Text style={styles.version}>SafeStep v{APP_VERSION}</Text>
        </View>

        {/* Debug Button (dev only) */}
        {isDevelopment() && (
          <TouchableOpacity
            style={styles.debugBtn}
            onPress={() => Alert.alert('Debug', 'Check console for debug info')}
          >
            <Text style={styles.debugBtnTxt}>🔧 Debug Info</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

SettingsSheet.displayName = 'SettingsSheet';

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  close: {
    fontSize: 20,
    color: COLORS.text3,
    fontWeight: '300',
  },

  // Home Beacon Banner
  homeBeaconBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.safeDim,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.safe + '30',
  },
  homeBeaconEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  homeBeaconInfo: {
    flex: 1,
  },
  homeBeaconTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.safe,
  },
  homeBeaconDescText: {
    fontSize: 12,
    color: COLORS.text2,
    marginTop: 2,
  },
  homeBeaconArrow: {
    fontSize: 18,
    color: COLORS.safe,
  },

  // Section Header
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 12,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingHint: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },

  // Setting Button
  settingBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingBtnTxt: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
  },
  dangerBtn: {
    backgroundColor: COLORS.dangerDim,
    borderColor: COLORS.danger + '30',
  },
  dangerBtnTxt: {
    color: COLORS.danger,
    fontWeight: '600',
  },

  // Account Info
  accountInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  accountType: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 4,
  },

  // Version
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  version: {
    fontSize: 12,
    color: COLORS.text3,
  },

  // Debug
  debugBtn: {
    backgroundColor: 'rgba(255, 179, 71, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  debugBtnTxt: {
    fontSize: 13,
    color: COLORS.warn,
    textAlign: 'center',
  },
});

export default SettingsSheet;
