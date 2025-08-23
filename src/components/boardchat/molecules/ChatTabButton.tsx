'use client'

import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChatBadge } from '../atoms/ChatBadge'
import type { LucideIcon } from 'lucide-react'

interface ChatTabButtonProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  unreadCount?: number
  onClick: () => void
  className?: string
}

export const ChatTabButton = React.memo<ChatTabButtonProps>(function ChatTabButton({ 
  icon: Icon, 
  label, 
  isActive, 
  unreadCount = 0, 
  onClick,
  className = 'flex-1'
}) {
  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <Icon className="h-4 w-4 mr-1" />
      {label}
      {unreadCount > 0 && (
        <div className="ml-1">
          <ChatBadge count={unreadCount} />
        </div>
      )}
    </Button>
  )
})

ChatTabButton.displayName = 'ChatTabButton'