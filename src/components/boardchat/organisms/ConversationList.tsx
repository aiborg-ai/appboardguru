'use client'

import React, { useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle } from 'lucide-react'
import { ConversationListItem } from '../molecules/ConversationListItem'
import type { ChatConversation } from '@/hooks/useBoardChat'

interface ConversationListProps {
  conversations: ChatConversation[]
  activeConversationId?: string | null
  onSelectConversation: (conversationId: string) => void
  isLoading?: boolean
}

export const ConversationList = React.memo<ConversationListProps>(function ConversationList({ 
  conversations, 
  activeConversationId, 
  onSelectConversation,
  isLoading = false
}) {
  const handleSelectConversation = useCallback((conversationId: string) => {
    onSelectConversation(conversationId)
  }, [onSelectConversation])

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-2 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </ScrollArea>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No conversations</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            isActive={activeConversationId === conversation.id}
            onClick={handleSelectConversation}
          />
        ))}
      </div>
    </ScrollArea>
  )
})

ConversationList.displayName = 'ConversationList'