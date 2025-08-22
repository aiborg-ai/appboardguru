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

    const { data: user } = await (supabase as any)
      .from('users')
      .select('organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (!(user as any)?.organization_id) {
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
        let query = (supabase as any)
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
          .eq('organization_id', (user as any)?.organization_id)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: false })

        if ((filters as any)?.eventTypes?.length) {
          query = query.in('event_type', (filters as any).eventTypes)
        }
        if ((filters as any)?.entityTypes?.length) {
          query = query.in('entity_type', (filters as any).entityTypes)
        }
        if ((filters as any)?.userIds?.length) {
          query = query.in('user_id', (filters as any).userIds)
        }

        const { data: activities, error } = await query

        if (error) throw error

        exportData = {
          reportType: 'Activity Log',
          organizationId: (user as any)?.organization_id,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            label: timeRange
          },
          totalEvents: (activities as any)?.length || 0,
          activities: (activities as any)?.map((activity: any) => ({
            id: (activity as any)?.id,
            timestamp: (activity as any)?.timestamp,
            eventType: (activity as any)?.event_type,
            entityType: (activity as any)?.entity_type,
            entityId: (activity as any)?.entity_id,
            user: {
              id: (activity as any)?.users?.id || 'unknown',
              name: (activity as any)?.users?.name || 'Unknown User',
              email: (activity as any)?.users?.email || 'unknown'
            },
            ...(includeMetadata && {
              metadata: (activity as any)?.metadata,
              correlationId: (activity as any)?.correlation_id,
              sessionId: (activity as any)?.session_id,
              ipAddress: (activity as any)?.ip_address,
              userAgent: (activity as any)?.user_agent,
              source: (activity as any)?.source
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
          organization_id: (user as any)?.organization_id
        }
        break
      }

      case 'security': {
        if ((user as any)?.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required for security reports' }, { status: 403 })
        }

        const { data: securityEvents } = await (supabase as any)
          .from('audit_logs')
          .select('*')
          .eq('organization_id', (user as any)?.organization_id)
          .in('event_type', ['user_login', 'user_logout', 'failed_login', 'permission_change', 'security_alert'])
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: false })

        exportData = {
          reportType: 'Security Activity Report',
          organizationId: (user as any)?.organization_id,
          timeRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          securityEvents: (securityEvents as any) || [],
          summary: {
            totalSecurityEvents: (securityEvents as any)?.length || 0,
            uniqueUsers: [...new Set((securityEvents as any)?.map((e: any) => (e as any)?.user_id))].length,
            loginAttempts: (securityEvents as any)?.filter((e: any) => (e as any)?.event_type === 'user_login').length || 0,
            failedLogins: (securityEvents as any)?.filter((e: any) => (e as any)?.event_type === 'failed_login').length || 0
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
            ...(exportData as any)?.activities?.map((activity: any) => [
              (activity as any)?.timestamp,
              (activity as any)?.user?.name,
              (activity as any)?.user?.email,
              (activity as any)?.eventType,
              (activity as any)?.entityType,
              (activity as any)?.entityId,
              ...(includeMetadata ? [
                JSON.stringify((activity as any)?.metadata).replace(/"/g, '""'),
                (activity as any)?.ipAddress,
                (activity as any)?.sessionId
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