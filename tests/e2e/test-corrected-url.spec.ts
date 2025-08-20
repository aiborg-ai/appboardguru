import { test, expect } from '@playwright/test';

test('should test the corrected URL with your registration data', async ({ request }) => {
  // Your original registration ID and token, but with the CORRECT domain
  const correctedUrl = 'https://app-boardguru.vercel.app/api/approve-registration?id=4cd4d4ae-1873-4c57-b392-ef3c41bdd604&token=4fa838b1c6c1b36a6c68c441c64e4e0a';
  
  console.log('🎯 Testing your original registration with CORRECT URL...');
  console.log(`URL: ${correctedUrl}`);
  
  try {
    const response = await request.get(correctedUrl, { 
      maxRedirects: 0,
      timeout: 15000 
    });
    
    console.log(`📊 Status Code: ${response.status()}`);
    
    if (response.status() === 302) {
      const location = response.headers()['location'];
      console.log(`✅ SUCCESS! Redirects to: ${location}`);
      
      if (location.includes('type=success')) {
        console.log('🎉 REGISTRATION APPROVED SUCCESSFULLY!');
      } else if (location.includes('type=error')) {
        console.log('ℹ️ Redirects to error page (expected if token expired/used)');
      }
    } else if (response.status() === 404) {
      console.log('❌ Still 404 - deployment may not be updated yet');
    } else {
      console.log(`ℹ️ Status: ${response.status()}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
});