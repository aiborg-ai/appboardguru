/**
 * Team Upload Queue Component
 * Shows all active uploads across the organization with real-time updates
 */

'use client'

import React, { useMemo } from 'react'
import { Upload, Clock, Users, AlertCircle, CheckCircle2, XCircle, Pause, Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/feedback/tooltip'
import { useUploadCollaborationStore, selectTeamUploads, selectConnectionState } from '@/lib/stores/upload-collaboration.store'
import { formatFileSize } from '@/types/upload'
import { cn } from '@/lib/utils'

interface TeamUploadQueueProps {
  className?: string
  maxVisible?: number
  showStats?: boolean
  allowManagement?: boolean
}

export function TeamUploadQueue({
  className = '',
  maxVisible = 10,
  showStats = true,
  allowManagement = false
}: TeamUploadQueueProps) {
  const teamUploads = useUploadCollaborationStore(selectTeamUploads)
  const connectionState = useUploadCollaborationStore(selectConnectionState)
  
  const { activeUploads, queuedUploads, completedUploads, failedUploads } = useMemo(() => {
    const active = teamUploads.filter(u => u.status === 'uploading')
    const queued = teamUploads.filter(u => u.status === 'queued')
    const completed = teamUploads.filter(u => u.status === 'completed')
    const failed = teamUploads.filter(u => u.status === 'failed')
    
    return {
      activeUploads: active,
      queuedUploads: queued,
      completedUploads: completed,
      failedUploads: failed
    }
  }, [teamUploads])

  const queueStats = useMemo(() => {
    const totalFiles = teamUploads.length
    const totalActiveFiles = activeUploads.length + queuedUploads.length
    const avgProgress = activeUploads.length > 0 
      ? activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length 
      : 0
    
    return {
      totalFiles,
      totalActiveFiles,
      avgProgress: Math.round(avgProgress),
      completionRate: totalFiles > 0 ? Math.round((completedUploads.length / totalFiles) * 100) : 0
    }
  }, [teamUploads, activeUploads, queuedUploads, completedUploads])

  if (!connectionState.isConnected) {
    return (
      <Card className={`p-4 border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Upload queue offline</span>
        </div>
      </Card>
    )
  }

  if (teamUploads.length === 0) {
    return (
      <Card className={`p-4 border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Upload className="h-4 w-4" />
          <span className="text-sm">No active uploads</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`border-blue-200 ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Team Upload Queue</h3>
          </div>
          
          {showStats && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {queueStats.totalActiveFiles} active
              </Badge>
              {queueStats.avgProgress > 0 && (
                <Badge variant="default" className="text-xs bg-blue-600">
                  {queueStats.avgProgress}% avg
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Queue Statistics */}
        {showStats && queueStats.totalActiveFiles > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{activeUploads.length}</div>
              <div className="text-xs text-blue-600">Uploading</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-amber-900">{queuedUploads.length}</div>
              <div className="text-xs text-amber-600">Queued</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-900">{completedUploads.length}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-900">{failedUploads.length}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>
        )}

        {/* Active Uploads */}
        {activeUploads.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-blue-800 uppercase tracking-wide flex items-center gap-2">
              <Play className="h-3 w-3" />
              Currently Uploading ({activeUploads.length})
            </h4>
            
            <div className="space-y-2">
              {activeUploads.slice(0, maxVisible).map((upload) => (
                <UploadItem 
                  key={upload.fileId} 
                  upload={upload} 
                  allowManagement={allowManagement} 
                />
              ))}
              
              {activeUploads.length > maxVisible && (
                <div className="text-xs text-blue-600 text-center py-2">
                  +{activeUploads.length - maxVisible} more uploading
                </div>
              )}
            </div>
          </div>
        )}

        {/* Queued Uploads */}
        {queuedUploads.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-amber-800 uppercase tracking-wide flex items-center gap-2">
              <Pause className="h-3 w-3" />
              In Queue ({queuedUploads.length})
            </h4>
            
            <div className="space-y-2">
              {queuedUploads.slice(0, Math.max(3, maxVisible - activeUploads.length)).map((upload) => (
                <UploadItem 
                  key={upload.fileId} 
                  upload={upload} 
                  allowManagement={allowManagement} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Completed */}
        {completedUploads.length > 0 && (
          <div className="space-y-3 border-t border-blue-200 pt-3">
            <h4 className="text-sm font-medium text-green-800 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Recently Completed
            </h4>
            
            <div className="space-y-2">
              {completedUploads.slice(0, 3).map((upload) => (
                <UploadItem 
                  key={upload.fileId} 
                  upload={upload} 
                  allowManagement={allowManagement} 
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Failed Uploads */}
        {failedUploads.length > 0 && (
          <div className="space-y-3 border-t border-red-200 pt-3">
            <h4 className="text-sm font-medium text-red-800 uppercase tracking-wide flex items-center gap-2">
              <XCircle className="h-3 w-3" />
              Failed Uploads ({failedUploads.length})
            </h4>
            
            <div className="space-y-2">
              {failedUploads.slice(0, 3).map((upload) => (
                <UploadItem 
                  key={upload.fileId} 
                  upload={upload} 
                  allowManagement={allowManagement} 
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Queue Actions */}
        {allowManagement && queueStats.totalActiveFiles > 0 && (
          <div className="flex justify-between items-center pt-3 border-t border-blue-200">
            <div className="text-xs text-blue-700">
              Queue management available
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="text-xs">
                Pause All
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Clear Completed
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

interface UploadItemProps {
  upload: {
    fileId: string
    fileName: string
    userId: string
    userName: string
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'failed' | 'queued'
    startTime: string
    estimatedCompletion?: string
  }
  allowManagement?: boolean
  compact?: boolean
}

function UploadItem({ upload, allowManagement = false, compact = false }: UploadItemProps) {
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'uploading':
        return <Upload className="h-3 w-3 text-blue-600 animate-pulse" />
      case 'processing':
        return <Clock className="h-3 w-3 text-amber-600 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-600" />
      case 'queued':
        return <Pause className="h-3 w-3 text-gray-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (upload.status) {
      case 'uploading':
        return 'border-l-blue-500 bg-blue-50'
      case 'processing':
        return 'border-l-amber-500 bg-amber-50'
      case 'completed':
        return 'border-l-green-500 bg-green-50'
      case 'failed':
        return 'border-l-red-500 bg-red-50'
      case 'queued':
        return 'border-l-gray-500 bg-gray-50'
      default:
        return 'border-l-gray-300 bg-gray-50'
    }
  }

  const timeElapsed = useMemo(() => {
    const start = new Date(upload.startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  }, [upload.startTime])

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg border-l-4",
      getStatusColor(),
      compact && "py-2"
    )}>
      {/* User Avatar */}
      <Avatar className="h-6 w-6 flex-shrink-0">
        <div className="bg-blue-600 text-white text-xs font-medium flex items-center justify-center h-full">
          {upload.userName.charAt(0).toUpperCase()}
        </div>
      </Avatar>
      
      {/* Upload Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium truncate">
            {upload.fileName}
          </span>
          {getStatusIcon()}
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-gray-600">
            {upload.userName}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-600">
            {timeElapsed}
          </span>
          {upload.status === 'uploading' && upload.progress > 0 && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-blue-600 font-medium">
                {upload.progress}%
              </span>
            </>
          )}
        </div>
        
        {/* Progress Bar */}
        {!compact && upload.status === 'uploading' && (
          <div className="mt-2">
            <Progress 
              value={upload.progress} 
              className="h-1"
            />
          </div>
        )}
      </div>
      
      {/* Actions */}
      {allowManagement && upload.status === 'uploading' && (
        <div className="flex items-center space-x-1">
          <Tooltip content="Pause upload">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Pause className="h-3 w-3" />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

export default TeamUploadQueue