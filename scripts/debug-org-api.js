#!/usr/bin/env node

/**
 * Debug script to test organizations API
 * Run with: node scripts/debug-org-api.js
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002'; // Change to your deployed URL if needed
const TEST_EMAIL = 'test.director@appboardguru.com';
const TEST_PASSWORD = 'TestDirector123!';

async function debugOrgApi() {
  console.log('🔍 Debugging Organizations API...\n');

  try {
    // 1. Sign in to get session
    console.log('1. Signing in as test director...');
    const signInResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    const signInData = await signInResponse.json();
    
    if (!signInResponse.ok) {
      console.error('❌ Sign in failed:', signInData);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('   User ID:', signInData.user?.id);
    
    // Get cookies from response
    const cookies = signInResponse.headers.get('set-cookie');
    
    // 2. Fetch organizations
    console.log('\n2. Fetching organizations...');
    const orgsResponse = await fetch(`${BASE_URL}/api/organizations?userId=${signInData.user?.id}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      }
    });

    const orgsData = await orgsResponse.json();
    
    if (!orgsResponse.ok) {
      console.error('❌ Failed to fetch organizations:', orgsData);
      return;
    }

    console.log('✅ Organizations API Response:');
    console.log('   Success:', orgsData.success);
    console.log('   Message:', orgsData.message);
    
    if (orgsData.data?.organizations) {
      console.log(`   Found ${orgsData.data.organizations.length} organization(s):\n`);
      
      orgsData.data.organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name}`);
        console.log(`      ID: ${org.id}`);
        console.log(`      Slug: ${org.slug}`);
        console.log(`      Role: ${org.userRole || org.role}`);
        console.log(`      Status: ${org.membershipStatus || org.status}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No organizations in response');
      console.log('   Full response:', JSON.stringify(orgsData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugOrgApi();