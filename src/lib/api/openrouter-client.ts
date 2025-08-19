/**
 * Client-side API functions for OpenRouter integration
 */

export interface DocumentSummaryRequest {
  content: string;
  fileName: string;
  includeKeyPoints?: boolean;
  includeActionItems?: boolean;
  maxLength?: 'short' | 'medium' | 'long';
}

export interface DocumentSummaryResponse {
  success: boolean;
  summary?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatRequest {
  message: string;
  context?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

/**
 * Summarize a document using OpenRouter API
 */
export async function summarizeDocumentAPI(request: DocumentSummaryRequest): Promise<DocumentSummaryResponse> {
  try {
    const response = await fetch('/api/summarize-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Document summarization API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize document'
    };
  }
}

/**
 * Send a chat message using OpenRouter API
 */
export async function chatAPI(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send chat message'
    };
  }
}

/**
 * Custom hook for managing chat sessions
 */
export function useChatSession() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sendMessage = async (message: string, context?: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatAPI({
        message,
        context,
        conversationHistory: messages
      });

      if (response.success && response.message) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Chat error occurred';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  };
}

// Import React for the hook
import React from 'react';