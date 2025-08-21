/**
 * User Activity Logger Service
 * Provides user-friendly activity logging on top of the comprehensive audit system
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { SecurityAuditLogger, logDataAccess, logDataModification } from '@/lib/security/audit'
import { Database } from '@/types/database'

type ActivityType = 
  | 'asset_opened' | 'asset_downloaded' | 'asset_uploaded' | 'asset_shared' | 'asset_deleted'
  | 'vault_created' | 'vault_opened' | 'vault_updated' | 'vault_deleted' | 'vault_shared'
  | 'organization_created' | 'organization_joined' | 'organization_left'
  | 'annotation_created' | 'annotation_updated' | 'annotation_deleted'
  | 'search_performed' | 'ai_chat_started' | 'report_generated'
  | 'user_invited' | 'invitation_accepted' | 'settings_updated'
  | 'login' | 'logout' | 'password_changed'

export interface UserActivityEvent {
  userId: string
  organizationId?: string
  activityType: ActivityType
  title: string
  description?: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * User Activity Logger Class
 * Handles both audit logging and user activity feed
 */
export class UserActivityLogger {
  /**
   * Log a user activity event
   * This creates both an audit log entry and a user-friendly activity feed entry
   */
  static async logActivity(event: UserActivityEvent): Promise<string> {
    try {
      // Create correlation ID for tracking
      const correlationId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Log to audit system (for security and compliance)
      const auditCorrelationId = await SecurityAuditLogger.logEvent({
        eventType: 'user_action',
        eventCategory: event.activityType,
        action: event.activityType,
        resourceType: event.resourceType || 'unknown',
        resourceId: event.resourceId,
        eventDescription: event.title,
        details: {
          description: event.description,
          ...event.metadata
        },
        severity: 'low',
        outcome: 'success',
        userId: event.userId,
        organizationId: event.organizationId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        correlationId
      })

      // Log to user activity feed (for user-facing activity history)
      await this.logToActivityFeed(event, correlationId)

      return auditCorrelationId
    } catch (error) {
      console.error('Failed to log user activity:', error)
      throw error
    }
  }

  /**
   * Log to user activity feed table
   */
  private static async logToActivityFeed(
    event: UserActivityEvent, 
    correlationId: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_activity_feed')
        .insert({
          user_id: event.userId,
          organization_id: event.organizationId,
          activity_type: event.activityType,
          activity_title: event.title,
          activity_description: event.description,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          metadata: {
            correlation_id: correlationId,
            ip_address: event.ipAddress,
            user_agent: event.userAgent,
            ...event.metadata
          }
        })

      if (error) {
        console.error('Failed to log to activity feed:', error)
        throw error
      }
    } catch (error) {
      console.error('Error logging to activity feed:', error)
      throw error
    }
  }

  /**
   * Get user's recent activities
   */
  static async getUserActivities(
    userId: string,
    organizationId?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      let query = supabaseAdmin
        .from('user_activity_feed')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .range(offset, offset + limit - 1)

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch user activities:', error)
      throw error
    }
  }
}

/**
 * Convenience functions for common activity types
 */

export async function logAssetActivity(
  userId: string,
  organizationId: string,
  action: 'opened' | 'downloaded' | 'uploaded' | 'shared' | 'deleted',
  assetId: string,
  assetName: string,
  metadata: Record<string, any> = {}
) {
  const actionTitles = {
    opened: `Opened asset "${assetName}"`,
    downloaded: `Downloaded asset "${assetName}"`,
    uploaded: `Uploaded asset "${assetName}"`,
    shared: `Shared asset "${assetName}"`,
    deleted: `Deleted asset "${assetName}"`
  }

  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: `asset_${action}` as ActivityType,
    title: actionTitles[action],
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} asset: ${assetName}`,
    resourceType: 'asset',
    resourceId: assetId,
    metadata: {
      asset_name: assetName,
      action,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logVaultActivity(
  userId: string,
  organizationId: string,
  action: 'created' | 'opened' | 'updated' | 'deleted' | 'shared',
  vaultId: string,
  vaultName: string,
  metadata: Record<string, any> = {}
) {
  const actionTitles = {
    created: `Created vault "${vaultName}"`,
    opened: `Opened vault "${vaultName}"`,
    updated: `Updated vault "${vaultName}"`,
    deleted: `Deleted vault "${vaultName}"`,
    shared: `Shared vault "${vaultName}"`
  }

  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: `vault_${action}` as ActivityType,
    title: actionTitles[action],
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} vault: ${vaultName}`,
    resourceType: 'vault',
    resourceId: vaultId,
    metadata: {
      vault_name: vaultName,
      action,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logOrganizationActivity(
  userId: string,
  organizationId: string,
  action: 'created' | 'joined' | 'left' | 'updated',
  organizationName: string,
  metadata: Record<string, any> = {}
) {
  const actionTitles = {
    created: `Created organization "${organizationName}"`,
    joined: `Joined organization "${organizationName}"`,
    left: `Left organization "${organizationName}"`,
    updated: `Updated organization "${organizationName}"`
  }

  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: `organization_${action}` as ActivityType,
    title: actionTitles[action],
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} organization: ${organizationName}`,
    resourceType: 'organization',
    resourceId: organizationId,
    metadata: {
      organization_name: organizationName,
      action,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logSearchActivity(
  userId: string,
  organizationId: string,
  searchQuery: string,
  resultCount: number,
  metadata: Record<string, any> = {}
) {
  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: 'search_performed',
    title: `Searched for "${searchQuery}"`,
    description: `Search query returned ${resultCount} results`,
    resourceType: 'search',
    metadata: {
      search_query: searchQuery,
      result_count: resultCount,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logAIChatActivity(
  userId: string,
  organizationId: string,
  chatTopic: string,
  metadata: Record<string, any> = {}
) {
  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: 'ai_chat_started',
    title: `Started AI chat about "${chatTopic}"`,
    description: `Initiated AI conversation with topic: ${chatTopic}`,
    resourceType: 'ai_chat',
    metadata: {
      chat_topic: chatTopic,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logAnnotationActivity(
  userId: string,
  organizationId: string,
  action: 'created' | 'updated' | 'deleted',
  annotationId: string,
  assetName: string,
  metadata: Record<string, any> = {}
) {
  const actionTitles = {
    created: `Added annotation to "${assetName}"`,
    updated: `Updated annotation on "${assetName}"`,
    deleted: `Deleted annotation from "${assetName}"`
  }

  return UserActivityLogger.logActivity({
    userId,
    organizationId,
    activityType: `annotation_${action}` as ActivityType,
    title: actionTitles[action],
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} annotation on asset: ${assetName}`,
    resourceType: 'annotation',
    resourceId: annotationId,
    metadata: {
      asset_name: assetName,
      action,
      ...metadata
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

export async function logAuthActivity(
  userId: string,
  action: 'login' | 'logout' | 'password_changed',
  metadata: Record<string, any> = {}
) {
  const actionTitles = {
    login: 'Signed in to BoardGuru',
    logout: 'Signed out of BoardGuru',
    password_changed: 'Changed account password'
  }

  return UserActivityLogger.logActivity({
    userId,
    activityType: action,
    title: actionTitles[action],
    description: `User ${action} activity`,
    resourceType: 'user_session',
    resourceId: userId,
    metadata,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  })
}

/**
 * Helper function to get request context (IP, User Agent) from NextRequest
 */
export function getRequestContext(request?: Request) {
  if (!request) return {}

  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }
}