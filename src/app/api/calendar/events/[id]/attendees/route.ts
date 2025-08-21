import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const addAttendeeSchema = z.object({
  email: z.string().email(),
  role: z.enum(['organizer', 'presenter', 'participant', 'optional']).default('participant'),
  can_edit: z.boolean().default(false),
  can_invite_others: z.boolean().default(false)
})

const updateRsvpSchema = z.object({
  rsvp_status: z.enum(['pending', 'accepted', 'declined', 'tentative']),
  rsvp_note: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params;
    const { data: attendees, error } = await supabase
      .from('calendar_attendees')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        invited_by_user:users!calendar_attendees_invited_by_fkey(id, full_name, email)
      `)
      .eq('event_id', resolvedParams.id)
      .order('invited_at', { ascending: true })

    if (error) {
      console.error('Calendar attendees fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
    }

    return NextResponse.json({ attendees })

  } catch (error) {
    console.error('Calendar attendees API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params;
    const body = await request.json()
    const validatedData = addAttendeeSchema.parse(body)

    // Check if user has permission to add attendees
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('user_id')
      .eq('id', resolvedParams.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isOwner = event.user_id === user.id
    let canInvite = isOwner

    if (!isOwner) {
      // Check if user is an attendee with invite permissions
      const { data: attendee } = await supabase
        .from('calendar_attendees')
        .select('can_invite_others')
        .eq('event_id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      canInvite = attendee?.can_invite_others || false
    }

    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions to invite attendees' }, { status: 403 })
    }

    // Look up user by email
    const { data: invitedUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    const attendeeData = {
      event_id: resolvedParams.id,
      user_id: invitedUser?.id || user.id, // Fallback if email not found
      email: validatedData.email,
      role: validatedData.role,
      can_edit: validatedData.can_edit,
      can_invite_others: validatedData.can_invite_others,
      invited_by: user.id
    }

    const { data: newAttendee, error: insertError } = await supabase
      .from('calendar_attendees')
      .insert(attendeeData)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'User is already an attendee' }, { status: 409 })
      }
      console.error('Calendar attendee creation error:', insertError)
      return NextResponse.json({ error: 'Failed to add attendee' }, { status: 500 })
    }

    return NextResponse.json({
      attendee: newAttendee,
      message: 'Attendee added successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar attendee addition API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params;
    const body = await request.json()
    const validatedData = updateRsvpSchema.parse(body)

    // Update RSVP status
    const { data: updatedAttendee, error: updateError } = await supabase
      .from('calendar_attendees')
      .update({
        rsvp_status: validatedData.rsvp_status,
        rsvp_note: validatedData.rsvp_note,
        rsvp_responded_at: new Date().toISOString()
      })
      .eq('event_id', resolvedParams.id)
      .eq('user_id', user.id)
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        event:calendar_events(title, start_datetime)
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Attendee record not found' }, { status: 404 })
      }
      console.error('RSVP update error:', updateError)
      return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 })
    }

    return NextResponse.json({
      attendee: updatedAttendee,
      message: 'RSVP updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('RSVP update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params;
    const { searchParams } = new URL(request.url)
    const attendeeEmail = searchParams.get('email')

    if (!attendeeEmail) {
      return NextResponse.json({ error: 'Attendee email is required' }, { status: 400 })
    }

    // Check if user has permission to remove attendees
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('user_id')
      .eq('id', resolvedParams.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isOwner = event.user_id === user.id
    const isSelf = attendeeEmail === user.email

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('calendar_attendees')
      .delete()
      .eq('event_id', resolvedParams.id)
      .eq('email', attendeeEmail)

    if (deleteError) {
      console.error('Attendee removal error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove attendee' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Attendee removed successfully' })

  } catch (error) {
    console.error('Attendee removal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}