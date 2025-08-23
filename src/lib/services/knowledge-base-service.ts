import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface KnowledgeBaseCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  category_id: string;
  article_type: string;
  tags: string[];
  status: string;
  version: number;
  previous_version_id: string | null;
  is_searchable: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  last_reviewed_at: string | null;
  expires_at: string | null;
  attachments: any;
  author_id: string;
  reviewer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithCategory extends KnowledgeBaseArticle {
  category?: KnowledgeBaseCategory;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface AIConversation {
  id: string;
  user_id: string;
  session_id: string;
  question: string;
  answer: string;
  confidence_score: number | null;
  sources: any;
  feedback_rating: number | null;
  feedback_comment: string | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface SearchResult {
  articles: ArticleWithCategory[];
  total_count: number;
  search_time_ms: number;
}

export class KnowledgeBaseService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get all knowledge base categories
   */
  async getCategories(includeInactive = false) {
    let query = this.supabase
      .from('knowledge_base_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group categories by parent_id to create hierarchy
    const rootCategories = data.filter(cat => !cat.parent_id);
    const subcategories = data.filter(cat => cat.parent_id);

    const categoriesWithChildren = rootCategories.map(category => ({
      ...category,
      children: subcategories.filter(sub => sub.parent_id === category.id)
    }));

    return {
      hierarchical: categoriesWithChildren,
      flat: data as KnowledgeBaseCategory[]
    };
  }

  /**
   * Get articles with optional filtering
   */
  async getArticles(filters?: {
    category_id?: string;
    article_type?: string;
    status?: string;
    tags?: string[];
    author_id?: string;
    search?: string;
    is_searchable?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email),
        reviewer:users!knowledge_base_articles_reviewer_id_fkey(id, first_name, last_name, email)
      `)
      .order('updated_at', { ascending: false });

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.article_type) {
      query = query.eq('article_type', filters.article_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.author_id) {
      query = query.eq('author_id', filters.author_id);
    }
    if (filters?.is_searchable !== undefined) {
      query = query.eq('is_searchable', filters.is_searchable);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ArticleWithCategory[];
  }

  /**
   * Get a single article by ID
   */
  async getArticle(articleId: string, userId?: string) {
    const { data: article, error } = await this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email),
        reviewer:users!knowledge_base_articles_reviewer_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', articleId)
      .single();

    if (error) throw error;

    // Track view if user is provided
    if (userId && article.status === 'published') {
      await this.trackArticleView(userId, articleId);
    }

    return article as ArticleWithCategory;
  }

  /**
   * Create a new article
   */
  async createArticle(data: {
    title: string;
    content: string;
    summary?: string;
    category_id: string;
    article_type?: string;
    tags?: string[];
    status?: string;
    is_searchable?: boolean;
    attachments?: any;
    author_id: string;
  }) {
    const { data: article, error } = await this.supabase
      .from('knowledge_base_articles')
      .insert({
        title: data.title,
        content: data.content,
        summary: data.summary,
        category_id: data.category_id,
        article_type: data.article_type || 'article',
        tags: data.tags || [],
        status: data.status || 'draft',
        is_searchable: data.is_searchable ?? true,
        attachments: data.attachments,
        author_id: data.author_id,
        version: 1
      })
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;
    return article as ArticleWithCategory;
  }

  /**
   * Update an article
   */
  async updateArticle(
    articleId: string,
    updates: {
      title?: string;
      content?: string;
      summary?: string;
      category_id?: string;
      article_type?: string;
      tags?: string[];
      status?: string;
      is_searchable?: boolean;
      attachments?: any;
      reviewer_id?: string;
      last_reviewed_at?: string;
      expires_at?: string;
    }
  ) {
    // If content is being changed, increment version
    const { data: currentArticle } = await this.supabase
      .from('knowledge_base_articles')
      .select('version, content')
      .eq('id', articleId)
      .single();

    const shouldIncrementVersion = updates.content && 
      currentArticle && 
      updates.content !== currentArticle.content;

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (shouldIncrementVersion) {
      updateData.version = (currentArticle.version || 1) + 1;
      updateData.previous_version_id = articleId;
    }

    const { data: article, error } = await this.supabase
      .from('knowledge_base_articles')
      .update(updateData)
      .eq('id', articleId)
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email),
        reviewer:users!knowledge_base_articles_reviewer_id_fkey(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;
    return article as ArticleWithCategory;
  }

  /**
   * Delete an article (soft delete by setting status to archived)
   */
  async deleteArticle(articleId: string) {
    const { data: article, error } = await this.supabase
      .from('knowledge_base_articles')
      .update({
        status: 'archived',
        is_searchable: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select()
      .single();

    if (error) throw error;
    return article as KnowledgeBaseArticle;
  }

  /**
   * Search articles using full-text search
   */
  async searchArticles(
    searchTerm: string,
    filters?: {
      category_id?: string;
      article_type?: string;
      tags?: string[];
      limit?: number;
    }
  ): Promise<SearchResult> {
    const startTime = Date.now();

    let query = this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'published')
      .eq('is_searchable', true);

    // Apply text search
    if (searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
    }

    // Apply filters
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.article_type) {
      query = query.eq('article_type', filters.article_type);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Order by relevance (view_count and helpful_count for now)
    query = query.order('helpful_count', { ascending: false })
                 .order('view_count', { ascending: false })
                 .limit(filters?.limit || 20);

    const { data, error, count } = await query;
    if (error) throw error;

    const searchTime = Date.now() - startTime;

    return {
      articles: data as ArticleWithCategory[],
      total_count: count || data.length,
      search_time_ms: searchTime
    };
  }

  /**
   * Get related articles based on tags and category
   */
  async getRelatedArticles(articleId: string, limit = 5) {
    // Get the current article's tags and category
    const { data: currentArticle } = await this.supabase
      .from('knowledge_base_articles')
      .select('tags, category_id')
      .eq('id', articleId)
      .single();

    if (!currentArticle) return [];

    let query = this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'published')
      .neq('id', articleId)
      .limit(limit);

    // Prioritize articles with overlapping tags or same category
    if (currentArticle.tags && currentArticle.tags.length > 0) {
      query = query.overlaps('tags', currentArticle.tags);
    } else if (currentArticle.category_id) {
      query = query.eq('category_id', currentArticle.category_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ArticleWithCategory[];
  }

  /**
   * Track article view
   */
  private async trackArticleView(userId: string, articleId: string) {
    // Log the interaction
    await this.supabase
      .from('knowledge_base_interactions')
      .insert({
        user_id: userId,
        article_id: articleId,
        interaction_type: 'view'
      });

    // Increment view count
    await this.supabase
      .rpc('increment', {
        table_name: 'knowledge_base_articles',
        column_name: 'view_count',
        id: articleId
      });
  }

  /**
   * Submit article feedback
   */
  async submitFeedback(
    userId: string,
    articleId: string,
    feedbackType: 'helpful' | 'not_helpful',
    comment?: string
  ) {
    // Log the interaction
    await this.supabase
      .from('knowledge_base_interactions')
      .insert({
        user_id: userId,
        article_id: articleId,
        interaction_type: feedbackType,
        feedback: comment
      });

    // Update helpful/not helpful count
    const columnName = feedbackType === 'helpful' ? 'helpful_count' : 'not_helpful_count';
    await this.supabase
      .rpc('increment', {
        table_name: 'knowledge_base_articles',
        column_name: columnName,
        id: articleId
      });

    return { success: true };
  }

  /**
   * AI Assistant - Ask a question about the knowledge base
   */
  async askAIAssistant(
    userId: string,
    question: string,
    sessionId?: string
  ): Promise<{
    answer: string;
    confidence_score: number;
    sources: ArticleWithCategory[];
    conversation_id: string;
  }> {
    const startTime = Date.now();
    
    // Generate or use provided session ID
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Search for relevant articles
      const searchResults = await this.searchArticles(question, { limit: 5 });
      const relevantArticles = searchResults.articles;

      // Step 2: Generate AI response based on found content
      const answer = await this.generateAIResponse(question, relevantArticles);
      
      // Step 3: Calculate confidence score based on search results quality
      const confidenceScore = this.calculateConfidenceScore(question, relevantArticles);

      const responseTime = Date.now() - startTime;

      // Step 4: Log the conversation
      const { data: conversation, error } = await this.supabase
        .from('manual_ai_conversations')
        .insert({
          user_id: userId,
          session_id: finalSessionId,
          question,
          answer,
          confidence_score: confidenceScore,
          sources: relevantArticles.map(article => ({
            id: article.id,
            title: article.title,
            category: article.category?.name
          })),
          response_time_ms: responseTime
        })
        .select()
        .single();

      if (error) throw error;

      return {
        answer,
        confidence_score: confidenceScore,
        sources: relevantArticles,
        conversation_id: conversation.id
      };
    } catch (error) {
      console.error('Error in AI assistant:', error);
      
      // Return fallback response
      const fallbackAnswer = "I apologize, but I'm unable to provide a comprehensive answer to your question at the moment. Please try rephrasing your question or browse the knowledge base categories to find the information you need.";
      
      await this.supabase
        .from('manual_ai_conversations')
        .insert({
          user_id: userId,
          session_id: finalSessionId,
          question,
          answer: fallbackAnswer,
          confidence_score: 0.1,
          sources: [],
          response_time_ms: Date.now() - startTime
        });

      return {
        answer: fallbackAnswer,
        confidence_score: 0.1,
        sources: [],
        conversation_id: ''
      };
    }
  }

  /**
   * Generate AI response based on relevant articles
   */
  private async generateAIResponse(question: string, articles: ArticleWithCategory[]): Promise<string> {
    if (articles.length === 0) {
      return "I couldn't find specific information to answer your question in our knowledge base. Please try rephrasing your question or browse our categories for relevant topics.";
    }

    // Create a comprehensive response based on the most relevant articles
    const topArticles = articles.slice(0, 3);
    let response = "Based on our board governance knowledge base, here's what I found:\n\n";

    topArticles.forEach((article, index) => {
      response += `**${index + 1}. ${article.title}**\n`;
      
      // Extract relevant snippets from the article content
      const snippet = this.extractRelevantSnippet(question, article.content);
      response += `${snippet}\n\n`;
    });

    response += "For more detailed information, please refer to the full articles mentioned above.";

    return response;
  }

  /**
   * Extract relevant snippet from article content based on the question
   */
  private extractRelevantSnippet(question: string, content: string): string {
    // Simple keyword-based extraction
    const questionWords = question.toLowerCase().split(' ')
      .filter(word => word.length > 3 && !['what', 'how', 'when', 'where', 'why', 'which', 'that', 'this'].includes(word));
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Find sentences that contain question keywords
    const relevantSentences = sentences.filter(sentence => 
      questionWords.some(word => 
        sentence.toLowerCase().includes(word.toLowerCase())
      )
    );

    if (relevantSentences.length > 0) {
      // Return the first 2-3 relevant sentences, up to 300 characters
      const snippet = relevantSentences.slice(0, 3).join('. ').trim();
      return snippet.length > 300 ? snippet.substring(0, 300) + '...' : snippet;
    }

    // Fallback: return first 300 characters of the article
    return content.length > 300 ? content.substring(0, 300) + '...' : content;
  }

  /**
   * Calculate confidence score based on search result quality
   */
  private calculateConfidenceScore(question: string, articles: ArticleWithCategory[]): number {
    if (articles.length === 0) return 0.1;

    let score = Math.min(0.5 + (articles.length * 0.1), 1.0);
    
    // Boost score if articles have high engagement
    const avgHelpfulCount = articles.reduce((sum, article) => sum + (article.helpful_count || 0), 0) / articles.length;
    if (avgHelpfulCount > 5) score = Math.min(score + 0.15, 1.0);
    
    // Reduce score if articles are old
    const recentArticles = articles.filter(article => {
      const updatedDate = new Date(article.updated_at);
      const monthsOld = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsOld < 12;
    });
    
    if (recentArticles.length < articles.length * 0.5) {
      score = Math.max(score - 0.2, 0.2);
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Provide feedback on AI response
   */
  async provideFeedback(
    conversationId: string,
    rating: number,
    comment?: string
  ) {
    const { data, error } = await this.supabase
      .from('manual_ai_conversations')
      .update({
        feedback_rating: rating,
        feedback_comment: comment
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's AI conversation history
   */
  async getConversationHistory(userId: string, sessionId?: string, limit = 20) {
    let query = this.supabase
      .from('manual_ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AIConversation[];
  }

  /**
   * Get popular/trending articles
   */
  async getPopularArticles(limit = 10, timeframe = '30 days') {
    const { data, error } = await this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .order('helpful_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ArticleWithCategory[];
  }

  /**
   * Get recently updated articles
   */
  async getRecentlyUpdatedArticles(limit = 10) {
    const { data, error } = await this.supabase
      .from('knowledge_base_articles')
      .select(`
        *,
        category:knowledge_base_categories(*),
        author:users!knowledge_base_articles_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ArticleWithCategory[];
  }

  /**
   * Get knowledge base analytics
   */
  async getAnalytics(dateRange?: { start: string; end: string }) {
    // This would typically involve more complex analytics queries
    // For now, we'll return basic statistics

    const { data: articlesCount } = await this.supabase
      .from('knowledge_base_articles')
      .select('id', { count: 'exact' })
      .eq('status', 'published');

    const { data: totalViews } = await this.supabase
      .from('knowledge_base_articles')
      .select('view_count')
      .eq('status', 'published');

    const { data: recentInteractions } = await this.supabase
      .from('knowledge_base_interactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalViewCount = totalViews?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0;

    return {
      total_articles: articlesCount?.length || 0,
      total_views: totalViewCount,
      recent_interactions: recentInteractions?.length || 0,
      avg_views_per_article: articlesCount?.length ? totalViewCount / articlesCount.length : 0
    };
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();