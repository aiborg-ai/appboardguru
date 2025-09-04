import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/organizations/basic
 * Simple endpoint for fetching user's organizations
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const id = searchParams.get('id');

  try {
    // Create Supabase client with proper auth handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Organizations Basic] Missing environment variables');
      return NextResponse.json({
        success: false,
        data: { organizations: [] },
        message: 'Configuration error'
      }, { status: 503 });
    }

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          const cookie = allCookies.find(c => c.name === name);
          return cookie?.value;
        },
        set() {},
        remove() {}
      }
    });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Organizations Basic] Auth error:', authError?.message);
      // Return empty organizations instead of error for better UX
      return NextResponse.json({
        success: true,
        data: { organizations: [] },
        message: 'No authenticated user'
      });
    }

    // Use provided userId or authenticated user's ID
    const targetUserId = userId || user.id;
    
    console.log('[Organizations Basic] Fetching for user:', user.email, 'Target:', targetUserId);
    
    if (id) {
      // Get single organization - simplified query
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !org) {
        console.error('[Organizations Basic] Error fetching single org:', error);
        return NextResponse.json({
          success: false,
          data: null,
          message: 'Organization not found'
        }, { status: 404 });
      }

      // Get user's role separately
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role, status')
        .eq('user_id', targetUserId)
        .eq('organization_id', id)
        .single();

      const organization = {
        ...org,
        userRole: membership?.role || 'member',
        membershipStatus: membership?.status || 'active'
      };

      return NextResponse.json({
        success: true,
        data: organization,
        message: 'Organization fetched successfully'
      });
    }
    
    // Get all user's organizations - simplified approach
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', targetUserId)
      .eq('status', 'active');

    if (memberError) {
      console.error('[Organizations Basic] Member fetch error:', memberError);
      // Return empty array on error for better UX
      return NextResponse.json({
        success: true,
        data: { organizations: [] },
        message: 'No organizations found'
      });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        success: true,
        data: { organizations: [] },
        message: 'No organizations found'
      });
    }

    // Get organization details separately
    const orgIds = memberships.map(m => m.organization_id);
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    if (orgError) {
      console.error('[Organizations Basic] Org fetch error:', orgError);
      return NextResponse.json({
        success: true,
        data: { organizations: [] },
        message: 'Failed to fetch organization details'
      });
    }

    // Combine data
    const organizations = (orgs || []).map((org: any, index: number) => {
      const membership = memberships.find(m => m.organization_id === org.id);
      return {
        ...org,
        userRole: membership?.role || 'member',
        membershipStatus: membership?.status || 'active',
        isPrimary: index === 0 // First org is primary
      };
    });

    console.log(`[Organizations Basic] Found ${organizations.length} organizations`);

    return NextResponse.json({
      success: true,
      data: { organizations },
      message: `Found ${organizations.length} organizations`
    });

  } catch (error: any) {
    console.error('[Organizations Basic] Unexpected error:', error);
    // Return empty array on error for better UX
    return NextResponse.json({
      success: true,
      data: { organizations: [] },
      message: 'Unable to fetch organizations'
    });
  }
}