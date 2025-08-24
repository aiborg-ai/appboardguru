/**
 * Quick Stats Card Component
 * Dashboard overview stats with actionable insights for governance
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
import { useThemeStore } from '../../stores/themeStore';
import { hapticFeedback } from '../../utils/haptics';

interface QuickStats {
  totalMeetings: number;
  unreadNotifications: number;
  pendingVotes: number;
  documentsToReview: number;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  backgroundColor: string;
  onPress?: () => void;
}

interface QuickStatsCardProps {
  stats: QuickStats;
  onMeetingsPress?: () => void;
  onNotificationsPress?: () => void;
  onDocumentsPress?: () => void;
  onVotesPress?: () => void;
  testID?: string;
}

export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  stats,
  onMeetingsPress,
  onNotificationsPress,
  onDocumentsPress,
  onVotesPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Create stat items with actions
  const statItems: StatItem[] = [
    {
      id: 'meetings',
      label: 'Meetings',
      value: stats.totalMeetings,
      icon: 'calendar-outline',
      color: '#3B82F6',
      backgroundColor: isDark ? '#1E3A8A20' : '#DBEAFE',
      onPress: onMeetingsPress,
    },
    {
      id: 'notifications',
      label: 'Alerts',
      value: stats.unreadNotifications,
      icon: 'bell-outline',
      color: '#F59E0B',
      backgroundColor: isDark ? '#92400E20' : '#FEF3C7',
      onPress: onNotificationsPress,
    },
    {
      id: 'votes',
      label: 'Votes',
      value: stats.pendingVotes,
      icon: 'vote-outline',
      color: '#8B5CF6',
      backgroundColor: isDark ? '#6B21A820' : '#EDE9FE',
      onPress: onVotesPress,
    },
    {
      id: 'documents',
      label: 'To Review',
      value: stats.documentsToReview,
      icon: 'file-document-outline',
      color: '#10B981',
      backgroundColor: isDark ? '#047857A20' : '#D1FAE5',
      onPress: onDocumentsPress,
    },
  ];

  // Handle stat item press
  const handleStatPress = useCallback(async (statItem: StatItem) => {
    if (!statItem.onPress) return;
    
    await hapticFeedback('light');
    statItem.onPress();
  }, []);

  // Render individual stat item
  const renderStatItem = useCallback((statItem: StatItem) => {
    const isActionable = !!statItem.onPress;
    const hasAlert = statItem.value > 0;

    const StatWrapper = isActionable ? TouchableOpacity : View;
    const wrapperProps = isActionable ? {
      onPress: () => handleStatPress(statItem),
      activeOpacity: 0.7,
      accessibilityRole: 'button' as const,
      accessibilityLabel: `${statItem.label}: ${statItem.value} items`,
      accessibilityHint: hasAlert ? 'Tap to view items' : undefined,
    } : {};

    return (
      <StatWrapper
        key={statItem.id}
        style={[
          styles.statItem,
          isActionable && styles.statItemPressable,
        ]}
        testID={`${testID}-stat-${statItem.id}`}
        {...wrapperProps}
      >
        {/* Icon Container */}
        <View 
          style={[
            styles.iconContainer,
            { backgroundColor: statItem.backgroundColor },
          ]}
        >
          <Icon
            name={statItem.icon}
            size={24}
            color={statItem.color}
            accessibilityLabel={`${statItem.icon} icon`}
          />
          
          {/* Alert Badge */}
          {hasAlert && statItem.id !== 'meetings' && (
            <View style={[styles.alertBadge, { backgroundColor: statItem.color }]}>
              <View style={styles.alertDot} />
            </View>
          )}
        </View>

        {/* Value */}
        <Text 
          style={[
            styles.statValue,
            isDark && styles.statValueDark,
            hasAlert && styles.statValueAlert,
          ]}
        >
          {statItem.value}
        </Text>

        {/* Label */}
        <Text 
          style={[
            styles.statLabel,
            isDark && styles.statLabelDark,
          ]}
          numberOfLines={1}
        >
          {statItem.label}
        </Text>

        {/* Action Indicator */}
        {isActionable && (
          <Icon
            name="chevron-right"
            size={16}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            style={styles.actionIndicator}
          />
        )}
      </StatWrapper>
    );
  }, [handleStatPress, isDark, testID]);

  return (
    <MobileCard
      variant="elevated"
      padding="large"
      testID={testID}
      accessibilityRole="group"
      accessibilityLabel="Quick statistics overview"
    >
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Overview
        </Text>
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
          Your governance dashboard
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {statItems.map(renderStatItem)}
      </View>
    </MobileCard>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  subtitleDark: {
    color: '#9CA3AF',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  statItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    minHeight: 100,
  },
  statItemPressable: {
    borderWidth: 1,
    borderColor: 'transparent',
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },

  alertBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 28,
  },
  statValueDark: {
    color: '#F9FAFB',
  },
  statValueAlert: {
    color: '#DC2626',
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  statLabelDark: {
    color: '#9CA3AF',
  },

  actionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});