import { test, expect } from '@playwright/test';

test.describe('API Routes Debug - 404 Issue Investigation', () => {
  test('should test local approval endpoint', async ({ request }) => {
    console.log('Testing local approval endpoint...');
    
    const response = await request.get('/api/approve-registration', {
      maxRedirects: 0
    });
    
    console.log(`Local approval endpoint status: ${response.status()}`);
    console.log(`Response headers:`, response.headers());
    
    if (response.status() === 302) {
      console.log(`Redirect location: ${response.headers()['location']}`);
    }
    
    // Should redirect to error page (302), not be missing (404)
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toContain('/approval-result');
  });

  test('should test production approval endpoint', async ({ request }) => {
    console.log('Testing production approval endpoint...');
    
    const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
    
    try {
      const response = await request.get(
        `${PRODUCTION_URL}/api/approve-registration`, 
        { maxRedirects: 0, timeout: 10000 }
      );
      
      console.log(`Production approval endpoint status: ${response.status()}`);
      console.log(`Response headers:`, response.headers());
      
      if (response.status() === 302) {
        console.log(`Redirect location: ${response.headers()['location']}`);
      }
      
      if (response.status() === 404) {
        const responseText = await response.text();
        console.log(`404 Response body:`, responseText);
      }
      
      // Log the actual status for debugging
      console.log(`Expected: 302 redirect, Got: ${response.status()}`);
      
      // For now, let's see what we get
      expect([302, 404, 500]).toContain(response.status());
      
    } catch (error) {
      console.error('Production endpoint test failed:', error);
      throw error;
    }
  });

  test('should test production homepage', async ({ page }) => {
    console.log('Testing production homepage...');
    
    const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
    
    try {
      await page.goto(PRODUCTION_URL, { timeout: 10000 });
      
      // Check if page loads
      await expect(page.locator('text=BoardGuru')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Production homepage loads correctly');
      
    } catch (error) {
      console.error('Production homepage test failed:', error);
      throw error;
    }
  });

  test('should check all API routes exist locally', async ({ request }) => {
    const routes = [
      '/api/send-registration-email',
      '/api/approve-registration', 
      '/api/reject-registration',
      '/api/chat',
      '/api/summarize-document'
    ];

    for (const route of routes) {
      console.log(`Testing route: ${route}`);
      
      const response = await request.get(route, { maxRedirects: 0 });
      
      console.log(`${route} status: ${response.status()}`);
      
      // None should be 404 (route not found)
      expect(response.status()).not.toBe(404);
    }
  });

  test('should test the specific failing URL', async ({ request }) => {
    console.log('Testing the exact URL that was failing...');
    
    const failingUrl = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app/api/approve-registration?id=22330848-cceb-4914-a689-92aa4017031b&token=ef9b91eab1c565ce8d4bc6aef7c0afe3';
    
    try {
      const response = await request.get(failingUrl, { 
        maxRedirects: 0,
        timeout: 15000 
      });
      
      console.log(`Failing URL status: ${response.status()}`);
      console.log(`Response headers:`, response.headers());
      
      if (response.status() === 404) {
        const body = await response.text();
        console.log('404 Response body:', body.substring(0, 500) + '...');
      }
      
      if (response.status() === 302) {
        console.log(`Redirect to: ${response.headers()['location']}`);
      }
      
      // Should not be 404 if our API route exists
      expect(response.status()).not.toBe(404);
      
    } catch (error) {
      console.error('Specific URL test failed:', error);
      
      // If it times out or network error, that's different from 404
      expect((error as Error).message).not.toContain('404');
    }
  });
});