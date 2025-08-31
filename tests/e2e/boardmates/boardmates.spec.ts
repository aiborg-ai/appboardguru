import { test, expect } from '@playwright/test';

test.describe('BoardMates Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/boardmates');
    await page.waitForLoadState('networkidle');
  });

  test('should display boardmates page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /boardmates/i })).toBeVisible();
    
    // Check for add boardmate button
    await expect(page.locator('button').filter({ hasText: /add.*boardmate|invite.*board.*member/i })).toBeVisible();
    
    // Check for boardmates list or grid
    const boardmatesList = page.locator('.boardmate-card, [data-testid="boardmate-item"], .member-card');
    if (await boardmatesList.count() > 0) {
      await expect(boardmatesList.first()).toBeVisible();
    } else {
      await expect(page.locator('text=/no.*boardmates|invite.*first/i')).toBeVisible();
    }
  });

  test('should open add boardmate wizard', async ({ page }) => {
    // Click add boardmate button
    await page.click('button:has-text(/add.*boardmate|invite.*board.*member/i)');
    
    // Check wizard opens with modern UI
    await expect(page.locator('text=/add.*new.*boardmate|create.*boardmate/i')).toBeVisible();
    
    // Check for step indicators (modern wizard)
    await expect(page.locator('text=/personal.*information|step.*1/i')).toBeVisible();
  });

  test('should add a new boardmate using wizard', async ({ page }) => {
    // Open add boardmate wizard
    await page.click('button:has-text(/add.*boardmate|invite.*board.*member/i)');
    
    // Step 1: Personal Information
    await page.fill('input[name="fullName"], input[placeholder*="full name" i]', 'John Smith');
    await page.fill('input[name="email"], input[type="email"]', 'john.smith@boardexample.com');
    await page.fill('input[name="phone"], input[type="tel"]', '+1-555-0123');
    
    // Professional title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
    if (await titleInput.count() > 0) {
      await titleInput.fill('Chief Executive Officer');
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 2: Organization & Role
    await expect(page.locator('text=/organization|role/i')).toBeVisible();
    
    await page.fill('input[name="company"], input[placeholder*="company" i]', 'Smith Enterprises');
    
    // Select board type
    const boardTypeSelect = page.locator('select[name="boardType"], [data-testid="board-type"]');
    if (await boardTypeSelect.count() > 0) {
      await boardTypeSelect.selectOption({ value: 'board_of_directors' });
    }
    
    // Select position
    const positionSelect = page.locator('select[name="position"], [data-testid="position"]');
    if (await positionSelect.count() > 0) {
      await positionSelect.selectOption({ value: 'chairman' });
    }
    
    // Committee memberships
    const committeeCheckboxes = page.locator('input[type="checkbox"][name*="committee"]');
    if (await committeeCheckboxes.count() > 0) {
      await committeeCheckboxes.first().check();
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 3: Contact Details
    await expect(page.locator('text=/contact.*details|address/i')).toBeVisible();
    
    await page.fill('input[name="address"], textarea[name="address"]', '123 Board Street, Suite 100');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"], select[name="state"]', 'NY');
    await page.fill('input[name="zipCode"], input[name="postalCode"]', '10001');
    
    // LinkedIn profile
    const linkedinInput = page.locator('input[name="linkedin"], input[placeholder*="linkedin" i]');
    if (await linkedinInput.count() > 0) {
      await linkedinInput.fill('https://linkedin.com/in/johnsmith');
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 4: Access & Permissions
    await expect(page.locator('text=/access|permissions/i')).toBeVisible();
    
    // Set vault access
    const vaultAccess = page.locator('input[type="checkbox"][value*="vault"]');
    if (await vaultAccess.count() > 0) {
      await vaultAccess.first().check();
    }
    
    // Set meeting access
    const meetingAccess = page.locator('input[type="checkbox"][value*="meeting"]');
    if (await meetingAccess.count() > 0) {
      await meetingAccess.check();
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 5: Review & Send
    await expect(page.locator('text=/review|confirm/i')).toBeVisible();
    
    // Verify entered information
    await expect(page.locator('text="John Smith"')).toBeVisible();
    await expect(page.locator('text="john.smith@boardexample.com"')).toBeVisible();
    
    // Send invitation
    await page.click('button:has-text(/send.*invitation|create.*boardmate|finish/i)');
    
    // Check success
    await expect(page.locator('text=/boardmate.*added|invitation.*sent|success/i')).toBeVisible({ timeout: 15000 });
    
    // Should show new boardmate in list
    await expect(page.locator('text="John Smith"')).toBeVisible();
  });

  test('should view boardmate profile', async ({ page }) => {
    // Click on first boardmate
    const firstBoardmate = page.locator('.boardmate-card, [data-testid="boardmate-item"]').first();
    
    if (await firstBoardmate.count() > 0) {
      await firstBoardmate.click();
      
      // Check profile modal or page
      await expect(page.locator('text=/profile|boardmate.*details/i')).toBeVisible();
      
      // Check for key information sections
      await expect(page.locator('text=/contact.*information/i')).toBeVisible();
      await expect(page.locator('text=/board.*position|role/i')).toBeVisible();
      await expect(page.locator('text=/committee.*membership/i')).toBeVisible();
    }
  });

  test('should edit boardmate information', async ({ page }) => {
    // Click on first boardmate
    const firstBoardmate = page.locator('.boardmate-card, [data-testid="boardmate-item"]').first();
    
    if (await firstBoardmate.count() > 0) {
      await firstBoardmate.click();
      
      // Click edit button
      await page.click('button:has-text(/edit|update/i)');
      
      // Update information
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
      if (await phoneInput.count() > 0) {
        await phoneInput.clear();
        await phoneInput.fill('+1-555-9999');
      }
      
      // Update title
      const titleInput = page.locator('input[name="title"]');
      if (await titleInput.count() > 0) {
        await titleInput.clear();
        await titleInput.fill('Executive Chairman');
      }
      
      // Save changes
      await page.click('button:has-text(/save|update/i)');
      
      // Check success
      await expect(page.locator('text=/updated.*successfully|changes.*saved/i')).toBeVisible();
    }
  });

  test('should filter boardmates by board type', async ({ page }) => {
    // Find filter dropdown
    const boardFilter = page.locator('select[name="boardType"], button:has-text(/all.*boards|filter.*by.*board/i)');
    
    if (await boardFilter.count() > 0) {
      if (await boardFilter.evaluate(el => el.tagName) === 'SELECT') {
        await boardFilter.selectOption({ value: 'board_of_directors' });
      } else {
        await boardFilter.click();
        await page.click('text=/board.*of.*directors/i');
      }
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Check filtered results
      const boardmateCards = page.locator('.boardmate-card, [data-testid="boardmate-item"]');
      if (await boardmateCards.count() > 0) {
        // Verify filter worked
        await expect(boardmateCards.first()).toBeVisible();
      }
    }
  });

  test('should search for boardmates', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('Sarah Johnson');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Check results
      const searchResults = page.locator('.boardmate-card, [data-testid="boardmate-item"]');
      if (await searchResults.count() > 0) {
        await expect(page.locator('text=/sarah.*johnson/i')).toBeVisible();
      } else {
        await expect(page.locator('text=/no.*results|not.*found/i')).toBeVisible();
      }
    }
  });

  test('should manage boardmate committees', async ({ page }) => {
    // Click on first boardmate
    const firstBoardmate = page.locator('.boardmate-card, [data-testid="boardmate-item"]').first();
    
    if (await firstBoardmate.count() > 0) {
      await firstBoardmate.click();
      
      // Go to committees section
      await page.click('text=/committees|memberships/i');
      
      // Add to committee
      await page.click('button:has-text(/add.*committee|assign/i)');
      
      // Select committee
      const committeeSelect = page.locator('select[name="committee"], [data-testid="committee-select"]');
      if (await committeeSelect.count() > 0) {
        await committeeSelect.selectOption({ value: 'audit' });
      }
      
      // Save
      await page.click('button:has-text(/add|assign|save/i)');
      
      // Check success
      await expect(page.locator('text=/added.*to.*committee|assigned/i')).toBeVisible();
    }
  });

  test('should export boardmates list', async ({ page }) => {
    // Find export button
    const exportButton = page.locator('button:has-text(/export|download.*list/i)');
    
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // Check export options
      await expect(page.locator('text=/export.*format|choose.*format/i')).toBeVisible();
      
      // Select format
      await page.click('text=/csv|excel/i');
      
      // Download
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text(/export|download/i)');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('boardmates');
    }
  });

  test('should send message to boardmate', async ({ page }) => {
    // Click on first boardmate
    const firstBoardmate = page.locator('.boardmate-card, [data-testid="boardmate-item"]').first();
    
    if (await firstBoardmate.count() > 0) {
      await firstBoardmate.click();
      
      // Click message button
      const messageButton = page.locator('button:has-text(/message|email|contact/i)');
      if (await messageButton.count() > 0) {
        await messageButton.click();
        
        // Check message compose modal
        await expect(page.locator('text=/compose.*message|send.*email/i')).toBeVisible();
        
        // Fill message
        await page.fill('input[name="subject"]', 'Board Meeting Reminder');
        await page.fill('textarea[name="message"], textarea[name="body"]', 'Reminder about upcoming board meeting on Friday.');
        
        // Send message
        await page.click('button:has-text(/send|submit/i)');
        
        // Check success
        await expect(page.locator('text=/message.*sent|email.*sent/i')).toBeVisible();
      }
    }
  });

  test('should remove boardmate', async ({ page }) => {
    // Find a boardmate to remove (not the first one, might be important)
    const boardmateToRemove = page.locator('.boardmate-card, [data-testid="boardmate-item"]').nth(1);
    
    if (await boardmateToRemove.count() > 0) {
      await boardmateToRemove.click();
      
      // Click remove button
      await page.click('button:has-text(/remove|delete/i)');
      
      // Confirm removal
      await expect(page.locator('text=/confirm.*remove|are.*you.*sure/i')).toBeVisible();
      await page.click('button:has-text(/confirm|yes/i)');
      
      // Check success
      await expect(page.locator('text=/removed.*successfully|boardmate.*removed/i')).toBeVisible();
    }
  });

  test('should view boardmate activity history', async ({ page }) => {
    // Click on first boardmate
    const firstBoardmate = page.locator('.boardmate-card, [data-testid="boardmate-item"]').first();
    
    if (await firstBoardmate.count() > 0) {
      await firstBoardmate.click();
      
      // Go to activity tab
      const activityTab = page.locator('text=/activity|history|attendance/i');
      if (await activityTab.count() > 0) {
        await activityTab.click();
        
        // Check activity history
        await expect(page.locator('text=/meeting.*attendance|activity.*log/i')).toBeVisible();
        
        // Check for activity entries
        const activities = page.locator('.activity-entry, [data-testid="activity-item"]');
        if (await activities.count() > 0) {
          await expect(activities.first()).toBeVisible();
        }
      }
    }
  });
});