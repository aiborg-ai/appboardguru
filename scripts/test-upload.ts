#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testUpload() {
  try {
    console.log('🧪 Testing file upload for test director\n');
    
    // Create a simple test file
    const testContent = 'This is a test document for upload verification.';
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    await fs.writeFile(testFilePath, testContent);
    
    // Create FormData for upload
    const formData = new FormData();
    const file = new File([testContent], 'test-upload.txt', { type: 'text/plain' });
    
    formData.append('file', file);
    formData.append('title', 'Test Upload Document');
    formData.append('description', 'Testing upload functionality');
    formData.append('category', 'test');
    formData.append('folderPath', '/test');
    formData.append('organizationId', '01490829-abab-4469-8137-c37b5da52b87'); // Fortune 500 Companies
    
    // Simulate upload to API
    console.log('📤 Sending upload request...');
    
    // First, we need to authenticate as test director
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    });
    
    if (authError || !authData.session) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authenticated as test director');
    console.log('Session token:', authData.session.access_token.substring(0, 20) + '...');
    
    // Now test the upload endpoint
    const response = await fetch('http://localhost:3000/api/assets/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Cookie': `sb-auth-token=${authData.session.access_token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Upload successful!');
      console.log('Asset ID:', result.asset.id);
      console.log('File name:', result.asset.fileName);
    } else {
      console.error('❌ Upload failed:', result);
      if (result.validationErrors) {
        console.error('Validation errors:', result.validationErrors);
      }
    }
    
    // Clean up test file
    await fs.unlink(testFilePath).catch(() => {});
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testUpload();