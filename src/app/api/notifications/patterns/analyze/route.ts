/**
 * Pattern Analysis API
 * Handles ML-powered pattern recognition and analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { patternRecognitionEngine } from '@/lib/services/pattern-recognition'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      organizationId,
      userId,
      lookbackDays = 30,
      patternTypes = ['timing', 'engagement', 'content', 'frequency'],
      minConfidence = 0.6,
      action = 'analyze'
    } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'analyze') {
      // Perform pattern analysis
      const patterns = await patternRecognitionEngine.analyzePatterns(organizationId, {
        userId,
        lookbackDays,
        patternTypes,
        minConfidence
      })

      // Get stored patterns for comparison
      let query = supabase
        .from('notification_patterns')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: storedPatterns } = await query.limit(20)

      return NextResponse.json({
        patterns,
        storedPatterns: storedPatterns || [],
        analysis: {
          totalPatterns: patterns.length,
          highConfidencePatterns: patterns.filter(p => p.confidence >= 0.8).length,
          patternTypes: patternTypes,
          lookbackDays,
          generatedAt: new Date().toISOString()
        }
      })

    } else if (action === 'generate_user_profiles') {
      // Generate user engagement profiles
      let userIds = userId ? [userId] : undefined
      
      // If no specific user, get all active users in organization
      if (!userIds) {
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .limit(50) // Limit to prevent performance issues

        userIds = orgMembers?.map((m: any) => m.user_id) || []
      }

      const profiles = await patternRecognitionEngine.generateUserEngagementProfiles(
        organizationId,
        userIds
      )

      return NextResponse.json({
        profiles,
        summary: {
          totalUsers: profiles.length,
          segments: profiles.reduce((acc, profile) => {
            acc[profile.behaviorSegment] = (acc[profile.behaviorSegment] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          averageRiskFactors: profiles.reduce((sum, profile) => 
            sum + profile.riskFactors.filter(rf => rf !== 'No significant risk factors detected').length, 0
          ) / profiles.length
        }
      })

    } else if (action === 'predict_timing') {
      // Predict optimal timing for specific user and notification type
      const { notificationType } = body
      
      if (!userId || !notificationType) {
        return NextResponse.json(
          { error: 'userId and notificationType required for timing prediction' },
          { status: 400 }
        )
      }

      const prediction = await patternRecognitionEngine.predictOptimalTiming(
        userId,
        notificationType,
        organizationId
      )

      return NextResponse.json({ prediction })

    } else if (action === 'analyze_trends') {
      // Analyze board activity trends
      const { metricType = 'meeting_frequency', trendLookbackDays = 90 } = body

      const trends = await patternRecognitionEngine.analyzeBoardActivityTrends(
        organizationId,
        metricType,
        trendLookbackDays
      )

      return NextResponse.json({ trends })

    } else {
      return NextResponse.json(
        { 
          error: 'Invalid action. Supported: analyze, generate_user_profiles, predict_timing, analyze_trends' 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Pattern analysis API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')
    const patternType = searchParams.get('patternType')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query for stored patterns
    let query = supabase
      .from('notification_patterns')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const { data: patterns, error } = await query

    if (error) {
      console.error('Error fetching patterns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch patterns' },
        { status: 500 }
      )
    }

    // Get pattern statistics
    const { data: patternStats } = await supabase
      .from('notification_patterns')
      .select('pattern_type, confidence_score')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const stats = {
      totalPatterns: patternStats?.length || 0,
      byType: patternStats?.reduce((acc: Record<string, number>, pattern: any) => {
        const patternType = pattern.pattern_type
        acc[patternType] = (acc[patternType] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      averageConfidence: patternStats?.length 
        ? patternStats.reduce((sum, p: any) => sum + p.confidence_score, 0) / patternStats.length 
        : 0
    }

    return NextResponse.json({
      patterns: patterns || [],
      stats,
      query: {
        organizationId,
        userId,
        patternType,
        limit
      }
    })

  } catch (error) {
    console.error('Pattern analysis GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patternId = searchParams.get('patternId')
    const organizationId = searchParams.get('organizationId')

    if (!patternId || !organizationId) {
      return NextResponse.json({ error: 'patternId and organizationId required' }, { status: 400 })
    }

    // Verify user has admin access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes((membership as any)?.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Soft delete the pattern (set is_active to false)
    const { error } = await (supabase as any)
      .from('notification_patterns')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('pattern_id', patternId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting pattern:', error)
      return NextResponse.json(
        { error: 'Failed to delete pattern' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'deleted', patternId })

  } catch (error) {
    console.error('Pattern analysis DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}