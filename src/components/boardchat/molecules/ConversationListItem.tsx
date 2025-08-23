'use client'

import React, { useCallback } from 'react'
import { ConversationAvatar } from '../atoms/ConversationAvatar'
import { ChatBadge } from '../atoms/ChatBadge'
import type { ChatConversation } from '@/hooks/useBoardChat'

interface ConversationListItemProps {
  conversation: ChatConversation
  isActive: boolean
  onClick: (conversationId: string) => void
}

export const ConversationListItem = React.memo<ConversationListItemProps>(function ConversationListItem({ 
  conversation, 
  isActive, 
  onClick 
}) {
  const handleClick = useCallback(() => {
    onClick(conversation.id)
  }, [conversation.id, onClick])

  const displayName = conversation.conversation_type === 'direct'
    ? conversation.other_participant_name || 'Direct Message'
    : conversation.name || 'Group Chat'

  const lastMessagePreview = conversation.last_message_content?.substring(0, 20) || 'No messages'

  return (
    <button
      onClick={handleClick}
      className={`w-full p-2 rounded-lg text-left transition-colors relative ${
        isActive
          ? 'bg-blue-100 border-blue-200'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <ConversationAvatar
          type={conversation.conversation_type}
          avatarUrl={conversation.other_participant_avatar}
          name={conversation.other_participant_name}
        />
      </div>
      
      <div className="mt-1">
        <div className="text-xs font-medium truncate">
          {displayName}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {lastMessagePreview}
        </div>
        
        {conversation.unread_count > 0 && (
          <div className="absolute -top-1 -right-1">
            <ChatBadge count={conversation.unread_count} />
          </div>
        )}
      </div>
    </button>
  )
})

ConversationListItem.displayName = 'ConversationListItem'