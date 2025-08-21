import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CreateActionableRequest, MeetingActionable } from '@/types/meetings';

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

    // Check if user has access to this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        organization_id,
        title,
        created_by
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

    // Get actionables for the meeting
    const { data: actionables, error: actionablesError } = await supabase
      .from('meeting_actionables')
      .select(`
        id,
        meeting_id,
        agenda_item_id,
        resolution_id,
        assigned_to,
        assigned_by,
        delegated_from,
        action_number,
        title,
        description,
        detailed_requirements,
        category,
        priority,
        estimated_effort_hours,
        actual_effort_hours,
        due_date,
        reminder_intervals,
        last_reminder_sent,
        status,
        progress_percentage,
        completion_notes,
        depends_on_actionable_ids,
        blocks_actionable_ids,
        requires_approval,
        approved_by,
        approved_at,
        approval_notes,
        deliverable_type,
        deliverable_location,
        success_metrics,
        actual_results,
        stakeholders_to_notify,
        communication_required,
        communication_template,
        escalation_level,
        escalation_path,
        escalated_at,
        escalated_to,
        escalation_reason,
        assigned_at,
        started_at,
        completed_at,
        cancelled_at,
        created_at,
        updated_at
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (actionablesError) {
      console.error('Error fetching actionables:', actionablesError);
      return NextResponse.json({ error: 'Failed to fetch actionables' }, { status: 500 });
    }

    // Transform to match our TypeScript interface
    const formattedActionables: MeetingActionable[] = actionables.map(actionable => ({
      id: actionable.id,
      meetingId: actionable.meeting_id,
      agendaItemId: actionable.agenda_item_id,
      resolutionId: actionable.resolution_id,
      assignedTo: actionable.assigned_to,
      assignedBy: actionable.assigned_by,
      delegatedFrom: actionable.delegated_from,
      actionNumber: actionable.action_number,
      title: actionable.title,
      description: actionable.description,
      detailedRequirements: actionable.detailed_requirements,
      category: actionable.category,
      priority: actionable.priority,
      estimatedEffortHours: actionable.estimated_effort_hours,
      actualEffortHours: actionable.actual_effort_hours,
      dueDate: actionable.due_date,
      reminderIntervals: actionable.reminder_intervals || [],
      lastReminderSent: actionable.last_reminder_sent,
      status: actionable.status,
      progressPercentage: actionable.progress_percentage,
      completionNotes: actionable.completion_notes,
      dependsOnActionableIds: actionable.depends_on_actionable_ids || [],
      blocksActionableIds: actionable.blocks_actionable_ids || [],
      requiresApproval: actionable.requires_approval,
      approvedBy: actionable.approved_by,
      approvedAt: actionable.approved_at,
      approvalNotes: actionable.approval_notes,
      deliverableType: actionable.deliverable_type,
      deliverableLocation: actionable.deliverable_location,
      successMetrics: actionable.success_metrics,
      actualResults: actionable.actual_results,
      stakeholdersToNotify: actionable.stakeholders_to_notify || [],
      communicationRequired: actionable.communication_required,
      communicationTemplate: actionable.communication_template,
      escalationLevel: actionable.escalation_level,
      escalationPath: actionable.escalation_path || [],
      escalatedAt: actionable.escalated_at,
      escalatedTo: actionable.escalated_to,
      escalationReason: actionable.escalation_reason,
      assignedAt: actionable.assigned_at,
      startedAt: actionable.started_at,
      completedAt: actionable.completed_at,
      cancelledAt: actionable.cancelled_at,
      createdAt: actionable.created_at,
      updatedAt: actionable.updated_at
    }));

    return NextResponse.json({
      actionables: formattedActionables,
      total: formattedActionables.length
    });

  } catch (error) {
    console.error('Error in GET /api/meetings/[id]/actionables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const body: CreateActionableRequest = await request.json();

    // Validate required fields
    if (!body.assignedTo || !body.title || !body.description || !body.dueDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: assignedTo, title, description, dueDate' 
      }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Insufficient permissions to assign actions' }, { status: 403 });
    }

    // Validate assignee exists and has access to the organization
    const { data: assigneeCheck } = await supabase
      .from('organization_members')
      .select('user_id, status')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', body.assignedTo)
      .eq('status', 'active')
      .single();

    if (!assigneeCheck) {
      return NextResponse.json({ 
        error: 'Assignee is not a member of this organization' 
      }, { status: 400 });
    }

    // Create the actionable
    const { data: actionable, error: insertError } = await supabase
      .from('meeting_actionables')
      .insert({
        meeting_id: meetingId,
        agenda_item_id: body.agendaItemId,
        resolution_id: body.resolutionId,
        assigned_to: body.assignedTo,
        assigned_by: user.id,
        title: body.title,
        description: body.description,
        detailed_requirements: body.detailedRequirements,
        category: body.category || 'follow_up',
        priority: body.priority || 'medium',
        estimated_effort_hours: body.estimatedEffortHours,
        due_date: body.dueDate,
        reminder_intervals: body.reminderIntervals || [7, 3, 1],
        depends_on_actionable_ids: body.dependsOnActionableIds || [],
        requires_approval: body.requiresApproval || false,
        deliverable_type: body.deliverableType,
        success_metrics: body.successMetrics,
        stakeholders_to_notify: body.stakeholdersToNotify || [],
        communication_required: body.communicationRequired || false,
        escalation_path: body.escalationPath || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating actionable:', insertError);
      return NextResponse.json({ error: 'Failed to create actionable' }, { status: 500 });
    }

    return NextResponse.json({ 
      actionable,
      message: 'Action item assigned successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/meetings/[id]/actionables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}