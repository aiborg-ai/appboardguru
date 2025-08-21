import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  timezone: z.string().optional(),
  all_day: z.boolean().optional(),
  event_type: z.enum(['meeting', 'personal', 'reminder', 'deadline', 'holiday']).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  visibility: z.enum(['public', 'organization', 'private']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  virtual_meeting_url: z.string().url().optional(),
  recurrence_rule: z.any().optional()
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
    const { data: event, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(*),
        reminders:calendar_reminders(*),
        meeting:meetings(*),
        created_by_user:users!calendar_events_created_by_fkey(id, full_name, email)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Calendar event fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    return NextResponse.json({ event })

  } catch (error) {
    console.error('Calendar event fetch API error:', error)
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
    const validatedData = updateEventSchema.parse(body)

    // Check if user owns the event or has permission to edit
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (existingEvent.user_id !== user.id) {
      // Check if user has edit permission as attendee
      const { data: attendee } = await supabase
        .from('calendar_attendees')
        .select('can_edit')
        .eq('event_id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (!attendee?.can_edit) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Check for conflicts if datetime is being updated
    if (validatedData.start_datetime || validatedData.end_datetime) {
      const startTime = validatedData.start_datetime || existingEvent.start_datetime
      const endTime = validatedData.end_datetime || existingEvent.end_datetime

      const { data: conflicts } = await supabase
        .rpc('check_calendar_conflicts', {
          p_user_id: existingEvent.user_id,
          p_start_datetime: startTime,
          p_end_datetime: endTime,
          p_exclude_event_id: resolvedParams.id
        })

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({
          error: 'Scheduling conflict detected',
          conflicts
        }, { status: 409 })
      }
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(validatedData)
      .eq('id', resolvedParams.id)
      .select(`
        *,
        attendees:calendar_attendees(*),
        reminders:calendar_reminders(*)
      `)
      .single()

    if (updateError) {
      console.error('Calendar event update error:', updateError)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({
      event: updatedEvent,
      message: 'Event updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Calendar event update API error:', error)
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
    const deleteRecurring = searchParams.get('delete_recurring') === 'true'

    // Check if user owns the event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('user_id, is_recurring, parent_event_id')
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (existingEvent.user_id !== user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (deleteRecurring && (existingEvent.is_recurring || existingEvent.parent_event_id)) {
      // Delete all recurring instances
      const parentId = existingEvent.parent_event_id || resolvedParams.id
      
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .or(`id.eq.${parentId},parent_event_id.eq.${parentId}`)

      if (deleteError) {
        console.error('Recurring events deletion error:', deleteError)
        return NextResponse.json({ error: 'Failed to delete recurring events' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Recurring events deleted successfully' })
    } else {
      // Delete single event
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', resolvedParams.id)

      if (deleteError) {
        console.error('Calendar event deletion error:', deleteError)
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Event deleted successfully' })
    }

  } catch (error) {
    console.error('Calendar event deletion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}