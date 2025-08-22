export interface FYIInsight {
  id: string
  type: 'news' | 'financial' | 'regulatory' | 'competitive'
  title: string
  summary: string
  content: string
  source: string
  sourceUrl?: string
  publishedAt: Date
  relevanceScore?: number
  entities: string[]
  createdAt: Date
  updatedAt: Date
}

export interface FYIContext {
  entities: string[]
  contextType: 'organization' | 'document' | 'meeting' | 'general'
  primaryEntity?: string
  confidence: number
}

export interface FYIUserPreferences {
  userId: string
  enabled_sources: string[]
  relevance_threshold: number
  auto_refresh_interval: number
  notification_preferences: {
    high_priority: boolean
    medium_priority: boolean
    email_digest: boolean
    in_app_notifications: boolean
  }
  excluded_topics: string[]
  preferred_languages: string[]
  created_at: string
  updated_at: string
}

export interface FYIFilters {
  type?: string
  relevanceThreshold?: number
  fromDate?: string
  toDate?: string
  search?: string
}