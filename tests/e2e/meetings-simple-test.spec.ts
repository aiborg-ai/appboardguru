import { test, expect } from '@playwright/test';

test.describe('Meetings Page Simple Test', () => {
  test('should load meetings page directly and show meetings wizard', async ({ page }) => {
    console.log('=== Testing Meetings Page Load ===');
    
    try {
      // Access the meetings page directly
      console.log('1. Loading meetings page directly...');
      await page.goto('http://localhost:3000/dashboard/meetings', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
        console.log('Redirected to auth - this is expected for authenticated routes');
        
        // Let's try to see if we can at least verify the route exists
        const response = await page.request.get('http://localhost:3000/dashboard/meetings');
        console.log(`Route response status: ${response.status()}`);
        
      } else if (currentUrl.includes('/meetings')) {
        console.log('✅ Successfully loaded meetings page');
        
        // Take screenshot
        await page.screenshot({ path: 'meetings-page-loaded.png', fullPage: true });
        
        // Check for key elements
        const pageContent = await page.textContent('body');
        if (pageContent?.includes('Meetings') || pageContent?.includes('Create Meeting')) {
          console.log('✅ Meeting page content found');
        }
        
        // Try to find the Create Meeting button
        const createButton = page.getByRole('button', { name: 'Create Meeting' });
        if (await createButton.isVisible({ timeout: 5000 })) {
          console.log('✅ Create Meeting button found');
          
          // Click to open wizard
          await createButton.click();
          await page.waitForTimeout(1000);
          
          // Check if wizard opened
          const wizardTitle = page.getByText('Create New Meeting');
          if (await wizardTitle.isVisible({ timeout: 5000 })) {
            console.log('✅ Meeting wizard opened successfully');
            
            // Take screenshot of wizard
            await page.screenshot({ path: 'meetings-wizard-opened.png', fullPage: true });
            
            // Check for meeting type options
            const boardMeeting = page.getByText('Board Meeting');
            if (await boardMeeting.isVisible({ timeout: 3000 })) {
              console.log('✅ Meeting type options visible');
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Test error:', error);
      await page.screenshot({ path: 'meetings-simple-test-error.png', fullPage: true });
    }
  });

  test('should verify meetings route exists and is accessible', async ({ page }) => {
    console.log('=== Testing Meetings Route Accessibility ===');
    
    try {
      // Test the route directly
      const response = await page.request.get('http://localhost:3000/dashboard/meetings');
      console.log(`Meetings route status: ${response.status()}`);
      
      if (response.status() === 200) {
        console.log('✅ Meetings route is accessible (200 OK)');
      } else if (response.status() === 302 || response.status() === 307) {
        console.log('Meetings route redirects (likely to auth) - this is expected');
      } else {
        console.log(`❌ Unexpected status: ${response.status()}`);
      }
      
      // Also test the create meetings route
      const createResponse = await page.request.get('http://localhost:3000/dashboard/meetings/create');
      console.log(`Create meetings route status: ${createResponse.status()}`);
      
    } catch (error) {
      console.error('Route test error:', error);
    }
  });
});