import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organizationId')

    if (organizationId !== user.organization_id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const { data: alerts, error } = await supabase
      .from('activity_alert_instances')
      .select(`
        id,
        rule_id,
        rule_name,
        priority,
        message,
        triggered_at,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        metadata
      `)
      .eq('organization_id', user.organization_id)
      .order('triggered_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({
      success: true,
      alerts: alerts || []
    })

  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const { action, alertId } = body

    switch (action) {
      case 'acknowledge': {
        const { error: updateError } = await supabase
          .from('activity_alert_instances')
          .update({
            acknowledged: true,
            acknowledged_by: authUser.id,
            acknowledged_at: new Date().toISOString()
          })
          .eq('id', alertId)
          .eq('organization_id', user.organization_id)

        if (updateError) throw updateError

        await supabase
          .from('audit_logs')
          .insert({
            user_id: authUser.id,
            organization_id: user.organization_id,
            event_type: 'alert_acknowledged',
            entity_type: 'alert',
            entity_id: alertId,
            metadata: { alertId },
            timestamp: new Date().toISOString(),
            correlation_id: `alert-ack-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            session_id: `session-${authUser.id}-${Date.now()}`,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            source: 'activity_alerts'
          })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}