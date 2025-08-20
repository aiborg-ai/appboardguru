import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * GET /api/boardmates
 * Get board mates (users that the current user can collaborate with)
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

    // Get user's organization memberships to find potential board mates
    const { data: userMemberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const userOrgIds = userMemberships?.map(m => m.organization_id) || [];

    if (userOrgIds.length === 0) {
      return NextResponse.json({
        boardmates: [],
        total: 0,
        limit,
        offset,
      });
    }

    // Build query for board mates
    let query = supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        status,
        joined_at,
        organization_id,
        users!inner (
          id,
          email,
          full_name,
          avatar_url,
          status,
          created_at
        ),
        organizations!inner (
          id,
          name,
          slug
        )
      `)
      .eq('status', 'active')
      .in('organization_id', userOrgIds)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by specific organization if requested
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Exclude current user if requested
    if (excludeSelf) {
      query = query.neq('user_id', user.id);
    }

    const { data: membershipData, error: membersError } = await query;

    if (membersError) {
      console.error('Error fetching board mates:', membersError);
      return NextResponse.json({ error: 'Failed to fetch board mates' }, { status: 500 });
    }

    // Transform the data to match expected format
    const boardmates = membershipData?.map(membership => ({
      id: (membership.users as any).id,
      email: (membership.users as any).email,
      full_name: (membership.users as any).full_name,
      avatar_url: (membership.users as any).avatar_url,
      role: membership.role,
      status: (membership.users as any).status,
      organization: {
        id: (membership.organizations as any).id,
        name: (membership.organizations as any).name,
      },
      joined_at: membership.joined_at,
      last_active: (membership.users as any).created_at, // Placeholder - you might want to track actual last activity
    })) || [];

    // Remove duplicates (users who are in multiple shared organizations)
    const uniqueBoardmates = boardmates.reduce((acc, current) => {
      const existing = acc.find(item => item.id === current.id);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof boardmates);

    // Get total count for pagination
    let countQuery = supabase
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('organization_id', userOrgIds);

    if (organizationId) {
      countQuery = countQuery.eq('organization_id', organizationId);
    }

    if (excludeSelf) {
      countQuery = countQuery.neq('user_id', user.id);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      boardmates: uniqueBoardmates,
      total: totalCount || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error in GET /api/boardmates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}