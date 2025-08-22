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
    const { data: meeting, error: meetingError } = await (supabase as any)
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
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', (meeting as any)?.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!orgMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transform to match our interface
    const formattedMeeting = {
      id: (meeting as any)?.id,
      organizationId: (meeting as any)?.organization_id,
      createdBy: (meeting as any)?.created_by,
      title: (meeting as any)?.title,
      description: (meeting as any)?.description,
      meetingType: (meeting as any)?.meeting_type,
      status: (meeting as any)?.status,
      visibility: (meeting as any)?.visibility,
      scheduledStart: (meeting as any)?.start_time,
      scheduledEnd: (meeting as any)?.end_time,
      timezone: (meeting as any)?.timezone,
      location: (meeting as any)?.location,
      virtualMeetingUrl: (meeting as any)?.virtual_meeting_url,
      isRecurring: (meeting as any)?.is_recurring,
      recurrenceType: (meeting as any)?.recurrence_type,
      recurrenceInterval: (meeting as any)?.recurrence_interval,
      recurrenceEndDate: (meeting as any)?.recurrence_end_date,
      parentMeetingId: (meeting as any)?.parent_meeting_id,
      agendaFinalized: (meeting as any)?.agenda_finalized,
      invitationsSent: (meeting as any)?.invitations_sent,
      documentsLocked: (meeting as any)?.documents_locked,
      estimatedDurationMinutes: (meeting as any)?.estimated_duration_minutes,
      actualStart: (meeting as any)?.actual_start,
      actualEnd: (meeting as any)?.actual_end,
      settings: (meeting as any)?.settings,
      tags: (meeting as any)?.tags,
      category: (meeting as any)?.category,
      createdAt: (meeting as any)?.created_at,
      updatedAt: (meeting as any)?.updated_at,
      cancelledAt: (meeting as any)?.cancelled_at,
      cancelledReason: (meeting as any)?.cancelled_reason
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
    const { data: meeting, error: meetingError } = await (supabase as any)
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
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', (meeting as any)?.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const canManage = (meeting as any)?.created_by === user.id || 
                     ((orgMember as any) && ['owner', 'admin', 'superuser'].includes((orgMember as any)?.role));

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the meeting
    const { data: updatedMeeting, error: updateError } = await (supabase as any)
      .from('meetings')
      .update(updates as any)
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