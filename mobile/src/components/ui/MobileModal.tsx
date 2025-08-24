/**
 * Mobile Modal Component
 * Enterprise-grade modal component optimized for governance workflows
 * Supports multiple presentation styles and accessibility features
 */

import React, { forwardRef, useEffect, useRef } from 'react';
import {
  Modal,
  ModalProps,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';

import type { MobileComponentProps } from '../../types/mobile';
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MobileModalProps extends Omit<ModalProps, 'children'>, MobileComponentProps {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  variant?: 'center' | 'bottom' | 'fullscreen' | 'side';
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'auto';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnBackButton?: boolean;
  hapticFeedback?: boolean;
  blurBackground?: boolean;
  maxHeight?: number;
  scrollable?: boolean;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
}

const MobileModal = forwardRef<View, MobileModalProps>((
  {
    children,
    isVisible,
    onClose,
    title,
    subtitle,
    variant = 'center',
    size = 'medium',
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnBackButton = true,
    hapticFeedback: enableHaptic = true,
    blurBackground = Platform.OS === 'ios',
    maxHeight,
    scrollable = false,
    headerActions,
    footerActions,
    padding = 'medium',
    borderRadius = 'medium',
    testID,
    accessibilityLabel,
    accessibilityHint,
    ...props
  },
  ref
) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  
  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.9);
  const modalTranslateY = useSharedValue(variant === 'bottom' ? SCREEN_HEIGHT : 0);
  const modalTranslateX = useSharedValue(variant === 'side' ? SCREEN_WIDTH : 0);

  // Animation values
  useEffect(() => {
    if (isVisible) {
      if (enableHaptic) {
        hapticFeedback('light');
      }
      
      backdropOpacity.value = withTiming(1, { duration: 300 });
      
      if (variant === 'center') {
        modalScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      } else if (variant === 'bottom') {
        modalTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
      } else if (variant === 'side') {
        modalTranslateX.value = withSpring(0, { damping: 15, stiffness: 300 });
      } else if (variant === 'fullscreen') {
        modalScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      
      if (variant === 'center') {
        modalScale.value = withTiming(0.9, { duration: 200 });
      } else if (variant === 'bottom') {
        modalTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      } else if (variant === 'side') {
        modalTranslateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
      } else if (variant === 'fullscreen') {
        modalScale.value = withTiming(0.95, { duration: 200 });
      }
    }
  }, [isVisible, variant, enableHaptic]);

  // Handle backdrop press
  const handleBackdropPress = async () => {
    if (!closeOnBackdrop) return;
    
    if (enableHaptic) {
      await hapticFeedback('light');
    }
    onClose();
  };

  // Handle close button press
  const handleClosePress = async () => {
    if (enableHaptic) {
      await hapticFeedback('light');
    }
    onClose();
  };

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => {
    const baseStyle = {
      transform: [] as any[],
    };

    if (variant === 'center' || variant === 'fullscreen') {
      baseStyle.transform.push({ scale: modalScale.value });
    }
    
    if (variant === 'bottom') {
      baseStyle.transform.push({ translateY: modalTranslateY.value });
    }
    
    if (variant === 'side') {
      baseStyle.transform.push({ translateX: modalTranslateX.value });
    }

    return baseStyle;
  });

  // Get modal container styles
  const getModalContainerStyles = () => {
    const baseStyles = [
      styles.modalContainer,
      styles[`variant_${variant}`],
      styles[`size_${size}_${variant}`],
      styles[`padding_${padding}`],
      styles[`radius_${borderRadius}`],
      {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        maxHeight: maxHeight || (variant === 'fullscreen' ? undefined : SCREEN_HEIGHT * 0.9),
      },
    ];

    return StyleSheet.flatten(baseStyles);
  };

  // Render modal content
  const renderContent = () => (
    <Animated.View style={[getModalContainerStyles(), modalStyle]} ref={ref}>
      {/* Header */}
      {(title || showCloseButton || headerActions) && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {title && (
              <View style={styles.titleContainer}>
                <Text style={[styles.title, isDark && styles.titleDark]}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.headerActions}>
              {headerActions}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={handleClosePress}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                  testID="modal-close-button"
                >
                  <Icon
                    name="close"
                    size={24}
                    color={isDark ? '#D1D5DB' : '#6B7280'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {scrollable ? (
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>

      {/* Footer */}
      {footerActions && (
        <View style={[styles.footer, isDark && styles.footerDark]}>
          {footerActions}
        </View>
      )}
    </Animated.View>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={closeOnBackButton ? onClose : undefined}
      statusBarTranslucent
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...props}
    >
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <Animated.View style={[styles.backdrop, backdropStyle]}>
              {blurBackground && Platform.OS === 'ios' ? (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType={isDark ? 'dark' : 'light'}
                  blurAmount={10}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(0, 0, 0, 0.7)'
                        : 'rgba(0, 0, 0, 0.5)',
                    },
                  ]}
                />
              )}
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Modal Content */}
          <TouchableWithoutFeedback>
            <View style={styles[`container_${variant}`]}>
              {renderContent()}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
});

MobileModal.displayName = 'MobileModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  // Container variants
  container_center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container_bottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container_fullscreen: {
    flex: 1,
  },
  container_side: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // Modal container
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },

  // Variant-specific modal styles
  variant_center: {
    maxWidth: SCREEN_WIDTH - 40,
  },
  variant_bottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
  },
  variant_fullscreen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
  },
  variant_side: {
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Size variants for center modal
  size_small_center: {
    width: SCREEN_WIDTH * 0.7,
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  size_medium_center: {
    width: SCREEN_WIDTH * 0.85,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  size_large_center: {
    width: SCREEN_WIDTH * 0.95,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  size_xlarge_center: {
    width: SCREEN_WIDTH * 0.95,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  size_auto_center: {
    maxWidth: SCREEN_WIDTH * 0.95,
  },

  // Size variants for side modal
  size_small_side: {
    width: SCREEN_WIDTH * 0.7,
  },
  size_medium_side: {
    width: SCREEN_WIDTH * 0.8,
  },
  size_large_side: {
    width: SCREEN_WIDTH * 0.9,
  },
  size_xlarge_side: {
    width: SCREEN_WIDTH * 0.95,
  },
  size_auto_side: {
    width: SCREEN_WIDTH * 0.8,
  },

  // Size variants for other types
  size_small_bottom: {},
  size_medium_bottom: {},
  size_large_bottom: {},
  size_xlarge_bottom: {},
  size_auto_bottom: {},
  size_small_fullscreen: {},
  size_medium_fullscreen: {},
  size_large_fullscreen: {},
  size_xlarge_fullscreen: {},
  size_auto_fullscreen: {},

  // Padding variants
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: 12,
  },
  padding_medium: {
    padding: 20,
  },
  padding_large: {
    padding: 24,
  },

  // Border radius variants
  radius_none: {
    borderRadius: 0,
  },
  radius_small: {
    borderRadius: 8,
  },
  radius_medium: {
    borderRadius: 16,
  },
  radius_large: {
    borderRadius: 24,
  },

  // Header styles
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  subtitleDark: {
    color: '#9CA3AF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content styles
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },

  // Footer styles
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 20,
  },
  footerDark: {
    borderTopColor: '#374151',
  },
});

export { MobileModal };
export type { MobileModalProps };