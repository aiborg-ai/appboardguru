/**
 * OpenRouter API Client for BoardGuru AI Features
 * Provides document summarization and chat functionality using OpenRouter's unified API
 */

export interface DocumentSummaryOptions {
  content: string;
  fileName: string;
  includeKeyPoints?: boolean;
  includeActionItems?: boolean;
  maxLength?: 'short' | 'medium' | 'long';
}

export interface ChatOptions {
  message: string;
  context?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface OpenRouterResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a request to OpenRouter API
 */
async function makeOpenRouterRequest(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<OpenRouterResponse> {
  const {
    model = 'anthropic/claude-3.5-sonnet',
    maxTokens = 4000,
    temperature = 0.3
  } = options;

  if (!process.env['OPENROUTER_API_KEY']) {
    console.warn('OpenRouter API key not configured - AI features disabled');
    return {
      success: false,
      error: 'AI features are temporarily unavailable - OpenRouter API key not configured'
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env['OPENROUTER_API_KEY']}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env['APP_URL'] || 'http://localhost:3000',
        'X-Title': 'BoardGuru'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter');
    }

    return {
      success: true,
      data: data.choices[0].message.content,
      usage: data.usage
    };

  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate a comprehensive summary of a board document using OpenRouter
 */
export async function summarizeDocument(options: DocumentSummaryOptions): Promise<OpenRouterResponse> {
  const { content, fileName, includeKeyPoints = true, includeActionItems = true, maxLength = 'medium' } = options;
  
  const lengthInstructions = {
    short: 'Keep the summary concise, around 2-3 paragraphs.',
    medium: 'Provide a detailed summary, around 4-6 paragraphs.',
    long: 'Create a comprehensive summary with detailed analysis.'
  };

  const systemPrompt = `You are an expert business analyst specializing in board documents and corporate governance. Your role is to analyze and summarize board materials clearly and professionally.

Guidelines:
- Focus on strategic decisions, financial implications, and governance matters
- Identify risks, opportunities, and key stakeholder impacts
- Maintain confidentiality and professional tone
- Structure information logically for board members
- ${lengthInstructions[maxLength]}`;

  const userPrompt = `Please analyze and summarize the following board document: "${fileName}"

Document Content:
${content}

Please provide:
1. Executive Summary
2. Key Strategic Points
${includeKeyPoints ? '3. Critical Issues and Risks\n4. Financial Implications' : ''}
${includeActionItems ? '5. Recommended Actions\n6. Next Steps' : ''}
7. Questions for Board Consideration

Format the response in clear sections with bullet points where appropriate.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const result = await makeOpenRouterRequest(messages, {
    model: 'anthropic/claude-3.5-sonnet',
    maxTokens: 4000,
    temperature: 0.3
  });

  if (result.success) {
    return {
      success: true,
      data: {
        summary: result.data,
        usage: result.usage
      }
    };
  }

  return result;
}

/**
 * Handle interactive chat about board documents using OpenRouter
 */
export async function chatWithOpenRouter(options: ChatOptions): Promise<OpenRouterResponse> {
  const { message, context, conversationHistory = [] } = options;

  const systemPrompt = `You are BoardGuru AI, an intelligent assistant specialized in corporate governance, board management, and business strategy. You help board members, executives, and governance professionals analyze documents, understand strategic implications, and make informed decisions.

Your capabilities include:
- Analyzing board documents and materials
- Explaining financial reports and strategic plans
- Identifying governance issues and compliance matters
- Providing insights on risk management
- Suggesting strategic options and considerations

Guidelines:
- Be professional, accurate, and insightful
- Focus on strategic and governance perspectives
- Provide specific, actionable insights when possible
- Ask clarifying questions when context is needed
- Maintain confidentiality and discretion`;

  const contextMessage = context ? `\n\nRelevant Document Context:\n${context}` : '';
  const fullMessage = `${message}${contextMessage}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: fullMessage }
  ];

  const result = await makeOpenRouterRequest(messages, {
    model: 'anthropic/claude-3.5-sonnet',
    maxTokens: 2000,
    temperature: 0.7
  });

  if (result.success) {
    return {
      success: true,
      data: {
        message: result.data,
        usage: result.usage
      }
    };
  }

  return result;
}

/**
 * Generate audio script from document summary for accessibility
 */
export async function generateAudioScript(summary: string): Promise<OpenRouterResponse> {
  const systemPrompt = `You are a professional script writer specializing in converting written board materials into clear, engaging audio scripts. Your role is to make complex business information accessible through audio format.

Guidelines:
- Convert written text to natural, spoken language
- Add appropriate pauses and emphasis markers
- Maintain professional tone suitable for board members
- Structure for clear audio comprehension
- Keep technical accuracy while improving flow`;

  const userPrompt = `Please convert the following board document summary into a professional audio script suitable for text-to-speech conversion:

${summary}

Format with:
- Natural speaking rhythm
- [PAUSE] markers where appropriate
- [EMPHASIS] for key points
- Clear section transitions
- Professional but conversational tone`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const result = await makeOpenRouterRequest(messages, {
    model: 'anthropic/claude-3.5-haiku',
    maxTokens: 2000,
    temperature: 0.4
  });

  if (result.success) {
    return {
      success: true,
      data: {
        script: result.data,
        usage: result.usage
      }
    };
  }

  return result;
}

/**
 * Test OpenRouter API connection
 */
export async function testOpenRouterConnection(): Promise<OpenRouterResponse> {
  const result = await makeOpenRouterRequest([
    { role: 'user', content: 'Hello! Please respond with a brief confirmation that you are working correctly.' }
  ], {
    model: 'anthropic/claude-3.5-haiku',
    maxTokens: 100,
    temperature: 0.1
  });

  return result;
}