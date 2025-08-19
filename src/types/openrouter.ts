// Type definitions for OpenRouter AI features

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
  audioScript?: string;
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

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BoardPack {
  id: string;
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  status: 'processing' | 'ready' | 'failed' | 'archived';
  summary?: string;
  audio_summary_url?: string;
  created_at: string;
  updated_at: string;
  watermark_applied: boolean;
}

export type SummaryLength = 'short' | 'medium' | 'long';
export type ProcessingStatus = 'processing' | 'ready' | 'failed' | 'archived';