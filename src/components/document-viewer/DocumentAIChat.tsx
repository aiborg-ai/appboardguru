'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  RotateCcw,
  ExternalLink,
  FileText,
  Clock,
  Trash2,
  Settings,
  Mic,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Textarea } from '@/components/atoms/form/textarea'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/atoms/display/avatar'
import { Separator } from '@/components/atoms/display/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/features/shared/ui/dropdown-menu'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { 
  useDocumentContext, 
  useDocumentActions 
} from './DocumentContextProvider'
import { TabContentWrapper, TabEmptyState } from './DocumentTabs'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  pageReference?: number
  isVoiceInput?: boolean
  feedback?: 'positive' | 'negative'
}

interface MessageBubbleProps {
  message: ChatMessage
  onCopyMessage: (content: string) => void
  onNavigateToPage?: (page: number) => void
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void
  onRegenerateResponse?: (messageId: string) => void
}

function MessageBubble({ 
  message, 
  onCopyMessage, 
  onNavigateToPage, 
  onFeedback,
  onRegenerateResponse 
}: MessageBubbleProps) {
  const isUser = message.type === 'user'

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const extractPageReferences = (content: string) => {
    const pageRegex = /page\s+(\d+)/gi
    const matches = Array.from(content.matchAll(pageRegex))
    return matches.map(match => parseInt(match[1]!)).filter((page, index, arr) => arr.indexOf(page) === index)
  }

  const pageReferences = extractPageReferences(message.content)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
        {/* Avatar */}
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={`text-xs ${isUser ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <Card className={`p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-white border-gray-200'}`}>
            <div className="space-y-2">
              {/* Voice input indicator */}
              {message.isVoiceInput && (
                <div className="flex items-center space-x-1 text-xs opacity-75">
                  <Mic className="h-3 w-3" />
                  <span>Voice input</span>
                </div>
              )}

              {/* Message text */}
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Page references */}
              {pageReferences.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pageReferences.map(page => (
                    <Button
                      key={page}
                      variant={isUser ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => onNavigateToPage?.(page)}
                      className="h-6 text-xs px-2"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Page {page}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Message footer */}
          <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <span>{formatTime(message.timestamp)}</span>
            
            {!isUser && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopyMessage(message.content)}
                  className="h-5 w-5 p-0"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(message.id, 'positive')}
                  className={`h-5 w-5 p-0 ${message.feedback === 'positive' ? 'text-green-600' : ''}`}
                  title="Good response"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(message.id, 'negative')}
                  className={`h-5 w-5 p-0 ${message.feedback === 'negative' ? 'text-red-600' : ''}`}
                  title="Poor response"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>

                {onRegenerateResponse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerateResponse(message.id)}
                    className="h-5 w-5 p-0"
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DocumentAIChat() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus textarea when tab is opened
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const suggestionQuestions = [
    "What is the main topic of this document?",
    "Can you summarize the key points?",
    "What are the important findings or conclusions?",
    "Are there any specific recommendations?",
    "What methodology was used?",
    "Who are the main authors or contributors?"
  ]

  const handleSendMessage = async (content: string, isVoiceInput = false) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isVoiceInput
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      // Simulate AI response (in real implementation, this would call your AI API)
      const response = await simulateAIResponse(content, state)
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        pageReference: response.pageReference
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceTranscription = (text: string) => {
    handleSendMessage(text, true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(currentMessage)
    }
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleNavigateToPage = (page: number) => {
    actions.goToPage(page)
  }

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: msg.feedback === feedback ? undefined : feedback }
        : msg
    ))
  }

  const handleRegenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    const userMessageIndex = messageIndex - 1
    if (userMessageIndex < 0) return

    const userMessage = messages[userMessageIndex]
    if (!userMessage) return
    
    // Remove the old response and regenerate
    setMessages(prev => prev.slice(0, messageIndex))
    await handleSendMessage(userMessage.content, userMessage.isVoiceInput)
  }

  const handleClearChat = () => {
    setMessages([])
    setShowSuggestions(true)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  // Simulate AI response - in real implementation, this would call your AI API
  const simulateAIResponse = async (query: string, documentState: any): Promise<{ content: string; pageReference?: number }> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    const responses = [
      {
        content: `Based on my analysis of this document, I can see that it covers ${documentState.assetName}. The content spans ${documentState.totalPages} pages and contains valuable information relevant to your question.

To provide you with the most accurate answer, I've reviewed the document content and can offer specific insights. Would you like me to elaborate on any particular aspect?`,
        pageReference: 1
      },
      {
        content: `This is an excellent question about the document. From what I can observe, the document structure includes:

• Main content across ${documentState.totalPages} pages
• ${documentState.annotations.length} annotations that have been added
• ${documentState.tableOfContents.length} sections in the table of contents

The current page you're viewing (page ${documentState.currentPage}) contains relevant information that addresses your inquiry. Would you like me to focus on a specific section?`,
        pageReference: documentState.currentPage
      },
      {
        content: `I've analyzed the document content and found several key points that relate to your question:

1. The document provides comprehensive coverage of the topic
2. There are specific methodologies and approaches discussed
3. The conclusions drawn are well-supported by the presented evidence

For more detailed information, I recommend reviewing pages ${Math.min(documentState.currentPage + 1, documentState.totalPages)} and ${Math.min(documentState.currentPage + 2, documentState.totalPages)} which contain the most relevant details.`,
        pageReference: Math.min(documentState.currentPage + 1, documentState.totalPages)
      }
    ]

    return responses[Math.floor(Math.random() * responses.length)] || { content: "How can I help you with this document?", pageReference: undefined }
  }

  if (messages.length === 0) {
    return (
      <TabContentWrapper>
        {showSuggestions ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-medium text-gray-900">AI Document Assistant</h3>
              </div>
              <p className="text-xs text-gray-600">
                Ask questions about this document and get intelligent, context-aware responses.
              </p>
            </div>

            {/* Suggestions */}
            <div className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Suggested Questions</h4>
                  <div className="space-y-2">
                    {suggestionQuestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full justify-start text-left h-auto p-3 whitespace-normal"
                      >
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    <BookOpen className="h-3 w-3" />
                    <span>Document: {state.assetName}</span>
                    <span>•</span>
                    <span>{state.totalPages} pages</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Ask me anything about this document..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <VoiceInputButton
                    onTranscription={handleVoiceTranscription}
                    disabled={isLoading}
                    size="sm"
                  />
                  <Button
                    onClick={() => handleSendMessage(currentMessage)}
                    disabled={!currentMessage.trim() || isLoading}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <TabEmptyState
            icon={Sparkles}
            title="AI Document Assistant"
            description="Ask questions about this document and get intelligent, context-aware responses."
            action={
              <Button onClick={() => setShowSuggestions(true)} className="mt-2">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Conversation
              </Button>
            }
          />
        )}
      </TabContentWrapper>
    )
  }

  return (
    <TabContentWrapper>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-900">AI Chat</h3>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length} messages
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearChat}>
                <Trash2 className="h-3 w-3 mr-2" />
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopyMessage={handleCopyMessage}
                onNavigateToPage={handleNavigateToPage}
                onFeedback={handleFeedback}
                onRegenerateResponse={handleRegenerateResponse}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start space-x-2">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-purple-500 text-white text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="p-3 bg-white border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm text-gray-600">Analyzing document...</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Ask a follow-up question..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <VoiceInputButton
              onTranscription={handleVoiceTranscription}
              disabled={isLoading}
              size="sm"
            />
            <Button
              onClick={() => handleSendMessage(currentMessage)}
              disabled={!currentMessage.trim() || isLoading}
              size="sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Press Enter to send • Shift+Enter for new line • Use voice input for hands-free interaction
        </div>
      </div>
    </TabContentWrapper>
  )
}