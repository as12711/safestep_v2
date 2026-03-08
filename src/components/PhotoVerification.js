/**
 * Photo Verification Component
 * ============================
 * Handles photo capture and upload for report verification.
 * Supports camera capture and gallery selection.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { COLORS } from '../theme/colors';

// Report types that require/benefit from photos
export const PHOTO_REQUIRED_TYPES = ['hazard', 'closed', 'construction'];
export const PHOTO_RECOMMENDED_TYPES = ['police', 'security', 'dark', 'lit'];
export const PHOTO_OPTIONAL_TYPES = ['crowd', 'quiet', 'open-business', 'bathroom', 'accessible'];

/**
 * Check if a report type needs photo verification
 */
export const getPhotoRequirement = (reportType) => {
  if (PHOTO_REQUIRED_TYPES.includes(reportType)) {
    return { required: true, label: 'Photo Required', priority: 'high' };
  }
  if (PHOTO_RECOMMENDED_TYPES.includes(reportType)) {
    return { required: false, label: 'Photo Recommended', priority: 'medium' };
  }
  return { required: false, label: 'Photo Optional', priority: 'low' };
};

/**
 * PhotoCapture - Main photo capture component
 */
const PhotoCapture = memo(({
  photo,
  onPhotoChange,
  reportType,
  style,
  showRequirement = true,
}) => {
  const [loading, setLoading] = useState(false);
  const requirement = getPhotoRequirement(reportType);

  /**
   * Request camera permissions
   */
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Needed',
        'Please enable camera access in settings to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  /**
   * Request gallery permissions
   */
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Needed',
        'Please enable photo library access in settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  /**
   * Take photo with camera
   */
  const takePhoto = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Balance quality vs file size
        exif: true, // Include location/timestamp metadata
      });

      if (!result.canceled && result.assets?.[0]) {
        onPhotoChange({
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          exif: result.assets[0].exif,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.warn('[PhotoCapture] Camera error:', error);
    } finally {
      setLoading(false);
    }
  }, [onPhotoChange]);

  /**
   * Select photo from gallery
   */
  const selectFromGallery = useCallback(async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        exif: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        onPhotoChange({
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          exif: result.assets[0].exif,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      console.warn('[PhotoCapture] Gallery error:', error);
    } finally {
      setLoading(false);
    }
  }, [onPhotoChange]);

  /**
   * Show photo options
   */
  const showPhotoOptions = useCallback(() => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo to verify this report.',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [takePhoto, selectFromGallery]);

  /**
   * Remove photo
   */
  const removePhoto = useCallback(() => {
    Alert.alert(
      'Remove Photo?',
      requirement.required 
        ? 'This report type requires a photo for verification.'
        : 'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => onPhotoChange(null) 
        },
      ]
    );
  }, [onPhotoChange, requirement.required]);

  return (
    <View style={[styles.container, style]}>
      {/* Requirement indicator */}
      {showRequirement && (
        <View style={[
          styles.requirementBadge,
          requirement.priority === 'high' && styles.requirementHigh,
          requirement.priority === 'medium' && styles.requirementMedium,
        ]}>
          <Text style={styles.requirementText}>
            {requirement.priority === 'high' ? '📸 ' : requirement.priority === 'medium' ? '📷 ' : ''}
            {requirement.label}
          </Text>
        </View>
      )}

      {/* Photo preview or capture button */}
      {photo ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          <View style={styles.previewOverlay}>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={showPhotoOptions}
            >
              <Text style={styles.previewButtonText}>📷 Change</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.previewButton, styles.removeButton]}
              onPress={removePhoto}
            >
              <Text style={styles.previewButtonText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Photo Added</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.captureButton}
          onPress={showPhotoOptions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.captureIcon}>📷</Text>
              <Text style={styles.captureText}>Add Photo</Text>
              <Text style={styles.captureHint}>
                {requirement.required 
                  ? 'Required for this report type'
                  : 'Helps verify your report faster'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Quick capture buttons */}
      {!photo && !loading && (
        <View style={styles.quickButtons}>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={takePhoto}
          >
            <Text style={styles.quickButtonIcon}>📸</Text>
            <Text style={styles.quickButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={selectFromGallery}
          >
            <Text style={styles.quickButtonIcon}>🖼️</Text>
            <Text style={styles.quickButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

PhotoCapture.displayName = 'PhotoCapture';

/**
 * PhotoVerificationPrompt - Prompt shown when photo is required
 */
export const PhotoVerificationPrompt = memo(({
  reportType,
  onTakePhoto,
  onSkip,
  canSkip = false,
}) => {
  const requirement = getPhotoRequirement(reportType);

  return (
    <View style={styles.promptContainer}>
      <Text style={styles.promptIcon}>📸</Text>
      <Text style={styles.promptTitle}>
        {requirement.required ? 'Photo Required' : 'Add a Photo?'}
      </Text>
      <Text style={styles.promptDescription}>
        {requirement.required
          ? 'This report type requires a photo for verification. Your photo helps keep the community safe.'
          : 'Adding a photo helps verify your report faster and makes it more useful for others.'}
      </Text>

      <TouchableOpacity 
        style={styles.promptPrimaryButton}
        onPress={onTakePhoto}
      >
        <Text style={styles.promptPrimaryText}>📷 Take Photo</Text>
      </TouchableOpacity>

      {canSkip && !requirement.required && (
        <TouchableOpacity 
          style={styles.promptSecondaryButton}
          onPress={onSkip}
        >
          <Text style={styles.promptSecondaryText}>Skip for now</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.promptFooter}>
        💡 Photos are reviewed before being shared publicly
      </Text>
    </View>
  );
});

PhotoVerificationPrompt.displayName = 'PhotoVerificationPrompt';

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  requirementBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  requirementHigh: {
    backgroundColor: COLORS.dangerDim,
  },
  requirementMedium: {
    backgroundColor: COLORS.warnDim,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text2,
  },
  captureButton: {
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  captureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  captureText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  captureHint: {
    fontSize: 12,
    color: COLORS.text3,
    textAlign: 'center',
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  quickButtonIcon: {
    fontSize: 16,
  },
  quickButtonText: {
    fontSize: 13,
    color: COLORS.text2,
    fontWeight: '500',
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  removeButton: {
    backgroundColor: 'rgba(255,107,107,0.3)',
  },
  previewButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.safe,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  // Prompt styles
  promptContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  promptIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  promptDescription: {
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  promptPrimaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  promptPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  promptSecondaryButton: {
    paddingVertical: 12,
  },
  promptSecondaryText: {
    fontSize: 14,
    color: COLORS.text3,
  },
  promptFooter: {
    fontSize: 11,
    color: COLORS.text3,
    marginTop: 16,
  },
});

export default PhotoCapture;
