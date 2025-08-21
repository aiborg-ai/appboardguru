import { test, expect } from '@playwright/test';

test.describe('Meetings Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    console.log('=== Testing Meetings Dashboard ===');
    
    try {
      // Try to access dashboard directly first
      console.log('1. Attempting to access dashboard...');
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
      
      // Check if we were redirected to auth
      const currentUrl = page.url();
      console.log(`Current URL after dashboard attempt: ${currentUrl}`);
      
      if (currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
        console.log('2. Redirected to auth - trying demo dashboard...');
        await page.goto('http://localhost:3000/demo/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
      }
      
      // Wait a bit for components to render
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('Setup error:', error);
      // Take screenshot for debugging
      await page.screenshot({ path: 'meetings-test-setup-error.png', fullPage: true });
    }
  });

  test('should display meetings menu item in sidebar', async ({ page }) => {
    // Check if the Meetings menu item exists in the sidebar
    const meetingsMenuItem = page.locator('nav').getByText('Meetings');
    await expect(meetingsMenuItem).toBeVisible();
    
    // Check that it's positioned after Vaults
    const vaultsMenuItem = page.locator('nav').getByText('Vaults');
    await expect(vaultsMenuItem).toBeVisible();
  });

  test('should navigate to meetings dashboard', async ({ page }) => {
    // Click on the Meetings menu item
    await page.locator('nav').getByText('Meetings').click();
    
    // Wait for navigation
    await page.waitForURL('**/dashboard/meetings');
    
    // Check that we're on the meetings page
    await expect(page.locator('h1')).toContainText('Meetings');
    
    // Check for key elements on the meetings page
    await expect(page.getByText('Manage and organize your board meetings')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Meeting' })).toBeVisible();
  });

  test('should display stats cards on meetings dashboard', async ({ page }) => {
    // Navigate to meetings
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    
    // Check for stats cards
    await expect(page.getByText('Scheduled')).toBeVisible();
    await expect(page.getByText('Total Attendees')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('This Month')).toBeVisible();
  });

  test('should display meetings list with mock data', async ({ page }) => {
    // Navigate to meetings
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    
    // Check for mock meetings
    await expect(page.getByText('Q4 Board Meeting')).toBeVisible();
    await expect(page.getByText('2024 Annual General Meeting')).toBeVisible();
    await expect(page.getByText('Audit Committee Review')).toBeVisible();
    await expect(page.getByText('Strategic Planning Session')).toBeVisible();
  });

  test('should open create meeting wizard', async ({ page }) => {
    // Navigate to meetings
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    
    // Click Create Meeting button
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    
    // Check if the wizard modal opens
    await expect(page.getByText('Create New Meeting')).toBeVisible();
    await expect(page.getByText('What type of meeting are you organizing?')).toBeVisible();
    
    // Check if meeting type options are visible
    await expect(page.getByText('Annual General Meeting (AGM)')).toBeVisible();
    await expect(page.getByText('Board Meeting')).toBeVisible();
    await expect(page.getByText('Committee Meeting')).toBeVisible();
    await expect(page.getByText('Other Meeting')).toBeVisible();
  });

  test('should progress through meeting wizard steps', async ({ page }) => {
    // Navigate to meetings and open wizard
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    
    // Step 1: Select meeting type
    await page.getByText('Board Meeting').click();
    await page.fill('[id="meeting-title"]', 'Test Board Meeting');
    
    // Go to next step
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 2: Should be on agenda step
    await expect(page.getByText('Set Your Agenda & Documents')).toBeVisible();
    await expect(page.getByText('Meeting Agenda')).toBeVisible();
    
    // Should have default agenda items
    await expect(page.getByText('Call to Order')).toBeVisible();
    await expect(page.getByText('CEO Report')).toBeVisible();
    
    // Go to next step
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 3: Should be on calendar step
    await expect(page.getByText('Schedule Your Meeting')).toBeVisible();
    await expect(page.getByText('Date & Time')).toBeVisible();
    
    // Go to next step
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 4: Should be on invitees step
    await expect(page.getByText('Invite Attendees & Assign Roles')).toBeVisible();
    await expect(page.getByText('Search Organization Members')).toBeVisible();
    
    // Go to next step
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Step 5: Should be on review step
    await expect(page.getByText('Review & Broadcast Meeting')).toBeVisible();
    await expect(page.getByText('Meeting Overview')).toBeVisible();
  });

  test('should filter meetings by status and type', async ({ page }) => {
    // Navigate to meetings
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    
    // Test status filter
    await page.selectOption('select:has-text("All Status")', 'completed');
    
    // Should only show completed meetings
    await expect(page.getByText('Audit Committee Review')).toBeVisible();
    // Other meetings should not be visible
    await expect(page.getByText('Q4 Board Meeting')).not.toBeVisible();
    
    // Reset filter
    await page.selectOption('select:has-text("Completed")', 'all');
    
    // Test type filter
    await page.selectOption('select:has-text("All Types")', 'agm');
    
    // Should only show AGM meetings
    await expect(page.getByText('2024 Annual General Meeting')).toBeVisible();
    // Other meetings should not be visible
    await expect(page.getByText('Q4 Board Meeting')).not.toBeVisible();
  });

  test('should search meetings', async ({ page }) => {
    // Navigate to meetings
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    
    // Search for a specific meeting
    await page.fill('input[placeholder="Search meetings..."]', 'Q4');
    
    // Should show only matching meetings
    await expect(page.getByText('Q4 Board Meeting')).toBeVisible();
    await expect(page.getByText('2024 Annual General Meeting')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Search meetings..."]', '');
    
    // All meetings should be visible again
    await expect(page.getByText('Q4 Board Meeting')).toBeVisible();
    await expect(page.getByText('2024 Annual General Meeting')).toBeVisible();
  });

  test('should close meeting wizard', async ({ page }) => {
    // Navigate to meetings and open wizard
    await page.locator('nav').getByText('Meetings').click();
    await page.waitForURL('**/dashboard/meetings');
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    
    // Close wizard using X button
    await page.getByRole('button', { name: '✕' }).click();
    
    // Should be back on meetings dashboard
    await expect(page.getByText('Create New Meeting')).not.toBeVisible();
    await expect(page.getByText('Manage and organize your board meetings')).toBeVisible();
  });
});