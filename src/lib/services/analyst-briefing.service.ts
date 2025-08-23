import { BaseService } from './base.service'
import { 
  Result, 
  success, 
  failure, 
  wrapAsync 
} from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'
import { RepositoryError } from '../repositories/result'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AnalystProfile {
  id: string
  name: string
  firm: string
  email: string
  phone?: string
  specialization: string[]
  coverage_sectors: string[]
  rating: 'buy' | 'hold' | 'sell' | 'neutral'
  target_price?: number
  price_updated: string
  relationship_status: 'active' | 'inactive' | 'prospective'
  last_interaction: string
  interaction_history: AnalystInteraction[]
  preference_profile: {
    communication_style: 'formal' | 'casual' | 'technical'
    preferred_meeting_length: number
    preferred_channels: string[]
    information_focus: string[]
  }
  influence_score: number
  created_at: string
  updated_at: string
}

export interface AnalystInteraction {
  id: string
  analyst_id: string
  interaction_type: 'briefing' | 'call' | 'meeting' | 'email' | 'research_note'
  date: string
  duration?: number
  participants: string[]
  topics_discussed: string[]
  key_questions: AnalystQuestion[]
  follow_up_items: AnalystFollowUp[]
  sentiment: 'positive' | 'neutral' | 'negative'
  outcome: string
  meeting_notes?: string
  recordings?: string[]
  documents_shared?: string[]
  created_by: string
  created_at: string
}

export interface AnalystQuestion {
  id: string
  question: string
  category: 'financial' | 'strategic' | 'operational' | 'market' | 'regulatory'
  priority: 'high' | 'medium' | 'low'
  status: 'answered' | 'pending' | 'follow_up_required'
  answer?: string
  answered_by?: string
  answered_at?: string
  sources?: string[]
  confidence_level?: number
}

export interface AnalystFollowUp {
  id: string
  description: string
  assigned_to: string
  due_date: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  completion_notes?: string
  completed_at?: string
}

export interface BriefingSession {
  id: string
  title: string
  type: 'earnings' | 'strategy' | 'product' | 'market_update' | 'crisis' | 'ipo' | 'merger'
  scheduled_date: string
  duration: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  participants: {
    internal: Array<{ id: string; name: string; role: string }>
    analysts: Array<{ id: string; name: string; firm: string; confirmed: boolean }>
  }
  agenda: BriefingAgendaItem[]
  materials: BriefingMaterial[]
  q_and_a: AnalystQuestion[]
  performance_expectations: PerformanceExpectation[]
  recording_url?: string
  transcript?: string
  summary?: string
  follow_up_actions: AnalystFollowUp[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface BriefingAgendaItem {
  id: string
  order: number
  title: string
  description: string
  duration: number
  presenter: string
  materials: string[]
  key_points: string[]
}

export interface BriefingMaterial {
  id: string
  title: string
  type: 'presentation' | 'financial_statement' | 'press_release' | 'fact_sheet' | 'research_note'
  file_path: string
  access_level: 'public' | 'restricted' | 'confidential'
  uploaded_by: string
  uploaded_at: string
  download_count: number
  last_accessed: string
}

export interface PerformanceExpectation {
  id: string
  metric: string
  period: string
  analyst_estimate: number
  company_guidance?: number
  consensus_estimate?: number
  actual_result?: number
  variance?: number
  confidence_level: number
  notes?: string
  updated_at: string
}

export interface MarketSentiment {
  id: string
  source: 'analyst_note' | 'rating_change' | 'price_target' | 'earnings_estimate'
  analyst_id: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  impact_score: number
  content_summary: string
  key_factors: string[]
  price_impact?: number
  publication_date: string
  created_at: string
}

// Validation Schemas
const AnalystProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  firm: z.string().min(1, 'Firm is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  specialization: z.array(z.string()).min(1, 'At least one specialization required'),
  coverage_sectors: z.array(z.string()).min(1, 'At least one coverage sector required'),
  rating: z.enum(['buy', 'hold', 'sell', 'neutral']),
  target_price: z.number().positive().optional(),
  relationship_status: z.enum(['active', 'inactive', 'prospective']),
  preference_profile: z.object({
    communication_style: z.enum(['formal', 'casual', 'technical']),
    preferred_meeting_length: z.number().min(15).max(180),
    preferred_channels: z.array(z.string()),
    information_focus: z.array(z.string())
  }),
  influence_score: z.number().min(0).max(100)
})

const BriefingSessionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['earnings', 'strategy', 'product', 'market_update', 'crisis', 'ipo', 'merger']),
  scheduled_date: z.string().datetime('Valid date required'),
  duration: z.number().min(30).max(480, 'Duration must be between 30-480 minutes'),
  participants: z.object({
    internal: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    })),
    analysts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      firm: z.string(),
      confirmed: z.boolean()
    }))
  }),
  agenda: z.array(z.object({
    order: z.number().min(1),
    title: z.string().min(1),
    description: z.string(),
    duration: z.number().min(5),
    presenter: z.string(),
    materials: z.array(z.string()),
    key_points: z.array(z.string())
  }))
})

const AnalystQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  category: z.enum(['financial', 'strategic', 'operational', 'market', 'regulatory']),
  priority: z.enum(['high', 'medium', 'low']),
  answer: z.string().optional(),
  sources: z.array(z.string()).optional(),
  confidence_level: z.number().min(0).max(100).optional()
})

// ============================================================================
// ANALYST BRIEFING SERVICE
// ============================================================================

export class AnalystBriefingService extends BaseService {
  
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  // ========================================================================
  // ANALYST PROFILE MANAGEMENT
  // ========================================================================

  /**
   * Create a new analyst profile
   */
  async createAnalystProfile(
    profileData: Omit<AnalystProfile, 'id' | 'last_interaction' | 'interaction_history' | 'created_at' | 'updated_at'>
  ): Promise<Result<AnalystProfile>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return failure(userResult.error)

    const validationResult = this.validateWithContext(profileData, AnalystProfileSchema, 'analyst profile creation')
    if (!validationResult.success) return validationResult

    return this.executeDbOperation(async () => {
      const profile: AnalystProfile = {
        ...validationResult.data,
        id: crypto.randomUUID(),
        last_interaction: new Date().toISOString(),
        interaction_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('analyst_profiles')
        .insert({
          ...profile,
          created_by: userResult.data.id
        })
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_analyst_profile', 'analyst_profile', data.id, {
        analyst_name: data.name,
        firm: data.firm,
        rating: data.rating
      })

      return data
    }, 'create_analyst_profile')
  }

  /**
   * Update analyst profile with latest information
   */
  async updateAnalystProfile(
    analystId: string,
    updates: Partial<AnalystProfile>
  ): Promise<Result<AnalystProfile>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return failure(userResult.error)

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('analyst_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', analystId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_analyst_profile', 'analyst_profile', analystId, {
        updated_fields: Object.keys(updates)
      })

      return data
    }, 'update_analyst_profile', { analystId })
  }

  /**
   * Get analysts by firm or specialization
   */
  async getAnalysts(
    organizationId: string,
    filters: {
      firm?: string
      specialization?: string
      rating?: string
      relationship_status?: string
    } = {}
  ): Promise<Result<AnalystProfile[]>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('analyst_profiles')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters.firm) query = query.eq('firm', filters.firm)
      if (filters.specialization) query = query.contains('specialization', [filters.specialization])
      if (filters.rating) query = query.eq('rating', filters.rating)
      if (filters.relationship_status) query = query.eq('relationship_status', filters.relationship_status)

      const { data, error } = await query.order('influence_score', { ascending: false })

      if (error) throw error

      return data || []
    }, 'get_analysts', { organizationId, filters })
  }

  // ========================================================================
  // BRIEFING SESSION MANAGEMENT
  // ========================================================================

  /**
   * Schedule a new briefing session
   */
  async scheduleBriefingSession(
    sessionData: Omit<BriefingSession, 'id' | 'status' | 'q_and_a' | 'follow_up_actions' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<Result<BriefingSession>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return failure(userResult.error)

    const validationResult = this.validateWithContext(sessionData, BriefingSessionSchema, 'briefing session creation')
    if (!validationResult.success) return validationResult

    return this.executeDbOperation(async () => {
      const session: BriefingSession = {
        ...validationResult.data,
        id: crypto.randomUUID(),
        status: 'scheduled',
        q_and_a: [],
        follow_up_actions: [],
        created_by: userResult.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('analyst_briefing_sessions')
        .insert(session)
        .select()
        .single()

      if (error) throw error

      // Send invitations to analysts
      await this.sendBriefingInvitations(data.id, data.participants.analysts)

      await this.logActivity('schedule_briefing', 'briefing_session', data.id, {
        session_type: data.type,
        analyst_count: data.participants.analysts.length,
        scheduled_date: data.scheduled_date
      })

      return data
    }, 'schedule_briefing_session')
  }

  /**
   * Send briefing invitations to analysts
   */
  private async sendBriefingInvitations(
    sessionId: string,
    analysts: Array<{ id: string; name: string; firm: string; confirmed: boolean }>
  ): Promise<void> {
    // Mock implementation - in real system, would send actual invitations
    for (const analyst of analysts) {
      await this.supabase
        .from('analyst_invitations')
        .insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          analyst_id: analyst.id,
          invitation_status: 'sent',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
    }
  }

  /**
   * Update briefing session status and add real-time updates
   */
  async updateBriefingSession(
    sessionId: string,
    updates: Partial<BriefingSession>
  ): Promise<Result<BriefingSession>> {
    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('analyst_briefing_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_briefing_session', 'briefing_session', sessionId, {
        updated_fields: Object.keys(updates)
      })

      return data
    }, 'update_briefing_session', { sessionId })
  }

  // ========================================================================
  // Q&A MANAGEMENT
  // ========================================================================

  /**
   * Add a question to the briefing Q&A
   */
  async addQuestion(
    sessionId: string,
    questionData: Omit<AnalystQuestion, 'id' | 'status' | 'answered_at'>
  ): Promise<Result<AnalystQuestion>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return failure(userResult.error)

    const validationResult = this.validateWithContext(questionData, AnalystQuestionSchema, 'question creation')
    if (!validationResult.success) return validationResult

    return this.executeDbOperation(async () => {
      const question: AnalystQuestion = {
        ...validationResult.data,
        id: crypto.randomUUID(),
        status: questionData.answer ? 'answered' : 'pending',
        answered_at: questionData.answer ? new Date().toISOString() : undefined
      }

      const { data, error } = await this.supabase
        .from('analyst_questions')
        .insert({
          ...question,
          session_id: sessionId,
          created_by: userResult.data.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update session with new Q&A
      await this.updateSessionQA(sessionId, question)

      await this.logActivity('add_question', 'analyst_question', data.id, {
        session_id: sessionId,
        category: question.category,
        priority: question.priority
      })

      return data
    }, 'add_question')
  }

  /**
   * Answer a question in the Q&A
   */
  async answerQuestion(
    questionId: string,
    answer: string,
    sources: string[] = [],
    confidenceLevel: number = 100
  ): Promise<Result<AnalystQuestion>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return failure(userResult.error)

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('analyst_questions')
        .update({
          answer,
          sources,
          confidence_level: confidenceLevel,
          answered_by: userResult.data.id,
          answered_at: new Date().toISOString(),
          status: 'answered'
        })
        .eq('id', questionId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('answer_question', 'analyst_question', questionId, {
        confidence_level: confidenceLevel,
        sources_count: sources.length
      })

      return data
    }, 'answer_question', { questionId })
  }

  /**
   * Update session Q&A array
   */
  private async updateSessionQA(sessionId: string, question: AnalystQuestion): Promise<void> {
    const { data: session } = await this.supabase
      .from('analyst_briefing_sessions')
      .select('q_and_a')
      .eq('id', sessionId)
      .single()

    if (session) {
      const updatedQA = [...(session.q_and_a || []), question]
      await this.supabase
        .from('analyst_briefing_sessions')
        .update({ q_and_a: updatedQA })
        .eq('id', sessionId)
    }
  }

  /**
   * Get Q&A database with searchable history
   */
  async getQADatabase(
    organizationId: string,
    filters: {
      category?: string
      keyword?: string
      dateRange?: { start: string; end: string }
      answered?: boolean
    } = {}
  ): Promise<Result<{
    questions: AnalystQuestion[]
    categories: Record<string, number>
    trends: Array<{ period: string; count: number; avg_confidence: number }>
  }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('analyst_questions')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.answered !== undefined) {
        query = query.eq('status', filters.answered ? 'answered' : 'pending')
      }
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
      if (filters.keyword) {
        query = query.or(`question.ilike.%${filters.keyword}%,answer.ilike.%${filters.keyword}%`)
      }

      const { data: questions, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Generate analytics
      const categories = this.calculateCategoryDistribution(questions || [])
      const trends = this.calculateQATrends(questions || [])

      return {
        questions: questions || [],
        categories,
        trends
      }
    }, 'get_qa_database', { organizationId, filters })
  }

  /**
   * Calculate question category distribution
   */
  private calculateCategoryDistribution(questions: AnalystQuestion[]): Record<string, number> {
    const categories: Record<string, number> = {}
    questions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1
    })
    return categories
  }

  /**
   * Calculate Q&A trends over time
   */
  private calculateQATrends(questions: AnalystQuestion[]): Array<{ period: string; count: number; avg_confidence: number }> {
    const monthlyData: Record<string, { count: number; confidenceSum: number; confidenceCount: number }> = {}

    questions.forEach(q => {
      const month = q.answered_at ? q.answered_at.substring(0, 7) : q.question_date?.substring(0, 7) // YYYY-MM format
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, confidenceSum: 0, confidenceCount: 0 }
        }
        monthlyData[month].count++
        if (q.confidence_level) {
          monthlyData[month].confidenceSum += q.confidence_level
          monthlyData[month].confidenceCount++
        }
      }
    })

    return Object.entries(monthlyData)
      .map(([period, data]) => ({
        period,
        count: data.count,
        avg_confidence: data.confidenceCount > 0 ? data.confidenceSum / data.confidenceCount : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // ========================================================================
  // PERFORMANCE EXPECTATION MANAGEMENT
  // ========================================================================

  /**
   * Track analyst performance expectations
   */
  async trackPerformanceExpectation(
    expectationData: Omit<PerformanceExpectation, 'id' | 'updated_at'>
  ): Promise<Result<PerformanceExpectation>> {
    return this.executeDbOperation(async () => {
      const expectation: PerformanceExpectation = {
        ...expectationData,
        id: crypto.randomUUID(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('analyst_performance_expectations')
        .insert({
          ...expectation,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      await this.logActivity('track_expectation', 'performance_expectation', data.id, {
        metric: data.metric,
        analyst_estimate: data.analyst_estimate,
        company_guidance: data.company_guidance
      })

      return data
    }, 'track_performance_expectation')
  }

  /**
   * Compare actual results vs expectations
   */
  async compareResultsVsExpectations(
    organizationId: string,
    period: string
  ): Promise<Result<{
    metrics: Array<{
      metric: string
      analyst_consensus: number
      company_guidance: number | null
      actual_result: number | null
      variance_from_analyst: number | null
      variance_from_guidance: number | null
      beat_expectations: boolean | null
    }>
    overall_performance: {
      beats: number
      meets: number
      misses: number
      accuracy_score: number
    }
    analyst_accuracy: Array<{
      analyst_id: string
      name: string
      firm: string
      accuracy_rate: number
      avg_variance: number
    }>
  }>> {
    return this.executeDbOperation(async () => {
      const { data: expectations, error } = await this.supabase
        .from('analyst_performance_expectations')
        .select(`
          *,
          analyst_profiles (name, firm)
        `)
        .eq('organization_id', organizationId)
        .eq('period', period)

      if (error) throw error

      const analysis = this.analyzePerformanceVsExpectations(expectations || [])
      
      return analysis
    }, 'compare_results_vs_expectations', { organizationId, period })
  }

  /**
   * Analyze performance vs expectations
   */
  private analyzePerformanceVsExpectations(expectations: any[]): any {
    const metricAnalysis = new Map<string, {
      estimates: number[]
      guidance?: number
      actual?: number
      analysts: Array<{ id: string; name: string; firm: string; estimate: number }>
    }>()

    // Group by metric
    expectations.forEach(exp => {
      if (!metricAnalysis.has(exp.metric)) {
        metricAnalysis.set(exp.metric, {
          estimates: [],
          guidance: exp.company_guidance,
          actual: exp.actual_result,
          analysts: []
        })
      }
      
      const metric = metricAnalysis.get(exp.metric)!
      metric.estimates.push(exp.analyst_estimate)
      metric.analysts.push({
        id: exp.analyst_id,
        name: exp.analyst_profiles?.name || 'Unknown',
        firm: exp.analyst_profiles?.firm || 'Unknown',
        estimate: exp.analyst_estimate
      })
    })

    // Calculate metrics
    const metrics = Array.from(metricAnalysis.entries()).map(([metricName, data]) => {
      const consensus = data.estimates.reduce((sum, est) => sum + est, 0) / data.estimates.length
      const varianceFromAnalyst = data.actual !== null && data.actual !== undefined 
        ? ((data.actual - consensus) / consensus) * 100 
        : null
      const varianceFromGuidance = data.actual !== null && data.actual !== undefined && data.guidance !== null
        ? ((data.actual - data.guidance) / data.guidance) * 100
        : null
      
      return {
        metric: metricName,
        analyst_consensus: consensus,
        company_guidance: data.guidance || null,
        actual_result: data.actual || null,
        variance_from_analyst: varianceFromAnalyst,
        variance_from_guidance: varianceFromGuidance,
        beat_expectations: varianceFromAnalyst !== null ? varianceFromAnalyst > 0 : null
      }
    })

    // Calculate overall performance
    const validMetrics = metrics.filter(m => m.beat_expectations !== null)
    const beats = validMetrics.filter(m => m.beat_expectations).length
    const meets = validMetrics.filter(m => Math.abs(m.variance_from_analyst!) < 5).length // Within 5%
    const misses = validMetrics.filter(m => !m.beat_expectations).length
    const accuracyScore = validMetrics.length > 0 ? (beats + meets) / validMetrics.length * 100 : 0

    // Calculate analyst accuracy
    const analystAccuracy = this.calculateAnalystAccuracy(expectations)

    return {
      metrics,
      overall_performance: {
        beats,
        meets,
        misses,
        accuracy_score: accuracyScore
      },
      analyst_accuracy: analystAccuracy
    }
  }

  /**
   * Calculate individual analyst accuracy
   */
  private calculateAnalystAccuracy(expectations: any[]): Array<{
    analyst_id: string
    name: string
    firm: string
    accuracy_rate: number
    avg_variance: number
  }> {
    const analystData = new Map<string, {
      name: string
      firm: string
      predictions: Array<{ estimate: number; actual: number | null }>
    }>()

    expectations.forEach(exp => {
      if (!analystData.has(exp.analyst_id)) {
        analystData.set(exp.analyst_id, {
          name: exp.analyst_profiles?.name || 'Unknown',
          firm: exp.analyst_profiles?.firm || 'Unknown',
          predictions: []
        })
      }
      
      analystData.get(exp.analyst_id)!.predictions.push({
        estimate: exp.analyst_estimate,
        actual: exp.actual_result
      })
    })

    return Array.from(analystData.entries()).map(([analystId, data]) => {
      const validPredictions = data.predictions.filter(p => p.actual !== null)
      
      if (validPredictions.length === 0) {
        return {
          analyst_id: analystId,
          name: data.name,
          firm: data.firm,
          accuracy_rate: 0,
          avg_variance: 0
        }
      }

      const variances = validPredictions.map(p => 
        Math.abs((p.actual! - p.estimate) / p.estimate) * 100
      )
      const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length
      const accuracyRate = variances.filter(v => v < 10).length / variances.length * 100 // Within 10%

      return {
        analyst_id: analystId,
        name: data.name,
        firm: data.firm,
        accuracy_rate: accuracyRate,
        avg_variance: avgVariance
      }
    }).sort((a, b) => b.accuracy_rate - a.accuracy_rate)
  }

  // ========================================================================
  // MARKET SENTIMENT MONITORING
  // ========================================================================

  /**
   * Track market sentiment from analyst activities
   */
  async trackMarketSentiment(
    sentimentData: Omit<MarketSentiment, 'id' | 'created_at'>
  ): Promise<Result<MarketSentiment>> {
    return this.executeDbOperation(async () => {
      const sentiment: MarketSentiment = {
        ...sentimentData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('analyst_market_sentiment')
        .insert(sentiment)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('track_sentiment', 'market_sentiment', data.id, {
        source: data.source,
        sentiment: data.sentiment,
        impact_score: data.impact_score
      })

      return data
    }, 'track_market_sentiment')
  }

  /**
   * Get sentiment trends and analysis
   */
  async getSentimentAnalysis(
    organizationId: string,
    timeRange: string = '30d'
  ): Promise<Result<{
    overall_sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
    sentiment_score: number
    trend_direction: 'improving' | 'declining' | 'stable'
    by_source: Record<string, { count: number; avg_sentiment: number }>
    by_analyst: Array<{ analyst_id: string; name: string; firm: string; sentiment: string; impact: number }>
    timeline: Array<{ date: string; sentiment_score: number; event_count: number }>
    key_factors: Array<{ factor: string; impact: number; frequency: number }>
  }>> {
    return this.executeDbOperation(async () => {
      const endDate = new Date()
      const startDate = new Date()
      const days = parseInt(timeRange.replace('d', ''))
      startDate.setDate(endDate.getDate() - days)

      const { data: sentiments, error } = await this.supabase
        .from('analyst_market_sentiment')
        .select(`
          *,
          analyst_profiles (name, firm)
        `)
        .eq('organization_id', organizationId)
        .gte('publication_date', startDate.toISOString())
        .lte('publication_date', endDate.toISOString())
        .order('publication_date', { ascending: false })

      if (error) throw error

      const analysis = this.analyzeSentimentTrends(sentiments || [])
      
      return analysis
    }, 'get_sentiment_analysis', { organizationId, timeRange })
  }

  /**
   * Analyze sentiment trends
   */
  private analyzeSentimentTrends(sentiments: any[]): any {
    if (sentiments.length === 0) {
      return {
        overall_sentiment: 'neutral' as const,
        sentiment_score: 0,
        trend_direction: 'stable' as const,
        by_source: {},
        by_analyst: [],
        timeline: [],
        key_factors: []
      }
    }

    // Convert sentiment to numeric scores
    const sentimentScores = {
      'very_negative': -2,
      'negative': -1,
      'neutral': 0,
      'positive': 1,
      'very_positive': 2
    }

    const scoredSentiments = sentiments.map(s => ({
      ...s,
      numeric_sentiment: sentimentScores[s.sentiment as keyof typeof sentimentScores]
    }))

    // Calculate overall sentiment
    const avgScore = scoredSentiments.reduce((sum, s) => sum + s.numeric_sentiment, 0) / scoredSentiments.length
    const overallSentiment = this.scoreToSentiment(avgScore)

    // Determine trend direction
    const recentSentiments = scoredSentiments.slice(0, Math.floor(scoredSentiments.length / 3))
    const olderSentiments = scoredSentiments.slice(-Math.floor(scoredSentiments.length / 3))
    const recentAvg = recentSentiments.reduce((sum, s) => sum + s.numeric_sentiment, 0) / recentSentiments.length
    const olderAvg = olderSentiments.reduce((sum, s) => sum + s.numeric_sentiment, 0) / olderSentiments.length
    
    let trendDirection: 'improving' | 'declining' | 'stable'
    if (recentAvg > olderAvg + 0.2) trendDirection = 'improving'
    else if (recentAvg < olderAvg - 0.2) trendDirection = 'declining'
    else trendDirection = 'stable'

    // Analyze by source
    const bySource: Record<string, { count: number; avg_sentiment: number }> = {}
    scoredSentiments.forEach(s => {
      if (!bySource[s.source]) {
        bySource[s.source] = { count: 0, avg_sentiment: 0 }
      }
      bySource[s.source].count++
      bySource[s.source].avg_sentiment += s.numeric_sentiment
    })

    Object.keys(bySource).forEach(source => {
      bySource[source].avg_sentiment /= bySource[source].count
    })

    // Analyze by analyst
    const analystMap = new Map<string, {
      name: string
      firm: string
      sentiments: number[]
      impacts: number[]
    }>()

    scoredSentiments.forEach(s => {
      if (!analystMap.has(s.analyst_id)) {
        analystMap.set(s.analyst_id, {
          name: s.analyst_profiles?.name || 'Unknown',
          firm: s.analyst_profiles?.firm || 'Unknown',
          sentiments: [],
          impacts: []
        })
      }
      const analyst = analystMap.get(s.analyst_id)!
      analyst.sentiments.push(s.numeric_sentiment)
      analyst.impacts.push(s.impact_score)
    })

    const byAnalyst = Array.from(analystMap.entries()).map(([id, data]) => ({
      analyst_id: id,
      name: data.name,
      firm: data.firm,
      sentiment: this.scoreToSentiment(data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length),
      impact: data.impacts.reduce((sum, i) => sum + i, 0) / data.impacts.length
    }))

    // Generate timeline
    const timeline = this.generateSentimentTimeline(scoredSentiments)

    // Extract key factors
    const keyFactors = this.extractKeyFactors(sentiments)

    return {
      overall_sentiment: overallSentiment,
      sentiment_score: avgScore,
      trend_direction: trendDirection,
      by_source: bySource,
      by_analyst: byAnalyst,
      timeline,
      key_factors: keyFactors
    }
  }

  /**
   * Convert numeric score to sentiment label
   */
  private scoreToSentiment(score: number): 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' {
    if (score >= 1.5) return 'very_positive'
    if (score >= 0.5) return 'positive'
    if (score <= -1.5) return 'very_negative'
    if (score <= -0.5) return 'negative'
    return 'neutral'
  }

  /**
   * Generate sentiment timeline
   */
  private generateSentimentTimeline(sentiments: any[]): Array<{ date: string; sentiment_score: number; event_count: number }> {
    const dailyData: Record<string, { scores: number[]; count: number }> = {}

    sentiments.forEach(s => {
      const date = s.publication_date.split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { scores: [], count: 0 }
      }
      dailyData[date].scores.push(s.numeric_sentiment)
      dailyData[date].count++
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        sentiment_score: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        event_count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Extract key factors from sentiment analysis
   */
  private extractKeyFactors(sentiments: any[]): Array<{ factor: string; impact: number; frequency: number }> {
    const factorData: Record<string, { impacts: number[]; frequency: number }> = {}

    sentiments.forEach(s => {
      s.key_factors?.forEach((factor: string) => {
        if (!factorData[factor]) {
          factorData[factor] = { impacts: [], frequency: 0 }
        }
        factorData[factor].impacts.push(s.impact_score)
        factorData[factor].frequency++
      })
    })

    return Object.entries(factorData)
      .map(([factor, data]) => ({
        factor,
        impact: data.impacts.reduce((sum, impact) => sum + impact, 0) / data.impacts.length,
        frequency: data.frequency
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Top 10 factors
  }

  // ========================================================================
  // FOLLOW-UP ACTION TRACKING
  // ========================================================================

  /**
   * Create follow-up action item
   */
  async createFollowUpAction(
    sessionId: string,
    actionData: Omit<AnalystFollowUp, 'id' | 'status' | 'completed_at'>
  ): Promise<Result<AnalystFollowUp>> {
    return this.executeDbOperation(async () => {
      const action: AnalystFollowUp = {
        ...actionData,
        id: crypto.randomUUID(),
        status: 'pending'
      }

      const { data, error } = await this.supabase
        .from('analyst_follow_up_actions')
        .insert({
          ...action,
          session_id: sessionId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_follow_up', 'analyst_follow_up', data.id, {
        session_id: sessionId,
        priority: data.priority,
        assigned_to: data.assigned_to
      })

      return data
    }, 'create_follow_up_action')
  }

  /**
   * Update follow-up action status
   */
  async updateFollowUpAction(
    actionId: string,
    updates: Partial<AnalystFollowUp>
  ): Promise<Result<AnalystFollowUp>> {
    return this.executeDbOperation(async () => {
      const updateData: any = { ...updates }
      
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('analyst_follow_up_actions')
        .update(updateData)
        .eq('id', actionId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_follow_up', 'analyst_follow_up', actionId, {
        updated_fields: Object.keys(updates)
      })

      return data
    }, 'update_follow_up_action', { actionId })
  }

  /**
   * Get follow-up actions dashboard
   */
  async getFollowUpDashboard(
    organizationId: string,
    filters: {
      status?: string
      priority?: string
      assignedTo?: string
      overdue?: boolean
    } = {}
  ): Promise<Result<{
    actions: AnalystFollowUp[]
    summary: {
      total: number
      pending: number
      in_progress: number
      completed: number
      overdue: number
    }
    by_priority: Record<string, number>
    by_assignee: Array<{ assignee: string; count: number; completion_rate: number }>
  }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('analyst_follow_up_actions')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
      
      if (filters.overdue) {
        query = query
          .lt('due_date', new Date().toISOString())
          .neq('status', 'completed')
      }

      const { data: actions, error } = await query.order('due_date', { ascending: true })

      if (error) throw error

      const analysis = this.analyzeFollowUpActions(actions || [])
      
      return {
        actions: actions || [],
        ...analysis
      }
    }, 'get_follow_up_dashboard', { organizationId, filters })
  }

  /**
   * Analyze follow-up actions
   */
  private analyzeFollowUpActions(actions: AnalystFollowUp[]): any {
    const now = new Date()
    
    // Summary statistics
    const summary = {
      total: actions.length,
      pending: actions.filter(a => a.status === 'pending').length,
      in_progress: actions.filter(a => a.status === 'in_progress').length,
      completed: actions.filter(a => a.status === 'completed').length,
      overdue: actions.filter(a => new Date(a.due_date) < now && a.status !== 'completed').length
    }

    // By priority
    const byPriority: Record<string, number> = {}
    actions.forEach(a => {
      byPriority[a.priority] = (byPriority[a.priority] || 0) + 1
    })

    // By assignee
    const assigneeData: Record<string, { total: number; completed: number }> = {}
    actions.forEach(a => {
      if (!assigneeData[a.assigned_to]) {
        assigneeData[a.assigned_to] = { total: 0, completed: 0 }
      }
      assigneeData[a.assigned_to].total++
      if (a.status === 'completed') {
        assigneeData[a.assigned_to].completed++
      }
    })

    const byAssignee = Object.entries(assigneeData).map(([assignee, data]) => ({
      assignee,
      count: data.total,
      completion_rate: data.total > 0 ? (data.completed / data.total) * 100 : 0
    }))

    return {
      summary,
      by_priority: byPriority,
      by_assignee: byAssignee
    }
  }
}