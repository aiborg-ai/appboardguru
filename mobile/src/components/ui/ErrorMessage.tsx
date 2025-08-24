/**
 * Error Message Component
 * Enterprise-grade error display component with retry functionality
 * Optimized for governance workflows with comprehensive error handling
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';
import { MobileButton } from './MobileButton';

interface ErrorMessageProps {
  error: string | Error;
  title?: string;
  variant?: 'inline' | 'card' | 'fullscreen';
  showIcon?: boolean;
  showRetry?: boolean;
  retryLabel?: string;
  onRetry?: () => void;
  showDetails?: boolean;
  onShowDetails?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = 'Something went wrong',
  variant = 'card',
  showIcon = true,
  showRetry = true,
  retryLabel = 'Try Again',
  onRetry,
  showDetails = false,
  onShowDetails,
  style,
  titleStyle,
  messageStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Get error message string
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Get error type for appropriate icon and styling
  const getErrorType = (): {
    icon: string;
    color: string;
    backgroundColor: string;
  } => {
    const errorLower = errorMessage.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return {
        icon: 'wifi-off',
        color: '#F59E0B',
        backgroundColor: isDark ? '#1F1B0F' : '#FFFBEB',
      };
    }
    
    if (errorLower.includes('unauthorized') || errorLower.includes('forbidden')) {
      return {
        icon: 'shield-alert',
        color: '#DC2626',
        backgroundColor: isDark ? '#1F1B1B' : '#FEF2F2',
      };
    }
    
    if (errorLower.includes('timeout') || errorLower.includes('slow')) {
      return {
        icon: 'clock-alert',
        color: '#F59E0B',
        backgroundColor: isDark ? '#1F1B0F' : '#FFFBEB',
      };
    }
    
    if (errorLower.includes('sync') || errorLower.includes('conflict')) {
      return {
        icon: 'sync-alert',
        color: '#8B5CF6',
        backgroundColor: isDark ? '#1B1B1F' : '#FAF5FF',
      };
    }
    
    // Default error styling
    return {
      icon: 'alert-circle',
      color: '#DC2626',
      backgroundColor: isDark ? '#1F1B1B' : '#FEF2F2',
    };
  };

  const errorInfo = getErrorType();

  // Handle retry with haptic feedback
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;
    
    await hapticFeedback('light');
    onRetry();
  }, [onRetry]);

  // Handle show details
  const handleShowDetails = useCallback(async () => {
    if (!onShowDetails) return;
    
    await hapticFeedback('light');
    onShowDetails();
  }, [onShowDetails]);

  // Get container styles based on variant
  const getContainerStyles = (): ViewStyle[] => {
    const baseStyles = [styles.container];
    
    switch (variant) {
      case 'inline':
        return [
          ...baseStyles,
          styles.inlineContainer,
          { backgroundColor: errorInfo.backgroundColor },
          isDark && styles.inlineContainerDark,
        ];
      case 'card':
        return [
          ...baseStyles,
          styles.cardContainer,
          { backgroundColor: errorInfo.backgroundColor },
          isDark && styles.cardContainerDark,
        ];
      case 'fullscreen':
        return [
          ...baseStyles,
          styles.fullscreenContainer,
          { backgroundColor: isDark ? '#111827' : '#F9FAFB' },
        ];
      default:
        return baseStyles;
    }
  };

  const containerStyles = StyleSheet.flatten([
    ...getContainerStyles(),
    style,
  ]);

  return (
    <View 
      style={containerStyles}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel || `Error: ${errorMessage}`}
      accessibilityHint={accessibilityHint}
    >
      {/* Icon and Title Row */}
      <View style={styles.headerRow}>
        {showIcon && (
          <View style={[styles.iconContainer, { backgroundColor: errorInfo.color + '20' }]}>
            <Icon
              name={errorInfo.icon}
              size={variant === 'fullscreen' ? 32 : 24}
              color={errorInfo.color}
              accessibilityLabel={`${errorInfo.icon} error icon`}
            />
          </View>
        )}
        
        <View style={styles.headerText}>
          <Text 
            style={[
              styles.title,
              variant === 'fullscreen' && styles.titleLarge,
              { color: isDark ? '#F9FAFB' : '#111827' },
              titleStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      </View>

      {/* Error Message */}
      <Text 
        style={[
          styles.message,
          variant === 'fullscreen' && styles.messageLarge,
          { color: isDark ? '#D1D5DB' : '#6B7280' },
          messageStyle,
        ]}
      >
        {errorMessage}
      </Text>

      {/* Action Buttons */}
      {(showRetry || showDetails) && (
        <View style={styles.actions}>
          {showRetry && onRetry && (
            <MobileButton
              title={retryLabel}
              variant="primary"
              size={variant === 'fullscreen' ? 'large' : 'medium'}
              onPress={handleRetry}
              icon="refresh"
              testID={`${testID}-retry`}
              accessibilityLabel={`${retryLabel} button`}
              style={styles.retryButton}
            />
          )}
          
          {showDetails && onShowDetails && (
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={handleShowDetails}
              accessibilityRole="button"
              accessibilityLabel="View error details"
              testID={`${testID}-details`}
            >
              <Text style={[styles.detailsText, { color: errorInfo.color }]}>
                View Details
              </Text>
              <Icon
                name="chevron-right"
                size={16}
                color={errorInfo.color}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  
  // Variant styles
  inlineContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  inlineContainerDark: {
    borderColor: '#374151',
  },
  
  cardContainer: {
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardContainerDark: {
    borderColor: '#374151',
  },
  
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // Header styles
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  titleLarge: {
    fontSize: 20,
    lineHeight: 28,
  },

  // Message styles
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  messageLarge: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },

  // Action styles
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flex: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});