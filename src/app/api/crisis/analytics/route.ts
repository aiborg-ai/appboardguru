import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CrisisManagementService } from '@/lib/services/crisis-management.service'
import { CrisisCommunicationManagementService } from '@/lib/services/crisis-communication-management.service'
import { CrisisPreparednessService } from '@/lib/services/crisis-preparedness.service'
import { PostIncidentAnalysisService } from '@/lib/services/post-incident-analysis.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const AnalyticsRequestSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  modules: z.array(z.enum(['incidents', 'communications', 'preparedness', 'post_incident'])).optional(),
  filters: z.object({
    incident_categories: z.array(z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic'])).optional(),
    incident_levels: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
    communication_types: z.array(z.enum(['internal_alert', 'stakeholder_update', 'customer_notification', 'media_statement', 'regulatory_filing', 'investor_alert', 'employee_announcement', 'board_notification', 'vendor_alert', 'community_notice'])).optional(),
    channels: z.array(z.enum(['email', 'sms', 'push_notification', 'slack', 'teams', 'social_media', 'press_release', 'website_banner', 'phone_call', 'emergency_broadcast'])).optional()
  }).optional()
})

const PreparednessReportSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  scope: z.object({
    include_scenarios: z.boolean().optional(),
    include_exercises: z.boolean().optional(),
    include_training: z.boolean().optional(),
    include_assessments: z.boolean().optional()
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Parse query parameters
    const url = new URL(request.url)
    const reportType = url.searchParams.get('type') || 'dashboard'

    switch (reportType) {
      case 'dashboard':
        return await generateDashboardAnalytics(supabase)
      
      case 'crisis_summary':
        return await generateCrisisSummary(supabase, request)
      
      case 'communication_analytics':
        return await generateCommunicationAnalytics(supabase, request)
      
      case 'preparedness_report':
        return await generatePreparednessReport(supabase, request)
      
      case 'post_incident_analytics':
        return await generatePostIncidentAnalytics(supabase, request)
      
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('GET /api/crisis/analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateDashboardAnalytics(supabase: any) {
  try {
    // Get real-time dashboard data
    const { data: dashboardSummary, error } = await supabase
      .from('crisis_dashboard_summary')
      .select('*')
      .single()

    if (error) throw error

    // Get recent incidents
    const { data: recentIncidents } = await supabase
      .from('crisis_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get active alerts count
    const { data: activeAlerts, count: alertsCount } = await supabase
      .from('situation_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get upcoming meetings
    const { data: upcomingMeetings } = await supabase
      .from('emergency_board_meetings')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(3)

    // Get pending communications
    const { data: pendingCommunications, count: pendingCount } = await supabase
      .from('communication_messages')
      .select('*', { count: 'exact', head: true })
      .in('approval_status', ['pending_review', 'legal_review', 'executive_approval'])

    return NextResponse.json({
      summary: {
        ...dashboardSummary,
        active_alerts: alertsCount || 0,
        pending_communications: pendingCount || 0
      },
      recent_incidents: recentIncidents || [],
      upcoming_meetings: upcomingMeetings || [],
      active_alerts_sample: activeAlerts?.slice(0, 3) || [],
      pending_communications_sample: pendingCommunications?.slice(0, 3) || []
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    throw error
  }
}

async function generateCrisisSummary(supabase: any, request: NextRequest) {
  const crisisService = new CrisisManagementService(supabase)
  
  const url = new URL(request.url)
  const startDate = url.searchParams.get('start_date')
  const endDate = url.searchParams.get('end_date')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  const result = await crisisService.getCrisisAnalytics({
    start_date: startDate,
    end_date: endDate
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.statusCode || 400 }
    )
  }

  return NextResponse.json(result.data)
}

async function generateCommunicationAnalytics(supabase: any, request: NextRequest) {
  const communicationService = new CrisisCommunicationManagementService(supabase)
  
  const url = new URL(request.url)
  const startDate = url.searchParams.get('start_date')
  const endDate = url.searchParams.get('end_date')
  
  // Parse filter parameters
  const communicationTypes = url.searchParams.get('communication_types')?.split(',')
  const channels = url.searchParams.get('channels')?.split(',')
  const incidentIds = url.searchParams.get('incident_ids')?.split(',')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  const filters: any = {}
  if (communicationTypes) filters.communication_types = communicationTypes
  if (channels) filters.channels = channels
  if (incidentIds) filters.incident_ids = incidentIds

  const result = await communicationService.getCommunicationAnalytics(
    { start_date: startDate, end_date: endDate },
    filters
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.statusCode || 400 }
    )
  }

  return NextResponse.json(result.data)
}

async function generatePreparednessReport(supabase: any, request: NextRequest) {
  const preparednessService = new CrisisPreparednessService(supabase)
  
  const url = new URL(request.url)
  const startDate = url.searchParams.get('start_date')
  const endDate = url.searchParams.get('end_date')
  
  // Parse scope parameters
  const includeScenarios = url.searchParams.get('include_scenarios') !== 'false'
  const includeExercises = url.searchParams.get('include_exercises') !== 'false'
  const includeTraining = url.searchParams.get('include_training') !== 'false'
  const includeAssessments = url.searchParams.get('include_assessments') !== 'false'

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  const result = await preparednessService.generatePreparednessReport(
    { start: startDate, end: endDate },
    {
      include_scenarios: includeScenarios,
      include_exercises: includeExercises,
      include_training: includeTraining,
      include_assessments: includeAssessments
    }
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.statusCode || 400 }
    )
  }

  return NextResponse.json(result.data)
}

async function generatePostIncidentAnalytics(supabase: any, request: NextRequest) {
  const analysisService = new PostIncidentAnalysisService(supabase)
  
  const url = new URL(request.url)
  const startDate = url.searchParams.get('start_date')
  const endDate = url.searchParams.get('end_date')
  
  // Parse filter parameters
  const analysisTypes = url.searchParams.get('analysis_types')?.split(',')
  const categories = url.searchParams.get('categories')?.split(',')
  const severityLevels = url.searchParams.get('severity_levels')?.split(',')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  const filters: any = {}
  if (analysisTypes) filters.analysis_types = analysisTypes
  if (categories) filters.categories = categories
  if (severityLevels) filters.severity_levels = severityLevels

  const result = await analysisService.generateAnalyticsReport(
    { start: startDate, end: endDate },
    filters
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.statusCode || 400 }
    )
  }

  return NextResponse.json(result.data)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const body = await request.json()
    const requestType = body.type

    switch (requestType) {
      case 'custom_analytics':
        return await generateCustomAnalytics(supabase, body)
      
      case 'export_report':
        return await exportAnalyticsReport(supabase, body)
      
      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('POST /api/crisis/analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateCustomAnalytics(supabase: any, body: any) {
  const validatedData = AnalyticsRequestSchema.parse(body)
  
  // Generate custom analytics based on requested modules
  const results: any = {}
  const modules = validatedData.modules || ['incidents', 'communications', 'preparedness', 'post_incident']

  if (modules.includes('incidents')) {
    const crisisService = new CrisisManagementService(supabase)
    const incidentAnalytics = await crisisService.getCrisisAnalytics({
      start_date: validatedData.start_date,
      end_date: validatedData.end_date
    })
    
    if (incidentAnalytics.success) {
      results.incidents = incidentAnalytics.data
    }
  }

  if (modules.includes('communications')) {
    const communicationService = new CrisisCommunicationManagementService(supabase)
    const commAnalytics = await communicationService.getCommunicationAnalytics(
      {
        start_date: validatedData.start_date,
        end_date: validatedData.end_date
      },
      validatedData.filters
    )
    
    if (commAnalytics.success) {
      results.communications = commAnalytics.data
    }
  }

  if (modules.includes('preparedness')) {
    const preparednessService = new CrisisPreparednessService(supabase)
    const prepAnalytics = await preparednessService.generatePreparednessReport({
      start: validatedData.start_date,
      end: validatedData.end_date
    })
    
    if (prepAnalytics.success) {
      results.preparedness = prepAnalytics.data
    }
  }

  if (modules.includes('post_incident')) {
    const analysisService = new PostIncidentAnalysisService(supabase)
    const postAnalytics = await analysisService.generateAnalyticsReport({
      start: validatedData.start_date,
      end: validatedData.end_date
    })
    
    if (postAnalytics.success) {
      results.post_incident = postAnalytics.data
    }
  }

  return NextResponse.json({
    report_generated_at: new Date().toISOString(),
    time_range: {
      start_date: validatedData.start_date,
      end_date: validatedData.end_date
    },
    modules_included: modules,
    data: results
  })
}

async function exportAnalyticsReport(supabase: any, body: any) {
  // This would generate and export analytics reports in various formats
  // For now, return a placeholder response
  
  return NextResponse.json({
    export_id: crypto.randomUUID(),
    status: 'generating',
    estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    download_url: null,
    format: body.format || 'pdf',
    message: 'Report generation started. You will be notified when ready.'
  })
}