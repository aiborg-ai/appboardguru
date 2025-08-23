/**
 * DocumentCollaboratorsPanel - Organism Component
 * Real-time document collaboration panel with virtual scrolling
 */

'use client'

import React, { memo, useCallback, useEffect, useState } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { UserPresenceIndicator } from './UserPresenceIndicator'
import { VirtualScrollList } from '../ui/virtual-scroll-list'
import { cn } from '../../lib/utils'
import type { UserPresence, DocumentCursor } from '../../types/websocket'
import type { AssetId, UserId } from '../../types/branded'
import { useDocumentCollaboration } from '../../hooks/useDocumentCollaboration'
import { usePresenceAnalytics } from '../../hooks/usePresenceAnalytics'

// Props interface following CLAUDE.md conventions
interface DocumentCollaboratorsPanelProps {
  assetId: AssetId
  isVisible?: boolean
  onUserClick?: (userId: UserId) => void
  onInviteClick?: () => void
  className?: string
  showAnalytics?: boolean
  maxHeight?: number
}

/**
 * Collaborator item for virtual scrolling
 */
interface CollaboratorItem {
  id: string
  presence: UserPresence
  cursor?: DocumentCursor
  isCurrentUser: boolean
}

/**
 * DocumentCollaboratorsPanel Component
 * Optimized with React.memo and virtual scrolling following CLAUDE.md guidelines
 */
export const DocumentCollaboratorsPanel = memo(function DocumentCollaboratorsPanel({
  assetId,
  isVisible = true,
  onUserClick,
  onInviteClick,
  className,
  showAnalytics = false,
  maxHeight = 400
}: DocumentCollaboratorsPanelProps) {
  // Hooks following CLAUDE.md patterns
  const { activeUsers, cursors } = useDocumentCollaboration({ assetId, enabled: isVisible })
  const { analytics, loading: analyticsLoading } = usePresenceAnalytics(assetId, { enabled: showAnalytics })
  
  // Local state for UI interactions
  const [selectedUserId, setSelectedUserId] = useState<UserId | null>(null)
  const [showOfflineUsers, setShowOfflineUsers] = useState(false)

  // Filter and process collaborators for display
  const collaborators = React.useMemo((): CollaboratorItem[] => {
    const currentUserId = 'current-user-id' // Would come from auth store
    
    const filteredUsers = showOfflineUsers 
      ? activeUsers 
      : activeUsers.filter(user => user.status === 'online')

    return filteredUsers.map(presence => ({
      id: presence.userId,
      presence,
      cursor: cursors.find(c => c.userId === presence.userId),
      isCurrentUser: presence.userId === currentUserId
    }))
  }, [activeUsers, cursors, showOfflineUsers])

  // Event handlers with useCallback optimization
  const handleUserClick = useCallback((userId: UserId) => {
    setSelectedUserId(userId)
    onUserClick?.(userId)
  }, [onUserClick])

  const handleToggleOfflineUsers = useCallback(() => {
    setShowOfflineUsers(prev => !prev)
  }, [])

  const handleInviteCollaborators = useCallback(() => {
    onInviteClick?.()
  }, [onInviteClick])

  // Virtual list item renderer
  const renderCollaboratorItem = useCallback(({ item, index }: { 
    item: CollaboratorItem
    index: number 
  }) => {
    const { presence, cursor, isCurrentUser } = item
    
    return (
      <div
        key={presence.userId}
        className={cn(
          'flex items-center justify-between p-2 rounded-lg transition-colors',
          'hover:bg-gray-50',
          selectedUserId === presence.userId && 'bg-blue-50',
          isCurrentUser && 'bg-green-50'
        )}
      >
        <UserPresenceIndicator
          presence={presence}
          size="md"
          showName={true}
          showLastSeen={true}
          onClick={handleUserClick}
          className="flex-1"
        />
        
        {/* Cursor Position Indicator */}
        {cursor && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cursor.color }}
            />
            <span>L{cursor.position.line}:C{cursor.position.column}</span>
          </div>
        )}
        
        {/* Current User Badge */}
        {isCurrentUser && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            You
          </span>
        )}
      </div>
    )
  }, [selectedUserId, handleUserClick])

  // Early return for hidden state
  if (!isVisible) {
    return null
  }

  return (
    <Card className={cn('w-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Collaborators
            </h3>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {collaborators.filter(c => c.presence.status === 'online').length} online
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle offline users */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleOfflineUsers}
              className="text-xs"
            >
              {showOfflineUsers ? 'Hide offline' : 'Show offline'}
            </Button>
            
            {/* Invite button */}
            {onInviteClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInviteCollaborators}
                className="text-xs"
              >
                Invite
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collaborators List with Virtual Scrolling */}
      <div className="p-2">
        {collaborators.length > 0 ? (
          <VirtualScrollList
            items={collaborators}
            renderItem={renderCollaboratorItem}
            itemHeight={60} // Approximate height per item
            maxHeight={maxHeight}
            className="space-y-1"
            emptyState={
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No active collaborators</p>
                {onInviteClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInviteCollaborators}
                    className="mt-2"
                  >
                    Invite Collaborators
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No collaborators found</p>
            {onInviteClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInviteCollaborators}
                className="mt-2"
              >
                Invite Collaborators
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Analytics Section */}
      {showAnalytics && analytics && !analyticsLoading && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-medium text-gray-700 mb-2">
            Collaboration Insights
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Active Users:</span>
              <span className="ml-1 font-medium">
                {analytics.activeUsers.length}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Collaboration Score:</span>
              <span className="ml-1 font-medium">
                {analytics.collaborationScore}/100
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Avg. Time:</span>
              <span className="ml-1 font-medium">
                {Math.round(analytics.engagementMetrics.averageTimeSpent / 60000)}m
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">Interactions:</span>
              <span className="ml-1 font-medium">
                {analytics.engagementMetrics.interactionCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}, (prevProps, nextProps) => {
  // Performance optimization with custom comparison
  return (
    prevProps.assetId === nextProps.assetId &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.showName === nextProps.showName &&
    prevProps.showLastSeen === nextProps.showLastSeen &&
    prevProps.showAnalytics === nextProps.showAnalytics &&
    prevProps.maxHeight === nextProps.maxHeight &&
    prevProps.className === nextProps.className
  )
})

export type { DocumentCollaboratorsPanelProps }