/**
 * Upload Activity Feed Component
 * Shows real-time activity stream of all upload-related events
 */

'use client'

import React, { useMemo } from 'react'
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  MessageSquare, 
  Clock, 
  FileText, 
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { Card } from '@/features/shared/ui/card'
import { Avatar } from '@/features/shared/ui/avatar'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Tooltip } from '@/features/shared/ui/tooltip'
import { useUploadCollaborationStore } from '@/lib/stores/upload-collaboration.store'
import { CollaborationEvent } from '@/types/collaboration'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface UploadActivityFeedProps {
  className?: string
  maxItems?: number
  showFilters?: boolean
  compactMode?: boolean
}

export function UploadActivityFeed({
  className = '',
  maxItems = 20,
  showFilters = true,
  compactMode = false
}: UploadActivityFeedProps) {
  const recentActivity = useUploadCollaborationStore(state => state.recentActivity)
  const connectionState = useUploadCollaborationStore(state => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.connectionError
  }))

  const [filter, setFilter] = React.useState<'all' | 'uploads' | 'shares' | 'comments'>('all')

  const filteredActivity = useMemo(() => {
    let filtered = recentActivity

    switch (filter) {
      case 'uploads':
        filtered = recentActivity.filter(activity => 
          activity.type.startsWith('upload:')
        )
        break
      case 'shares':
        filtered = recentActivity.filter(activity => 
          activity.type === 'upload:shared'
        )
        break
      case 'comments':
        filtered = recentActivity.filter(activity => 
          activity.type === 'upload:commented'
        )
        break
      default:
        filtered = recentActivity
    }

    return filtered.slice(0, maxItems)
  }, [recentActivity, filter, maxItems])

  const activityStats = useMemo(() => {
    const last24h = recentActivity.filter(activity => {
      const activityTime = new Date(activity.timestamp)
      const now = new Date()
      return now.getTime() - activityTime.getTime() < 24 * 60 * 60 * 1000
    })

    const uploads = last24h.filter(a => a.type === 'upload:completed').length
    const shares = last24h.filter(a => a.type === 'upload:shared').length
    const comments = last24h.filter(a => a.type === 'upload:commented').length

    return { uploads, shares, comments, total: last24h.length }
  }, [recentActivity])

  if (!connectionState.isConnected && !connectionState.isConnecting) {
    return (
      <Card className={`p-4 border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Activity feed offline</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Activity Feed</h3>
          </div>
          
          {!compactMode && (
            <Badge variant="secondary" className="text-xs">
              {activityStats.total} today
            </Badge>
          )}
        </div>

        {/* Activity Stats */}
        {!compactMode && activityStats.total > 0 && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{activityStats.uploads}</div>
              <div className="text-xs text-blue-600">Uploads</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-900">{activityStats.shares}</div>
              <div className="text-xs text-green-600">Shares</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-900">{activityStats.comments}</div>
              <div className="text-xs text-purple-600">Comments</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && !compactMode && (
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All', icon: TrendingUp },
              { key: 'uploads', label: 'Uploads', icon: Upload },
              { key: 'shares', label: 'Shares', icon: Share2 },
              { key: 'comments', label: 'Comments', icon: MessageSquare }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key as any)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Activity Items */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            filteredActivity.map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                compact={compactMode} 
              />
            ))
          )}
        </div>

        {/* Load More */}
        {recentActivity.length > maxItems && (
          <div className="text-center pt-3 border-t">
            <Button variant="outline" size="sm" className="text-xs">
              View All Activity
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

interface ActivityItemProps {
  activity: CollaborationEvent
  compact?: boolean
}

function ActivityItem({ activity, compact = false }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'upload:started':
        return <Upload className="h-4 w-4 text-blue-600" />
      case 'upload:progress':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'upload:completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'upload:failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'upload:shared':
        return <Share2 className="h-4 w-4 text-purple-600" />
      case 'upload:commented':
        return <MessageSquare className="h-4 w-4 text-blue-600" />
      case 'presence:join':
        return <Users className="h-4 w-4 text-green-600" />
      case 'presence:leave':
        return <Users className="h-4 w-4 text-gray-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityMessage = () => {
    const userName = activity.user.name
    
    switch (activity.type) {
      case 'upload:started':
        const startData = activity as any
        return `${userName} started uploading ${startData.data.fileName}`
      
      case 'upload:completed':
        const completeData = activity as any
        return `${userName} uploaded ${completeData.data.asset.title}`
      
      case 'upload:failed':
        const failData = activity as any
        return `${userName}'s upload failed: ${failData.data.fileName}`
      
      case 'upload:shared':
        const shareData = activity as any
        const sharedWithCount = shareData.data.sharedWith?.length || 0
        return `${userName} shared ${shareData.data.assetTitle}${sharedWithCount > 0 ? ` with ${sharedWithCount} people` : ''}`
      
      case 'upload:commented':
        const commentData = activity as any
        return `${userName} commented on ${commentData.data.assetTitle}`
      
      case 'presence:join':
        return `${userName} joined the session`
      
      case 'presence:leave':
        return `${userName} left the session`
      
      default:
        return `${userName} performed an action`
    }
  }

  const getActivityColor = () => {
    switch (activity.type) {
      case 'upload:completed':
        return 'border-l-green-500'
      case 'upload:failed':
        return 'border-l-red-500'
      case 'upload:shared':
        return 'border-l-purple-500'
      case 'upload:commented':
        return 'border-l-blue-500'
      case 'upload:started':
        return 'border-l-amber-500'
      default:
        return 'border-l-gray-300'
    }
  }

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
    } catch {
      return 'just now'
    }
  }, [activity.timestamp])

  const getActionButtons = () => {
    const buttons = []
    
    if (activity.type === 'upload:completed') {
      const completeData = activity as any
      buttons.push(
        <Tooltip key="view" content="View asset">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <FileText className="h-3 w-3" />
          </Button>
        </Tooltip>
      )
    }
    
    if (activity.type === 'upload:shared') {
      buttons.push(
        <Tooltip key="share" content="Share options">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Share2 className="h-3 w-3" />
          </Button>
        </Tooltip>
      )
    }
    
    return buttons
  }

  return (
    <div className={cn(
      "flex items-start space-x-3 p-3 rounded-lg border-l-4 bg-gray-50",
      getActivityColor(),
      compact && "py-2"
    )}>
      {/* User Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {activity.user.avatar ? (
          <img src={activity.user.avatar} alt={activity.user.name} />
        ) : (
          <div className="bg-blue-600 text-white text-xs font-medium flex items-center justify-center h-full">
            {activity.user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </Avatar>
      
      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {getActivityIcon()}
              <p className="text-sm text-gray-900 truncate">
                {getActivityMessage()}
              </p>
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              {timeAgo}
            </p>
          </div>
          
          {/* Action Buttons */}
          {!compact && getActionButtons().length > 0 && (
            <div className="flex space-x-1 ml-2">
              {getActionButtons()}
            </div>
          )}
        </div>
        
        {/* Additional Context */}
        {!compact && activity.type === 'upload:shared' && (
          <div className="mt-2">
            <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
              <Share2 className="h-3 w-3 inline mr-1" />
              Shared with team members
            </div>
          </div>
        )}
        
        {!compact && activity.type === 'upload:commented' && (
          <div className="mt-2">
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              New comment added
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadActivityFeed