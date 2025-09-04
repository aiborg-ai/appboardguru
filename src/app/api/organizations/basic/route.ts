import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

/**
 * GET /api/organizations/basic
 * Basic endpoint for fetching user's organizations without enhanced middleware
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const id = searchParams.get('id');

  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      console.error('[Organizations Basic] Failed to create Supabase client');
      return NextResponse.json({
        success: false,
        data: { organizations: [] },
        message: 'Database connection error'
      }, { status: 503 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Organizations Basic] Auth error:', authError?.message);
      return NextResponse.json({
        success: false,
        data: { organizations: [] },
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Use provided userId or authenticated user's ID
    const targetUserId = userId || user.id;
    
    console.log('[Organizations Basic] Fetching for user:', user.email, 'Target:', targetUserId);
    
    if (id) {
      // Get single organization
      const { data: orgMember, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          status,
          organizations!inner (
            id,
            name,
            slug,
            description,
            logo_url,
            website,
            industry,
            organization_size,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', targetUserId)
        .eq('organization_id', id)
        .eq('status', 'active')
        .single();

      if (error || !orgMember) {
        console.error('[Organizations Basic] Error fetching single org:', error);
        return NextResponse.json({
          success: false,
          data: null,
          message: 'Organization not found'
        }, { status: 404 });
      }

      const organization = {
        ...orgMember.organizations,
        userRole: orgMember.role,
        membershipStatus: orgMember.status
      };

      return NextResponse.json({
        success: true,
        data: organization,
        message: 'Organization fetched successfully'
      });
    }
    
    // Get all user's organizations
    // Note: is_primary might not exist in all databases yet
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          website,
          industry,
          organization_size,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Organizations Basic] Database error:', error);
      return NextResponse.json({
        success: false,
        data: { organizations: [] },
        message: 'Failed to fetch organizations'
      }, { status: 500 });
    }

    // Transform to include role information
    const organizations = (memberships || []).map((m: any, index: number) => ({
      ...m.organizations,
      userRole: m.role,
      membershipStatus: m.status,
      isPrimary: m.is_primary || (index === 0) // First org is primary if column doesn't exist
    }));

    console.log(`[Organizations Basic] Found ${organizations.length} organizations`);

    return NextResponse.json({
      success: true,
      data: { organizations },
      message: `Found ${organizations.length} organizations`
    });

  } catch (error: any) {
    console.error('[Organizations Basic] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      data: { organizations: [] },
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
}