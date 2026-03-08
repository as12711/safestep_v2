/**
 * PlaceholderScreen
 * ==================
 * Reusable placeholder for screens under development.
 * Eliminates duplicate placeholder code in stack navigators.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/designSystem';

const { colors, typography, spacing } = theme;

/**
 * A placeholder screen component for screens under construction.
 *
 * @param {Object} props
 * @param {string} props.icon - Emoji icon to display
 * @param {string} props.title - Screen title
 * @param {string} props.description - Description text
 *
 * @example
 * <PlaceholderScreen
 *   icon="👥"
 *   title="Community Feed"
 *   description="See reports and updates from your community"
 * />
 */
const PlaceholderScreen = memo(({ icon, title, description }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

PlaceholderScreen.displayName = 'PlaceholderScreen';

export default PlaceholderScreen;
