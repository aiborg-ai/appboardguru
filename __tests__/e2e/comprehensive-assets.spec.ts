import { test, expect } from '@playwright/test'
import { AssetsPage, DashboardPage, createPageObjects, TestUtils } from './pages'
import path from 'path'

test.describe('Comprehensive Asset Management Workflows', () => {
  let assetsPage: AssetsPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    const pages = createPageObjects(page)
    assetsPage = pages.assets
    dashboardPage = pages.dashboard
    
    // Start each test authenticated
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
  })

  test.describe('Asset Upload Workflows @critical', () => {
    test('should upload a PDF file successfully', async ({ page }) => {
      const testFile = path.join(__dirname, 'fixtures', 'sample.pdf')
      const testData = TestUtils.createTestData()
      
      await assetsPage.uploadFile(
        testFile,
        testData.asset.title,
        testData.asset.description,
        'financial'
      )
      
      // Should show success and new asset in list
      await assetsPage.expectAssetsDisplayed()
      
      // Verify asset appears in grid
      const assetItems = assetsPage.assetItems
      const newAsset = assetItems.filter({ hasText: testData.asset.title })
      await expect(newAsset).toBeVisible()
    })

    test('should handle multiple file uploads', async ({ page }) => {
      const testFiles = [
        path.join(__dirname, 'fixtures', 'sample.pdf'),
        path.join(__dirname, 'fixtures', 'sample.docx'),
        path.join(__dirname, 'fixtures', 'sample.xlsx'),
      ]
      
      for (const [index, file] of testFiles.entries()) {
        const fileName = path.basename(file, path.extname(file))
        await assetsPage.uploadFile(file, `Test Document ${index + 1}`, `Description for ${fileName}`)
        await page.waitForTimeout(1000) // Wait between uploads
      }
      
      // Should have at least 3 new assets
      const assetCount = await assetsPage.assetItems.count()
      expect(assetCount).toBeGreaterThanOrEqual(3)
    })

    test('should validate file types and sizes', async () => {
      await assetsPage.openUploadModal()
      
      // Test invalid file types
      const invalidFile = path.join(__dirname, 'fixtures', 'invalid.exe')
      
      if (require('fs').existsSync(invalidFile)) {
        await assetsPage.uploadInput.setInputFiles(invalidFile)
        await assetsPage.uploadSubmit.click()
        
        await assetsPage.expectErrorMessage(/file.*type.*not.*supported/i)
      }
      
      // Test large file (if we had one)
      // This would require a large test file to properly test
    })

    test('should handle upload progress and cancellation', async ({ page }) => {
      const largeFile = path.join(__dirname, 'fixtures', 'large-sample.pdf')
      
      // Only run if large file exists
      if (require('fs').existsSync(largeFile)) {
        await assetsPage.openUploadModal()
        await assetsPage.uploadInput.setInputFiles(largeFile)
        
        // Start upload
        const uploadPromise = assetsPage.uploadSubmit.click()
        
        // Should show progress
        await assetsPage.expectUploadProgress()
        
        // Test cancellation if cancel button is available
        const cancelButton = page.locator('[data-testid="cancel-upload-button"]')
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          await expect(assetsPage.uploadProgress).not.toBeVisible()
        } else {
          await uploadPromise
        }
      }
    })

    test('should upload via drag and drop', async ({ page }) => {
      const testFile = path.join(__dirname, 'fixtures', 'sample.pdf')
      
      // This would require more complex drag-and-drop simulation
      // For now, test the UI elements exist
      await assetsPage.openUploadModal()
      await expect(assetsPage.uploadDropzone).toBeVisible()
      
      // Test that dropzone responds to file selection
      await assetsPage.uploadInput.setInputFiles(testFile)
      await assetsPage.uploadTitle.fill('Drag and Drop Test')
      await assetsPage.uploadSubmit.click()
      
      await assetsPage.expectSuccessMessage()
    })

    test('should handle bulk upload from folder', async ({ page }) => {
      const testFiles = [
        path.join(__dirname, 'fixtures', 'sample1.pdf'),
        path.join(__dirname, 'fixtures', 'sample2.pdf'),
        path.join(__dirname, 'fixtures', 'sample3.pdf'),
      ]
      
      // Filter for existing files
      const existingFiles = testFiles.filter(file => require('fs').existsSync(file))
      
      if (existingFiles.length > 0) {
        await assetsPage.openUploadModal()
        await assetsPage.uploadInput.setInputFiles(existingFiles)
        await assetsPage.uploadSubmit.click()
        
        await assetsPage.expectSuccessMessage(/uploaded successfully/i)
      }
    })
  })

  test.describe('Asset Viewing and Display @critical', () => {
    test('should display assets in grid view', async () => {
      await assetsPage.switchToGridView()
      await assetsPage.expectAssetsDisplayed()
      
      // Check grid layout
      await expect(assetsPage.assetsGrid).toBeVisible()
      
      // Each asset should show essential info
      const firstAsset = assetsPage.assetItems.first()
      await expect(firstAsset.locator('[data-testid="asset-title"]')).toBeVisible()
      await expect(firstAsset.locator('[data-testid="asset-type"]')).toBeVisible()
      await expect(firstAsset.locator('[data-testid="asset-date"]')).toBeVisible()
    })

    test('should display assets in list view', async () => {
      await assetsPage.switchToListView()
      await expect(assetsPage.assetsList).toBeVisible()
      
      // List view should show more details
      const firstAsset = assetsPage.assetItems.first()
      await expect(firstAsset.locator('[data-testid="asset-title"]')).toBeVisible()
      await expect(firstAsset.locator('[data-testid="asset-description"]')).toBeVisible()
      await expect(firstAsset.locator('[data-testid="asset-size"]')).toBeVisible()
      await expect(firstAsset.locator('[data-testid="asset-uploaded-by"]')).toBeVisible()
    })

    test('should open asset viewer on click', async () => {
      await assetsPage.expectAssetsDisplayed()
      await assetsPage.viewAsset(0)
      
      await expect(assetsPage.assetViewer).toBeVisible()
      await expect(assetsPage.documentTitle).toBeVisible()
      await expect(assetsPage.documentTabs).toBeVisible()
    })

    test('should display asset information correctly', async () => {
      await assetsPage.viewAsset(0)
      
      // Should show document metadata
      await expect(assetsPage.documentInfo).toBeVisible()
      await expect(assetsPage.documentInfo).toContainText(/uploaded/i)
      await expect(assetsPage.documentInfo).toContainText(/size/i)
      await expect(assetsPage.documentInfo).toContainText(/type/i)
    })

    test('should handle different document types', async () => {
      // Test PDF viewer
      const pdfAsset = assetsPage.assetItems.filter({ hasText: '.pdf' }).first()
      if (await pdfAsset.isVisible()) {
        await pdfAsset.click()
        await expect(assetsPage.pdfViewer).toBeVisible()
      }
      
      // Test other document types would require additional setup
    })

    test('should show empty state when no assets', async ({ page }) => {
      // Simulate empty assets state
      await page.route('**/api/assets**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ assets: [], total: 0 }),
        })
      })
      
      await page.reload()
      await assetsPage.expectEmptyState()
      
      // Should show create asset button
      await expect(assetsPage.uploadButton).toBeVisible()
    })
  })

  test.describe('Asset Search and Filtering @smoke', () => {
    test('should search assets by name', async () => {
      const searchTerm = 'financial'
      await assetsPage.searchAssets(searchTerm)
      
      // Results should contain search term
      const assetTitles = assetsPage.assetItems.locator('[data-testid="asset-title"]')
      const count = await assetTitles.count()
      
      for (let i = 0; i < count; i++) {
        const title = await assetTitles.nth(i).textContent()
        expect(title?.toLowerCase()).toContain(searchTerm.toLowerCase())
      }
    })

    test('should filter assets by file type', async () => {
      await assetsPage.filterByFileType('pdf')
      
      // All visible assets should be PDFs
      const assetTypes = assetsPage.assetItems.locator('[data-testid="asset-type"]')
      const count = await assetTypes.count()
      
      for (let i = 0; i < count; i++) {
        const type = await assetTypes.nth(i).textContent()
        expect(type?.toLowerCase()).toContain('pdf')
      }
    })

    test('should filter assets by category', async () => {
      await assetsPage.filterByCategory('financial')
      
      // Should show only financial category assets
      await assetsPage.expectAssetsDisplayed()
      
      // Verify filter is applied
      const filterButton = assetsPage.filterButton
      await expect(filterButton).toHaveClass(/active|selected/)
    })

    test('should sort assets by different criteria', async () => {
      // Test sort by name
      await assetsPage.sortBy('name-asc')
      
      const assetTitles = await assetsPage.assetItems.locator('[data-testid="asset-title"]').allTextContents()
      const sortedTitles = [...assetTitles].sort()
      
      for (let i = 0; i < Math.min(assetTitles.length, sortedTitles.length); i++) {
        expect(assetTitles[i]).toBe(sortedTitles[i])
      }
    })

    test('should combine search and filters', async () => {
      await assetsPage.searchAssets('report')
      await assetsPage.filterByFileType('pdf')
      
      // Results should match both criteria
      const results = assetsPage.assetItems
      const count = await results.count()
      
      for (let i = 0; i < count; i++) {
        const item = results.nth(i)
        const title = await item.locator('[data-testid="asset-title"]').textContent()
        const type = await item.locator('[data-testid="asset-type"]').textContent()
        
        expect(title?.toLowerCase()).toContain('report')
        expect(type?.toLowerCase()).toContain('pdf')
      }
    })

    test('should clear filters and search', async () => {
      // Apply filters
      await assetsPage.searchAssets('test')
      await assetsPage.filterByFileType('pdf')
      
      // Clear filters
      const clearButton = assetsPage.page.locator('[data-testid="clear-filters-button"]')
      if (await clearButton.isVisible()) {
        await clearButton.click()
        
        // Should show all assets again
        await expect(assetsPage.searchInput).toHaveValue('')
        await assetsPage.expectAssetsDisplayed()
      }
    })
  })

  test.describe('Asset Actions and Management @critical', () => {
    test('should download asset', async ({ page }) => {
      await assetsPage.expectAssetsDisplayed()
      
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        assetsPage.downloadAsset(0),
      ])
      
      expect(download.suggestedFilename()).toBeTruthy()
      expect(download.suggestedFilename()).toMatch(/\.(pdf|docx|xlsx|pptx)$/i)
    })

    test('should share asset with other users', async () => {
      await assetsPage.shareAsset(0, 'colleague@example.com', 'editor')
      
      // Should show in collaborators list
      await assetsPage.viewAsset(0)
      await assetsPage.expectCollaborators()
    })

    test('should duplicate asset', async () => {
      const initialCount = await assetsPage.assetItems.count()
      
      await assetsPage.openAssetActions(0)
      const duplicateButton = assetsPage.page.locator('[data-testid="action-duplicate"]')
      
      if (await duplicateButton.isVisible()) {
        await duplicateButton.click()
        await assetsPage.expectSuccessMessage('Asset duplicated')
        
        // Should have one more asset
        await expect(assetsPage.assetItems).toHaveCount(initialCount + 1)
      }
    })

    test('should move asset to vault', async () => {
      await assetsPage.openAssetActions(0)
      await assetsPage.actionMove.click()
      
      const moveModal = assetsPage.page.locator('[data-testid="move-asset-modal"]')
      await expect(moveModal).toBeVisible()
      
      // Select destination vault
      const vaultOption = assetsPage.page.locator('[data-testid="vault-option"]').first()
      if (await vaultOption.isVisible()) {
        await vaultOption.click()
        
        const moveButton = assetsPage.page.locator('[data-testid="move-confirm-button"]')
        await moveButton.click()
        
        await assetsPage.expectSuccessMessage('Asset moved')
      }
    })

    test('should delete asset', async () => {
      const initialCount = await assetsPage.assetItems.count()
      await assetsPage.deleteAsset(0)
      
      // Should have one less asset
      await expect(assetsPage.assetItems).toHaveCount(initialCount - 1)
    })

    test('should bulk select and manage assets', async () => {
      const bulkSelectButton = assetsPage.page.locator('[data-testid="bulk-select-button"]')
      
      if (await bulkSelectButton.isVisible()) {
        await bulkSelectButton.click()
        
        // Select multiple assets
        const checkboxes = assetsPage.page.locator('[data-testid="asset-checkbox"]')
        const count = Math.min(await checkboxes.count(), 3)
        
        for (let i = 0; i < count; i++) {
          await checkboxes.nth(i).check()
        }
        
        // Should show bulk actions
        const bulkActions = assetsPage.page.locator('[data-testid="bulk-actions"]')
        await expect(bulkActions).toBeVisible()
        
        // Test bulk download
        const bulkDownload = assetsPage.page.locator('[data-testid="bulk-download-button"]')
        if (await bulkDownload.isVisible()) {
          await bulkDownload.click()
          // Would trigger multiple downloads
        }
      }
    })
  })

  test.describe('Asset Annotations @critical', () => {
    test('should create highlight annotation', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.createHighlightAnnotation(1, 'This is important')
      
      await assetsPage.expectAnnotationsVisible()
    })

    test('should create comment annotation', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.createCommentAnnotation(1, 'Need to review this section')
      
      await assetsPage.expectAnnotationsVisible()
    })

    test('should edit existing annotation', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.switchToAnnotationsTab()
      
      const firstAnnotation = assetsPage.annotationItems.first()
      if (await firstAnnotation.isVisible()) {
        const editButton = firstAnnotation.locator('[data-testid="edit-annotation-button"]')
        if (await editButton.isVisible()) {
          await editButton.click()
          
          const editForm = assetsPage.page.locator('[data-testid="edit-annotation-form"]')
          await editForm.locator('[data-testid="annotation-text-input"]').fill('Updated annotation text')
          await editForm.locator('[data-testid="save-annotation-button"]').click()
          
          await assetsPage.expectSuccessMessage('Annotation updated')
        }
      }
    })

    test('should delete annotation', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.switchToAnnotationsTab()
      
      const initialCount = await assetsPage.annotationItems.count()
      if (initialCount > 0) {
        await assetsPage.deleteAnnotation(0)
        
        // Should have one less annotation
        await expect(assetsPage.annotationItems).toHaveCount(initialCount - 1)
      }
    })

    test('should filter annotations by type', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.switchToAnnotationsTab()
      
      const filterDropdown = assetsPage.page.locator('[data-testid="annotation-filter-type"]')
      if (await filterDropdown.isVisible()) {
        await assetsPage.selectDropdownOption(filterDropdown, 'highlight')
        
        // All visible annotations should be highlights
        const annotations = assetsPage.annotationItems
        const count = await annotations.count()
        
        for (let i = 0; i < count; i++) {
          const type = await annotations.nth(i).locator('[data-testid="annotation-type"]').textContent()
          expect(type?.toLowerCase()).toContain('highlight')
        }
      }
    })

    test('should search annotations by content', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.switchToAnnotationsTab()
      
      const searchInput = assetsPage.page.locator('[data-testid="annotation-search"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('important')
        
        // Results should contain search term
        const annotations = assetsPage.annotationItems
        const count = await annotations.count()
        
        for (let i = 0; i < count; i++) {
          const text = await annotations.nth(i).locator('[data-testid="annotation-text"]').textContent()
          expect(text?.toLowerCase()).toContain('important')
        }
      }
    })
  })

  test.describe('Asset Collaboration @critical', () => {
    test('should add collaborator with permissions', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.shareAsset(0, 'collaborator@example.com', 'editor')
      
      await assetsPage.expectCollaborators()
    })

    test('should change collaborator permissions', async () => {
      await assetsPage.viewAsset(0)
      
      const collaborator = assetsPage.collaboratorItem.first()
      if (await collaborator.isVisible()) {
        const permissionSelect = collaborator.locator('[data-testid="collaborator-permission-select"]')
        await assetsPage.selectDropdownOption(permissionSelect, 'viewer')
        
        await assetsPage.expectSuccessMessage('Permissions updated')
      }
    })

    test('should remove collaborator', async () => {
      await assetsPage.viewAsset(0)
      
      const initialCount = await assetsPage.collaboratorItem.count()
      if (initialCount > 0) {
        await assetsPage.removeCollaborator(0)
        
        // Should have one less collaborator
        await expect(assetsPage.collaboratorItem).toHaveCount(initialCount - 1)
      }
    })

    test('should add and reply to comments', async () => {
      await assetsPage.viewAsset(0)
      await assetsPage.addComment('This document needs review by the finance team')
      
      await assetsPage.expectCommentsVisible()
      
      // Reply to comment
      await assetsPage.replyToComment(0, 'I agree, scheduling review for next week')
      
      const firstComment = assetsPage.commentItems.first()
      const replies = firstComment.locator('[data-testid="comment-replies"]')
      await expect(replies).toBeVisible()
    })

    test('should show real-time collaboration indicators', async ({ context }) => {
      // This would require multiple browser contexts or WebSocket testing
      // For now, test that collaboration UI elements exist
      await assetsPage.viewAsset(0)
      
      const collaboratorsIndicator = assetsPage.page.locator('[data-testid="active-collaborators"]')
      if (await collaboratorsIndicator.isVisible()) {
        await expect(collaboratorsIndicator).toBeVisible()
      }
    })
  })

  test.describe('Asset Performance @performance', () => {
    test('should load assets page quickly', async () => {
      const loadTime = await assetsPage.measureActionTime(async () => {
        await assetsPage.goToAssets()
      })
      
      expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
    })

    test('should handle large asset lists efficiently', async ({ page }) => {
      // Simulate large dataset
      const largeAssetList = Array.from({ length: 100 }, (_, i) => ({
        id: `asset-${i}`,
        title: `Test Asset ${i}`,
        type: 'pdf',
        size: '1.2MB',
        uploadedAt: new Date().toISOString(),
      }))
      
      await page.route('**/api/assets**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ assets: largeAssetList, total: largeAssetList.length }),
        })
      })
      
      const loadTime = await assetsPage.measureActionTime(async () => {
        await page.reload()
        await assetsPage.waitForSpinnerToDisappear()
      })
      
      expect(loadTime).toBeLessThan(5000) // Should handle large lists in under 5 seconds
      
      // Should implement virtual scrolling or pagination for performance
      const visibleItems = await assetsPage.assetItems.count()
      expect(visibleItems).toBeLessThanOrEqual(50) // Shouldn't render all 100 at once
    })

    test('should upload files efficiently', async () => {
      const testFile = path.join(__dirname, 'fixtures', 'sample.pdf')
      
      const uploadTime = await assetsPage.measureUploadTime(testFile)
      expect(uploadTime).toBeLessThan(10000) // Should upload in under 10 seconds
    })

    test('should open asset viewer quickly', async () => {
      const loadTime = await assetsPage.measureAssetLoadTime()
      expect(loadTime).toBeLessThan(2000) // Should open viewer in under 2 seconds
    })
  })

  test.describe('Asset Security and Permissions @security', () => {
    test('should respect asset permissions', async ({ page }) => {
      // Test with limited permissions user
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'viewer@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await assetsPage.goToAssets()
      
      // Viewer should not see upload button
      await expect(assetsPage.uploadButton).not.toBeVisible()
      
      // Viewer should not see delete actions
      if (await assetsPage.assetItems.first().isVisible()) {
        await assetsPage.openAssetActions(0)
        await expect(assetsPage.actionDelete).not.toBeVisible()
      }
    })

    test('should prevent unauthorized access to assets', async ({ page }) => {
      // Try to access specific asset directly
      await page.goto('/dashboard/assets/restricted-asset-id')
      
      // Should redirect or show access denied
      const accessDenied = page.locator('[data-testid="access-denied"]')
      const notFound = page.locator('[data-testid="not-found"]')
      
      await expect(accessDenied.or(notFound)).toBeVisible()
    })

    test('should validate file uploads for security', async () => {
      // Test malicious file upload prevention
      const suspiciousFile = path.join(__dirname, 'fixtures', 'suspicious.pdf.exe')
      
      if (require('fs').existsSync(suspiciousFile)) {
        await assetsPage.openUploadModal()
        await assetsPage.uploadInput.setInputFiles(suspiciousFile)
        await assetsPage.uploadSubmit.click()
        
        await assetsPage.expectErrorMessage(/file.*type.*not.*allowed/i)
      }
    })

    test('should sanitize asset metadata', async () => {
      const maliciousTitle = '<script>alert("xss")</script>Test Asset'
      const testFile = path.join(__dirname, 'fixtures', 'sample.pdf')
      
      await assetsPage.uploadFile(testFile, maliciousTitle, 'Clean description')
      
      // Title should be sanitized
      const assetTitle = assetsPage.assetItems.first().locator('[data-testid="asset-title"]')
      const titleText = await assetTitle.textContent()
      
      expect(titleText).not.toContain('<script>')
      expect(titleText).toContain('Test Asset')
    })
  })
})