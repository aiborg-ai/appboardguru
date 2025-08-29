/**
 * Upload Presence Indicator
 * Shows who else is currently uploading files
 */

'use client'

import React from 'react'
import { Users, Upload, Clock, Wifi, WifiOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/feedback/tooltip'
import { useUploadCollaborationStore, selectPresence, selectConnectionState } from '@/lib/stores/upload-collaboration.store'
import { formatFileSize } from '@/types/upload'

interface UploadPresenceIndicatorProps {
  className?: string
  showDetails?: boolean
  maxVisible?: number
}

export function UploadPresenceIndicator({
  className = '',
  showDetails = true,
  maxVisible = 5
}: UploadPresenceIndicatorProps) {
  const presence = useUploadCollaborationStore(selectPresence)
  const connectionState = useUploadCollaborationStore(selectConnectionState)
  
  const activeUploaders = presence.filter(p => 
    p.status === 'uploading' || p.activeUploads.length > 0
  )
  
  const onlineUsers = presence.filter(p => p.status === 'online')
  const visibleUsers = activeUploaders.slice(0, maxVisible)
  const hiddenCount = Math.max(0, activeUploaders.length - maxVisible)

  if (!connectionState.isConnected) {
    return (
      <Card className={`p-3 border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Collaboration offline</span>
        </div>
      </Card>
    )
  }

  if (activeUploaders.length === 0 && onlineUsers.length === 0) {
    return (
      <Card className={`p-3 border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Users className="h-4 w-4" />
          <span className="text-sm">No team members online</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 border-blue-200 bg-blue-50 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Wifi className="h-4 w-4 text-green-500" />
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-900">
              Team Activity
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {onlineUsers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {onlineUsers.length} online
              </Badge>
            )}
            {activeUploaders.length > 0 && (
              <Badge variant="default" className="text-xs bg-blue-600">
                {activeUploaders.length} uploading
              </Badge>
            )}
          </div>
        </div>

        {/* Active Uploaders */}
        {activeUploaders.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-blue-800 uppercase tracking-wide">
              Currently Uploading
            </h4>
            
            <div className="space-y-2">
              {visibleUsers.map((user) => (
                <div key={user.userId} className="flex items-center space-x-3">
                  <Avatar className="h-6 w-6">
                    {user.user.avatar ? (
                      <img src={user.user.avatar} alt={user.user.name} />
                    ) : (
                      <div className="bg-blue-600 text-white text-xs font-medium flex items-center justify-center h-full">
                        {user.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-blue-900 truncate">
                        {user.user.name}
                      </span>
                      {user.status === 'uploading' && (
                        <Upload className="h-3 w-3 text-blue-600 animate-pulse" />
                      )}
                    </div>
                    
                    {showDetails && user.activeUploads.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {user.activeUploads.slice(0, 2).map((upload) => (
                          <Tooltip
                            key={upload.fileId}
                            content={`${upload.fileName} - ${upload.progress}% complete`}
                          >
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">
                                  {upload.fileName}
                                </div>
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <div className="flex-1 bg-blue-200 rounded-full h-1">
                                    <div
                                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                      style={{ width: `${upload.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-blue-600 font-medium">
                                    {upload.progress}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Tooltip>
                        ))}
                        
                        {user.activeUploads.length > 2 && (
                          <div className="text-xs text-blue-600">
                            +{user.activeUploads.length - 2} more files
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-blue-600">
                    <Clock className="h-3 w-3" />
                  </div>
                </div>
              ))}
              
              {hiddenCount > 0 && (
                <div className="text-xs text-blue-600 font-medium">
                  +{hiddenCount} more uploading
                </div>
              )}
            </div>
          </div>
        )}

        {/* Online Users (not uploading) */}
        {onlineUsers.length > activeUploaders.length && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Online
            </h4>
            
            <div className="flex items-center space-x-1">
              {onlineUsers
                .filter(user => !activeUploaders.some(au => au.userId === user.userId))
                .slice(0, 8)
                .map((user) => (
                  <Tooltip key={user.userId} content={user.user.name}>
                    <Avatar className="h-6 w-6 border-2 border-white">
                      {user.user.avatar ? (
                        <img src={user.user.avatar} alt={user.user.name} />
                      ) : (
                        <div className="bg-gray-500 text-white text-xs font-medium flex items-center justify-center h-full">
                          {user.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Avatar>
                  </Tooltip>
                ))
              }
              
              {onlineUsers.length - activeUploaders.length > 8 && (
                <div className="text-xs text-gray-500 ml-2">
                  +{onlineUsers.length - activeUploaders.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {activeUploaders.length > 0 && (
          <div className="pt-2 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                {activeUploaders.reduce((total, user) => total + user.activeUploads.length, 0)} files in progress
              </span>
              
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View All →
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default UploadPresenceIndicator