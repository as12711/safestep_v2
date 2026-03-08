/**
 * ProfileHeader
 * ==============
 * User avatar, name, verification badge, and edit button.
 * Hero section of the profile screen.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows } = theme;

const ProfileHeader = memo(({ user, onEditPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle glow pulse for verified users
    if (user.isVerified) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [user.isVerified]);

  // Get initials from name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format join date
  const formatJoinDate = (date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `Joined ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Get rank color
  const getRankColor = (rank) => {
    switch (rank) {
      case 'Guardian': return colors.safety.safe;
      case 'Protector': return colors.community.primary;
      case 'Helper': return colors.feature.blueLight;
      default: return colors.text.secondary;
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.bg.tertiary, colors.bg.elevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {/* Glow effect for verified users */}
            {user.isVerified && (
              <Animated.View
                style={[
                  styles.avatarGlow,
                  { opacity: glowOpacity },
                ]}
              />
            )}

            {/* Avatar */}
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.community.primary, colors.community.secondary]}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.initials}>{getInitials(user.name)}</Text>
              </LinearGradient>
            )}

            {/* Verified badge */}
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              Haptics.selectionAsync();
              onEditPress?.();
            }}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* User info */}
        <View style={styles.infoSection}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            {/* Community rank */}
            <View style={[
              styles.badge,
              { backgroundColor: getRankColor(user.stats.communityRank) + '20' },
            ]}>
              <Text style={styles.badgeIcon}>🛡️</Text>
              <Text style={[
                styles.badgeText,
                { color: getRankColor(user.stats.communityRank) },
              ]}>
                {user.stats.communityRank}
              </Text>
            </View>

            {/* Streak badge */}
            {user.stats.streakDays > 0 && (
              <View style={[
                styles.badge,
                { backgroundColor: colors.safety.cautionMuted },
              ]}>
                <Text style={styles.badgeIcon}>🔥</Text>
                <Text style={[styles.badgeText, { color: colors.safety.caution }]}>
                  {user.stats.streakDays} day streak
                </Text>
              </View>
            )}
          </View>

          {/* Join date */}
          <Text style={styles.joinDate}>{formatJoinDate(user.joinDate)}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },

  gradient: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.ui.glassBorder,
    borderRadius: radius.xxl,
  },

  // Avatar section
  avatarSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  avatarContainer: {
    position: 'relative',
  },

  avatarGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 56,
    backgroundColor: colors.community.primary,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  initials: {
    ...typography.headlineLarge,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg.tertiary,
  },

  verifiedIcon: {
    fontSize: 12,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.primary + '80',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  editIcon: {
    fontSize: 16,
  },

  // Info section
  infoSection: {
    alignItems: 'flex-start',
  },

  userName: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  userEmail: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  badgeIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },

  badgeText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },

  joinDate: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
});

ProfileHeader.displayName = 'ProfileHeader';

export default ProfileHeader;
