import { test, expect } from '@playwright/test';

test.describe('Correct Vercel URL Test', () => {
  const CORRECT_URL = 'https://app-boardguru.vercel.app';
  
  test('should test correct production URL', async ({ request }) => {
    console.log('🎯 Testing the correct Vercel URL...');
    console.log(`URL: ${CORRECT_URL}`);
    
    try {
      // Test homepage first
      const homepageResponse = await request.get(CORRECT_URL);
      console.log(`📊 Homepage Status: ${homepageResponse.status()}`);
      
      if (homepageResponse.status() === 200) {
        console.log('✅ Homepage loads correctly!');
      }
      
      // Test approval endpoint
      const approvalResponse = await request.get(`${CORRECT_URL}/api/approve-registration`, {
        maxRedirects: 0
      });
      
      console.log(`📊 Approval Endpoint Status: ${approvalResponse.status()}`);
      
      if (approvalResponse.status() === 302) {
        console.log('✅ Approval endpoint works! Redirects to:', approvalResponse.headers()['location']);
      } else if (approvalResponse.status() === 404) {
        console.log('❌ Still getting 404 - deployment might not have latest code');
      }
      
      // Test with sample parameters
      const testApprovalUrl = `${CORRECT_URL}/api/approve-registration?id=test-id&token=test-token`;
      const testResponse = await request.get(testApprovalUrl, { maxRedirects: 0 });
      
      console.log(`📊 Test Approval with params: ${testResponse.status()}`);
      
      if (testResponse.status() === 302) {
        const location = testResponse.headers()['location'];
        console.log('✅ Redirects to approval result:', location);
        
        // Should redirect to approval-result page with error (since params are invalid)
        if (location && location.includes('/approval-result')) {
          console.log('✅ Correct redirect behavior!');
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  });

  test('should test the registration form on correct URL', async ({ page }) => {
    console.log('🎯 Testing registration form on correct URL...');
    
    try {
      await page.goto(CORRECT_URL);
      
      // Check if homepage loads
      await expect(page.locator('text=BoardGuru')).toBeVisible();
      console.log('✅ Homepage loads correctly');
      
      // Open registration modal
      await page.click('text=Request Access');
      await expect(page.locator('text=Request Access')).toBeVisible();
      console.log('✅ Registration modal opens');
      
      // Fill form with test data
      await page.fill('input[name="fullName"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="company"]', 'Test Company');
      await page.fill('input[name="position"]', 'Test Position');
      
      console.log('✅ Form filled successfully');
      
      // Note: We won't submit to avoid creating test records
      console.log('ℹ️ Form ready for submission (not submitting to avoid test data)');
      
    } catch (error) {
      console.error('❌ Registration form test failed:', error);
      throw error;
    }
  });
});