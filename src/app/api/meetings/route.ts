import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schemas
const createMeetingSchema = z.object({
  organizationId: z.string().uuid(),
  boardId: z.string().uuid().optional().nullable(),
  committeeId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  meetingType: z.enum(['agm', 'board', 'committee', 'other']),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  timezone: z.string().default('UTC'),
  location: z.string().optional().nullable(),
  virtualMeetingUrl: z.string().url().optional().nullable(),
  isHybrid: z.boolean().default(false),
  agendaItems: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(['presentation', 'discussion', 'decision', 'information', 'break']),
    estimatedDuration: z.number(),
    presenter: z.string().optional(),
    order: z.number()
  })).optional().default([]),
  invitees: z.array(z.object({
    userId: z.string().uuid().optional(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['organizer', 'chair', 'secretary', 'board_member', 'presenter', 'guest', 'observer', 'facilitator']),
    isRequired: z.boolean().default(false),
    canVote: z.boolean().default(false)
  })).optional().default([]),
  settings: z.object({
    allowGuests: z.boolean().default(true),
    recordMeeting: z.boolean().default(false),
    autoGenerateMinutes: z.boolean().default(false),
    requireRsvp: z.boolean().default(true),
    allowProxyVoting: z.boolean().default(false),
    publicMeeting: z.boolean().default(false)
  }).optional()
});

// GET /api/meetings - Fetch meetings list
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const meetingType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('meetings')
      .select(`
        *,
        organization:organizations(id, name, slug),
        board:boards(id, name),
        committee:committees(id, name),
        organizer:auth.users!meetings_organizer_id_fkey(id, email),
        attendees:meeting_attendees(count)
      `)
      .order('scheduled_start', { ascending: false })
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (meetingType) {
      query = query.eq('meeting_type', meetingType);
    }

    // Filter by user's organizations
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (userOrgs && userOrgs.length > 0) {
      const orgIds = userOrgs.map(o => o.organization_id);
      query = query.in('organization_id', orgIds);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: meetings || [],
      pagination: {
        limit,
        offset,
        total: meetings?.length || 0
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create new meeting
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
    const validation = createMeetingSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify user has permission to create meetings in this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', data.organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'You do not have permission to create meetings in this organization' },
        { status: 403 }
      );
    }

    // Generate meeting number
    const meetingNumber = `${data.meetingType.toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Create the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        organization_id: data.organizationId,
        board_id: data.boardId,
        committee_id: data.committeeId,
        title: data.title,
        description: data.description,
        meeting_type: data.meetingType,
        meeting_number: meetingNumber,
        status: 'scheduled',
        scheduled_start: data.scheduledStart,
        scheduled_end: data.scheduledEnd,
        timezone: data.timezone,
        location: data.location,
        virtual_meeting_url: data.virtualMeetingUrl,
        is_hybrid: data.isHybrid,
        created_by: user.id,
        organizer_id: user.id,
        settings: data.settings || {},
        agenda_item_count: data.agendaItems?.length || 0,
        attendee_count: data.invitees?.length || 0
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Error creating meeting:', meetingError);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    // Create agenda items if provided
    if (data.agendaItems && data.agendaItems.length > 0) {
      const agendaItems = data.agendaItems.map((item, index) => ({
        meeting_id: meeting.id,
        title: item.title,
        description: item.description,
        item_type: item.type,
        order_index: item.order || index + 1,
        estimated_duration: item.estimatedDuration,
        presenter_name: item.presenter,
        created_by: user.id
      }));

      const { error: agendaError } = await supabase
        .from('meeting_agenda_items')
        .insert(agendaItems);

      if (agendaError) {
        console.error('Error creating agenda items:', agendaError);
        // Continue even if agenda items fail
      }
    }

    // Add invitees if provided
    if (data.invitees && data.invitees.length > 0) {
      const attendees = data.invitees.map(invitee => ({
        meeting_id: meeting.id,
        user_id: invitee.userId,
        external_email: invitee.userId ? null : invitee.email,
        external_name: invitee.userId ? null : invitee.name,
        role: invitee.role,
        is_required: invitee.isRequired,
        can_vote: invitee.canVote,
        invited_by: user.id,
        rsvp_status: 'pending'
      }));

      const { error: attendeeError } = await supabase
        .from('meeting_attendees')
        .insert(attendees);

      if (attendeeError) {
        console.error('Error adding attendees:', attendeeError);
        // Continue even if attendees fail
      }
    }

    // Add the creator as an attendee with organizer role
    await supabase
      .from('meeting_attendees')
      .insert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: 'organizer',
        is_required: true,
        can_vote: true,
        rsvp_status: 'accepted',
        invited_by: user.id
      });

    // Fetch the complete meeting data with relations
    const { data: completeMeeting, error: fetchError } = await supabase
      .from('meetings')
      .select(`
        *,
        organization:organizations(id, name, slug),
        board:boards(id, name),
        committee:committees(id, name),
        organizer:auth.users!meetings_organizer_id_fkey(id, email),
        agenda_items:meeting_agenda_items(
          id,
          title,
          description,
          item_type,
          order_index,
          estimated_duration
        ),
        attendees:meeting_attendees(
          id,
          user_id,
          external_email,
          external_name,
          role,
          rsvp_status
        )
      `)
      .eq('id', meeting.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete meeting:', fetchError);
      // Return basic meeting data if fetch fails
      return NextResponse.json({
        success: true,
        data: meeting,
        message: 'Meeting created successfully'
      });
    }

    return NextResponse.json({
      success: true,
      data: completeMeeting,
      message: 'Meeting created successfully'
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/meetings/[id] - Update meeting
export async function PATCH(request: NextRequest) {
  // Implementation for updating meetings
  return NextResponse.json(
    { error: 'Not implemented yet' },
    { status: 501 }
  );
}

// DELETE /api/meetings/[id] - Delete meeting
export async function DELETE(request: NextRequest) {
  // Implementation for deleting meetings
  return NextResponse.json(
    { error: 'Not implemented yet' },
    { status: 501 }
  );
}