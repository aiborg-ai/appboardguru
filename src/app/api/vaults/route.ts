import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

/**
 * GET /api/vaults
 * Simple endpoint to fetch vaults for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      console.error('[Vaults API] Failed to create Supabase client');
      return NextResponse.json({ vaults: [] }, { status: 200 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Vaults API] Auth error:', authError?.message);
      return NextResponse.json({ vaults: [] }, { status: 200 }); // Return empty instead of error
    }
    
    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    
    console.log('[Vaults API] Fetching vaults for user:', user.id, 'org:', organizationId);
    
    // Simple query - just get vaults where user is creator or in the organization
    let query = supabase
      .from('vaults')
      .select('*');
    
    if (organizationId) {
      // Get vaults for specific organization
      query = query.eq('organization_id', organizationId);
    } else {
      // Get all vaults user created
      query = query.eq('created_by', user.id);
    }
    
    const { data: vaults, error } = await query;
    
    if (error) {
      console.error('[Vaults API] Error fetching vaults:', error);
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json({ vaults: [] }, { status: 200 });
    }
    
    console.log('[Vaults API] Found', vaults?.length || 0, 'vaults');
    
    // Simple transformation
    const transformedVaults = (vaults || []).map(vault => ({
      id: vault.id,
      name: vault.name,
      description: vault.description,
      organizationId: vault.organization_id,
      createdBy: vault.created_by,
      createdAt: vault.created_at,
      updatedAt: vault.updated_at,
      isPublic: vault.is_public,
      metadata: vault.metadata,
      status: 'active',
      priority: vault.metadata?.priority || 'medium',
      vaultType: vault.metadata?.vault_type || 'board_pack',
      accessLevel: vault.metadata?.access_level || 'organization'
    }));
    
    return NextResponse.json({ 
      vaults: transformedVaults,
      count: transformedVaults.length 
    });
    
  } catch (error) {
    console.error('[Vaults API] Error:', error);
    // Return empty array to prevent UI crashes
    return NextResponse.json({ vaults: [] }, { status: 200 });
  }
}