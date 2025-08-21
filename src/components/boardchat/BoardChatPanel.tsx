'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Trash2
} from 'lucide-react'
import { useBoardChat, ChatConversation, ChatMessage } from '@/hooks/useBoardChat'
import { formatDistanceToNow } from 'date-fns'

interface BoardChatPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const BoardChatPanel: React.FC<BoardChatPanelProps> = ({ isOpen, onToggle }) => {
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

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatType, setNewChatType] = useState<'direct' | 'group'>('direct')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeConversation = conversations.find(conv => conv.id === activeConversationId)

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversationId) return
    
    sendChatMessage(activeConversationId, newMessage)
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getConversationDisplayName = (conv: ChatConversation) => {
    if (conv.conversation_type === 'direct') {
      return conv.other_participant_name || 'Direct Message'
    }
    return conv.name || 'Group Chat'
  }

  const getConversationIcon = (conv: ChatConversation) => {
    switch (conv.conversation_type) {
      case 'direct':
        return <MessageSquare className="h-4 w-4" />
      case 'vault_group':
        return <Lock className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

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
          <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs min-w-[20px] h-5">
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
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
            BoardChat
            {totalUnread > 0 && (
              <Badge variant="destructive" className="px-1 py-0 text-xs">
                {totalUnread}
              </Badge>
            )}
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
        
        {/* Search */}
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
      </CardHeader>

      <CardContent className="flex-1 flex min-h-0 p-0">
        {/* Conversations List */}
        <div className="w-32 border-r flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full p-2 rounded-lg text-left transition-colors relative ${
                      activeConversationId === conv.id
                        ? 'bg-blue-100 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {conv.conversation_type === 'direct' ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={conv.other_participant_avatar} />
                          <AvatarFallback className="text-xs">
                            {conv.other_participant_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                          {getConversationIcon(conv)}
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <div className="text-xs font-medium truncate">
                        {getConversationDisplayName(conv)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {conv.last_message_content?.substring(0, 20) || 'No messages'}
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 py-0 text-xs min-w-[18px] h-4">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No conversations</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  {activeConversation.conversation_type === 'direct' ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={activeConversation.other_participant_avatar} />
                      <AvatarFallback className="text-xs">
                        {activeConversation.other_participant_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                      {getConversationIcon(activeConversation)}
                    </div>
                  )}
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
              <div className="p-3 border-t bg-white">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pr-28"
                      disabled={isSendingMessage}
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <VoiceInputButton
                        onTranscription={(text) => setNewMessage(prev => prev + (prev ? ' ' : '') + text)}
                        disabled={isSendingMessage}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      />
                      <Button variant="ghost" size="sm">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSendingMessage}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Press Enter to send, Shift+Enter for new line
                </div>
              </div>
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
      </CardContent>
    </Card>
  )
}

// Chat Message Component
interface ChatMessageComponentProps {
  message: ChatMessage
  isOwn: boolean
}

const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message, isOwn }) => {
  const [showActions, setShowActions] = useState(false)

  return (
    <div 
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <Avatar className="h-6 w-6 mt-1">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="text-xs">
            {message.sender_name.charAt(0)}
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
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
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
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BoardChatPanel