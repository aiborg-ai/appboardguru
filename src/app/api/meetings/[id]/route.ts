import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        organization_id,
        created_by,
        title,
        description,
        meeting_type,
        status,
        visibility,
        scheduled_start,
        scheduled_end,
        timezone,
        location,
        virtual_meeting_url,
        is_recurring,
        recurrence_type,
        recurrence_interval,
        recurrence_end_date,
        parent_meeting_id,
        agenda_finalized,
        invitations_sent,
        documents_locked,
        estimated_duration_minutes,
        actual_start,
        actual_end,
        settings,
        tags,
        category,
        created_at,
        updated_at,
        cancelled_at,
        cancelled_reason
      `)
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Verify user has access to the organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!orgMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transform to match our interface
    const formattedMeeting = {
      id: meeting.id,
      organizationId: meeting.organization_id,
      createdBy: meeting.created_by,
      title: meeting.title,
      description: meeting.description,
      meetingType: meeting.meeting_type,
      status: meeting.status,
      visibility: meeting.visibility,
      scheduledStart: meeting.scheduled_start,
      scheduledEnd: meeting.scheduled_end,
      timezone: meeting.timezone,
      location: meeting.location,
      virtualMeetingUrl: meeting.virtual_meeting_url,
      isRecurring: meeting.is_recurring,
      recurrenceType: meeting.recurrence_type,
      recurrenceInterval: meeting.recurrence_interval,
      recurrenceEndDate: meeting.recurrence_end_date,
      parentMeetingId: meeting.parent_meeting_id,
      agendaFinalized: meeting.agenda_finalized,
      invitationsSent: meeting.invitations_sent,
      documentsLocked: meeting.documents_locked,
      estimatedDurationMinutes: meeting.estimated_duration_minutes,
      actualStart: meeting.actual_start,
      actualEnd: meeting.actual_end,
      settings: meeting.settings,
      tags: meeting.tags,
      category: meeting.category,
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at,
      cancelledAt: meeting.cancelled_at,
      cancelledReason: meeting.cancelled_reason
    };

    return NextResponse.json({
      meeting: formattedMeeting
    });

  } catch (error) {
    console.error('Error in GET /api/meetings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
    const updates = await request.json();

    // Check if user has access to this meeting and can manage it
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        organization_id,
        created_by
      `)
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is meeting organizer or has admin/superuser role
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const canManage = meeting.created_by === user.id || 
                     (orgMember && ['owner', 'admin', 'superuser'].includes(orgMember.role));

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the meeting
    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', meetingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating meeting:', updateError);
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
    }

    return NextResponse.json({ 
      meeting: updatedMeeting,
      message: 'Meeting updated successfully' 
    });

  } catch (error) {
    console.error('Error in PATCH /api/meetings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}