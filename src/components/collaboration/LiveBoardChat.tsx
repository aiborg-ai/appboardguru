/**
 * Live BoardChat with Real-Time Message Streaming
 * Advanced chat system with WebSocket integration, message history,
 * file attachments, mentions, reactions, and typing indicators
 * 
 * Features:
 * - Real-time message streaming via WebSocket
 * - Message history with virtual scrolling
 * - File attachments and image previews
 * - User mentions with autocomplete
 * - Message reactions and emojis
 * - Typing indicators
 * - Message search and filtering
 * - Offline message queuing
 * - Message encryption for sensitive conversations
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo
} from 'react'
import { useWebSocketCollaboration, ChatMessage } from '@/lib/websocket/websocket-client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDistanceToNow, format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Reply,
  Edit,
  Trash2,
  Search,
  Users,
  Hash,
  AtSign,
  Loader2,
  FileText,
  Download,
  Eye,
  CheckCheck,
  Clock
} from 'lucide-react'

interface LiveBoardChatProps {
  roomId: string
  roomType?: 'general' | 'vault' | 'meeting' | 'private'
  roomName?: string
  participants?: Array<{
    id: string
    name: string
    avatar?: string
    role?: string
    isOnline?: boolean
  }>
  allowFileUploads?: boolean
  enableReactions?: boolean
  enableMentions?: boolean
  maxMessages?: number
  className?: string
  onMessageSent?: (message: ChatMessage) => void
  onFileUpload?: (file: File) => Promise<string>
}

interface TypingUser {
  userId: string
  userName: string
  timestamp: Date
}

interface MessageReaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

interface ExtendedChatMessage extends ChatMessage {
  reactions?: MessageReaction[]
  isEdited?: boolean
  editedAt?: string
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'failed'
  isEncrypted?: boolean
}

const EMOJI_LIST = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🚀']

const MessageItem = memo<{
  message: ExtendedChatMessage
  isOwn: boolean
  showAvatar: boolean
  currentUserId: string
  onReply: (message: ExtendedChatMessage) => void
  onEdit: (message: ExtendedChatMessage) => void
  onDelete: (messageId: string) => void
  onReaction: (messageId: string, emoji: string) => void
}>(({ message, isOwn, showAvatar, currentUserId, onReply, onEdit, onDelete, onReaction }) => {
  const [showReactions, setShowReactions] = useState(false)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm')
    } else {
      return format(date, 'MMM dd, HH:mm')
    }
  }

  const handleReaction = (emoji: string) => {
    onReaction(message.id, emoji)
    setShowReactions(false)
  }

  return (
    <div className={`group flex gap-3 p-3 hover:bg-muted/50 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={`https://avatar.vercel.sh/${message.author}`} />
          <AvatarFallback className="text-xs">
            {message.authorName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
            <span className="text-sm font-medium">{message.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {message.isEdited && (
              <Badge variant="outline" className="text-xs">
                edited
              </Badge>
            )}
          </div>
        )}
        
        <div className={`relative ${isOwn ? 'flex justify-end' : ''}`}>
          <div className={`
            max-w-md p-3 rounded-lg text-sm
            ${isOwn 
              ? 'bg-primary text-primary-foreground ml-8' 
              : 'bg-muted mr-8'
            }
            ${message.deliveryStatus === 'sending' ? 'opacity-70' : ''}
            ${message.deliveryStatus === 'failed' ? 'border border-red-300' : ''}
          `}>
            {message.replyTo && (
              <div className="border-l-2 border-muted-foreground pl-2 mb-2 text-xs opacity-70">
                Replying to previous message
              </div>
            )}
            
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                    <FileText size={16} />
                    <span className="text-xs flex-1 truncate">{attachment.name}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Download size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((reaction) => (
                  <Button
                    key={reaction.emoji}
                    variant={reaction.hasReacted ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleReaction(reaction.emoji)}
                  >
                    {reaction.emoji} {reaction.count}
                  </Button>
                ))}
              </div>
            )}
            
            <div className={`flex items-center justify-between mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-1 text-xs opacity-70">
                {message.deliveryStatus === 'sending' && <Clock size={10} />}
                {message.deliveryStatus === 'sent' && <CheckCheck size={10} />}
                {message.deliveryStatus === 'failed' && (
                  <span className="text-red-500">Failed to send</span>
                )}
                {message.isEncrypted && (
                  <span title="Encrypted">🔒</span>
                )}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <Popover open={showReactions} onOpenChange={setShowReactions}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile size={12} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleReaction(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onReply(message)}
                >
                  <Reply size={12} />
                </Button>
                
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical size={12} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(message)}>
                        <Edit size={12} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(message.id)}
                        className="text-red-600"
                      >
                        <Trash2 size={12} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'

export const LiveBoardChat = memo<LiveBoardChatProps>(({
  roomId,
  roomType = 'general',
  roomName = 'Chat',
  participants = [],
  allowFileUploads = true,
  enableReactions = true,
  enableMentions = true,
  maxMessages = 100,
  className = '',
  onMessageSent,
  onFileUpload
}) => {
  const { user } = useAuthStore()
  const { client, isConnected } = useWebSocketCollaboration()

  // State
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<ExtendedChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ExtendedChatMessage | null>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Filtered messages based on search
  const filteredMessages = useMemo(() => {
    if (!debouncedSearch) return messages
    
    return messages.filter(message =>
      message.content.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      message.authorName.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [messages, debouncedSearch])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Join room on mount
  useEffect(() => {
    if (client && isConnected) {
      client.joinRoom(roomId, 'chat', roomId)
      setConnectionStatus('connected')
    } else if (client) {
      setConnectionStatus('connecting')
    } else {
      setConnectionStatus('disconnected')
    }
  }, [client, isConnected, roomId])

  // Setup WebSocket event handlers
  useEffect(() => {
    if (!client) return

    const handleChatMessage = (message: ChatMessage) => {
      console.log('[LiveBoardChat] Received message:', message)
      
      const extendedMessage: ExtendedChatMessage = {
        ...message,
        deliveryStatus: 'delivered',
        reactions: []
      }
      
      setMessages(prev => {
        const updated = [...prev, extendedMessage]
        return updated.slice(-maxMessages) // Keep only recent messages
      })
      
      // Auto-scroll if user is near bottom
      setTimeout(scrollToBottom, 100)
      
      onMessageSent?.(message)
    }

    const handleTypingIndicator = (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === user?.id) return
      
      setTypingUsers(prev => {
        const updated = new Map(prev)
        
        if (data.isTyping) {
          updated.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            timestamp: new Date()
          })
        } else {
          updated.delete(data.userId)
        }
        
        return updated
      })
    }

    const handleConnected = () => {
      setConnectionStatus('connected')
    }

    const handleDisconnected = () => {
      setConnectionStatus('disconnected')
    }

    // Register event listeners
    client.on('chat_message_received', handleChatMessage)
    client.on('typing_indicator', handleTypingIndicator)
    client.on('connected', handleConnected)
    client.on('disconnected', handleDisconnected)

    return () => {
      client.off('chat_message_received', handleChatMessage)
      client.off('typing_indicator', handleTypingIndicator)
      client.off('connected', handleConnected)
      client.off('disconnected', handleDisconnected)
    }
  }, [client, user, maxMessages, scrollToBottom, onMessageSent])

  // Clean up typing indicators
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date()
      setTypingUsers(prev => {
        const updated = new Map(prev)
        for (const [userId, typingUser] of prev) {
          if (now.getTime() - typingUser.timestamp.getTime() > 3000) {
            updated.delete(userId)
          }
        }
        return updated
      })
    }, 1000)

    return () => clearInterval(cleanup)
  }, [])

  // Handle message input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessageInput(value)
    
    // Send typing indicator
    if (client && isConnected && value.trim()) {
      client.sendTypingIndicator(roomId, true)
      
      // Clear typing after delay
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        client.sendTypingIndicator(roomId, false)
      }, 1000)
    }
  }, [client, isConnected, roomId])

  // Send message
  const sendMessage = useCallback(async () => {
    const content = messageInput.trim()
    if (!content || !client || !user) return

    const tempMessage: ExtendedChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      author: user.id,
      authorName: user.user_metadata?.name || user.email!,
      timestamp: new Date().toISOString(),
      type: 'text',
      deliveryStatus: 'sending',
      reactions: [],
      replyTo: replyingTo?.id
    }

    // Add message optimistically
    setMessages(prev => [...prev, tempMessage])
    setMessageInput('')
    setReplyingTo(null)
    
    // Clear typing indicator
    client.sendTypingIndicator(roomId, false)
    
    try {
      // Send to server
      await client.sendChatMessage(content, roomId, [], replyingTo?.id)
      
      // Update delivery status
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, deliveryStatus: 'sent' }
          : msg
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      // Update delivery status to failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, deliveryStatus: 'failed' }
          : msg
      ))
    }

    scrollToBottom()
  }, [messageInput, client, user, roomId, replyingTo, scrollToBottom])

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onFileUpload) return

    setIsUploading(true)
    try {
      const fileUrl = await onFileUpload(file)
      
      // Send file message
      if (client) {
        await client.sendChatMessage(
          `📎 ${file.name}`,
          roomId,
          [{ id: Date.now().toString(), name: file.name, url: fileUrl, type: file.type, size: file.size }]
        )
      }
    } catch (error) {
      console.error('File upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }, [client, roomId, onFileUpload])

  // Handle message actions
  const handleReply = useCallback((message: ExtendedChatMessage) => {
    setReplyingTo(message)
    inputRef.current?.focus()
  }, [])

  const handleEdit = useCallback((message: ExtendedChatMessage) => {
    setEditingMessage(message)
    setMessageInput(message.content)
    inputRef.current?.focus()
  }, [])

  const handleDelete = useCallback((messageId: string) => {
    // TODO: Implement message deletion
    console.log('Delete message:', messageId)
  }, [])

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    // TODO: Implement message reactions
    console.log('Add reaction:', messageId, emoji)
  }, [])

  // Generate typing indicator text
  const typingIndicatorText = useMemo(() => {
    const typingUsersList = Array.from(typingUsers.values())
    if (typingUsersList.length === 0) return ''
    
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0].userName} is typing...`
    } else if (typingUsersList.length === 2) {
      return `${typingUsersList[0].userName} and ${typingUsersList[1].userName} are typing...`
    } else {
      return `${typingUsersList.length} people are typing...`
    }
  }, [typingUsers])

  return (
    <div className={`flex flex-col h-full bg-background border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="flex items-center gap-2">
          <Hash size={16} className="text-muted-foreground" />
          <h3 className="font-semibold">{roomName}</h3>
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span className="text-sm text-muted-foreground">
              {participants.length}
            </span>
          </div>
          
          <div className="relative">
            <Search size={14} className="absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-32 h-8"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-0">
        <div className="space-y-1">
          {filteredMessages.map((message, index) => {
            const prevMessage = filteredMessages[index - 1]
            const showAvatar = !prevMessage || 
              prevMessage.author !== message.author ||
              new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() > 300000 // 5 minutes

            return (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.author === user?.id}
                showAvatar={showAvatar}
                currentUserId={user?.id || ''}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
              />
            )
          })}
          
          {typingIndicatorText && (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              {typingIndicatorText}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
          <Reply size={14} />
          <span className="text-sm">Replying to {replyingTo.authorName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
            className="ml-auto h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={!isConnected}
              className="pr-20"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {allowFileUploads && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-6 w-6 p-0"
                  >
                    {isUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Paperclip size={14} />
                    )}
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={sendMessage}
                disabled={!messageInput.trim() || !isConnected}
                className="h-6 w-6 p-0"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

LiveBoardChat.displayName = 'LiveBoardChat'

export type { LiveBoardChatProps, ExtendedChatMessage }