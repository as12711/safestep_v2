/**
 * Input Component
 * ===============
 * Consistent text input styling for forms.
 * Part of the Industrial Steel design system.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { COLORS } from '../theme/colors';

/**
 * Input - Styled text input with label support
 * 
 * @param {string} label - Input label
 * @param {string} value - Input value
 * @param {function} onChangeText - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {boolean} secureTextEntry - Password field
 * @param {string} error - Error message
 * @param {string} hint - Hint text below input
 * @param {boolean} multiline - Multiline input
 * @param {number} numberOfLines - Number of lines for multiline
 * @param {object} style - Additional container styles
 * @param {object} inputStyle - Additional input styles
 * @param {React.ReactNode} rightElement - Element on the right side
 * @param {boolean} disabled - Disable input
 * @param {...props} - All other TextInput props
 */
const Input = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  hint,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  rightElement,
  disabled = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        error && styles.inputWrapperError,
        disabled && styles.inputWrapperDisabled,
      ]}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            disabled && styles.inputDisabled,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text3}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePassword}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightElement && (
          <View style={styles.rightElement}>
            {rightElement}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
      
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

/**
 * SearchInput - Specialized search input
 */
export const SearchInput = memo(({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  style,
  ...props
}) => (
  <View style={[styles.searchContainer, style]}>
    <Text style={styles.searchIcon}>🔍</Text>
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.text3}
      returnKeyType="search"
      {...props}
    />
    {value?.length > 0 && (
      <TouchableOpacity onPress={onClear} style={styles.clearButton}>
        <Text style={styles.clearText}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
));

SearchInput.displayName = 'SearchInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text3,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
  },
  inputWrapperDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  inputDisabled: {
    color: COLORS.text3,
  },
  passwordToggle: {
    padding: 12,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  rightElement: {
    paddingRight: 12,
  },
  error: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 6,
  },
  // Search input styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.text3,
  },
});

export default Input;
