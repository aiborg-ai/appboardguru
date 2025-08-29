'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Bot, 
  User, 
  Loader, 
  MessageSquare, 
  X, 
  Settings, 
  Search,
  HelpCircle,
  Globe,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScopeSelector, type ChatScope } from './ScopeSelector'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  scope?: ChatScope
  isWebSearch?: boolean
  isHelpQuery?: boolean
}

interface EnhancedAIChatProps {
  documentContext?: {
    title: string
    summary?: string
    content?: string
  }
  className?: string
  defaultScope?: ChatScope
}

const defaultGlobalScope: ChatScope = {
  id: 'global',
  type: 'global',
  label: 'Global Knowledge',
  description: 'Access to general knowledge and web search'
}

export function EnhancedAIChat({ 
  documentContext, 
  className = '', 
  defaultScope = defaultGlobalScope 
}: EnhancedAIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedScope, setSelectedScope] = useState<ChatScope>(defaultScope)
  const [showSettings, setShowSettings] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const detectQueryType = (message: string) => {
    const lowerMessage = message.toLowerCase()
    const helpKeywords = ['help', 'how to', 'what is', 'explain', 'tutorial', 'guide', 'support']
    const searchKeywords = ['search', 'find', 'look up', 'current', 'latest', 'news', 'recent']
    
    const isHelp = helpKeywords.some(keyword => lowerMessage.includes(keyword))
    const isSearch = searchKeywords.some(keyword => lowerMessage.includes(keyword)) || 
                    selectedScope.type === 'global'
    
    return { isHelp, isSearch }
  }

  const buildContextMessage = (message: string, scope: ChatScope) => {
    let context = ''
    
    // Add scope context
    switch (scope.type) {
      case 'global':
        context += 'You have access to general knowledge and can perform web searches for current information. '
        break
      case 'organization':
        context += `You are operating within the context of ${scope.label}. Focus on organizational documents, policies, and data. `
        break
      case 'meeting':
        context += `You are operating within the context of "${scope.label}". Focus on meeting materials, decisions, and follow-up actions. `
        break
      case 'document':
        context += `You are operating within the context of the document "${scope.label}". Focus on this specific document's content and analysis. `
        break
      case 'team':
        context += `You are operating within the context of ${scope.label}. Focus on team-specific information and collaboration. `
        break
    }

    // Add document context if available
    if (documentContext?.summary) {
      context += `\n\nDocument Context: ${documentContext.title}\nSummary: ${documentContext.summary}`
    }

    return context ? `${context}\n\nUser Query: ${message}` : message
  }

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const { isHelp, isSearch } = detectQueryType(message)
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      scope: selectedScope,
      isHelpQuery: isHelp
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const contextMessage = buildContextMessage(message, selectedScope)
      
      // Simulate AI response based on scope and query type
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      let response = ''
      
      if (isHelp) {
        response = `I'm here to help you with BoardGuru! Based on your query about "${message}", here are some key points:

• **Navigation**: Use the sidebar to access different modules and features
• **Document Management**: Upload and analyze board packs in the Instruments section
• **AI Features**: Get summaries, insights, and chat assistance for your documents
• **Scope Selection**: Choose specific contexts (meetings, documents, teams) for focused conversations
• **Settings**: Configure your AI preferences and API keys in Settings

Is there a specific feature or workflow you'd like me to explain in more detail?`
      } else if (isSearch && selectedScope.type === 'global') {
        response = `I'll search for current information about "${message}". Based on web search results:

• This appears to be a query that would benefit from real-time data
• I can help you find the latest information on this topic
• For the most current results, I recommend checking recent news sources
• Would you like me to provide more specific guidance on where to find this information?

Note: Web search functionality is being enhanced. For now, I can provide general guidance and help you navigate to the right resources.`
      } else {
        response = `Based on the ${selectedScope.label} context, I can help you with "${message}".

${selectedScope.type === 'document' 
  ? `This relates to ${selectedScope.label}. I can analyze the document content, extract key insights, and answer specific questions about the material.`
  : selectedScope.type === 'meeting'
  ? `This is in the context of ${selectedScope.label}. I can help you review meeting materials, action items, and strategic decisions.`
  : selectedScope.type === 'organization'
  ? `Within your organizational context, I can help analyze governance matters, compliance requirements, and strategic initiatives.`
  : 'I can provide general assistance and guidance on this topic.'
}

What specific aspect would you like me to focus on?`
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        scope: selectedScope,
        isWebSearch: isSearch && selectedScope.type === 'global'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError('Failed to send message. Please try again.')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    const message = inputMessage.trim()
    if (!message) return
    
    setInputMessage('')
    await sendMessage(message)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearMessages = () => {
    setMessages([])
    setError(null)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 rounded-full p-4 shadow-lg bg-blue-600 hover:bg-blue-700 ${className}`}
        size="lg"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
    )
  }

  const chatSizeClass = isMaximized 
    ? 'fixed inset-4 w-auto h-auto' 
    : 'fixed bottom-6 right-6 w-96 h-[600px]'

  return (
    <div className={`${chatSizeClass} bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${className} z-50`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">BoardGuru AI Assistant</h3>
            <p className="text-xs text-blue-100">Intelligent governance support</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:bg-blue-700"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-white hover:bg-blue-700"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <ScopeSelector
          selectedScope={selectedScope}
          onScopeChange={setSelectedScope}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-gray-200 bg-yellow-50 p-3">
          <div className="text-sm text-yellow-800">
            <div className="font-medium mb-2">AI Settings</div>
            <div className="text-xs text-yellow-700">
              Visit Settings page to configure API keys, models, and preferences.
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Welcome to BoardGuru AI Assistant!
              </p>
              <p className="text-xs text-gray-400">
                Current scope: <span className="font-medium">{selectedScope.label}</span>
              </p>
              <div className="flex items-center justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <HelpCircle className="h-3 w-3" />
                  <span>Ask for help</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Search className="h-3 w-3" />
                  <span>Search & analyze</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Globe className="h-3 w-3" />
                  <span>Web search</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
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
            
            <div className={`flex-1 max-w-[85%] ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              <div className={`rounded-lg p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {message.role === 'assistant' && (message.isWebSearch || message.isHelpQuery) && (
                  <div className="flex items-center space-x-2 mb-2 text-xs opacity-75">
                    {message.isWebSearch && <Search className="h-3 w-3" />}
                    {message.isHelpQuery && <HelpCircle className="h-3 w-3" />}
                    <span>
                      {message.isWebSearch && 'Web Search • '}
                      {message.isHelpQuery && 'Help Guide • '}
                      {message.scope?.label}
                    </span>
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans">
                  {message.content}
                </pre>
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${
                message.role === 'user' ? 'text-right' : ''
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
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
            placeholder={`Ask about ${selectedScope.label.toLowerCase()} or type "help" for guidance...`}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
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
            Scope: {selectedScope.label}
          </div>
        </div>
      </div>
    </div>
  )
}