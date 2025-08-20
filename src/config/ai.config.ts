import { z } from 'zod'

// Environment validation schema
const aiEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  AI_MODEL: z.string().default('anthropic/claude-3-haiku'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_MAX_TOKENS: z.coerce.number().min(1).max(8000).default(4000),
})

// Parse environment variables with fallbacks
const getAIEnv = () => {
  try {
    return aiEnvSchema.parse({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
      AI_MODEL: process.env.AI_MODEL,
      AI_TEMPERATURE: process.env.AI_TEMPERATURE,
      AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
    })
  } catch (error) {
    console.warn('AI configuration validation failed, using defaults:', error)
    return {
      OPENROUTER_API_KEY: '',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_MODEL: 'anthropic/claude-3-haiku',
      AI_TEMPERATURE: 0.7,
      AI_MAX_TOKENS: 4000,
    }
  }
}

const env = getAIEnv()

// AI configuration
export const aiConfig = {
  // OpenRouter settings
  openrouter: {
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL,
    defaultModel: env.AI_MODEL,
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Model settings
  models: {
    // Text generation models
    text: {
      fast: 'anthropic/claude-3-haiku',
      balanced: 'anthropic/claude-3-sonnet',
      powerful: 'anthropic/claude-3-opus',
      gpt4: 'openai/gpt-4-turbo',
      gpt35: 'openai/gpt-3.5-turbo',
    },
    
    // Specialized models
    summarization: 'anthropic/claude-3-haiku',
    analysis: 'anthropic/claude-3-sonnet',
    translation: 'openai/gpt-4-turbo',
    codeReview: 'anthropic/claude-3-sonnet',
  },

  // Generation parameters
  generation: {
    temperature: env.AI_TEMPERATURE,
    maxTokens: env.AI_MAX_TOKENS,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    streamResponse: true,
  },

  // Feature-specific settings
  features: {
    summarization: {
      enabled: env.OPENROUTER_API_KEY !== '',
      maxDocumentLength: 100000, // characters
      chunkSize: 8000, // characters per chunk
      types: {
        brief: {
          maxTokens: 500,
          temperature: 0.3,
          prompt: 'Provide a brief, executive summary of this document.',
        },
        detailed: {
          maxTokens: 1500,
          temperature: 0.5,
          prompt: 'Provide a detailed summary including key points, decisions, and action items.',
        },
        executive: {
          maxTokens: 800,
          temperature: 0.3,
          prompt: 'Provide an executive summary focusing on strategic implications and key decisions.',
        },
      },
    },

    chat: {
      enabled: env.OPENROUTER_API_KEY !== '',
      maxHistory: 20, // messages
      contextWindow: 8000, // tokens
      systemPrompt: `You are an AI assistant for BoardGuru, an enterprise board management platform. 
        Help users analyze board documents, answer questions about their content, and provide insights 
        for board meetings. Be concise, professional, and focus on actionable insights.`,
      
      scopes: {
        global: 'Answer questions about any available documents',
        organization: 'Answer questions about documents in this organization',
        vault: 'Answer questions about documents in this vault',
        asset: 'Answer questions about this specific document',
      },
    },

    translation: {
      enabled: false, // Disabled by default
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'],
      maxLength: 50000, // characters
    },

    audioGeneration: {
      enabled: false, // Would need additional service integration
      voice: 'alloy',
      speed: 1.0,
      format: 'mp3',
    },
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerHour: 100000,
    maxConcurrentRequests: 5,
    burstLimit: 10,
  },

  // Caching
  cache: {
    enabled: process.env.NODE_ENV === 'production',
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 1000, // cached responses
    keyPrefix: 'ai:',
  },

  // Content filtering
  safety: {
    enabled: true,
    maxContentLength: 500000, // characters
    blockedPatterns: [
      // Add patterns for sensitive content
      /\b(?:password|secret|key|token)\b/gi,
      /\b(?:ssn|social security)\b/gi,
    ],
    sanitizeOutput: true,
  },

  // Error handling
  errors: {
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    fallbackModel: 'anthropic/claude-3-haiku',
    timeoutMs: 60000, // 60 seconds
  },

  // Monitoring and analytics
  monitoring: {
    logRequests: process.env.NODE_ENV === 'development',
    trackUsage: process.env.NODE_ENV === 'production',
    trackLatency: true,
    reportErrors: process.env.NODE_ENV === 'production',
  },
} as const

// Prompt templates
export const promptTemplates = {
  summarization: {
    brief: `Please provide a brief summary (2-3 paragraphs) of the following document. Focus on the most important points and key decisions:

{content}`,

    detailed: `Please provide a detailed summary of the following document. Include:
- Key points and main topics
- Important decisions made
- Action items and next steps
- Key metrics or data mentioned

Document:
{content}`,

    executive: `Please provide an executive summary of the following board document. Focus on:
- Strategic implications
- Major decisions and their rationale
- Financial impact
- Risk factors
- Recommendations for board action

Document:
{content}`,
  },

  chat: {
    withContext: `Based on the following document(s), please answer the user's question:

Context:
{context}

Question: {question}

Please provide a clear, concise answer based solely on the information in the provided context.`,

    general: `You are an AI assistant for BoardGuru, a board management platform. 
The user has asked: {question}

Please provide a helpful response focused on board governance, document management, or related topics.`,
  },

  analysis: {
    riskAssessment: `Please analyze the following document for potential risks and concerns that the board should be aware of:

{content}`,

    complianceCheck: `Please review the following document for compliance considerations and regulatory requirements:

{content}`,

    decisionPoints: `Please identify key decision points and recommendations in the following board document:

{content}`,
  },
} as const

// Helper functions
export const isAIEnabled = () => {
  return aiConfig.openrouter.apiKey !== ''
}

export const getModelForFeature = (feature: keyof typeof aiConfig.models) => {
  return aiConfig.models[feature] || aiConfig.openrouter.defaultModel
}

export const getSummaryConfig = (type: 'brief' | 'detailed' | 'executive') => {
  return aiConfig.features.summarization.types[type]
}

export const formatPrompt = (template: string, variables: Record<string, string>) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match)
}

export const validateContent = (content: string) => {
  if (content.length > aiConfig.safety.maxContentLength) {
    throw new Error('Content exceeds maximum length')
  }

  if (aiConfig.safety.enabled) {
    for (const pattern of aiConfig.safety.blockedPatterns) {
      if (pattern.test(content)) {
        throw new Error('Content contains blocked patterns')
      }
    }
  }

  return true
}

// Type exports
export type AIConfig = typeof aiConfig
export type SummaryType = keyof typeof aiConfig.features.summarization.types
export type ChatScope = keyof typeof aiConfig.features.chat.scopes
export type ModelType = keyof typeof aiConfig.models