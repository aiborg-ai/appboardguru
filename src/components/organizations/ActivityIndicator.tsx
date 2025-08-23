'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Clock, Users, Dot } from 'lucide-react'

// Types
interface ActivityIndicatorProps {
  activityScore: number
  memberCount: number
  activeMembers: number
  lastActivity?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

interface OnlineStatusProps {
  isOnline: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

interface ActivityScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

interface LastActivityProps {
  timestamp: string
  className?: string
}

// Online Status Indicator Component
export function OnlineStatus({ isOnline, size = 'md', className }: OnlineStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'rounded-full',
          sizeClasses[size],
          isOnline 
            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
            : 'bg-gray-400'
        )}
      />
      {isOnline && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-green-500',
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  )
}

// Activity Score Component (shows engagement level)
export function ActivityScore({ 
  score, 
  size = 'md', 
  showLabel = true, 
  className 
}: ActivityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Activity'
    if (score >= 60) return 'Good Activity'
    if (score >= 40) return 'Moderate Activity'
    return 'Low Activity'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  return (
    <motion.div
      className={cn('inline-flex items-center gap-2', className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          sizeClasses[size],
          getScoreColor(score)
        )}
      >
        {score}%
      </span>
      {showLabel && size !== 'sm' && (
        <span className="text-sm text-gray-600">
          {getScoreLabel(score)}
        </span>
      )}
    </motion.div>
  )
}

// Last Activity Display
export function LastActivity({ timestamp, className }: LastActivityProps) {
  const formatLastActivity = (timestamp: string): string => {
    const now = new Date()
    const activity = new Date(timestamp)
    const diffMs = now.getTime() - activity.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return activity.toLocaleDateString()
  }

  return (
    <div className={cn('flex items-center text-xs text-gray-500', className)}>
      <Clock className="w-3 h-3 mr-1" />
      <span>{formatLastActivity(timestamp)}</span>
    </div>
  )
}

// Main Activity Indicator Component
export function ActivityIndicator({
  activityScore,
  memberCount,
  activeMembers,
  lastActivity,
  className,
  size = 'md',
  showDetails = true
}: ActivityIndicatorProps) {
  const activityPercentage = memberCount > 0 ? Math.round((activeMembers / memberCount) * 100) : 0

  return (
    <motion.div
      className={cn(
        'flex items-center gap-3',
        size === 'sm' && 'gap-2',
        size === 'lg' && 'gap-4',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Activity Score */}
      <ActivityScore 
        score={activityScore} 
        size={size}
        showLabel={showDetails && size !== 'sm'}
        className="flex-shrink-0"
      />

      {/* Member Activity */}
      {showDetails && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className={cn(
              'text-gray-400',
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
            <span className="font-medium">{activeMembers}</span>
            <span className="text-gray-400">of</span>
            <span>{memberCount}</span>
            {size !== 'sm' && (
              <span className="text-gray-400">active</span>
            )}
          </div>
          
          {/* Activity percentage indicator */}
          <div className="flex items-center gap-1">
            <Dot className={cn(
              'text-gray-300',
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              activityPercentage >= 70 ? 'bg-green-100 text-green-700' :
              activityPercentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {activityPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Last Activity */}
      {showDetails && lastActivity && size !== 'sm' && (
        <LastActivity 
          timestamp={lastActivity} 
          className="flex-shrink-0"
        />
      )}
    </motion.div>
  )
}

// Member List with Online Indicators
interface MemberActivityListProps {
  members: Array<{
    userId: string
    fullName: string | null
    email: string
    avatarUrl: string | null
    isOnline: boolean
    role: string
    activityCount: number
  }>
  maxDisplay?: number
  className?: string
}

export function MemberActivityList({ 
  members, 
  maxDisplay = 5, 
  className 
}: MemberActivityListProps) {
  const displayedMembers = members.slice(0, maxDisplay)
  const remainingCount = Math.max(0, members.length - maxDisplay)

  return (
    <div className={cn('space-y-2', className)}>
      {displayedMembers.map((member, index) => (
        <motion.div
          key={member.userId}
          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName || member.email}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {(member.fullName || member.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineStatus isOnline={member.isOnline} size="sm" />
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {member.fullName || member.email}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                {member.activityCount > 0 && (
                  <>
                    <Dot className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-500">
                      {member.activityCount} activities
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {member.isOnline ? (
              <span className="text-xs text-green-600 font-medium">Online</span>
            ) : (
              <span className="text-xs text-gray-400">Offline</span>
            )}
          </div>
        </motion.div>
      ))}

      {remainingCount > 0 && (
        <motion.div
          className="text-center py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: maxDisplay * 0.1 }}
        >
          <span className="text-sm text-gray-500">
            +{remainingCount} more members
          </span>
        </motion.div>
      )}
    </div>
  )
}

export default ActivityIndicator