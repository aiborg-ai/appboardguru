import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { knowledgeBaseService } from '@/lib/services/knowledge-base-service';

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  overlaps: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  single: jest.fn(),
  rpc: jest.fn()
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchArticles', () => {
    it('should search articles successfully', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Board Responsibilities',
          content: 'Board members have fiduciary duties...',
          category: { name: 'Governance' },
          author: { first_name: 'John', last_name: 'Doe' }
        }
      ];

      mockSupabase.single.mockResolvedValue({ 
        data: mockArticles, 
        error: null,
        count: 1
      });

      const result = await knowledgeBaseService.searchArticles('board responsibilities');

      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_articles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_searchable', true);
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('board responsibilities')
      );
      expect(result.articles).toEqual(mockArticles);
      expect(result.total_count).toBe(1);
      expect(result.search_time_ms).toBeGreaterThan(0);
    });

    it('should apply search filters', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: [], 
        error: null,
        count: 0
      });

      await knowledgeBaseService.searchArticles('governance', {
        category_id: 'cat-1',
        article_type: 'policy',
        tags: ['board', 'duties']
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('article_type', 'policy');
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('tags', ['board', 'duties']);
    });

    it('should handle empty search results', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: [], 
        error: null,
        count: 0
      });

      const result = await knowledgeBaseService.searchArticles('nonexistent');

      expect(result.articles).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });
  });

  describe('askAIAssistant', () => {
    it('should generate AI response with sources', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Fiduciary Duties',
          content: 'Board members have three primary fiduciary duties: care, loyalty, and obedience.',
          category: { name: 'Governance' }
        }
      ];

      // Mock search results
      const mockSearchArticles = jest.spyOn(knowledgeBaseService, 'searchArticles');
      mockSearchArticles.mockResolvedValue({
        articles: mockArticles,
        total_count: 1,
        search_time_ms: 50
      });

      // Mock conversation logging
      mockSupabase.single.mockResolvedValue({
        data: { id: 'conv-1' },
        error: null
      });

      const result = await knowledgeBaseService.askAIAssistant(
        'user-1',
        'What are fiduciary duties?'
      );

      expect(result.answer).toContain('fiduciary duties');
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].title).toBe('Fiduciary Duties');
      expect(result.conversation_id).toBe('conv-1');

      mockSearchArticles.mockRestore();
    });

    it('should handle questions with no relevant sources', async () => {
      // Mock empty search results
      const mockSearchArticles = jest.spyOn(knowledgeBaseService, 'searchArticles');
      mockSearchArticles.mockResolvedValue({
        articles: [],
        total_count: 0,
        search_time_ms: 30
      });

      // Mock conversation logging
      mockSupabase.single.mockResolvedValue({
        data: { id: 'conv-1' },
        error: null
      });

      const result = await knowledgeBaseService.askAIAssistant(
        'user-1',
        'What is quantum physics?'
      );

      expect(result.answer).toContain("couldn't find specific information");
      expect(result.confidence_score).toBe(0.1);
      expect(result.sources).toHaveLength(0);

      mockSearchArticles.mockRestore();
    });

    it('should provide fallback response on error', async () => {
      // Mock search error
      const mockSearchArticles = jest.spyOn(knowledgeBaseService, 'searchArticles');
      mockSearchArticles.mockRejectedValue(new Error('Search failed'));

      // Mock fallback conversation logging
      mockSupabase.single.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await knowledgeBaseService.askAIAssistant(
        'user-1',
        'What are board duties?'
      );

      expect(result.answer).toContain("unable to provide a comprehensive answer");
      expect(result.confidence_score).toBe(0.1);
      expect(result.sources).toHaveLength(0);

      mockSearchArticles.mockRestore();
    });
  });

  describe('createArticle', () => {
    it('should create article with default values', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'New Article',
        content: 'Article content',
        category_id: 'cat-1',
        author_id: 'user-1',
        version: 1,
        status: 'draft'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockArticle,
        error: null
      });

      const data = {
        title: 'New Article',
        content: 'Article content',
        category_id: 'cat-1',
        author_id: 'user-1'
      };

      const result = await knowledgeBaseService.createArticle(data);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Article',
        content: 'Article content',
        category_id: 'cat-1',
        author_id: 'user-1',
        article_type: 'article',
        tags: [],
        status: 'draft',
        is_searchable: true,
        version: 1
      }));
      expect(result).toEqual(mockArticle);
    });
  });

  describe('updateArticle', () => {
    it('should increment version when content changes', async () => {
      const currentArticle = {
        version: 1,
        content: 'Old content'
      };

      const updatedArticle = {
        id: 'article-1',
        version: 2,
        content: 'New content'
      };

      // Mock current article fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: currentArticle,
        error: null
      });

      // Mock article update
      mockSupabase.single.mockResolvedValueOnce({
        data: updatedArticle,
        error: null
      });

      const result = await knowledgeBaseService.updateArticle('article-1', {
        content: 'New content'
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        content: 'New content',
        version: 2,
        previous_version_id: 'article-1'
      }));
      expect(result).toEqual(updatedArticle);
    });

    it('should not increment version when content unchanged', async () => {
      const currentArticle = {
        version: 1,
        content: 'Same content'
      };

      const updatedArticle = {
        id: 'article-1',
        version: 1,
        title: 'Updated Title'
      };

      // Mock current article fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: currentArticle,
        error: null
      });

      // Mock article update
      mockSupabase.single.mockResolvedValueOnce({
        data: updatedArticle,
        error: null
      });

      const result = await knowledgeBaseService.updateArticle('article-1', {
        title: 'Updated Title'
      });

      expect(mockSupabase.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ version: 2 })
      );
      expect(result).toEqual(updatedArticle);
    });
  });

  describe('extractRelevantSnippet', () => {
    it('should extract sentences containing question keywords', () => {
      const question = 'What are fiduciary duties?';
      const content = 'Board members serve the company. They have fiduciary duties of care and loyalty. These duties are legally binding. The board must act in the best interests of shareholders.';

      const service = knowledgeBaseService as any;
      const snippet = service.extractRelevantSnippet(question, content);

      expect(snippet).toContain('fiduciary duties');
      expect(snippet).not.toContain('Board members serve the company');
    });

    it('should return first 300 characters when no relevant sentences found', () => {
      const question = 'What is quantum mechanics?';
      const content = 'Board governance is important. Directors must follow policies. The company has various stakeholders.';

      const service = knowledgeBaseService as any;
      const snippet = service.extractRelevantSnippet(question, content);

      expect(snippet).toBe(content); // Content is less than 300 chars
    });

    it('should truncate long snippets', () => {
      const question = 'What are duties?';
      const longContent = 'Directors have many duties and responsibilities. '.repeat(20) + 
                         'These duties include oversight and strategic guidance.';

      const service = knowledgeBaseService as any;
      const snippet = service.extractRelevantSnippet(question, longContent);

      expect(snippet.length).toBeLessThanOrEqual(303); // 300 + '...'
      expect(snippet).toContain('duties');
      expect(snippet.endsWith('...')).toBe(true);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return low confidence for no articles', () => {
      const service = knowledgeBaseService as any;
      const score = service.calculateConfidenceScore('test question', []);

      expect(score).toBe(0.1);
    });

    it('should increase confidence with more articles', () => {
      const articles = [
        { helpful_count: 5, updated_at: '2023-06-01T00:00:00Z' },
        { helpful_count: 3, updated_at: '2023-05-01T00:00:00Z' }
      ];

      const service = knowledgeBaseService as any;
      const score = service.calculateConfidenceScore('test question', articles);

      expect(score).toBeGreaterThan(0.1);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should boost confidence for highly rated articles', () => {
      const highlyRatedArticles = [
        { helpful_count: 10, updated_at: '2023-06-01T00:00:00Z' }
      ];

      const lowRatedArticles = [
        { helpful_count: 1, updated_at: '2023-06-01T00:00:00Z' }
      ];

      const service = knowledgeBaseService as any;
      const highScore = service.calculateConfidenceScore('test', highlyRatedArticles);
      const lowScore = service.calculateConfidenceScore('test', lowRatedArticles);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('getRelatedArticles', () => {
    it('should find articles with overlapping tags', async () => {
      const currentArticle = {
        tags: ['governance', 'audit'],
        category_id: 'cat-1'
      };

      const relatedArticles = [
        { id: 'article-2', tags: ['governance', 'compliance'] },
        { id: 'article-3', tags: ['audit', 'oversight'] }
      ];

      // Mock current article fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: currentArticle,
        error: null
      });

      // Mock related articles fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: relatedArticles,
        error: null
      });

      const result = await knowledgeBaseService.getRelatedArticles('article-1');

      expect(mockSupabase.overlaps).toHaveBeenCalledWith('tags', ['governance', 'audit']);
      expect(result).toEqual(relatedArticles);
    });

    it('should fallback to same category when no tags', async () => {
      const currentArticle = {
        tags: [],
        category_id: 'cat-1'
      };

      // Mock current article fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: currentArticle,
        error: null
      });

      // Mock related articles fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await knowledgeBaseService.getRelatedArticles('article-1');

      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });
  });
});