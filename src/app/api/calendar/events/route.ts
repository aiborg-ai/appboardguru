import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_datetime: z.string(),
  end_datetime: z.string(),
  timezone: z.string().default('UTC'),
  all_day: z.boolean().default(false),
  event_type: z.enum(['meeting', 'personal', 'reminder', 'deadline', 'holiday']).default('meeting'),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
  visibility: z.enum(['public', 'organization', 'private']).default('private'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  location: z.string().optional(),
  virtual_meeting_url: z.string().url().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.any().optional(),
  organization_id: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    role: z.enum(['organizer', 'presenter', 'participant', 'optional']).default('participant')
  })).default([]),
  reminders: z.array(z.object({
    reminder_type: z.enum(['email', 'push', 'in_app', 'sms']),
    minutes_before: z.number().min(0)
  })).default([])
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const organizationId = searchParams.get('organization_id')
    const eventType = searchParams.get('event_type')
    const includeDeclined = searchParams.get('include_declined') === 'true'

    let query = (supabase as any)
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(*),
        reminders:calendar_reminders(*)
      `)

    // Date range filter
    if (startDate && endDate) {
      query = query
        .gte('start_datetime', startDate)
        .lte('end_datetime', endDate)
    }

    // Organization filter
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Event type filter
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    // Order by start time
    query = query.order('start_datetime', { ascending: true })

    const { data: events, error } = await query

    if (error) {
      console.error('Calendar events fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Filter out declined events if not requested
    let filteredEvents = events || []
    if (!includeDeclined) {
      filteredEvents = (events as any[])?.filter((event: any) => {
        const userAttendee = event.attendees?.find((a: any) => a.user_id === user.id)
        return !userAttendee || userAttendee.rsvp_status !== 'declined'
      }) || []
    }

    return NextResponse.json({
      events: filteredEvents,
      total: filteredEvents.length
    })

  } catch (error) {
    console.error('Calendar events API error:', error)
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
    const validatedData = createEventSchema.parse(body)

    // Check for scheduling conflicts
    const { data: conflicts } = await (supabase as any)
      .rpc('check_calendar_conflicts', {
        p_user_id: user.id,
        p_start_datetime: validatedData.start_datetime,
        p_end_datetime: validatedData.end_datetime
      })

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({
        error: 'Scheduling conflict detected',
        conflicts
      }, { status: 409 })
    }

    // Create the calendar event
    const { data: event, error: eventError } = await (supabase as any)
      .from('calendar_events')
      .insert({
        ...validatedData,
        user_id: user.id,
        created_by: user.id
      })
      .select()
      .single()

    if (eventError) {
      console.error('Calendar event creation error:', eventError)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // Add attendees if provided
    if (validatedData.attendees.length > 0) {
      const attendeesToInsert = validatedData.attendees.map(attendee => ({
        event_id: event.id,
        user_id: user.id, // Will be updated when we resolve email to user_id
        email: attendee.email,
        role: attendee.role,
        invited_by: user.id
      }))

      const { error: attendeesError } = await (supabase as any)
        .from('calendar_attendees')
        .insert(attendeesToInsert)

      if (attendeesError) {
        console.error('Calendar attendees creation error:', attendeesError)
      }
    }

    // Add reminders if provided
    if (validatedData.reminders.length > 0) {
      const remindersToInsert = validatedData.reminders.map(reminder => ({
        event_id: event.id,
        user_id: user.id,
        reminder_type: reminder.reminder_type,
        minutes_before: reminder.minutes_before
      }))

      const { error: remindersError } = await (supabase as any)
        .from('calendar_reminders')
        .insert(remindersToInsert)

      if (remindersError) {
        console.error('Calendar reminders creation error:', remindersError)
      }
    }

    // Fetch the complete event with relations
    const { data: completeEvent } = await (supabase as any)
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(*),
        reminders:calendar_reminders(*)
      `)
      .eq('id', event.id)
      .single()

    return NextResponse.json({
      event: completeEvent,
      message: 'Event created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar event creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}