#!/usr/bin/env node

/**
 * Script to list all organizations in the database
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function listOrganizations() {
  try {
    console.log('📋 Listing all organizations in the database...\n');

    // Get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        created_at,
        organization_members!inner(
          user_id,
          role,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }

    if (!organizations || organizations.length === 0) {
      console.log('No organizations found in the database.');
      return;
    }

    console.log(`Found ${organizations.length} organization(s):\n`);
    console.log('=' .repeat(80));

    organizations.forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Slug: ${org.slug}`);
      console.log(`   Members: ${org.organization_members?.length || 0}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleDateString()}`);
      
      // Show member roles
      if (org.organization_members && org.organization_members.length > 0) {
        const roleCount = {};
        org.organization_members.forEach(member => {
          roleCount[member.role] = (roleCount[member.role] || 0) + 1;
        });
        console.log(`   Roles: ${Object.entries(roleCount).map(([role, count]) => `${role} (${count})`).join(', ')}`);
      }
    });

    // Also check for any vaults
    console.log('\n' + '=' .repeat(80));
    console.log('\n📁 Checking vaults across all organizations...\n');

    const { data: vaults } = await supabase
      .from('vaults')
      .select(`
        id,
        name,
        organization_id,
        organizations!inner(name, slug)
      `)
      .order('created_at', { ascending: false });

    if (vaults && vaults.length > 0) {
      console.log(`Found ${vaults.length} vault(s):`);
      vaults.forEach(vault => {
        console.log(`  - ${vault.name} (Organization: ${vault.organizations?.name || 'Unknown'})`);
      });
    } else {
      console.log('No vaults found.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listOrganizations().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});