import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/committees
 * Get all committees for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const boardId = searchParams.get('board_id');
    const status = searchParams.get('status') || 'active';

    if (!organizationId) {
      // Get all organizations the user has access to
      const { data: userMemberships } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const orgIds = userMemberships?.map((m: any) => m.organization_id) || [];
      
      if (orgIds.length === 0) {
        return NextResponse.json({ committees: [], total: 0 });
      }

      let query = (supabaseAdmin as any)
        .from('committees')
        .select(`
          *,
          boards!inner (
            id,
            name,
            board_type
          ),
          organizations!inner (
            id,
            name,
            logo_url
          )
        `)
        .in('organization_id', orgIds)
        .eq('status', status)
        .order('name');

      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      const { data: committees, error } = await query;

      if (error) {
        console.error('Error fetching committees:', error);
        return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 });
      }

      // Transform the data to include board name
      const transformedCommittees = (committees as any[])?.map((committee: any) => ({
        ...committee,
        board_name: (committee.boards as any)?.name
      })) || [];

      return NextResponse.json({
        committees: transformedCommittees,
        total: transformedCommittees.length
      });
    }

    // Verify user has access to this specific organization
    const { data: orgMember, error: orgError } = await (supabase as any)
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Get committees for the specific organization
    let query = (supabaseAdmin as any)
      .from('committees')
      .select(`
        *,
        boards!inner (
          id,
          name,
          board_type
        ),
        organizations!inner (
          id,
          name,
          logo_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('name');

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data: committees, error } = await query;

    if (error) {
      console.error('Error fetching committees:', error);
      return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 });
    }

    // Transform the data to include board name
    const transformedCommittees = (committees as any[])?.map((committee: any) => ({
      ...committee,
      board_name: (committee.boards as any)?.name
    })) || [];

    return NextResponse.json({
      committees: transformedCommittees,
      total: transformedCommittees.length,
      organization_id: organizationId,
      board_id: boardId
    });

  } catch (error) {
    console.error('Error in GET /api/committees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/committees
 * Create a new committee
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      board_id,
      name,
      description,
      committee_type = 'other',
      established_date,
      is_permanent = true,
      charter_document_url,
      responsibilities = [],
      authority_level,
      meeting_frequency,
      meeting_location,
      settings
    } = body;

    if (!organization_id || !board_id || !name) {
      return NextResponse.json({
        error: 'Organization ID, board ID, and committee name are required'
      }, { status: 400 });
    }

    // Verify user has admin access to this organization
    const { data: orgMember, error: orgError } = await (supabase as any)
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({
        error: 'Access denied - admin role required'
      }, { status: 403 });
    }

    // Verify the board exists and belongs to this organization
    const { data: board, error: boardError } = await (supabaseAdmin as any)
      .from('boards')
      .select('id, name')
      .eq('id', board_id)
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single();

    if (boardError || !board) {
      return NextResponse.json({
        error: 'Board not found or does not belong to this organization'
      }, { status: 400 });
    }

    // Create the committee
    const { data: newCommittee, error: createError } = await (supabaseAdmin as any)
      .from('committees')
      .insert({
        organization_id,
        board_id,
        name,
        description,
        committee_type,
        established_date,
        is_permanent,
        charter_document_url,
        responsibilities,
        authority_level,
        meeting_frequency,
        meeting_location,
        settings: settings || {},
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (createError || !newCommittee) {
      console.error('Error creating committee:', createError);
      return NextResponse.json({ error: 'Failed to create committee' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Committee created successfully',
      committee: {
        ...newCommittee,
        board_name: (board as any)?.name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/committees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}