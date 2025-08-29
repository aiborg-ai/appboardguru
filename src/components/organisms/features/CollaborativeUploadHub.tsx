/**
 * Collaborative Upload Hub
 * Central component that integrates all upload collaboration features
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Upload, 
  Users, 
  Activity, 
  Settings, 
  Bell, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/feedback/tooltip'
import { useUploadCollaborationStore, selectUIState, selectUnreadCount } from '@/lib/stores/upload-collaboration.store'
import { UploadCollaborationConfig } from '@/types/collaboration'
import { UserId, OrganizationId, VaultId } from '@/types/branded'

// Import collaboration components
import UploadPresenceIndicator from './UploadPresenceIndicator'
import TeamUploadQueue from './TeamUploadQueue'
import UploadActivityFeed from './UploadActivityFeed'
import UploadNotificationToast from './UploadNotificationToast'
import UploadAnalyticsDashboard from './UploadAnalyticsDashboard'

interface CollaborativeUploadHubProps {
  className?: string
  organizationId: OrganizationId
  vaultId?: VaultId
  userId: UserId
  userInfo: {
    name: string
    email: string
    avatar?: string
  }
  config?: Partial<UploadCollaborationConfig>
  defaultTab?: 'queue' | 'activity' | 'analytics' | 'presence'
  compactMode?: boolean
}

export function CollaborativeUploadHub({
  className = '',
  organizationId,
  vaultId,
  userId,
  userInfo,
  config = {},
  defaultTab = 'queue',
  compactMode = false
}: CollaborativeUploadHubProps) {
  const [isExpanded, setIsExpanded] = useState(!compactMode)
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isInitialized, setIsInitialized] = useState(false)

  const uiState = useUploadCollaborationStore(selectUIState)
  const unreadCount = useUploadCollaborationStore(selectUnreadCount)
  const { 
    initialize, 
    disconnect, 
    togglePresence, 
    toggleActivityFeed, 
    toggleNotifications 
  } = useUploadCollaborationStore()

  // Initialize collaboration system
  useEffect(() => {
    const initializeCollaboration = async () => {
      const collaborationConfig: UploadCollaborationConfig = {
        organizationId,
        vaultId,
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: true,
        notificationSettings: {
          uploadStarted: true,
          uploadCompleted: true,
          uploadFailed: true,
          uploadShared: true,
          mentions: true
        },
        ...config
      }

      try {
        await initialize(collaborationConfig, userId, userInfo)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize collaboration:', error)
      }
    }

    if (!isInitialized) {
      initializeCollaboration()
    }

    return () => {
      disconnect()
    }
  }, [organizationId, vaultId, userId, userInfo, config, isInitialized])

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'queue':
        return <Upload className="h-4 w-4" />
      case 'activity':
        return <Activity className="h-4 w-4" />
      case 'analytics':
        return <TrendingUp className="h-4 w-4" />
      case 'presence':
        return <Users className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTabBadge = (tab: string) => {
    switch (tab) {
      case 'activity':
        return unreadCount > 0 ? unreadCount : null
      default:
        return null
    }
  }

  if (!isInitialized) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Upload className="h-6 w-6 animate-pulse text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Initializing collaboration...</span>
        </div>
      </Card>
    )
  }

  if (compactMode && !isExpanded) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Compact Header */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Team Collaboration</span>
              {unreadCount > 0 && (
                <Badge variant="default" className="h-5 w-5 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Compact Presence */}
        <UploadPresenceIndicator 
          showDetails={false}
          maxVisible={3}
        />

        {/* Notifications */}
        <UploadNotificationToast />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            
            <div>
              <h2 className="font-semibold text-gray-900">Team Collaboration</h2>
              <p className="text-sm text-gray-600">Real-time upload collaboration</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* UI Toggle Buttons */}
            <Tooltip content="Toggle presence indicator">
              <Button
                variant={uiState.showPresence ? 'default' : 'outline'}
                size="sm"
                onClick={togglePresence}
                className="h-8 w-8 p-0"
              >
                <Users className="h-3 w-3" />
              </Button>
            </Tooltip>
            
            <Tooltip content="Toggle activity feed">
              <Button
                variant={uiState.showActivityFeed ? 'default' : 'outline'}
                size="sm"
                onClick={toggleActivityFeed}
                className="h-8 w-8 p-0"
              >
                <Activity className="h-3 w-3" />
              </Button>
            </Tooltip>
            
            <Tooltip content="Toggle notifications">
              <Button
                variant={uiState.showNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={toggleNotifications}
                className="h-8 w-8 p-0"
              >
                <Bell className="h-3 w-3" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Tooltip>

            {compactMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Presence Indicator */}
      {uiState.showPresence && (
        <UploadPresenceIndicator 
          showDetails={true}
          maxVisible={8}
        />
      )}

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 m-4 mb-0">
            <TabsTrigger value="queue" className="flex items-center space-x-1">
              {getTabIcon('queue')}
              <span>Queue</span>
              {getTabBadge('queue') && (
                <Badge variant="secondary" className="h-4 w-4 p-0 text-xs">
                  {getTabBadge('queue')}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="activity" className="flex items-center space-x-1">
              {getTabIcon('activity')}
              <span>Activity</span>
              {getTabBadge('activity') && (
                <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                  {getTabBadge('activity')}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="analytics" className="flex items-center space-x-1">
              {getTabIcon('analytics')}
              <span>Analytics</span>
            </TabsTrigger>
            
            <TabsTrigger value="presence" className="flex items-center space-x-1">
              {getTabIcon('presence')}
              <span>Presence</span>
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="queue" className="mt-0">
              <TeamUploadQueue 
                maxVisible={10}
                showStats={true}
                allowManagement={true}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <UploadActivityFeed 
                maxItems={20}
                showFilters={true}
                compactMode={false}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <UploadAnalyticsDashboard 
                timeRange="24h"
                showDetails={true}
              />
            </TabsContent>

            <TabsContent value="presence" className="mt-0">
              <div className="space-y-4">
                <UploadPresenceIndicator 
                  showDetails={true}
                  maxVisible={20}
                />
                
                <div className="text-center py-4">
                  <Button variant="outline" size="sm">
                    View All Team Members
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Toast Notifications */}
      {uiState.showNotifications && <UploadNotificationToast />}
    </div>
  )
}

export default CollaborativeUploadHub