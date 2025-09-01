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
    
    // Build query for vaults - show vaults where user is either:
    // 1. The creator (created_by)
    // 2. A member (in vault_members)
    // 3. In the same organization (for organization-wide vaults)
    
    let vaultsQuery;
    
    if (organizationId) {
      // When organization is specified, get all vaults for that org
      // where user has access (member of org or creator)
      vaultsQuery = supabase
        .from('vaults')
        .select(`
          id,
          name,
          description,
          meeting_date,
          status,
          priority,
          access_level,
          vault_type,
          organization_id,
          created_by,
          is_public,
          metadata,
          created_at,
          updated_at,
          vault_members (
            user_id,
            role,
            status
          )
        `)
        .eq('organization_id', organizationId)
        .or(`created_by.eq.${user.id},is_public.eq.true`);
    } else {
      // Get all vaults user has access to
      vaultsQuery = supabase
        .from('vaults')
        .select(`
          id,
          name,
          description,
          meeting_date,
          status,
          priority,
          access_level,
          vault_type,
          organization_id,
          created_by,
          is_public,
          metadata,
          created_at,
          updated_at,
          vault_members (
            user_id,
            role,
            status
          )
        `)
        .or(`created_by.eq.${user.id}`);
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
    
    // Transform vaults data for the frontend
    const transformedVaults = (vaults || []).map(vault => {
      // Get user's role in the vault
      const userMembership = vault.vault_members?.find(
        (member: any) => member.user_id === user.id
      );
      
      // Determine user's role
      let userRole = 'member';
      if (vault.created_by === user.id) {
        userRole = 'owner';
      } else if (userMembership) {
        userRole = userMembership.role;
      }
      
      return {
        id: vault.id,
        name: vault.name,
        description: vault.description,
        meetingDate: vault.meeting_date,
        status: vault.status || 'active',
        priority: vault.priority || 'medium',
        accessLevel: vault.access_level || vault.metadata?.access_level || 'organization',
        vaultType: vault.vault_type || vault.metadata?.vault_type || 'board_pack',
        organizationId: vault.organization_id,
        userRole,
        isOwner: vault.created_by === user.id,
        isPublic: vault.is_public,
        createdAt: vault.created_at,
        updatedAt: vault.updated_at,
        // Add counts (these would be better as aggregated queries)
        memberCount: (vault.vault_members?.length || 0) + 1, // +1 for creator
        assetCount: 0, // Placeholder - would need separate query
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