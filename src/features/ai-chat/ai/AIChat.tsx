'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader, MessageSquare, X } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { chatAPI, useChatSession } from '@/lib/api/openrouter-client'
import { VoiceInputButton } from '@/features/shared/ui/VoiceInputButton'
import type { ChatMessage, ChatRequest, ChatResponse } from '@/types/openrouter'

interface AIChatProps {
  documentContext?: {
    title: string
    summary?: string
    content?: string
  }
  className?: string
}

export function AIChat({ documentContext, className = '' }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, isLoading, error, sendMessage, clearMessages } = useChatSession()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const message = inputMessage.trim()
    setInputMessage('')

    // Include document context if available
    const context = documentContext?.summary 
      ? `Document: ${documentContext.title}\nSummary: ${documentContext.summary}`
      : undefined

    await sendMessage(message, context)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 rounded-full p-4 shadow-lg ${className}`}
        size="lg"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">BoardGuru AI</h3>
            <p className="text-xs text-blue-100">Ask questions about your documents</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-blue-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Document Context */}
      {documentContext && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-medium text-blue-800">
              Context: {documentContext.title}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm">
              Hello! I'm your BoardGuru AI assistant. Ask me questions about your board documents, 
              governance matters, or strategic insights.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            
            <div className={`flex-1 max-w-[80%] ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              <div className={`rounded-lg p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">
                  {message.content}
                </pre>
              </div>
              {message.timestamp && (
                <div className={`text-xs text-gray-500 mt-1 ${
                  message.role === 'user' ? 'text-right' : ''
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this document or board governance..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <VoiceInputButton
            onTranscription={(text) => setInputMessage(prev => prev + (prev ? ' ' : '') + text)}
            disabled={isLoading}
            size="sm"
            className="self-end"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear chat
          </Button>
          <div className="text-xs text-gray-400">
            Powered by OpenRouter
          </div>
        </div>
      </div>
    </div>
  )
}