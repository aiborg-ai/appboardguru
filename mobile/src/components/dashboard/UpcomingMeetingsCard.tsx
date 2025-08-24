/**
 * Upcoming Meetings Card Component
 * Dashboard component showing prioritized upcoming governance meetings
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

interface Meeting {
  meeting_id: string;
  title: string;
  scheduled_date: number;
  duration_minutes?: number;
  meeting_type: string;
  status: string;
  participants?: string;
  voting_items?: string;
  location?: string;
  virtual_link?: string;
}

interface UpcomingMeetingsCardProps {
  meetings: Meeting[];
  onMeetingPress?: (meetingId: string) => void;
  onViewAllPress?: () => void;
  testID?: string;
}

export const UpcomingMeetingsCard: React.FC<UpcomingMeetingsCardProps> = ({
  meetings,
  onMeetingPress,
  onViewAllPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Handle meeting press
  const handleMeetingPress = useCallback(async (meetingId: string) => {
    if (!onMeetingPress) return;
    
    await hapticFeedback('light');
    onMeetingPress(meetingId);
  }, [onMeetingPress]);

  // Format meeting date
  const formatMeetingDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get meeting urgency level
  const getMeetingUrgency = useCallback((meeting: Meeting) => {
    const hoursUntilMeeting = (meeting.scheduled_date - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilMeeting <= 2) return 'critical';
    if (hoursUntilMeeting <= 24) return 'high';
    if (hoursUntilMeeting <= 72) return 'medium';
    return 'low';
  }, []);

  // Get meeting type icon
  const getMeetingTypeIcon = useCallback((meetingType: string) => {
    switch (meetingType.toLowerCase()) {
      case 'board': return 'account-group';
      case 'committee': return 'account-multiple';
      case 'emergency': return 'alert-circle';
      case 'quarterly': return 'calendar-clock';
      case 'annual': return 'calendar-star';
      default: return 'calendar';
    }
  }, []);

  // Get urgency color
  const getUrgencyColor = useCallback((urgency: string) => {
    switch (urgency) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  }, []);

  // Render individual meeting item
  const renderMeetingItem = useCallback((meeting: Meeting, index: number) => {
    const urgency = getMeetingUrgency(meeting);
    const urgencyColor = getUrgencyColor(urgency);
    const hasVoting = meeting.voting_items && JSON.parse(meeting.voting_items).length > 0;
    const participantCount = meeting.participants ? JSON.parse(meeting.participants).length : 0;

    return (
      <TouchableOpacity
        key={meeting.meeting_id}
        style={[
          styles.meetingItem,
          isDark && styles.meetingItemDark,
          index > 0 && styles.meetingItemBorder,
        ]}
        onPress={() => handleMeetingPress(meeting.meeting_id)}
        accessibilityRole="button"
        accessibilityLabel={`Meeting: ${meeting.title}, ${formatMeetingDate(meeting.scheduled_date)}`}
        testID={`${testID}-meeting-${meeting.meeting_id}`}
      >
        {/* Meeting Type Icon */}
        <View 
          style={[
            styles.meetingIcon,
            { backgroundColor: urgencyColor + '20' },
          ]}
        >
          <Icon
            name={getMeetingTypeIcon(meeting.meeting_type)}
            size={20}
            color={urgencyColor}
          />
        </View>

        {/* Meeting Details */}
        <View style={styles.meetingDetails}>
          <View style={styles.meetingHeader}>
            <Text 
              style={[styles.meetingTitle, isDark && styles.meetingTitleDark]}
              numberOfLines={1}
            >
              {meeting.title}
            </Text>
            
            {/* Urgency Indicator */}
            {urgency === 'critical' && (
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                <Text style={styles.urgencyText}>URGENT</Text>
              </View>
            )}
          </View>

          <Text style={[styles.meetingTime, isDark && styles.meetingTimeDark]}>
            {formatMeetingDate(meeting.scheduled_date)}
          </Text>

          {/* Meeting Meta */}
          <View style={styles.meetingMeta}>
            {/* Duration */}
            {meeting.duration_minutes && (
              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
                  {meeting.duration_minutes}m
                </Text>
              </View>
            )}

            {/* Participants */}
            {participantCount > 0 && (
              <View style={styles.metaItem}>
                <Icon name="account-multiple" size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
                  {participantCount}
                </Text>
              </View>
            )}

            {/* Voting Indicator */}
            {hasVoting && (
              <View style={styles.metaItem}>
                <Icon name="vote" size={12} color="#8B5CF6" />
                <Text style={[styles.metaText, { color: '#8B5CF6' }]}>
                  Voting
                </Text>
              </View>
            )}

            {/* Virtual Meeting */}
            {meeting.virtual_link && (
              <View style={styles.metaItem}>
                <Icon name="video" size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
                  Virtual
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
    getMeetingUrgency,
    getUrgencyColor,
    getMeetingTypeIcon,
    formatMeetingDate,
    handleMeetingPress,
    isDark,
    testID,
  ]);

  // Show only the next 3 meetings
  const displayMeetings = meetings.slice(0, 3);

  return (
    <MobileCard
      variant="default"
      padding="large"
      testID={testID}
      accessibilityRole="group"
      accessibilityLabel="Upcoming meetings"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Upcoming Meetings
          </Text>
          <Text style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}>
            Next {displayMeetings.length} scheduled
          </Text>
        </View>
        
        <Icon
          name="calendar-outline"
          size={24}
          color={isDark ? '#60A5FA' : '#3B82F6'}
        />
      </View>

      {/* Meetings List */}
      <View style={styles.meetingsList}>
        {displayMeetings.map((meeting, index) => renderMeetingItem(meeting, index))}
      </View>

      {/* View All Button */}
      {meetings.length > 3 && onViewAllPress && (
        <MobileButton
          title={`View All ${meetings.length} Meetings`}
          variant="ghost"
          size="medium"
          onPress={onViewAllPress}
          icon="calendar-month"
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

  meetingsList: {
    gap: 0,
  },

  meetingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  meetingItemDark: {
    // Dark theme specific styles if needed
  },
  meetingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 16,
  },

  meetingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  meetingDetails: {
    flex: 1,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 20,
  },
  meetingTitleDark: {
    color: '#F9FAFB',
  },

  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  meetingTime: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 6,
    lineHeight: 18,
  },
  meetingTimeDark: {
    color: '#60A5FA',
  },

  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaTextDark: {
    color: '#9CA3AF',
  },

  actionArrow: {
    marginLeft: 8,
  },

  viewAllButton: {
    marginTop: 16,
  },
});