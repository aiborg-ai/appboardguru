'use client'

import React, { useCallback } from 'react'
import { 
  MessageCircle, 
  Bell, 
  Activity 
} from 'lucide-react'
import { ChatTabButton } from '../molecules/ChatTabButton'

type ChatTab = 'chat' | 'notifications' | 'logs'

interface ChatTabNavigationProps {
  activeTab: ChatTab
  onTabChange: (tab: ChatTab) => void
  chatUnreadCount?: number
  notificationUnreadCount?: number
}

export const ChatTabNavigation = React.memo<ChatTabNavigationProps>(function ChatTabNavigation({ 
  activeTab, 
  onTabChange, 
  chatUnreadCount = 0, 
  notificationUnreadCount = 0 
}) {
  const handleTabChange = useCallback((tab: ChatTab) => {
    onTabChange(tab)
  }, [onTabChange])

  return (
    <div className="flex gap-1 mb-3">
      <ChatTabButton
        icon={MessageCircle}
        label="Chat"
        isActive={activeTab === 'chat'}
        unreadCount={chatUnreadCount}
        onClick={() => handleTabChange('chat')}
      />
      
      <ChatTabButton
        icon={Bell}
        label="Alerts"
        isActive={activeTab === 'notifications'}
        unreadCount={notificationUnreadCount}
        onClick={() => handleTabChange('notifications')}
      />
      
      <ChatTabButton
        icon={Activity}
        label="Logs"
        isActive={activeTab === 'logs'}
        onClick={() => handleTabChange('logs')}
      />
    </div>
  )
})

ChatTabNavigation.displayName = 'ChatTabNavigation'