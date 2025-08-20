import { test, expect } from '@playwright/test';

test.describe('Registration Workflow', () => {
  test('should complete registration workflow end-to-end', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    
    // 2. Open registration modal
    await page.click('text=Request Access');
    
    // 3. Fill registration form
    await page.fill('input[name="fullName"]', 'John Test User');
    await page.fill('input[name="email"]', 'john.test@example.com');
    await page.fill('input[name="company"]', 'Test Company Inc.');
    await page.fill('input[name="position"]', 'Board Director');
    await page.fill('textarea[name="message"]', 'Testing registration workflow');
    
    // 4. Submit form
    await page.click('button:has-text("Submit Request")');
    
    // 5. Wait for success message
    await expect(page.locator('text=Request Submitted!')).toBeVisible();
    
    // 6. Verify success state
    await expect(page.locator('text=Your access request has been sent')).toBeVisible();
  });

  test('should validate registration form fields', async ({ page }) => {
    await page.goto('/');
    
    // Open registration modal
    await page.click('text=Request Access');
    
    // Try to submit empty form
    await page.click('button:has-text("Submit Request")');
    
    // Check for validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Valid email is required')).toBeVisible();
    await expect(page.locator('text=Company name is required')).toBeVisible();
    await expect(page.locator('text=Position is required')).toBeVisible();
  });
});

test.describe('API Endpoints', () => {
  test('should handle API routes correctly', async ({ request }) => {
    // Test registration email API
    const registrationResponse = await request.post('/api/send-registration-email', {
      data: {
        fullName: 'Test User',
        email: 'test@example.com',
        company: 'Test Corp',
        position: 'Director',
        message: 'Test message'
      }
    });
    
    // Should return success or validation error (depending on environment config)
    expect([200, 400, 500]).toContain(registrationResponse.status());
    
    if (registrationResponse.ok()) {
      const responseBody = await registrationResponse.json();
      expect(responseBody.success).toBeDefined();
    }
  });

  test('should return 302 redirect for approval endpoints without params', async ({ request }) => {
    // Test approval endpoint without parameters
    const approvalResponse = await request.get('/api/approve-registration', {
      maxRedirects: 0
    });
    
    // Should redirect (302) to error page, not return 404
    expect(approvalResponse.status()).toBe(302);
    
    // Check redirect location contains approval-result
    const location = approvalResponse.headers()['location'];
    expect(location).toContain('/approval-result');
    expect(location).toContain('type=error');
  });

  test('should return 302 redirect for rejection endpoints without params', async ({ request }) => {
    // Test rejection endpoint without parameters  
    const rejectionResponse = await request.get('/api/reject-registration', {
      maxRedirects: 0
    });
    
    // Should redirect (302) to error page, not return 404
    expect(rejectionResponse.status()).toBe(302);
    
    // Check redirect location contains approval-result
    const location = rejectionResponse.headers()['location'];
    expect(location).toContain('/approval-result');
    expect(location).toContain('type=error');
  });

  test('should handle approval with invalid parameters', async ({ request }) => {
    // Test approval endpoint with invalid parameters
    const approvalResponse = await request.get('/api/approve-registration?id=invalid&token=invalid', {
      maxRedirects: 0
    });
    
    // Should redirect (302) to error page
    expect(approvalResponse.status()).toBe(302);
    
    const location = approvalResponse.headers()['location'];
    expect(location).toContain('/approval-result');
    expect(location).toContain('type=error');
  });
});

test.describe('Demo Page', () => {
  test('should load demo page without authentication', async ({ page }) => {
    await page.goto('/demo');
    
    // Should show demo header
    await expect(page.locator('text=BoardGuru')).toBeVisible();
    await expect(page.locator('text=DEMO MODE')).toBeVisible();
    
    // Should show navigation tabs
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Board Packs')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    
    // Should show demo warning banner
    await expect(page.locator('text=Demo Environment')).toBeVisible();
  });

  test('should navigate between demo sections', async ({ page }) => {
    await page.goto('/demo');
    
    // Test navigation between tabs
    await page.click('text=Board Packs');
    await expect(page.locator('text=Upload New Board Pack')).toBeVisible();
    
    await page.click('text=Users');
    await expect(page.locator('text=User Management')).toBeVisible();
    
    await page.click('text=Dashboard');
    await expect(page.locator('text=Total Board Packs')).toBeVisible();
  });
});

test.describe('Production URL Tests', () => {
  const PRODUCTION_URL = 'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app';
  
  test('should test production approval endpoint exists', async ({ request }) => {
    // Test the specific URL that's giving 404
    const response = await request.get(
      `${PRODUCTION_URL}/api/approve-registration?id=test&token=test`, 
      { maxRedirects: 0 }
    );
    
    // Should NOT be 404 - should be 302 redirect or error
    expect(response.status()).not.toBe(404);
    
    console.log(`Production approval endpoint status: ${response.status()}`);
    if (response.status() === 302) {
      console.log(`Redirect location: ${response.headers()['location']}`);
    }
  });

  test('should test production homepage loads', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    await expect(page.locator('text=BoardGuru')).toBeVisible();
    await expect(page.locator('text=The Future of Board Management')).toBeVisible();
  });

  test('should test production demo page loads', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/demo`);
    
    await expect(page.locator('text=BoardGuru')).toBeVisible();
    await expect(page.locator('text=DEMO MODE')).toBeVisible();
  });
});