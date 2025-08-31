import { test, expect } from '@playwright/test';

test.describe('Vault Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/vaults');
    await page.waitForLoadState('networkidle');
  });

  test('should display vaults page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /vaults/i })).toBeVisible();
    
    // Check for create vault button
    await expect(page.locator('button').filter({ hasText: /create.*vault|new.*vault/i })).toBeVisible();
    
    // Check for vault grid or list
    const vaultContainer = page.locator('.vault-grid, .vault-list, [data-testid="vaults-container"]');
    await expect(vaultContainer.or(page.locator('text=/no.*vaults|create.*first.*vault/i'))).toBeVisible();
  });

  test('should open create vault wizard', async ({ page }) => {
    // Click create vault button
    await page.click('button:has-text(/create.*vault|new.*vault/i)');
    
    // Check wizard opens
    await expect(page.locator('text=/create.*new.*vault|vault.*setup/i')).toBeVisible();
    
    // Check for step indicators
    await expect(page.locator('text=/step.*1|basic.*info/i')).toBeVisible();
  });

  test('should create a new vault', async ({ page }) => {
    // Open create vault wizard
    await page.click('button:has-text(/create.*vault|new.*vault/i)');
    
    // Step 1: Basic Information
    await page.fill('input[name="name"], input[placeholder*="vault name" i]', 'Test Board Vault');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'This is a test vault for board documents');
    
    // Select vault type if available
    const vaultTypeSelect = page.locator('select[name="type"], [data-testid="vault-type"]');
    if (await vaultTypeSelect.count() > 0) {
      await vaultTypeSelect.selectOption({ value: 'board_meetings' });
    }
    
    // Click next
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 2: Security Settings
    await expect(page.locator('text=/security|access.*control/i')).toBeVisible();
    
    // Set security level
    const securityLevel = page.locator('input[type="radio"][value="high"], label:has-text("High Security")');
    if (await securityLevel.count() > 0) {
      await securityLevel.click();
    }
    
    // Enable encryption if available
    const encryptionToggle = page.locator('input[type="checkbox"][name="encryption"], label:has-text(/encrypt/i)');
    if (await encryptionToggle.count() > 0) {
      await encryptionToggle.check();
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 3: Access Permissions
    await expect(page.locator('text=/permissions|who.*can.*access/i')).toBeVisible();
    
    // Add members if possible
    const memberInput = page.locator('input[placeholder*="add member" i], input[placeholder*="email" i]');
    if (await memberInput.count() > 0) {
      await memberInput.fill('board.member@example.com');
      await page.keyboard.press('Enter');
    }
    
    await page.click('button:has-text(/next|continue/i)');
    
    // Step 4: Compliance Settings
    if (await page.locator('text=/compliance|regulatory/i').count() > 0) {
      // Select compliance frameworks
      const gdprCheckbox = page.locator('input[type="checkbox"][value="gdpr"], label:has-text("GDPR")');
      if (await gdprCheckbox.count() > 0) {
        await gdprCheckbox.check();
      }
      
      await page.click('button:has-text(/next|continue/i)');
    }
    
    // Step 5: Review and Create
    await expect(page.locator('text=/review|summary/i')).toBeVisible();
    
    // Verify entered information
    await expect(page.locator('text="Test Board Vault"')).toBeVisible();
    
    // Create vault
    await page.click('button:has-text(/create.*vault|finish|complete/i)');
    
    // Check success message
    await expect(page.locator('text=/vault.*created.*successfully|success/i')).toBeVisible({ timeout: 15000 });
    
    // Should redirect to vault details or list
    await expect(page.locator('text="Test Board Vault"')).toBeVisible();
  });

  test('should view vault details', async ({ page }) => {
    // Click on first vault if exists
    const firstVault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await firstVault.count() > 0) {
      await firstVault.click();
      
      // Check vault details page
      await expect(page.locator('text=/vault.*details|overview/i')).toBeVisible();
      
      // Check for vault information sections
      await expect(page.locator('text=/documents|files/i')).toBeVisible();
      await expect(page.locator('text=/members|access/i')).toBeVisible();
      await expect(page.locator('text=/activity|history/i')).toBeVisible();
    }
  });

  test('should upload document to vault', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Find upload button in vault
      await page.click('button:has-text(/upload|add.*document/i)');
      
      // Upload dialog should open
      await expect(page.locator('text=/upload.*to.*vault|add.*files/i')).toBeVisible();
      
      // Set test file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        {
          name: 'board-minutes.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Test board minutes content')
        }
      ]);
      
      // Add metadata
      const titleInput = page.locator('input[name="title"], input[placeholder*="document title" i]');
      if (await titleInput.count() > 0) {
        await titleInput.fill('Q1 Board Minutes');
      }
      
      // Upload
      await page.click('button:has-text(/upload|confirm/i)');
      
      // Check success
      await expect(page.locator('text=/uploaded.*successfully|document.*added/i')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should manage vault members', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Go to members section
      await page.click('text=/members|access.*control/i');
      
      // Add new member
      await page.click('button:has-text(/add.*member|invite/i)');
      
      // Enter member email
      await page.fill('input[type="email"], input[placeholder*="email" i]', 'new.member@example.com');
      
      // Select role
      const roleSelect = page.locator('select[name="role"], [data-testid="member-role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption({ value: 'viewer' });
      }
      
      // Add member
      await page.click('button:has-text(/add|invite|send/i)');
      
      // Check success
      await expect(page.locator('text=/member.*added|invitation.*sent/i')).toBeVisible();
    }
  });

  test('should edit vault settings', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Go to settings
      await page.click('button:has-text(/settings|configure/i)');
      
      // Update vault name
      const nameInput = page.locator('input[name="name"], input[value*="vault" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await nameInput.fill('Updated Vault Name');
      }
      
      // Update description
      const descInput = page.locator('textarea[name="description"]').first();
      if (await descInput.count() > 0) {
        await descInput.clear();
        await descInput.fill('Updated vault description');
      }
      
      // Save changes
      await page.click('button:has-text(/save|update/i)');
      
      // Check success
      await expect(page.locator('text=/updated.*successfully|changes.*saved/i')).toBeVisible();
    }
  });

  test('should delete a vault', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Go to settings
      await page.click('button:has-text(/settings|configure/i)');
      
      // Find delete button (usually in danger zone)
      await page.click('button:has-text(/delete.*vault/i)');
      
      // Confirm deletion
      await expect(page.locator('text=/confirm.*delete|permanent.*action/i')).toBeVisible();
      
      // Type vault name to confirm
      const confirmInput = page.locator('input[placeholder*="type.*name" i]');
      if (await confirmInput.count() > 0) {
        await confirmInput.fill('vault-name');
      }
      
      // Confirm delete
      await page.click('button:has-text(/delete|confirm/i)');
      
      // Check deletion success
      await expect(page.locator('text=/deleted.*successfully|vault.*removed/i')).toBeVisible();
      
      // Should redirect to vaults list
      await expect(page).toHaveURL(/.*vaults/);
    }
  });

  test('should search within vault documents', async ({ page }) => {
    // Navigate to a vault with documents
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Find search input
      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('board minutes');
        await searchInput.press('Enter');
        
        // Check search results
        await page.waitForTimeout(1000);
        await expect(page.locator('text=/results|found|no.*documents/i')).toBeVisible();
      }
    }
  });

  test('should view vault activity log', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Go to activity/history tab
      await page.click('text=/activity|history|audit/i');
      
      // Check activity log is displayed
      await expect(page.locator('text=/recent.*activity|audit.*log/i')).toBeVisible();
      
      // Check for activity entries
      const activityEntries = page.locator('.activity-entry, [data-testid="activity-item"], .log-entry');
      if (await activityEntries.count() > 0) {
        await expect(activityEntries.first()).toBeVisible();
      } else {
        await expect(page.locator('text=/no.*activity|empty/i')).toBeVisible();
      }
    }
  });

  test('should export vault contents', async ({ page }) => {
    // Navigate to a vault
    const vault = page.locator('.vault-card, [data-testid="vault-item"]').first();
    
    if (await vault.count() > 0) {
      await vault.click();
      
      // Find export button
      const exportButton = page.locator('button:has-text(/export|download.*all/i)');
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Check export options
        await expect(page.locator('text=/export.*format|choose.*format/i')).toBeVisible();
        
        // Select export format
        await page.click('text=/zip|pdf/i');
        
        // Start export
        await page.click('button:has-text(/export|download/i)');
        
        // Check export started
        await expect(page.locator('text=/preparing|generating|download.*will.*start/i')).toBeVisible();
      }
    }
  });
});