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

    // Get resolutions for the meeting
    const { data: resolutions, error: resolutionsError } = await (supabase as any)
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
    const formattedResolutions: MeetingResolution[] = (resolutions as any)?.map((resolution: any) => ({
      id: (resolution as any)?.id,
      meetingId: (resolution as any)?.meeting_id,
      agendaItemId: (resolution as any)?.agenda_item_id,
      resolutionNumber: (resolution as any)?.resolution_number,
      title: (resolution as any)?.title || (resolution as any)?.resolution_title,
      description: (resolution as any)?.description,
      resolutionText: (resolution as any)?.resolution_text,
      resolutionType: (resolution as any)?.resolution_type as any || 'other',
      category: (resolution as any)?.category,
      priorityLevel: (resolution as any)?.priority_level || 3,
      proposedBy: (resolution as any)?.proposed_by || (resolution as any)?.moved_by,
      secondedBy: (resolution as any)?.seconded_by,
      status: (resolution as any)?.status as any,
      votingMethod: (resolution as any)?.voting_method as any,
      votesFor: (resolution as any)?.votes_for || 0,
      votesAgainst: (resolution as any)?.votes_against || 0,
      votesAbstain: (resolution as any)?.votes_abstain || 0,
      totalEligibleVoters: (resolution as any)?.total_eligible_voters || 0,
      effectiveDate: (resolution as any)?.effective_date,
      expiryDate: (resolution as any)?.expiry_date,
      implementationDeadline: (resolution as any)?.implementation_deadline,
      implementationNotes: (resolution as any)?.implementation_notes,
      requiresBoardApproval: (resolution as any)?.requires_board_approval || false,
      requiresShareholderApproval: (resolution as any)?.requires_shareholder_approval || false,
      legalReviewRequired: (resolution as any)?.legal_review_required || false,
      complianceImpact: (resolution as any)?.compliance_impact,
      supportingDocuments: (resolution as any)?.supporting_documents || [],
      relatedResolutions: (resolution as any)?.related_resolutions || [],
      supersedesResolutionId: (resolution as any)?.supersedes_resolution_id,
      discussionDurationMinutes: (resolution as any)?.discussion_duration_minutes || 0,
      amendmentsProposed: (resolution as any)?.amendments_proposed || 0,
      wasAmended: (resolution as any)?.was_amended || false,
      proposedAt: (resolution as any)?.proposed_at || (resolution as any)?.created_at,
      votedAt: (resolution as any)?.voted_at,
      effectiveAt: (resolution as any)?.effective_at,
      createdAt: (resolution as any)?.created_at,
      updatedAt: (resolution as any)?.updated_at
    })) || [];

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

    // Create the resolution
    const { data: resolution, error: insertError } = await (supabase as any)
      .from('meeting_resolutions')
      .insert({
        meeting_id: meetingId,
        agenda_item_id: body.agendaItemId,
        resolution_title: body.title,
        resolution_text: body.resolutionText,
        moved_by: user.id,
        seconded_by: body.secondedBy,
        status: 'proposed' as any,
        vote_result: null,
        vote_count: {}
      } as any)
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