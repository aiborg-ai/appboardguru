/**
 * Document Q&A Chat Component
 * Interactive chat interface for cross-document question answering with RAG
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { 
  Send, 
  Bot, 
  User, 
  FileText, 
  MessageCircle, 
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Filter,
  Search,
  Bookmark
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface QAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: Array<{
    documentId: string
    documentName: string
    page?: number
    relevanceScore: number
    snippet?: string
  }>
  citations?: Array<{
    documentId: string
    documentName: string
    quote: string
    page?: number
  }>
  confidence?: number
  feedback?: 'positive' | 'negative'
}

interface DocumentQAChatProps {
  documentIds?: string[]
  conversationId?: string
  onConversationUpdate?: (conversationId: string) => void
  className?: string
}

export default function DocumentQAChat({ 
  documentIds = [],
  conversationId,
  onConversationUpdate,
  className 
}: DocumentQAChatProps) {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(documentIds)
  const [conversations, setConversations] = useState<Array<{
    id: string
    lastQuery: string
    lastActivity: string
  }>>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversationId) {
      loadConversationHistory(conversationId)
    }
    loadConversations()
  }, [conversationId])

  const loadConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/document-intelligence/qa?operation=history&conversationId=${convId}`)
      const result = await response.json()
      
      if (result.success && result.data.interactions) {
        const formattedMessages: QAMessage[] = result.data.interactions.map((interaction: any) => [
          {
            id: `user_${interaction.id}`,
            role: 'user' as const,
            content: interaction.query,
            timestamp: interaction.created_at
          },
          {
            id: `assistant_${interaction.id}`,
            role: 'assistant' as const,
            content: interaction.answer,
            timestamp: interaction.created_at,
            confidence: interaction.confidence,
            sources: interaction.sources || []
          }
        ]).flat()
        
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/document-intelligence/qa?operation=conversations&limit=20')
      const result = await response.json()
      
      if (result.success) {
        setConversations(result.data.conversations)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: QAMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/document-intelligence/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentMessage,
          documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
          conversationId: conversationId,
          options: {
            maxSources: 10,
            includeMetadata: true,
            answerStyle: 'detailed',
            confidenceThreshold: 0.5
          }
        }),
      })

      const result = await response.json()

      if (result.success) {
        const assistantMessage: QAMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: result.data.answer,
          timestamp: new Date().toISOString(),
          sources: result.data.sources,
          citations: result.data.citations,
          confidence: result.data.confidence
        }

        setMessages(prev => [...prev, assistantMessage])

        // Update conversation ID if this is a new conversation
        if (!conversationId && result.data.conversationId) {
          onConversationUpdate?.(result.data.conversationId)
        }
      } else {
        // Add error message
        const errorMessage: QAMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${result.error}`,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: QAMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const provideFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback } 
          : msg
      )
    )

    // Send feedback to API
    try {
      await fetch('/api/document-intelligence/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          feedback,
          conversationId
        }),
      })
    } catch (error) {
      console.error('Failed to send feedback:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500'
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            {selectedDocuments.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {selectedDocuments.length} docs
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter Documents
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Search className="h-4 w-4 mr-2" />
                  Search History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Start a conversation</p>
                  <p className="text-sm">Ask questions about your documents and get AI-powered insights.</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-full ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      
                      <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Confidence Score for Assistant Messages */}
                          {message.role === 'assistant' && message.confidence && (
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <Sparkles className="h-3 w-3" />
                              <span className={getConfidenceColor(message.confidence)}>
                                Confidence: {(message.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Citations */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-500">Sources:</p>
                            {message.citations.map((citation, index) => (
                              <div key={index} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                                <div className="font-medium">{citation.documentName}</div>
                                {citation.page && <div className="text-gray-500">Page {citation.page}</div>}
                                <div className="mt-1 italic">"{citation.quote}"</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Message Actions */}
                        {message.role === 'assistant' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => provideFeedback(message.id, 'positive')}
                              className={`h-6 px-2 text-xs ${
                                message.feedback === 'positive' ? 'bg-green-100 text-green-600' : ''
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => provideFeedback(message.id, 'negative')}
                              className={`h-6 px-2 text-xs ${
                                message.feedback === 'negative' ? 'bg-red-100 text-red-600' : ''
                              }`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                            
                            <span className="text-xs text-gray-400 ml-auto">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                        )}
                        
                        {message.role === 'user' && (
                          <div className="mt-1 text-xs text-gray-400">
                            {formatTimestamp(message.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-gray-200 text-gray-700">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-white border border-gray-200 p-3 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="animate-pulse flex space-x-1">
                            <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                            <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                            <div className="rounded-full bg-gray-300 h-2 w-2"></div>
                          </div>
                          <span className="text-sm text-gray-500 ml-2">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your documents..."
                  disabled={isLoading}
                  className="resize-none"
                />
              </div>
              <Button 
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedDocuments.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                Searching across {selectedDocuments.length} selected document{selectedDocuments.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="flex-1 p-4">
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No conversations yet</p>
                <p className="text-sm">Your conversation history will appear here.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <Card 
                  key={conversation.id} 
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    conversationId === conversation.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => onConversationUpdate?.(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conversation.lastQuery}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conversation.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                      <MessageCircle className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}