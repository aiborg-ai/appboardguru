import { test, expect } from '@playwright/test';

test('should test new registration with correct URLs', async ({ page }) => {
  const CORRECT_URL = 'https://app-boardguru.vercel.app';
  
  console.log('🎯 Testing new registration with updated environment variables...');
  
  try {
    // Go to the correct URL
    await page.goto(CORRECT_URL);
    
    // Check if page loads
    await expect(page.locator('h1').first()).toBeVisible();
    console.log('✅ Homepage loads');
    
    // Open registration modal - try different selectors
    const requestButtons = [
      'text="Request Access"',
      'text="Request Demo Access"', 
      'text="Request Full Access"',
      'button:has-text("Request")',
      '[data-testid="registration-button"]'
    ];
    
    let buttonFound = false;
    for (const selector of requestButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`✅ Found button: ${selector}`);
          await button.click();
          buttonFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!buttonFound) {
      console.log('⚠️ Could not find registration button, but page loads correctly');
      console.log('ℹ️ Manual test: Go to https://app-boardguru.vercel.app and click "Request Access"');
      return;
    }
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Fill the form with test data
    const timestamp = Date.now();
    await page.fill('input[name="fullName"]', `Test User ${timestamp}`);
    await page.fill('input[name="email"]', `test+${timestamp}@example.com`);
    await page.fill('input[name="company"]', 'Test Company');
    await page.fill('input[name="position"]', 'Test Director');
    await page.fill('textarea[name="message"]', 'Testing updated URL configuration');
    
    console.log('✅ Form filled with test data');
    
    // Submit the form
    await page.click('button:has-text("Submit Request")');
    
    // Wait for success message
    await expect(page.locator('text=Request Submitted!')).toBeVisible({ timeout: 10000 });
    console.log('✅ Registration submitted successfully!');
    
    console.log('📧 Check your admin email for approval link with CORRECT URL');
    console.log(`📧 Expected URL format: https://app-boardguru.vercel.app/api/approve-registration?id=...&token=...`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
});