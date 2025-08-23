'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationsPanel from './NotificationsPanel'

const NotificationsButton: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { counts } = useNotifications({ autoRefresh: true })

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen)
  }

  return (
    <>
      {/* Floating Notifications Button */}
      {!isNotificationsOpen && (
        <Button
          onClick={toggleNotifications}
          className="fixed bottom-6 right-6 z-40 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
          {counts.unread > 0 && (
            <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs min-w-[20px] h-5">
              {counts.unread > 99 ? '99+' : counts.unread}
            </Badge>
          )}
        </Button>
      )}

      {/* Notifications Panel */}
      <NotificationsPanel isOpen={isNotificationsOpen} onToggle={toggleNotifications} />
    </>
  )
}

export default NotificationsButton