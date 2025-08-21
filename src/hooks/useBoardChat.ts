'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types for BoardChat
export interface ChatConversation {
  id: string
  name?: string
  conversation_type: 'direct' | 'group' | 'vault_group'
  vault_id?: string
  is_private: boolean
  last_message_content?: string
  last_message_at: string
  unread_count: number
  total_participants: number
  other_participant_name?: string
  other_participant_avatar?: string
  participants: ChatParticipant[]
}

export interface ChatParticipant {
  id: string
  name: string
  role: 'admin' | 'moderator' | 'member'
  avatar?: string
  status: 'active' | 'muted' | 'left' | 'removed'
  last_read_at?: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'system' | 'reply' | 'forward'
  reply_to_message_id?: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
  is_edited: boolean
  is_deleted: boolean
  delivered_at: string
  read_by: string[]
  mentions: string[]
  reactions: ChatReaction[]
  created_at: string
  updated_at: string
}

export interface ChatReaction {
  emoji: string
  count: number
  users: string[]
}

export interface SendMessageData {
  content: string
  message_type?: 'text' | 'file' | 'image' | 'reply'
  reply_to_message_id?: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
  mentions?: string[]
}

export interface CreateConversationData {
  name?: string
  description?: string
  conversation_type: 'direct' | 'group' | 'vault_group'
  vault_id?: string
  participant_ids: string[]
  is_private?: boolean
}

// API functions
async function fetchConversations(): Promise<{
  conversations: ChatConversation[]
  total_unread: number
}> {
  const response = await fetch('/api/boardchat/conversations')
  if (!response.ok) {
    throw new Error('Failed to fetch conversations')
  }
  return response.json()
}

async function fetchMessages(
  conversationId: string,
  limit = 50,
  before?: string,
  after?: string
): Promise<{
  messages: ChatMessage[]
  has_more: boolean
}> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (before) params.set('before', before)
  if (after) params.set('after', after)

  const response = await fetch(`/api/boardchat/conversations/${conversationId}/messages?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }
  return response.json()
}

async function sendMessage(
  conversationId: string,
  messageData: SendMessageData
): Promise<{ message: ChatMessage }> {
  const response = await fetch(`/api/boardchat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messageData)
  })

  if (!response.ok) {
    throw new Error('Failed to send message')
  }
  return response.json()
}

async function createConversation(data: CreateConversationData): Promise<{
  conversation: ChatConversation
  participants: ChatParticipant[]
}> {
  const response = await fetch('/api/boardchat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to create conversation')
  }
  return response.json()
}

async function markAsRead(conversationId: string, messageId?: string): Promise<void> {
  const response = await fetch(`/api/boardchat/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId })
  })

  if (!response.ok) {
    throw new Error('Failed to mark as read')
  }
}

// Main BoardChat hook
export function useBoardChat() {
  const queryClient = useQueryClient()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState<{ [conversationId: string]: string[] }>({})

  // Fetch conversations
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['boardchat', 'conversations'],
    queryFn: fetchConversations,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // 1 minute for real-time updates
  })

  // Fetch messages for active conversation
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['boardchat', 'messages', activeConversationId],
    queryFn: () => activeConversationId ? fetchMessages(activeConversationId) : Promise.resolve({ messages: [], has_more: false }),
    enabled: !!activeConversationId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000 // 15 seconds for real-time
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageData }: { 
      conversationId: string
      messageData: SendMessageData 
    }) => sendMessage(conversationId, messageData),
    onSuccess: (result, variables) => {
      // Add message to local cache immediately
      queryClient.setQueryData(
        ['boardchat', 'messages', variables.conversationId],
        (old: any) => ({
          ...old,
          messages: [...(old?.messages || []), result.message]
        })
      )
      
      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['boardchat', 'conversations'] })
    }
  })

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (result) => {
      // Add to conversations list
      queryClient.invalidateQueries({ queryKey: ['boardchat', 'conversations'] })
      
      // Auto-select the new conversation
      setActiveConversationId(result.conversation.id)
    }
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { 
      conversationId: string
      messageId?: string 
    }) => markAsRead(conversationId, messageId),
    onSuccess: (_, variables) => {
      // Update conversation unread count
      queryClient.setQueryData(
        ['boardchat', 'conversations'],
        (old: any) => ({
          ...old,
          conversations: old?.conversations?.map((conv: ChatConversation) =>
            conv.id === variables.conversationId
              ? { ...conv, unread_count: 0 }
              : conv
          ) || []
        })
      )
    }
  })

  // Convenience functions
  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId)
    
    // Mark as read when opening conversation
    markAsReadMutation.mutate({ conversationId })
  }, [markAsReadMutation])

  const sendChatMessage = useCallback((
    conversationId: string,
    content: string,
    options: Partial<SendMessageData> = {}
  ) => {
    if (!content.trim()) return

    const messageData: SendMessageData = {
      content: content.trim(),
      message_type: 'text',
      ...options
    }

    sendMessageMutation.mutate({ conversationId, messageData })
  }, [sendMessageMutation])

  const createDirectMessage = useCallback((targetUserId: string) => {
    createConversationMutation.mutate({
      conversation_type: 'direct',
      participant_ids: [targetUserId]
    })
  }, [createConversationMutation])

  const createGroupChat = useCallback((
    name: string,
    participantIds: string[],
    description?: string,
    vaultId?: string
  ) => {
    createConversationMutation.mutate({
      name,
      description,
      conversation_type: vaultId ? 'vault_group' : 'group',
      vault_id: vaultId,
      participant_ids: participantIds,
      is_private: !!vaultId // Vault groups are private by default
    })
  }, [createConversationMutation])

  // Real-time typing indicators (would use WebSocket in real implementation)
  const updateTypingStatus = useCallback((conversationId: string, isTyping: boolean) => {
    // In real implementation, this would send typing status via WebSocket
    console.log(`User typing in ${conversationId}:`, isTyping)
  }, [])

  return {
    // Data
    conversations: conversationsData?.conversations || [],
    messages: messagesData?.messages || [],
    activeConversationId,
    totalUnread: conversationsData?.total_unread || 0,
    hasMoreMessages: messagesData?.has_more || false,
    
    // Loading states
    isLoading: conversationsLoading || messagesLoading,
    conversationsLoading,
    messagesLoading,
    
    // Error states
    error: conversationsError || messagesError,
    conversationsError,
    messagesError,
    
    // Actions
    selectConversation,
    sendChatMessage,
    createDirectMessage,
    createGroupChat,
    updateTypingStatus,
    refetchConversations,
    refetchMessages,
    
    // Mutation states
    isSendingMessage: sendMessageMutation.isPending,
    isCreatingConversation: createConversationMutation.isPending,
    isMarkingRead: markAsReadMutation.isPending,
    
    // Mutation functions for advanced usage
    sendMessage: sendMessageMutation.mutate,
    createConversation: createConversationMutation.mutate,
    markAsRead: markAsReadMutation.mutate
  }
}

// Specialized hooks for specific chat features
export function useChatConversations() {
  const { 
    conversations, 
    totalUnread, 
    conversationsLoading, 
    conversationsError, 
    refetchConversations 
  } = useBoardChat()
  
  return {
    conversations,
    totalUnread,
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations
  }
}

export function useChatMessages(conversationId: string | null) {
  const { 
    messages, 
    messagesLoading, 
    messagesError, 
    hasMoreMessages,
    sendChatMessage,
    isSendingMessage 
  } = useBoardChat()
  
  return {
    messages: conversationId ? messages : [],
    isLoading: messagesLoading,
    error: messagesError,
    hasMore: hasMoreMessages,
    sendMessage: (content: string, options?: Partial<SendMessageData>) => 
      conversationId ? sendChatMessage(conversationId, content, options) : null,
    isSending: isSendingMessage
  }
}

export function useChatNotifications() {
  const { totalUnread, conversations } = useBoardChat()
  
  // Get unread conversations
  const unreadConversations = conversations.filter(conv => conv.unread_count > 0)
  
  // Get direct message notifications
  const directMessageNotifications = unreadConversations.filter(
    conv => conv.conversation_type === 'direct'
  )
  
  // Get group notifications
  const groupNotifications = unreadConversations.filter(
    conv => conv.conversation_type === 'group' || conv.conversation_type === 'vault_group'
  )
  
  return {
    totalUnread,
    unreadConversations,
    directMessageNotifications,
    groupNotifications,
    hasNotifications: totalUnread > 0
  }
}