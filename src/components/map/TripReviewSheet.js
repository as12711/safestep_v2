/**
 * TripReviewSheet
 * ===============
 * Post-trip bottom sheet asking the user to rate safety and cleanliness
 * of the route they just walked. Shown after the arrival overlay.
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/designSystem';

const { colors, typography, spacing, radius, shadows, layout, getSafetyColor } = theme;

const TripReviewSheet = memo(({ route, onSubmit }) => {
  const slideAnim   = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [safetyRating,     setSafetyRating]     = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim,   { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRate = useCallback((setter, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  }, []);

  const handleSubmit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({ safetyRating, cleanlinessRating });
  }, [safetyRating, cleanlinessRating, onSubmit]);

  const safetyColor = getSafetyColor(route?.safetyScore ?? 75);
  const routeLabel  = route?.viaStreets?.[0] ?? 'Your route';

  return (
    <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <Text style={styles.title}>How was your walk?</Text>
        <Text style={styles.subtitle}>
          via {routeLabel} · {route?.distance ?? 0.6} mi · {route?.duration ?? 12} min
        </Text>

        {/* Safety rating */}
        <RatingRow
          label="Safety"
          hint="How safe did you feel?"
          rating={safetyRating}
          activeColor={safetyColor}
          onRate={(v) => handleRate(setSafetyRating, v)}
        />

        {/* Cleanliness rating */}
        <RatingRow
          label="Cleanliness"
          hint="Sidewalk conditions?"
          rating={cleanlinessRating}
          activeColor={colors.community.primary}
          onRate={(v) => handleRate(setCleanlinessRating, v)}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => onSubmit(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (safetyRating === 0 && cleanlinessRating === 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const RatingRow = memo(({ label, hint, rating, activeColor, onRate }) => (
  <View style={styles.ratingRow}>
    <View style={styles.ratingLabel}>
      <Text style={styles.ratingLabelText}>{label}</Text>
      <Text style={styles.ratingHint}>{hint}</Text>
    </View>
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onRate(n)}
          activeOpacity={0.7}
          style={styles.starTouch}
        >
          <View style={[
            styles.starCircle,
            n <= rating
              ? { backgroundColor: activeColor, borderColor: activeColor }
              : { backgroundColor: 'transparent', borderColor: colors.ui.border },
          ]}>
            <Text style={[
              styles.starText,
              n <= rating ? styles.starTextActive : styles.starTextInactive,
            ]}>
              {n}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </View>
));

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    zIndex: 300,
  },

  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.safeArea.bottom + 48 + spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
    ...shadows.lg,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ui.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },

  subtitle: {
    ...theme.typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },

  ratingLabel: {
    flex: 1,
    marginRight: spacing.md,
  },

  ratingLabelText: {
    ...theme.typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },

  ratingHint: {
    ...theme.typography.labelSmall,
    color: colors.text.tertiary,
  },

  stars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  starTouch: {
    padding: 2,
  },

  starCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  starText: {
    fontSize: 13,
    fontWeight: '700',
  },

  starTextActive: {
    color: '#000',
  },

  starTextInactive: {
    color: colors.text.tertiary,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  skipButton: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  skipText: {
    ...theme.typography.labelMedium,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  submitButton: {
    flex: 2,
    backgroundColor: colors.safety.safe,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  submitButtonDisabled: {
    opacity: 0.5,
  },

  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

RatingRow.displayName = 'RatingRow';
TripReviewSheet.displayName = 'TripReviewSheet';

export default TripReviewSheet;
