/**
 * Report Flow Screen
 * ==================
 * End-to-end reporting flow with:
 * - Report type selection
 * - Photo capture (when required/recommended)
 * - Description input
 * - Location confirmation
 * - Submission with feedback
 */

import React, { memo, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, GRADIENTS } from '../theme/colors';
import PhotoCapture, { getPhotoRequirement, PHOTO_REQUIRED_TYPES } from '../components/PhotoVerification';
import { supabase } from '../services/supabase';
import locationService from '../services/locationService';

// Report categories with their types
const REPORT_CATEGORIES = [
  {
    id: 'safety',
    label: 'Safety',
    icon: '⚠️',
    types: [
      { type: 'hazard', icon: '⚠️', label: 'Hazard', description: 'Dangerous obstruction or situation' },
      { type: 'closed', icon: '🚫', label: 'Path Closed', description: 'Blocked or inaccessible route' },
      { type: 'construction', icon: '🚧', label: 'Construction', description: 'Active construction zone' },
      { type: 'dark', icon: '🌑', label: 'Dark Area', description: 'Poorly lit or no lighting' },
    ],
  },
  {
    id: 'resources',
    label: 'Safety Resources',
    icon: '🛡️',
    types: [
      { type: 'police', icon: '👮', label: 'Police', description: 'Police officer or patrol present' },
      { type: 'security', icon: '🛡️', label: 'Security', description: 'Security guard or booth' },
      { type: 'lit', icon: '💡', label: 'Well Lit', description: 'Brightly lit area' },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: '👥',
    types: [
      { type: 'crowd', icon: '👥', label: 'Crowded', description: 'Many people around' },
      { type: 'quiet', icon: '🔇', label: 'Quiet', description: 'Few people around' },
      { type: 'open-business', icon: '🏪', label: 'Open Business', description: 'Store or business is open' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: '♿',
    types: [
      { type: 'accessible', icon: '♿', label: 'Accessible', description: 'Wheelchair accessible route' },
      { type: 'bathroom', icon: '🚻', label: 'Friendly Restroom', description: 'Friendly restroom available' },
      { type: 'elevator', icon: '🛗', label: 'Elevator', description: 'Working elevator access' },
    ],
  },
];

/**
 * Step indicator component
 */
const StepIndicator = memo(({ currentStep, totalSteps }) => (
  <View style={styles.stepIndicator}>
    {Array.from({ length: totalSteps }, (_, i) => (
      <View
        key={i}
        style={[
          styles.stepDot,
          i < currentStep && styles.stepDotCompleted,
          i === currentStep && styles.stepDotActive,
        ]}
      />
    ))}
  </View>
));

StepIndicator.displayName = 'StepIndicator';

/**
 * Category selection grid
 */
const CategoryGrid = memo(({ onSelect, selectedCategory }) => (
  <View style={styles.categoryGrid}>
    {REPORT_CATEGORIES.map((category) => (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryCard,
          selectedCategory?.id === category.id && styles.categoryCardSelected,
        ]}
        onPress={() => onSelect(category)}
        activeOpacity={0.7}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryLabel}>{category.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
));

CategoryGrid.displayName = 'CategoryGrid';

/**
 * Type selection list
 */
const TypeList = memo(({ category, onSelect, selectedType }) => (
  <View style={styles.typeList}>
    <Text style={styles.sectionTitle}>What would you like to report?</Text>
    {category.types.map((type) => {
      const requirement = getPhotoRequirement(type.type);
      return (
        <TouchableOpacity
          key={type.type}
          style={[
            styles.typeCard,
            selectedType?.type === type.type && styles.typeCardSelected,
          ]}
          onPress={() => onSelect(type)}
          activeOpacity={0.7}
        >
          <View style={styles.typeIconContainer}>
            <Text style={styles.typeIcon}>{type.icon}</Text>
          </View>
          <View style={styles.typeContent}>
            <Text style={styles.typeLabel}>{type.label}</Text>
            <Text style={styles.typeDescription}>{type.description}</Text>
            {requirement.priority !== 'low' && (
              <View style={[
                styles.photoBadge,
                requirement.priority === 'high' && styles.photoBadgeRequired,
              ]}>
                <Text style={styles.photoBadgeText}>
                  📷 {requirement.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.typeArrow}>›</Text>
        </TouchableOpacity>
      );
    })}
  </View>
));

TypeList.displayName = 'TypeList';

/**
 * Location confirmation card
 */
const LocationCard = memo(({ location, onEdit }) => (
  <View style={styles.locationCard}>
    <View style={styles.locationHeader}>
      <Text style={styles.locationTitle}>📍 Report Location</Text>
      <TouchableOpacity onPress={onEdit} style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.locationText}>
      {location
        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
        : 'Using your current location'}
    </Text>
    <Text style={styles.locationAccuracy}>
      Accuracy: ±{Math.round(location?.accuracy || 10)}m
    </Text>
  </View>
));

LocationCard.displayName = 'LocationCard';

/**
 * Success animation
 */
const SuccessAnimation = memo(({ onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 2 seconds
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.successContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.successTitle}>Report Submitted!</Text>
      <Text style={styles.successSubtitle}>
        Thank you for helping keep the community safe
      </Text>
    </Animated.View>
  );
});

SuccessAnimation.displayName = 'SuccessAnimation';

/**
 * Main Report Flow Component
 */
const ReportFlow = memo(({ onClose, initialLocation, onSuccess }) => {
  // Flow state
  const [step, setStep] = useState(0); // 0: category, 1: type, 2: details, 3: submitting, 4: success
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(initialLocation || locationService.currentLocation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const photoRequirement = useMemo(() => 
    selectedType ? getPhotoRequirement(selectedType.type) : null
  , [selectedType]);

  /**
   * Handle category selection
   */
  const handleCategorySelect = useCallback((category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    setStep(1);
  }, []);

  /**
   * Handle type selection
   */
  const handleTypeSelect = useCallback((type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
    setStep(2);
  }, []);

  /**
   * Go back to previous step
   */
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) {
      setSelectedCategory(null);
    } else if (step === 2) {
      setSelectedType(null);
      setPhoto(null);
      setDescription('');
    }
    setStep(Math.max(0, step - 1));
  }, [step]);

  /**
   * Submit report
   */
  const handleSubmit = useCallback(async () => {
    // Validate
    if (photoRequirement?.required && !photo) {
      setError('A photo is required for this report type');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const reportData = {
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: selectedType.type,
        lat: location?.latitude || 40.7295,
        lng: location?.longitude || -73.9965,
        ts: Date.now(),
        photo_uri: photo?.uri || null,
        description: description.trim() || null,
      };

      // Use pending reports for verification workflow
      const { data, error: submitError } = await supabase.createPendingReport(reportData);

      if (submitError) {
        throw new Error(submitError);
      }

      setStep(4); // Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (e) {
      setError('Failed to submit report. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('[ReportFlow] Submit error:', e);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, photo, description, location, photoRequirement]);

  /**
   * Handle success completion
   */
  const handleSuccessComplete = useCallback(() => {
    onSuccess?.();
    onClose?.();
  }, [onSuccess, onClose]);

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.headerTitle}>What are you reporting?</Text>
            <Text style={styles.headerSubtitle}>
              Select a category to get started
            </Text>
            <CategoryGrid
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory}
            />
          </>
        );

      case 1:
        return (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedCategory.label}</Text>
            <TypeList
              category={selectedCategory}
              onSelect={handleTypeSelect}
              selectedType={selectedType}
            />
          </>
        );

      case 2:
        return (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedType.icon} {selectedType.label}
            </Text>

            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              {/* Location */}
              <LocationCard location={location} onEdit={() => {}} />

              {/* Photo Capture */}
              <PhotoCapture
                photo={photo}
                onPhotoChange={setPhoto}
                reportType={selectedType.type}
              />

              {/* Description */}
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>
                  Add details (optional)
                </Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe what you see..."
                  placeholderTextColor={COLORS.text3}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={280}
                />
                <Text style={styles.charCount}>{description.length}/280</Text>
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.textInverse} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Reports are reviewed before being shared. False reports may result
                in account restrictions.
              </Text>
            </ScrollView>
          </>
        );

      case 4:
        return <SuccessAnimation onComplete={handleSuccessComplete} />;

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header with close */}
      <View style={styles.header}>
        <StepIndicator currentStep={step} totalSteps={3} />
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderStep()}</View>
    </KeyboardAvoidingView>
  );
});

ReportFlow.displayName = 'ReportFlow';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface2,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.safe,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text3,
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.text3,
    marginBottom: 16,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  typeIcon: {
    fontSize: 24,
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    color: COLORS.text3,
  },
  photoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  photoBadgeRequired: {
    backgroundColor: COLORS.dangerDim,
  },
  photoBadgeText: {
    fontSize: 10,
    color: COLORS.text2,
  },
  typeArrow: {
    fontSize: 24,
    color: COLORS.text3,
    marginLeft: 10,
  },
  detailsScroll: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.text2,
  },
  locationAccuracy: {
    fontSize: 11,
    color: COLORS.text3,
    marginTop: 4,
  },
  descriptionSection: {
    marginTop: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.text3,
    textAlign: 'right',
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.text3,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.text3,
    textAlign: 'center',
  },
});

export default ReportFlow;
