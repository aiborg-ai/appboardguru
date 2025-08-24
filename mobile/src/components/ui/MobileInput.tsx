/**
 * Mobile Input Component
 * Enterprise-grade input component with validation and accessibility
 * Optimized for mobile touch interactions and governance workflows
 */

import React, { forwardRef, useState, useCallback } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cva, type VariantProps } from 'class-variance-authority';

import type { MobileComponentProps } from '../../types/mobile';
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

// Input variants using class-variance-authority pattern
const inputVariants = cva('', {
  variants: {
    variant: {
      default: '',
      filled: '',
      outline: '',
      underline: '',
    },
    size: {
      small: '',
      medium: '',
      large: '',
    },
    state: {
      default: '',
      error: '',
      success: '',
      warning: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'medium',
    state: 'default',
  },
});

interface MobileInputProps
  extends Omit<TextInputProps, 'style'>,
         MobileComponentProps,
         VariantProps<typeof inputVariants> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  successMessage?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  required?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  containerStyle?: ViewStyle;
  hapticFeedback?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: TextInputProps['keyboardType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

const MobileInput = forwardRef<TextInput, MobileInputProps>((
  {
    label,
    placeholder,
    helperText,
    errorMessage,
    successMessage,
    leftIcon,
    rightIcon,
    onRightIconPress,
    required = false,
    showCharacterCount = false,
    maxLength,
    variant = 'default',
    size = 'medium',
    state = 'default',
    disabled = false,
    style,
    inputStyle,
    labelStyle,
    containerStyle,
    hapticFeedback: enableHaptic = true,
    secureTextEntry = false,
    autoCapitalize = 'sentences',
    keyboardType = 'default',
    returnKeyType = 'done',
    onSubmitEditing,
    onFocus,
    onBlur,
    value = '',
    onChangeText,
    testID,
    accessibilityLabel,
    accessibilityHint,
    ...props
  },
  ref
) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const focusAnimation = new Animated.Value(0);

  // Determine current state
  const currentState = errorMessage ? 'error' : successMessage ? 'success' : state;

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    if (enableHaptic) {
      hapticFeedback('light');
    }
    
    onFocus?.();
  }, [enableHaptic, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    onBlur?.();
  }, [onBlur]);

  // Handle password visibility toggle
  const togglePasswordVisibility = useCallback(async () => {
    setIsPasswordVisible(!isPasswordVisible);
    if (enableHaptic) {
      await hapticFeedback('light');
    }
  }, [isPasswordVisible, enableHaptic]);

  // Handle right icon press
  const handleRightIconPress = useCallback(async () => {
    if (secureTextEntry) {
      togglePasswordVisibility();
    } else {
      if (enableHaptic) {
        await hapticFeedback('light');
      }
      onRightIconPress?.();
    }
  }, [secureTextEntry, togglePasswordVisibility, enableHaptic, onRightIconPress]);

  // Get container styles
  const containerStyles = StyleSheet.flatten([
    styles.container,
    containerStyle,
  ]);

  // Get input container styles
  const inputContainerStyles = StyleSheet.flatten([
    styles.inputContainer,
    styles[`variant_${variant}_${isDark ? 'dark' : 'light'}`],
    styles[`size_${size}`],
    styles[`state_${currentState}_${isDark ? 'dark' : 'light'}`],
    isFocused && styles[`focused_${variant}_${isDark ? 'dark' : 'light'}`],
    disabled && styles.disabled,
    style,
  ]);

  // Get input styles
  const textInputStyles = StyleSheet.flatten([
    styles.input,
    styles[`inputSize_${size}`],
    {
      color: disabled 
        ? (isDark ? '#6B7280' : '#9CA3AF')
        : (isDark ? '#F9FAFB' : '#111827'),
    },
    inputStyle,
  ]);

  // Get label styles
  const labelStyles = StyleSheet.flatten([
    styles.label,
    styles[`labelSize_${size}`],
    {
      color: currentState === 'error' 
        ? '#DC2626'
        : currentState === 'success'
        ? '#10B981'
        : (isDark ? '#D1D5DB' : '#374151'),
    },
    labelStyle,
  ]);

  // Get helper text color
  const getHelperTextColor = (): string => {
    if (currentState === 'error') return '#DC2626';
    if (currentState === 'success') return '#10B981';
    if (currentState === 'warning') return '#F59E0B';
    return isDark ? '#9CA3AF' : '#6B7280';
  };

  // Get icon color
  const getIconColor = (): string => {
    if (disabled) return isDark ? '#6B7280' : '#9CA3AF';
    if (currentState === 'error') return '#DC2626';
    if (currentState === 'success') return '#10B981';
    if (isFocused) return '#3B82F6';
    return isDark ? '#9CA3AF' : '#6B7280';
  };

  // Get icon size based on input size
  const getIconSize = (): number => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 24;
      default: return 20;
    }
  };

  return (
    <View style={containerStyles}>
      {/* Label */}
      {label && (
        <Text style={labelStyles}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View style={inputContainerStyles}>
        {/* Left Icon */}
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.leftIcon}
            accessibilityLabel={`${leftIcon} icon`}
          />
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={textInputStyles}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          editable={!disabled}
          selectTextOnFocus
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityRole="text"
          accessibilityState={{
            disabled,
          }}
          {...props}
        />

        {/* Right Icon */}
        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            style={styles.rightIconContainer}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={
              secureTextEntry 
                ? (isPasswordVisible ? 'Hide password' : 'Show password')
                : `${rightIcon} button`
            }
          >
            <Icon
              name={
                secureTextEntry 
                  ? (isPasswordVisible ? 'eye-off' : 'eye')
                  : rightIcon || 'close'
              }
              size={getIconSize()}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text and Character Count */}
      <View style={styles.footer}>
        <View style={styles.helperTextContainer}>
          {/* Error Message */}
          {errorMessage && (
            <Text style={[styles.helperText, styles.errorText]}>
              {errorMessage}
            </Text>
          )}
          
          {/* Success Message */}
          {successMessage && !errorMessage && (
            <Text style={[styles.helperText, styles.successText]}>
              {successMessage}
            </Text>
          )}
          
          {/* Helper Text */}
          {helperText && !errorMessage && !successMessage && (
            <Text style={[styles.helperText, { color: getHelperTextColor() }]}>
              {helperText}
            </Text>
          )}
        </View>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <Text style={[styles.characterCount, { color: getHelperTextColor() }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
});

MobileInput.displayName = 'MobileInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  // Label styles
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  labelSize_small: {
    fontSize: 14,
  },
  labelSize_medium: {
    fontSize: 16,
  },
  labelSize_large: {
    fontSize: 18,
  },
  required: {
    color: '#DC2626',
  },

  // Input container styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },

  // Size variants
  size_small: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 8,
  },
  size_medium: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 12,
  },
  size_large: {
    paddingHorizontal: 20,
    minHeight: 52,
    borderRadius: 14,
  },

  // Variant styles - Light theme
  variant_default_light: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  variant_filled_light: {
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
  },
  variant_outline_light: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  variant_underline_light: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    borderRadius: 0,
    paddingHorizontal: 0,
  },

  // Variant styles - Dark theme
  variant_default_dark: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  variant_filled_dark: {
    backgroundColor: '#4B5563',
    borderWidth: 0,
  },
  variant_outline_dark: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6B7280',
  },
  variant_underline_dark: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#6B7280',
    borderRadius: 0,
    paddingHorizontal: 0,
  },

  // State styles - Light theme
  state_default_light: {},
  state_error_light: {
    borderColor: '#DC2626',
  },
  state_success_light: {
    borderColor: '#10B981',
  },
  state_warning_light: {
    borderColor: '#F59E0B',
  },

  // State styles - Dark theme
  state_default_dark: {},
  state_error_dark: {
    borderColor: '#EF4444',
  },
  state_success_dark: {
    borderColor: '#34D399',
  },
  state_warning_dark: {
    borderColor: '#FBBF24',
  },

  // Focus styles - Light theme
  focused_default_light: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  focused_filled_light: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  focused_outline_light: {
    borderColor: '#3B82F6',
  },
  focused_underline_light: {
    borderBottomColor: '#3B82F6',
  },

  // Focus styles - Dark theme
  focused_default_dark: {
    borderColor: '#60A5FA',
    backgroundColor: '#1F2937',
  },
  focused_filled_dark: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  focused_outline_dark: {
    borderColor: '#60A5FA',
  },
  focused_underline_dark: {
    borderBottomColor: '#60A5FA',
  },

  // Input text styles
  input: {
    flex: 1,
    fontWeight: '400',
    includeFontPadding: false,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
      android: {
        paddingVertical: 8,
      },
    }),
  },
  inputSize_small: {
    fontSize: 14,
  },
  inputSize_medium: {
    fontSize: 16,
  },
  inputSize_large: {
    fontSize: 18,
  },

  // Icon styles
  leftIcon: {
    marginRight: 12,
  },
  rightIconContainer: {
    marginLeft: 12,
    padding: 4,
  },

  // Footer styles
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  helperTextContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#DC2626',
  },
  successText: {
    color: '#10B981',
  },
  characterCount: {
    fontSize: 12,
    marginLeft: 8,
  },

  // State styles
  disabled: {
    opacity: 0.6,
  },
});

export { MobileInput };
export type { MobileInputProps };