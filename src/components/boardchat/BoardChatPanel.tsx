'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRenderPerformance } from '@/hooks/useRenderPerformance'
import type { NotificationPayload } from '@/types/entities/activity.types'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Input } from '@/components/atoms/form/input'
import { Separator } from '@/components/atoms/display/separator'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { VoiceInputButton } from '@/features/shared/ui/VoiceInputButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/features/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import {
  MessageCircle,
  Send,
  Plus,
  Users,
  MoreVertical,
  Paperclip,
  Smile,
  Search,
  Phone,
  Video,
  Settings,
  Archive,
  UserPlus,
  Hash,
  Lock,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Download,
  Reply,
  Trash2,
  Bell,
  Activity,
  AlertCircle,
  Calendar,
  Shield,
  User
} from 'lucide-react'
import { useBoardChat, ChatConversation, ChatMessage } from '@/hooks/useBoardChat'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'

// Atomic Design Components
import { ChatBadge, ConversationAvatar } from './atoms'
import { MessageInput } from './molecules'
import { ConversationList, ChatTabNavigation } from './organisms'

interface BoardChatPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const BoardChatPanel = React.memo<BoardChatPanelProps>(({ isOpen, onToggle }) => {
  // Performance monitoring
  useRenderPerformance('BoardChatPanel', { isOpen })

  const {
    conversations,
    messages,
    activeConversationId,
    totalUnread,
    selectConversation,
    sendChatMessage,
    createDirectMessage,
    createGroupChat,
    isLoading,
    isSendingMessage
  } = useBoardChat()

  const { counts: notificationCounts } = useNotifications({ autoRefresh: true })

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatType, setNewChatType] = useState<'direct' | 'group'>('direct')
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications' | 'logs'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter conversations based on search (memoized)
  const filteredConversations = useMemo(() => 
    conversations.filter(conv =>
      conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [conversations, searchQuery]
  )

  const activeConversation = useMemo(() => 
    conversations.find(conv => conv.id === activeConversationId),
    [conversations, activeConversationId]
  )

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !activeConversationId) return
    
    sendChatMessage(activeConversationId, newMessage)
    setNewMessage('')
  }, [newMessage, activeConversationId, sendChatMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const getConversationDisplayName = useCallback((conv: ChatConversation) => {
    if (conv.conversation_type === 'direct') {
      return conv.other_participant_name || 'Direct Message'
    }
    return conv.name || 'Group Chat'
  }, [])

  const getConversationIcon = useCallback((conv: ChatConversation) => {
    switch (conv.conversation_type) {
      case 'direct':
        return <MessageSquare className="h-4 w-4" />
      case 'vault_group':
        return <Lock className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }, [])

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-24 z-50 shadow-lg"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        BoardChat
        {totalUnread > 0 && (
          <div className="ml-2">
            <ChatBadge count={totalUnread} className="min-w-[20px] h-5" />
          </div>
        )}
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-24 w-96 h-[600px] z-50 shadow-xl border-2 flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Board Hub
            <ChatBadge count={totalUnread + notificationCounts.unread} />
          </CardTitle>
          <div className="flex items-center gap-1">
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Chat</DialogTitle>
                  <DialogDescription>
                    Create a new conversation with BoardMates or vault members
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={newChatType === 'direct' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewChatType('direct')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Direct
                    </Button>
                    <Button
                      variant={newChatType === 'group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewChatType('group')}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Group
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {newChatType === 'direct' 
                      ? 'Send a private message to another board member'
                      : 'Create a group conversation for multiple members'
                    }
                  </p>
                  <Button className="w-full" disabled>
                    {newChatType === 'direct' ? 'Select BoardMate' : 'Select Members'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <ChatTabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          chatUnreadCount={totalUnread}
          notificationUnreadCount={notificationCounts.unread}
        />
        
        {/* Search - Only show for chat and notifications */}
        {(activeTab === 'chat' || activeTab === 'notifications') && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-8"
          />
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
            <VoiceInputButton
              onTranscription={(text) => setSearchQuery(prev => prev + (prev ? ' ' : '') + text)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            />
          </div>
        </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex min-h-0 p-0">
        {activeTab === 'chat' && (
        <>
        {/* Conversations List */}
        <div className="w-32 border-r flex-shrink-0">
          <ConversationList
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  <ConversationAvatar
                    type={activeConversation.conversation_type}
                    avatarUrl={activeConversation.other_participant_avatar}
                    name={activeConversation.other_participant_name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {getConversationDisplayName(activeConversation)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {activeConversation.total_participants} members
                      {activeConversation.conversation_type === 'vault_group' && (
                        <span className="ml-1">• Vault Group</span>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Members
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessageComponent 
                      key={message.id} 
                      message={message}
                      isOwn={message.sender_id === 'current-user'} // Would use actual user ID
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <MessageInput
                message={newMessage}
                onMessageChange={setNewMessage}
                onSend={handleSendMessage}
                onKeyPress={handleKeyPress}
                onVoiceTranscription={(text) => setNewMessage(prev => prev + (prev ? ' ' : '') + text)}
                isDisabled={isSendingMessage}
              />
            </>
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to BoardChat</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a conversation to start messaging with BoardMates
                </p>
                <Button onClick={() => setShowNewChatDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {activeTab === 'notifications' && (
          <NotificationsContent />
        )}

        {activeTab === 'logs' && (
          <LogsContent />
        )}
      </CardContent>
    </Card>
  )
})

// Chat Message Component
interface ChatMessageComponentProps {
  message: ChatMessage
  isOwn: boolean
}

const ChatMessageComponent = React.memo<ChatMessageComponentProps>(({ message, isOwn }) => {
  const [showActions, setShowActions] = useState(false)

  const handleMouseEnter = useCallback(() => setShowActions(true), [])
  const handleMouseLeave = useCallback(() => setShowActions(false), [])
  
  const messageTime = useMemo(() => 
    formatDistanceToNow(new Date(message.created_at), { addSuffix: true }),
    [message.created_at]
  )
  
  const senderInitial = useMemo(() => 
    message.sender_name.charAt(0),
    [message.sender_name]
  )

  return (
    <div 
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      {!isOwn && (
        <Avatar className="h-6 w-6 mt-1">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="text-xs">
            {senderInitial}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender Name & Time */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">
              {message.sender_name}
            </span>
            <span className="text-xs text-gray-500">
              {messageTime}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative group ${isOwn ? 'ml-auto' : ''}`}>
          <div className={`
            rounded-lg px-3 py-2 max-w-full break-words
            ${isOwn 
              ? 'bg-blue-600 text-white' 
              : message.message_type === 'system' 
                ? 'bg-gray-100 text-gray-600 italic' 
                : 'bg-gray-100 text-gray-900'
            }
            ${message.message_type === 'file' ? 'border border-gray-200' : ''}
          `}>
            {/* Reply Context */}
            {message.reply_to_message_id && (
              <div className="mb-2 p-2 bg-black/10 rounded text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <Reply className="h-3 w-3" />
                  <span className="font-medium">Replying to message</span>
                </div>
              </div>
            )}

            {/* File Message */}
            {message.message_type === 'file' && (
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{message.file_name}</div>
                  <div className="text-xs opacity-75">
                    {message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(1)} MB` : 'File'}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Message Text */}
            <div className="text-sm">{message.content}</div>

            {/* Message Actions */}
            {showActions && (
              <div className={`
                absolute top-0 flex items-center gap-1 p-1 bg-white rounded shadow-lg border
                ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}
              `}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Reply className="h-3 w-3" />
                </Button>
                {isOwn && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs bg-white border"
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </div>
          )}

          {/* Own Message Time */}
          {isOwn && (
            <div className="text-xs text-gray-500 mt-1 text-right">
              {messageTime}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ChatMessageComponent.displayName = 'ChatMessageComponent'

// Notifications Content Component
const NotificationsContent = React.memo(() => {
  const {
    notifications,
    counts,
    loading,
    error,
    hasMore,
    markAsRead,
    archiveNotification,
    loadMore
  } = useNotifications({ limit: 20, autoRefresh: true })

  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])

  const handleNotificationClick = useCallback(async (notification: NotificationPayload) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id)
    }
    if (notification.action_url) {
      window.open(notification.action_url, '_blank')
    }
  }, [markAsRead])

  const getNotificationIcon = (notification: NotificationPayload) => {
    switch (notification.type) {
      case 'meeting': return <Calendar className="h-4 w-4" />
      case 'chat': return <MessageSquare className="h-4 w-4" />
      case 'asset': 
      case 'vault': return <FileText className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'user': return <User className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Notifications ({counts.unread} unread)
          </h3>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  notification.status === 'unread' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded-full ${getPriorityColor(notification.priority || 'medium')}`}>
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      {notification.status === 'unread' && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at || new Date()), { addSuffix: true })}
                      </span>
                      {notification.priority !== 'medium' && (
                        <Badge 
                          variant="outline" 
                          className={`px-1 py-0 text-xs ${getPriorityColor(notification.priority || 'medium')}`}
                        >
                          {notification.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="text-center py-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-sm text-gray-500">
              You're all caught up! No new notifications.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
})

// Logs Content Component  
const LogsContent: React.FC = () => {
  const [logs] = useState([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'system',
      action: 'User Login',
      description: 'User logged in successfully',
      user: 'John Doe',
      severity: 'info'
    },
    {
      id: '2', 
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'asset',
      action: 'File Upload',
      description: 'Board pack uploaded: Q3 Financial Report',
      user: 'Jane Smith',
      severity: 'info'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'security',
      action: 'Failed Login',
      description: 'Multiple failed login attempts detected',
      user: 'Unknown',
      severity: 'warning'
    }
  ])

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'system': return <Settings className="h-4 w-4" />
      case 'asset': return <FileText className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'user': return <User className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600'
      case 'warning': return 'text-orange-600'
      case 'info': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Activity Logs
          </h3>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-full ${getSeverityColor(log.severity)}`}>
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {log.action}
                    </h4>
                    <Badge variant="outline" className={`px-1 py-0 text-xs ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {log.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{log.user}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

BoardChatPanel.displayName = 'BoardChatPanel'

export default BoardChatPanel