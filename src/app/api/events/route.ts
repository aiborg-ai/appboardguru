import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for creating events
const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  event_type: z.enum(['meeting', 'deadline', 'reminder', 'other']).default('other'),
  start_date: z.string(),
  end_date: z.string().optional(),
  location: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  is_all_day: z.boolean().default(false),
  reminder_minutes: z.number().optional(),
  recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// GET /api/events - Fetch events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('events')
      .select('*')
      .eq('created_by', user.id)
      .order('start_date', { ascending: true });

    // Apply filters
    const organizationId = searchParams.get('organizationId');
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      query = query.lte('start_date', endDate);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: events || []
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createEventSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        start_date: data.start_date,
        end_date: data.end_date || data.start_date,
        location: data.location,
        organization_id: data.organization_id,
        is_all_day: data.is_all_day,
        reminder_minutes: data.reminder_minutes,
        recurring: data.recurring,
        recurrence_pattern: data.recurrence_pattern,
        attendees: data.attendees || [],
        color: data.color || '#3B82F6',
        metadata: data.metadata || {},
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creating event:', eventError);
      return NextResponse.json(
        { error: 'Failed to create event', details: eventError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[id] - Update event
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get event ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId || eventId === 'route') {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update the event
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update({
        ...body,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('created_by', user.id) // Ensure user owns the event
      .select()
      .single();

    if (updateError) {
      console.error('Error updating event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get event ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId || eventId === 'route') {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Delete the event
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('created_by', user.id); // Ensure user owns the event

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}