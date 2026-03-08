/**
 * LocationConfirmation
 * =====================
 * Confirm or adjust the location for a report.
 * Shows a mini map with draggable pin.
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, layout } = theme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dark map style
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0F1419' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C6C7A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1F26' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A0D10' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const LocationConfirmation = memo(({
  initialLocation,
  reportType,
  onConfirm,
  onCancel,
}) => {
  const [location, setLocation] = useState(initialLocation || {
    latitude: 40.7308,
    longitude: -73.9973,
  });
  const [isDragging, setIsDragging] = useState(false);

  const mapRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Handle marker drag
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDragEnd = useCallback((e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
    setIsDragging(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm?.(location);
  }, [location, onConfirm]);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    if (initialLocation) {
      mapRef.current?.animateToRegion({
        ...initialLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 300);
      setLocation(initialLocation);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [initialLocation]);

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.reportInfo}>
            <View style={[
              styles.reportIcon,
              { backgroundColor: colors.community.muted },
            ]}>
              <Text style={styles.reportIconText}>{reportType?.icon || '📍'}</Text>
            </View>
            <View>
              <Text style={styles.reportLabel}>{reportType?.label || 'Report'}</Text>
              <Text style={styles.headerSubtitle}>Confirm location</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={DARK_MAP_STYLE}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={location}
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Animated.View
                style={[
                  styles.marker,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <View style={styles.markerPin}>
                  <Text style={styles.markerEmoji}>{reportType?.icon || '📍'}</Text>
                </View>
                <View style={styles.markerShadow} />
              </Animated.View>
            </Marker>
          </MapView>

          {/* Recenter button */}
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={handleRecenter}
          >
            <Text style={styles.recenterIcon}>📍</Text>
          </TouchableOpacity>

          {/* Drag hint */}
          {isDragging && (
            <View style={styles.dragHint}>
              <Text style={styles.dragHintText}>Drag to adjust location</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionIcon}>👆</Text>
          <Text style={styles.instructionText}>
            Drag the pin to adjust the exact location of your report
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.overlay,
  },

  content: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    ...shadows.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },

  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  reportIconText: {
    fontSize: 22,
  },

  reportLabel: {
    ...typography.titleMedium,
    color: colors.text.primary,
  },

  headerSubtitle: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeIcon: {
    fontSize: 16,
    color: colors.text.secondary,
  },

  // Map
  mapContainer: {
    height: 250,
    margin: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bg.tertiary,
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  recenterButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  recenterIcon: {
    fontSize: 20,
  },

  dragHint: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  dragHintText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    overflow: 'hidden',
  },

  // Marker
  marker: {
    alignItems: 'center',
  },

  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.community.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  markerEmoji: {
    fontSize: 24,
  },

  markerShadow: {
    width: 20,
    height: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  },

  // Instructions
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },

  instructionIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },

  instructionText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: layout.safeArea.bottom + spacing.lg,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },

  cancelButtonText: {
    ...typography.titleSmall,
    color: colors.text.secondary,
  },

  confirmButton: {
    flex: 2,
    backgroundColor: colors.community.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  confirmButtonText: {
    ...typography.titleSmall,
    color: colors.bg.primary,
    fontWeight: '600',
  },
});

LocationConfirmation.displayName = 'LocationConfirmation';

export default LocationConfirmation;
