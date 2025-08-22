import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'

/**
 * Generate scheduled compliance notifications
 * This endpoint is designed to be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a scheduled request (check for auth header or specific token)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env['CRON_SECRET']
    
    if (!authHeader || !cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    
    // Generate notifications for all organizations
    const result = await complianceEngine.generateScheduledNotifications()
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Generate compliance notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Manual trigger for generating notifications (admin only)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/owner in any organization
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Generate notifications
    const result = await complianceEngine.generateScheduledNotifications()
    
    return NextResponse.json({
      ...result,
      message: 'Compliance notifications generated manually'
    })

  } catch (error) {
    console.error('Manual generate compliance notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}