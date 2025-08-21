/**
 * Sample Data Generators for Predictive Intelligence Testing
 * Generates realistic test data for ML models and pattern recognition
 */

import { addDays, addHours, subDays, format } from 'date-fns'

export interface SampleUserActivity {
  user_id: string
  organization_id: string
  event_type: string
  event_category: string
  timestamp: string
  event_data: any
  session_id: string
  duration_seconds?: number
  engagement_score?: number
}

export interface SampleNotificationData {
  user_id: string
  organization_id: string
  type: string
  category: string
  sent_at: string
  opened_at?: string
  clicked_at?: string
  delivery_status: string
  engagement_metrics: {
    open_rate: number
    click_rate: number
    response_time_hours?: number
  }
}

export interface SampleBoardMeetingData {
  organization_id: string
  meeting_type: string
  scheduled_date: string
  actual_date?: string
  duration_minutes: number
  attendance_count: number
  total_invitees: number
  agenda_items: number
  decisions_made: number
  action_items_created: number
  engagement_score: number
}

/**
 * Generate sample user activity data for pattern analysis
 */
export function generateSampleUserActivity(
  userCount: number = 20,
  organizationId: string = 'org-test-123',
  daysBack: number = 90
): SampleUserActivity[] {
  const activities: SampleUserActivity[] = []
  const eventTypes = [
    'login', 'logout', 'document_view', 'document_edit', 'comment_created',
    'vault_accessed', 'meeting_joined', 'notification_opened', 'search_performed',
    'dashboard_viewed', 'report_generated', 'asset_uploaded', 'asset_downloaded'
  ]
  
  const eventCategories = ['authentication', 'content', 'communication', 'governance', 'analytics']
  
  for (let userId = 1; userId <= userCount; userId++) {
    const userIdStr = `user-${userId.toString().padStart(3, '0')}`
    
    // Generate user-specific behavior patterns
    const userBehaviorProfile = generateUserBehaviorProfile(userId)
    
    for (let day = 0; day < daysBack; day++) {
      const date = subDays(new Date(), day)
      
      // Skip weekends for most users (unless they're weekend workers)
      if (!userBehaviorProfile.worksWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
        continue
      }
      
      // Generate daily activities based on user profile
      const dailyActivityCount = Math.floor(
        Math.random() * (userBehaviorProfile.maxDailyActivities - userBehaviorProfile.minDailyActivities + 1) +
        userBehaviorProfile.minDailyActivities
      )
      
      for (let activity = 0; activity < dailyActivityCount; activity++) {
        const timestamp = new Date(date)
        
        // Add realistic timing based on user's active hours
        const hour = Math.floor(
          Math.random() * (userBehaviorProfile.activeHours.end - userBehaviorProfile.activeHours.start + 1) +
          userBehaviorProfile.activeHours.start
        )
        const minute = Math.floor(Math.random() * 60)
        timestamp.setHours(hour, minute, 0, 0)
        
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        const eventCategory = eventCategories[Math.floor(Math.random() * eventCategories.length)]
        
        activities.push({
          user_id: userIdStr,
          organization_id: organizationId,
          event_type: eventType,
          event_category: eventCategory,
          timestamp: timestamp.toISOString(),
          event_data: generateEventData(eventType, userBehaviorProfile),
          session_id: `session-${userId}-${day}-${Math.floor(activity / 5)}`,
          duration_seconds: Math.floor(Math.random() * 3600) + 30, // 30s to 1 hour
          engagement_score: Math.random() * 10
        })
      }
    }
  }
  
  return activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

/**
 * Generate sample notification data for engagement analysis
 */
export function generateSampleNotificationData(
  organizationId: string = 'org-test-123',
  daysBack: number = 90,
  notificationCount: number = 500
): SampleNotificationData[] {
  const notifications: SampleNotificationData[] = []
  const notificationTypes = [
    'meeting_reminder', 'document_shared', 'comment_mention', 'deadline_approaching',
    'approval_request', 'board_announcement', 'compliance_alert', 'vault_invitation'
  ]
  const categories = ['meeting', 'content', 'social', 'deadline', 'governance', 'compliance']
  
  for (let i = 0; i < notificationCount; i++) {
    const sentDate = subDays(new Date(), Math.floor(Math.random() * daysBack))
    const userId = `user-${Math.floor(Math.random() * 20 + 1).toString().padStart(3, '0')}`
    const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
    const category = categories[Math.floor(Math.random() * categories.length)]
    
    // Simulate realistic open and click rates based on type
    const typeEngagementRates = getTypeEngagementRates(type)
    const wasOpened = Math.random() < typeEngagementRates.openRate
    const wasClicked = wasOpened && Math.random() < typeEngagementRates.clickRate
    
    const notification: SampleNotificationData = {
      user_id: userId,
      organization_id: organizationId,
      type,
      category,
      sent_at: sentDate.toISOString(),
      delivery_status: Math.random() < 0.95 ? 'delivered' : 'failed',
      engagement_metrics: {
        open_rate: typeEngagementRates.openRate,
        click_rate: typeEngagementRates.clickRate
      }
    }
    
    if (wasOpened) {
      const openDelay = Math.floor(Math.random() * 24 * 60) // 0-24 hours in minutes
      notification.opened_at = addHours(sentDate, openDelay / 60).toISOString()
      notification.engagement_metrics.response_time_hours = openDelay / 60
      
      if (wasClicked) {
        const clickDelay = Math.floor(Math.random() * 30) // 0-30 minutes after opening
        notification.clicked_at = addHours(new Date(notification.opened_at), clickDelay / 60).toISOString()
      }
    }
    
    notifications.push(notification)
  }
  
  return notifications.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
}

/**
 * Generate sample board meeting data for governance analysis
 */
export function generateSampleBoardMeetingData(
  organizationId: string = 'org-test-123',
  monthsBack: number = 12
): SampleBoardMeetingData[] {
  const meetings: SampleBoardMeetingData[] = []
  const meetingTypes = ['board_meeting', 'committee_meeting', 'special_meeting', 'annual_meeting']
  
  for (let month = 0; month < monthsBack; month++) {
    const monthDate = subDays(new Date(), month * 30)
    
    // Generate 1-4 meetings per month
    const meetingsThisMonth = Math.floor(Math.random() * 4) + 1
    
    for (let meeting = 0; meeting < meetingsThisMonth; meeting++) {
      const scheduledDate = addDays(monthDate, Math.floor(Math.random() * 30))
      const meetingType = meetingTypes[Math.floor(Math.random() * meetingTypes.length)]
      
      // Some meetings might be rescheduled
      const wasRescheduled = Math.random() < 0.15
      const actualDate = wasRescheduled ? 
        addDays(scheduledDate, Math.floor(Math.random() * 14) - 7) : 
        scheduledDate
      
      const totalInvitees = Math.floor(Math.random() * 8) + 5 // 5-12 people
      const attendanceRate = 0.7 + Math.random() * 0.25 // 70-95%
      const attendanceCount = Math.floor(totalInvitees * attendanceRate)
      
      meetings.push({
        organization_id: organizationId,
        meeting_type: meetingType,
        scheduled_date: scheduledDate.toISOString(),
        actual_date: actualDate.toISOString(),
        duration_minutes: Math.floor(Math.random() * 120) + 60, // 1-3 hours
        attendance_count: attendanceCount,
        total_invitees: totalInvitees,
        agenda_items: Math.floor(Math.random() * 10) + 3, // 3-12 items
        decisions_made: Math.floor(Math.random() * 5) + 1, // 1-5 decisions
        action_items_created: Math.floor(Math.random() * 8) + 2, // 2-9 action items
        engagement_score: Math.random() * 10 // 0-10 engagement score
      })
    }
  }
  
  return meetings.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
}

/**
 * Generate user behavior profiles for realistic activity patterns
 */
function generateUserBehaviorProfile(userId: number) {
  const profiles = [
    { // Heavy user
      minDailyActivities: 15,
      maxDailyActivities: 40,
      activeHours: { start: 8, end: 18 },
      worksWeekends: false,
      engagementLevel: 'high'
    },
    { // Moderate user
      minDailyActivities: 5,
      maxDailyActivities: 15,
      activeHours: { start: 9, end: 17 },
      worksWeekends: false,
      engagementLevel: 'medium'
    },
    { // Light user
      minDailyActivities: 1,
      maxDailyActivities: 8,
      activeHours: { start: 10, end: 16 },
      worksWeekends: false,
      engagementLevel: 'low'
    },
    { // Weekend worker
      minDailyActivities: 8,
      maxDailyActivities: 20,
      activeHours: { start: 7, end: 20 },
      worksWeekends: true,
      engagementLevel: 'high'
    },
    { // Early bird
      minDailyActivities: 10,
      maxDailyActivities: 25,
      activeHours: { start: 6, end: 14 },
      worksWeekends: false,
      engagementLevel: 'medium'
    },
    { // Night owl
      minDailyActivities: 8,
      maxDailyActivities: 22,
      activeHours: { start: 12, end: 22 },
      worksWeekends: true,
      engagementLevel: 'medium'
    }
  ]
  
  return profiles[userId % profiles.length]
}

/**
 * Generate realistic event data based on event type
 */
function generateEventData(eventType: string, profile: any) {
  const baseData = {
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
    engagement_level: profile.engagementLevel
  }
  
  switch (eventType) {
    case 'document_view':
      return {
        ...baseData,
        document_id: `doc-${Math.floor(Math.random() * 100)}`,
        view_duration_seconds: Math.floor(Math.random() * 600) + 30,
        scroll_percentage: Math.floor(Math.random() * 100)
      }
    
    case 'meeting_joined':
      return {
        ...baseData,
        meeting_id: `meeting-${Math.floor(Math.random() * 50)}`,
        join_time_after_start_minutes: Math.floor(Math.random() * 10),
        meeting_duration_minutes: Math.floor(Math.random() * 120) + 30
      }
    
    case 'search_performed':
      return {
        ...baseData,
        query: ['board documents', 'meeting minutes', 'policies', 'reports'][Math.floor(Math.random() * 4)],
        results_count: Math.floor(Math.random() * 50),
        clicked_result_position: Math.floor(Math.random() * 10) + 1
      }
    
    default:
      return baseData
  }
}

/**
 * Get realistic engagement rates by notification type
 */
function getTypeEngagementRates(type: string) {
  const rates = {
    'meeting_reminder': { openRate: 0.85, clickRate: 0.70 },
    'document_shared': { openRate: 0.65, clickRate: 0.45 },
    'comment_mention': { openRate: 0.75, clickRate: 0.60 },
    'deadline_approaching': { openRate: 0.90, clickRate: 0.80 },
    'approval_request': { openRate: 0.95, clickRate: 0.85 },
    'board_announcement': { openRate: 0.70, clickRate: 0.35 },
    'compliance_alert': { openRate: 0.88, clickRate: 0.75 },
    'vault_invitation': { openRate: 0.60, clickRate: 0.50 }
  }
  
  return rates[type as keyof typeof rates] || { openRate: 0.60, clickRate: 0.40 }
}

/**
 * Generate anomalous data for testing anomaly detection
 */
export function generateAnomalousData(
  normalData: SampleUserActivity[],
  anomalyPercentage: number = 0.05
): SampleUserActivity[] {
  const anomalousActivities: SampleUserActivity[] = []
  const anomalyCount = Math.floor(normalData.length * anomalyPercentage)
  
  for (let i = 0; i < anomalyCount; i++) {
    const baseActivity = normalData[Math.floor(Math.random() * normalData.length)]
    
    // Create different types of anomalies
    const anomalyTypes = ['volume', 'timing', 'sequence', 'velocity']
    const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)]
    
    switch (anomalyType) {
      case 'volume':
        // Unusual volume of activities
        for (let j = 0; j < 20; j++) {
          anomalousActivities.push({
            ...baseActivity,
            timestamp: addHours(new Date(baseActivity.timestamp), j / 10).toISOString(),
            event_data: {
              ...baseActivity.event_data,
              anomaly_type: 'volume_spike',
              is_anomaly: true
            }
          })
        }
        break
        
      case 'timing':
        // Activity at unusual hours (3 AM)
        const unusualTime = new Date(baseActivity.timestamp)
        unusualTime.setHours(3, Math.floor(Math.random() * 60), 0, 0)
        anomalousActivities.push({
          ...baseActivity,
          timestamp: unusualTime.toISOString(),
          event_data: {
            ...baseActivity.event_data,
            anomaly_type: 'unusual_timing',
            is_anomaly: true
          }
        })
        break
        
      case 'sequence':
        // Unusual sequence of events
        const unusualEvents = ['admin_panel_accessed', 'security_settings_changed', 'bulk_download']
        anomalousActivities.push({
          ...baseActivity,
          event_type: unusualEvents[Math.floor(Math.random() * unusualEvents.length)],
          event_data: {
            ...baseActivity.event_data,
            anomaly_type: 'unusual_sequence',
            is_anomaly: true
          }
        })
        break
        
      case 'velocity':
        // Very rapid succession of activities
        for (let j = 0; j < 10; j++) {
          anomalousActivities.push({
            ...baseActivity,
            timestamp: addHours(new Date(baseActivity.timestamp), j / 60).toISOString(), // Every minute
            event_data: {
              ...baseActivity.event_data,
              anomaly_type: 'high_velocity',
              is_anomaly: true
            }
          })
        }
        break
    }
  }
  
  return anomalousActivities
}

/**
 * Create seasonal patterns for testing time-series analysis
 */
export function generateSeasonalPatterns(
  baseData: SampleUserActivity[],
  seasonalityConfig: {
    weeklyPattern?: boolean
    monthlyPattern?: boolean
    quarterlyPattern?: boolean
  } = {}
): SampleUserActivity[] {
  return baseData.map(activity => {
    const date = new Date(activity.timestamp)
    let seasonalMultiplier = 1
    
    if (seasonalityConfig.weeklyPattern) {
      // Higher activity mid-week, lower on weekends
      const dayOfWeek = date.getDay()
      const weeklyMultipliers = [0.3, 1.0, 1.2, 1.3, 1.2, 0.8, 0.2] // Sun-Sat
      seasonalMultiplier *= weeklyMultipliers[dayOfWeek]
    }
    
    if (seasonalityConfig.monthlyPattern) {
      // Higher activity at month start/end (reporting periods)
      const dayOfMonth = date.getDate()
      if (dayOfMonth <= 5 || dayOfMonth >= 25) {
        seasonalMultiplier *= 1.4
      } else if (dayOfMonth >= 10 && dayOfMonth <= 20) {
        seasonalMultiplier *= 0.8
      }
    }
    
    if (seasonalityConfig.quarterlyPattern) {
      // Higher activity in quarter-end months
      const month = date.getMonth()
      if ([2, 5, 8, 11].includes(month)) { // Mar, Jun, Sep, Dec
        seasonalMultiplier *= 1.6
      }
    }
    
    return {
      ...activity,
      engagement_score: (activity.engagement_score || 5) * seasonalMultiplier,
      event_data: {
        ...activity.event_data,
        seasonal_multiplier: seasonalMultiplier
      }
    }
  })
}

/**
 * Export utility function to generate complete test dataset
 */
export function generateCompleteTestDataset(organizationId: string = 'org-test-123') {
  const userActivities = generateSampleUserActivity(20, organizationId, 90)
  const notifications = generateSampleNotificationData(organizationId, 90, 500)
  const meetings = generateSampleBoardMeetingData(organizationId, 12)
  const seasonalActivities = generateSeasonalPatterns(userActivities, {
    weeklyPattern: true,
    monthlyPattern: true,
    quarterlyPattern: true
  })
  const anomalies = generateAnomalousData(seasonalActivities, 0.05)
  
  return {
    userActivities: [...seasonalActivities, ...anomalies],
    notifications,
    meetings,
    totalRecords: seasonalActivities.length + anomalies.length + notifications.length + meetings.length
  }
}