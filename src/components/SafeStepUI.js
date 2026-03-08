/**
 * SafeStep UI Components
 * ======================
 * Futuristic Brutalist Design System Components
 * 
 * Features:
 * - Animated 3D safety markers with pulse effects
 * - Bold action buttons with haptic feedback
 * - Enhanced report form with photo upload
 * - Persistent safety messaging
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATION, MARKERS, BUTTONS, SAFETY_MESSAGES } from '../theme';

const { width: SW } = Dimensions.get('window');

// ===========================================
// ANIMATED SAFETY MARKER
// ===========================================
export const AnimatedSafetyMarker = memo(({
  type = 'blueLight',
  size = 'md',
  label = '',
  onPress,
  style,
  pulseEnabled = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  
  const markerConfig = MARKERS[type] || MARKERS.blueLight;
  const markerSize = MARKERS.size[markerConfig.size] || MARKERS.size[size] || 44;
  
  useEffect(() => {
    if (!pulseEnabled) return;
    
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: ANIMATION.pulse.maxScale,
            duration: ANIMATION.pulse.duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: ANIMATION.pulse.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: ANIMATION.pulse.minScale,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    
    // Float animation (subtle up/down)
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: ANIMATION.markerFloat.maxY,
          duration: ANIMATION.markerFloat.duration,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: ANIMATION.markerFloat.minY,
          duration: ANIMATION.markerFloat.duration,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    floatAnimation.start();
    
    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, [pulseEnabled]);
  
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    }
    onPress?.();
  };
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!onPress}
      style={[styles.markerContainer, style]}
    >
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        {/* Pulse ring */}
        {pulseEnabled && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: markerSize * 2,
                height: markerSize * 2,
                borderRadius: markerSize,
                backgroundColor: markerConfig.pulseColor,
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
              },
            ]}
          />
        )}
        
        {/* Main marker */}
        <View
          style={[
            styles.markerBody,
            {
              width: markerSize,
              height: markerSize,
              borderRadius: markerSize / 2,
              backgroundColor: markerConfig.backgroundColor,
              borderColor: markerConfig.borderColor,
              ...SHADOWS.glow(markerConfig.pulseColor),
            },
          ]}
        >
          <Text style={[styles.markerIcon, { fontSize: markerSize * 0.5 }]}>
            {markerConfig.icon}
          </Text>
        </View>
        
        {/* Label */}
        {label && (
          <View style={styles.markerLabel}>
            <Text style={styles.markerLabelText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ===========================================
// BOLD ACTION BUTTON
// ===========================================
export const ActionButton = memo(({
  title,
  subtitle,
  icon,
  variant = 'primary',
  size = 'large',
  onPress,
  disabled = false,
  loading = false,
  style,
  haptic = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };
  
  const handlePress = () => {
    if (haptic && Platform.OS !== 'web') {
      try {
        if (variant === 'danger') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (e) {}
    }
    onPress?.();
  };
  
  const buttonConfig = BUTTONS[variant] || BUTTONS.primary;
  const isLarge = size === 'large';
  
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.actionButton,
          {
            backgroundColor: disabled ? COLORS.surface3 : buttonConfig.backgroundColor,
            borderRadius: buttonConfig.borderRadius,
            borderWidth: buttonConfig.borderWidth || 0,
            borderColor: buttonConfig.borderColor || 'transparent',
            paddingVertical: isLarge ? SPACING.lg : SPACING.md,
            paddingHorizontal: isLarge ? SPACING.xl : SPACING.lg,
            minHeight: isLarge ? 64 : 48,
          },
          buttonConfig.shadowColor && SHADOWS.glow(buttonConfig.shadowColor),
        ]}
      >
        {loading ? (
          <ActivityIndicator color={buttonConfig.textColor} size="small" />
        ) : (
          <>
            {icon && (
              <Text style={[styles.actionButtonIcon, { fontSize: isLarge ? 24 : 18 }]}>
                {icon}
              </Text>
            )}
            <View style={styles.actionButtonContent}>
              <Text
                style={[
                  styles.actionButtonTitle,
                  {
                    color: disabled ? COLORS.text3 : buttonConfig.textColor,
                    fontSize: isLarge ? 17 : 15,
                    fontWeight: '700',
                  },
                ]}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.actionButtonSubtitle,
                    { color: disabled ? COLORS.text3 : buttonConfig.textColor },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});


// ===========================================
// ENHANCED REPORT FORM
// ===========================================
export const ReportForm = memo(({
  categories = [],
  onSubmit,
  onCancel,
  initialCategory = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!selectedCategory) {
      // Show error
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit?.({
        category: selectedCategory,
        description: description.trim(),
        photo,
        timestamp: Date.now(),
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <ScrollView style={styles.reportForm} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>📋 File a Report</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.reportClose}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {/* Category Selection (Required) */}
      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryChipLabel,
                  selectedCategory === cat.id && styles.categoryChipLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Photo Upload (Prominent) */}
      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>Photo Evidence</Text>
        <Text style={styles.photoNotice}>
          {SAFETY_MESSAGES.photoUploadNotice}
        </Text>
        <TouchableOpacity
          style={styles.photoUploadBox}
          onPress={() => {/* Will be implemented with ImagePicker */}}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <>
              <Text style={styles.photoUploadIcon}>📷</Text>
              <Text style={styles.photoUploadText}>Tap to add photo</Text>
              <Text style={styles.photoUploadHint}>Helps verify reports faster</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Description */}
      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="What happened? Please include any relevant details..."
          placeholderTextColor={COLORS.text3}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>
      
      {/* Safety Message */}
      <SafetyFooterMessage />
      
      {/* Submit Button */}
      <ActionButton
        title="Submit Report"
        icon="📤"
        variant="primary"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!selectedCategory}
        style={{ marginTop: SPACING.lg }}
      />
    </ScrollView>
  );
});

// ===========================================
// PERSISTENT SAFETY MESSAGE FOOTER
// ===========================================
export const SafetyFooterMessage = memo(({ style }) => {
  return (
    <View style={[styles.safetyFooter, style]}>
      <Text style={styles.safetyFooterIcon}>💡</Text>
      <Text style={styles.safetyFooterText}>
        {SAFETY_MESSAGES.reportFooter}
      </Text>
    </View>
  );
});

// ===========================================
// SAFETY MESSAGE TOAST
// ===========================================
export const SafetyToast = memo(({ message, visible, onDismiss }) => {
  const translateY = useRef(new Animated.Value(100)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
      
      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss?.());
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Animated.View
      style={[
        styles.safetyToast,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.safetyToastIcon}>💡</Text>
      <Text style={styles.safetyToastText}>{message}</Text>
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.safetyToastClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ===========================================
// SEARCH RESULT ITEM
// ===========================================
export const SearchResultItem = memo(({
  item,
  onPress,
  showDistance = true,
  showCategory = true,
}) => {
  const icon = item.icon || getCategoryIcon(item.category);
  
  return (
    <TouchableOpacity
      style={styles.searchResultItem}
      activeOpacity={0.7}
      onPress={() => onPress?.(item)}
    >
      <View style={[styles.searchResultIcon, item.isLocal && styles.searchResultIconLocal]}>
        <Text style={styles.searchResultEmoji}>{icon}</Text>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.searchResultMeta}>
          {showDistance && item.distance && (
            <Text style={styles.searchResultDistance}>
              {formatDistance(item.distance)}
            </Text>
          )}
          {showDistance && item.distance && item.address && (
            <Text style={styles.searchResultDot}>•</Text>
          )}
          {item.address && (
            <Text style={styles.searchResultAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.searchResultArrow}>→</Text>
    </TouchableOpacity>
  );
});

// Helper functions
function getCategoryIcon(category) {
  if (category && /[\u{1F300}-\u{1F9FF}]/u.test(category)) return category;
  const icons = {
    campus: '🏛️',
    food: '🍕',
    coffee: '☕',
    transit: '🚇',
    safety: '🛡️',
    hospital: '🏥',
    library: '📚',
    pharmacy: '💊',
    address: '📍',
    poi: '📍',
    recent: '🕐',
    saved: '⭐',
    home: '🏠',
    work: '💼',
  };
  return icons[category] || '📍';
}

function formatDistance(meters) {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ===========================================
// STYLES
// ===========================================
const styles = StyleSheet.create({
  // Marker styles
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    alignSelf: 'center',
  },
  markerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  markerIcon: {
    textAlign: 'center',
  },
  markerLabel: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  markerLabelText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: 'center',
  },
  
  // Action button styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    marginRight: SPACING.md,
  },
  actionButtonContent: {
    alignItems: 'center',
  },
  actionButtonTitle: {
    letterSpacing: 0.5,
  },
  actionButtonSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    opacity: 0.8,
  },
  
  
  // Report form styles
  reportForm: {
    flex: 1,
    padding: SPACING.lg,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  reportTitle: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.text,
  },
  reportClose: {
    fontSize: 24,
    color: COLORS.text3,
  },
  reportSection: {
    marginBottom: SPACING.xl,
  },
  reportLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.text2,
    marginBottom: SPACING.md,
  },
  required: {
    color: COLORS.danger,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  categoryChipIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  categoryChipLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text2,
  },
  categoryChipLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  photoNotice: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text3,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  photoUploadBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  photoUploadText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
  },
  photoUploadHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text3,
    marginTop: SPACING.xs,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
  },
  descriptionInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    color: COLORS.text,
    ...TYPOGRAPHY.bodyMedium,
    minHeight: 120,
  },
  charCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text3,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  
  // Safety footer
  safetyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.safeDim,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.safe,
  },
  safetyFooterIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  safetyFooterText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.safe,
    flex: 1,
  },
  
  // Safety toast
  safetyToast: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface3,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  safetyToastIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  safetyToastText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    flex: 1,
  },
  safetyToastClose: {
    fontSize: 18,
    color: COLORS.text3,
    padding: SPACING.sm,
  },
  
  // Search result item
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  searchResultIconLocal: {
    backgroundColor: COLORS.primaryDim,
  },
  searchResultEmoji: {
    fontSize: 22,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  searchResultDistance: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchResultDot: {
    color: COLORS.text3,
    marginHorizontal: SPACING.xs,
  },
  searchResultAddress: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text3,
    flex: 1,
  },
  searchResultArrow: {
    fontSize: 20,
    color: COLORS.text3,
    marginLeft: SPACING.sm,
  },
});

export default {
  AnimatedSafetyMarker,
  ActionButton,
  ReportForm,
  SafetyFooterMessage,
  SafetyToast,
  SearchResultItem,
};
