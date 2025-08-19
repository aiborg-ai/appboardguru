import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder-key-for-build',
});

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

/**
 * Generate a comprehensive summary of a board document using Claude
 */
export async function summarizeDocument(options: DocumentSummaryOptions) {
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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    if (response.content[0].type === 'text') {
      return {
        success: true,
        summary: response.content[0].text,
        usage: response.usage,
      };
    }
    
    throw new Error('Unexpected response format from Claude');
  } catch (error) {
    console.error('Error generating document summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary',
    };
  }
}

/**
 * Handle interactive chat about board documents using Claude
 */
export async function chatWithClaude(options: ChatOptions) {
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

  try {
    // Build conversation messages
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: fullMessage,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    });

    if (response.content[0].type === 'text') {
      return {
        success: true,
        message: response.content[0].text,
        usage: response.usage,
      };
    }
    
    throw new Error('Unexpected response format from Claude');
  } catch (error) {
    console.error('Error in chat with Claude:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat message',
    };
  }
}

/**
 * Generate audio script from document summary for accessibility
 */
export async function generateAudioScript(summary: string) {
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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    if (response.content[0].type === 'text') {
      return {
        success: true,
        script: response.content[0].text,
        usage: response.usage,
      };
    }
    
    throw new Error('Unexpected response format from Claude');
  } catch (error) {
    console.error('Error generating audio script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate audio script',
    };
  }
}

export { anthropic };