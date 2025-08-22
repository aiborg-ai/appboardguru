import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  calendar_owner_email: z.string().email(),
  name: z.string().min(1),
  description: z.string().optional(),
  subscription_type: z.enum(['user', 'organization', 'external']).default('user'),
  permission_level: z.enum(['read', 'write', 'admin']).default('read'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
  organization_id: z.string().uuid().optional()
})

const updateSubscriptionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permission_level: z.enum(['read', 'write', 'admin']).optional(),
  is_visible: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['active', 'paused', 'cancelled']).optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeOwned = searchParams.get('include_owned') === 'true'

    let query = (supabase as any)
      .from('calendar_subscriptions')
      .select(`
        *,
        owner:users!calendar_subscriptions_calendar_owner_id_fkey(id, full_name, email, avatar_url),
        organization:organizations(id, name)
      `)

    if (includeOwned) {
      query = query.or(`subscriber_id.eq.${user.id},calendar_owner_id.eq.${user.id}`)
    } else {
      query = query.eq('subscriber_id', user.id)
    }

    query = query.order('created_at', { ascending: false })

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('Calendar subscriptions fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    return NextResponse.json({ subscriptions })

  } catch (error) {
    console.error('Calendar subscriptions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSubscriptionSchema.parse(body)

    // Find the calendar owner by email
    const { data: calendarOwner, error: ownerError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', validatedData.calendar_owner_email)
      .single()

    if (ownerError || !calendarOwner) {
      return NextResponse.json({ error: 'Calendar owner not found' }, { status: 404 })
    }

    // Prevent self-subscription
    if (calendarOwner.id === user.id) {
      return NextResponse.json({ error: 'Cannot subscribe to your own calendar' }, { status: 400 })
    }

    // Check for existing subscription
    const { data: existingSubscription } = await (supabase as any)
      .from('calendar_subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('calendar_owner_id', calendarOwner.id)
      .single()

    if (existingSubscription) {
      return NextResponse.json({ error: 'Already subscribed to this calendar' }, { status: 409 })
    }

    // Create the subscription
    const { data: subscription, error: createError } = await (supabase as any)
      .from('calendar_subscriptions')
      .insert({
        subscriber_id: user.id,
        calendar_owner_id: calendarOwner.id,
        name: validatedData.name,
        description: validatedData.description,
        subscription_type: validatedData.subscription_type,
        permission_level: validatedData.permission_level,
        color: validatedData.color,
        organization_id: validatedData.organization_id
      })
      .select(`
        *,
        owner:users!calendar_subscriptions_calendar_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (createError) {
      console.error('Calendar subscription creation error:', createError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    return NextResponse.json({
      subscription,
      message: 'Calendar subscription created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar subscription creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateSubscriptionSchema.parse(body)

    // Check if user owns the subscription or the calendar
    const { data: subscription, error: fetchError } = await (supabase as any)
      .from('calendar_subscriptions')
      .select('subscriber_id, calendar_owner_id')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const canUpdate = subscription.subscriber_id === user.id || subscription.calendar_owner_id === user.id

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: updatedSubscription, error: updateError } = await (supabase as any)
      .from('calendar_subscriptions')
      .update(validatedData)
      .eq('id', subscriptionId)
      .select(`
        *,
        owner:users!calendar_subscriptions_calendar_owner_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error('Calendar subscription update error:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({
      subscription: updatedSubscription,
      message: 'Subscription updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar subscription update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    // Check if user owns the subscription
    const { data: subscription, error: fetchError } = await (supabase as any)
      .from('calendar_subscriptions')
      .select('subscriber_id, calendar_owner_id')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const canDelete = subscription.subscriber_id === user.id || subscription.calendar_owner_id === user.id

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error: deleteError } = await (supabase as any)
      .from('calendar_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (deleteError) {
      console.error('Calendar subscription deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Subscription deleted successfully' })

  } catch (error) {
    console.error('Calendar subscription deletion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}