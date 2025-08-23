/**
 * Board Member Engagement Analytics API
 * 
 * Provides endpoints for member engagement metrics, participation tracking,
 * and performance analytics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BoardAnalyticsService } from '../../../../lib/services/board-analytics.service'
import { BoardAnalyticsRepository } from '../../../../lib/repositories/board-analytics.repository'
import { createAPIHandler } from '../../../../lib/api/createAPIHandler'
import { z } from 'zod'

// Validation schemas
const EngagementAnalyticsRequestSchema = z.object({
  organizationId: z.string().uuid(),
  timePeriod: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional()
  }).optional(),
  filters: z.object({
    member_ids: z.array(z.string().uuid()).optional(),
    committee_ids: z.array(z.string().uuid()).optional(),
    performance_thresholds: z.record(z.number()).optional()
  }).optional(),
  metrics: z.array(z.string()).optional()
})

const MemberEngagementUpdateSchema = z.object({
  member_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  meeting_id: z.string().uuid().optional(),
  engagement_data: z.object({
    attendance: z.boolean().optional(),
    participation_score: z.number().min(0).max(10).optional(),
    preparation_time_minutes: z.number().min(0).optional(),
    documents_accessed: z.number().min(0).optional(),
    questions_asked: z.number().min(0).optional(),
    contributions_made: z.number().min(0).optional()
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
      const validatedData = EngagementAnalyticsRequestSchema.parse(body)

      const { organizationId, timePeriod, filters, metrics } = validatedData

      // Check if user has access to this organization
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

      // Generate engagement metrics based on requested metrics
      const results: Record<string, any> = {}

      if (!metrics || metrics.includes('engagement_summary')) {
        const engagementResult = await analyticsService.generateMemberEngagementMetrics(
          organizationId,
          timePeriod
        )
        
        if (engagementResult.success) {
          results.memberEngagement = engagementResult.data
        } else {
          console.error('Failed to generate member engagement:', engagementResult.error)
        }
      }

      if (!metrics || metrics.includes('engagement_aggregations')) {
        const aggregationsResult = await analyticsRepository.getMemberEngagementAggregations(
          organizationId,
          timePeriod,
          filters
        )
        
        if (aggregationsResult.success) {
          results.aggregations = aggregationsResult.data
        }
      }

      if (!metrics || metrics.includes('engagement_trends')) {
        const trendsResult = await analyticsRepository.getPerformanceTrends(
          organizationId,
          ['attendance_rate', 'participation_score', 'preparation_score'],
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
      if (results.memberEngagement) {
        const engagement = results.memberEngagement as any[]
        
        results.summary = {
          totalMembers: engagement.length,
          averageAttendance: engagement.reduce((sum, m) => sum + m.attendance_rate, 0) / engagement.length,
          averageParticipation: engagement.reduce((sum, m) => sum + m.participation_score, 0) / engagement.length,
          topPerformers: engagement
            .sort((a, b) => (b.attendance_rate + b.participation_score) - (a.attendance_rate + a.participation_score))
            .slice(0, 3)
            .map(m => m.full_name),
          engagementTrend: calculateEngagementTrend(engagement)
        }
      }

      // Save analytics snapshot for historical tracking
      await analyticsRepository.saveAnalyticsSnapshot({
        snapshot_date: new Date().toISOString(),
        organization_id: organizationId,
        metric_type: 'member_engagement',
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
      console.error('Engagement analytics error:', error)
      
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
      const validatedData = MemberEngagementUpdateSchema.parse(body)

      const { member_id, organization_id, meeting_id, engagement_data } = validatedData

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

      const updates: any[] = []

      // Update meeting attendance if provided
      if (meeting_id && engagement_data.attendance !== undefined) {
        const attendanceUpdate = {
          meeting_id,
          user_id: member_id,
          attended: engagement_data.attendance,
          updated_at: new Date().toISOString()
        }

        updates.push(
          supabase
            .from('meeting_attendances')
            .upsert(attendanceUpdate)
        )
      }

      // Update meeting participation if provided
      if (meeting_id && (
        engagement_data.participation_score !== undefined ||
        engagement_data.preparation_time_minutes !== undefined ||
        engagement_data.questions_asked !== undefined ||
        engagement_data.contributions_made !== undefined
      )) {
        const participationUpdate: any = {
          meeting_id,
          user_id: member_id,
          updated_at: new Date().toISOString()
        }

        if (engagement_data.participation_score !== undefined) {
          participationUpdate.engagement_score = engagement_data.participation_score
        }
        if (engagement_data.preparation_time_minutes !== undefined) {
          participationUpdate.preparation_time_minutes = engagement_data.preparation_time_minutes
        }
        if (engagement_data.questions_asked !== undefined) {
          participationUpdate.questions_asked = engagement_data.questions_asked
        }
        if (engagement_data.contributions_made !== undefined) {
          participationUpdate.contributions_made = engagement_data.contributions_made
        }

        updates.push(
          supabase
            .from('meeting_participation')
            .upsert(participationUpdate)
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

      // Update performance metrics
      const analyticsRepository = new BoardAnalyticsRepository(supabase)
      
      // Calculate and store updated engagement score
      const engagementScore = await calculateMemberEngagementScore(
        supabase,
        member_id,
        organization_id
      )

      await supabase
        .from('performance_metrics')
        .upsert({
          organization_id,
          user_id: member_id,
          metric_category: 'engagement',
          metric_name: 'overall_engagement_score',
          metric_value: engagementScore,
          measurement_period: 'monthly',
          measurement_date: new Date().toISOString().split('T')[0],
          metadata: { updated_by: user.id }
        })

      return NextResponse.json({
        success: true,
        message: 'Engagement data updated successfully',
        updatedFields: Object.keys(engagement_data),
        engagementScore
      })

    } catch (error) {
      console.error('Engagement update error:', error)
      
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
function calculateEngagementTrend(engagementData: any[]): 'up' | 'down' | 'stable' {
  const improvingCount = engagementData.filter(m => 
    m.trend_analysis?.engagement_trend === 'improving'
  ).length
  
  const decliningCount = engagementData.filter(m => 
    m.trend_analysis?.engagement_trend === 'declining'
  ).length

  if (improvingCount > decliningCount) return 'up'
  if (decliningCount > improvingCount) return 'down'
  return 'stable'
}

async function calculateMemberEngagementScore(
  supabase: any,
  memberId: string,
  organizationId: string
): Promise<number> {
  // Use the database function to calculate engagement score
  const { data, error } = await supabase.rpc('calculate_engagement_score', {
    user_id_param: memberId,
    organization_id_param: organizationId
  })

  if (error) {
    console.error('Error calculating engagement score:', error)
    return 0
  }

  return data || 0
}