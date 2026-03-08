/**
 * Sheet Component
 * ===============
 * Bottom sheet component for modal-like content.
 * Part of the Industrial Steel design system.
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { COLORS } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SheetHeader - Consistent header for sheets
 */
export const SheetHeader = memo(({
  title,
  subtitle,
  onClose,
  rightAction,
  showBackArrow = false,
}) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      {showBackArrow && onClose && (
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.headerRight}>
      {rightAction}
      {!showBackArrow && onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
));

SheetHeader.displayName = 'SheetHeader';

/**
 * Sheet - Bottom sheet container
 * 
 * @param {React.ReactNode} children - Sheet content
 * @param {string} title - Sheet title
 * @param {string} subtitle - Optional subtitle
 * @param {function} onClose - Close handler
 * @param {boolean} scrollable - Enable scroll (default true)
 * @param {object} style - Additional styles
 * @param {boolean} showBackArrow - Show back arrow instead of X
 * @param {React.ReactNode} rightAction - Right side action component
 * @param {boolean} keyboardAvoiding - Enable keyboard avoiding behavior
 * @param {string} maxHeight - Maximum height ('full' | 'half' | 'auto')
 */
const Sheet = memo(({
  children,
  title,
  subtitle,
  onClose,
  scrollable = true,
  style,
  showBackArrow = false,
  rightAction,
  keyboardAvoiding = false,
  maxHeight = 'auto',
}) => {
  const getMaxHeight = useCallback(() => {
    switch (maxHeight) {
      case 'full':
        return SCREEN_HEIGHT * 0.9;
      case 'half':
        return SCREEN_HEIGHT * 0.5;
      default:
        return undefined;
    }
  }, [maxHeight]);

  const Container = keyboardAvoiding ? KeyboardAvoidingView : View;
  const containerProps = keyboardAvoiding ? {
    behavior: Platform.OS === 'ios' ? 'padding' : 'height',
    keyboardVerticalOffset: Platform.OS === 'ios' ? 50 : 0,
  } : {};

  return (
    <Container
      style={[
        styles.sheet,
        maxHeight !== 'auto' && { maxHeight: getMaxHeight() },
        style,
      ]}
      {...containerProps}
    >
      {title && (
        <SheetHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          showBackArrow={showBackArrow}
          rightAction={rightAction}
        />
      )}
      
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </Container>
  );
});

Sheet.displayName = 'Sheet';

/**
 * SheetOverlay - Full screen overlay with sheet
 */
export const SheetOverlay = memo(({
  visible,
  onClose,
  children,
  ...sheetProps
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <Sheet onClose={onClose} {...sheetProps}>
        {children}
      </Sheet>
    </View>
  );
});

SheetOverlay.displayName = 'SheetOverlay';

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.text,
    fontWeight: '300',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text3,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: COLORS.text3,
    fontWeight: '300',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

export default Sheet;
