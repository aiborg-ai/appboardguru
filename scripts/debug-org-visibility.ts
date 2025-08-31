import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOrgVisibility() {
  try {
    console.log('🔍 Debugging Organization Visibility Issue\n');
    
    // Get test director user
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    const userId = userData?.id;
    console.log('Test Director User ID:', userId);

    // 1. Check all organizations
    console.log('\n📋 All organizations in database:');
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, is_active, created_at')
      .order('created_at', { ascending: false });

    allOrgs?.forEach(org => {
      console.log(`- ${org.name} (${org.id})`);
      console.log(`  Active: ${org.is_active}, Created: ${org.created_at}`);
    });

    // 2. Check user's organization memberships
    console.log('\n👤 User organization memberships:');
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, status, is_primary, organizations(name)')
      .eq('user_id', userId!);

    memberships?.forEach((m: any) => {
      console.log(`- ${m.organizations.name}: ${m.role} (${m.status})`);
      console.log(`  Primary: ${m.is_primary}, Org ID: ${m.organization_id}`);
    });

    // 3. Check Fortune 500 organization specifically
    console.log('\n🏢 Fortune 500 Companies details:');
    const { data: fortune500 } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'Fortune 500 Companies')
      .single();

    if (fortune500) {
      console.log('Found:', fortune500);
      
      // Check if there are any special fields that might affect visibility
      if (fortune500.deleted_at) {
        console.log('⚠️  Organization is soft-deleted!');
      }
      if (!fortune500.is_active) {
        console.log('⚠️  Organization is not active!');
      }
      
      // Check members
      const { data: members, count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact' })
        .eq('organization_id', fortune500.id);
      
      console.log(`\nMembers count: ${count}`);
      members?.forEach(m => {
        console.log(`- User ${m.user_id}: ${m.role} (${m.status})`);
      });
      
      // Check vaults
      const { data: vaults } = await supabase
        .from('vaults')
        .select('id, name, status')
        .eq('organization_id', fortune500.id);
      
      console.log('\nVaults in this organization:');
      vaults?.forEach(v => {
        console.log(`- ${v.name} (${v.status})`);
      });
      
      // Check assets linked to the vault
      if (vaults && vaults.length > 0) {
        const vaultId = vaults[0].id;
        const { data: vaultAssets, count: assetCount } = await supabase
          .from('vault_assets')
          .select('*', { count: 'exact' })
          .eq('vault_id', vaultId);
        
        console.log(`\nAssets in "${vaults[0].name}": ${assetCount}`);
      }
    } else {
      console.log('❌ Fortune 500 Companies organization not found!');
    }

    // 4. Try the query as it might be done in the UI
    console.log('\n🔄 Simulating UI query for user organizations:');
    const { data: uiQuery } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          user_id,
          role,
          status
        )
      `)
      .eq('organization_members.user_id', userId!)
      .eq('organization_members.status', 'active')
      .eq('is_active', true);

    console.log('Organizations visible to UI query:');
    uiQuery?.forEach(org => {
      console.log(`- ${org.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugOrgVisibility();