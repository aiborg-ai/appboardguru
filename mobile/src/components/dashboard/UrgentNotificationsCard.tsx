/**
 * Urgent Notifications Card Component
 * Dashboard component for high-priority governance notifications
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  created_at: number;
  action_url?: string;
  action_data?: string;
}

interface UrgentNotificationsCardProps {
  notifications: Notification[];
  onNotificationPress?: (notification: Notification) => void;
  onViewAllPress?: () => void;
  testID?: string;
}

export const UrgentNotificationsCard: React.FC<UrgentNotificationsCardProps> = ({
  notifications,
  onNotificationPress,
  onViewAllPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Handle notification press
  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!onNotificationPress) return;
    
    await hapticFeedback('light');
    onNotificationPress(notification);
  }, [onNotificationPress]);

  // Get notification icon based on type and category
  const getNotificationIcon = useCallback((notification: Notification) => {
    switch (notification.type.toLowerCase()) {
      case 'meeting':
        return 'calendar-alert';
      case 'document':
        return 'file-alert';
      case 'voting':
        return 'vote';
      case 'approval':
        return 'check-circle';
      case 'security':
        return 'shield-alert';
      case 'system':
        return 'cog-alert';
      default:
        return 'bell-alert';
    }
  }, []);

  // Get priority color
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  }, []);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  // Render individual notification item
  const renderNotificationItem = useCallback((notification: Notification, index: number) => {
    const priorityColor = getPriorityColor(notification.priority);
    const icon = getNotificationIcon(notification);

    return (
      <TouchableOpacity
        key={notification.notification_id}
        style={[
          styles.notificationItem,
          isDark && styles.notificationItemDark,
          index > 0 && styles.notificationItemBorder,
        ]}
        onPress={() => handleNotificationPress(notification)}
        accessibilityRole="button"
        accessibilityLabel={`${notification.priority} priority notification: ${notification.title}`}
        accessibilityHint={notification.message}
        testID={`${testID}-notification-${notification.notification_id}`}
      >
        {/* Priority Indicator */}
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />

        {/* Icon */}
        <View 
          style={[
            styles.notificationIcon,
            { backgroundColor: priorityColor + '20' },
          ]}
        >
          <Icon
            name={icon}
            size={18}
            color={priorityColor}
          />
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text 
              style={[styles.notificationTitle, isDark && styles.notificationTitleDark]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            
            <Text style={[styles.notificationTime, isDark && styles.notificationTimeDark]}>
              {formatRelativeTime(notification.created_at)}
            </Text>
          </View>

          <Text 
            style={[styles.notificationMessage, isDark && styles.notificationMessageDark]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          {/* Category and Type */}
          <View style={styles.notificationTags}>
            <View style={[styles.tag, { backgroundColor: priorityColor + '15' }]}>
              <Text style={[styles.tagText, { color: priorityColor }]}>
                {notification.category}
              </Text>
            </View>
            
            {notification.priority === 'critical' && (
              <View style={[styles.tag, styles.criticalTag]}>
                <Text style={styles.criticalTagText}>
                  {notification.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Arrow */}
        <Icon
          name="chevron-right"
          size={20}
          color={isDark ? '#6B7280' : '#9CA3AF'}
          style={styles.actionArrow}
        />
      </TouchableOpacity>
    );
  }, [
    getPriorityColor,
    getNotificationIcon,
    formatRelativeTime,
    handleNotificationPress,
    isDark,
    testID,
  ]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <MobileCard
      variant="elevated"
      padding="large"
      priority="high"
      testID={testID}
      accessibilityRole="group"
      accessibilityLabel="Urgent notifications"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Urgent Notifications
          </Text>
          <Text style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}>
            {notifications.length} items need attention
          </Text>
        </View>
        
        <View style={styles.headerIcon}>
          <Icon
            name="bell-alert"
            size={24}
            color="#F59E0B"
          />
          {notifications.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {notifications.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <View style={styles.notificationsList}>
        {notifications.map((notification, index) => renderNotificationItem(notification, index))}
      </View>

      {/* View All Button */}
      {onViewAllPress && (
        <MobileButton
          title="View All Notifications"
          variant="outline"
          size="medium"
          onPress={onViewAllPress}
          icon="bell-outline"
          style={styles.viewAllButton}
          testID={`${testID}-view-all`}
        />
      )}
    </MobileCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  headerIcon: {
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
  },
  cardTitleDark: {
    color: '#F9FAFB',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  cardSubtitleDark: {
    color: '#9CA3AF',
  },

  notificationsList: {
    gap: 0,
  },

  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    position: 'relative',
  },
  notificationItemDark: {
    // Dark theme specific styles if needed
  },
  notificationItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 16,
  },

  priorityIndicator: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
  },

  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 8,
  },

  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 20,
  },
  notificationTitleDark: {
    color: '#F9FAFB',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  notificationTimeDark: {
    color: '#9CA3AF',
  },

  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationMessageDark: {
    color: '#9CA3AF',
  },

  notificationTags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  criticalTag: {
    backgroundColor: '#DC2626',
  },
  criticalTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  actionArrow: {
    marginLeft: 8,
    marginTop: 4,
  },

  viewAllButton: {
    marginTop: 16,
  },
});