import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

/**
 * GET /api/vaults/list
 * Fetch vaults for the authenticated user, optionally filtered by organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      console.error('[Vaults List] Failed to create Supabase client');
      return NextResponse.json({ vaults: [] }, { status: 200 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Vaults List] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    
    console.log('[Vaults List] Fetching vaults for user:', user.email, 'org:', organizationId);
    
    // Simplified query - just get vaults for the organization
    // Don't use complex joins that might fail
    
    let vaultsQuery = supabase
      .from('vaults')
      .select('*');
    
    if (organizationId) {
      // Get all vaults for this organization
      console.log('[Vaults List] Filtering by organization:', organizationId);
      vaultsQuery = vaultsQuery.eq('organization_id', organizationId);
    } else {
      // Get vaults created by the user
      console.log('[Vaults List] Getting vaults created by user:', user.id);
      vaultsQuery = vaultsQuery.eq('created_by', user.id);
    }
    
    // Order by creation date
    vaultsQuery = vaultsQuery.order('created_at', { ascending: false });
    
    const { data: vaults, error } = await vaultsQuery;
    
    if (error) {
      console.error('[Vaults List] Error fetching vaults:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch vaults',
        details: error.message 
      }, { status: 500 });
    }
    
    // Transform vaults data for the frontend - simplified without joins
    const transformedVaults = (vaults || []).map(vault => {
      // Determine user's role based on creator
      const userRole = vault.created_by === user.id ? 'owner' : 'member';
      
      // Extract metadata if it exists
      const metadata = vault.metadata || {};
      
      return {
        id: vault.id,
        name: vault.name,
        description: vault.description,
        meetingDate: vault.meeting_date,
        status: vault.status || 'active',
        priority: metadata.priority || vault.priority || 'medium',
        accessLevel: metadata.access_level || vault.access_level || 'organization',
        vaultType: metadata.vault_type || vault.vault_type || 'board_pack',
        organizationId: vault.organization_id,
        userRole,
        isOwner: vault.created_by === user.id,
        isPublic: vault.is_public,
        createdAt: vault.created_at,
        updatedAt: vault.updated_at,
        // Placeholder counts - would need separate queries
        memberCount: 1,
        assetCount: 0,
        lastActivityAt: vault.updated_at
      };
    });
    
    console.log('[Vaults List] Found', transformedVaults.length, 'vaults');
    
    return NextResponse.json({ 
      vaults: transformedVaults,
      total: transformedVaults.length 
    });
    
  } catch (error) {
    console.error('[Vaults List] API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch vaults',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}