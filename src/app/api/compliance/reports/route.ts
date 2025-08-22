import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { 
  AuditReportRequest, 
  AuditReportFilters
} from '@/types'
import type {
  ActivityApiResponse,
  ComplianceReport
} from '@/types/entities/activity.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase)
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Check permissions - only admins and owners can view reports
    if (!['owner', 'admin'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const reportType = searchParams.get('type') || 'dashboard'

    if (reportType === 'dashboard') {
      // Get compliance dashboard data
      const result = await complianceEngine.getComplianceDashboard(orgMember.organization_id)
      return NextResponse.json(result)
    }

    if (reportType === 'audit_summary') {
      // Get audit summary report
      const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = searchParams.get('end_date') || new Date().toISOString()
      
      const auditSummary = await generateAuditSummaryReport(supabase, orgMember.organization_id, startDate, endDate)
      
      return NextResponse.json({
        success: true,
        data: auditSummary,
        metadata: {
          report_type: 'audit_summary',
          date_range: { start_date: startDate, end_date: endDate },
          generated_at: new Date().toISOString(),
          generated_by: user.id
        }
      })
    }

    if (reportType === 'compliance_overview') {
      // Get compliance overview report
      const overviewData = await generateComplianceOverviewReport(supabase, orgMember.organization_id)
      
      return NextResponse.json({
        success: true,
        data: overviewData,
        metadata: {
          report_type: 'compliance_overview',
          generated_at: new Date().toISOString(),
          generated_by: user.id
        }
      })
    }

    if (reportType === 'regulatory_coverage') {
      // Get regulatory coverage report
      const coverageData = await generateRegulatoryCoverageReport(supabase, orgMember.organization_id)
      
      return NextResponse.json({
        success: true,
        data: coverageData,
        metadata: {
          report_type: 'regulatory_coverage',
          generated_at: new Date().toISOString(),
          generated_by: user.id
        }
      })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })

  } catch (error) {
    console.error('Compliance reports GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json() as AuditReportRequest
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Check permissions - only admins and owners can generate reports
    if (!['owner', 'admin'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request
    if (!body.report_type || !body.date_range) {
      return NextResponse.json({ 
        error: 'Report type and date range are required' 
      }, { status: 400 })
    }

    const reportId = crypto.randomUUID()
    
    // Generate report based on type
    let reportData: readonly any[] = []
    let summary: Record<string, any> = {}

    switch (body.report_type) {
      case 'compliance_summary':
        reportData = await generateComplianceSummaryReport(
          supabase, 
          orgMember.organization_id, 
          body.date_range.start_date,
          body.date_range.end_date,
          body.filters
        )
        summary = calculateComplianceSummary(reportData)
        break

      case 'workflow_detail':
        reportData = await generateWorkflowDetailReport(
          supabase,
          orgMember.organization_id,
          body.date_range.start_date,
          body.date_range.end_date,
          body.filters
        )
        summary = calculateWorkflowSummary([...reportData])
        break

      case 'participant_activity':
        reportData = await generateParticipantActivityReport(
          supabase,
          orgMember.organization_id,
          body.date_range.start_date,
          body.date_range.end_date,
          body.filters
        )
        summary = calculateParticipantSummary(reportData)
        break

      case 'regulatory_overview':
        reportData = await generateRegulatoryOverviewReport(
          supabase,
          orgMember.organization_id,
          body.date_range.start_date,
          body.date_range.end_date,
          body.filters
        )
        summary = calculateRegulatorySummary(reportData)
        break

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    // Log report generation
    await supabase
      .from('notification_audit_log')
      .insert({
        organization_id: orgMember.organization_id,
        event_type: 'report_generated',
        event_category: 'compliance',
        action: 'generate_audit_report',
        actor_user_id: user.id,
        event_description: `Generated ${body.report_type} report`,
        event_data: {
          report_id: reportId,
          report_type: body.report_type,
          date_range: body.date_range,
          filters: body.filters,
          format: body.format
        },
        outcome: 'success'
      })

    const response = {
      report_id: reportId,
      report_type: body.report_type,
      generated_at: new Date().toISOString(),
      generated_by: user.id,
      date_range: body.date_range,
      summary,
      data: reportData,
      metadata: {
        total_records: Array.isArray(reportData) ? reportData.length : Object.keys(reportData).length,
        filters_applied: body.filters,
        retention_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `${body.report_type} report generated successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('Compliance reports POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions for generating different types of reports

async function generateAuditSummaryReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<{
  readonly total_events: number
  readonly event_breakdown: Record<string, number>
  readonly outcome_breakdown: Record<string, number>
  readonly entries: readonly any[]
}> {
  // Get audit activities in date range
  const { data: auditEntries } = await supabase
    .from('notification_audit_log')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('event_timestamp', startDate)
    .lte('event_timestamp', endDate)
    .order('event_timestamp', { ascending: false })

  // Aggregate by event type
  const eventSummary: Record<string, number> = {}
  const outcomeSummary: Record<string, number> = {}
  
  for (const entry of auditEntries || []) {
    eventSummary[entry.event_type] = (eventSummary[entry.event_type] || 0) + 1
    outcomeSummary[entry.outcome] = (outcomeSummary[entry.outcome] || 0) + 1
  }

  return {
    total_events: auditEntries?.length || 0,
    event_breakdown: eventSummary,
    outcome_breakdown: outcomeSummary,
    entries: auditEntries || []
  }
}

async function generateComplianceOverviewReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string
): Promise<{
  readonly workflows: {
    readonly total: number
    readonly by_status: Record<string, number>
    readonly by_regulation: Record<string, number>
  }
  readonly calendar_entries: {
    readonly total: number
    readonly by_status: Record<string, number>
  }
}> {
  // Get workflows by status
  const { data: workflows } = await supabase
    .from('notification_workflows')
    .select(`
      *,
      template:compliance_templates(regulation_type, category)
    `)
    .eq('organization_id', organizationId)

  // Get calendar entries by status  
  const { data: calendarEntries } = await supabase
    .from('compliance_calendar')
    .select('*')
    .eq('organization_id', organizationId)

  const workflowsByStatus: Record<string, number> = {}
  const workflowsByRegulation: Record<string, number> = {}
  const calendarByStatus: Record<string, number> = {}

  for (const workflow of workflows || []) {
    workflowsByStatus[workflow.status] = (workflowsByStatus[workflow.status] || 0) + 1
    const regulationType = workflow.template?.regulation_type || 'Unknown'
    workflowsByRegulation[regulationType] = (workflowsByRegulation[regulationType] || 0) + 1
  }

  for (const entry of calendarEntries || []) {
    calendarByStatus[entry.status] = (calendarByStatus[entry.status] || 0) + 1
  }

  return {
    workflows: {
      total: workflows?.length || 0,
      by_status: workflowsByStatus,
      by_regulation: workflowsByRegulation
    },
    calendar_entries: {
      total: calendarEntries?.length || 0,
      by_status: calendarByStatus
    }
  }
}

async function generateRegulatoryCoverageReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string
): Promise<readonly {
  readonly regulation_type: string
  readonly total_templates: number
  readonly active_workflows: number
  readonly completed_workflows: number
  readonly coverage_percentage: number
}[]> {
  // Get all regulation types and their coverage
  const { data: templates } = await supabase
    .from('compliance_templates')
    .select('regulation_type, category')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const { data: workflows } = await supabase
    .from('notification_workflows')
    .select(`
      status,
      template:compliance_templates(regulation_type, category)
    `)
    .eq('organization_id', organizationId)

  const coverage: Record<string, any> = {}

  for (const template of templates || []) {
    const key = template.regulation_type
    if (!coverage[key]) {
      coverage[key] = {
        regulation_type: key,
        total_templates: 0,
        active_workflows: 0,
        completed_workflows: 0,
        coverage_percentage: 0
      }
    }
    coverage[key].total_templates++
  }

  for (const workflow of workflows || []) {
    const regulationType = (workflow.template as any)?.regulation_type
    if (coverage[regulationType]) {
      coverage[regulationType].active_workflows++
      if (workflow.status === 'completed') {
        coverage[regulationType].completed_workflows++
      }
    }
  }

  // Calculate coverage percentages
  Object.values(coverage).forEach((item: {
    regulation_type: string
    total_templates: number
    active_workflows: number
    completed_workflows: number
    coverage_percentage: number
  }) => {
    item.coverage_percentage = item.total_templates > 0 
      ? Math.round((item.completed_workflows / item.total_templates) * 100)
      : 0
  })

  return Object.values(coverage)
}

async function generateComplianceSummaryReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string,
  startDate: string,
  endDate: string,
  filters?: AuditReportFilters
): Promise<readonly any[]> {
  let query = supabase
    .from('notification_workflows')
    .select(`
      *,
      template:compliance_templates(*),
      calendar_entry:compliance_calendar(*)
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (filters?.regulation_types?.length) {
    // TODO: This would need to be handled with a join or subquery for regulation_types filter
  }

  if (filters?.statuses?.length) {
    query = query.in('status', filters.statuses)
  }

  const { data: workflows } = await query
  return workflows || []
}

async function generateWorkflowDetailReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string,
  startDate: string,
  endDate: string,
  filters?: AuditReportFilters
): Promise<readonly any[]> {
  // Detailed workflow report with participants
  let query = supabase
    .from('notification_workflows')
    .select(`
      *,
      template:compliance_templates(*),
      calendar_entry:compliance_calendar(*),
      participants:compliance_participants(
        *,
        user:users(id, full_name, email)
      )
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { data: workflows } = await query
  return workflows || []
}

async function generateParticipantActivityReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string,
  startDate: string,
  endDate: string,
  filters?: AuditReportFilters
): Promise<readonly any[]> {
  // Participant activity report
  const { data: participants } = await supabase
    .from('compliance_participants')
    .select(`
      *,
      user:users(id, full_name, email),
      workflow:notification_workflows(
        id, name, status,
        organization_id,
        template:compliance_templates(regulation_type)
      )
    `)
    .eq('workflow.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  return participants || []
}

async function generateRegulatoryOverviewReport(
  supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never,
  organizationId: string,
  startDate: string,
  endDate: string,
  filters?: AuditReportFilters
): Promise<readonly any[]> {
  // Regulatory overview grouped by regulation type
  const { data: data } = await supabase
    .from('compliance_calendar')
    .select(`
      *,
      template:compliance_templates(*)
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  return data || []
}

// Summary calculation functions
function calculateComplianceSummary(data: readonly any[]): {
  readonly total_workflows: number
  readonly completed_workflows: number
  readonly in_progress_workflows: number
  readonly overdue_workflows: number
  readonly completion_rate: number
} {
  const statusCounts: Record<string, number> = {}
  for (const item of data) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
  }

  return {
    total_workflows: data.length,
    completed_workflows: statusCounts['completed'] || 0,
    in_progress_workflows: statusCounts['in_progress'] || 0,
    overdue_workflows: statusCounts['overdue'] || 0,
    completion_rate: data.length > 0 ? Math.round(((statusCounts['completed'] || 0) / data.length) * 100) : 0
  }
}

function calculateWorkflowSummary(data: readonly any[]): {
  readonly total_workflows: number
  readonly average_participants: number
  readonly total_participants: number
} {
  return {
    total_workflows: data.length,
    average_participants: data.length > 0 
      ? Math.round(data.reduce((sum, w) => sum + (w.participants?.length || 0), 0) / data.length)
      : 0,
    total_participants: data.reduce((sum, w) => sum + (w.participants?.length || 0), 0)
  }
}

function calculateParticipantSummary(data: readonly any[]): {
  readonly total_participants: number
  readonly unique_users: number
  readonly status_breakdown: Record<string, number>
} {
  const uniqueUsers = new Set(data.map(p => p.user_id)).size
  const statusCounts: Record<string, number> = {}
  
  for (const participant of data) {
    statusCounts[participant.status] = (statusCounts[participant.status] || 0) + 1
  }

  return {
    total_participants: data.length,
    unique_users: uniqueUsers,
    status_breakdown: statusCounts
  }
}

function calculateRegulatorySummary(data: readonly any[]): {
  readonly total_entries: number
  readonly regulation_types: number
} {
  return {
    total_entries: data.length,
    regulation_types: [...new Set(data.map(d => d.regulation_type))].length
  }
}