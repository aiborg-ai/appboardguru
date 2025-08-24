/**
 * Voting Alerts Card Component
 * Dashboard component for urgent voting items requiring attention
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

interface VotingAlert {
  meeting_id: string;
  title: string;
  scheduled_date: number;
  status: string;
  voting_items?: string;
  user_votes?: string;
}

interface VotingAlertsCardProps {
  alerts: VotingAlert[];
  onVotePress?: (meetingId: string, sessionId: string) => void;
  onMeetingPress?: (meetingId: string) => void;
  testID?: string;
}

export const VotingAlertsCard: React.FC<VotingAlertsCardProps> = ({
  alerts,
  onVotePress,
  onMeetingPress,
  testID,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Handle vote button press
  const handleVotePress = useCallback(async (meetingId: string) => {
    if (!onVotePress) return;
    
    await hapticFeedback('medium');
    // Generate session ID for voting (in real app, this would come from the meeting data)
    const sessionId = `session-${Date.now()}`;
    onVotePress(meetingId, sessionId);
  }, [onVotePress]);

  // Handle meeting press
  const handleMeetingPress = useCallback(async (meetingId: string) => {
    if (!onMeetingPress) return;
    
    await hapticFeedback('light');
    onMeetingPress(meetingId);
  }, [onMeetingPress]);

  // Get voting urgency
  const getVotingUrgency = useCallback((alert: VotingAlert) => {
    const hoursUntilMeeting = (alert.scheduled_date - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilMeeting <= 1) return 'critical';
    if (hoursUntilMeeting <= 6) return 'high';
    if (hoursUntilMeeting <= 24) return 'medium';
    return 'low';
  }, []);

  // Format time until voting deadline
  const formatTimeUntilDeadline = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff <= 0) return 'Voting closed';
    if (hours < 1) return `${minutes}m remaining`;
    if (hours < 24) return `${hours}h ${minutes}m remaining`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }, []);

  // Get voting completion status
  const getVotingStatus = useCallback((alert: VotingAlert) => {
    const votingItems = alert.voting_items ? JSON.parse(alert.voting_items) : [];
    const userVotes = alert.user_votes ? JSON.parse(alert.user_votes) : {};
    
    const totalItems = votingItems.length;
    const completedVotes = Object.keys(userVotes).length;
    
    return {
      total: totalItems,
      completed: completedVotes,
      remaining: totalItems - completedVotes,
      percentage: totalItems > 0 ? (completedVotes / totalItems) * 100 : 0,
    };
  }, []);

  // Render individual voting alert
  const renderVotingAlert = useCallback((alert: VotingAlert, index: number) => {
    const urgency = getVotingUrgency(alert);
    const votingStatus = getVotingStatus(alert);
    const timeRemaining = formatTimeUntilDeadline(alert.scheduled_date);
    const isUrgent = urgency === 'critical' || urgency === 'high';

    return (
      <View
        key={alert.meeting_id}
        style={[
          styles.alertItem,
          isDark && styles.alertItemDark,
          index > 0 && styles.alertItemBorder,
          isUrgent && styles.alertItemUrgent,
        ]}
      >
        {/* Urgency Indicator */}
        <View 
          style={[
            styles.urgencyIndicator,
            { backgroundColor: isUrgent ? '#DC2626' : '#F59E0B' },
          ]}
        />

        {/* Alert Content */}
        <View style={styles.alertContent}>
          {/* Header */}
          <View style={styles.alertHeader}>
            <View style={styles.alertTitleContainer}>
              <Text 
                style={[styles.alertTitle, isDark && styles.alertTitleDark]}
                numberOfLines={1}
              >
                {alert.title}
              </Text>
              
              {isUrgent && (
                <View style={styles.urgentBadge}>
                  <Icon name="alert-circle" size={12} color="#FFFFFF" />
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
            </View>
          </View>

          {/* Time Remaining */}
          <Text style={[styles.timeRemaining, isUrgent && styles.timeRemainingUrgent]}>
            {timeRemaining}
          </Text>

          {/* Voting Progress */}
          <View style={styles.votingProgress}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, isDark && styles.progressTextDark]}>
                Voting Progress
              </Text>
              <Text style={[styles.progressCount, isDark && styles.progressCountDark]}>
                {votingStatus.completed}/{votingStatus.total}
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${votingStatus.percentage}%`,
                    backgroundColor: votingStatus.percentage === 100 ? '#10B981' : '#3B82F6',
                  },
                ]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {votingStatus.remaining > 0 ? (
              <MobileButton
                title={`Vote Now (${votingStatus.remaining} items)`}
                variant="primary"
                size="medium"
                onPress={() => handleVotePress(alert.meeting_id)}
                icon="vote"
                hapticType="medium"
                style={styles.voteButton}
                testID={`${testID}-vote-${alert.meeting_id}`}
              />
            ) : (
              <MobileButton
                title="All Votes Complete"
                variant="success"
                size="medium"
                disabled
                icon="check-circle"
                style={styles.voteButton}
              />
            )}
            
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => handleMeetingPress(alert.meeting_id)}
              accessibilityRole="button"
              accessibilityLabel="View meeting details"
              testID={`${testID}-details-${alert.meeting_id}`}
            >
              <Text style={[styles.detailsText, isDark && styles.detailsTextDark]}>
                Details
              </Text>
              <Icon
                name="information-outline"
                size={16}
                color={isDark ? '#60A5FA' : '#3B82F6'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [
    getVotingUrgency,
    getVotingStatus,
    formatTimeUntilDeadline,
    handleVotePress,
    handleMeetingPress,
    isDark,
    testID,
  ]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <MobileCard
      variant="elevated"
      padding="large"
      priority="critical"
      testID={testID}
      accessibilityRole="group"
      accessibilityLabel="Voting alerts"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Voting Required
          </Text>
          <Text style={[styles.cardSubtitle, isDark && styles.cardSubtitleDark]}>
            {alerts.length} meeting{alerts.length !== 1 ? 's' : ''} need your vote
          </Text>
        </View>
        
        <View style={styles.headerIcon}>
          <Icon
            name="vote"
            size={24}
            color="#8B5CF6"
          />
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {alerts.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Voting Alerts List */}
      <View style={styles.alertsList}>
        {alerts.map((alert, index) => renderVotingAlert(alert, index))}
      </View>
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
    backgroundColor: '#8B5CF6',
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

  alertsList: {
    gap: 16,
  },

  alertItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alertItemDark: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  alertItemBorder: {
    // No additional border needed as each item has its own background
  },
  alertItemUrgent: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },

  urgencyIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  alertContent: {
    marginTop: 4,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    lineHeight: 20,
  },
  alertTitleDark: {
    color: '#F9FAFB',
  },

  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  timeRemaining: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 12,
  },
  timeRemainingUrgent: {
    color: '#DC2626',
  },

  votingProgress: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  progressTextDark: {
    color: '#9CA3AF',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  progressCountDark: {
    color: '#F9FAFB',
  },

  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarDark: {
    backgroundColor: '#4B5563',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  voteButton: {
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
    color: '#3B82F6',
  },
  detailsTextDark: {
    color: '#60A5FA',
  },
});