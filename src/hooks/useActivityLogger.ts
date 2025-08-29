/**
 * useActivityLogger Hook
 * React hook for client-side activity logging
 */

import { useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

type ActivityType = 
  | 'asset_opened' | 'asset_downloaded' | 'asset_uploaded' | 'asset_shared' | 'asset_deleted'
  | 'vault_created' | 'vault_opened' | 'vault_updated' | 'vault_deleted' | 'vault_shared'
  | 'organization_created' | 'organization_joined' | 'organization_left'
  | 'annotation_created' | 'annotation_updated' | 'annotation_deleted'
  | 'search_performed' | 'ai_chat_started' | 'report_generated'
  | 'user_invited' | 'invitation_accepted' | 'settings_updated'

interface LogActivityParams {
  activityType: ActivityType
  title: string
  description?: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

export function useActivityLogger() {
  const supabase = createSupabaseBrowserClient()

  const logActivity = useCallback(async (params: LogActivityParams) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        console.warn('Cannot log activity: User not authenticated')
        return
      }

      const response = await fetch('/api/user/activity/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...params,
          metadata: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            url: window.location.href,
            ...params.metadata
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to log activity: ${response.statusText}`)
      }

      const result = await response.json()
      return result.correlationId
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }, [])

  // Convenience functions for common activities
  const logAssetActivity = useCallback((
    action: 'opened' | 'downloaded' | 'uploaded' | 'shared' | 'deleted',
    assetId: string,
    assetName: string,
    metadata?: Record<string, unknown>
  ) => {
    const actionTitles = {
      opened: `Opened asset "${assetName}"`,
      downloaded: `Downloaded asset "${assetName}"`,
      uploaded: `Uploaded asset "${assetName}"`,
      shared: `Shared asset "${assetName}"`,
      deleted: `Deleted asset "${assetName}"`
    }

    return logActivity({
      activityType: `asset_${action}` as ActivityType,
      title: actionTitles[action],
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} asset: ${assetName}`,
      resourceType: 'asset',
      resourceId: assetId,
      metadata: {
        asset_name: assetName,
        action,
        ...metadata
      }
    })
  }, [logActivity])

  const logVaultActivity = useCallback((
    action: 'created' | 'opened' | 'updated' | 'deleted' | 'shared',
    vaultId: string,
    vaultName: string,
    metadata?: Record<string, unknown>
  ) => {
    const actionTitles = {
      created: `Created vault "${vaultName}"`,
      opened: `Opened vault "${vaultName}"`,
      updated: `Updated vault "${vaultName}"`,
      deleted: `Deleted vault "${vaultName}"`,
      shared: `Shared vault "${vaultName}"`
    }

    return logActivity({
      activityType: `vault_${action}` as ActivityType,
      title: actionTitles[action],
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} vault: ${vaultName}`,
      resourceType: 'vault',
      resourceId: vaultId,
      metadata: {
        vault_name: vaultName,
        action,
        ...metadata
      }
    })
  }, [logActivity])

  const logSearchActivity = useCallback((
    searchQuery: string,
    resultCount: number,
    searchContext?: string,
    metadata?: Record<string, unknown>
  ) => {
    return logActivity({
      activityType: 'search_performed',
      title: `Searched for "${searchQuery}"`,
      description: `Search returned ${resultCount} results${searchContext ? ` in ${searchContext}` : ''}`,
      resourceType: 'search',
      metadata: {
        search_query: searchQuery,
        result_count: resultCount,
        search_context: searchContext,
        ...metadata
      }
    })
  }, [logActivity])

  const logAnnotationActivity = useCallback((
    action: 'created' | 'updated' | 'deleted',
    annotationId: string,
    assetName: string,
    annotationText?: string,
    metadata?: Record<string, unknown>
  ) => {
    const actionTitles = {
      created: `Added annotation to "${assetName}"`,
      updated: `Updated annotation on "${assetName}"`,
      deleted: `Deleted annotation from "${assetName}"`
    }

    return logActivity({
      activityType: `annotation_${action}` as ActivityType,
      title: actionTitles[action],
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} annotation on asset: ${assetName}`,
      resourceType: 'annotation',
      resourceId: annotationId,
      metadata: {
        asset_name: assetName,
        annotation_text: annotationText,
        action,
        ...metadata
      }
    })
  }, [logActivity])

  const logAIChatActivity = useCallback((
    chatTopic: string,
    messageCount?: number,
    metadata?: Record<string, unknown>
  ) => {
    return logActivity({
      activityType: 'ai_chat_started',
      title: `Started AI chat about "${chatTopic}"`,
      description: `Initiated AI conversation${messageCount ? ` with ${messageCount} messages` : ''}`,
      resourceType: 'ai_chat',
      metadata: {
        chat_topic: chatTopic,
        message_count: messageCount,
        ...metadata
      }
    })
  }, [logActivity])

  return {
    logActivity,
    logAssetActivity,
    logVaultActivity,
    logSearchActivity,
    logAnnotationActivity,
    logAIChatActivity
  }
}