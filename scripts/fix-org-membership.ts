import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrgMembership() {
  try {
    // Get test director user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    if (userError || !userData) {
      console.error('Error finding test director:', userError);
      return;
    }

    const userId = userData.id;
    console.log('Test Director User ID:', userId);

    // Get Fortune 500 organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Fortune 500 Companies')
      .single();

    if (orgError || !orgData) {
      console.error('Error finding Fortune 500 organization:', orgError);
      console.log('\nChecking all organizations with "Fortune" in name...');
      
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', '%fortune%');
      
      console.log('Organizations with "Fortune":', allOrgs);
      return;
    }

    const organizationId = orgData.id;
    console.log('Fortune 500 Companies Organization ID:', organizationId);

    // Check current membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (membershipError) {
      if (membershipError.code === 'PGRST116') {
        console.log('\n❌ User is NOT a member of Fortune 500 Companies organization');
        
        // Add the user as a member
        console.log('Adding user to organization...');
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            user_id: userId,
            role: 'owner',
            status: 'active',
            is_primary: false,
            receive_notifications: true
          });

        if (insertError) {
          console.error('Error adding user to organization:', insertError);
        } else {
          console.log('✅ Successfully added user to Fortune 500 Companies organization!');
        }
      } else {
        console.error('Error checking membership:', membershipError);
      }
    } else {
      console.log('\n✅ User IS already a member of Fortune 500 Companies');
      console.log('Membership details:', membershipData);
      
      // Update to ensure active status
      if (membershipData.status !== 'active' || membershipData.role !== 'owner') {
        const { error: updateError } = await supabase
          .from('organization_members')
          .update({
            status: 'active',
            role: 'owner'
          })
          .eq('id', membershipData.id);

        if (updateError) {
          console.error('Error updating membership:', updateError);
        } else {
          console.log('✅ Updated membership to active owner status');
        }
      }
    }

    // Verify all organizations for this user
    console.log('\n📋 All organizations for test director:');
    const { data: allMemberships } = await supabase
      .from('organization_members')
      .select(`
        role,
        status,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (allMemberships) {
      allMemberships.forEach((m: any) => {
        console.log(`- ${m.organizations.name}: ${m.role} (${m.status})`);
      });
    }

    // Check vaults in Fortune 500 organization
    console.log('\n📦 Vaults in Fortune 500 Companies:');
    const { data: vaults } = await supabase
      .from('vaults')
      .select('id, name, status')
      .eq('organization_id', organizationId);

    if (vaults && vaults.length > 0) {
      vaults.forEach(v => {
        console.log(`- ${v.name} (${v.status})`);
      });
    } else {
      console.log('No vaults found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixOrgMembership();