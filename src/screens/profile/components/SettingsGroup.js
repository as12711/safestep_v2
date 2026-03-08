/**
 * SettingsGroup
 * ==============
 * Reusable grouped settings list with toggle and navigation items.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius } = theme;

const SettingsItem = memo(({
  icon,
  label,
  value,
  type = 'navigation', // 'navigation' | 'toggle'
  onPress,
  onToggle,
  isAction,
  isDanger,
  isPlaceholder,
  isFirst,
  isLast,
}) => {
  const [toggleValue, setToggleValue] = useState(value);

  const handleToggle = useCallback((newValue) => {
    Haptics.selectionAsync();
    setToggleValue(newValue);
    onToggle?.(newValue);
  }, [onToggle]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);

  const labelColor = isDanger
    ? colors.safety.alert
    : isAction
    ? colors.community.primary
    : colors.text.primary;

  const valueColor = isPlaceholder
    ? colors.text.tertiary
    : colors.text.secondary;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        isFirst && styles.itemFirst,
        isLast && styles.itemLast,
        !isLast && styles.itemBorder,
      ]}
      onPress={type === 'navigation' ? handlePress : undefined}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
      disabled={type === 'toggle'}
    >
      <View style={styles.itemLeft}>
        <View style={[
          styles.iconContainer,
          isDanger && styles.iconContainerDanger,
          isAction && styles.iconContainerAction,
        ]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      </View>

      <View style={styles.itemRight}>
        {type === 'toggle' ? (
          <Switch
            value={toggleValue}
            onValueChange={handleToggle}
            trackColor={{
              false: colors.ui.border,
              true: colors.community.primary + '60',
            }}
            thumbColor={toggleValue ? colors.community.primary : colors.text.tertiary}
            ios_backgroundColor={colors.ui.border}
          />
        ) : (
          <>
            {value && (
              <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
            )}
            {!isAction && !isDanger && (
              <Text style={styles.chevron}>›</Text>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

const SettingsGroup = memo(({ items, title }) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.group}>
        {items.map((item, index) => (
          <SettingsItem
            key={index}
            {...item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },

  groupTitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },

  group: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.ui.border,
    overflow: 'hidden',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.tertiary,
  },

  itemFirst: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },

  itemLast: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },

  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  iconContainerDanger: {
    backgroundColor: colors.safety.alertMuted,
  },

  iconContainerAction: {
    backgroundColor: colors.community.muted,
  },

  icon: {
    fontSize: 16,
  },

  label: {
    ...typography.bodyMedium,
    flex: 1,
  },

  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  value: {
    ...typography.bodySmall,
    marginRight: spacing.xs,
  },

  chevron: {
    fontSize: 20,
    color: colors.text.tertiary,
    fontWeight: '300',
  },
});

SettingsItem.displayName = 'SettingsItem';
SettingsGroup.displayName = 'SettingsGroup';

export default SettingsGroup;
