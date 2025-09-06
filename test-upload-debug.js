#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  console.log('🔍 Testing Upload Functionality\n');
  
  // Step 1: Login
  console.log('1️⃣ Logging in...');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    const text = await loginResponse.text();
    console.error('Response:', text);
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✅ Login successful');
  console.log('Cookies:', cookies ? 'Present' : 'Missing');
  
  // Step 2: Create test file
  console.log('\n2️⃣ Creating test file...');
  const testFilePath = '/tmp/test-document.txt';
  fs.writeFileSync(testFilePath, 'This is a test document for upload testing.');
  console.log('✅ Test file created');
  
  // Step 3: Attempt upload
  console.log('\n3️⃣ Attempting upload...');
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-document.txt',
    contentType: 'text/plain'
  });
  form.append('title', 'Test Document');
  form.append('category', 'document');
  
  const uploadResponse = await fetch('http://localhost:3000/api/assets/upload', {
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      'Cookie': cookies || ''
    },
    body: form
  });
  
  console.log('Upload response status:', uploadResponse.status);
  
  const uploadResult = await uploadResponse.text();
  console.log('\n📋 Upload Response:');
  
  try {
    const json = JSON.parse(uploadResult);
    console.log(JSON.stringify(json, null, 2));
    
    if (json.success) {
      console.log('\n✅ Upload successful!');
      console.log('Asset ID:', json.data?.asset?.id);
    } else {
      console.log('\n❌ Upload failed!');
      console.log('Error:', json.error);
      
      // Check for specific error patterns
      if (json.error?.includes('RLS') || json.error?.includes('row-level')) {
        console.log('\n⚠️ RLS Policy Issue Detected!');
        console.log('The Row-Level Security policies are still blocking uploads.');
      }
      if (json.error?.includes('storage') || json.error?.includes('bucket')) {
        console.log('\n⚠️ Storage Issue Detected!');
        console.log('There may be an issue with Supabase storage configuration.');
      }
    }
  } catch (e) {
    console.log('Raw response:', uploadResult);
  }
  
  // Cleanup
  fs.unlinkSync(testFilePath);
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  const { execSync } = require('child_process');
  try {
    execSync('npm list node-fetch', { stdio: 'ignore' });
  } catch {
    execSync('npm install node-fetch@2 form-data', { stdio: 'inherit' });
  }
}

testUpload().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});