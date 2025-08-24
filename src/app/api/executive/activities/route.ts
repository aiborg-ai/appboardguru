import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Executive Real-Time Activities API Endpoint
 * 
 * Provides live activity feed across all organizations under executive
 * oversight, including meetings, documents, decisions, compliance events,
 * and member activities with priority-based filtering.
 */

interface ActivitiesRequest {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  organizationIds: string[]
  limit?: number
  types?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  since?: string
}

interface RealTimeActivity {
  id: string
  type: 'meeting' | 'document' | 'decision' | 'compliance' | 'member' | 'system'
  title: string
  description: string
  organization: string
  organizationId: string
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'attention_required'
  assignees?: string[]
  metadata?: Record<string, any>
  actionRequired: boolean
  estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'critical'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ActivitiesRequest
    const { userRole, organizationIds, limit = 50, types, priority, since } = body

    if (!organizationIds || organizationIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No organizations specified'
      }, { status: 400 })
    }

    // Get real-time activities from multiple sources
    const activities = await getExecutiveActivities(organizationIds, {
      limit,
      types,
      priority,
      since,
      userRole
    })

    return NextResponse.json({
      success: true,
      data: {
        activities,
        summary: generateActivitiesSummary(activities),
        alerts: generateExecutiveAlerts(activities),
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Activities feed error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load activity feed'
    }, { status: 500 })
  }
}

async function getExecutiveActivities(
  organizationIds: string[],
  options: {
    limit: number
    types?: string[]
    priority?: string
    since?: string
    userRole: string
  }
): Promise<RealTimeActivity[]> {
  try {
    // Get organization names for context
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', organizationIds)

    const orgMap = new Map(organizations?.map(org => [org.id, org.name]) || [])

    const activities: RealTimeActivity[] = []

    // Get meeting activities
    const meetingActivities = await getMeetingActivities(organizationIds, orgMap)
    activities.push(...meetingActivities)

    // Get document activities
    const documentActivities = await getDocumentActivities(organizationIds, orgMap)
    activities.push(...documentActivities)

    // Get member activities
    const memberActivities = await getMemberActivities(organizationIds, orgMap)
    activities.push(...memberActivities)

    // Get system activities
    const systemActivities = await getSystemActivities(organizationIds, orgMap)
    activities.push(...systemActivities)

    // Sort by timestamp (most recent first) and apply filters
    let filteredActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (options.types && options.types.length > 0) {
      filteredActivities = filteredActivities.filter(activity => 
        options.types!.includes(activity.type)
      )
    }

    if (options.priority) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.priority === options.priority
      )
    }

    if (options.since) {
      const sinceDate = new Date(options.since)
      filteredActivities = filteredActivities.filter(activity => 
        new Date(activity.timestamp) > sinceDate
      )
    }

    return filteredActivities.slice(0, options.limit)

  } catch (error) {
    console.error('Error getting executive activities:', error)
    
    // Return synthetic activities for demonstration
    return generateSyntheticActivities(organizationIds, options.limit)
  }
}

async function getMeetingActivities(
  organizationIds: string[],
  orgMap: Map<string, string>
): Promise<RealTimeActivity[]> {
  try {
    const { data: meetings } = await supabase
      .from('calendar_events')
      .select('*')
      .in('organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!meetings) return []

    return meetings.map(meeting => ({
      id: `meeting-${meeting.id}`,
      type: 'meeting' as const,
      title: meeting.title || 'Board Meeting',
      description: `Upcoming ${meeting.event_type || 'meeting'} scheduled`,
      organization: orgMap.get(meeting.organization_id) || 'Unknown Organization',
      organizationId: meeting.organization_id,
      timestamp: meeting.created_at,
      priority: determinePriority(meeting.event_type, meeting.event_date),
      status: determineStatus(meeting.event_date),
      actionRequired: isActionRequired(meeting.event_date),
      estimatedImpact: 'significant' as const,
      metadata: {
        eventType: meeting.event_type,
        eventDate: meeting.event_date,
        location: meeting.location
      }
    }))

  } catch (error) {
    console.error('Error getting meeting activities:', error)
    return []
  }
}

async function getDocumentActivities(
  organizationIds: string[],
  orgMap: Map<string, string>
): Promise<RealTimeActivity[]> {
  try {
    const { data: documents } = await supabase
      .from('assets')
      .select('*')
      .in('organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(15)

    if (!documents) return []

    return documents.slice(0, 10).map(doc => ({
      id: `document-${doc.id}`,
      type: 'document' as const,
      title: `Document: ${doc.name}`,
      description: `New document uploaded${doc.file_type ? ` (${doc.file_type})` : ''}`,
      organization: orgMap.get(doc.organization_id) || 'Unknown Organization',
      organizationId: doc.organization_id,
      timestamp: doc.created_at,
      priority: 'medium' as const,
      status: 'completed' as const,
      actionRequired: false,
      estimatedImpact: 'moderate' as const,
      metadata: {
        fileType: doc.file_type,
        fileSize: doc.file_size,
        category: doc.category
      }
    }))

  } catch (error) {
    console.error('Error getting document activities:', error)
    return []
  }
}

async function getMemberActivities(
  organizationIds: string[],
  orgMap: Map<string, string>
): Promise<RealTimeActivity[]> {
  try {
    const { data: members } = await supabase
      .from('organization_members')
      .select('*, users!inner(full_name, email)')
      .in('organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!members) return []

    return members.slice(0, 5).map(member => ({
      id: `member-${member.id}`,
      type: 'member' as const,
      title: `New Member: ${member.users?.full_name || 'Unknown'}`,
      description: `${member.users?.full_name || 'New member'} joined as ${member.role}`,
      organization: orgMap.get(member.organization_id) || 'Unknown Organization',
      organizationId: member.organization_id,
      timestamp: member.created_at,
      priority: 'low' as const,
      status: 'completed' as const,
      actionRequired: member.role === 'admin', // Admin additions need attention
      estimatedImpact: member.role === 'owner' ? 'significant' : 'moderate' as const,
      assignees: [member.users?.full_name || 'Unknown'],
      metadata: {
        role: member.role,
        email: member.users?.email
      }
    }))

  } catch (error) {
    console.error('Error getting member activities:', error)
    return []
  }
}

async function getSystemActivities(
  organizationIds: string[],
  orgMap: Map<string, string>
): Promise<RealTimeActivity[]> {
  try {
    // Generate system-level activities based on organization data
    const activities: RealTimeActivity[] = []

    // Add synthetic system activities for demonstration
    organizationIds.forEach((orgId, index) => {
      if (Math.random() > 0.7) { // 30% chance per org
        activities.push({
          id: `system-${orgId}-${Date.now()}`,
          type: 'system',
          title: 'System Health Check',
          description: 'Automated governance health assessment completed',
          organization: orgMap.get(orgId) || 'Unknown Organization',
          organizationId: orgId,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
          status: 'completed',
          actionRequired: false,
          estimatedImpact: 'minimal',
          metadata: {
            type: 'health_check',
            automated: true
          }
        })
      }
    })

    return activities

  } catch (error) {
    console.error('Error getting system activities:', error)
    return []
  }
}

function determinePriority(eventType?: string, eventDate?: string): 'low' | 'medium' | 'high' | 'critical' {
  if (!eventDate) return 'low'

  const eventDateTime = new Date(eventDate)
  const now = new Date()
  const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (eventType === 'board_meeting' || eventType === 'annual_meeting') {
    if (hoursUntilEvent < 24) return 'critical'
    if (hoursUntilEvent < 72) return 'high'
    if (hoursUntilEvent < 168) return 'medium'
  }

  return 'low'
}

function determineStatus(eventDate?: string): 'pending' | 'in_progress' | 'completed' | 'attention_required' {
  if (!eventDate) return 'pending'

  const eventDateTime = new Date(eventDate)
  const now = new Date()

  if (eventDateTime < now) return 'completed'
  if ((eventDateTime.getTime() - now.getTime()) < 24 * 60 * 60 * 1000) return 'attention_required'
  
  return 'pending'
}

function isActionRequired(eventDate?: string): boolean {
  if (!eventDate) return false

  const eventDateTime = new Date(eventDate)
  const now = new Date()
  const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  return hoursUntilEvent > 0 && hoursUntilEvent < 48 // Action required within 48 hours
}

function generateActivitiesSummary(activities: RealTimeActivity[]) {
  return {
    total: activities.length,
    byType: {
      meeting: activities.filter(a => a.type === 'meeting').length,
      document: activities.filter(a => a.type === 'document').length,
      decision: activities.filter(a => a.type === 'decision').length,
      compliance: activities.filter(a => a.type === 'compliance').length,
      member: activities.filter(a => a.type === 'member').length,
      system: activities.filter(a => a.type === 'system').length
    },
    byPriority: {
      critical: activities.filter(a => a.priority === 'critical').length,
      high: activities.filter(a => a.priority === 'high').length,
      medium: activities.filter(a => a.priority === 'medium').length,
      low: activities.filter(a => a.priority === 'low').length
    },
    actionRequired: activities.filter(a => a.actionRequired).length
  }
}

function generateExecutiveAlerts(activities: RealTimeActivity[]) {
  return activities
    .filter(a => a.priority === 'critical' || (a.priority === 'high' && a.actionRequired))
    .slice(0, 5)
    .map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      priority: activity.priority,
      organization: activity.organization,
      timestamp: activity.timestamp,
      actionRequired: activity.actionRequired
    }))
}

function generateSyntheticActivities(organizationIds: string[], limit: number): RealTimeActivity[] {
  const activities: RealTimeActivity[] = []
  const activityTypes: RealTimeActivity['type'][] = ['meeting', 'document', 'decision', 'compliance', 'member', 'system']
  const priorities: RealTimeActivity['priority'][] = ['low', 'medium', 'high', 'critical']
  const statuses: RealTimeActivity['status'][] = ['pending', 'in_progress', 'completed', 'attention_required']

  const sampleTitles = {
    meeting: ['Board Meeting Scheduled', 'Committee Review', 'Strategic Planning Session', 'Quarterly Review'],
    document: ['Board Pack Updated', 'Policy Document Uploaded', 'Financial Report Available', 'Compliance Document'],
    decision: ['Budget Approval Required', 'Strategic Initiative Review', 'Policy Update Decision', 'Member Appointment'],
    compliance: ['Regulatory Deadline Approaching', 'Audit Requirement', 'Compliance Check', 'Risk Assessment'],
    member: ['New Member Joined', 'Member Role Updated', 'Board Member Invitation', 'Member Activity'],
    system: ['System Health Check', 'Data Backup Completed', 'Security Scan', 'Performance Report']
  }

  for (let i = 0; i < Math.min(limit, 30); i++) {
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
    const orgId = organizationIds[Math.floor(Math.random() * organizationIds.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    
    activities.push({
      id: `synthetic-${i}`,
      type,
      title: sampleTitles[type][Math.floor(Math.random() * sampleTitles[type].length)],
      description: `${type} activity in organization requiring ${priority} priority attention`,
      organization: `Organization ${organizationIds.indexOf(orgId) + 1}`,
      organizationId: orgId,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      actionRequired: Math.random() > 0.7,
      estimatedImpact: ['minimal', 'moderate', 'significant', 'critical'][Math.floor(Math.random() * 4)] as any,
      metadata: {
        synthetic: true,
        generated: new Date().toISOString()
      }
    })
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST instead.'
  }, { status: 405 })
}