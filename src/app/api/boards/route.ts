import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/boards
 * Get all boards for the current organization
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
    const status = searchParams.get('status') || 'active';

    if (!organizationId) {
      // Get all organizations the user has access to
      const { data: userMemberships } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const orgIds = userMemberships?.map((m: any) => m?.organization_id) || [];
      
      if (orgIds.length === 0) {
        return NextResponse.json({ boards: [], total: 0 });
      }

      const { data: boards, error } = await supabaseAdmin
        .from('boards')
        .select(`
          *,
          organizations!inner (
            id,
            name,
            logo_url
          )
        `)
        .in('organization_id', orgIds)
        .eq('status', status)
        .order('name');

      if (error) {
        console.error('Error fetching boards:', error);
        return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
      }

      return NextResponse.json({
        boards: boards || [],
        total: boards?.length || 0
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

    // Get boards for the specific organization
    const { data: boards, error } = await supabaseAdmin
      .from('boards')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          logo_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('name');

    if (error) {
      console.error('Error fetching boards:', error);
      return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
    }

    return NextResponse.json({
      boards: boards || [],
      total: boards?.length || 0,
      organization_id: organizationId
    });

  } catch (error) {
    console.error('Error in GET /api/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/boards
 * Create a new board
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
      name,
      description,
      board_type = 'main_board',
      parent_board_id,
      established_date,
      meeting_frequency,
      meeting_location,
      settings
    } = body;

    if (!organization_id || !name) {
      return NextResponse.json({
        error: 'Organization ID and board name are required'
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

    // Create the board
    const { data: newBoard, error: createError } = await supabaseAdmin
      .from('boards')
      .insert({
        organization_id,
        name,
        description,
        board_type,
        parent_board_id,
        established_date,
        meeting_frequency,
        meeting_location,
        settings: settings || {},
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !newBoard) {
      console.error('Error creating board:', createError);
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Board created successfully',
      board: newBoard
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}