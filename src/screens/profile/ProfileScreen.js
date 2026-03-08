/**
 * ProfileScreen
 * ==============
 * User profile and settings hub.
 * Clean, organized access to all app preferences.
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { theme } from '../../theme/designSystem';
import ProfileHeader from './components/ProfileHeader';
import SafetyPreferences from './components/SafetyPreferences';
import QuickStats from './components/QuickStats';
import SettingsGroup from './components/SettingsGroup';
import EmergencyContacts from './components/EmergencyContacts';

const { colors, typography, spacing, radius, shadows, layout } = theme;

// Demo user data
const DEMO_USER = {
  id: '1',
  name: 'Alex Chen',
  email: 'alex.chen@nyu.edu',
  avatar: null, // Will show initials
  joinDate: new Date('2024-09-15'),
  isVerified: true,
  stats: {
    totalWalks: 47,
    totalDistance: 28.5,
    reportsSubmitted: 12,
    safeArrivals: 47,
    communityRank: 'Guardian',
    streakDays: 14,
  },
};

const ProfileScreen = memo(({
  onEditProfile,
  onLogout,
  onDeleteAccount,
  onContactSupport,
}) => {
  const [user] = useState(DEMO_USER);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Settings handlers
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onLogout?.();
          },
        },
      ]
    );
  }, [onLogout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data, including walk history and reports, will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDeleteAccount?.();
          },
        },
      ]
    );
  }, [onDeleteAccount]);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyHeaderTitle}>Profile</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Profile header */}
        <ProfileHeader
          user={user}
          onEditPress={onEditProfile}
        />

        {/* Quick stats */}
        <View style={styles.section}>
          <QuickStats stats={user.stats} />
        </View>

        {/* Safety preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Preferences</Text>
          <SafetyPreferences />
        </View>

        {/* Emergency contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <EmergencyContacts />
        </View>

        {/* Saved places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Places</Text>
          <SettingsGroup
            items={[
              {
                icon: '🏠',
                label: 'Home',
                value: '123 University Pl',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '💼',
                label: 'Work',
                value: 'Not set',
                onPress: () => Haptics.selectionAsync(),
                isPlaceholder: true,
              },
              {
                icon: '➕',
                label: 'Add Place',
                onPress: () => Haptics.selectionAsync(),
                isAction: true,
              },
            ]}
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <SettingsGroup
            items={[
              {
                icon: '🔔',
                label: 'Push Notifications',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
              {
                icon: '🚨',
                label: 'Safety Alerts',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
              {
                icon: '👥',
                label: 'Community Updates',
                type: 'toggle',
                value: false,
                onToggle: () => Haptics.selectionAsync(),
              },
              {
                icon: '📊',
                label: 'Weekly Summary',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
            ]}
          />
        </View>

        {/* Privacy & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <SettingsGroup
            items={[
              {
                icon: '👤',
                label: 'Anonymous Reporting',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
              {
                icon: '📍',
                label: 'Location History',
                value: 'Last 30 days',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '📥',
                label: 'Download My Data',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '🗑️',
                label: 'Clear Walk History',
                onPress: () => {
                  Haptics.selectionAsync();
                  Alert.alert(
                    'Clear History',
                    'This will delete all your walk history. Your reports will remain.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive' },
                    ]
                  );
                },
                isDanger: true,
              },
            ]}
          />
        </View>

        {/* App settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <SettingsGroup
            items={[
              {
                icon: '🎨',
                label: 'Appearance',
                value: 'Dark',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '📏',
                label: 'Distance Units',
                value: 'Miles',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '📳',
                label: 'Haptic Feedback',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
              {
                icon: '🔊',
                label: 'Sound Effects',
                type: 'toggle',
                value: true,
                onToggle: () => Haptics.selectionAsync(),
              },
            ]}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingsGroup
            items={[
              {
                icon: '❓',
                label: 'Help Center',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '💬',
                label: 'Contact Support',
                onPress: () => {
                  Haptics.selectionAsync();
                  onContactSupport?.();
                },
              },
              {
                icon: '⭐',
                label: 'Rate SafeStep',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '📜',
                label: 'Terms of Service',
                onPress: () => Haptics.selectionAsync(),
              },
              {
                icon: '🔒',
                label: 'Privacy Policy',
                onPress: () => Haptics.selectionAsync(),
              },
            ]}
          />
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <SettingsGroup
            items={[
              {
                icon: '🚪',
                label: 'Log Out',
                onPress: handleLogout,
                isAction: true,
              },
              {
                icon: '⚠️',
                label: 'Delete Account',
                onPress: handleDeleteAccount,
                isDanger: true,
              },
            ]}
          />
        </View>

        {/* App version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>SafeStep v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for pedestrian safety</Text>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },

  stickyHeaderContent: {
    paddingTop: layout.safeArea.top,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },

  stickyHeaderTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: layout.safeArea.top,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  versionText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
  },

  versionSubtext: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  bottomPadding: {
    height: layout.bottomNav.height + spacing.xxl,
  },
});

ProfileScreen.displayName = 'ProfileScreen';

export default ProfileScreen;
