'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle } from 'lucide-react'
import { useChatNotifications } from '@/hooks/useBoardChat'
import BoardChatPanel from './BoardChatPanel'

/**
 * BoardChat floating button and panel
 * Shows unread message count and opens chat interface
 */
const BoardChatButton = React.memo(() => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { totalUnread, hasNotifications } = useChatNotifications()

  const toggleChat = useCallback(() => {
    setIsChatOpen(!isChatOpen)
  }, [isChatOpen])

  return (
    <>
      {/* Floating Chat Button */}
      {!isChatOpen && (
        <Button
          onClick={toggleChat}
          className="fixed bottom-6 right-24 z-40 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          BoardChat
          {hasNotifications && (
            <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs min-w-[20px] h-5">
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      )}

      {/* Chat Panel */}
      <BoardChatPanel isOpen={isChatOpen} onToggle={toggleChat} />
    </>
  )
}

})

BoardChatButton.displayName = 'BoardChatButton'

export default BoardChatButton