import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CreateResolutionRequest, MeetingResolution } from '@/types/meetings';

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

    // Get resolutions for the meeting
    const { data: resolutions, error: resolutionsError } = await supabase
      .from('meeting_resolutions')
      .select(`
        id,
        meeting_id,
        agenda_item_id,
        resolution_number,
        title,
        description,
        resolution_text,
        resolution_type,
        category,
        priority_level,
        proposed_by,
        seconded_by,
        status,
        voting_method,
        votes_for,
        votes_against,
        votes_abstain,
        total_eligible_voters,
        effective_date,
        expiry_date,
        implementation_deadline,
        implementation_notes,
        requires_board_approval,
        requires_shareholder_approval,
        legal_review_required,
        compliance_impact,
        supporting_documents,
        related_resolutions,
        supersedes_resolution_id,
        discussion_duration_minutes,
        amendments_proposed,
        was_amended,
        proposed_at,
        voted_at,
        effective_at,
        created_at,
        updated_at
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (resolutionsError) {
      console.error('Error fetching resolutions:', resolutionsError);
      return NextResponse.json({ error: 'Failed to fetch resolutions' }, { status: 500 });
    }

    // Transform to match our TypeScript interface
    const formattedResolutions: MeetingResolution[] = resolutions.map(resolution => ({
      id: resolution.id,
      meetingId: resolution.meeting_id,
      agendaItemId: resolution.agenda_item_id,
      resolutionNumber: resolution.resolution_number,
      title: resolution.title,
      description: resolution.description,
      resolutionText: resolution.resolution_text,
      resolutionType: resolution.resolution_type,
      category: resolution.category,
      priorityLevel: resolution.priority_level,
      proposedBy: resolution.proposed_by,
      secondedBy: resolution.seconded_by,
      status: resolution.status,
      votingMethod: resolution.voting_method,
      votesFor: resolution.votes_for,
      votesAgainst: resolution.votes_against,
      votesAbstain: resolution.votes_abstain,
      totalEligibleVoters: resolution.total_eligible_voters,
      effectiveDate: resolution.effective_date,
      expiryDate: resolution.expiry_date,
      implementationDeadline: resolution.implementation_deadline,
      implementationNotes: resolution.implementation_notes,
      requiresBoardApproval: resolution.requires_board_approval,
      requiresShareholderApproval: resolution.requires_shareholder_approval,
      legalReviewRequired: resolution.legal_review_required,
      complianceImpact: resolution.compliance_impact,
      supportingDocuments: resolution.supporting_documents || [],
      relatedResolutions: resolution.related_resolutions || [],
      supersedesResolutionId: resolution.supersedes_resolution_id,
      discussionDurationMinutes: resolution.discussion_duration_minutes,
      amendmentsProposed: resolution.amendments_proposed,
      wasAmended: resolution.was_amended,
      proposedAt: resolution.proposed_at,
      votedAt: resolution.voted_at,
      effectiveAt: resolution.effective_at,
      createdAt: resolution.created_at,
      updatedAt: resolution.updated_at
    }));

    return NextResponse.json({
      resolutions: formattedResolutions,
      total: formattedResolutions.length
    });

  } catch (error) {
    console.error('Error in GET /api/meetings/[id]/resolutions:', error);
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
    const body: CreateResolutionRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.resolutionText) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, resolutionText' 
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create the resolution
    const { data: resolution, error: insertError } = await supabase
      .from('meeting_resolutions')
      .insert({
        meeting_id: meetingId,
        agenda_item_id: body.agendaItemId,
        title: body.title,
        description: body.description,
        resolution_text: body.resolutionText,
        resolution_type: body.resolutionType,
        category: body.category,
        priority_level: body.priorityLevel || 3,
        proposed_by: user.id,
        seconded_by: body.secondedBy,
        effective_date: body.effectiveDate,
        implementation_deadline: body.implementationDeadline,
        requires_board_approval: body.requiresBoardApproval || false,
        requires_shareholder_approval: body.requiresShareholderApproval || false,
        legal_review_required: body.legalReviewRequired || false,
        supporting_documents: body.supportingDocuments || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating resolution:', insertError);
      return NextResponse.json({ error: 'Failed to create resolution' }, { status: 500 });
    }

    return NextResponse.json({ 
      resolution,
      message: 'Resolution created successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/meetings/[id]/resolutions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}