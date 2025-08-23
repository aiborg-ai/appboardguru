'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChatIcon } from './ChatIcon'

type ConversationType = 'direct' | 'vault_group' | 'group'

interface ConversationAvatarProps {
  type: ConversationType
  avatarUrl?: string | null
  name?: string | null
  className?: string
}

export const ConversationAvatar = React.memo<ConversationAvatarProps>(function ConversationAvatar({ 
  type, 
  avatarUrl, 
  name,
  className = 'h-6 w-6'
}) {
  if (type === 'direct' && avatarUrl) {
    return (
      <Avatar className={className}>
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-xs">
          {name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className={`bg-blue-100 rounded-full flex items-center justify-center ${className}`}>
      <ChatIcon type={type} className="h-3 w-3" />
    </div>
  )
})

ConversationAvatar.displayName = 'ConversationAvatar'