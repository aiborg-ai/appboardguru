import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
// import { ComplianceEngine } from '@/lib/activity/compliance'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      format = 'json',
      timeRange = '30d',
      reportType = 'activity',
      includeMetadata = false,
      filters = {}
    } = body

    let startDate: Date
    const endDate = new Date()

    switch (timeRange) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    let exportData: any

    switch (reportType) {
      case 'activity': {
        let query = supabase
          .from('audit_logs')
          .select(`
            id,
            event_type,
            entity_type,
            entity_id,
            metadata,
            timestamp,
            correlation_id,
            session_id,
            ip_address,
            user_agent,
            source,
            users!inner(id, name, email)
          `)
          .eq('organization_id', user.organization_id)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: false })

        if (filters.eventTypes?.length) {
          query = query.in('event_type', filters.eventTypes)
        }
        if (filters.entityTypes?.length) {
          query = query.in('entity_type', filters.entityTypes)
        }
        if (filters.userIds?.length) {
          query = query.in('user_id', filters.userIds)
        }

        const { data: activities, error } = await query

        if (error) throw error

        exportData = {
          reportType: 'Activity Log',
          organizationId: user.organization_id,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: timeRange
          },
          totalEvents: activities?.length || 0,
          activities: activities?.map(activity => ({
            id: activity.id,
            timestamp: activity.timestamp,
            eventType: activity.event_type,
            entityType: activity.entity_type,
            entityId: activity.entity_id,
            user: {
              id: (activity.users as any)?.id || 'unknown',
              name: (activity.users as any)?.name || 'Unknown User',
              email: (activity.users as any)?.email || 'unknown'
            },
            ...(includeMetadata && {
              metadata: activity.metadata,
              correlationId: activity.correlation_id,
              sessionId: activity.session_id,
              ipAddress: activity.ip_address,
              userAgent: activity.user_agent,
              source: activity.source
            })
          })) || []
        }
        break
      }

      case 'compliance': {
        // TODO: Implement ComplianceEngine.generateComplianceReport method
        exportData = {
          message: 'Compliance report generation not implemented yet',
          timestamp: new Date().toISOString(),
          organization_id: user.organization_id
        }
        break
      }

      case 'security': {
        if (user.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required for security reports' }, { status: 403 })
        }

        const { data: securityEvents } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('organization_id', user.organization_id)
          .in('event_type', ['user_login', 'user_logout', 'failed_login', 'permission_change', 'security_alert'])
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: false })

        exportData = {
          reportType: 'Security Activity Report',
          organizationId: user.organization_id,
          timeRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          securityEvents: securityEvents || [],
          summary: {
            totalSecurityEvents: securityEvents?.length || 0,
            uniqueUsers: [...new Set(securityEvents?.map(e => e.user_id))].length,
            loginAttempts: securityEvents?.filter(e => e.event_type === 'user_login').length || 0,
            failedLogins: securityEvents?.filter(e => e.event_type === 'failed_login').length || 0
          }
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${reportType}-report-${timeRange}-${timestamp}`

    switch (format) {
      case 'csv': {
        let csvContent = ''
        
        if (reportType === 'activity') {
          csvContent = [
            'Timestamp,User Name,User Email,Event Type,Entity Type,Entity ID' + (includeMetadata ? ',Metadata,IP Address,Session ID' : ''),
            ...exportData.activities.map((activity: any) => [
              activity.timestamp,
              activity.user.name,
              activity.user.email,
              activity.eventType,
              activity.entityType,
              activity.entityId,
              ...(includeMetadata ? [
                JSON.stringify(activity.metadata).replace(/"/g, '""'),
                activity.ipAddress,
                activity.sessionId
              ] : [])
            ].join(','))
          ].join('\n')
        } else {
          csvContent = JSON.stringify(exportData, null, 2)
        }

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          }
        })
      }

      case 'excel':
        return NextResponse.json({
          error: 'Excel format not yet implemented',
          suggestion: 'Use CSV format and import into Excel'
        }, { status: 501 })

      case 'pdf':
        return NextResponse.json({
          error: 'PDF format not yet implemented',
          suggestion: 'Use JSON or CSV format'
        }, { status: 501 })

      case 'json':
      default:
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`
          }
        })
    }

  } catch (error) {
    console.error('Error exporting activity data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}