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
    
    // Build query for vaults
    let query = supabase
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
        created_at,
        updated_at,
        vault_members!inner (
          user_id,
          role,
          status
        )
      `)
      .eq('vault_members.user_id', user.id)
      .eq('vault_members.status', 'active');
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    // Order by creation date
    query = query.order('created_at', { ascending: false });
    
    const { data: vaults, error } = await query;
    
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
      
      return {
        id: vault.id,
        name: vault.name,
        description: vault.description,
        meetingDate: vault.meeting_date,
        status: vault.status || 'active',
        priority: vault.priority || 'medium',
        accessLevel: vault.access_level,
        vaultType: vault.vault_type,
        organizationId: vault.organization_id,
        userRole: userMembership?.role || 'member',
        createdAt: vault.created_at,
        updatedAt: vault.updated_at,
        // Add counts (these would be better as aggregated queries)
        memberCount: 1, // Placeholder
        assetCount: 0, // Placeholder
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