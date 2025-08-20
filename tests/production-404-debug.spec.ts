import { test, expect } from '@playwright/test';

// Simple test to debug the 404 issue without running local server
test.describe('Production 404 Debug', () => {
  test('should test production approval endpoint directly', async ({ request }) => {
    const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
    
    console.log('🔍 Testing production approval endpoint...');
    
    try {
      const response = await request.get(
        `${PRODUCTION_URL}/api/approve-registration`, 
        { 
          maxRedirects: 0,
          timeout: 15000
        }
      );
      
      console.log(`📊 Status Code: ${response.status()}`);
      console.log(`📋 Headers:`, JSON.stringify(response.headers(), null, 2));
      
      if (response.status() === 404) {
        const body = await response.text();
        console.log('🚨 404 Response Body:', body.substring(0, 1000));
        console.log('❌ API route does not exist in production deployment');
      } else if (response.status() === 302) {
        console.log(`✅ API route exists - redirecting to: ${response.headers()['location']}`);
      } else {
        console.log(`ℹ️ Unexpected status: ${response.status()}`);
      }
      
      // For debugging, let's not fail the test yet
      console.log(`Current status: ${response.status()} (Expected: 302 for redirect)`);
      
    } catch (error) {
      console.error('❌ Request failed:', error);
    }
  });

  test('should test the exact failing URL', async ({ request }) => {
    const exactURL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app/api/approve-registration?id=22330848-cceb-4914-a689-92aa4017031b&token=ef9b91eab1c565ce8d4bc6aef7c0afe3';
    
    console.log('🎯 Testing the exact URL that gave 404...');
    console.log(`URL: ${exactURL}`);
    
    try {
      const response = await request.get(exactURL, { 
        maxRedirects: 0,
        timeout: 15000 
      });
      
      console.log(`📊 Status Code: ${response.status()}`);
      
      if (response.status() === 404) {
        const body = await response.text();
        console.log('🚨 Still getting 404!');
        console.log('Response body preview:', body.substring(0, 500));
        
        // Check if it's a Vercel 404 or Next.js 404
        if (body.includes('This page could not be found')) {
          console.log('📝 This is a Next.js 404 - route not found in app');
        } else if (body.includes('404')) {
          console.log('📝 This is a server-level 404');
        }
      } else if (response.status() === 302) {
        console.log(`✅ Working! Redirecting to: ${response.headers()['location']}`);
      } else {
        console.log(`ℹ️ Got status: ${response.status()}`);
      }
      
    } catch (error) {
      console.error('❌ Exact URL test failed:', error);
    }
  });

  test('should compare with working endpoints', async ({ request }) => {
    const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
    
    const endpoints = [
      '/',                    // Homepage
      '/demo',               // Demo page  
      '/api/approve-registration',  // Our problematic endpoint
      '/api/reject-registration',   // Similar endpoint
      '/api/send-registration-email', // Registration endpoint
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing: ${endpoint}`);
      
      try {
        const response = await request.get(`${PRODUCTION_URL}${endpoint}`, {
          maxRedirects: 0,
          timeout: 10000
        });
        
        console.log(`   Status: ${response.status()}`);
        
        if (response.status() === 404) {
          console.log(`   ❌ 404 - Not found`);
        } else if (response.status() === 302) {
          console.log(`   ✅ 302 - Redirect (API working)`);
        } else if (response.status() === 200) {
          console.log(`   ✅ 200 - Page loads`);
        } else {
          console.log(`   ℹ️ ${response.status()} - Other status`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }
  });

  test('should check Vercel deployment info', async ({ request }) => {
    const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
    
    console.log('🔍 Checking Vercel deployment headers...');
    
    try {
      const response = await request.get(PRODUCTION_URL);
      
      const headers = response.headers();
      console.log('\n📋 Vercel Headers:');
      
      // Check for Vercel-specific headers
      if (headers['x-vercel-id']) {
        console.log(`   Deployment ID: ${headers['x-vercel-id']}`);
      }
      if (headers['x-vercel-cache']) {
        console.log(`   Cache Status: ${headers['x-vercel-cache']}`);
      }
      if (headers['server']) {
        console.log(`   Server: ${headers['server']}`);
      }
      if (headers['x-powered-by']) {
        console.log(`   Powered By: ${headers['x-powered-by']}`);
      }
      
      console.log('\n🎯 This helps determine if we\'re hitting the right deployment');
      
    } catch (error) {
      console.error('❌ Failed to get deployment info:', error);
    }
  });
});