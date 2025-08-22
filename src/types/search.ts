// Search system types for intelligent AI reference system

export interface AssetSearchMetadata {
  id: string;
  asset_id: string;
  ai_summary?: string;
  ai_key_topics: string[];
  ai_categories: string[];
  search_vector?: string; // tsvector representation
  title_vector?: string;
  content_vector?: string;
  title_embedding?: number[]; // Vector embedding as array
  content_embedding?: number[];
  relevance_score: number;
  popularity_score: number;
  recency_score: number;
  document_type?: string;
  estimated_read_time?: number;
  complexity_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  last_indexed_at: string;
}

export interface SearchQuery {
  id: string;
  user_id?: string;
  organization_id?: string;
  query_text: string;
  query_type: 'chat' | 'manual' | 'auto-suggest';
  context_scope: 'general' | 'boardguru' | 'organization' | 'vault' | 'asset';
  context_id?: string;
  results_count: number;
  results_asset_ids: string[];
  clicked_asset_ids: string[];
  search_duration_ms?: number;
  ai_response_duration_ms?: number;
  user_rating?: number;
  user_feedback?: string;
  created_at: string;
}

export interface AIReference {
  id: string;
  chat_message_id?: string;
  user_id?: string;
  reference_type: 'asset' | 'website' | 'report' | 'dashboard' | 'vault' | 'meeting';
  reference_id?: string;
  reference_url?: string;
  reference_title: string;
  reference_description?: string;
  relevance_score: number;
  confidence_score: number;
  citation_text?: string;
  viewed: boolean;
  clicked: boolean;
  downloaded: boolean;
  shared: boolean;
  created_at: string;
  last_interacted_at?: string;
}

export interface AssetAccessAnalytics {
  id: string;
  asset_id: string;
  user_id?: string;
  organization_id?: string;
  access_type: 'view' | 'download' | 'search_result' | 'ai_reference';
  access_source: 'chat' | 'search' | 'direct' | 'recommendation';
  context_data?: Record<string, unknown>;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

// Search request/response types
export interface SearchRequest {
  query: string;
  context_scope: 'general' | 'boardguru' | 'organization' | 'vault' | 'asset';
  context_id?: string; // Organization ID, Vault ID, or Asset ID
  limit?: number;
  offset?: number;
  filters?: {
    file_types?: string[];
    categories?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    min_relevance?: number;
  };
  sort_by?: 'relevance' | 'popularity' | 'recency' | 'title' | 'created_at';
  search_type?: 'hybrid' | 'keyword' | 'semantic';
}

export interface SearchResult {
  asset: {
    id: string;
    title: string;
    description?: string;
    file_name: string;
    file_type: string;
    file_size: number;
    category: string;
    tags: string[];
    thumbnail_url?: string;
    created_at: string;
    updated_at: string;
    owner?: {
      id: string;
      full_name?: string;
      email: string;
    };
  };
  metadata: {
    ai_summary?: string;
    ai_key_topics: string[];
    relevance_score: number;
    popularity_score: number;
    recency_score: number;
    estimated_read_time?: number;
    complexity_level: 'low' | 'medium' | 'high';
  };
  vault?: {
    id: string;
    name: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  highlight?: {
    title?: string;
    description?: string;
    content?: string;
  };
  access_url: string;
  download_url?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  search_time_ms: number;
  facets?: {
    file_types: Array<{ value: string; count: number }>;
    categories: Array<{ value: string; count: number }>;
    organizations: Array<{ value: string; count: number; label: string }>;
    vaults: Array<{ value: string; count: number; label: string }>;
  };
  suggestions?: string[];
}

// Reference types for AI chat responses
export interface AssetReference {
  id: string;
  type: 'document' | 'spreadsheet' | 'presentation' | 'image' | 'pdf' | 'text';
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
    fileSize: number;
    fileType: string;
    lastModified: string;
    vault?: {
      id: string;
      name: string;
    };
    organization?: {
      id: string;
      name: string;
    };
    tags: string[];
    category: string;
    estimatedReadTime?: number;
    complexityLevel: 'low' | 'medium' | 'high';
  };
  preview?: {
    content?: string;
    pageCount?: number;
    wordCount?: number;
  };
}

export interface WebReference {
  url: string;
  title: string;
  description?: string;
  excerpt?: string;
  favicon_url?: string;
  published_date?: string;
  domain: string;
  relevance_score: number;
  confidence_score: number;
}

export interface VaultReference {
  id: string;
  name: string;
  description?: string;
  url: string;
  asset_count: number;
  member_count: number;
  last_activity?: string;
  organization: {
    id: string;
    name: string;
  };
  relevance_score: number;
  confidence_score: number;
}

export interface MeetingReference {
  id: string;
  title: string;
  description?: string;
  url: string;
  meeting_date?: string;
  meeting_type: string;
  status: string;
  agenda_items?: string[];
  organization: {
    id: string;
    name: string;
  };
  relevance_score: number;
  confidence_score: number;
}

export interface ReportReference {
  id: string;
  title: string;
  description?: string;
  type: 'dashboard' | 'analytics' | 'summary' | 'financial' | 'governance';
  url: string;
  generated_at: string;
  metrics?: Record<string, unknown>;
  organization?: {
    id: string;
    name: string;
  };
  relevance_score: number;
  confidence_score: number;
}

// Enhanced chat response with references
export interface EnhancedChatResponse {
  success: boolean;
  message?: string;
  references?: {
    assets: AssetReference[];
    websites: WebReference[];
    vaults: VaultReference[];
    meetings: MeetingReference[];
    reports: ReportReference[];
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
  error?: string;
  isWebSearchResult?: boolean;
}

// Search configuration
export interface SearchConfig {
  max_results: number;
  similarity_threshold: number;
  boost_factors: {
    title: number;
    content: number;
    tags: number;
    recency: number;
    popularity: number;
  };
  embedding_model: string;
  enable_fuzzy_search: boolean;
  enable_stemming: boolean;
  language: string;
}

// Search analytics
export interface SearchAnalytics {
  total_searches: number;
  average_response_time: number;
  top_queries: Array<{ query: string; count: number }>;
  click_through_rate: number;
  user_satisfaction_score: number;
  popular_assets: Array<{ asset_id: string; title: string; access_count: number }>;
  search_trends: Array<{ date: string; search_count: number }>;
}

// Embedding service types
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Vector similarity search
export interface SimilaritySearchRequest {
  embedding: number[];
  limit?: number;
  threshold?: number;
  context_filters?: {
    organization_id?: string;
    vault_id?: string;
    file_types?: string[];
    categories?: string[];
  };
}

export interface SimilaritySearchResult {
  asset_id: string;
  similarity_score: number;
  metadata: AssetSearchMetadata;
}

// Auto-suggestion types
export interface SuggestionRequest {
  partial_query: string;
  context_scope: string;
  context_id?: string;
  limit?: number;
}

export interface SuggestionResponse {
  suggestions: Array<{
    text: string;
    type: 'query' | 'asset' | 'topic';
    score: number;
    metadata?: any;
  }>;
}