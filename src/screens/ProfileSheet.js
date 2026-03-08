/**
 * ProfileSheet Screen
 * ===================
 * User profile view with subscription status, GPS info, stats, and actions.
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, GRADIENTS } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { LogoIcon } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useApp } from '../contexts/AppContext';

// App version - should come from config
const APP_VERSION = '5.0.0';

/**
 * GPSIndicator - Visual GPS signal strength indicator
 */
const GPSIndicator = memo(({ accuracy }) => {
  const isActive = (threshold) => accuracy !== null && accuracy <= threshold;
  
  return (
    <View style={styles.gpsIndicator}>
      <View style={[styles.gpsBar, styles.gpsBar1, accuracy !== null && styles.gpsBarActive]} />
      <View style={[styles.gpsBar, styles.gpsBar2, isActive(100) && styles.gpsBarActive]} />
      <View style={[styles.gpsBar, styles.gpsBar3, isActive(50) && styles.gpsBarActive]} />
      <View style={[styles.gpsBar, styles.gpsBar4, isActive(25) && styles.gpsBarActive]} />
    </View>
  );
});

GPSIndicator.displayName = 'GPSIndicator';

/**
 * StatCard - Individual stat display
 */
const StatCard = memo(({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

StatCard.displayName = 'StatCard';

/**
 * ProfileSheet - Main profile screen component
 */
const ProfileSheet = memo(({
  onClose,
  onOpenSettings,
  onOpenAccountDetails,
  onUpgrade,
  tripHistory = [],
  reportsCount = 0,
}) => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const { gpsAccuracy } = useApp();

  const isHomeBeaconReady = getSetting('homeBeaconEnabled');

  // Calculate member days
  const memberDays = user?.created_at 
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  // GPS status text
  const getGpsStatusText = useCallback(() => {
    if (gpsAccuracy === null) return 'Acquiring...';
    if (gpsAccuracy <= 10) return 'Excellent';
    if (gpsAccuracy <= 25) return 'Good';
    if (gpsAccuracy <= 50) return 'Fair';
    return 'Poor';
  }, [gpsAccuracy]);

  return (
    <View style={styles.sheet}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>{user?.email || 'Guest User'}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Home Beacon Status Card */}
        <LinearGradient
          colors={GRADIENTS.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tierCard}
        >
          <View style={styles.tierHeader}>
            <Text style={styles.tierEmoji}>🏠</Text>
            <View style={styles.tierInfo}>
              <Text style={styles.tierName}>Home Beacon</Text>
              <Text style={styles.tierDesc}>
                {isHomeBeaconReady 
                  ? 'Ready to notify your contacts' 
                  : 'Set up your home address & contacts'}
              </Text>
            </View>
          </View>
          {!isHomeBeaconReady && (
            <GradientButton 
              style={styles.upgradeBtn}
              size="medium"
              onPress={onUpgrade}
            >
              Set Up Home Beacon →
            </GradientButton>
          )}
        </LinearGradient>

        {/* GPS Signal Status */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📡 GPS Signal</Text>
          <View style={styles.gpsCard}>
            <GPSIndicator accuracy={gpsAccuracy} />
            <View style={styles.gpsInfo}>
              <Text style={styles.gpsStatus}>{getGpsStatusText()}</Text>
              <Text style={styles.gpsAccuracy}>
                {gpsAccuracy !== null 
                  ? `±${Math.round(gpsAccuracy)}m accuracy` 
                  : 'Waiting for signal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Your Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📊 Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard value={tripHistory.length} label="Walks" />
            <StatCard value={reportsCount} label="Reports" />
            <StatCard value={`${memberDays}d`} label="Member" />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={onOpenAccountDetails}
          >
            <Text style={styles.actionEmoji}>⚙️</Text>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Account Details & Preferences</Text>
              <Text style={styles.actionHint}>Profile, walking speed, emergency contacts</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <LogoIcon size={28} />
          <Text style={styles.version}>SafeStep v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
});

ProfileSheet.displayName = 'ProfileSheet';

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
  subtitle: {
    fontSize: 13,
    color: COLORS.text3,
    marginTop: 2,
  },
  close: {
    fontSize: 20,
    color: COLORS.text3,
    fontWeight: '300',
  },
  
  // Tier Card
  tierCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: 16,
    overflow: 'hidden',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tierEmoji: {
    fontSize: 40,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tierDesc: {
    fontSize: 13,
    color: COLORS.text3,
    marginTop: 4,
  },
  upgradeBtn: {
    marginTop: 16,
    borderRadius: 12,
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  
  // GPS Card
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  gpsBar: {
    width: 5,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  gpsBar1: { height: 6 },
  gpsBar2: { height: 12 },
  gpsBar3: { height: 18 },
  gpsBar4: { height: 24 },
  gpsBarActive: {
    backgroundColor: COLORS.safe,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  gpsAccuracy: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(26, 26, 31, 0.9)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 181, 196, 0.15)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.text3,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  
  // Action Button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionHint: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: COLORS.text3,
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
});

export default ProfileSheet;
