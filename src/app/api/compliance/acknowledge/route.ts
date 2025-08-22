import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { AcknowledgeNotificationRequest } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEnginesupabase
    const body = await request.json() as AcknowledgeNotificationRequest
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!body.notification_id || !body.acknowledgment_method) {
      return NextResponse.json({ 
        error: 'Notification ID and acknowledgment method are required' 
      }, { status: 400 })
    }

    // Verify user owns this notification
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', body.notification_id)
      .eq('user_id', user.id)
      .single()

    if (!notification) {
      return NextResponse.json({ 
        error: 'Notification not found or access denied' 
      }, { status: 404 })
    }

    // Check if notification requires acknowledgment
    if (!(notification as any)?.requires_acknowledgment) {
      return NextResponse.json({ 
        error: 'This notification does not require acknowledgment' 
      }, { status: 400 })
    }

    // Check if already acknowledged
    if ((notification as any)?.acknowledged_at) {
      return NextResponse.json({ 
        error: 'Notification has already been acknowledged',
        data: { 
          acknowledged_at: (notification as any)?.acknowledged_at,
          acknowledgment_method: (notification as any)?.acknowledgment_method 
        }
      }, { status: 400 })
    }

    // Validate digital signature if provided
    if (body.acknowledgment_method === 'digital_signature') {
      if (!body.digital_signature || !body.digital_signature.signature_data) {
        return NextResponse.json({ 
          error: 'Digital signature data is required for digital signature acknowledgment' 
        }, { status: 400 })
      }

      // Validate signature timestamp (should be recent)
      const signatureTime = new Date(body.digital_signature.timestamp)
      const now = new Date()
      const timeDifference = now.getTime() - signatureTime.getTime()
      const maxAge = 5 * 60 * 1000 // 5 minutes

      if (timeDifference > maxAge) {
        return NextResponse.json({ 
          error: 'Digital signature timestamp is too old' 
        }, { status: 400 })
      }
    }

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // If digital signature, add IP to signature data
    if (body.digital_signature) {
      body.digital_signature.ip_address = clientIp
      body.digital_signature.user_agent = request.headers.get('user-agent') || ''
    }

    // Acknowledge the notification
    const result = await complianceEngine.acknowledgeNotification(user.id, body)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Compliance acknowledge API error:', error)
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

    const notificationId = searchParams.get('notification_id')
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    // Get acknowledgment details
    const { data: notification, error } = await supabase
      .from('notifications')
      .select(`
        id,
        title,
        requires_acknowledgment,
        acknowledged_at,
        acknowledgment_method,
        compliance_evidence_url,
        created_at
      `)
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Get audit trail for this acknowledgment
    const { data: auditEntries } = await supabase
      .from('notification_audit_log')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('event_type', 'notification_acknowledged')
      .order('event_timestamp', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        notification: notification,
        audit_trail: auditEntries || [],
        is_acknowledged: !!(notification as any)?.acknowledged_at
      }
    })

  } catch (error) {
    console.error('Compliance acknowledge GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk acknowledge endpoint
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEnginesupabase
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notification_ids, acknowledgment_method, notes } = body

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Array of notification IDs is required' 
      }, { status: 400 })
    }

    if (!acknowledgment_method) {
      return NextResponse.json({ 
        error: 'Acknowledgment method is required' 
      }, { status: 400 })
    }

    const results = {
      successful: 0,
      failed: 0,
      details: [] as Array<{ notification_id: string, status: string, error?: string }>
    }

    // Process each notification
    for (const notificationId of notification_ids) {
      try {
        await complianceEngine.acknowledgeNotification(user.id, {
          notification_id: notificationId,
          acknowledgment_method,
          notes
        })
        
        results.successful++
        results.details.push({
          notification_id: notificationId,
          status: 'success'
        })
      } catch (error) {
        results.failed++
        results.details.push({
          notification_id: notificationId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Processed ${notification_ids.length} notifications: ${results.successful} successful, ${results.failed} failed`
    })

  } catch (error) {
    console.error('Compliance acknowledge bulk API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}