/**
 * Meeting Effectiveness Analytics API
 * 
 * Provides endpoints for meeting performance metrics, decision velocity,
 * discussion quality, and satisfaction analytics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BoardAnalyticsService } from '../../../../lib/services/board-analytics.service'
import { BoardAnalyticsRepository } from '../../../../lib/repositories/board-analytics.repository'
import { createAPIHandler } from '../../../../lib/api/createAPIHandler'
import { z } from 'zod'

// Validation schemas
const MeetingEffectivenessRequestSchema = z.object({
  organizationId: z.string().uuid(),
  timePeriod: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional()
  }).optional(),
  filters: z.object({
    meeting_types: z.array(z.string()).optional(),
    meeting_ids: z.array(z.string().uuid()).optional(),
    min_effectiveness_score: z.number().min(0).max(100).optional()
  }).optional(),
  metrics: z.array(z.string()).optional()
})

const MeetingSatisfactionSchema = z.object({
  meeting_id: z.string().uuid(),
  user_id: z.string().uuid(),
  satisfaction_data: z.object({
    overall_satisfaction: z.number().min(1).max(10),
    meeting_preparation: z.number().min(1).max(10).optional(),
    discussion_quality: z.number().min(1).max(10).optional(),
    decision_making: z.number().min(1).max(10).optional(),
    time_management: z.number().min(1).max(10).optional(),
    follow_up_effectiveness: z.number().min(1).max(10).optional(),
    comments: z.string().optional()
  })
})

const MeetingMetricsUpdateSchema = z.object({
  meeting_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  metrics_data: z.object({
    decision_velocity: z.object({
      decisions_made: z.number().min(0),
      average_decision_time_minutes: z.number().min(0).optional(),
      consensus_rate: z.number().min(0).max(100).optional(),
      deferred_decisions: z.number().min(0).optional(),
      quality_score: z.number().min(1).max(10).optional()
    }).optional(),
    time_allocation: z.object({
      strategic_topics_percentage: z.number().min(0).max(100),
      operational_topics_percentage: z.number().min(0).max(100),
      governance_topics_percentage: z.number().min(0).max(100),
      compliance_topics_percentage: z.number().min(0).max(100),
      off_topic_percentage: z.number().min(0).max(100)
    }).optional(),
    discussion_quality: z.object({
      topic_coverage_score: z.number().min(1).max(10),
      depth_of_analysis_score: z.number().min(1).max(10),
      constructive_dialogue_score: z.number().min(1).max(10),
      dissent_handling_score: z.number().min(1).max(10)
    }).optional()
  })
})

export const POST = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const analyticsService = new BoardAnalyticsService(supabase)
    const analyticsRepository = new BoardAnalyticsRepository(supabase)

    try {
      const body = await req.json()
      const validatedData = MeetingEffectivenessRequestSchema.parse(body)

      const { organizationId, timePeriod, filters, metrics } = validatedData

      // Check authentication and permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to organization' },
          { status: 403 }
        )
      }

      // Generate meeting effectiveness metrics
      const results: Record<string, any> = {}

      if (!metrics || metrics.includes('effectiveness_summary')) {
        const effectivenessResult = await analyticsService.generateMeetingEffectivenessMetrics(
          organizationId,
          timePeriod
        )
        
        if (effectivenessResult.success) {
          results.meetingEffectiveness = effectivenessResult.data
        } else {
          console.error('Failed to generate meeting effectiveness:', effectivenessResult.error)
        }
      }

      if (!metrics || metrics.includes('effectiveness_aggregations')) {
        const aggregationsResult = await analyticsRepository.getMeetingEffectivenessAggregations(
          organizationId,
          timePeriod,
          filters
        )
        
        if (aggregationsResult.success) {
          results.aggregations = aggregationsResult.data
        }
      }

      if (!metrics || metrics.includes('effectiveness_trends')) {
        const trendsResult = await analyticsRepository.getPerformanceTrends(
          organizationId,
          ['decision_velocity', 'satisfaction_score', 'action_completion_rate'],
          timePeriod || {
            start_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            granularity: 'monthly'
          }
        )
        
        if (trendsResult.success) {
          results.trends = trendsResult.data
        }
      }

      // Calculate summary statistics
      if (results.meetingEffectiveness) {
        const meetings = results.meetingEffectiveness as any[]
        
        const effectivenessScores = meetings.map(calculateMeetingEffectivenessScore)
        const avgEffectiveness = effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
        
        const avgDecisionTime = meetings
          .filter(m => m.decision_velocity.decisions_made > 0)
          .reduce((sum, m) => sum + m.decision_velocity.average_decision_time_minutes, 0) / 
          meetings.filter(m => m.decision_velocity.decisions_made > 0).length || 0

        const avgSatisfaction = meetings
          .filter(m => m.satisfaction_survey.overall_satisfaction > 0)
          .reduce((sum, m) => sum + m.satisfaction_survey.overall_satisfaction, 0) /
          meetings.filter(m => m.satisfaction_survey.overall_satisfaction > 0).length || 0

        const totalActionItems = meetings.reduce((sum, m) => sum + m.action_item_tracking.items_created, 0)
        const completedActionItems = meetings.reduce((sum, m) => sum + m.action_item_tracking.items_completed, 0)

        results.summary = {
          totalMeetings: meetings.length,
          averageEffectivenessScore: Math.round(avgEffectiveness),
          averageDecisionTime: Math.round(avgDecisionTime),
          averageSatisfaction: Math.round(avgSatisfaction * 10) / 10,
          actionItemCompletionRate: totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0,
          trendDirection: calculateEffectivenessTrend(meetings),
          topPerformingMeetings: meetings
            .map(m => ({ 
              id: m.meeting_id, 
              type: m.meeting_type, 
              date: m.meeting_date,
              score: calculateMeetingEffectivenessScore(m) 
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3),
          improvementAreas: identifyImprovementAreas(meetings)
        }
      }

      // Save analytics snapshot
      await analyticsRepository.saveAnalyticsSnapshot({
        snapshot_date: new Date().toISOString(),
        organization_id: organizationId,
        metric_type: 'meeting_effectiveness',
        metric_value: results,
        metadata: {
          requested_metrics: metrics,
          time_period: timePeriod,
          filters: filters,
          user_id: user.id
        }
      })

      return NextResponse.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
        organizationId
      })

    } catch (error) {
      console.error('Meeting effectiveness analytics error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

export const PUT = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const body = await req.json()
      const validatedData = MeetingMetricsUpdateSchema.parse(body)

      const { meeting_id, organization_id, metrics_data } = validatedData

      // Check authentication and permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Verify user has admin access to organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organization_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Verify meeting exists and belongs to organization
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, organization_id')
        .eq('id', meeting_id)
        .eq('organization_id', organization_id)
        .single()

      if (meetingError || !meeting) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        )
      }

      const updates: Promise<any>[] = []

      // Update decision velocity metrics
      if (metrics_data.decision_velocity) {
        const decisionMetrics = metrics_data.decision_velocity
        
        // This would typically update a meeting_decisions table or similar
        // For now, we'll store in the meetings table or a separate metrics table
        updates.push(
          supabase
            .from('meeting_metrics')
            .upsert({
              meeting_id,
              metric_type: 'decision_velocity',
              metric_data: decisionMetrics,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
        )
      }

      // Update time allocation metrics
      if (metrics_data.time_allocation) {
        updates.push(
          supabase
            .from('meeting_time_allocations')
            .upsert({
              meeting_id,
              strategic_topics_percentage: metrics_data.time_allocation.strategic_topics_percentage,
              operational_topics_percentage: metrics_data.time_allocation.operational_topics_percentage,
              governance_topics_percentage: metrics_data.time_allocation.governance_topics_percentage,
              compliance_topics_percentage: metrics_data.time_allocation.compliance_topics_percentage,
              off_topic_percentage: metrics_data.time_allocation.off_topic_percentage,
              updated_at: new Date().toISOString()
            })
        )
      }

      // Update discussion quality metrics
      if (metrics_data.discussion_quality) {
        updates.push(
          supabase
            .from('meeting_metrics')
            .upsert({
              meeting_id,
              metric_type: 'discussion_quality',
              metric_data: metrics_data.discussion_quality,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
        )
      }

      // Execute all updates
      const results = await Promise.all(updates)
      
      // Check for errors
      for (const result of results) {
        if (result.error) {
          throw result.error
        }
      }

      // Calculate and update overall effectiveness score
      const effectivenessScore = await calculateMeetingEffectivenessScore({
        meeting_id,
        decision_velocity: metrics_data.decision_velocity || {},
        discussion_quality: metrics_data.discussion_quality || {},
        time_allocation: metrics_data.time_allocation || {}
      })

      // Store effectiveness score in performance metrics
      await supabase
        .from('performance_metrics')
        .upsert({
          organization_id,
          metric_category: 'meeting_effectiveness',
          metric_name: 'overall_effectiveness_score',
          metric_value: effectivenessScore,
          measurement_period: 'meeting',
          measurement_date: new Date().toISOString().split('T')[0],
          metadata: { 
            meeting_id,
            updated_by: user.id,
            metrics_updated: Object.keys(metrics_data)
          }
        })

      return NextResponse.json({
        success: true,
        message: 'Meeting metrics updated successfully',
        meetingId: meeting_id,
        updatedMetrics: Object.keys(metrics_data),
        effectivenessScore
      })

    } catch (error) {
      console.error('Meeting metrics update error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST endpoint for satisfaction surveys
export const PATCH = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const body = await req.json()
      const validatedData = MeetingSatisfactionSchema.parse(body)

      const { meeting_id, user_id, satisfaction_data } = validatedData

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if user can submit satisfaction for this user (self or admin)
      if (user.id !== user_id) {
        const { data: meeting } = await supabase
          .from('meetings')
          .select('organization_id')
          .eq('id', meeting_id)
          .single()

        if (meeting) {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', meeting.organization_id)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

          if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            )
          }
        }
      }

      // Insert/update satisfaction survey
      const { data, error } = await supabase
        .from('meeting_satisfaction')
        .upsert({
          meeting_id,
          user_id: user_id,
          overall_satisfaction: satisfaction_data.overall_satisfaction,
          meeting_preparation: satisfaction_data.meeting_preparation,
          discussion_quality: satisfaction_data.discussion_quality,
          decision_making: satisfaction_data.decision_making,
          time_management: satisfaction_data.time_management,
          follow_up_effectiveness: satisfaction_data.follow_up_effectiveness,
          comments: satisfaction_data.comments,
          submitted_at: new Date().toISOString()
        })
        .select()

      if (error) {
        throw error
      }

      // Update meeting effectiveness score
      const effectivenessScore = await supabase.rpc('calculate_meeting_effectiveness_score', {
        meeting_id_param: meeting_id
      })

      return NextResponse.json({
        success: true,
        message: 'Satisfaction survey submitted successfully',
        data: data?.[0],
        effectivenessScore: effectivenessScore.data
      })

    } catch (error) {
      console.error('Satisfaction survey error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// Helper functions
function calculateMeetingEffectivenessScore(meeting: any): number {
  const weights = {
    decision_velocity: 0.25,
    discussion_quality: 0.25,
    satisfaction: 0.3,
    action_completion: 0.2
  }

  const decisionScore = calculateDecisionVelocityScore(meeting.decision_velocity || {})
  const discussionScore = calculateDiscussionQualityScore(meeting.discussion_quality || {})
  const satisfactionScore = (meeting.satisfaction_survey?.overall_satisfaction || 5) * 10
  const actionScore = meeting.action_item_tracking?.completion_rate || 50

  return Math.round(
    decisionScore * weights.decision_velocity +
    discussionScore * weights.discussion_quality +
    satisfactionScore * weights.satisfaction +
    actionScore * weights.action_completion
  )
}

function calculateDecisionVelocityScore(velocity: any): number {
  if (velocity.decisions_made === 0) return 50

  let score = 0
  
  // Decision count score (0-30 points)
  score += Math.min((velocity.decisions_made || 0) * 5, 30)
  
  // Decision time score (0-30 points)
  const avgTime = velocity.average_decision_time_minutes || 45
  if (avgTime <= 15) score += 30
  else if (avgTime <= 30) score += 20
  else if (avgTime <= 60) score += 10
  
  // Consensus rate score (0-25 points)
  score += (velocity.consensus_rate || 50) * 0.25
  
  // Quality score (0-15 points)
  score += (velocity.quality_score || 5) * 1.5
  
  return Math.min(score, 100)
}

function calculateDiscussionQualityScore(quality: any): number {
  const scores = [
    quality.topic_coverage_score || 5,
    quality.depth_of_analysis_score || 5,
    quality.constructive_dialogue_score || 5,
    quality.dissent_handling_score || 5
  ]
  
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return averageScore * 10 // Convert to 0-100 scale
}

function calculateEffectivenessTrend(meetings: any[]): 'up' | 'down' | 'stable' {
  if (meetings.length < 4) return 'stable'

  const recent = meetings.slice(-2).map(calculateMeetingEffectivenessScore)
  const previous = meetings.slice(-4, -2).map(calculateMeetingEffectivenessScore)

  const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length
  const previousAvg = previous.reduce((sum, score) => sum + score, 0) / previous.length

  const diff = recentAvg - previousAvg
  
  if (diff > 5) return 'up'
  if (diff < -5) return 'down'
  return 'stable'
}

function identifyImprovementAreas(meetings: any[]): string[] {
  const areas: string[] = []
  
  const avgDecisionTime = meetings
    .filter(m => m.decision_velocity.decisions_made > 0)
    .reduce((sum, m) => sum + m.decision_velocity.average_decision_time_minutes, 0) / 
    meetings.filter(m => m.decision_velocity.decisions_made > 0).length || 0

  const avgSatisfaction = meetings
    .filter(m => m.satisfaction_survey.overall_satisfaction > 0)
    .reduce((sum, m) => sum + m.satisfaction_survey.overall_satisfaction, 0) /
    meetings.filter(m => m.satisfaction_survey.overall_satisfaction > 0).length || 0

  const totalActions = meetings.reduce((sum, m) => sum + m.action_item_tracking.items_created, 0)
  const completedActions = meetings.reduce((sum, m) => sum + m.action_item_tracking.items_completed, 0)
  const completionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0

  if (avgDecisionTime > 45) areas.push('Decision Speed')
  if (avgSatisfaction < 7) areas.push('Participant Satisfaction')  
  if (completionRate < 70) areas.push('Action Item Follow-up')

  return areas
}