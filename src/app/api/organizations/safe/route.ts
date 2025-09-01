import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

/**
 * GET /api/organizations/safe
 * Safe fallback endpoint for fetching user's organizations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      console.error('[Organizations Safe] Failed to create Supabase client');
      // Return empty array instead of error to prevent app from breaking
      return NextResponse.json([], { status: 200 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Organizations Safe] Auth error:', authError?.message);
      // Return empty array for unauthenticated users
      return NextResponse.json([], { status: 200 });
    }
    
    console.log('[Organizations Safe] Fetching organizations for user:', user.email);
    
    // Get user's organizations
    const { data: organizations, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        is_primary,
        organizations!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          website,
          industry,
          organization_size,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (error) {
      console.error('[Organizations Safe] Error fetching organizations:', error);
      // Return empty array on error instead of failing
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'X-Error': error.message
        }
      });
    }
    
    // Transform the data to the expected format
    const formattedOrganizations = (organizations || [])
      .filter(item => item?.organizations)
      .map(item => {
        const org = item.organizations;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logo_url: org.logo_url,
          website: org.website,
          industry: org.industry,
          organization_size: org.organization_size,
          is_active: org.is_active,
          userRole: item.role,
          membershipStatus: item.status,
          isPrimary: item.is_primary
        };
      });
    
    console.log('[Organizations Safe] Found', formattedOrganizations.length, 'organizations');
    
    return NextResponse.json(formattedOrganizations);
    
  } catch (error) {
    console.error('[Organizations Safe] API error:', error);
    // Return empty array on any error
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'X-Error': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}