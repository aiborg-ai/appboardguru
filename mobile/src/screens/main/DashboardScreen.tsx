/**
 * Dashboard Screen
 * Executive overview of governance activities and urgent items
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Lucide';

import type { ScreenProps } from '@/types/mobile';
import { COLORS, SPACING, TYPOGRAPHY, SCREEN_CONSTANTS } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/stores/themeStore';
import { navigationService } from '@/navigation/NavigationService';
import { createLogger } from '@/utils/logger';

// Import mobile repository adapters
import { 
  mobileMeetingRepository,
  mobileAssetRepository,
  mobileNotificationRepository,
} from '@/services/repositories/MobileRepositoryAdapter';

// Import components
import { QuickActionGrid } from '@/components/dashboard/QuickActionGrid';
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard';
import { UpcomingMeetingsCard } from '@/components/dashboard/UpcomingMeetingsCard';
import { UrgentNotificationsCard } from '@/components/dashboard/UrgentNotificationsCard';
import { RecentAssetsCard } from '@/components/dashboard/RecentAssetsCard';
import { VotingAlertsCard } from '@/components/dashboard/VotingAlertsCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

const logger = createLogger('DashboardScreen');

interface DashboardData {
  upcomingMeetings: any[];
  urgentNotifications: any[];
  recentAssets: any[];
  votingAlerts: any[];
  quickStats: {
    totalMeetings: number;
    unreadNotifications: number;
    pendingVotes: number;
    documentsToReview: number;
  };
}

export const DashboardScreen: React.FC<ScreenProps<'MainTabs'>> = ({ navigation }) => {
  const { user, session, updateLastActivity } = useAuthStore();
  const { theme, isDark } = useTheme();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(null);

      if (!user || !session) {
        throw new Error('User not authenticated');
      }

      logger.info('Loading dashboard data', { userId: user.id, isRefresh });

      // Load data from repositories in parallel
      const [
        upcomingMeetingsResult,
        urgentNotificationsResult,
        recentAssetsResult,
      ] = await Promise.all([
        mobileMeetingRepository.findUpcoming(user.profile?.organization_id!),
        mobileNotificationRepository.findUnread(user.id),
        mobileAssetRepository.findByVault(user.profile?.primary_vault_id!), // Most recent
      ]);

      // Process results
      const upcomingMeetings = upcomingMeetingsResult.success ? 
        upcomingMeetingsResult.data.data : [];
      
      const urgentNotifications = urgentNotificationsResult.success ? 
        urgentNotificationsResult.data.data.filter((n: any) => 
          n.priority === 'high' || n.priority === 'critical'
        ).slice(0, 3) : [];
      
      const recentAssets = recentAssetsResult.success ? 
        recentAssetsResult.data.data.slice(0, 5) : [];

      // Extract voting alerts from meetings
      const votingAlerts = upcomingMeetings.filter((meeting: any) => 
        meeting.status === 'voting_open' || 
        (meeting.voting_items && meeting.voting_items.length > 0)
      );

      // Calculate quick stats
      const quickStats = {
        totalMeetings: upcomingMeetings.length,
        unreadNotifications: urgentNotificationsResult.success ? 
          urgentNotificationsResult.data.data.length : 0,
        pendingVotes: votingAlerts.length,
        documentsToReview: recentAssets.filter((asset: any) => 
          !asset.last_viewed || 
          new Date(asset.updated_at) > new Date(asset.last_viewed)
        ).length,
      };

      const data: DashboardData = {
        upcomingMeetings,
        urgentNotifications,
        recentAssets,
        votingAlerts,
        quickStats,
      };

      setDashboardData(data);
      
      // Update last activity
      updateLastActivity();
      
      logger.info('Dashboard data loaded successfully', { 
        meetings: upcomingMeetings.length,
        notifications: urgentNotifications.length,
        assets: recentAssets.length,
      });
    } catch (error: any) {
      logger.error('Failed to load dashboard data', { error });
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, session, updateLastActivity]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Navigation handlers
  const handleMeetingPress = useCallback((meetingId: string) => {
    navigationService.openMeeting(meetingId);
  }, []);

  const handleAssetPress = useCallback((assetId: string, vaultId?: string) => {
    navigationService.openDocument(assetId, vaultId);
  }, []);

  const handleVotingPress = useCallback((meetingId: string, sessionId: string) => {
    navigationService.openVotingSession(meetingId, sessionId);
  }, []);

  const handleNotificationPress = useCallback((notification: any) => {
    // Handle notification action based on type
    if (notification.action_url) {
      const actionData = notification.action_data ? 
        JSON.parse(notification.action_data) : {};
      
      switch (notification.type) {
        case 'meeting':
          navigationService.openMeeting(actionData.meetingId);
          break;
        case 'document':
          navigationService.openDocument(actionData.assetId, actionData.vaultId);
          break;
        case 'voting':
          navigationService.openVotingSession(actionData.meetingId, actionData.sessionId);
          break;
        default:
          navigationService.jumpToTab('Notifications');
      }
    } else {
      navigationService.jumpToTab('Notifications');
    }
  }, []);

  // Quick action handlers
  const handleViewAllMeetings = useCallback(() => {
    navigationService.jumpToTab('Meetings');
  }, []);

  const handleViewAllDocuments = useCallback(() => {
    navigationService.jumpToTab('Documents');
  }, []);

  const handleViewAllNotifications = useCallback(() => {
    navigationService.jumpToTab('Notifications');
  }, []);

  // Render loading state
  if (isLoading && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <ErrorMessage
          error={error}
          onRetry={() => loadDashboardData()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? COLORS.dark.background : COLORS.background}
      />
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, isDark && styles.greetingDark]}>
              Good {getTimeOfDayGreeting()}, {user?.full_name?.split(' ')[0] || 'Director'}
            </Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              {user?.profile?.organization_name || 'BoardGuru'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigationService.jumpToTab('Profile')}
          >
            <Icon 
              name="user" 
              size={24} 
              color={isDark ? COLORS.dark.text : COLORS.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Action Grid */}
        <QuickActionGrid testID="dashboard-quick-actions" />

        {/* Quick Stats */}
        {dashboardData?.quickStats && (
          <QuickStatsCard
            stats={dashboardData.quickStats}
            onMeetingsPress={handleViewAllMeetings}
            onNotificationsPress={handleViewAllNotifications}
            onDocumentsPress={handleViewAllDocuments}
          />
        )}

        {/* Voting Alerts - Highest Priority */}
        {dashboardData?.votingAlerts && dashboardData.votingAlerts.length > 0 && (
          <VotingAlertsCard
            alerts={dashboardData.votingAlerts}
            onVotePress={handleVotingPress}
            onMeetingPress={handleMeetingPress}
          />
        )}

        {/* Urgent Notifications */}
        {dashboardData?.urgentNotifications && dashboardData.urgentNotifications.length > 0 && (
          <UrgentNotificationsCard
            notifications={dashboardData.urgentNotifications}
            onNotificationPress={handleNotificationPress}
            onViewAllPress={handleViewAllNotifications}
          />
        )}

        {/* Upcoming Meetings */}
        {dashboardData?.upcomingMeetings && dashboardData.upcomingMeetings.length > 0 && (
          <UpcomingMeetingsCard
            meetings={dashboardData.upcomingMeetings}
            onMeetingPress={handleMeetingPress}
            onViewAllPress={handleViewAllMeetings}
          />
        )}

        {/* Recent Assets */}
        {dashboardData?.recentAssets && dashboardData.recentAssets.length > 0 && (
          <RecentAssetsCard
            assets={dashboardData.recentAssets}
            onAssetPress={handleAssetPress}
            onViewAllPress={handleViewAllDocuments}
          />
        )}

        {/* Empty State */}
        {dashboardData && 
         dashboardData.upcomingMeetings.length === 0 && 
         dashboardData.urgentNotifications.length === 0 && 
         dashboardData.recentAssets.length === 0 && (
          <View style={styles.emptyState}>
            <Icon 
              name="calendar-check" 
              size={48} 
              color={isDark ? COLORS.dark.textSecondary : COLORS.textSecondary} 
            />
            <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
              All caught up!
            </Text>
            <Text style={[styles.emptyMessage, isDark && styles.emptyMessageDark]}>
              No urgent items require your attention right now.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to get time-appropriate greeting
const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  containerDark: {
    backgroundColor: COLORS.dark.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerDark: {
    backgroundColor: COLORS.dark.surface,
    borderBottomColor: COLORS.dark.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
  },
  greetingDark: {
    color: COLORS.dark.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  subtitleDark: {
    color: COLORS.dark.textSecondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['3xl'],
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['4xl'],
    marginTop: SPACING['2xl'],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: COLORS.dark.text,
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyMessageDark: {
    color: COLORS.dark.textSecondary,
  },
});

export default DashboardScreen;