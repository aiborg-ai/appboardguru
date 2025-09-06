#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testDirectUpload() {
  console.log('🔍 Testing Direct Database Insert\n');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // 1. Login as test user
  console.log('1️⃣ Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  });
  
  if (authError) {
    console.error('❌ Login failed:', authError);
    return;
  }
  
  console.log('✅ Logged in as:', authData.user.email);
  console.log('User ID:', authData.user.id);
  
  // 2. Try to insert an asset record directly
  console.log('\n2️⃣ Attempting direct database insert...');
  
  const { randomUUID } = require('crypto');
  
  const assetData = {
    id: randomUUID(),
    title: 'Test Document',
    file_name: 'test.txt',
    file_path: `users/${authData.user.id}/assets/test_${Date.now()}.txt`,
    file_size: 100,
    file_type: 'txt',
    mime_type: 'text/plain',
    user_id: authData.user.id,
    owner_id: authData.user.id,
    uploaded_by: authData.user.id,
    status: 'ready',
    visibility: 'private',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('Asset data:', assetData);
  
  const { data, error } = await supabase
    .from('assets')
    .insert(assetData)
    .select()
    .single();
  
  if (error) {
    console.error('\n❌ Insert failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    if (error.message.includes('violates row-level security')) {
      console.log('\n⚠️ RLS Policy Issue!');
      console.log('The Row-Level Security policies are still blocking inserts.');
      console.log('Even with user_id, owner_id, and uploaded_by all set to the authenticated user.');
    }
  } else {
    console.log('\n✅ Insert successful!');
    console.log('Created asset:', data);
  }
  
  // 3. Try to read assets
  console.log('\n3️⃣ Testing asset read...');
  const { data: assets, error: readError } = await supabase
    .from('assets')
    .select('id, title, created_at')
    .eq('owner_id', authData.user.id)
    .limit(5);
  
  if (readError) {
    console.error('❌ Read failed:', readError);
  } else {
    console.log('✅ Found', assets?.length || 0, 'assets');
    assets?.forEach(a => console.log(`  - ${a.title} (${a.id})`));
  }
}

testDirectUpload().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});