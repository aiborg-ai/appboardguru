/**
 * Enhanced LLM Provider Infrastructure
 * Supports multiple LLM models with citation tracking, hallucination detection,
 * and secure document processing for investment analysis
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';

export type LLMModel = 
  | 'gpt-4-turbo-preview'
  | 'gpt-4-1106-preview'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'gemini-pro'
  | 'gemini-ultra'
  | 'mixtral-8x7b';

export interface LLMConfig {
  model: LLMModel;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface LLMRequest {
  messages: LLMMessage[];
  config: LLMConfig;
  context?: {
    documents?: DocumentContext[];
    requireCitations?: boolean;
    citationThreshold?: number;
  };
  security?: {
    encrypted?: boolean;
    workspace?: string;
    userId?: string;
  };
}

export interface DocumentContext {
  id: string;
  name: string;
  content: string;
  pageMap?: Map<number, string>;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  citations: Citation[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  metadata: {
    model: LLMModel;
    processingTime: number;
    confidence: number;
    hallucinationScore: number;
  };
}

export interface HallucinationCheck {
  score: number; // 0-1, where 0 is no hallucination
  issues: Array<{
    type: 'unsupported_claim' | 'contradiction' | 'fabrication';
    text: string;
    severity: 'low' | 'medium' | 'high';
    suggestion?: string;
  }>;
  verified: boolean;
}

export class LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private securityConfig: {
    encryptionKey?: string;
    allowedModels: LLMModel[];
    maxTokensPerRequest: number;
    maxTokensPerMonth: number;
  };
  private usageTracker: Map<string, number>; // userId -> tokens used this month

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    security?: {
      encryptionKey?: string;
      allowedModels?: LLMModel[];
      maxTokensPerRequest?: number;
      maxTokensPerMonth?: number;
    };
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.securityConfig = {
      encryptionKey: config.security?.encryptionKey,
      allowedModels: config.security?.allowedModels || ['gpt-4-turbo-preview', 'claude-3-opus'],
      maxTokensPerRequest: config.security?.maxTokensPerRequest || 8000,
      maxTokensPerMonth: config.security?.maxTokensPerMonth || 1000000,
    };
    this.usageTracker = new Map();
  }

  /**
   * Send a request to the LLM with enhanced features
   */
  async query(request: LLMRequest): Promise<Result<LLMResponse>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check usage limits
      if (request.security?.userId) {
        const usageCheck = await this.checkUsageLimits(request.security.userId, request.config.maxTokens);
        if (!usageCheck.success) {
          return usageCheck;
        }
      }

      // Prepare messages with context
      const enhancedMessages = this.prepareMessages(request);

      // Add citation instruction if required
      if (request.context?.requireCitations) {
        enhancedMessages.push({
          role: 'system',
          content: this.getCitationInstruction(),
        });
      }

      const startTime = Date.now();

      // Make API call
      const response = await this.callLLM(enhancedMessages, request.config);
      
      if (!response.success) {
        return response;
      }

      const llmResponse = response.data!;

      // Extract citations if required
      let citations: Citation[] = [];
      if (request.context?.requireCitations && request.context.documents) {
        const citationResult = this.extractCitations(
          llmResponse.content,
          request.context.documents,
          request.context.citationThreshold || 0.7
        );
        citations = citationResult;
      }

      // Perform hallucination check
      const hallucinationCheck = await this.checkHallucination(
        llmResponse.content,
        request.context?.documents
      );

      // Calculate cost
      const estimatedCost = this.calculateCost(
        request.config.model,
        llmResponse.usage.promptTokens,
        llmResponse.usage.completionTokens
      );

      // Update usage tracking
      if (request.security?.userId) {
        this.updateUsage(request.security.userId, llmResponse.usage.totalTokens);
      }

      const finalResponse: LLMResponse = {
        content: llmResponse.content,
        citations,
        usage: {
          ...llmResponse.usage,
          estimatedCost,
        },
        metadata: {
          model: request.config.model,
          processingTime: Date.now() - startTime,
          confidence: this.calculateConfidence(citations, hallucinationCheck),
          hallucinationScore: hallucinationCheck.score,
        },
      };

      return ResultUtils.ok(finalResponse);
    } catch (error) {
      return ResultUtils.fail(`LLM query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query documents with natural language
   */
  async queryDocuments(
    query: string,
    documents: DocumentContext[],
    config?: Partial<LLMConfig>
  ): Promise<Result<LLMResponse>> {
    const defaultConfig: LLMConfig = {
      model: 'claude-3-opus',
      temperature: 0.1, // Low temperature for factual responses
      maxTokens: 2000,
      ...config,
    };

    const request: LLMRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are an investment analyst assistant. Answer questions based solely on the provided documents. Always cite page numbers.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      config: defaultConfig,
      context: {
        documents,
        requireCitations: true,
        citationThreshold: 0.8,
      },
    };

    return this.query(request);
  }

  /**
   * Compare multiple documents
   */
  async compareDocuments(
    documents: DocumentContext[],
    comparisonType: 'changes' | 'similarities' | 'comprehensive',
    config?: Partial<LLMConfig>
  ): Promise<Result<LLMResponse>> {
    const prompts = {
      changes: 'Compare these documents and highlight all significant changes and differences. Focus on numerical changes, policy updates, and strategic shifts.',
      similarities: 'Identify common themes, consistent strategies, and unchanged elements across these documents.',
      comprehensive: 'Provide a comprehensive comparison including changes, consistencies, trends, and notable patterns across these documents.',
    };

    const defaultConfig: LLMConfig = {
      model: 'gpt-4-turbo-preview',
      temperature: 0.2,
      maxTokens: 3000,
      ...config,
    };

    const request: LLMRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are an expert investment analyst specializing in document comparison and analysis.',
        },
        {
          role: 'user',
          content: prompts[comparisonType],
        },
      ],
      config: defaultConfig,
      context: {
        documents,
        requireCitations: true,
        citationThreshold: 0.9, // High threshold for comparisons
      },
    };

    return this.query(request);
  }

  /**
   * Validate request against security policies
   */
  private validateRequest(request: LLMRequest): Result<void> {
    // Check model is allowed
    if (!this.securityConfig.allowedModels.includes(request.config.model)) {
      return ResultUtils.fail(`Model ${request.config.model} is not allowed`);
    }

    // Check token limits
    if (request.config.maxTokens > this.securityConfig.maxTokensPerRequest) {
      return ResultUtils.fail(`Max tokens ${request.config.maxTokens} exceeds limit of ${this.securityConfig.maxTokensPerRequest}`);
    }

    // Validate temperature
    if (request.config.temperature < 0 || request.config.temperature > 2) {
      return ResultUtils.fail('Temperature must be between 0 and 2');
    }

    return ResultUtils.ok();
  }

  /**
   * Check usage limits for user
   */
  private async checkUsageLimits(userId: string, requestedTokens: number): Result<void> {
    const currentUsage = this.usageTracker.get(userId) || 0;
    
    if (currentUsage + requestedTokens > this.securityConfig.maxTokensPerMonth) {
      return ResultUtils.fail(`Monthly token limit exceeded. Used: ${currentUsage}, Limit: ${this.securityConfig.maxTokensPerMonth}`);
    }

    return ResultUtils.ok();
  }

  /**
   * Prepare messages with document context
   */
  private prepareMessages(request: LLMRequest): LLMMessage[] {
    const messages = [...request.messages];

    if (request.context?.documents && request.context.documents.length > 0) {
      // Add document context as a system message
      const documentContext = request.context.documents
        .map(doc => `Document: ${doc.name}\n${doc.content}`)
        .join('\n\n---\n\n');

      messages.unshift({
        role: 'system',
        content: `You have access to the following documents:\n\n${documentContext}`,
      });
    }

    return messages;
  }

  /**
   * Get citation instruction for the model
   */
  private getCitationInstruction(): string {
    return `IMPORTANT: You must cite all claims with [Document Name, Page X] format. 
    Example: "The company's revenue increased by 15% [Annual Report 2023, Page 42]"
    Never make claims without citations. If you cannot find supporting evidence in the provided documents, clearly state this.`;
  }

  /**
   * Call the LLM API
   */
  private async callLLM(messages: LLMMessage[], config: LLMConfig): Promise<Result<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://appboardguru.com',
          'X-Title': 'AppBoardGuru Investment Analysis',
        },
        body: JSON.stringify({
          model: this.getModelIdentifier(config.model),
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          frequency_penalty: config.frequencyPenalty,
          presence_penalty: config.presencePenalty,
          stop: config.stopSequences,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return ResultUtils.fail(`LLM API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      
      return ResultUtils.ok({
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      });
    } catch (error) {
      return ResultUtils.fail(`Failed to call LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract citations from LLM response
   */
  private extractCitations(
    content: string,
    documents: DocumentContext[],
    threshold: number
  ): Citation[] {
    const citations: Citation[] = [];
    
    // Pattern to match citations like [Document Name, Page X]
    const citationPattern = /\[([^\],]+),\s*[Pp]age\s*(\d+)\]/g;
    let match;

    while ((match = citationPattern.exec(content)) !== null) {
      const docName = match[1].trim();
      const pageNumber = parseInt(match[2]);

      // Find matching document
      const document = documents.find(d => 
        d.name.toLowerCase().includes(docName.toLowerCase()) ||
        docName.toLowerCase().includes(d.name.toLowerCase())
      );

      if (document) {
        // Extract text from page if page map exists
        let pageText = '';
        if (document.pageMap && document.pageMap.has(pageNumber)) {
          pageText = document.pageMap.get(pageNumber) || '';
        }

        citations.push({
          documentId: document.id,
          documentName: document.name,
          pageNumber,
          text: pageText.substring(0, 200), // First 200 chars
          confidence: threshold,
        });
      }
    }

    return citations;
  }

  /**
   * Check for hallucinations in the response
   */
  private async checkHallucination(
    content: string,
    documents?: DocumentContext[]
  ): Promise<HallucinationCheck> {
    const issues: HallucinationCheck['issues'] = [];
    let score = 0;

    if (!documents || documents.length === 0) {
      // Cannot check without source documents
      return {
        score: 0.5, // Unknown
        issues: [],
        verified: false,
      };
    }

    // Extract claims from the content
    const claims = this.extractClaims(content);

    // Check each claim against documents
    for (const claim of claims) {
      const verified = this.verifyClaim(claim, documents);
      
      if (!verified) {
        issues.push({
          type: 'unsupported_claim',
          text: claim,
          severity: 'medium',
          suggestion: 'This claim could not be verified in the source documents',
        });
        score += 0.1;
      }
    }

    // Check for numerical inconsistencies
    const numbers = this.extractNumbers(content);
    for (const num of numbers) {
      const verified = this.verifyNumber(num, documents);
      
      if (!verified) {
        issues.push({
          type: 'fabrication',
          text: `Number ${num} mentioned`,
          severity: 'high',
          suggestion: 'This number does not appear in source documents',
        });
        score += 0.2;
      }
    }

    return {
      score: Math.min(1, score),
      issues,
      verified: issues.length === 0,
    };
  }

  /**
   * Extract claims from content (simplified version)
   */
  private extractClaims(content: string): string[] {
    // Split into sentences and filter for factual claims
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Look for sentences with specific patterns indicating claims
    return sentences.filter(s => 
      /\b(is|are|was|were|has|have|had|increased|decreased|rose|fell|gained|lost)\b/i.test(s)
    );
  }

  /**
   * Verify a claim against documents
   */
  private verifyClaim(claim: string, documents: DocumentContext[]): boolean {
    const claimLower = claim.toLowerCase();
    
    // Check if key words from claim appear in any document
    const keywords = claimLower
      .split(/\s+/)
      .filter(word => word.length > 4); // Only check longer words
    
    for (const doc of documents) {
      const docLower = doc.content.toLowerCase();
      const matchCount = keywords.filter(keyword => docLower.includes(keyword)).length;
      
      // If more than 60% of keywords match, consider it verified
      if (matchCount / keywords.length > 0.6) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract numbers from content
   */
  private extractNumbers(content: string): string[] {
    const numberPattern = /\b\d+\.?\d*%?\b/g;
    const matches = content.match(numberPattern);
    return matches || [];
  }

  /**
   * Verify a number against documents
   */
  private verifyNumber(number: string, documents: DocumentContext[]): boolean {
    for (const doc of documents) {
      if (doc.content.includes(number)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate confidence score based on citations and hallucination check
   */
  private calculateConfidence(citations: Citation[], hallucinationCheck: HallucinationCheck): number {
    let confidence = 1.0;
    
    // Reduce confidence based on hallucination score
    confidence -= hallucinationCheck.score * 0.5;
    
    // Boost confidence if citations are present
    if (citations.length > 0) {
      confidence += Math.min(0.3, citations.length * 0.05);
    }
    
    // Reduce confidence if no citations when they should exist
    if (citations.length === 0 && hallucinationCheck.issues.length > 0) {
      confidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(model: LLMModel, promptTokens: number, completionTokens: number): number {
    // Pricing per 1K tokens (example rates, should be updated with actual pricing)
    const pricing: Record<LLMModel, { prompt: number; completion: number }> = {
      'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
      'gpt-4-1106-preview': { prompt: 0.01, completion: 0.03 },
      'claude-3-opus': { prompt: 0.015, completion: 0.075 },
      'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
      'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
      'gemini-ultra': { prompt: 0.005, completion: 0.015 },
      'mixtral-8x7b': { prompt: 0.00024, completion: 0.00024 },
    };

    const modelPricing = pricing[model] || { prompt: 0.01, completion: 0.03 };
    
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Update usage tracking
   */
  private updateUsage(userId: string, tokens: number): void {
    const currentUsage = this.usageTracker.get(userId) || 0;
    this.usageTracker.set(userId, currentUsage + tokens);
  }

  /**
   * Get model identifier for API
   */
  private getModelIdentifier(model: LLMModel): string {
    const modelMap: Record<LLMModel, string> = {
      'gpt-4-turbo-preview': 'openai/gpt-4-turbo-preview',
      'gpt-4-1106-preview': 'openai/gpt-4-1106-preview',
      'claude-3-opus': 'anthropic/claude-3-opus',
      'claude-3-sonnet': 'anthropic/claude-3-sonnet',
      'claude-3-haiku': 'anthropic/claude-3-haiku',
      'gemini-pro': 'google/gemini-pro',
      'gemini-ultra': 'google/gemini-ultra',
      'mixtral-8x7b': 'mistralai/mixtral-8x7b',
    };
    
    return modelMap[model] || model;
  }

  /**
   * Reset monthly usage (should be called by a cron job)
   */
  resetMonthlyUsage(): void {
    this.usageTracker.clear();
  }

  /**
   * Get usage stats for a user
   */
  getUserUsage(userId: string): {
    tokensUsed: number;
    tokensRemaining: number;
    percentageUsed: number;
  } {
    const tokensUsed = this.usageTracker.get(userId) || 0;
    const tokensRemaining = Math.max(0, this.securityConfig.maxTokensPerMonth - tokensUsed);
    const percentageUsed = (tokensUsed / this.securityConfig.maxTokensPerMonth) * 100;
    
    return {
      tokensUsed,
      tokensRemaining,
      percentageUsed,
    };
  }
}