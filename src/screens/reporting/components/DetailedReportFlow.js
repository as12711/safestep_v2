/**
 * DetailedReportFlow
 * ===================
 * Multi-step flow for detailed incident reports.
 * Category → Details → Photo → Location → Review → Submit
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, layout } = theme;

const STEPS = ['category', 'details', 'photo', 'review'];

const DetailedReportFlow = memo(({
  categories,
  initialLocation,
  onSubmit,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [reportData, setReportData] = useState({
    category: null,
    type: null,
    description: '',
    photo: null,
    location: initialLocation,
    anonymous: true,
    urgency: 'normal',
  });

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate step transitions
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentStep,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel?.();
    }
  }, [currentStep, onCancel]);

  // Update report data
  const updateData = useCallback((key, value) => {
    setReportData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit?.(reportData);
  }, [reportData, onSubmit]);

  // Render current step
  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'category':
        return (
          <CategoryStep
            categories={categories}
            selected={reportData.category}
            selectedType={reportData.type}
            onSelect={(category, type) => {
              updateData('category', category);
              updateData('type', type);
            }}
          />
        );
      case 'details':
        return (
          <DetailsStep
            description={reportData.description}
            urgency={reportData.urgency}
            onDescriptionChange={(text) => updateData('description', text)}
            onUrgencyChange={(level) => updateData('urgency', level)}
          />
        );
      case 'photo':
        return (
          <PhotoStep
            photo={reportData.photo}
            onPhotoSelect={(photo) => updateData('photo', photo)}
          />
        );
      case 'review':
        return (
          <ReviewStep
            reportData={reportData}
            anonymous={reportData.anonymous}
            onAnonymousToggle={() => updateData('anonymous', !reportData.anonymous)}
          />
        );
      default:
        return null;
    }
  };

  // Check if can proceed
  const canProceed = () => {
    switch (STEPS[currentStep]) {
      case 'category':
        return reportData.category && reportData.type;
      case 'details':
        return true; // Description is optional
      case 'photo':
        return true; // Photo is optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Detailed Report</Text>
          <Text style={styles.headerStep}>
            Step {currentStep + 1} of {STEPS.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep === STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.submitButton, !canProceed() && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canProceed()}
          >
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Text style={styles.nextButtonIcon}>→</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// Category selection step
const CategoryStep = memo(({ categories, selected, selectedType, onSelect }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>What happened?</Text>
    <Text style={styles.stepSubtitle}>Select a category and type</Text>

    <View style={styles.categoryList}>
      {Object.values(categories).map((category) => (
        <View key={category.id}>
          <TouchableOpacity
            style={[
              styles.categoryItem,
              selected?.id === category.id && styles.categoryItemSelected,
            ]}
            onPress={() => onSelect(category, null)}
          >
            <View style={[
              styles.categoryIcon,
              { backgroundColor: category.color + '20' },
            ]}>
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
            </View>
            <Text style={styles.categoryLabel}>{category.label}</Text>
            <Text style={styles.categoryArrow}>
              {selected?.id === category.id ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {selected?.id === category.id && (
            <View style={styles.typeList}>
              {category.types.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    selectedType?.id === type.id && styles.typeItemSelected,
                  ]}
                  onPress={() => onSelect(category, type)}
                >
                  <Text style={styles.typeEmoji}>{type.icon}</Text>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  {selectedType?.id === type.id && (
                    <View style={styles.typeCheck}>
                      <Text style={styles.typeCheckIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  </View>
));

// Details step
const DetailsStep = memo(({ description, urgency, onDescriptionChange, onUrgencyChange }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Add details</Text>
    <Text style={styles.stepSubtitle}>Help others understand the situation</Text>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Description (optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="What did you observe? Any helpful details..."
        placeholderTextColor={colors.text.tertiary}
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Urgency level</Text>
      <View style={styles.urgencyOptions}>
        {['low', 'normal', 'high'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.urgencyOption,
              urgency === level && styles.urgencyOptionSelected,
              urgency === level && level === 'high' && styles.urgencyOptionHigh,
            ]}
            onPress={() => onUrgencyChange(level)}
          >
            <Text style={[
              styles.urgencyLabel,
              urgency === level && styles.urgencyLabelSelected,
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </View>
));

// Photo step
const PhotoStep = memo(({ photo, onPhotoSelect }) => {
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      onPhotoSelect(result.assets[0]);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      onPhotoSelect(result.assets[0]);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add a photo</Text>
      <Text style={styles.stepSubtitle}>
        Visual evidence helps verify reports (optional)
      </Text>

      {photo ? (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removePhoto}
            onPress={() => onPhotoSelect(null)}
          >
            <Text style={styles.removePhotoIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoOptions}>
          <TouchableOpacity style={styles.photoOption} onPress={handleTakePhoto}>
            <View style={styles.photoOptionIcon}>
              <Text style={styles.photoOptionEmoji}>📷</Text>
            </View>
            <Text style={styles.photoOptionLabel}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoOption} onPress={handlePickImage}>
            <View style={styles.photoOptionIcon}>
              <Text style={styles.photoOptionEmoji}>🖼️</Text>
            </View>
            <Text style={styles.photoOptionLabel}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.photoNote}>
        <Text style={styles.photoNoteIcon}>🔒</Text>
        <Text style={styles.photoNoteText}>
          Photos are reviewed for safety and never shared with your identity
        </Text>
      </View>
    </View>
  );
});

// Review step
const ReviewStep = memo(({ reportData, anonymous, onAnonymousToggle }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Review your report</Text>
    <Text style={styles.stepSubtitle}>Make sure everything looks correct</Text>

    <View style={styles.reviewCard}>
      {/* Category */}
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Category</Text>
        <View style={styles.reviewValue}>
          <Text style={styles.reviewEmoji}>{reportData.category?.icon}</Text>
          <Text style={styles.reviewText}>{reportData.category?.label}</Text>
        </View>
      </View>

      {/* Type */}
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Type</Text>
        <View style={styles.reviewValue}>
          <Text style={styles.reviewEmoji}>{reportData.type?.icon}</Text>
          <Text style={styles.reviewText}>{reportData.type?.label}</Text>
        </View>
      </View>

      {/* Description */}
      {reportData.description && (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewDescription}>{reportData.description}</Text>
        </View>
      )}

      {/* Photo */}
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Photo</Text>
        <Text style={styles.reviewText}>
          {reportData.photo ? '✓ Attached' : 'None'}
        </Text>
      </View>

      {/* Urgency */}
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Urgency</Text>
        <Text style={[
          styles.reviewText,
          reportData.urgency === 'high' && styles.reviewTextHigh,
        ]}>
          {reportData.urgency.charAt(0).toUpperCase() + reportData.urgency.slice(1)}
        </Text>
      </View>
    </View>

    {/* Anonymous toggle */}
    <TouchableOpacity
      style={styles.anonymousToggle}
      onPress={onAnonymousToggle}
    >
      <View style={styles.anonymousInfo}>
        <Text style={styles.anonymousIcon}>🔒</Text>
        <View>
          <Text style={styles.anonymousLabel}>Submit anonymously</Text>
          <Text style={styles.anonymousHint}>Your identity won't be shared</Text>
        </View>
      </View>
      <View style={[
        styles.toggleTrack,
        anonymous && styles.toggleTrackActive,
      ]}>
        <Animated.View style={[
          styles.toggleThumb,
          anonymous && styles.toggleThumbActive,
        ]} />
      </View>
    </TouchableOpacity>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: layout.safeArea.top,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 20,
    color: colors.text.primary,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  headerStep: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  cancelButton: {
    padding: spacing.sm,
  },

  cancelText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },

  progressTrack: {
    height: 4,
    backgroundColor: colors.ui.border,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.safety.safe,
    borderRadius: 2,
  },

  // Content
  contentContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Step container
  stepContainer: {
    paddingTop: spacing.lg,
  },

  stepTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  stepSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },

  // Category step
  categoryList: {
    gap: spacing.sm,
  },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  categoryItemSelected: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.bg.elevated,
  },

  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  categoryEmoji: {
    fontSize: 20,
  },

  categoryLabel: {
    ...typography.titleSmall,
    color: colors.text.primary,
    flex: 1,
  },

  categoryArrow: {
    fontSize: 12,
    color: colors.text.tertiary,
  },

  typeList: {
    marginTop: spacing.sm,
    marginLeft: spacing.xxl,
    gap: spacing.xs,
  },

  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  typeItemSelected: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.safety.safeMuted,
  },

  typeEmoji: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  typeLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
    flex: 1,
  },

  typeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.safety.safe,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeCheckIcon: {
    fontSize: 12,
    color: colors.bg.primary,
    fontWeight: '700',
  },

  // Details step
  inputGroup: {
    marginBottom: spacing.xl,
  },

  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  textArea: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...typography.bodyMedium,
    color: colors.text.primary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  urgencyOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  urgencyOption: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  urgencyOptionSelected: {
    borderColor: colors.safety.safe,
    backgroundColor: colors.safety.safeMuted,
  },

  urgencyOptionHigh: {
    borderColor: colors.safety.alert,
    backgroundColor: colors.safety.alertMuted,
  },

  urgencyLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  urgencyLabelSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },

  // Photo step
  photoPreview: {
    position: 'relative',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: radius.xl,
  },

  removePhoto: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removePhotoIcon: {
    fontSize: 14,
    color: colors.text.primary,
  },

  photoOptions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  photoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.community.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  photoOptionEmoji: {
    fontSize: 24,
  },

  photoOptionLabel: {
    ...typography.titleSmall,
    color: colors.text.primary,
  },

  photoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  photoNoteIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },

  photoNoteText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },

  // Review step
  reviewCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },

  reviewLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },

  reviewValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  reviewEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },

  reviewText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },

  reviewTextHigh: {
    color: colors.safety.alert,
    fontWeight: '600',
  },

  reviewDescription: {
    ...typography.bodySmall,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.xl,
  },

  // Anonymous toggle
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },

  anonymousInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  anonymousIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },

  anonymousLabel: {
    ...typography.titleSmall,
    color: colors.text.primary,
  },

  anonymousHint: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ui.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  toggleTrackActive: {
    backgroundColor: colors.safety.safe,
  },

  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.primary,
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
    backgroundColor: colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: colors.ui.divider,
  },

  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  nextButtonText: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  nextButtonIcon: {
    fontSize: 18,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },

  submitButton: {
    backgroundColor: colors.safety.safe,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  submitButtonText: {
    ...typography.titleMedium,
    color: colors.bg.primary,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});

CategoryStep.displayName = 'CategoryStep';
DetailsStep.displayName = 'DetailsStep';
PhotoStep.displayName = 'PhotoStep';
ReviewStep.displayName = 'ReviewStep';
DetailedReportFlow.displayName = 'DetailedReportFlow';

export default DetailedReportFlow;
