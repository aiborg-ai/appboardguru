import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Try to use the boardmate_profiles view first, fallback to simpler query if it doesn't exist
    let boardmates: any[] = [];
    let usedMockData = false;
    
    try {
      // First, try to use the view
      let query = supabase
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

      const { data, error } = await query;
      
      if (error) {
        // If view doesn't exist, try simpler query
        if (error.message.includes('boardmate_profiles') || error.code === '42P01') {
          console.log('boardmate_profiles view not found, using fallback query');
          
          // Fallback to simpler query joining users and organization_members
          const fallbackQuery = supabase
            .from('organization_members')
            .select(`
              user_id,
              role,
              status,
              joined_at,
              last_accessed,
              users!inner (
                id,
                email,
                full_name,
                avatar_url,
                status,
                company,
                position,
                designation,
                linkedin_url,
                bio
              ),
              organizations (
                id,
                name,
                logo_url
              )
            `)
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('users(full_name)')
            .range(offset, offset + limit - 1);
          
          if (excludeSelf) {
            fallbackQuery.neq('user_id', user.id);
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          // Transform fallback data to match expected format
          boardmates = (fallbackData || []).map((member: any) => ({
            id: member.users?.id || member.user_id,
            email: member.users?.email || '',
            full_name: member.users?.full_name || 'Unknown',
            avatar_url: member.users?.avatar_url,
            designation: member.users?.designation || 'Member',
            linkedin_url: member.users?.linkedin_url,
            bio: member.users?.bio,
            company: member.users?.company,
            position: member.users?.position,
            user_status: member.users?.status || 'approved',
            organization_id: organizationId,
            organization_name: member.organizations?.name || 'Organization',
            organization_logo: member.organizations?.logo_url,
            org_role: member.role || 'member',
            org_status: member.status || 'active',
            org_joined_at: member.joined_at,
            org_last_accessed: member.last_accessed,
            board_memberships: [],
            committee_memberships: [],
            vault_memberships: []
          }));
        } else {
          throw error;
        }
      } else {
        boardmates = data || [];
      }
    } catch (err) {
      console.error('Error fetching boardmates, returning mock data:', err);
      
      // Return mock data as ultimate fallback
      usedMockData = true;
      boardmates = getMockBoardmates(organizationId);
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
    let totalCount = boardmates.length;
    
    if (!usedMockData) {
      try {
        // Try to get accurate count from database
        const countQuery = supabase
          .from('organization_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active');
        
        if (excludeSelf) {
          countQuery.neq('user_id', user.id);
        }
        
        const { count } = await countQuery;
        if (count !== null) {
          totalCount = count;
        }
      } catch (err) {
        console.log('Could not get accurate count:', err);
      }
    }

    return NextResponse.json({
      boardmates: transformedBoardmates,
      total: totalCount || 0,
      limit,
      offset,
      organization_id: organizationId,
      is_mock_data: usedMockData,
      message: usedMockData ? 'Using demo data. Database view not configured.' : undefined
    });

  } catch (error) {
    console.error('Error in GET /api/boardmates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Mock data generator for fallback
function getMockBoardmates(organizationId: string) {
  return [
    {
      id: 'mock-1',
      email: 'sarah.johnson@techcorp.com',
      full_name: 'Sarah Johnson',
      avatar_url: undefined,
      designation: 'Chief Executive Officer',
      linkedin_url: 'https://linkedin.com/in/sarahjohnson',
      bio: 'Seasoned executive with 20+ years of experience in technology and business transformation.',
      company: 'TechCorp Industries',
      position: 'CEO',
      user_status: 'approved',
      organization_id: organizationId,
      organization_name: 'Demo Organization',
      organization_logo: undefined,
      org_role: 'admin',
      org_status: 'active',
      org_joined_at: '2023-01-15',
      org_last_accessed: '2024-01-15',
      board_memberships: [
        {
          board_id: 'board-1',
          board_name: 'Main Board',
          board_type: 'main_board',
          board_status: 'active',
          member_role: 'chairman',
          member_status: 'active',
          appointed_date: '2023-01-15',
          term_start_date: '2023-01-15',
          term_end_date: '2025-01-15',
          is_voting_member: true,
          attendance_rate: 95
        }
      ],
      committee_memberships: [],
      vault_memberships: []
    },
    {
      id: 'mock-2',
      email: 'michael.chen@financeplus.com',
      full_name: 'Michael Chen',
      avatar_url: undefined,
      designation: 'Chief Financial Officer',
      linkedin_url: 'https://linkedin.com/in/michaelchen',
      bio: 'CPA with extensive experience in financial management and risk assessment.',
      company: 'FinancePlus Holdings',
      position: 'CFO',
      user_status: 'approved',
      organization_id: organizationId,
      organization_name: 'Demo Organization',
      organization_logo: undefined,
      org_role: 'member',
      org_status: 'active',
      org_joined_at: '2023-02-01',
      org_last_accessed: '2024-01-15',
      board_memberships: [
        {
          board_id: 'board-1',
          board_name: 'Main Board',
          board_type: 'main_board',
          board_status: 'active',
          member_role: 'cfo',
          member_status: 'active',
          appointed_date: '2023-02-01',
          term_start_date: '2023-02-01',
          term_end_date: '2025-02-01',
          is_voting_member: true,
          attendance_rate: 98
        }
      ],
      committee_memberships: [],
      vault_memberships: []
    },
    {
      id: 'mock-3',
      email: 'emily.rodriguez@legaladvisors.com',
      full_name: 'Emily Rodriguez',
      avatar_url: undefined,
      designation: 'General Counsel',
      linkedin_url: 'https://linkedin.com/in/emilyrodriguez',
      bio: 'Corporate attorney specializing in governance, compliance, and regulatory matters.',
      company: 'Legal Advisors LLP',
      position: 'General Counsel',
      user_status: 'approved',
      organization_id: organizationId,
      organization_name: 'Demo Organization',
      organization_logo: undefined,
      org_role: 'member',
      org_status: 'active',
      org_joined_at: '2023-03-01',
      org_last_accessed: '2024-01-14',
      board_memberships: [],
      committee_memberships: [],
      vault_memberships: []
    }
  ];
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
    const { data: orgMember, error: orgError } = await supabase
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