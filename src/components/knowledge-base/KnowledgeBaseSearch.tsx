'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  MessageCircle, 
  Send, 
  ThumbsUp, 
  ThumbsDown,
  BookOpen,
  Lightbulb,
  Clock,
  User,
  Sparkles,
  FileText,
  Tag,
  Eye
} from 'lucide-react';

interface SearchResult {
  articles: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    category: {
      name: string;
      icon: string;
    };
    author: {
      first_name: string;
      last_name: string;
    };
    view_count: number;
    helpful_count: number;
    tags: string[];
    updated_at: string;
  }>;
  total_count: number;
  search_time_ms: number;
}

interface AIResponse {
  answer: string;
  confidence_score: number;
  sources: Array<{
    id: string;
    title: string;
    category: {
      name: string;
    };
  }>;
  conversation_id: string;
}

interface KnowledgeBaseSearchProps {
  userId: string;
}

export default function KnowledgeBaseSearch({ userId }: KnowledgeBaseSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'ai'>('search');
  const [popularArticles, setPopularArticles] = useState<any[]>([]);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchPopularAndRecentArticles();
  }, []);

  const fetchPopularAndRecentArticles = async () => {
    try {
      // Fetch popular articles
      const popularResponse = await fetch('/api/knowledge-base/popular?type=popular&limit=5');
      if (popularResponse.ok) {
        const popularResult = await popularResponse.json();
        setPopularArticles(popularResult.data);
      }

      // Fetch recent articles
      const recentResponse = await fetch('/api/knowledge-base/popular?type=recent&limit=5');
      if (recentResponse.ok) {
        const recentResult = await recentResponse.json();
        setRecentArticles(recentResult.data);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-base/search?q=${encodeURIComponent(searchTerm)}&limit=10`);
      if (!response.ok) throw new Error('Search failed');
      
      const result = await response.json();
      setSearchResults(result.data);
      setActiveTab('search');
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setAiLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion })
      });

      if (!response.ok) throw new Error('AI query failed');
      
      const result = await response.json();
      setAiResponse(result.data);
      setActiveTab('ai');
    } catch (error) {
      console.error('Error with AI question:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIFeedback = async (rating: number, comment?: string) => {
    if (!aiResponse) return;

    try {
      await fetch(`/api/knowledge-base/ai-assistant/${aiResponse.conversation_id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleArticleFeedback = async (articleId: string, feedbackType: 'helpful' | 'not_helpful') => {
    try {
      await fetch(`/api/knowledge-base/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_type: feedbackType })
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const formatAIAnswer = (answer: string) => {
    // Convert markdown-style formatting to HTML
    return answer
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/^(.*)$/, '<p>$1</p>');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Board Governance Knowledge Base</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Search our comprehensive knowledge base or ask our AI assistant for instant answers to your board governance questions.
        </p>
      </div>

      {/* Search and AI Input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traditional Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Articles
            </CardTitle>
            <CardDescription>
              Search through our curated collection of governance articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                ref={searchInputRef}
                placeholder="e.g., fiduciary duties, board meetings, conflict of interest..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Ask AI Assistant
            </CardTitle>
            <CardDescription>
              Get instant, intelligent answers to your governance questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAIQuestion} className="space-y-4">
              <Textarea
                ref={aiInputRef}
                placeholder="Ask anything about board governance, such as 'What are the key responsibilities of an audit committee chair?'"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <Button type="submit" disabled={aiLoading} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                {aiLoading ? 'Thinking...' : 'Ask AI'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {(searchResults || aiResponse) && (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b">
            {searchResults && (
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Search Results ({searchResults.total_count})
              </button>
            )}
            {aiResponse && (
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Answer
              </button>
            )}
          </div>

          {/* Search Results */}
          {activeTab === 'search' && searchResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found {searchResults.total_count} results in {searchResults.search_time_ms}ms
                </p>
              </div>
              
              {searchResults.articles.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                    <p className="text-gray-600">Try adjusting your search terms or ask the AI assistant instead.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {searchResults.articles.map((article) => (
                    <Card key={article.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg text-blue-600 hover:text-blue-800 cursor-pointer">
                              {article.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {article.summary || article.content.substring(0, 200) + '...'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {article.author.first_name} {article.author.last_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {article.view_count} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(article.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {article.category.name}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArticleFeedback(article.id, 'helpful')}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArticleFeedback(article.id, 'not_helpful')}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {article.tags.slice(0, 5).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Response */}
          {activeTab === 'ai' && aiResponse && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    AI Assistant Answer
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={aiResponse.confidence_score > 0.7 ? 'default' : 'secondary'}
                      className={
                        aiResponse.confidence_score > 0.7 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {Math.round(aiResponse.confidence_score * 100)}% confident
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatAIAnswer(aiResponse.answer) }}
                />
                
                {aiResponse.sources.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Sources Referenced
                    </h4>
                    <div className="space-y-2">
                      {aiResponse.sources.map((source) => (
                        <div key={source.id} className="flex items-center gap-2 text-sm">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                            {source.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {source.category.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Was this answer helpful?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAIFeedback(5)}
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAIFeedback(2)}
                    >
                      <ThumbsDown className="w-3 h-3 mr-1" />
                      No
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Popular and Recent Articles */}
      {!searchResults && !aiResponse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Popular Articles
              </CardTitle>
              <CardDescription>
                Most viewed and helpful articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularArticles.map((article) => (
                  <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <BookOpen className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-blue-600 hover:text-blue-800">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {article.summary || article.content.substring(0, 100) + '...'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{article.view_count} views</span>
                        <span>•</span>
                        <span>{article.helpful_count} helpful</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recently Updated
              </CardTitle>
              <CardDescription>
                Latest updates to our knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentArticles.map((article) => (
                  <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <FileText className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-green-600 hover:text-green-800">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {article.summary || article.content.substring(0, 100) + '...'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {article.category.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}