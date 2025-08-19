export interface DocumentSummaryRequest {
  content: string;
  fileName: string;
  includeKeyPoints?: boolean;
  includeActionItems?: boolean;
  maxLength?: 'short' | 'medium' | 'long';
  generateAudio?: boolean;
}

export interface DocumentSummaryResponse {
  success: boolean;
  summary?: string;
  audioScript?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
  conversationHistory?: ChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  sessionId?: string;
  timestamp?: string;
  error?: string;
}

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}