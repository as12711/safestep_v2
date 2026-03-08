/**
 * ReportingScreen
 * ================
 * Community reporting interface - "What do you see?"
 * Quick reports + detailed incident submission.
 *
 * Design: Waze-inspired quick grid with SafeStep's Urban Guardian aesthetic.
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { theme } from '../../theme/designSystem';
import QuickReportGrid from './components/QuickReportGrid';
import DetailedReportFlow from './components/DetailedReportFlow';
import ReportConfirmation from './components/ReportConfirmation';
import LocationConfirmation from './components/LocationConfirmation';

const { colors, typography, spacing, radius, shadows, layout } = theme;

// Report categories
const REPORT_CATEGORIES = {
  lighting: {
    id: 'lighting',
    label: 'Lighting',
    icon: '💡',
    color: colors.safety.caution,
    types: [
      { id: 'dark', icon: '🌑', label: 'Poor Lighting', severity: 'medium' },
      { id: 'lit', icon: '💡', label: 'Well Lit', severity: 'positive' },
      { id: 'broken', icon: '💔', label: 'Broken Light', severity: 'high' },
    ],
  },
  crowd: {
    id: 'crowd',
    label: 'Crowd Level',
    icon: '👥',
    color: colors.community.primary,
    types: [
      { id: 'busy', icon: '👥', label: 'Busy Area', severity: 'positive' },
      { id: 'quiet', icon: '🤫', label: 'Very Quiet', severity: 'medium' },
      { id: 'empty', icon: '🏜️', label: 'Deserted', severity: 'high' },
    ],
  },
  hazard: {
    id: 'hazard',
    label: 'Hazards',
    icon: '⚠️',
    color: colors.safety.alert,
    types: [
      { id: 'construction', icon: '🚧', label: 'Construction', severity: 'medium' },
      { id: 'blocked', icon: '🚫', label: 'Path Blocked', severity: 'high' },
      { id: 'slippery', icon: '🧊', label: 'Slippery', severity: 'medium' },
      { id: 'flooding', icon: '🌊', label: 'Flooding', severity: 'high' },
    ],
  },
  safety: {
    id: 'safety',
    label: 'Safety',
    icon: '🛡️',
    color: colors.safety.safe,
    types: [
      { id: 'police', icon: '👮', label: 'Police Present', severity: 'positive' },
      { id: 'security', icon: '💂', label: 'Security', severity: 'positive' },
      { id: 'suspicious', icon: '👁️', label: 'Suspicious Activity', severity: 'high' },
      { id: 'harassment', icon: '🚨', label: 'Harassment', severity: 'critical' },
    ],
  },
  accessibility: {
    id: 'accessibility',
    label: 'Accessibility',
    icon: '♿',
    color: colors.feature.blueLight,
    types: [
      { id: 'stairs', icon: '🪜', label: 'Stairs Only', severity: 'info' },
      { id: 'ramp', icon: '📐', label: 'Ramp Available', severity: 'positive' },
      { id: 'elevator-out', icon: '🛗', label: 'Elevator Broken', severity: 'high' },
    ],
  },
  positive: {
    id: 'positive',
    label: 'Positive',
    icon: '✅',
    color: colors.safety.safe,
    types: [
      { id: 'safe', icon: '✅', label: 'All Clear', severity: 'positive' },
      { id: 'clean', icon: '✨', label: 'Clean & Safe', severity: 'positive' },
      { id: 'open-business', icon: '🏪', label: 'Open Business', severity: 'positive' },
    ],
  },
};

const ReportingScreen = memo(({
  visible = true,
  currentLocation,
  onClose,
  onReportSubmit,
}) => {
  // State
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailedFlow, setShowDetailedFlow] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reportLocation, setReportLocation] = useState(currentLocation);
  const [submittedReport, setSubmittedReport] = useState(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Handle quick report selection
  const handleQuickReport = useCallback((reportType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedReport(reportType);
    setShowLocationPicker(true);
  }, []);

  // Handle "More details" press
  const handleDetailedReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDetailedFlow(true);
  }, []);

  // Handle location confirmation
  const handleLocationConfirm = useCallback((location) => {
    setReportLocation(location);
    setShowLocationPicker(false);

    // Submit the quick report
    submitReport({
      ...selectedReport,
      location,
      timestamp: new Date().toISOString(),
      isQuickReport: true,
    });
  }, [selectedReport]);

  // Handle detailed report submission
  const handleDetailedSubmit = useCallback((reportData) => {
    setShowDetailedFlow(false);
    submitReport({
      ...reportData,
      timestamp: new Date().toISOString(),
      isQuickReport: false,
    });
  }, []);

  // Submit report
  const submitReport = useCallback((reportData) => {
    console.log('Submitting report:', reportData);
    setSubmittedReport(reportData);
    setShowConfirmation(true);

    // Call parent handler
    onReportSubmit?.(reportData);

    // Reset after confirmation
    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedReport(null);
      setSubmittedReport(null);
    }, 3000);
  }, [onReportSubmit]);

  // Handle close
  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose?.();
    });
  }, [onClose]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [600, 0],
              }),
            }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>What do you see?</Text>
            <Text style={styles.subtitle}>
              Your reports help keep the community safe
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Quick report grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <QuickReportGrid
            categories={REPORT_CATEGORIES}
            onSelectReport={handleQuickReport}
          />

          {/* Detailed report option */}
          <TouchableOpacity
            style={styles.detailedButton}
            onPress={handleDetailedReport}
            activeOpacity={0.8}
          >
            <View style={styles.detailedButtonContent}>
              <View style={styles.detailedIcon}>
                <Text style={styles.detailedIconText}>📋</Text>
              </View>
              <View style={styles.detailedText}>
                <Text style={styles.detailedTitle}>File a detailed report</Text>
                <Text style={styles.detailedSubtitle}>
                  Add photos, description, and more context
                </Text>
              </View>
              <Text style={styles.detailedArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Privacy note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              All reports are anonymous. Your identity is never shared.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Location picker modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <LocationConfirmation
          initialLocation={currentLocation}
          reportType={selectedReport}
          onConfirm={handleLocationConfirm}
          onCancel={() => setShowLocationPicker(false)}
        />
      </Modal>

      {/* Detailed report modal */}
      <Modal
        visible={showDetailedFlow}
        animationType="slide"
        onRequestClose={() => setShowDetailedFlow(false)}
      >
        <DetailedReportFlow
          categories={REPORT_CATEGORIES}
          initialLocation={currentLocation}
          onSubmit={handleDetailedSubmit}
          onCancel={() => setShowDetailedFlow(false)}
        />
      </Modal>

      {/* Confirmation overlay */}
      <ReportConfirmation
        visible={showConfirmation}
        report={submittedReport}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'flex-end',
  },

  content: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '90%',
    ...shadows.xl,
  },

  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    ...typography.headlineLarge,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },

  closeIcon: {
    fontSize: 16,
    color: colors.text.secondary,
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing.xl,
    paddingBottom: layout.safeArea.bottom + spacing.xl,
  },

  // Detailed report button
  detailedButton: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  detailedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },

  detailedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.community.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  detailedIconText: {
    fontSize: 24,
  },

  detailedText: {
    flex: 1,
  },

  detailedTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },

  detailedSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  detailedArrow: {
    fontSize: 20,
    color: colors.text.tertiary,
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  privacyIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },

  privacyText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    flex: 1,
  },
});

ReportingScreen.displayName = 'ReportingScreen';

export default ReportingScreen;
