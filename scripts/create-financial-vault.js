#!/usr/bin/env node

/**
 * Script to create Financial Reports vault if it doesn't exist
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

async function createFinancialVault() {
  try {
    console.log('Checking for existing vaults...\n');

    // Get test user and organization
    const { data: testDirector } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', 'test-board-org')
      .single();

    if (!testDirector || !organization) {
      throw new Error('Test user or organization not found');
    }

    // Check existing vaults
    const { data: existingVaults } = await supabase
      .from('vaults')
      .select('id, name')
      .eq('organization_id', organization.id);

    console.log('Existing vaults:');
    if (existingVaults && existingVaults.length > 0) {
      existingVaults.forEach(v => console.log(`  - ${v.name}`));
    } else {
      console.log('  (none)');
    }
    console.log('');

    // Check if Financial Reports vault exists
    const financialVault = existingVaults?.find(v => v.name === 'Financial Reports');
    
    if (financialVault) {
      console.log('✅ Financial Reports vault already exists!');
      return financialVault;
    }

    // Create Financial Reports vault
    console.log('Creating Financial Reports vault...');
    
    const { data: newVault, error } = await supabase
      .from('vaults')
      .insert({
        name: 'Financial Reports',
        description: 'Quarterly and annual financial reports for the organization',
        organization_id: organization.id,
        created_by: testDirector.id,
        category: 'audit_committee',  // Using audit_committee as it's closest to financial
        status: 'active',
        priority: 'high',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create vault: ${error.message}`);
    }

    console.log('✅ Financial Reports vault created successfully!');
    console.log(`   ID: ${newVault.id}`);
    console.log(`   Name: ${newVault.name}`);
    
    return newVault;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
createFinancialVault().then(() => {
  console.log('\n✅ Vault setup complete!');
  process.exit(0);
});