import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Failed to create Supabase client',
        vaults: [] 
      }, { status: 200 });
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message,
        vaults: [] 
      }, { status: 200 });
    }
    
    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    
    console.log('[Debug Vaults] User:', user.id, 'Org:', organizationId);
    
    // Test 1: Get ALL vaults without any filters
    const { data: allVaults, error: allError } = await supabase
      .from('vaults')
      .select('*');
      
    console.log('[Debug Vaults] All vaults:', allVaults?.length, 'Error:', allError?.message);
    
    // Test 2: Get vaults for this organization
    let orgVaults = null;
    let orgError = null;
    if (organizationId) {
      const result = await supabase
        .from('vaults')
        .select('*')
        .eq('organization_id', organizationId);
      orgVaults = result.data;
      orgError = result.error;
    }
    
    console.log('[Debug Vaults] Org vaults:', orgVaults?.length, 'Error:', orgError?.message);
    
    // Test 3: Get vaults created by user
    const { data: userVaults, error: userError } = await supabase
      .from('vaults')
      .select('*')
      .eq('created_by', user.id);
      
    console.log('[Debug Vaults] User vaults:', userVaults?.length, 'Error:', userError?.message);
    
    // Test 4: Check if user is in organization_members
    let membership = null;
    if (organizationId) {
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();
      membership = memberData;
      console.log('[Debug Vaults] User membership:', membership, 'Error:', memberError?.message);
    }
    
    return NextResponse.json({
      debug: true,
      user: {
        id: user.id,
        email: user.email
      },
      organizationId,
      membership,
      results: {
        allVaults: {
          count: allVaults?.length || 0,
          data: allVaults || [],
          error: allError?.message
        },
        orgVaults: {
          count: orgVaults?.length || 0,
          data: orgVaults || [],
          error: orgError?.message
        },
        userVaults: {
          count: userVaults?.length || 0,
          data: userVaults || [],
          error: userError?.message
        }
      },
      recommendation: 'Check which query returns vaults and use that approach'
    });
    
  } catch (error) {
    console.error('[Debug Vaults] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      vaults: [] 
    }, { status: 500 });
  }
}