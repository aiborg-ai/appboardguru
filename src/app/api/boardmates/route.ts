import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/boardmates
 * Get board mates with their full associations (boards, committees, vaults)
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
    const excludeSelf = searchParams.get('exclude_self') !== 'false'; // Default to true
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to this organization
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

    // Use the boardmate_profiles view for comprehensive user data with associations
    let query = supabaseAdmin
      .from('boardmate_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_status', 'approved')
      .eq('org_status', 'active')
      .order('full_name')
      .range(offset, offset + limit - 1);

    // Exclude current user if requested
    if (excludeSelf) {
      query = query.neq('id', user.id);
    }

    const { data: boardmates, error: boardmatesError } = await query;

    if (boardmatesError) {
      console.error('Error fetching boardmates:', boardmatesError);
      return NextResponse.json({ error: 'Failed to fetch boardmates' }, { status: 500 });
    }

    // Transform the data to match our BoardMateProfile interface
    const transformedBoardmates = boardmates?.map(boardmate => ({
      id: boardmate.id,
      email: boardmate.email,
      full_name: boardmate.full_name,
      avatar_url: boardmate.avatar_url,
      designation: boardmate.designation,
      linkedin_url: boardmate.linkedin_url,
      bio: boardmate.bio,
      company: boardmate.company,
      position: boardmate.position,
      user_status: boardmate.user_status,
      organization_name: boardmate.organization_name,
      organization_logo: boardmate.organization_logo,
      org_role: boardmate.org_role,
      org_status: boardmate.org_status,
      org_joined_at: boardmate.org_joined_at,
      org_last_accessed: boardmate.org_last_accessed,
      board_memberships: Array.isArray(boardmate.board_memberships) ? 
        boardmate.board_memberships.filter((bm: unknown) => bm !== null) : [],
      committee_memberships: Array.isArray(boardmate.committee_memberships) ? 
        boardmate.committee_memberships.filter((cm: unknown) => cm !== null) : [],
      vault_memberships: Array.isArray(boardmate.vault_memberships) ? 
        boardmate.vault_memberships.filter((vm: unknown) => vm !== null) : []
    })) || [];

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('boardmate_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_status', 'approved')
      .eq('org_status', 'active');

    if (excludeSelf) {
      countQuery = countQuery.neq('id', user.id);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      boardmates: transformedBoardmates,
      total: totalCount || 0,
      limit,
      offset,
      organization_id: organizationId,
    });

  } catch (error) {
    console.error('Error in GET /api/boardmates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/boardmates
 * Create a new boardmate and optionally invite them
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
      email, 
      full_name, 
      designation, 
      linkedin_url, 
      bio, 
      company, 
      position 
    } = body;
    
    if (!organization_id || !email || !full_name) {
      return NextResponse.json({ 
        error: 'Organization ID, email, and full name are required' 
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Validate LinkedIn URL if provided
    if (linkedin_url) {
      try {
        const url = new URL(linkedin_url);
        if (!url.hostname.includes('linkedin.com')) {
          return NextResponse.json({ 
            error: 'Must be a valid LinkedIn URL' 
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ 
          error: 'Invalid LinkedIn URL format' 
        }, { status: 400 });
      }
    }

    // Check if user already exists in the system
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    let newUserId: string;

    if (existingUser) {
      // User exists, check if they're already in this organization
      const { data: existingMember } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json({ 
          error: 'User is already a member of this organization' 
        }, { status: 400 });
      }

      // Update existing user with new information if provided
      const existingUserData = existingUser as { designation?: string; linkedin_url?: string; bio?: string; company?: string; position?: string };
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          designation: designation || existingUserData.designation,
          linkedin_url: linkedin_url || existingUserData.linkedin_url,
          bio: bio || existingUserData.bio,
          company: company || existingUserData.company,
          position: position || existingUserData.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Error updating existing user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      newUserId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          full_name,
          designation,
          linkedin_url,
          bio,
          company,
          position,
          status: 'pending',
          role: 'viewer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      newUserId = newUser.id;
    }

    // Add user to organization
    const { error: orgMemberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id,
        user_id: newUserId,
        role: 'member',
        status: 'pending_activation',
        invited_by: user.id,
        joined_at: new Date().toISOString()
      });

    if (orgMemberError) {
      console.error('Error adding user to organization:', orgMemberError);
      return NextResponse.json({ error: 'Failed to add user to organization' }, { status: 500 });
    }

    // Fetch the created boardmate with full profile
    const { data: createdBoardmate } = await supabaseAdmin
      .from('boardmate_profiles')
      .select('*')
      .eq('id', newUserId)
      .eq('organization_id', organization_id)
      .single();

    return NextResponse.json({
      message: 'BoardMate created successfully',
      boardmate: createdBoardmate
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/boardmates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}