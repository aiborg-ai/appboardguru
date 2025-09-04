const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestDocument() {
  try {
    // Get the test user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    if (userError || !users) {
      console.error('User not found:', userError);
      return;
    }

    const userId = users.id;
    console.log('Found user:', userId);

    // Check if test document already exists
    const { data: existing } = await supabase
      .from('assets')
      .select('*')
      .eq('file_name', 'sample-board-report.pdf')
      .eq('owner_id', userId)
      .single();

    if (existing) {
      console.log('Test document already exists:', existing.id);
      return existing;
    }

    // Add a test PDF document to assets table
    // Using only columns that likely exist based on common patterns
    const testDocument = {
      title: 'Q3 2024 Board Report',
      file_name: 'sample-board-report.pdf',
      file_type: 'application/pdf',
      file_size: 1024000, // 1MB
      file_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Sample PDF URL
      owner_id: userId,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newAsset, error: assetError } = await supabase
      .from('assets')
      .insert(testDocument)
      .select()
      .single();

    if (assetError) {
      console.error('Error creating asset:', assetError);
      return;
    }

    console.log('Test document created successfully:', newAsset.id);

    // Also create an entry in vault_assets if needed
    const { data: vaults } = await supabase
      .from('vaults')
      .select('id')
      .limit(1)
      .single();

    if (vaults) {
      const vaultAsset = {
        vault_id: vaults.id,
        asset_id: newAsset.id,
        uploaded_by: userId,
        created_at: new Date().toISOString()
      };

      const { error: vaultError } = await supabase
        .from('vault_assets')
        .insert(vaultAsset);

      if (vaultError) {
        console.log('Note: Could not add to vault (table might not exist):', vaultError.message);
      } else {
        console.log('Added document to vault:', vaults.id);
      }
    }

    return newAsset;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
addTestDocument().then(() => {
  console.log('Script completed');
  process.exit(0);
});