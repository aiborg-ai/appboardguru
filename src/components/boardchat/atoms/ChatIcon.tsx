'use client'

import React from 'react'
import { 
  MessageSquare, 
  Hash, 
  Lock, 
  MessageCircle 
} from 'lucide-react'

type ConversationType = 'direct' | 'vault_group' | 'group'

interface ChatIconProps {
  type: ConversationType
  className?: string
  size?: number
}

export const ChatIcon = React.memo<ChatIconProps>(function ChatIcon({ 
  type, 
  className = 'h-4 w-4',
  size 
}) {
  const iconProps = {
    className,
    ...(size && { size })
  }

  switch (type) {
    case 'direct':
      return <MessageSquare {...iconProps} />
    case 'vault_group':
      return <Lock {...iconProps} />
    case 'group':
      return <Hash {...iconProps} />
    default:
      return <MessageCircle {...iconProps} />
  }
})

ChatIcon.displayName = 'ChatIcon'