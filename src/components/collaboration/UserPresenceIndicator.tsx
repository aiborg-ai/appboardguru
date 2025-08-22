/**
 * UserPresenceIndicator - Atomic Design Component
 * Shows user presence status with avatar and real-time updates
 */

'use client'

import React, { memo } from 'react'
import { cn } from '../../lib/utils'
import type { UserPresence } from '../../types/websocket'

// Props interface following CLAUDE.md naming conventions
interface UserPresenceIndicatorProps {
  presence: UserPresence
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showLastSeen?: boolean
  className?: string
  onClick?: (userId: string) => void
}

/**
 * Presence status colors following design system
 */
const PRESENCE_COLORS = {
  online: 'bg-green-500',
  away: 'bg-yellow-500', 
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
} as const

const PRESENCE_LABELS = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy', 
  offline: 'Offline'
} as const

/**
 * Size variants for presence indicator
 */
const SIZE_VARIANTS = {
  sm: {
    container: 'flex items-center gap-1',
    avatar: 'w-6 h-6',
    indicator: 'w-2 h-2',
    text: 'text-xs',
    name: 'max-w-[80px]'
  },
  md: {
    container: 'flex items-center gap-2',
    avatar: 'w-8 h-8', 
    indicator: 'w-2.5 h-2.5',
    text: 'text-sm',
    name: 'max-w-[120px]'
  },
  lg: {
    container: 'flex items-center gap-3',
    avatar: 'w-10 h-10',
    indicator: 'w-3 h-3', 
    text: 'text-base',
    name: 'max-w-[160px]'
  }
} as const

/**
 * UserPresenceIndicator Component
 * Optimized with React.memo following CLAUDE.md performance guidelines
 */
export const UserPresenceIndicator = memo(function UserPresenceIndicator({
  presence,
  size = 'md',
  showName = true,
  showLastSeen = false,
  className,
  onClick
}: UserPresenceIndicatorProps) {
  const variant = SIZE_VARIANTS[size]
  
  // Format last seen time
  const formatLastSeen = (lastSeen: string): string => {
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  // Get display name from metadata
  const displayName = presence.metadata?.displayName as string || 
                     presence.userId.substring(0, 8) || 
                     'Unknown User'

  // Get avatar URL from metadata  
  const avatarUrl = presence.metadata?.avatarUrl as string

  return (
    <div
      className={cn(
        variant.container,
        'relative cursor-pointer transition-opacity',
        'hover:opacity-80',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={() => onClick?.(presence.userId)}
      title={`${displayName} - ${PRESENCE_LABELS[presence.status]}${
        showLastSeen ? ` (${formatLastSeen(presence.lastSeen)})` : ''
      }`}
    >
      {/* User Avatar */}
      <div className={cn('relative', variant.avatar)}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={cn(
              variant.avatar,
              'rounded-full object-cover border border-gray-200'
            )}
          />
        ) : (
          <div
            className={cn(
              variant.avatar,
              'rounded-full bg-gray-300 flex items-center justify-center',
              'text-gray-700 font-medium',
              variant.text
            )}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Presence Status Indicator */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white',
            variant.indicator,
            PRESENCE_COLORS[presence.status]
          )}
          aria-label={`Status: ${PRESENCE_LABELS[presence.status]}`}
        />
      </div>

      {/* User Info */}
      {(showName || showLastSeen) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span
              className={cn(
                'truncate font-medium text-gray-900',
                variant.text,
                variant.name
              )}
            >
              {displayName}
            </span>
          )}
          
          {showLastSeen && (
            <span
              className={cn(
                'text-gray-500 truncate',
                size === 'sm' ? 'text-xs' : 'text-xs'
              )}
            >
              {formatLastSeen(presence.lastSeen)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.presence.userId === nextProps.presence.userId &&
    prevProps.presence.status === nextProps.presence.status &&
    prevProps.presence.lastSeen === nextProps.presence.lastSeen &&
    prevProps.size === nextProps.size &&
    prevProps.showName === nextProps.showName &&
    prevProps.showLastSeen === nextProps.showLastSeen &&
    prevProps.className === nextProps.className
  )
})

export type { UserPresenceIndicatorProps }