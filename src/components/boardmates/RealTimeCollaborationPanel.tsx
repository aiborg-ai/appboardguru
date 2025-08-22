/**
 * Real-Time Collaboration Panel - Enterprise Collaboration Features
 * Live presence indicators, cursor tracking, and collaborative board member selection
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { 
  Users, 
  Wifi, 
  WifiOff,
  Eye,
  Edit,
  MessageSquare,
  Mouse,
  Zap,
  Clock,
  Radio,
  Activity,
  Pulse,
  Circle,
  Dot,
  UserCheck,
  Video,
  Phone,
  Settings,
  Bell,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  UserPresence, 
  CursorPosition, 
  Selection,
  EnhancedBoardMate
} from '@/types/boardmates'
import type { UserId, VaultId, OrganizationId } from '@/types/branded'

interface RealTimeCollaborationPanelProps {
  vaultId: VaultId
  organizationId: OrganizationId
  currentUser: {
    id: UserId
    full_name: string
    avatar_url?: string
  }
  onUserActivity: (activity: CollaborationActivity) => void
  className?: string
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

interface CollaborationActivity {
  type: 'member_select' | 'member_add' | 'member_remove' | 'analysis_view' | 'export_data'
  user_id: UserId
  member_id?: string
  timestamp: Date
  details?: Record<string, any>
}

interface LiveCursor {
  user_id: UserId
  position: CursorPosition
  color: string
  last_update: Date
}

interface CollaborationEvent {
  id: string
  type: 'user_joined' | 'user_left' | 'member_selected' | 'cursor_moved' | 'analysis_started'
  user_id: UserId
  timestamp: Date
  data?: any
}

const COLLABORATION_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
]

export default function RealTimeCollaborationPanel({
  vaultId,
  organizationId,
  currentUser,
  onUserActivity,
  className,
  isMinimized = false,
  onToggleMinimize
}: RealTimeCollaborationPanelProps) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])
  const [liveCursors, setLiveCursors] = useState<LiveCursor[]>([])
  const [recentActivity, setRecentActivity] = useState<CollaborationEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [showCursors, setShowCursors] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  const websocketRef = useRef<WebSocket | null>(null)
  const cursorTrackingRef = useRef<HTMLDivElement>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize real-time connection
  useEffect(() => {
    initializeWebSocket()
    setupCursorTracking()

    return () => {
      cleanup()
    }
  }, [vaultId])

  const initializeWebSocket = useCallback(() => {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate the connection
      setConnectionStatus('connecting')
      
      setTimeout(() => {
        setConnectionStatus('connected')
        setIsConnected(true)
        
        // Simulate initial users
        setActiveUsers([
          {
            user_id: currentUser.id,
            full_name: currentUser.full_name,
            avatar_url: currentUser.avatar_url,
            status: 'online',
            current_action: 'viewing',
            last_seen: new Date().toISOString()
          },
          {
            user_id: 'user-2' as UserId,
            full_name: 'Sarah Johnson',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
            status: 'online',
            current_action: 'editing',
            last_seen: new Date().toISOString()
          },
          {
            user_id: 'user-3' as UserId,
            full_name: 'Michael Chen',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
            status: 'away',
            current_action: 'idle',
            last_seen: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
          }
        ])

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          sendHeartbeat()
        }, 30000) // Every 30 seconds
        
      }, 2000)

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      setConnectionStatus('error')
    }
  }, [vaultId, currentUser])

  const setupCursorTracking = useCallback(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isConnected || !showCursors) return

      const position: CursorPosition = {
        x: event.clientX,
        y: event.clientY,
        element_id: (event.target as Element)?.id || undefined
      }

      // Broadcast cursor position
      broadcastCursorPosition(position)
    }

    document.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isConnected, showCursors])

  const sendHeartbeat = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'heartbeat',
        user_id: currentUser.id,
        timestamp: new Date().toISOString()
      }))
    }
  }, [currentUser.id])

  const broadcastCursorPosition = useCallback((position: CursorPosition) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'cursor_move',
        user_id: currentUser.id,
        position,
        timestamp: new Date().toISOString()
      }))
    }
  }, [currentUser.id])

  const broadcastUserActivity = useCallback((activity: CollaborationActivity) => {
    // Update local state
    onUserActivity(activity)
    
    // Add to recent activity
    const event: CollaborationEvent = {
      id: `event-${Date.now()}`,
      type: 'member_selected', // Map activity type to event type
      user_id: activity.user_id,
      timestamp: activity.timestamp,
      data: activity.details
    }
    
    setRecentActivity(prev => [event, ...prev.slice(0, 9)]) // Keep last 10 events

    // Broadcast via WebSocket
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'user_activity',
        activity,
        timestamp: new Date().toISOString()
      }))
    }

    // Play notification sound
    if (soundEnabled && activity.user_id !== currentUser.id) {
      playNotificationSound()
    }
  }, [onUserActivity, currentUser.id, soundEnabled])

  const playNotificationSound = useCallback(() => {
    // Create a subtle notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }, [])

  const cleanup = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close()
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current)
    }
  }, [])

  const getStatusIcon = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 fill-green-500 text-green-500" />
      case 'away':
        return <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />
      case 'busy':
        return <Circle className="w-2 h-2 fill-red-500 text-red-500" />
      default:
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
    }
  }

  const getActionIcon = (action: UserPresence['current_action']) => {
    switch (action) {
      case 'viewing':
        return <Eye className="w-3 h-3" />
      case 'editing':
        return <Edit className="w-3 h-3" />
      case 'analyzing':
        return <Activity className="w-3 h-3" />
      default:
        return <Dot className="w-3 h-3" />
    }
  }

  const getUserColor = (userId: UserId) => {
    const index = activeUsers.findIndex(user => user.user_id === userId)
    return COLLABORATION_COLORS[index % COLLABORATION_COLORS.length]
  }

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('fixed bottom-4 right-4 z-50', className)}
      >
        <Card className="border-2 border-blue-200 bg-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user, index) => (
                  <Avatar key={user.user_id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {user.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 3 && (
                  <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">+{activeUsers.length - 3}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs text-gray-600">{activeUsers.length} online</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="p-1 h-6 w-6"
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Connection Status */}
      <Card className={cn(
        'border-2',
        isConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm">
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCursors(!showCursors)}
                className="p-1"
              >
                <Mouse className={cn("w-4 h-4", showCursors ? "text-blue-600" : "text-gray-400")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1"
              >
                <Bell className={cn("w-4 h-4", soundEnabled ? "text-blue-600" : "text-gray-400")} />
              </Button>
              {onToggleMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMinimize}
                  className="p-1"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Active Users</span>
              <Badge variant="secondary">{activeUsers.length}</Badge>
            </div>
            <div className="flex space-x-1">
              <Button variant="outline" size="sm">
                <Video className="w-3 h-3 mr-1" />
                Call
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeUsers.map((user) => (
              <motion.div
                key={user.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs bg-gray-200">
                      {user.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1">
                    {getStatusIcon(user.status)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">{user.full_name}</span>
                    {user.user_id === currentUser.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    {getActionIcon(user.current_action)}
                    <span className="capitalize">{user.current_action.replace('_', ' ')}</span>
                  </div>
                </div>

                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getUserColor(user.user_id) }}
                  title="User cursor color"
                />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No recent activity
              </div>
            ) : (
              recentActivity.map((event) => {
                const user = activeUsers.find(u => u.user_id === event.user_id)
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user?.full_name.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-600 truncate">
                        <span className="font-medium">{user?.full_name || 'Unknown'}</span>
                        {' '}
                        {event.type === 'member_selected' ? 'selected a member' :
                         event.type === 'user_joined' ? 'joined the session' :
                         event.type === 'analysis_started' ? 'started team analysis' :
                         'performed an action'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Cursors Overlay */}
      {showCursors && (
        <div
          ref={cursorTrackingRef}
          className="fixed inset-0 pointer-events-none z-40"
        >
          <AnimatePresence>
            {liveCursors.map((cursor) => {
              const user = activeUsers.find(u => u.user_id === cursor.user_id)
              if (!user || cursor.user_id === currentUser.id) return null

              return (
                <motion.div
                  key={cursor.user_id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  style={{
                    position: 'absolute',
                    left: cursor.position.x,
                    top: cursor.position.y,
                    color: cursor.color,
                    pointerEvents: 'none',
                    zIndex: 1000
                  }}
                  className="transform -translate-x-1 -translate-y-1"
                >
                  <Mouse className="w-4 h-4" style={{ color: cursor.color }} />
                  <div 
                    className="absolute top-4 left-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {user.full_name}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}