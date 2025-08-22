import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseController, CommonSchemas } from '../base-controller';
import { Result, Ok, Err, ResultUtils } from '../../result';
import { searchService } from '../../services/search.service';

// Define types for chat functionality
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatSession {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
  messages: ChatMessage[];
  context: {
    scope: 'general' | 'boardguru' | 'organization' | 'vault' | 'asset';
    organizationId?: string;
    organizationName?: string;
    vaultId?: string;
    vaultName?: string;
    assetId?: string;
    assetName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AssetReference {
  id: string;
  type: 'pdf' | 'text' | 'spreadsheet' | 'presentation' | 'image' | 'document';
  title: string;
  description?: string;
  excerpt?: string;
  url: string;
  download_url?: string;
  thumbnail_url?: string;
  relevance_score: number;
  confidence_score: number;
  metadata: {
    fileName: string;
    fileSize?: number;
    fileType: string;
    lastModified: string;
    vault?: { id: string; name: string };
    organization?: { id: string; name: string };
    tags: string[];
    category?: string;
    estimatedReadTime?: string;
    complexityLevel?: string;
  };
  preview?: {
    content?: string;
    wordCount: number;
  };
}

interface EnhancedChatResponse {
  success: boolean;
  message?: string;
  error?: string;
  references?: {
    assets: AssetReference[];
    websites: any[];
    vaults: any[];
    meetings: any[];
    reports: any[];
  };
  suggestions?: string[];
  search_metadata?: {
    query_processed: string;
    search_time_ms: number;
    total_results_found: number;
    context_used: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Consolidated Chat API Controller
 * Handles all chat-related endpoints including basic chat and enhanced contextual chat
 */
export class ChatController extends BaseController {

  // ============ VALIDATION SCHEMAS ============
  private static readonly BasicChatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1, 'Message content cannot be empty')
    })).min(1, 'At least one message is required'),
    model: z.string().optional().default('anthropic/claude-3.5-sonnet'),
    max_tokens: z.number().int().min(1).max(4000).optional().default(2000),
    temperature: z.number().min(0).max(2).optional().default(0.7),
    apiKey: z.string().optional()
  });

  private static readonly EnhancedChatSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    context: z.object({
      scope: z.enum(['general', 'boardguru', 'organization', 'vault', 'asset']),
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      vaultId: z.string().optional(),
      vaultName: z.string().optional(),
      assetId: z.string().optional(),
      assetName: z.string().optional()
    }),
    options: z.object({
      includeWebSearch: z.boolean().optional().default(false),
      includeReferences: z.boolean().optional().default(true),
      maxReferences: z.number().int().min(1).max(20).optional().default(5),
      model: z.string().optional().default('anthropic/claude-3.5-sonnet'),
      temperature: z.number().min(0).max(2).optional().default(0.7),
      maxTokens: z.number().int().min(1).max(4000).optional().default(1500)
    }).optional().default({})
  });

  private static readonly ChatSessionSchema = z.object({
    title: z.string().min(1, 'Session title is required').max(100, 'Title too long'),
    context: z.object({
      scope: z.enum(['general', 'boardguru', 'organization', 'vault', 'asset']),
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      vaultId: z.string().optional(),
      vaultName: z.string().optional(),
      assetId: z.string().optional(),
      assetName: z.string().optional()
    })
  });

  // ============ BASIC CHAT ============

  /**
   * POST /chat/messages - Send basic chat message to OpenRouter
   */
  async sendBasicMessage(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const bodyResult = await this.validateBody(request, ChatController.BasicChatSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { messages, model, max_tokens, temperature, apiKey } = ResultUtils.unwrap(bodyResult);
      
      try {
        // Use provided API key or fallback to server environment variable
        const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
        
        if (!openRouterKey) {
          return Err(new Error('API key not configured'));
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'BoardGuru'
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens,
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
        
        return Ok({
          success: true,
          message: data.choices[0].message.content,
          usage: data.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          },
          model: model,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        return Err(new Error(`Chat API error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ ENHANCED CONTEXTUAL CHAT ============

  /**
   * POST /chat/enhanced - Send enhanced contextual chat message
   */
  async sendEnhancedMessage(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, ChatController.EnhancedChatSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { message, context, options } = ResultUtils.unwrap(bodyResult);
      const { 
        includeWebSearch, 
        includeReferences, 
        maxReferences, 
        model, 
        temperature, 
        maxTokens 
      } = options || {};
      
      try {
        let references: EnhancedChatResponse['references'] = {
          assets: [],
          websites: [],
          vaults: [],
          meetings: [],
          reports: []
        };

        let searchMetadata = {
          query_processed: message,
          search_time_ms: 0,
          total_results_found: 0,
          context_used: context.scope
        };

        // Perform search if references are requested
        if (includeReferences) {
          const searchStartTime = Date.now();
          
          try {
            const contextId = context.organizationId || context.vaultId || context.assetId;
            if (contextId && searchService) {
              const searchRequest = {
                query: message,
                context_scope: context.scope,
                context_id: contextId,
                limit: (maxReferences || 5) * 2, // Get more results for better filtering
                search_type: 'hybrid' as const
              };

              const searchResponse = await searchService.search(searchRequest);
              const searchTime = Date.now() - searchStartTime;

              searchMetadata = {
                query_processed: message,
                search_time_ms: searchTime,
                total_results_found: searchResponse.total_count,
                context_used: context.scope
              };

              // Transform search results to references
              references.assets = searchResponse.results
                .slice(0, maxReferences || 5)
                .map(result => this.transformToAssetReference(result));

              // Track the search query
              await searchService.trackSearchQuery(
                message,
                context.scope,
                contextId,
                userId,
                context.organizationId,
                searchResponse.total_count,
                searchTime
              );
            }
          } catch (searchError) {
            console.error('Search error:', searchError);
            // Continue without search results
          }
        }

        // Build context-aware system prompt
        const systemPrompt = this.buildSystemPrompt(context, references);
        
        // Prepare messages for OpenRouter
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ];

        // Call OpenRouter API
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Title': 'BoardGuru AI Assistant'
          },
          body: JSON.stringify({
            model: model || 'anthropic/claude-3.5-sonnet',
            messages,
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 1500,
            stream: false
          })
        });

        if (!openRouterResponse.ok) {
          throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`);
        }

        const aiResponse = await openRouterResponse.json();
        const aiMessage = aiResponse.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

        // Generate suggestions based on context
        const suggestions = this.generateSuggestions(message, context.scope);

        const totalTime = Date.now() - startTime;

        const response: EnhancedChatResponse = {
          success: true,
          message: aiMessage,
          references: includeReferences ? references : {
            assets: [],
            websites: [],
            vaults: [],
            meetings: [],
            reports: []
          },
          suggestions,
          search_metadata: includeReferences ? searchMetadata : {
            query_processed: message,
            search_time_ms: 0,
            total_results_found: 0,
            context_used: context.scope
          },
          usage: {
            prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
            completion_tokens: aiResponse.usage?.completion_tokens || 0,
            total_tokens: aiResponse.usage?.total_tokens || 0
          }
        };
        
        return Ok(response);
        
      } catch (error) {
        const errorResponse: EnhancedChatResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'An unexpected error occurred',
          search_metadata: {
            query_processed: message,
            search_time_ms: Date.now() - startTime,
            total_results_found: 0,
            context_used: context.scope
          }
        };
        
        return Ok(errorResponse);
      }
    });
  }

  // ============ CHAT SESSIONS ============

  /**
   * GET /chat/sessions - Get user's chat sessions
   */
  async getChatSessions(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      organizationId: z.string().optional(),
      scope: z.enum(['general', 'boardguru', 'organization', 'vault', 'asset']).optional()
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { page, limit, organizationId, scope } = ResultUtils.unwrap(queryResult);
      
      try {
        // TODO: Implement actual database query
        // This would typically fetch from a chat_sessions table
        
        const mockSessions: ChatSession[] = [
          {
            id: 'session-1',
            userId,
            organizationId: organizationId,
            title: 'Board Governance Discussion',
            messages: [
              {
                role: 'user',
                content: 'What are the key governance principles?',
                timestamp: new Date().toISOString()
              },
              {
                role: 'assistant',
                content: 'Key governance principles include transparency, accountability, responsibility...',
                timestamp: new Date().toISOString()
              }
            ],
            context: {
              scope: scope || 'organization',
              organizationId: organizationId,
              organizationName: 'Sample Organization'
            },
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        // Apply filters
        let filteredSessions = mockSessions;
        
        if (organizationId) {
          filteredSessions = filteredSessions.filter(session => 
            session.organizationId === organizationId
          );
        }
        
        if (scope) {
          filteredSessions = filteredSessions.filter(session => 
            session.context.scope === scope
          );
        }
        
        // Simple pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
        
        return Ok({
          sessions: paginatedSessions.map(session => ({
            ...session,
            messageCount: session.messages.length,
            lastMessage: session.messages[session.messages.length - 1]?.content?.substring(0, 100) + '...'
          })),
          pagination: {
            page,
            limit,
            total: filteredSessions.length,
            totalPages: Math.ceil(filteredSessions.length / limit)
          },
          userId
        });
      } catch (error) {
        return Err(new Error(`Failed to get chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * POST /chat/sessions - Create new chat session
   */
  async createChatSession(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, ChatController.ChatSessionSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { title, context } = ResultUtils.unwrap(bodyResult);
      
      try {
        // TODO: Implement actual database insertion
        
        const newSession: ChatSession = {
          id: `session-${Date.now()}`,
          userId,
          organizationId: context.organizationId,
          title,
          messages: [],
          context,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return Ok({
          session: newSession,
          created: true,
          createdAt: newSession.createdAt
        });
      } catch (error) {
        return Err(new Error(`Failed to create chat session: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * GET /chat/sessions/[id] - Get specific chat session
   */
  async getChatSession(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      
      try {
        // TODO: Implement actual database query
        
        const mockSession: ChatSession = {
          id,
          userId,
          title: 'Board Governance Discussion',
          messages: [
            {
              role: 'user',
              content: 'What are the key governance principles?',
              timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
            },
            {
              role: 'assistant',
              content: 'Key governance principles include transparency, accountability, responsibility, fairness, and effectiveness. These principles ensure that organizations are managed in the best interests of all stakeholders.',
              timestamp: new Date(Date.now() - 59 * 60 * 1000).toISOString()
            }
          ],
          context: {
            scope: 'organization',
            organizationId: 'org-1',
            organizationName: 'Sample Organization'
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return Ok({
          session: mockSession,
          messageCount: mockSession.messages.length
        });
      } catch (error) {
        return Err(new Error(`Failed to get chat session: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * DELETE /chat/sessions/[id] - Delete chat session
   */
  async deleteChatSession(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      
      try {
        // TODO: Implement actual database deletion
        
        return Ok({
          deleted: true,
          sessionId: id,
          deletedAt: new Date().toISOString()
        });
      } catch (error) {
        return Err(new Error(`Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ HELPER METHODS ============

  private buildSystemPrompt(
    context: { scope: string; organizationName?: string; vaultName?: string; assetName?: string },
    references?: EnhancedChatResponse['references']
  ): string {
    let prompt = `You are BoardGuru AI Assistant, an intelligent assistant specialized in corporate governance, board management, and document analysis.

Current Context: ${context.scope}`;

    if (context.organizationName) {
      prompt += `\nOrganization: ${context.organizationName}`;
    }
    if (context.vaultName) {
      prompt += `\nVault: ${context.vaultName}`;
    }
    if (context.assetName) {
      prompt += `\nAsset: ${context.assetName}`;
    }

    prompt += `\n\nAvailable References:`;

    if (references?.assets && references.assets.length > 0) {
      prompt += `\nDocuments & Assets:\n`;
      references.assets.forEach((asset, index) => {
        prompt += `${index + 1}. "${asset.title}" - ${asset.description || 'No description'} (${asset.metadata.category})\n`;
      });
    }

    prompt += `\n\nInstructions:
1. Provide helpful, accurate responses based on the user's question and the available context
2. When referencing documents from the available references, use this format: [Document Title](ref:asset:asset-id)
3. Be specific and actionable in your responses
4. If you don't have enough context to answer completely, acknowledge this and suggest what additional information might be helpful
5. Focus on corporate governance, compliance, board management, and document-related topics
6. Use professional language appropriate for executive and board-level audiences

Remember: Always cite your sources using the reference format when mentioning specific documents.`;

    return prompt;
  }

  private transformToAssetReference(searchResult: any): AssetReference {
    return {
      id: searchResult.asset?.id || 'unknown',
      type: this.getAssetType(searchResult.asset?.file_type || 'document'),
      title: searchResult.asset?.title || 'Untitled Document',
      description: searchResult.asset?.description,
      excerpt: searchResult.metadata?.ai_summary,
      url: `/dashboard/assets/${searchResult.asset?.id}`,
      download_url: `/api/assets/${searchResult.asset?.id}/download`,
      thumbnail_url: searchResult.asset?.thumbnail_url,
      relevance_score: searchResult.metadata?.relevance_score || 0.5,
      confidence_score: Math.min((searchResult.metadata?.relevance_score || 0.5) * 0.1, 1.0),
      metadata: {
        fileName: searchResult.asset?.file_name || 'unknown',
        fileSize: searchResult.asset?.file_size,
        fileType: searchResult.asset?.file_type || 'unknown',
        lastModified: searchResult.asset?.updated_at || new Date().toISOString(),
        vault: searchResult.vault,
        organization: searchResult.organization,
        tags: searchResult.asset?.tags || [],
        category: searchResult.asset?.category,
        estimatedReadTime: searchResult.metadata?.estimated_read_time,
        complexityLevel: searchResult.metadata?.complexity_level
      },
      preview: {
        content: searchResult.highlight?.content,
        wordCount: searchResult.metadata?.ai_summary?.length || 0
      }
    };
  }

  private getAssetType(fileType: string): AssetReference['type'] {
    const lowerType = fileType.toLowerCase();
    if (lowerType.includes('pdf')) return 'pdf';
    if (lowerType.includes('doc') || lowerType.includes('text')) return 'text';
    if (lowerType.includes('xls') || lowerType.includes('csv')) return 'spreadsheet';
    if (lowerType.includes('ppt')) return 'presentation';
    if (lowerType.includes('image') || lowerType.includes('png') || lowerType.includes('jpg')) return 'image';
    return 'document';
  }

  private generateSuggestions(query: string, scope: string): string[] {
    const suggestions: string[] = [];
    
    if (query.length > 3) {
      suggestions.push(`Find documents related to ${query}`);
      
      if (scope === 'organization') {
        suggestions.push(`Show governance documents about ${query}`);
        suggestions.push(`Find board meetings discussing ${query}`);
      } else if (scope === 'vault') {
        suggestions.push(`Search vault contents for ${query}`);
        suggestions.push(`Show recent documents about ${query}`);
      }
      
      suggestions.push(`Generate report on ${query}`);
      suggestions.push(`What are the key insights about ${query}?`);
    }
    
    return suggestions.slice(0, 4);
  }
}