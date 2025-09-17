#!/usr/bin/env node

/**
 * Test script for document upload functionality
 * Tests the upload API with a sample file
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testUpload() {
  console.log('🧪 Testing document upload functionality...\n');

  // Create a test file
  const testContent = 'This is a test document for upload verification.';
  const testFileName = 'test-document.txt';
  const testFilePath = path.join('/tmp', testFileName);
  
  fs.writeFileSync(testFilePath, testContent);
  console.log('✅ Created test file:', testFilePath);

  // Prepare form data
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: testFileName,
    contentType: 'text/plain'
  });
  form.append('title', 'Test Document');
  form.append('description', 'Testing upload functionality');
  form.append('category', 'document');
  form.append('folderPath', '/');
  form.append('tags', 'test,upload');

  // Get auth token (you'll need to provide this)
  const authToken = process.env.SUPABASE_AUTH_TOKEN;
  
  if (!authToken) {
    console.log('\n⚠️  To test with authentication, set SUPABASE_AUTH_TOKEN environment variable');
    console.log('You can get this from browser dev tools > Application > Cookies > sb-access-token');
    console.log('\nTesting without authentication...\n');
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const headers = {
      ...form.getHeaders()
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch('http://localhost:3002/api/assets/upload', {
      method: 'POST',
      headers,
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Upload successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.data?.asset || result.asset) {
        const asset = result.data?.asset || result.asset;
        console.log('\n📄 Asset details:');
        console.log('- ID:', asset.id);
        console.log('- Title:', asset.title);
        console.log('- File name:', asset.fileName);
        console.log('- Upload URL:', asset.uploadUrl);
      }
    } else {
      console.log('\n❌ Upload failed!');
      console.log('Status:', response.status);
      console.log('Error:', result.error || result.message);
      
      if (result.details) {
        console.log('Details:', result.details);
      }
      
      if (response.status === 401) {
        console.log('\n💡 Tip: You need to be authenticated. Please log in to the app and try again.');
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.log('\n💡 Make sure the development server is running on port 3002');
  } finally {
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test file');
  }
}

// Run the test
testUpload().catch(console.error);