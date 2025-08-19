import { DocumentSummaryRequest, DocumentSummaryResponse, ChatRequest, ChatResponse } from '@/types/claude';

/**
 * Client-side utility for calling Claude API endpoints
 */

export async function summarizeDocumentAPI(
  request: DocumentSummaryRequest
): Promise<DocumentSummaryResponse> {
  try {
    const response = await fetch('/api/summarize-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling summarize document API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize document',
    };
  }
}

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
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling chat API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chat response',
    };
  }
}

/**
 * Hook for managing chat conversation state
 */
export function useChatSession() {
  const generateSessionId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    generateSessionId,
  };
}