/**
 * QuickActionPanel
 * ================
 * Floating panel for quick safety actions and incident reporting.
 * Always accessible during navigation.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, layout } = theme;

// Quick report types - Waze-inspired
const QUICK_REPORTS = [
  { id: 'dark', icon: '🌑', label: 'Poor Lighting', color: colors.safety.caution },
  { id: 'crowd', icon: '👥', label: 'Crowded', color: colors.community.primary },
  { id: 'quiet', icon: '🤫', label: 'Too Quiet', color: colors.safety.moderate },
  { id: 'hazard', icon: '⚠️', label: 'Hazard', color: colors.safety.alert },
  { id: 'construction', icon: '🚧', label: 'Construction', color: colors.safety.caution },
  { id: 'suspicious', icon: '👁️', label: 'Suspicious', color: colors.safety.alert },
  { id: 'safe', icon: '✅', label: 'All Clear', color: colors.safety.safe },
  { id: 'police', icon: '👮', label: 'Police', color: colors.feature.blueLight },
];

const QuickActionPanel = memo(({
  isExpanded = false,
  onToggle,
  onReport,
  onPanic,
  onShareLocation,
  onCallEmergency,
  style,
}) => {
  const [showReportGrid, setShowReportGrid] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Handle expand/collapse
  const handleToggle = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.spring(expandAnim, {
      toValue,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();

    onToggle?.();
  }, [isExpanded, onToggle]);

  // Handle report selection
  const handleReportSelect = useCallback((reportType) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReportGrid(false);
    onReport?.(reportType);
  }, [onReport]);

  // Handle panic button
  const handlePanic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onPanic?.();
  }, [onPanic]);

  return (
    <View style={[styles.container, style]}>
      {/* Main action buttons */}
      <View style={styles.actionsRow}>
        {/* Report button */}
        <ActionButton
          icon="📝"
          label="Report"
          onPress={() => setShowReportGrid(true)}
          color={colors.community.primary}
        />

        {/* Share location */}
        <ActionButton
          icon="📍"
          label="Share"
          onPress={onShareLocation}
          color={colors.feature.blueLight}
        />

        {/* Panic / SOS button - prominent */}
        <TouchableOpacity
          style={styles.panicButton}
          onPress={handlePanic}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.safety.alert, colors.safety.critical]}
            style={styles.panicGradient}
          >
            <Text style={styles.panicIcon}>🆘</Text>
            <Text style={styles.panicLabel}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Call emergency */}
        <ActionButton
          icon="📞"
          label="911"
          onPress={onCallEmergency}
          color={colors.safety.alert}
        />

        {/* More options */}
        <ActionButton
          icon="⋯"
          label="More"
          onPress={handleToggle}
          color={colors.text.secondary}
        />
      </View>

      {/* Quick report modal */}
      <Modal
        visible={showReportGrid}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportGrid(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowReportGrid(false)}
          />

          <View style={styles.reportSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.reportTitle}>What do you see?</Text>
            <Text style={styles.reportSubtitle}>
              Your reports help keep the community safe
            </Text>

            <View style={styles.reportGrid}>
              {QUICK_REPORTS.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportItem}
                  onPress={() => handleReportSelect(report)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.reportIconContainer,
                    { backgroundColor: `${report.color}20` },
                  ]}>
                    <Text style={styles.reportIcon}>{report.icon}</Text>
                  </View>
                  <Text style={styles.reportLabel}>{report.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.customReportButton}
              onPress={() => {
                setShowReportGrid(false);
                onReport?.({ id: 'custom', custom: true });
              }}
            >
              <Text style={styles.customReportText}>
                📋 File a detailed report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const ActionButton = memo(({ icon, label, onPress, color }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View style={[
        styles.actionButton,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={[
          styles.actionIconContainer,
          { backgroundColor: `${color}20` },
        ]}>
          <Text style={styles.actionIcon}>{icon}</Text>
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: layout.bottomNav.height + spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ui.border,
    ...shadows.md,
  },

  // Action button
  actionButton: {
    alignItems: 'center',
    minWidth: 56,
  },

  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  actionIcon: {
    fontSize: 20,
  },

  actionLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  // Panic button
  panicButton: {
    marginHorizontal: spacing.sm,
  },

  panicGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.alertGlow,
  },

  panicIcon: {
    fontSize: 24,
  },

  panicLabel: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  reportSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  reportTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  reportSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  reportItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  reportIcon: {
    fontSize: 28,
  },

  reportLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  customReportButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    alignItems: 'center',
  },

  customReportText: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
});

ActionButton.displayName = 'ActionButton';
QuickActionPanel.displayName = 'QuickActionPanel';

export default QuickActionPanel;
