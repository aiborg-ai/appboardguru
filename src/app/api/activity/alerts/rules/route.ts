import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'
import type { Database } from '@/types/database'

const alertRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  condition: z.object({
    eventType: z.string().optional(),
    entityType: z.string().optional(),
    threshold: z.number().optional(),
    timeWindow: z.string().optional(),
    operator: z.enum(['gt', 'lt', 'eq', 'contains']).optional()
  }),
  actions: z.array(z.object({
    type: z.enum(['email', 'webhook', 'slack', 'teams']),
    config: z.record(z.string(), z.any())
  })),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
})

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!orgMember?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: rules, error } = await (supabase as any)
      .from('activity_alert_rules')
      .select('*')
      .eq('organization_id', orgMember.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      rules: rules || []
    })

  } catch (error) {
    console.error('Error fetching alert rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!orgMember?.organization_id || orgMember.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = alertRuleSchema.parse(body)

    const { data: rule, error } = await (supabase as any)
      .from('activity_alert_rules')
      .insert({
        organization_id: orgMember.organization_id,
        created_by: authUser.id,
        name: validatedData.name,
        description: validatedData.description,
        condition: validatedData.condition,
        actions: validatedData.actions,
        priority: validatedData.priority,
        is_active: true,
        trigger_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        organization_id: orgMember.organization_id,
        event_type: 'alert_rule_created',
        entity_type: 'alert_rule',
        entity_id: rule?.id || '',
        metadata: {
          ruleName: validatedData.name,
          priority: validatedData.priority,
          condition: validatedData.condition
        },
        timestamp: new Date().toISOString(),
        correlation_id: `rule-create-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        session_id: `session-${authUser.id}-${Date.now()}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: 'activity_alerts'
      })

    return NextResponse.json({
      success: true,
      rule: rule
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
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

    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!orgMember?.organization_id || orgMember.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const { ruleId, isActive, ...updates } = body as {
      ruleId: string
      isActive: boolean
      [key: string]: unknown
    }

    const { error } = await (supabase as any)
      .from('activity_alert_rules')
      .update({
        is_active: isActive,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .eq('organization_id', orgMember.organization_id)

    if (error) throw error

    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        organization_id: orgMember.organization_id,
        event_type: 'alert_rule_updated',
        entity_type: 'alert_rule',
        entity_id: ruleId,
        metadata: { isActive, updates },
        timestamp: new Date().toISOString(),
        correlation_id: `rule-update-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        session_id: `session-${authUser.id}-${Date.now()}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: 'activity_alerts'
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!orgMember?.organization_id || orgMember.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const url = new URL(request.url)
    const ruleId = url.searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const { error } = await (supabase as any)
      .from('activity_alert_rules')
      .delete()
      .eq('id', ruleId)
      .eq('organization_id', orgMember.organization_id)

    if (error) throw error

    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        organization_id: orgMember.organization_id,
        event_type: 'alert_rule_deleted',
        entity_type: 'alert_rule',
        entity_id: ruleId,
        metadata: { ruleId },
        timestamp: new Date().toISOString(),
        correlation_id: `rule-delete-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        session_id: `session-${authUser.id}-${Date.now()}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: 'activity_alerts'
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    )
  }
}