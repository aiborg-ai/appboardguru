import { BaseRepository } from './base.repository'
import type { Database } from '../../types/database'

type FYIInsightCache = Database['public']['Tables']['fyi_insights_cache']['Row']
type FYIInsightCacheInsert = Database['public']['Tables']['fyi_insights_cache']['Insert']
type FYIInsightCacheUpdate = Database['public']['Tables']['fyi_insights_cache']['Update']
type FYIUserPreferences = Database['public']['Tables']['fyi_user_preferences']['Row']
type FYIUserInteraction = Database['public']['Tables']['fyi_user_interactions']['Row']

export class FYIRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'FYI'
  }

  protected getSearchFields(): string[] {
    return ['title', 'summary', 'source']
  }

  private handleError(error: any, operation: string): void {
    console.error(`FYIRepository.${operation}:`, error)
  }

  async findCachedInsights(
    organizationId: string,
    context?: string,
    limit: number = 10
  ): Promise<FYIInsightCache[]> {
    try {
      let query = this.supabase
        .from('fyi_insights_cache')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (context) {
        query = query.contains('context_entities', [context])
      }

      const { data, error } = await query
        .order('relevance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        this.handleError(error, 'findCachedInsights')
        return []
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'findCachedInsights')
      return []
    }
  }

  async cacheInsight(insight: FYIInsightCacheInsert): Promise<FYIInsightCache | null> {
    try {
      const { data, error } = await this.supabase
        .from('fyi_insights_cache')
        .insert({
          ...insight,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'cacheInsight')
        return null
      }

      return data
    } catch (error) {
      this.handleError(error, 'cacheInsight')
      return null
    }
  }

  async updateInsightCache(
    id: string, 
    updates: FYIInsightCacheUpdate
  ): Promise<FYIInsightCache | null> {
    try {
      const { data, error } = await this.supabase
        .from('fyi_insights_cache')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'updateInsightCache')
        return null
      }

      return data
    } catch (error) {
      this.handleError(error, 'updateInsightCache')
      return null
    }
  }

  async findUserPreferences(userId: string): Promise<FYIUserPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('fyi_user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findUserPreferences')
      }

      return data || null
    } catch (error) {
      this.handleError(error, 'findUserPreferences')
      return null
    }
  }

  async createOrUpdateUserPreferences(
    userId: string,
    preferences: Partial<FYIUserPreferences>
  ): Promise<FYIUserPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('fyi_user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'createOrUpdateUserPreferences')
        return null
      }

      return data
    } catch (error) {
      this.handleError(error, 'createOrUpdateUserPreferences')
      return null
    }
  }

  async logUserInteraction(interaction: Omit<FYIUserInteraction, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('fyi_user_interactions')
        .insert({
          ...interaction,
          created_at: new Date().toISOString()
        })

      if (error) {
        this.handleError(error, 'logUserInteraction')
      }
    } catch (error) {
      this.handleError(error, 'logUserInteraction')
    }
  }

  async cleanupExpiredInsights(): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('cleanup_expired_fyi_insights')

      if (error) {
        this.handleError(error, 'cleanupExpiredInsights')
      }
    } catch (error) {
      this.handleError(error, 'cleanupExpiredInsights')
    }
  }
}