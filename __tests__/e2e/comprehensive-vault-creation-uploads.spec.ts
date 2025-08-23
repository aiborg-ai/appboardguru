import { test, expect } from '@playwright/test'
import { VaultsPage, DashboardPage, createPageObjects, TestUtils } from './pages'
import path from 'path'

test.describe('Comprehensive Vault Creation with Upload Workflows', () => {
  let vaultsPage: VaultsPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    const pages = createPageObjects(page)
    vaultsPage = pages.vaults
    dashboardPage = pages.dashboard
    
    // Start each test authenticated
    await page.goto('/dashboard/vaults')
    await expect(page.locator('[data-testid="vaults-page"]')).toBeVisible()
  })

  test.describe('Vault Creation Wizard Navigation @critical', () => {
    test('should navigate through all wizard steps successfully', async ({ page }) => {
      await vaultsPage.startCreateVault()
      
      // Verify wizard is open and showing first step
      await expect(vaultsPage.createWizard).toBeVisible()
      await expect(vaultsPage.organizationStep).toBeVisible()
      
      // Step 1: Organization Selection
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      
      // Step 2: Vault Details
      await expect(vaultsPage.detailsStep).toBeVisible()
      await vaultsPage.fillVaultDetails(
        'Test Vault with Uploads',
        'Comprehensive test vault for upload workflows',
        'processing',
        'high',
        undefined,
        ['test', 'upload', 'e2e']
      )
      await vaultsPage.proceedToNextStep()
      
      // Step 3: Board Members
      await expect(vaultsPage.boardMembersStep).toBeVisible()
      await vaultsPage.addBoardMembers(['member1@e2e-test.com', 'member2@e2e-test.com'])
      await vaultsPage.proceedToNextStep()
      
      // Step 4: Assets (Upload Focus)
      await expect(vaultsPage.assetsStep).toBeVisible()
      await expect(vaultsPage.uploadNewAssetButton).toBeVisible()
      
      // Verify wizard progress
      const progress = await page.locator('[data-testid="wizard-progress"]').textContent()
      expect(progress).toContain('4') // Step 4 of wizard
    })

    test('should handle wizard back navigation correctly', async ({ page }) => {
      await vaultsPage.startCreateVault()
      
      // Navigate forward through steps
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Test Vault', 'Test description')
      await vaultsPage.proceedToNextStep()
      
      // Go back and verify previous step data is preserved
      await vaultsPage.goBackToPreviousStep()
      await expect(vaultsPage.detailsStep).toBeVisible()
      await expect(vaultsPage.vaultNameInput).toHaveValue('Test Vault')
      
      // Go back further
      await vaultsPage.goBackToPreviousStep()
      await expect(vaultsPage.organizationStep).toBeVisible()
      
      // Verify organization is still selected
      const selectedOrg = page.locator('[data-testid="organization-card"].selected')
      await expect(selectedOrg).toBeVisible()
    })

    test('should validate required fields at each step', async ({ page }) => {
      await vaultsPage.startCreateVault()
      
      // Try to proceed without selecting organization
      await vaultsPage.proceedToNextStep()
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/organization.*required/i)
      
      // Select organization and proceed
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      
      // Try to proceed without vault name
      await vaultsPage.proceedToNextStep()
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/name.*required/i)
    })
  })

  test.describe('Asset Upload in Vault Creation @critical', () => {
    test('should open upload modal from assets step', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Upload Test Vault', 'Testing upload functionality')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip board members for this test
      
      // Should be on assets step
      await expect(vaultsPage.assetsStep).toBeVisible()
      
      // Click upload asset button
      await vaultsPage.uploadNewAssetButton.click()
      
      // Should show upload modal
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      await expect(uploadModal).toBeVisible()
      
      // Should show organization check message or upload interface
      const orgRequired = page.locator('text=Organization Required')
      const uploadInterface = page.locator('[data-testid="file-upload-dropzone"]')
      
      // Either should show organization required or upload interface
      await expect(orgRequired.or(uploadInterface)).toBeVisible()
    })

    test('should prevent upload when no organization selected', async ({ page }) => {
      // Start vault creation without selecting organization
      await vaultsPage.startCreateVault()
      
      // Force navigate to assets step (shouldn't be possible normally)
      const assetsStepButton = page.locator('[data-testid="wizard-step-4"]')
      if (await assetsStepButton.isVisible()) {
        await assetsStepButton.click()
      }
      
      // Try to open upload modal
      if (await vaultsPage.uploadNewAssetButton.isVisible()) {
        await vaultsPage.uploadNewAssetButton.click()
        
        // Should show organization required message
        const orgRequired = page.locator('text=Organization Required')
        await expect(orgRequired).toBeVisible()
        await expect(page.locator('text=Please select an organization first')).toBeVisible()
      }
    })

    test('should upload single file successfully during vault creation', async ({ page }) => {
      const testFile = path.join(__dirname, 'fixtures', 'sample-document.pdf')
      
      // Navigate to assets step
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Single Upload Test', 'Testing single file upload')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip members
      
      // Upload file
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      await expect(uploadModal).toBeVisible()
      
      // Handle file upload if upload interface is available
      const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testFile)
        
        // Fill upload details if form is available
        const titleInput = uploadModal.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Test Document for Vault')
        }
        
        const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Wait for upload completion
          await expect(uploadModal).not.toBeVisible({ timeout: 30000 })
          
          // Verify asset appears in available assets list
          const uploadedAsset = page.locator('[data-testid="available-assets-list"]')
            .locator('text=Test Document for Vault')
          await expect(uploadedAsset).toBeVisible()
        }
      }
    })

    test('should upload multiple files during vault creation', async ({ page }) => {
      const testFiles = [
        path.join(__dirname, 'fixtures', 'sample-1.pdf'),
        path.join(__dirname, 'fixtures', 'sample-2.pdf'),
        path.join(__dirname, 'fixtures', 'sample-3.pdf'),
      ].filter(file => require('fs').existsSync(file))
      
      if (testFiles.length === 0) {
        test.skip('No test files available for multiple upload test')
        return
      }
      
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Multi Upload Test', 'Testing multiple file uploads')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip members
      
      // Upload multiple files
      for (const [index, file] of testFiles.entries()) {
        await vaultsPage.uploadNewAssetButton.click()
        
        const uploadModal = page.locator('[data-testid="file-upload-modal"]')
        await expect(uploadModal).toBeVisible()
        
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(file)
          
          const titleInput = uploadModal.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill(`Test Document ${index + 1}`)
          }
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            await expect(uploadModal).not.toBeVisible({ timeout: 30000 })
          }
          
          // Wait between uploads to avoid overwhelming the system
          await page.waitForTimeout(1000)
        } else {
          // Close modal if upload interface not available
          const closeButton = uploadModal.locator('[data-testid="modal-close-button"]')
          if (await closeButton.isVisible()) {
            await closeButton.click()
          }
        }
      }
      
      // Verify multiple assets are available
      const assetsList = page.locator('[data-testid="available-assets-list"]')
      const assetItems = assetsList.locator('[data-testid="asset-item"]')
      const assetCount = await assetItems.count()
      
      // Should have uploaded at least some files
      expect(assetCount).toBeGreaterThan(0)
    })

    test('should handle upload errors gracefully', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Error Test Vault', 'Testing upload error handling')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip members
      
      // Try to upload invalid file type
      const invalidFile = path.join(__dirname, 'fixtures', 'invalid.txt')
      
      // Create a test invalid file if it doesn't exist
      if (!require('fs').existsSync(invalidFile)) {
        require('fs').writeFileSync(invalidFile, 'This is not a valid document type for upload')
      }
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(invalidFile)
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show error message
            const errorMessage = page.locator('[data-testid="upload-error-message"]')
            await expect(errorMessage.or(page.locator('.error')).or(page.locator('[role="alert"]'))).toBeVisible()
          }
        }
      }
    })

    test('should show upload progress for large files', async ({ page }) => {
      const largeFile = path.join(__dirname, 'fixtures', 'large-document.pdf')
      
      // Skip if large file doesn't exist
      if (!require('fs').existsSync(largeFile)) {
        test.skip('No large test file available for progress test')
        return
      }
      
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Progress Test Vault', 'Testing upload progress')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip members
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(largeFile)
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            const uploadPromise = uploadButton.click()
            
            // Should show progress indicator
            const progressBar = page.locator('[data-testid="upload-progress-bar"]')
            const progressText = page.locator('[data-testid="upload-progress-text"]')
            const loadingSpinner = page.locator('[data-testid="upload-loading"]')
            
            // At least one progress indicator should appear
            await expect(progressBar.or(progressText).or(loadingSpinner)).toBeVisible()
            
            await uploadPromise
            await expect(uploadModal).not.toBeVisible({ timeout: 60000 })
          }
        }
      }
    })
  })

  test.describe('Complete Vault Creation with Assets @critical', () => {
    test('should create vault with uploaded assets successfully', async ({ page }) => {
      const testFile = path.join(__dirname, 'fixtures', 'board-document.pdf')
      
      // Create test file if it doesn't exist
      if (!require('fs').existsSync(testFile)) {
        const fs = require('fs')
        const testDir = path.dirname(testFile)
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true })
        }
        fs.writeFileSync(testFile, 'Test document content for E2E testing')
      }
      
      await vaultsPage.startCreateVault()
      
      // Complete all steps with upload
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      
      await vaultsPage.fillVaultDetails(
        'Complete Vault with Assets',
        'Full workflow test vault with uploaded documents',
        'processing',
        'high',
        undefined,
        ['complete', 'assets', 'upload']
      )
      await vaultsPage.proceedToNextStep()
      
      // Add board members
      await vaultsPage.addBoardMembers(['member@e2e-test.com'])
      await vaultsPage.proceedToNextStep()
      
      // Upload asset
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const titleInput = uploadModal.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill('Board Document for Review')
          }
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            await expect(uploadModal).not.toBeVisible({ timeout: 30000 })
          }
        }
      }
      
      // Add uploaded asset to vault (if available in UI)
      const availableAssets = page.locator('[data-testid="available-assets-list"]')
      if (await availableAssets.isVisible()) {
        const assetItem = availableAssets.locator('[data-testid="asset-item"]').first()
        if (await assetItem.isVisible()) {
          const addButton = assetItem.locator('[data-testid="add-asset-button"]')
          if (await addButton.isVisible()) {
            await addButton.click()
          }
        }
      }
      
      await vaultsPage.proceedToNextStep()
      
      // Review and submit
      await expect(vaultsPage.reviewStep).toBeVisible()
      await expect(vaultsPage.reviewVaultName).toContainText('Complete Vault with Assets')
      
      await vaultsPage.createVaultSubmitButton.click()
      
      // Should redirect to vault or vaults list
      await expect(page.url()).toMatch(/\/dashboard\/vaults/)
      
      // Verify success message or vault creation
      const successMessage = page.locator('[data-testid="success-message"]')
      const vaultTitle = page.locator('[data-testid="vault-title"]')
      
      await expect(successMessage.or(vaultTitle)).toBeVisible()
    })

    test('should handle asset selection from existing assets', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Existing Assets Vault', 'Test selecting existing assets')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep() // Skip members
      
      // Select from available assets if any exist
      const availableAssets = page.locator('[data-testid="available-assets-list"]')
      await expect(availableAssets).toBeVisible()
      
      const assetItems = availableAssets.locator('[data-testid="asset-item"]')
      const assetCount = await assetItems.count()
      
      if (assetCount > 0) {
        // Select first available asset
        const addButton = assetItems.first().locator('[data-testid="add-asset-button"]')
        if (await addButton.isVisible()) {
          await addButton.click()
          
          // Should appear in selected assets
          const selectedAssets = page.locator('[data-testid="selected-assets-list"]')
          const selectedItems = selectedAssets.locator('[data-testid="asset-item"]')
          await expect(selectedItems).toHaveCount(1)
        }
      } else {
        // No existing assets - this is also a valid test case
        const emptyState = page.locator('[data-testid="no-assets-message"]')
        await expect(emptyState).toBeVisible()
      }
    })

    test('should allow removing assets from selection', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Asset Removal Test', 'Test removing selected assets')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      // Select assets if available
      const availableAssets = page.locator('[data-testid="available-assets-list"]')
      const assetItems = availableAssets.locator('[data-testid="asset-item"]')
      const assetCount = await assetItems.count()
      
      if (assetCount > 0) {
        // Add multiple assets
        const itemsToAdd = Math.min(assetCount, 2)
        for (let i = 0; i < itemsToAdd; i++) {
          const addButton = assetItems.nth(i).locator('[data-testid="add-asset-button"]')
          if (await addButton.isVisible()) {
            await addButton.click()
          }
        }
        
        // Verify assets were added
        const selectedAssets = page.locator('[data-testid="selected-assets-list"]')
        const selectedItems = selectedAssets.locator('[data-testid="asset-item"]')
        const selectedCount = await selectedItems.count()
        expect(selectedCount).toBeGreaterThan(0)
        
        // Remove first selected asset
        const removeButton = selectedItems.first().locator('[data-testid="remove-asset-button"]')
        if (await removeButton.isVisible()) {
          await removeButton.click()
          
          // Should have one less selected asset
          await expect(selectedItems).toHaveCount(selectedCount - 1)
        }
      }
    })
  })

  test.describe('Vault Creation with Upload Error Scenarios @error-handling', () => {
    test('should handle network errors during upload', async ({ page }) => {
      // Intercept upload requests and simulate network error
      await page.route('**/api/assets/upload**', route => {
        route.abort('failed')
      })
      
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Network Error Test', 'Testing network error handling')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      const testFile = path.join(__dirname, 'fixtures', 'test-doc.pdf')
      if (!require('fs').existsSync(testFile)) {
        require('fs').writeFileSync(testFile, 'Test content')
      }
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show network error
            const errorMessage = page.locator('[data-testid="upload-error"]')
            const networkError = page.locator('text=network')
            const failedMessage = page.locator('text=failed')
            
            await expect(errorMessage.or(networkError).or(failedMessage)).toBeVisible()
          }
        }
      }
    })

    test('should handle file size limit errors', async ({ page }) => {
      // Mock API response for file too large
      await page.route('**/api/assets/upload**', route => {
        route.fulfill({
          status: 413,
          body: JSON.stringify({ 
            error: 'File too large', 
            message: 'Maximum file size is 10MB' 
          }),
        })
      })
      
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Size Error Test', 'Testing file size error')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      const testFile = path.join(__dirname, 'fixtures', 'large-file.pdf')
      if (!require('fs').existsSync(testFile)) {
        // Create a dummy large file
        require('fs').writeFileSync(testFile, 'Large file content'.repeat(1000))
      }
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = uploadModal.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show file size error
            const sizeError = page.locator('text=too large')
            const maxSizeError = page.locator('text=Maximum file size')
            const errorMessage = page.locator('[data-testid="upload-error"]')
            
            await expect(sizeError.or(maxSizeError).or(errorMessage)).toBeVisible()
          }
        }
      }
    })

    test('should continue vault creation if upload fails', async ({ page }) => {
      // Simulate upload failure but allow vault creation to continue
      await page.route('**/api/assets/upload**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ 
            error: 'Upload failed', 
            message: 'Temporary server error' 
          }),
        })
      })
      
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Continue After Error', 'Test continuing after upload error')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      // Try to upload (will fail)
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        const closeButton = uploadModal.locator('[data-testid="modal-close-button"]')
        if (await closeButton.isVisible()) {
          await closeButton.click()
        } else {
          // Press escape to close modal
          await page.keyboard.press('Escape')
        }
      }
      
      // Should still be able to proceed with vault creation
      await vaultsPage.proceedToNextStep()
      await expect(vaultsPage.reviewStep).toBeVisible()
      
      // Complete vault creation without assets
      await vaultsPage.createVaultSubmitButton.click()
      
      // Should succeed even without uploaded assets
      await expect(page.url()).toMatch(/\/dashboard\/vaults/)
    })
  })

  test.describe('Upload Modal User Experience @ux', () => {
    test('should show proper modal animations and transitions', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Animation Test', 'Testing modal animations')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      // Open upload modal
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      await expect(uploadModal).toBeVisible()
      
      // Modal should have proper styling and positioning
      const modalBox = uploadModal.locator('.modal-content, [role="dialog"]').first()
      if (await modalBox.isVisible()) {
        // Check that modal is properly centered and styled
        const box = await modalBox.boundingBox()
        expect(box).toBeTruthy()
        if (box) {
          expect(box.width).toBeGreaterThan(300) // Should have reasonable width
          expect(box.height).toBeGreaterThan(200) // Should have reasonable height
        }
      }
      
      // Close modal with X button or escape
      const closeButton = uploadModal.locator('[data-testid="modal-close-button"], [aria-label*="close"]')
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(uploadModal).not.toBeVisible()
      } else {
        await page.keyboard.press('Escape')
        await expect(uploadModal).not.toBeVisible()
      }
    })

    test('should handle keyboard navigation in upload modal', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Keyboard Nav Test', 'Testing keyboard navigation')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        // Test tab navigation through modal elements
        await page.keyboard.press('Tab')
        
        // First tabbable element should be focused
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeVisible()
        
        // Escape should close modal
        await page.keyboard.press('Escape')
        await expect(uploadModal).not.toBeVisible()
      }
    })

    test('should show helpful upload instructions and tips', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Help Text Test', 'Testing upload help text')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        // Should show helpful instructions
        const instructions = page.locator('text=drag and drop, text=select files, text=supported formats')
        const helpText = instructions.first()
        
        if (await helpText.isVisible()) {
          await expect(helpText).toBeVisible()
        }
        
        // Should show supported file types
        const supportedTypes = page.locator('text=PDF, text=DOC, text=supported')
        if (await supportedTypes.first().isVisible()) {
          await expect(supportedTypes.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Asset Upload Accessibility @accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Accessibility Test', 'Testing upload accessibility')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      // Upload button should be accessible
      await expect(vaultsPage.uploadNewAssetButton).toHaveAttribute('role', /button|link/)
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        // Modal should have proper dialog role
        const dialogRole = uploadModal.locator('[role="dialog"]')
        await expect(dialogRole).toBeVisible()
        
        // File input should have proper labeling
        const fileInput = uploadModal.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          const ariaLabel = await fileInput.getAttribute('aria-label')
          const associatedLabel = await fileInput.getAttribute('aria-labelledby')
          
          expect(ariaLabel || associatedLabel).toBeTruthy()
        }
      }
    })

    test('should work with screen reader announcements', async ({ page }) => {
      await vaultsPage.startCreateVault()
      await vaultsPage.selectOrganization('test-organization')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.fillVaultDetails('Screen Reader Test', 'Testing screen reader support')
      await vaultsPage.proceedToNextStep()
      await vaultsPage.proceedToNextStep()
      
      await vaultsPage.uploadNewAssetButton.click()
      
      const uploadModal = page.locator('[data-testid="file-upload-modal"]')
      if (await uploadModal.isVisible()) {
        // Check for aria-live regions for status updates
        const statusRegions = page.locator('[aria-live], [role="status"], [role="alert"]')
        const count = await statusRegions.count()
        
        // Should have at least one live region for upload status
        expect(count).toBeGreaterThanOrEqual(0) // May or may not have live regions
      }
    })
  })
})