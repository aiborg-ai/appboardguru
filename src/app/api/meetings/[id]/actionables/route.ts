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
    const { data: meeting, error: meetingError } = await (supabase as any)
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

    // Get actionables for the meeting
    const { data: actionables, error: actionablesError } = await (supabase as any)
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
    const formattedActionables: MeetingActionable[] = (actionables as any)?.map((actionable: any) => ({
      id: (actionable as any)?.id,
      meetingId: (actionable as any)?.meeting_id,
      agendaItemId: (actionable as any)?.agenda_item_id,
      resolutionId: (actionable as any)?.resolution_id,
      assignedTo: (actionable as any)?.assigned_to,
      assignedBy: (actionable as any)?.assigned_by,
      delegatedFrom: (actionable as any)?.delegated_from,
      actionNumber: (actionable as any)?.action_number,
      title: (actionable as any)?.title,
      description: (actionable as any)?.description,
      detailedRequirements: (actionable as any)?.detailed_requirements,
      category: (actionable as any)?.category as any,
      priority: (actionable as any)?.priority as any,
      estimatedEffortHours: (actionable as any)?.estimated_effort_hours,
      actualEffortHours: (actionable as any)?.actual_effort_hours,
      dueDate: (actionable as any)?.due_date,
      reminderIntervals: (actionable as any)?.reminder_intervals || [],
      lastReminderSent: (actionable as any)?.last_reminder_sent,
      status: (actionable as any)?.status as any,
      progressPercentage: (actionable as any)?.progress_percentage || 0,
      completionNotes: (actionable as any)?.completion_notes,
      dependsOnActionableIds: (actionable as any)?.depends_on_actionable_ids || [],
      blocksActionableIds: (actionable as any)?.blocks_actionable_ids || [],
      requiresApproval: (actionable as any)?.requires_approval || false,
      approvedBy: (actionable as any)?.approved_by,
      approvedAt: (actionable as any)?.approved_at,
      approvalNotes: (actionable as any)?.approval_notes,
      deliverableType: (actionable as any)?.deliverable_type,
      deliverableLocation: (actionable as any)?.deliverable_location,
      successMetrics: (actionable as any)?.success_metrics,
      actualResults: (actionable as any)?.actual_results,
      stakeholdersToNotify: (actionable as any)?.stakeholders_to_notify || [],
      communicationRequired: (actionable as any)?.communication_required || false,
      communicationTemplate: (actionable as any)?.communication_template,
      escalationLevel: (actionable as any)?.escalation_level || 1,
      escalationPath: (actionable as any)?.escalation_path || [],
      escalatedAt: (actionable as any)?.escalated_at,
      escalatedTo: (actionable as any)?.escalated_to,
      escalationReason: (actionable as any)?.escalation_reason,
      assignedAt: (actionable as any)?.assigned_at || (actionable as any)?.created_at,
      startedAt: (actionable as any)?.started_at,
      completedAt: (actionable as any)?.completed_at,
      cancelledAt: (actionable as any)?.cancelled_at,
      createdAt: (actionable as any)?.created_at,
      updatedAt: (actionable as any)?.updated_at
    })) || [];

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
      return NextResponse.json({ error: 'Insufficient permissions to assign actions' }, { status: 403 });
    }

    // Validate assignee exists and has access to the organization
    const { data: assigneeCheck } = await (supabase as any)
      .from('organization_members')
      .select('user_id, status')
      .eq('organization_id', (meeting as any)?.organization_id)
      .eq('user_id', body.assignedTo)
      .eq('status', 'active')
      .single();

    if (!assigneeCheck) {
      return NextResponse.json({ 
        error: 'Assignee is not a member of this organization' 
      }, { status: 400 });
    }

    // Create the actionable
    const { data: actionable, error: insertError } = await (supabase as any)
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
        category: (body.category || 'follow_up') as any,
        priority: (body.priority || 'medium') as any,
        estimated_effort_hours: body.estimatedEffortHours,
        due_date: body.dueDate,
        reminder_intervals: body.reminderIntervals || [7, 3, 1],
        depends_on_actionable_ids: body.dependsOnActionableIds || [],
        requires_approval: body.requiresApproval || false,
        deliverable_type: body.deliverableType,
        success_metrics: body.successMetrics,
        stakeholders_to_notify: body.stakeholdersToNotify || [],
        communication_required: body.communicationRequired || false,
        escalation_path: body.escalationPath || [],
        status: 'assigned' as any,
        progress_percentage: 0,
        escalation_level: 1
      } as any)
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