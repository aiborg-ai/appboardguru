/**
 * Floating Action Panel Component
 * Contextual action overlays for tablet interfaces
 * Supports gesture-based interactions and Apple Pencil/S Pen integration
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingAction {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  badge?: number;
  size?: 'small' | 'medium' | 'large';
}

interface FloatingActionPanelProps {
  visible: boolean;
  actions: FloatingAction[];
  onClose: () => void;
  position?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  style?: 'circular' | 'linear' | 'grid';
  maxActions?: number;
  allowDrag?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const FloatingActionPanel: React.FC<FloatingActionPanelProps> = ({
  visible,
  actions,
  onClose,
  position = { bottom: 100, right: 20 },
  style = 'circular',
  maxActions = 8,
  allowDrag = true,
  autoHide = false,
  autoHideDelay = 3000,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Animation values
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  const positionAnimation = useRef(new Animated.ValueXY({
    x: position.right ? screenWidth - position.right : position.left || 0,
    y: position.bottom ? screenHeight - position.bottom : position.top || 0,
  })).current;
  
  const actionAnimations = useRef(
    actions.map(() => new Animated.Value(0))
  ).current;

  // Auto-hide timer
  const autoHideTimer = useRef<NodeJS.Timeout>();

  // Drag gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => allowDrag,
      onPanResponderGrant: () => {
        // Clear auto-hide timer when dragging starts
        if (autoHideTimer.current) {
          clearTimeout(autoHideTimer.current);
        }
      },
      onPanResponderMove: Animated.event(
        [null, { dx: positionAnimation.x, dy: positionAnimation.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        // Snap to edges if needed
        const { dx, dy } = gestureState;
        const finalX = Math.max(
          50,
          Math.min(screenWidth - 50, positionAnimation.x._value + dx)
        );
        const finalY = Math.max(
          insets.top + 50,
          Math.min(screenHeight - insets.bottom - 50, positionAnimation.y._value + dy)
        );

        Animated.spring(positionAnimation, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
        }).start();

        // Restart auto-hide timer
        if (autoHide) {
          startAutoHideTimer();
        }
      },
    })
  ).current;

  // Animation control
  useEffect(() => {
    if (visible) {
      // Animate panel appearance
      Animated.parallel([
        Animated.spring(scaleAnimation, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger action animations
      const staggerDelay = 50;
      actionAnimations.forEach((animation, index) => {
        Animated.timing(animation, {
          toValue: 1,
          duration: 200,
          delay: index * staggerDelay,
          useNativeDriver: true,
        }).start();
      });

      // Start auto-hide timer
      if (autoHide) {
        startAutoHideTimer();
      }
    } else {
      // Animate panel disappearance
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        ...actionAnimations.map(animation =>
          Animated.timing(animation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ),
      ]).start();

      // Clear auto-hide timer
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    }
  }, [visible, autoHide]);

  // Auto-hide timer management
  const startAutoHideTimer = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    autoHideTimer.current = setTimeout(() => {
      onClose();
    }, autoHideDelay);
  }, [onClose, autoHideDelay]);

  // Calculate action positions based on style
  const getActionPosition = useCallback((index: number, totalActions: number) => {
    const limitedActions = Math.min(totalActions, maxActions);
    
    switch (style) {
      case 'circular': {
        const angle = (360 / limitedActions) * index;
        const radius = 80;
        const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
        const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;
        return { x, y };
      }
      
      case 'linear': {
        const spacing = 60;
        return { x: 0, y: -(index + 1) * spacing };
      }
      
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(limitedActions));
        const spacing = 60;
        const col = index % cols;
        const row = Math.floor(index / cols);
        return { x: (col - (cols - 1) / 2) * spacing, y: -(row + 1) * spacing };
      }
      
      default:
        return { x: 0, y: -(index + 1) * 60 };
    }
  }, [style, maxActions]);

  // Render individual action button
  const renderActionButton = useCallback((action: FloatingAction, index: number) => {
    const position = getActionPosition(index, actions.length);
    const animation = actionAnimations[index] || new Animated.Value(0);
    
    const size = action.size === 'large' ? 56 : action.size === 'small' ? 40 : 48;
    const iconSize = action.size === 'large' ? 28 : action.size === 'small' ? 20 : 24;
    
    return (
      <Animated.View
        key={action.id}
        style={[
          styles.actionButton,
          {
            width: size,
            height: size,
            backgroundColor: action.color || '#3b82f6',
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
            opacity: animation,
          },
          action.disabled && styles.actionButtonDisabled,
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButtonTouchable, { width: size, height: size }]}
          onPress={action.onPress}
          disabled={action.disabled}
          accessibilityLabel={action.label}
          accessibilityRole="button"
        >
          <Icon
            name={action.icon}
            size={iconSize}
            color="#ffffff"
          />
          {action.badge && action.badge > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>
                {action.badge > 99 ? '99+' : action.badge.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Action Label */}
        <Animated.View
          style={[
            styles.actionLabel,
            {
              opacity: animation,
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.actionLabelText}>{action.label}</Text>
        </Animated.View>
      </Animated.View>
    );
  }, [actions.length, getActionPosition, actionAnimations]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnimation,
          transform: [
            {
              translateX: positionAnimation.x,
            },
            {
              translateY: positionAnimation.y,
            },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Main Action Button */}
      <Animated.View
        style={[
          styles.mainButton,
          {
            transform: [
              {
                scale: scaleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
              {
                rotate: scaleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView style={styles.blurView} blurType="light">
            <TouchableOpacity
              style={styles.mainButtonTouchable}
              onPress={onClose}
              accessibilityLabel="Close actions"
              accessibilityRole="button"
            >
              <Icon name="close" size={28} color="#374151" />
            </TouchableOpacity>
          </BlurView>
        ) : (
          <TouchableOpacity
            style={[styles.mainButtonTouchable, styles.androidMainButton]}
            onPress={onClose}
            accessibilityLabel="Close actions"
            accessibilityRole="button"
          >
            <Icon name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Action Buttons */}
      {actions.slice(0, maxActions).map(renderActionButton)}

      {/* Overflow Indicator */}
      {actions.length > maxActions && (
        <Animated.View
          style={[
            styles.overflowIndicator,
            {
              opacity: scaleAnimation,
            },
          ]}
        >
          <Text style={styles.overflowText}>+{actions.length - maxActions}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  blurView: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  mainButtonTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidMainButton: {
    backgroundColor: '#374151',
    borderRadius: 28,
  },
  actionButton: {
    position: 'absolute',
    borderRadius: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  actionLabel: {
    position: 'absolute',
    top: '50%',
    left: -120,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: -12,
  },
  actionLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  overflowIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overflowText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});