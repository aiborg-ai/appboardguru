'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'

interface ChatBadgeProps {
  count: number
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  maxCount?: number
  className?: string
}

export const ChatBadge = React.memo<ChatBadgeProps>(function ChatBadge({ 
  count, 
  variant = 'destructive',
  maxCount = 99,
  className 
}) {
  if (count <= 0) return null

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  return (
    <Badge 
      variant={variant} 
      className={`px-1 py-0 text-xs min-w-[16px] h-4 ${className || ''}`}
    >
      {displayCount}
    </Badge>
  )
})

ChatBadge.displayName = 'ChatBadge'