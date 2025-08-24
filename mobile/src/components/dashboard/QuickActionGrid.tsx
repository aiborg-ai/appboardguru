/**
 * Quick Action Grid Component
 * Dashboard component for quick access to governance functions
 * Optimized for mobile touch interactions with accessibility support
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';
import { navigationService } from '../../navigation/NavigationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 16;
const GRID_COLUMNS = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_SPACING * 3)) / GRID_COLUMNS;

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
  badge?: number;
  disabled?: boolean;
  requiresOnline?: boolean;
}

interface QuickActionGridProps {
  actions?: QuickAction[];
  onActionPress?: (actionId: string) => void;
  testID?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'create-meeting',
    title: 'Schedule Meeting',
    subtitle: 'Plan board meeting',
    icon: 'calendar-plus',
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
    onPress: () => navigationService.navigate('CreateMeeting'),
    requiresOnline: true,
  },
  {
    id: 'upload-document',
    title: 'Upload Document',
    subtitle: 'Add board pack',
    icon: 'file-upload',
    color: '#FFFFFF',
    backgroundColor: '#10B981',
    onPress: () => navigationService.navigate('UploadDocument'),
    requiresOnline: true,
  },
  {
    id: 'quick-vote',
    title: 'Quick Vote',
    subtitle: 'Cast your vote',
    icon: 'vote',
    color: '#FFFFFF',
    backgroundColor: '#8B5CF6',
    onPress: () => navigationService.navigate('QuickVote'),
  },
  {
    id: 'emergency-contact',
    title: 'Emergency Contact',
    subtitle: 'Urgent matters',
    icon: 'phone-alert',
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    onPress: () => navigationService.navigate('EmergencyContact'),
    requiresOnline: true,
  },
];

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  actions = DEFAULT_ACTIONS,
  onActionPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Handle action press with haptic feedback
  const handleActionPress = useCallback(async (action: QuickAction) => {
    if (action.disabled) return;
    
    await hapticFeedback('light');
    
    onActionPress?.(action.id);
    action.onPress();
  }, [onActionPress]);

  // Render individual action item
  const renderActionItem = useCallback((action: QuickAction, index: number) => {
    const pressAnimation = useSharedValue(0);
    const scaleAnimation = useSharedValue(1);

    const handlePressIn = () => {
      pressAnimation.value = withSpring(1, { damping: 15, stiffness: 300 });
      scaleAnimation.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
      pressAnimation.value = withSpring(0, { damping: 15, stiffness: 300 });
      scaleAnimation.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const animatedStyle = useAnimatedStyle(() => {
      const scale = scaleAnimation.value;
      const opacity = interpolate(
        pressAnimation.value,
        [0, 1],
        [1, 0.9]
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <Animated.View key={action.id} style={[styles.actionItem, animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: action.backgroundColor,
              width: ITEM_WIDTH,
            },
            action.disabled && styles.actionDisabled,
          ]}
          onPress={() => handleActionPress(action)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={action.disabled}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`${action.title}: ${action.subtitle}`}
          accessibilityHint={action.disabled ? 'This action is currently disabled' : undefined}
          accessibilityState={{
            disabled: action.disabled,
          }}
          testID={`${testID}-action-${action.id}`}
        >
          {/* Badge */}
          {action.badge && action.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {action.badge > 99 ? '99+' : action.badge.toString()}
              </Text>
            </View>
          )}

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon
              name={action.icon}
              size={28}
              color={action.color}
              accessibilityLabel={`${action.icon} icon`}
            />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text 
              style={[styles.actionTitle, { color: action.color }]}
              numberOfLines={1}
            >
              {action.title}
            </Text>
            <Text 
              style={[styles.actionSubtitle, { color: action.color, opacity: 0.8 }]}
              numberOfLines={1}
            >
              {action.subtitle}
            </Text>
          </View>

          {/* Online indicator */}
          {action.requiresOnline && (
            <View style={styles.onlineIndicator}>
              <Icon
                name="wifi"
                size={12}
                color={action.color}
                style={{ opacity: 0.7 }}
              />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleActionPress, testID]);

  return (
    <View 
      style={[styles.container, isDark && styles.containerDark]}
      testID={testID}
      accessibilityRole="grid"
      accessibilityLabel="Quick actions grid"
    >
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
        Quick Actions
      </Text>
      
      <View style={styles.grid}>
        {actions.map((action, index) => renderActionItem(action, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  containerDark: {
    // Dark theme specific styles
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleDark: {
    color: '#F9FAFB',
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: GRID_SPACING,
  },
  
  actionItem: {
    marginBottom: GRID_SPACING,
  },
  
  actionButton: {
    padding: 20,
    borderRadius: 16,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  
  actionDisabled: {
    opacity: 0.5,
  },
  
  // Badge styles
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  
  // Icon container
  iconContainer: {
    marginBottom: 12,
  },
  
  // Text content
  textContainer: {
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  
  // Online indicator
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
});