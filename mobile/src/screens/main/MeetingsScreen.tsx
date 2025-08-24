/**
 * Meetings Screen
 * Comprehensive meeting management with filtering and quick actions
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Lucide';

import type { ScreenProps } from '@/types/mobile';
import { COLORS, SPACING, TYPOGRAPHY } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/stores/themeStore';
import { navigationService } from '@/navigation/NavigationService';
import { createLogger } from '@/utils/logger';

// Import mobile repository
import { mobileMeetingRepository } from '@/services/repositories/MobileRepositoryAdapter';

// Import components
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { MeetingFilters } from '@/components/meetings/MeetingFilters';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchHeader } from '@/components/ui/SearchHeader';

const logger = createLogger('MeetingsScreen');

type MeetingFilter = 'all' | 'upcoming' | 'today' | 'this_week' | 'voting' | 'completed';
type MeetingSort = 'date_asc' | 'date_desc' | 'title' | 'status';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledDate: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingType: 'board' | 'committee' | 'general';
  location?: string;
  virtualLink?: string;
  isAttending: boolean;
  hasVotingItems: boolean;
  participantCount: number;
  agendaItemCount: number;
}

export const MeetingsScreen: React.FC<ScreenProps<'MainTabs'>> = ({ navigation }) => {
  const { user, session, updateLastActivity } = useAuthStore();
  const { theme, isDark } = useTheme();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MeetingFilter>('upcoming');
  const [sortBy, setSortBy] = useState<MeetingSort>('date_asc');
  const [showFilters, setShowFilters] = useState(false);

  // Load meetings
  const loadMeetings = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);

      if (!user || !session) {
        throw new Error('User not authenticated');
      }

      logger.info('Loading meetings', { userId: user.id, isRefresh });

      const result = await mobileMeetingRepository.findUpcoming(
        user.profile?.organization_id!
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      // Transform API data to Meeting type
      const transformedMeetings: Meeting[] = result.data.data.map((meeting: any) => ({
        id: meeting.meeting_id,
        title: meeting.title,
        description: meeting.description,
        scheduledDate: meeting.scheduled_date,
        status: meeting.status,
        meetingType: meeting.meeting_type,
        location: meeting.location,
        virtualLink: meeting.virtual_link,
        isAttending: meeting.is_attending,
        hasVotingItems: meeting.voting_items?.length > 0 || false,
        participantCount: meeting.participants?.length || 0,
        agendaItemCount: meeting.agenda_items?.length || 0,
      }));

      setMeetings(transformedMeetings);
      updateLastActivity();

      logger.info('Meetings loaded successfully', { 
        count: transformedMeetings.length 
      });
    } catch (error: any) {
      logger.error('Failed to load meetings', { error });
      setError(error.message || 'Failed to load meetings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, session, updateLastActivity]);

  // Filter and sort meetings
  const filteredAndSortedMeetings = useMemo(() => {
    let filtered = meetings.filter(meeting => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!meeting.title.toLowerCase().includes(query) &&
            !meeting.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      const now = Date.now();
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      switch (selectedFilter) {
        case 'upcoming':
          return meeting.scheduledDate > now && meeting.status === 'scheduled';
        case 'today':
          return meeting.scheduledDate >= dayStart.getTime() &&
                 meeting.scheduledDate < dayStart.getTime() + 24 * 60 * 60 * 1000;
        case 'this_week':
          return meeting.scheduledDate >= weekStart.getTime() &&
                 meeting.scheduledDate < weekStart.getTime() + 7 * 24 * 60 * 60 * 1000;
        case 'voting':
          return meeting.hasVotingItems && meeting.status !== 'completed';
        case 'completed':
          return meeting.status === 'completed';
        default:
          return true;
      }
    });

    // Sort meetings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return a.scheduledDate - b.scheduledDate;
        case 'date_desc':
          return b.scheduledDate - a.scheduledDate;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [meetings, searchQuery, selectedFilter, sortBy]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMeetings(true);
  }, [loadMeetings]);

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMeetings();
    }, [loadMeetings])
  );

  // Meeting actions
  const handleMeetingPress = useCallback((meeting: Meeting) => {
    navigationService.openMeeting(meeting.id);
  }, []);

  const handleJoinMeeting = useCallback(async (meeting: Meeting) => {
    if (meeting.virtualLink) {
      const success = await navigationService.openExternalUrl(meeting.virtualLink);
      if (!success) {
        Alert.alert(
          'Unable to Join',
          'Could not open the meeting link. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert(
        'No Virtual Link',
        'This meeting does not have a virtual meeting link configured.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleStartVoting = useCallback((meeting: Meeting) => {
    // Navigate to voting session
    navigationService.openVotingSession(meeting.id, 'current');
  }, []);

  const handleMarkAttendance = useCallback(async (meeting: Meeting, attending: boolean) => {
    try {
      // Update attendance status
      logger.info('Updating attendance', { meetingId: meeting.id, attending });
      
      // TODO: Implement attendance update API call
      // For now, just update local state
      setMeetings(prev => prev.map(m => 
        m.id === meeting.id ? { ...m, isAttending: attending } : m
      ));
    } catch (error) {
      logger.error('Failed to update attendance', { error, meetingId: meeting.id });
      Alert.alert('Error', 'Failed to update attendance. Please try again.');
    }
  }, []);

  // Filter helpers
  const getFilterLabel = (filter: MeetingFilter): string => {
    switch (filter) {
      case 'all': return 'All Meetings';
      case 'upcoming': return 'Upcoming';
      case 'today': return 'Today';
      case 'this_week': return 'This Week';
      case 'voting': return 'Voting Open';
      case 'completed': return 'Completed';
      default: return 'All Meetings';
    }
  };

  const getUrgentMeetingCount = (): number => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return meetings.filter(m => 
      m.scheduledDate <= now + oneHour && 
      m.scheduledDate > now &&
      m.status === 'scheduled'
    ).length;
  };

  // Render meeting item
  const renderMeeting = useCallback(({ item }: { item: Meeting }) => (
    <MeetingCard
      meeting={item}
      onPress={() => handleMeetingPress(item)}
      onJoinPress={() => handleJoinMeeting(item)}
      onVotePress={() => handleStartVoting(item)}
      onAttendanceChange={(attending) => handleMarkAttendance(item, attending)}
      showVotingBadge={item.hasVotingItems}
      showUrgentBadge={item.scheduledDate <= Date.now() + 60 * 60 * 1000}
    />
  ), [handleMeetingPress, handleJoinMeeting, handleStartVoting, handleMarkAttendance]);

  // Render empty state
  const renderEmptyState = () => {
    if (searchQuery) {
      return (
        <EmptyState
          icon="search"
          title="No meetings found"
          message={`No meetings match "${searchQuery}"`}
          actionText="Clear Search"
          onActionPress={() => setSearchQuery('')}
        />
      );
    }

    if (selectedFilter === 'voting') {
      return (
        <EmptyState
          icon="vote"
          title="No voting sessions"
          message="There are no meetings with active voting items at the moment."
        />
      );
    }

    if (selectedFilter === 'today') {
      return (
        <EmptyState
          icon="calendar"
          title="No meetings today"
          message="You have no meetings scheduled for today."
        />
      );
    }

    return (
      <EmptyState
        icon="calendar"
        title="No meetings scheduled"
        message="You have no upcoming meetings at the moment."
      />
    );
  };

  // Render loading state
  if (isLoading && meetings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading meetings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && meetings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <ErrorMessage
          error={error}
          onRetry={() => loadMeetings()}
        />
      </SafeAreaView>
    );
  }

  const urgentCount = getUrgentMeetingCount();

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? COLORS.dark.background : COLORS.background}
      />
      
      {/* Header with search and filters */}
      <SearchHeader
        title="Meetings"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFiltersPress={() => setShowFilters(!showFilters)}
        badgeCount={urgentCount}
        badgeText="urgent"
      />

      {/* Filters */}
      {showFilters && (
        <MeetingFilters
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          meetingCounts={{
            all: meetings.length,
            upcoming: meetings.filter(m => m.scheduledDate > Date.now()).length,
            today: meetings.filter(m => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              return m.scheduledDate >= today.getTime() && m.scheduledDate < tomorrow.getTime();
            }).length,
            voting: meetings.filter(m => m.hasVotingItems).length,
            completed: meetings.filter(m => m.status === 'completed').length,
          }}
        />
      )}

      {/* Active filter indicator */}
      <View style={[styles.filterIndicator, isDark && styles.filterIndicatorDark]}>
        <Text style={[styles.filterText, isDark && styles.filterTextDark]}>
          {getFilterLabel(selectedFilter)} ({filteredAndSortedMeetings.length})
        </Text>
        {selectedFilter !== 'upcoming' && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedFilter('upcoming')}
          >
            <Icon name="x" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Meetings list */}
      <FlatList
        data={filteredAndSortedMeetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedMeetings.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Floating action button for quick meeting creation */}
      <FloatingActionButton
        icon="plus"
        onPress={() => {
          // TODO: Navigate to create meeting screen
          Alert.alert('Coming Soon', 'Meeting creation will be available soon.');
        }}
        style={styles.fab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  containerDark: {
    backgroundColor: COLORS.dark.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  loadingTextDark: {
    color: COLORS.dark.textSecondary,
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterIndicatorDark: {
    backgroundColor: COLORS.dark.surface,
    borderBottomColor: COLORS.dark.border,
  },
  filterText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  filterTextDark: {
    color: COLORS.dark.textSecondary,
  },
  clearFilterButton: {
    padding: SPACING.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: SPACING.md,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING['2xl'],
    right: SPACING.lg,
  },
});

export default MeetingsScreen;