/**
 * QuickReportGrid
 * ================
 * Waze-style grid of quick report options.
 * One tap to report common safety observations.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';
import { PressableScale } from '../../../components/shared';

const { colors, typography, spacing, radius } = theme;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QuickReportGrid = memo(({ categories, onSelectReport }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleCategoryPress = useCallback((categoryId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
  }, []);

  const handleReportPress = useCallback((category, reportType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectReport?.({
      categoryId: category.id,
      categoryLabel: category.label,
      ...reportType,
    });
  }, [onSelectReport]);

  return (
    <View style={styles.container}>
      {/* Category grid */}
      <View style={styles.categoryGrid}>
        {Object.values(categories).map((category) => (
          <CategoryButton
            key={category.id}
            category={category}
            isExpanded={expandedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </View>

      {/* Expanded category types */}
      {expandedCategory && (
        <ExpandedCategory
          category={categories[expandedCategory]}
          onSelectType={(type) => handleReportPress(categories[expandedCategory], type)}
          onClose={() => setExpandedCategory(null)}
        />
      )}

      {/* Most used quick actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsLabel}>Quick reports</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="🌑"
            label="Dark"
            onPress={() => handleReportPress(
              categories.lighting,
              categories.lighting.types.find(t => t.id === 'dark')
            )}
          />
          <QuickActionButton
            icon="👥"
            label="Busy"
            onPress={() => handleReportPress(
              categories.crowd,
              categories.crowd.types.find(t => t.id === 'busy')
            )}
            positive
          />
          <QuickActionButton
            icon="🤫"
            label="Quiet"
            onPress={() => handleReportPress(
              categories.crowd,
              categories.crowd.types.find(t => t.id === 'quiet')
            )}
          />
          <QuickActionButton
            icon="✅"
            label="Clear"
            onPress={() => handleReportPress(
              categories.positive,
              categories.positive.types.find(t => t.id === 'safe')
            )}
            positive
          />
        </View>
      </View>
    </View>
  );
});

// Category button - uses PressableScale
const CategoryButton = memo(({ category, isExpanded, onPress }) => (
  <View style={styles.categoryButtonWrapper}>
    <PressableScale onPress={onPress} pressedScale={0.95} haptic={false}>
      <View
        style={[
          styles.categoryButton,
          isExpanded && styles.categoryButtonExpanded,
        ]}
      >
        <View style={[
          styles.categoryIconContainer,
          { backgroundColor: category.color + '20' },
          isExpanded && { backgroundColor: category.color + '40' },
        ]}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
        </View>
        <Text style={[
          styles.categoryLabel,
          isExpanded && styles.categoryLabelExpanded,
        ]}>
          {category.label}
        </Text>
        {isExpanded && (
          <View style={[styles.expandIndicator, { backgroundColor: category.color }]} />
        )}
      </View>
    </PressableScale>
  </View>
));

// Expanded category with type options
const ExpandedCategory = memo(({ category, onSelectType, onClose }) => (
  <Animated.View style={styles.expandedContainer}>
    <View style={styles.expandedHeader}>
      <Text style={styles.expandedTitle}>{category.label}</Text>
      <TouchableOpacity onPress={onClose} style={styles.expandedClose}>
        <Text style={styles.expandedCloseIcon}>✕</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.typeGrid}>
      {category.types.map((type) => (
        <TypeButton
          key={type.id}
          type={type}
          categoryColor={category.color}
          onPress={() => onSelectType(type)}
        />
      ))}
    </View>
  </Animated.View>
));

// Type button - uses PressableScale
const TypeButton = memo(({ type, categoryColor, onPress }) => {
  const getSeverityColor = () => {
    switch (type.severity) {
      case 'positive': return colors.safety.safe;
      case 'info': return colors.feature.blueLight;
      case 'medium': return colors.safety.caution;
      case 'high': return colors.safety.alert;
      case 'critical': return colors.safety.critical;
      default: return categoryColor;
    }
  };

  const severityColor = getSeverityColor();

  return (
    <View style={styles.typeButtonWrapper}>
      <PressableScale onPress={onPress} pressedScale={0.92} haptic={false}>
        <View style={[styles.typeButton, { borderColor: severityColor + '40' }]}>
          <View style={[styles.typeIconContainer, { backgroundColor: severityColor + '20' }]}>
            <Text style={styles.typeIcon}>{type.icon}</Text>
          </View>
          <Text style={styles.typeLabel}>{type.label}</Text>
          <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
        </View>
      </PressableScale>
    </View>
  );
});

// Quick action button - uses PressableScale
const QuickActionButton = memo(({ icon, label, onPress, positive }) => (
  <View style={styles.quickActionWrapper}>
    <PressableScale onPress={onPress} pressedScale={0.9} haptic={false}>
      <View style={[
        styles.quickActionButton,
        positive && styles.quickActionButtonPositive,
      ]}>
        <Text style={styles.quickActionIcon}>{icon}</Text>
        <Text style={[
          styles.quickActionLabel,
          positive && styles.quickActionLabelPositive,
        ]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  </View>
));

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  categoryButtonWrapper: {
    width: '31%',
  },

  categoryButton: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  categoryButtonExpanded: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.bg.elevated,
  },

  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  categoryIcon: {
    fontSize: 22,
  },

  categoryLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  categoryLabelExpanded: {
    color: colors.text.primary,
    fontWeight: '600',
  },

  expandIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Expanded category
  expandedContainer: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  expandedTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  expandedClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  expandedCloseIcon: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  typeButtonWrapper: {
    width: '48%',
  },

  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },

  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  typeIcon: {
    fontSize: 18,
  },

  typeLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
    flex: 1,
  },

  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Quick actions
  quickActions: {
    marginTop: spacing.md,
  },

  quickActionsLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  quickActionWrapper: {
    flex: 1,
  },

  quickActionButton: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  quickActionButtonPositive: {
    backgroundColor: colors.safety.safeMuted,
    borderColor: colors.safety.safe + '40',
  },

  quickActionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },

  quickActionLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  quickActionLabelPositive: {
    color: colors.safety.safe,
  },
});

CategoryButton.displayName = 'CategoryButton';
ExpandedCategory.displayName = 'ExpandedCategory';
TypeButton.displayName = 'TypeButton';
QuickActionButton.displayName = 'QuickActionButton';
QuickReportGrid.displayName = 'QuickReportGrid';

export default QuickReportGrid;
