import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'
import path from 'path'
import fs from 'fs'

/**
 * Asset Upload and Vault Management E2E Tests with MCP Integration
 * 
 * Tests cover:
 * - File upload functionality
 * - Vault creation and management
 * - Asset sharing and permissions
 * - Document versioning
 * - Email-to-asset processing
 * - Bulk operations
 */

test.describe('Asset and Vault Management', () => {
  let helper: MCPTestHelper
  
  test.beforeEach(async ({ page, context }) => {
    helper = new MCPTestHelper(page, context)
    await helper.login()
    await page.goto('/dashboard/assets')
    await helper.waitForAppReady()
  })
  
  test('upload single file', async ({ page }) => {
    // Click upload button
    await helper.smartClick('button:has-text("Upload"), [data-testid="upload-asset"]')
    
    // Create a test file
    const testFileName = `test-document-${Date.now()}.pdf`
    const testFilePath = path.join('/tmp', testFileName)
    fs.writeFileSync(testFilePath, 'Test PDF content for MCP E2E testing')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)
    
    // Fill metadata
    await helper.smartFill('#assetTitle, input[name="title"]', `Test Document ${Date.now()}`)
    await helper.smartFill('#assetDescription, textarea[name="description"]', 'Document uploaded via MCP E2E test')
    
    // Add tags
    const tagsInput = page.locator('#assetTags, input[name="tags"]')
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('test')
      await page.keyboard.press('Enter')
      await tagsInput.fill('e2e')
      await page.keyboard.press('Enter')
      await tagsInput.fill('mcp')
      await page.keyboard.press('Enter')
    }
    
    // Select vault
    const vaultSelect = page.locator('#vaultId, select[name="vault"]')
    if (await vaultSelect.isVisible()) {
      const options = await vaultSelect.locator('option').allTextContents()
      if (options.length > 1) {
        await vaultSelect.selectOption({ index: 1 })
      }
    }
    
    // Upload
    await helper.smartClick('button:has-text("Upload"), button[type="submit"]')
    
    // Verify upload success
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/uploaded|success/i)
    
    // Verify file appears in list
    await expect(page.locator(`text="${testFileName}"`)).toBeVisible({ timeout: 10000 })
    
    // Clean up
    fs.unlinkSync(testFilePath)
    
    // Take screenshot
    await helper.takeAnnotatedScreenshot('file-uploaded', [
      { selector: `text="${testFileName}"`, text: 'Uploaded file' },
    ])
  })
  
  test('bulk file upload', async ({ page }) => {
    // Click bulk upload
    await helper.smartClick('button:has-text("Bulk Upload"), [data-testid="bulk-upload"]')
    
    // Create multiple test files
    const testFiles = []
    for (let i = 0; i < 3; i++) {
      const fileName = `bulk-test-${i}-${Date.now()}.pdf`
      const filePath = path.join('/tmp', fileName)
      fs.writeFileSync(filePath, `Test content for file ${i}`)
      testFiles.push(filePath)
    }
    
    // Upload files
    const fileInput = page.locator('input[type="file"][multiple]')
    await fileInput.setInputFiles(testFiles)
    
    // Set bulk metadata
    const bulkVault = page.locator('#bulkVault, select[name="bulkVault"]')
    if (await bulkVault.isVisible()) {
      const options = await bulkVault.locator('option').allTextContents()
      if (options.length > 1) {
        await bulkVault.selectOption({ index: 1 })
      }
    }
    
    // Add bulk tags
    const bulkTags = page.locator('#bulkTags, input[name="bulkTags"]')
    if (await bulkTags.isVisible()) {
      await bulkTags.fill('bulk-upload')
      await page.keyboard.press('Enter')
    }
    
    // Start upload
    await helper.smartClick('button:has-text("Upload All"), button[type="submit"]')
    
    // Wait for uploads to complete
    await page.waitForTimeout(3000)
    
    // Verify all files uploaded
    for (const file of testFiles) {
      const fileName = path.basename(file)
      await expect(page.locator(`text="${fileName}"`)).toBeVisible()
      fs.unlinkSync(file)
    }
  })
  
  test('create new vault', async ({ page }) => {
    // Navigate to vaults
    await page.goto('/dashboard/vaults')
    await helper.waitForAppReady()
    
    // Click create vault
    await helper.smartClick('button:has-text("Create Vault"), [data-testid="create-vault"]')
    
    // Fill vault details
    const vaultData = helper.generateTestData('vault')
    
    await helper.smartFill('#vaultName, input[name="name"]', vaultData.name)
    await helper.smartFill('#vaultDescription, textarea[name="description"]', vaultData.description)
    
    // Set privacy
    const privacyToggle = page.locator('#isPublic, input[name="isPublic"]')
    if (await privacyToggle.isVisible() && !vaultData.isPublic) {
      await privacyToggle.uncheck()
    }
    
    // Create vault
    await helper.smartClick('button:has-text("Create"), button[type="submit"]')
    
    // Verify vault created
    await expect(page.locator(`text="${vaultData.name}"`)).toBeVisible()
    
    // Take screenshot
    await helper.takeAnnotatedScreenshot('vault-created', [
      { selector: `text="${vaultData.name}"`, text: 'New vault' },
    ])
  })
  
  test('share asset with users', async ({ page }) => {
    // Find first asset
    const assetCard = page.locator('.asset-card, [data-testid="asset-item"]').first()
    
    // Click share button
    await assetCard.locator('button:has-text("Share"), [data-testid="share-asset"]').click()
    
    // Add recipients
    const recipientInput = page.locator('#shareRecipients, input[name="recipients"]')
    await helper.smartFill(recipientInput, 'board.member@appboardguru.com')
    await page.keyboard.press('Enter')
    
    // Set permissions
    const permissionSelect = page.locator('#sharePermission, select[name="permission"]')
    if (await permissionSelect.isVisible()) {
      await permissionSelect.selectOption('view')
    }
    
    // Add message
    await helper.smartFill('#shareMessage, textarea[name="message"]', 'Please review this document for the upcoming board meeting')
    
    // Set expiration
    const expirationInput = page.locator('#shareExpiration, input[name="expiration"]')
    if (await expirationInput.isVisible()) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      await expirationInput.fill(futureDate.toISOString().split('T')[0])
    }
    
    // Share
    await helper.smartClick('button:has-text("Share"), button[type="submit"]')
    
    // Verify share success
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/shared/i)
  })
  
  test('manage vault permissions', async ({ page }) => {
    // Navigate to vaults
    await page.goto('/dashboard/vaults')
    await helper.waitForAppReady()
    
    // Click first vault
    await page.locator('.vault-card, [data-testid="vault-item"]').first().click()
    
    // Go to permissions tab
    await helper.smartClick('button:has-text("Permissions"), [data-testid="vault-permissions"]')
    
    // Add member to vault
    await helper.smartClick('button:has-text("Add Member"), [data-testid="add-vault-member"]')
    
    // Select user
    const userSelect = page.locator('#vaultMember, select[name="member"]')
    if (await userSelect.isVisible()) {
      const options = await userSelect.locator('option').allTextContents()
      if (options.length > 1) {
        await userSelect.selectOption({ index: 1 })
      }
    }
    
    // Set role
    const roleSelect = page.locator('#memberRole, select[name="role"]')
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('editor')
    }
    
    // Add member
    await helper.smartClick('button:has-text("Add"), button[type="submit"]')
    
    // Verify member added
    await expect(page.locator('.member-list, [data-testid="vault-members"]')).toContainText(/editor/i)
  })
  
  test('document versioning', async ({ page }) => {
    // Find and click first asset
    const assetCard = page.locator('.asset-card, [data-testid="asset-item"]').first()
    const assetName = await assetCard.locator('.asset-name, [data-testid="asset-name"]').textContent()
    await assetCard.click()
    
    // Upload new version
    await helper.smartClick('button:has-text("Upload New Version"), [data-testid="upload-version"]')
    
    // Create new version file
    const versionFilePath = path.join('/tmp', `version-2-${Date.now()}.pdf`)
    fs.writeFileSync(versionFilePath, 'Updated content for version 2')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(versionFilePath)
    
    // Add version notes
    await helper.smartFill('#versionNotes, textarea[name="notes"]', 'Updated with latest board feedback')
    
    // Upload version
    await helper.smartClick('button:has-text("Upload"), button[type="submit"]')
    
    // Verify new version
    await expect(page.locator('text="Version 2", text="v2"')).toBeVisible()
    
    // View version history
    await helper.smartClick('button:has-text("Version History"), [data-testid="version-history"]')
    
    // Verify versions listed
    await expect(page.locator('.version-item, [data-testid="version-entry"]')).toHaveCount(2)
    
    // Clean up
    fs.unlinkSync(versionFilePath)
  })
  
  test('email to asset processing', async ({ page }) => {
    // Navigate to email assets
    await page.goto('/dashboard/assets/email')
    await helper.waitForAppReady()
    
    // Check email processing logs
    const logsSection = page.locator('.email-logs, [data-testid="email-processing-logs"]')
    
    if (await logsSection.isVisible()) {
      // Verify log entries
      const logEntries = logsSection.locator('.log-entry, [data-testid="email-log"]')
      const count = await logEntries.count()
      
      if (count > 0) {
        // Check first log entry
        const firstLog = logEntries.first()
        await expect(firstLog).toContainText(/processed|success|failed/i)
        
        // Click to view details
        await firstLog.click()
        
        // Verify details modal
        await expect(page.locator('.log-details, [data-testid="log-details"]')).toBeVisible()
      }
    }
    
    // Check email stats
    await helper.smartClick('button:has-text("View Stats"), [data-testid="email-stats"]')
    
    if (await page.locator('.stats-dashboard').isVisible()) {
      // Verify stats are displayed
      await expect(page.locator('.total-processed, [data-testid="total-emails"]')).toBeVisible()
      await expect(page.locator('.success-rate, [data-testid="success-rate"]')).toBeVisible()
    }
  })
  
  test('asset search and filtering', async ({ page }) => {
    // Use search bar
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="asset-search"]')
    await helper.smartFill(searchInput, 'board')
    await page.keyboard.press('Enter')
    
    // Wait for results
    await page.waitForTimeout(1000)
    
    // Apply filters
    const filterButton = page.locator('button:has-text("Filters"), [data-testid="filter-toggle"]')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // Filter by type
      const typeFilter = page.locator('#filterType, select[name="fileType"]')
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('pdf')
      }
      
      // Filter by date
      const dateFilter = page.locator('#filterDate, input[name="dateFrom"]')
      if (await dateFilter.isVisible()) {
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        await dateFilter.fill(lastWeek.toISOString().split('T')[0])
      }
      
      // Apply filters
      await helper.smartClick('button:has-text("Apply"), [data-testid="apply-filters"]')
    }
    
    // Verify filtered results
    const results = page.locator('.asset-card, [data-testid="asset-item"]')
    const resultCount = await results.count()
    
    // Check each result matches filter
    for (let i = 0; i < Math.min(resultCount, 3); i++) {
      const result = results.nth(i)
      const fileType = await result.locator('.file-type, [data-testid="file-type"]').textContent()
      expect(fileType?.toLowerCase()).toContain('pdf')
    }
  })
  
  test('asset annotations and comments', async ({ page }) => {
    // Click first asset
    await page.locator('.asset-card, [data-testid="asset-item"]').first().click()
    
    // Add annotation
    await helper.smartClick('button:has-text("Add Comment"), [data-testid="add-annotation"]')
    
    // Fill comment
    await helper.smartFill('#commentText, textarea[name="comment"]', 'Please review section 3.2 for accuracy')
    
    // Add comment
    await helper.smartClick('button:has-text("Post"), button[type="submit"]')
    
    // Verify comment added
    await expect(page.locator('text="Please review section 3.2"')).toBeVisible()
    
    // Reply to comment
    const replyButton = page.locator('button:has-text("Reply"), [data-testid="reply-comment"]').first()
    if (await replyButton.isVisible()) {
      await replyButton.click()
      await helper.smartFill('#replyText, textarea[name="reply"]', 'Section verified and approved')
      await helper.smartClick('button:has-text("Reply"), button[type="submit"]')
    }
    
    // Resolve comment thread
    const resolveButton = page.locator('button:has-text("Resolve"), [data-testid="resolve-thread"]')
    if (await resolveButton.isVisible()) {
      await resolveButton.click()
      await expect(page.locator('.resolved-badge, [data-testid="resolved"]')).toBeVisible()
    }
  })
  
  test('asset download and export', async ({ page }) => {
    // Find first asset
    const assetCard = page.locator('.asset-card, [data-testid="asset-item"]').first()
    
    // Download single asset
    const downloadButton = assetCard.locator('button:has-text("Download"), [data-testid="download-asset"]')
    
    // Start download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ])
    
    // Verify download started
    expect(download).toBeTruthy()
    
    // Check download path
    const path = await download.path()
    expect(path).toBeTruthy()
    
    // Bulk download
    await page.goto('/dashboard/assets')
    
    // Select multiple assets
    const checkboxes = page.locator('input[type="checkbox"][data-testid="asset-checkbox"]')
    const checkCount = Math.min(await checkboxes.count(), 3)
    
    for (let i = 0; i < checkCount; i++) {
      await checkboxes.nth(i).check()
    }
    
    // Click bulk download
    await helper.smartClick('button:has-text("Download Selected"), [data-testid="bulk-download"]')
    
    // Verify bulk download initiated
    await expect(page.locator('.download-progress, [role="status"]')).toContainText(/downloading/i)
  })
  
  test('vault archival and restoration', async ({ page }) => {
    // Navigate to vaults
    await page.goto('/dashboard/vaults')
    
    // Create test vault to archive
    await helper.smartClick('button:has-text("Create Vault")')
    const vaultName = `Archive Test ${Date.now()}`
    await helper.smartFill('#vaultName', vaultName)
    await helper.smartClick('button[type="submit"]')
    
    // Wait for vault creation
    await page.waitForTimeout(2000)
    
    // Find and click the vault
    await page.locator(`text="${vaultName}"`).click()
    
    // Archive vault
    await helper.smartClick('button:has-text("Archive Vault"), [data-testid="archive-vault"]')
    
    // Confirm archival
    const confirmButton = page.locator('button:has-text("Confirm"), [data-testid="confirm-archive"]')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    // Verify vault archived
    await expect(page.locator('.success-message')).toContainText(/archived/i)
    
    // View archived vaults
    await helper.smartClick('button:has-text("Show Archived"), [data-testid="show-archived"]')
    
    // Find archived vault
    await expect(page.locator(`text="${vaultName}"`)).toBeVisible()
    
    // Restore vault
    const restoreButton = page.locator(`[data-vault-name="${vaultName}"]`).locator('button:has-text("Restore")')
    if (await restoreButton.isVisible()) {
      await restoreButton.click()
      await expect(page.locator('.success-message')).toContainText(/restored/i)
    }
  })
})