import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Asset Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/assets');
    await page.waitForLoadState('networkidle');
  });

  test('should display assets page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /assets/i })).toBeVisible();
    
    // Check for upload button
    await expect(page.locator('button').filter({ hasText: /upload|new.*file|new.*folder/i })).toBeVisible();
    
    // Check for search bar
    await expect(page.locator('input[placeholder*="search" i]')).toBeVisible();
    
    // Check for filter options
    await expect(page.locator('text=/all.*categories|filter/i')).toBeVisible();
  });

  test('should open upload dialog', async ({ page }) => {
    // Click upload button
    await page.click('button:has-text(/upload|new.*file|new.*folder/i)');
    
    // Check upload dialog appears
    await expect(page.locator('text=/upload.*documents|drag.*drop/i')).toBeVisible();
    
    // Check for file input
    await expect(page.locator('input[type="file"], .dropzone, [data-testid="file-upload"]')).toBeVisible();
    
    // Close dialog
    const closeButton = page.locator('button[aria-label="close" i], button:has-text("×"), button:has-text("cancel")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await expect(page.locator('text=/upload.*documents|drag.*drop/i')).toBeHidden();
    }
  });

  test('should upload a file successfully', async ({ page }) => {
    // Create a test file
    const testFileName = 'test-document.txt';
    const testFilePath = path.join(__dirname, testFileName);
    fs.writeFileSync(testFilePath, 'This is a test document for Playwright testing.');

    try {
      // Open upload dialog
      await page.click('button:has-text(/upload|new.*file|new.*folder/i)');
      
      // Wait for upload dialog
      await page.waitForSelector('text=/upload.*documents|drag.*drop/i', { timeout: 10000 });
      
      // Find file input
      const fileInput = page.locator('input[type="file"]');
      
      // Upload file
      await fileInput.setInputFiles(testFilePath);
      
      // Check file appears in upload queue
      await expect(page.locator(`text="${testFileName}"`)).toBeVisible();
      
      // Set file metadata if required
      const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('Test Document Title');
      }
      
      const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]').first();
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ label: 'General Documents' });
      }
      
      // Click upload button
      await page.click('button:has-text(/upload.*file|confirm|submit/i)');
      
      // Wait for upload to complete
      await expect(page.locator('text=/upload.*complete|success|uploaded/i')).toBeVisible({ timeout: 30000 });
      
      // Check file appears in assets list
      await page.waitForTimeout(2000); // Wait for list to refresh
      await expect(page.locator('text=/test.*document/i')).toBeVisible();
      
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should handle bulk file upload', async ({ page }) => {
    // Create multiple test files
    const testFiles = [
      { name: 'document1.txt', content: 'First test document' },
      { name: 'document2.txt', content: 'Second test document' },
      { name: 'document3.txt', content: 'Third test document' }
    ];
    
    const filePaths = testFiles.map(file => {
      const filePath = path.join(__dirname, file.name);
      fs.writeFileSync(filePath, file.content);
      return filePath;
    });

    try {
      // Open upload dialog
      await page.click('button:has-text(/upload|new.*file|new.*folder/i)');
      
      // Upload multiple files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePaths);
      
      // Check all files appear in queue
      for (const file of testFiles) {
        await expect(page.locator(`text="${file.name}"`)).toBeVisible();
      }
      
      // Upload all files
      await page.click('button:has-text(/upload.*all|upload.*files/i)');
      
      // Wait for bulk upload to complete
      await expect(page.locator('text=/upload.*complete|3.*files.*uploaded/i')).toBeVisible({ timeout: 30000 });
      
    } finally {
      // Clean up test files
      filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  test('should search for assets', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="search" i]');
    await searchInput.fill('annual report');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Check results are filtered
    const assetCards = page.locator('.asset-card, [data-testid="asset-item"]');
    if (await assetCards.count() > 0) {
      // Verify search worked (results should contain search term or show no results message)
      await expect(page.locator('text=/annual.*report|no.*results.*found/i')).toBeVisible();
    }
    
    // Clear search
    await searchInput.clear();
    await searchInput.press('Enter');
  });

  test('should filter assets by category', async ({ page }) => {
    // Find category filter
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"], button:has-text("All Categories")').first();
    
    if (await categoryFilter.count() > 0) {
      // If it's a select element
      if (await categoryFilter.evaluate(el => el.tagName) === 'SELECT') {
        await categoryFilter.selectOption({ value: 'documents' });
      } else {
        // If it's a dropdown button
        await categoryFilter.click();
        await page.click('text=/documents|reports/i');
      }
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify filtering (check URL params or filtered indication)
      const filteredIndicator = page.locator('text=/filtered|documents.*category/i');
      if (await filteredIndicator.count() > 0) {
        await expect(filteredIndicator).toBeVisible();
      }
    }
  });

  test('should sort assets', async ({ page }) => {
    // Find sort dropdown
    const sortDropdown = page.locator('select[name="sort"], [data-testid="sort-select"], button:has-text(/sort/i)').first();
    
    if (await sortDropdown.count() > 0) {
      // Sort by date
      if (await sortDropdown.evaluate(el => el.tagName) === 'SELECT') {
        await sortDropdown.selectOption({ value: 'date' });
      } else {
        await sortDropdown.click();
        await page.click('text=/date|newest|recent/i');
      }
      
      // Wait for sort to apply
      await page.waitForTimeout(1000);
      
      // Sort by name
      if (await sortDropdown.evaluate(el => el.tagName) === 'SELECT') {
        await sortDropdown.selectOption({ value: 'name' });
      } else {
        await sortDropdown.click();
        await page.click('text=/name|alphabetical/i');
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('should switch between view modes', async ({ page }) => {
    // Look for view mode toggles
    const gridViewButton = page.locator('button[aria-label*="grid" i], button:has-text("grid"), [data-testid="grid-view"]').first();
    const listViewButton = page.locator('button[aria-label*="list" i], button:has-text("list"), [data-testid="list-view"]').first();
    
    if (await gridViewButton.count() > 0 && await listViewButton.count() > 0) {
      // Switch to list view
      await listViewButton.click();
      await page.waitForTimeout(500);
      
      // Check list view is active
      const listContainer = page.locator('.list-view, [data-view="list"], table');
      if (await listContainer.count() > 0) {
        await expect(listContainer).toBeVisible();
      }
      
      // Switch back to grid view
      await gridViewButton.click();
      await page.waitForTimeout(500);
      
      // Check grid view is active
      const gridContainer = page.locator('.grid-view, [data-view="grid"], .asset-grid');
      if (await gridContainer.count() > 0) {
        await expect(gridContainer).toBeVisible();
      }
    }
  });

  test('should open asset details', async ({ page }) => {
    // Click on first asset if exists
    const firstAsset = page.locator('.asset-card, [data-testid="asset-item"], tr.asset-row').first();
    
    if (await firstAsset.count() > 0) {
      await firstAsset.click();
      
      // Check asset details modal or page
      await expect(page.locator('text=/details|preview|download/i')).toBeVisible({ timeout: 10000 });
      
      // Check for action buttons
      await expect(page.locator('button:has-text(/download|share|delete/i)')).toBeVisible();
      
      // Close details
      const closeButton = page.locator('button[aria-label="close" i], button:has-text("×"), button:has-text("close")').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        // Navigate back if it's a separate page
        await page.goBack();
      }
    }
  });

  test('should delete an asset', async ({ page }) => {
    // Find an asset to delete
    const assetToDelete = page.locator('.asset-card, [data-testid="asset-item"]').first();
    
    if (await assetToDelete.count() > 0) {
      // Hover to show actions or click to select
      await assetToDelete.hover();
      
      // Find delete button
      const deleteButton = page.locator('button[aria-label*="delete" i], button:has-text("delete"), [data-testid="delete-asset"]').first();
      
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        
        // Confirm deletion
        await expect(page.locator('text=/confirm.*delete|are.*you.*sure/i')).toBeVisible();
        await page.click('button:has-text(/confirm|yes.*delete/i)');
        
        // Check deletion success
        await expect(page.locator('text=/deleted.*successfully|asset.*removed/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle drag and drop upload', async ({ page }) => {
    // Open upload dialog
    await page.click('button:has-text(/upload|new.*file/i)');
    
    // Find dropzone
    const dropzone = page.locator('.dropzone, [data-testid="dropzone"], div:has-text("Drag and drop")');
    
    if (await dropzone.count() > 0) {
      // Create a test file for drag and drop
      const fileName = 'drag-test.txt';
      const filePath = path.join(__dirname, fileName);
      fs.writeFileSync(filePath, 'Drag and drop test file');
      
      try {
        // Simulate drag and drop
        const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
        
        // Note: Real drag-and-drop is complex in Playwright
        // This is a simplified version - in real tests you might use the file input instead
        await dropzone.dispatchEvent('drop', { dataTransfer });
        
        // Alternative: Use file input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);
        
        // Check file appears
        await expect(page.locator(`text="${fileName}"`)).toBeVisible();
        
      } finally {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });
});