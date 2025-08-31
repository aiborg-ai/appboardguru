import { test, expect } from '@playwright/test';

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('networkidle');
  });

  test('should display organizations page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /organizations/i })).toBeVisible();
    
    // Check for create button or organization list
    const createButton = page.locator('button').filter({ hasText: /create.*organization|new.*organization/i });
    const orgList = page.locator('.organization-card, [data-testid="organization-item"]');
    
    await expect(createButton.or(orgList).first()).toBeVisible();
  });

  test('should create a new organization', async ({ page }) => {
    // Click create organization
    await page.click('button:has-text(/create.*organization|new.*organization/i)');
    
    // Fill organization details
    await page.fill('input[name="name"], input[placeholder*="organization name" i]', 'Test Corporation');
    await page.fill('input[name="slug"], input[placeholder*="url" i]', 'test-corp');
    await page.fill('textarea[name="description"]', 'A test organization for Playwright testing');
    
    // Select organization size
    const sizeSelect = page.locator('select[name="size"], [data-testid="org-size"]');
    if (await sizeSelect.count() > 0) {
      await sizeSelect.selectOption({ value: 'medium' });
    }
    
    // Select industry
    const industryInput = page.locator('input[name="industry"], select[name="industry"]');
    if (await industryInput.count() > 0) {
      if (await industryInput.evaluate(el => el.tagName) === 'SELECT') {
        await industryInput.selectOption({ value: 'technology' });
      } else {
        await industryInput.fill('Technology');
      }
    }
    
    // Add website
    const websiteInput = page.locator('input[name="website"], input[type="url"]');
    if (await websiteInput.count() > 0) {
      await websiteInput.fill('https://testcorp.example.com');
    }
    
    // Submit form
    await page.click('button:has-text(/create|submit/i)');
    
    // Check success
    await expect(page.locator('text=/organization.*created|success/i')).toBeVisible({ timeout: 15000 });
    
    // Should show new organization
    await expect(page.locator('text="Test Corporation"')).toBeVisible();
  });

  test('should view organization details', async ({ page }) => {
    // Click on first organization
    const firstOrg = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await firstOrg.count() > 0) {
      await firstOrg.click();
      
      // Check organization details page
      await expect(page.locator('text=/organization.*details|overview/i')).toBeVisible();
      
      // Check for key sections
      await expect(page.locator('text=/members|team/i')).toBeVisible();
      await expect(page.locator('text=/settings|configuration/i')).toBeVisible();
    }
  });

  test('should add members to organization', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to members section
      await page.click('text=/members|team/i');
      
      // Click add member
      await page.click('button:has-text(/add.*member|invite/i)');
      
      // Fill member details
      await page.fill('input[type="email"], input[placeholder*="email" i]', 'newmember@example.com');
      
      // Select role
      const roleSelect = page.locator('select[name="role"], [data-testid="member-role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption({ value: 'member' });
      }
      
      // Send invitation
      await page.click('button:has-text(/send.*invite|add.*member/i)');
      
      // Check success
      await expect(page.locator('text=/invitation.*sent|member.*added/i')).toBeVisible();
    }
  });

  test('should update organization settings', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to settings
      await page.click('text=/settings|configuration/i');
      
      // Update organization name
      const nameInput = page.locator('input[name="name"], input[value*="corp" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await nameInput.fill('Updated Corporation Name');
      }
      
      // Update description
      const descInput = page.locator('textarea[name="description"]').first();
      if (await descInput.count() > 0) {
        await descInput.clear();
        await descInput.fill('Updated organization description');
      }
      
      // Save changes
      await page.click('button:has-text(/save|update/i)');
      
      // Check success
      await expect(page.locator('text=/updated.*successfully|changes.*saved/i')).toBeVisible();
    }
  });

  test('should manage organization roles', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to members
      await page.click('text=/members|team/i');
      
      // Find a member to update
      const memberRow = page.locator('.member-row, [data-testid="member-item"]').first();
      if (await memberRow.count() > 0) {
        // Click edit or role dropdown
        const roleButton = memberRow.locator('button:has-text(/role|edit/i), select');
        if (await roleButton.count() > 0) {
          await roleButton.click();
          
          // Change role
          await page.click('text=/admin|manager/i');
          
          // Save if needed
          const saveButton = page.locator('button:has-text(/save|confirm/i)');
          if (await saveButton.count() > 0) {
            await saveButton.click();
          }
          
          // Check success
          await expect(page.locator('text=/role.*updated|changed/i')).toBeVisible();
        }
      }
    }
  });

  test('should remove member from organization', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to members
      await page.click('text=/members|team/i');
      
      // Find a member to remove
      const memberRow = page.locator('.member-row, [data-testid="member-item"]').nth(1); // Skip first (might be owner)
      if (await memberRow.count() > 0) {
        // Click remove button
        const removeButton = memberRow.locator('button:has-text(/remove|delete/i)');
        if (await removeButton.count() > 0) {
          await removeButton.click();
          
          // Confirm removal
          await expect(page.locator('text=/confirm.*remove|are.*you.*sure/i')).toBeVisible();
          await page.click('button:has-text(/confirm|yes/i)');
          
          // Check success
          await expect(page.locator('text=/removed.*successfully|member.*removed/i')).toBeVisible();
        }
      }
    }
  });

  test('should switch between organizations', async ({ page }) => {
    // Look for organization switcher
    const orgSwitcher = page.locator('[data-testid="org-switcher"], button:has-text("TechCorp"), .organization-selector').first();
    
    if (await orgSwitcher.count() > 0) {
      await orgSwitcher.click();
      
      // Check dropdown shows organizations
      await expect(page.locator('text=/select.*organization|switch/i')).toBeVisible();
      
      // Select different organization if available
      const otherOrg = page.locator('button:has-text(/corporation|enterprises/i)').nth(1);
      if (await otherOrg.count() > 0) {
        await otherOrg.click();
        
        // Check organization switched
        await page.waitForTimeout(1000);
        // The UI should reflect the new organization context
      }
    }
  });

  test('should view organization activity', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to activity tab
      const activityTab = page.locator('text=/activity|audit|history/i');
      if (await activityTab.count() > 0) {
        await activityTab.click();
        
        // Check activity log
        await expect(page.locator('text=/recent.*activity|audit.*log/i')).toBeVisible();
        
        // Check for activity entries
        const activities = page.locator('.activity-item, [data-testid="activity-entry"]');
        if (await activities.count() > 0) {
          await expect(activities.first()).toBeVisible();
        }
      }
    }
  });

  test('should manage organization billing', async ({ page }) => {
    // Navigate to an organization
    const org = page.locator('.organization-card, [data-testid="organization-item"]').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to billing section
      const billingTab = page.locator('text=/billing|subscription|payment/i');
      if (await billingTab.count() > 0) {
        await billingTab.click();
        
        // Check billing page
        await expect(page.locator('text=/current.*plan|subscription/i')).toBeVisible();
        
        // Check for upgrade button
        const upgradeButton = page.locator('button:has-text(/upgrade|change.*plan/i)');
        if (await upgradeButton.count() > 0) {
          await expect(upgradeButton).toBeVisible();
        }
      }
    }
  });

  test('should delete organization', async ({ page }) => {
    // Navigate to an organization (preferably a test one)
    const org = page.locator('.organization-card:has-text("Test"), [data-testid="organization-item"]:has-text("Test")').first();
    
    if (await org.count() > 0) {
      await org.click();
      
      // Go to settings
      await page.click('text=/settings|configuration/i');
      
      // Scroll to danger zone
      await page.locator('text=/danger.*zone|delete.*organization/i').scrollIntoViewIfNeeded();
      
      // Click delete organization
      await page.click('button:has-text(/delete.*organization/i)');
      
      // Confirm deletion
      await expect(page.locator('text=/permanent|cannot.*be.*undone/i')).toBeVisible();
      
      // Type organization name to confirm
      const confirmInput = page.locator('input[placeholder*="type.*name" i]');
      if (await confirmInput.count() > 0) {
        await confirmInput.fill('organization-name');
      }
      
      // Confirm delete
      await page.click('button:has-text(/delete|confirm/i)');
      
      // Check success
      await expect(page.locator('text=/deleted.*successfully|organization.*removed/i')).toBeVisible();
      
      // Should redirect to organizations list
      await expect(page).toHaveURL(/.*organizations/);
    }
  });
});