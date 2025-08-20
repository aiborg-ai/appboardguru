'use client'

import { ChatScope } from '@/components/ai/ScopeSelector'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  scope?: ChatScope
  isWebSearch?: boolean
  isHelpQuery?: boolean
}

export interface ChatRequest {
  message: string
  scope: ChatScope
  conversationHistory?: ChatMessage[]
  includeWebSearch?: boolean
  isHelpQuery?: boolean
}

export interface ChatResponse {
  success: boolean
  message?: string
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  isWebSearchResult?: boolean
}

export interface AISettings {
  apiKey?: string
  model: string
  temperature: number
  maxTokens: number
  useLocalLLM: boolean
  localLLMEndpoint?: string
  webSearchEnabled: boolean
}

class EnhancedOpenRouterClient {
  private settings: AISettings
  private conversationHistory: Map<string, ChatMessage[]> = new Map()

  constructor() {
    this.settings = this.loadSettings()
  }

  private loadSettings(): AISettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings()
    }

    try {
      const savedSettings = localStorage.getItem('boardguru-ai-settings')
      return savedSettings ? JSON.parse(savedSettings) : this.getDefaultSettings()
    } catch {
      return this.getDefaultSettings()
    }
  }

  private getDefaultSettings(): AISettings {
    return {
      model: 'anthropic/claude-3.5-sonnet',
      temperature: 0.7,
      maxTokens: 2000,
      useLocalLLM: false,
      webSearchEnabled: true
    }
  }

  public updateSettings(newSettings: Partial<AISettings>) {
    this.settings = { ...this.settings, ...newSettings }
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardguru-ai-settings', JSON.stringify(this.settings))
    }
  }

  public getSettings(): AISettings {
    return this.settings
  }

  private async makeOpenRouterRequest(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string
      maxTokens?: number
      temperature?: number
    } = {}
  ): Promise<ChatResponse> {
    const {
      model = this.settings.model,
      maxTokens = this.settings.maxTokens,
      temperature = this.settings.temperature
    } = options

    // Use user's API key if provided, otherwise use server-side key
    const apiKey = this.settings.apiKey || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

    if (!apiKey && !this.settings.useLocalLLM) {
      return {
        success: false,
        error: 'No API key configured. Please add your OpenRouter API key in Settings.'
      }
    }

    try {
      if (this.settings.useLocalLLM) {
        return await this.makeLocalLLMRequest(messages, options)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          max_tokens: maxTokens,
          temperature,
          apiKey: this.settings.apiKey // Send user's API key if available
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred')
      }

      return {
        success: true,
        message: data.message,
        usage: data.usage
      }

    } catch (error) {
      console.error('OpenRouter API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async makeLocalLLMRequest(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ChatResponse> {
    if (!this.settings.localLLMEndpoint) {
      return {
        success: false,
        error: 'Local LLM endpoint not configured'
      }
    }

    try {
      const response = await fetch(this.settings.localLLMEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          ...options
        })
      })

      if (!response.ok) {
        throw new Error(`Local LLM error: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        message: data.response || data.message,
        usage: data.usage
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Local LLM request failed'
      }
    }
  }

  private async performWebSearch(query: string): Promise<string> {
    if (!this.settings.webSearchEnabled) {
      return 'Web search is disabled in settings.'
    }

    try {
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Web search failed')
      }

      const data = await response.json()
      return data.results || 'No search results found.'

    } catch (error) {
      console.error('Web search error:', error)
      return 'Web search temporarily unavailable.'
    }
  }

  private buildScopedSystemPrompt(scope: ChatScope): string {
    const basePrompt = `You are BoardGuru AI Assistant, an intelligent governance and business strategy assistant.`
    
    switch (scope.type) {
      case 'global':
        return `${basePrompt} You have access to general knowledge and can reference web search results when provided. Help users with general questions, BoardGuru functionality, and current information.`
      
      case 'organization':
        return `${basePrompt} You are operating within the context of ${scope.label}. Focus on organizational documents, policies, governance matters, and strategic initiatives specific to this organization.`
      
      case 'meeting':
        return `${basePrompt} You are operating within the context of "${scope.label}". Focus on meeting materials, agenda items, decisions made, action items, and follow-up tasks from this specific meeting.`
      
      case 'document':
        return `${basePrompt} You are operating within the context of the document "${scope.label}". Provide analysis, insights, and answers specific to this document's content, key points, and implications.`
      
      case 'team':
        return `${basePrompt} You are operating within the context of ${scope.label}. Focus on team-specific information, collaboration needs, roles, responsibilities, and team dynamics.`
      
      default:
        return basePrompt
    }
  }

  private generateHelpResponse(query: string, scope: ChatScope): string {
    const helpContent = {
      navigation: `**BoardGuru Navigation Help:**

• **Dashboard**: Overview of key metrics and recent activity
• **Instruments**: Access board packs, reports, and analysis tools
• **BoardMates**: Team collaboration and member management
• **BoardChat**: AI-powered chat with scope-based context
• **Settings**: Configure AI preferences, API keys, and system settings

Use the sidebar to navigate between different sections.`,

      upload: `**Document Upload Help:**

• Go to **Instruments > Board Pack AI** to upload documents
• Supported formats: PDF, DOC, DOCX, PPT, PPTX
• Maximum file size: 50MB
• AI will automatically generate summaries and insights
• Use the chat feature to ask questions about uploaded documents`,

      ai: `**AI Features Help:**

• **Scope Selection**: Choose context (Global, Organization, Meeting, Document, Team)
• **Chat**: Ask questions within your selected scope
• **Web Search**: Available in Global scope for current information
• **Document Analysis**: Upload documents for AI-powered insights
• **Settings**: Configure your preferred AI model and API keys`,

      settings: `**Settings Help:**

• **AI Settings**: Configure models, temperature, and token limits
• **API Keys**: Add your own OpenRouter or other AI service keys
• **Local LLM**: Configure local AI model endpoints
• **Web Search**: Enable/disable web search capabilities
• **Export**: Download chat history and AI insights`
    }

    const queryLower = query.toLowerCase()
    
    if (queryLower.includes('navigation') || queryLower.includes('menu') || queryLower.includes('sidebar')) {
      return helpContent.navigation
    } else if (queryLower.includes('upload') || queryLower.includes('document') || queryLower.includes('file')) {
      return helpContent.upload
    } else if (queryLower.includes('ai') || queryLower.includes('chat') || queryLower.includes('scope')) {
      return helpContent.ai
    } else if (queryLower.includes('settings') || queryLower.includes('configure') || queryLower.includes('api')) {
      return helpContent.settings
    }

    return `**BoardGuru Help:**

I can help you with:
• **Navigation**: How to use the dashboard and find features
• **Document Upload**: Adding and analyzing board materials
• **AI Features**: Chat, analysis, and scope selection
• **Settings**: Configuring preferences and API keys

Try asking about specific topics like "how to upload documents" or "AI settings help".`
  }

  public async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, scope, conversationHistory = [], includeWebSearch, isHelpQuery } = request

    // Handle help queries
    if (isHelpQuery) {
      const helpResponse = this.generateHelpResponse(message, scope)
      return {
        success: true,
        message: helpResponse
      }
    }

    // Handle web search for global scope
    let searchResults = ''
    if (scope.type === 'global' && (includeWebSearch || this.shouldPerformWebSearch(message))) {
      searchResults = await this.performWebSearch(message)
    }

    const systemPrompt = this.buildScopedSystemPrompt(scope)
    
    let contextualMessage = message
    if (searchResults) {
      contextualMessage = `${message}\n\n[Web Search Results]:\n${searchResults}`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: contextualMessage }
    ]

    const result = await this.makeOpenRouterRequest(messages)
    
    if (result.success && searchResults) {
      result.isWebSearchResult = true
    }

    return result
  }

  private shouldPerformWebSearch(message: string): boolean {
    const searchTriggers = [
      'current', 'latest', 'recent', 'today', 'news', 'search',
      'what is happening', 'update on', 'find information'
    ]
    
    return searchTriggers.some(trigger => 
      message.toLowerCase().includes(trigger)
    )
  }

  public getConversationHistory(sessionId: string): ChatMessage[] {
    return this.conversationHistory.get(sessionId) || []
  }

  public addToConversationHistory(sessionId: string, message: ChatMessage) {
    const history = this.conversationHistory.get(sessionId) || []
    history.push(message)
    
    // Keep only last 20 messages to manage memory
    if (history.length > 20) {
      history.splice(0, history.length - 20)
    }
    
    this.conversationHistory.set(sessionId, history)
  }

  public clearConversationHistory(sessionId: string) {
    this.conversationHistory.delete(sessionId)
  }

  public exportConversation(sessionId: string): string {
    const history = this.getConversationHistory(sessionId)
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionId,
      messages: history,
      settings: this.settings
    }
    
    return JSON.stringify(exportData, null, 2)
  }
}

// Singleton instance
export const enhancedOpenRouterClient = new EnhancedOpenRouterClient()

// React hook for chat sessions
export function useEnhancedChatSession(sessionId: string = 'default') {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMessages(enhancedOpenRouterClient.getConversationHistory(sessionId))
  }, [sessionId])

  const sendMessage = async (message: string, scope: ChatScope, options: {
    includeWebSearch?: boolean
    isHelpQuery?: boolean
  } = {}) => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      scope,
      isHelpQuery: options.isHelpQuery
    }

    setMessages(prev => {
      const updated = [...prev, userMessage]
      enhancedOpenRouterClient.addToConversationHistory(sessionId, userMessage)
      return updated
    })

    setIsLoading(true)
    setError(null)

    try {
      const response = await enhancedOpenRouterClient.sendMessage({
        message,
        scope,
        conversationHistory: messages,
        includeWebSearch: options.includeWebSearch,
        isHelpQuery: options.isHelpQuery
      })

      if (response.success && response.message) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          scope,
          isWebSearch: response.isWebSearchResult
        }

        setMessages(prev => {
          const updated = [...prev, assistantMessage]
          enhancedOpenRouterClient.addToConversationHistory(sessionId, assistantMessage)
          return updated
        })
      } else {
        setError(response.error || 'Unknown error occurred')
      }
    } catch (err) {
      setError('Failed to send message')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setMessages([])
    setError(null)
    enhancedOpenRouterClient.clearConversationHistory(sessionId)
  }

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  }
}

// Import React for the hook
import * as React from 'react'