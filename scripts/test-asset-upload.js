#!/usr/bin/env node

/**
 * Test script for asset upload functionality
 * This script helps diagnose issues with file uploads
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_URL = 'http://localhost:3000/api/assets/upload';
const TEST_FILE_PATH = path.join(__dirname, 'test-document.pdf');
const TEST_ORG_ID = 'org-techflow-enterprises'; // Replace with your org ID

// Create a small test PDF file if it doesn't exist
function createTestFile() {
  if (!fs.existsSync(TEST_FILE_PATH)) {
    // Create a minimal PDF file
    const pdfContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, // \n1 0 obj
      0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, // \n<</Type
      0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, // /Catalog
      0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, // >>\nendob
      0x6A, 0x0A, 0x25, 0x25, 0x45, 0x4F, 0x46        // j\n%%EOF
    ]);
    
    fs.writeFileSync(TEST_FILE_PATH, pdfContent);
    console.log('✓ Created test PDF file');
  }
}

// Test upload without authentication (should fail)
async function testUploadWithoutAuth() {
  console.log('\n=== Testing upload without authentication ===');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_FILE_PATH));
  formData.append('title', 'Test Document');
  formData.append('category', 'general');
  formData.append('folderPath', '/test');
  formData.append('organizationId', TEST_ORG_ID);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✓ Correctly rejected: Unauthorized (expected behavior)');
    } else {
      console.log('✗ Unexpected response:', response.status, data);
    }
    
    return data;
  } catch (error) {
    console.error('✗ Error during upload:', error);
    return null;
  }
}

// Test with mock authentication
async function testUploadWithMockAuth(authToken) {
  console.log('\n=== Testing upload with authentication ===');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_FILE_PATH));
  formData.append('title', 'Test Document with Auth');
  formData.append('category', 'general');
  formData.append('folderPath', '/test');
  formData.append('organizationId', TEST_ORG_ID);
  
  try {
    const headers = {
      ...formData.getHeaders()
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 201 || response.status === 200) {
      console.log('✓ Upload successful!');
    } else if (data.code === 'STORAGE_BUCKET_NOT_FOUND') {
      console.log('\n❌ CRITICAL ISSUE FOUND:');
      console.log('The "assets" storage bucket does not exist in Supabase!');
      console.log('\n📋 SOLUTION:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to Storage section');
      console.log('3. Run the SQL script at: database/fix-assets-storage-bucket.sql');
      console.log('4. Or manually create a bucket named "assets"');
    } else if (data.code === 'STORAGE_PERMISSION_DENIED') {
      console.log('\n⚠️ PERMISSION ISSUE:');
      console.log('User does not have permission to upload files.');
      console.log('Check storage policies in Supabase Dashboard.');
    } else {
      console.log('✗ Upload failed:', data.error || data.message);
    }
    
    return data;
  } catch (error) {
    console.error('✗ Error during upload:', error);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('Asset Upload Test Script');
  console.log('========================\n');
  
  // Create test file
  createTestFile();
  
  // Test without auth
  await testUploadWithoutAuth();
  
  // Note: To test with real authentication, you need to:
  // 1. Login through the UI
  // 2. Get the auth token from browser DevTools (Application > Cookies)
  // 3. Pass it to testUploadWithMockAuth()
  
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Check the server logs for detailed error messages');
  console.log('2. If you see "Storage bucket not found", run the fix script');
  console.log('3. Test upload through the UI after fixing the storage bucket');
  
  // Clean up test file
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
    console.log('\n✓ Cleaned up test file');
  }
}

// Run tests
runTests().catch(console.error);