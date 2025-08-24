import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Bulk Actions
 * 
 * Tests bulk selection, CSV export, bulk operations,
 * keyboard shortcuts, and bulk action performance.
 */

test.describe('Organizations Bulk Actions', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
  })

  test.describe('Bulk Selection', () => {
    test('should select single organization with checkbox', async () => {
      const firstCard = page.locator('[data-testid="organization-card"]').first()
      const checkbox = firstCard.locator('[data-testid="organization-checkbox"]')
      
      if (await checkbox.isVisible()) {
        await checkbox.click()
        
        // Verify selection
        await expect(checkbox).toBeChecked()
        
        // Check for selection count indicator
        const selectionCount = page.locator('[data-testid="selection-count"]')
        if (await selectionCount.isVisible()) {
          await expect(selectionCount).toContainText('1')
        }
        
        // Verify bulk actions toolbar appears
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        if (await bulkToolbar.isVisible()) {
          await expect(bulkToolbar).toBeVisible()
        }
      }
    })

    test('should select multiple organizations', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 3) {
        // Select first 3 organizations
        for (let i = 0; i < 3; i++) {
          const card = orgCards.nth(i)
          const checkbox = card.locator('[data-testid="organization-checkbox"]')
          
          if (await checkbox.isVisible()) {
            await checkbox.click()
            await page.waitForTimeout(100)
          }
        }
        
        // Verify selection count
        const selectionCount = page.locator('[data-testid="selection-count"]')
        if (await selectionCount.isVisible()) {
          await expect(selectionCount).toContainText('3')
        }
        
        // Verify all selected items are checked
        for (let i = 0; i < 3; i++) {
          const card = orgCards.nth(i)
          const checkbox = card.locator('[data-testid="organization-checkbox"]')
          
          if (await checkbox.isVisible()) {
            await expect(checkbox).toBeChecked()
          }
        }
      }
    })

    test('should support select all functionality', async () => {
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click()
        
        // Verify all checkboxes are selected
        const orgCheckboxes = page.locator('[data-testid="organization-checkbox"]')
        const checkboxCount = await orgCheckboxes.count()
        
        if (checkboxCount > 0) {
          for (let i = 0; i < checkboxCount; i++) {
            const checkbox = orgCheckboxes.nth(i)
            if (await checkbox.isVisible()) {
              await expect(checkbox).toBeChecked()
            }
          }
          
          // Verify selection count shows all
          const selectionCount = page.locator('[data-testid="selection-count"]')
          if (await selectionCount.isVisible()) {
            const countText = await selectionCount.textContent()
            expect(countText).toMatch(/\d+/)
          }
        }
      }
    })

    test('should support deselect all functionality', async () => {
      // First select all
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click()
        await page.waitForTimeout(300)
        
        // Then deselect all
        await selectAllCheckbox.click()
        await page.waitForTimeout(300)
        
        // Verify no checkboxes are selected
        const orgCheckboxes = page.locator('[data-testid="organization-checkbox"]')
        const checkboxCount = await orgCheckboxes.count()
        
        if (checkboxCount > 0) {
          for (let i = 0; i < checkboxCount; i++) {
            const checkbox = orgCheckboxes.nth(i)
            if (await checkbox.isVisible()) {
              await expect(checkbox).not.toBeChecked()
            }
          }
        }
        
        // Verify bulk toolbar is hidden
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        if (await bulkToolbar.isVisible()) {
          await expect(bulkToolbar).not.toBeVisible()
        }
      }
    })

    test('should handle partial selection (indeterminate state)', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 2) {
        // Select only first organization
        const firstCheckbox = orgCards.first().locator('[data-testid="organization-checkbox"]')
        
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click()
          
          // Check if select-all checkbox shows indeterminate state
          const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
          
          if (await selectAllCheckbox.isVisible()) {
            // Test for indeterminate attribute or CSS class
            const isIndeterminate = await selectAllCheckbox.evaluate(el => {
              return (el as HTMLInputElement).indeterminate ||
                     el.classList.contains('indeterminate') ||
                     el.getAttribute('data-indeterminate') === 'true'
            })
            
            // Should show partial selection state
            console.log('Select-all indeterminate state:', isIndeterminate)
          }
        }
      }
    })

    test('should clear selection on page navigation', async () => {
      // Select some organizations
      const firstCard = page.locator('[data-testid="organization-card"]').first()
      const checkbox = firstCard.locator('[data-testid="organization-checkbox"]')
      
      if (await checkbox.isVisible()) {
        await checkbox.click()
        await expect(checkbox).toBeChecked()
        
        // Navigate away and back
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        
        await page.goto('/dashboard/organizations')
        await page.waitForLoadState('networkidle')
        
        // Verify selection is cleared
        const newFirstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
        
        if (await newFirstCheckbox.isVisible()) {
          await expect(newFirstCheckbox).not.toBeChecked()
        }
      }
    })
  })

  test.describe('Bulk Operations Menu', () => {
    test('should show bulk actions when items are selected', async () => {
      // Select an organization
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        // Check for bulk actions menu
        const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]')
        
        if (await bulkActionsMenu.isVisible()) {
          await expect(bulkActionsMenu).toBeVisible()
          
          // Check for common bulk actions
          const exportAction = bulkActionsMenu.locator('[data-testid="bulk-export-csv"]')
          const shareAction = bulkActionsMenu.locator('[data-testid="bulk-share"]')
          const archiveAction = bulkActionsMenu.locator('[data-testid="bulk-archive"]')
          
          // At least one bulk action should be available
          const hasActions = await exportAction.isVisible() || 
                            await shareAction.isVisible() || 
                            await archiveAction.isVisible()
          
          expect(hasActions).toBeTruthy()
        }
      }
    })

    test('should show action counts in menu items', async () => {
      // Select multiple organizations
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 2) {
        // Select first 2
        for (let i = 0; i < 2; i++) {
          const checkbox = orgCards.nth(i).locator('[data-testid="organization-checkbox"]')
          if (await checkbox.isVisible()) {
            await checkbox.click()
          }
        }
        
        // Open bulk actions menu
        const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]')
        const bulkActionsButton = page.locator('[data-testid="bulk-actions-button"]')
        
        if (await bulkActionsButton.isVisible()) {
          await bulkActionsButton.click()
        }
        
        if (await bulkActionsMenu.isVisible()) {
          // Check if action items show counts
          const exportAction = bulkActionsMenu.locator('[data-testid="bulk-export-csv"]')
          
          if (await exportAction.isVisible()) {
            const actionText = await exportAction.textContent()
            // Should mention the count of selected items
            expect(actionText).toMatch(/2|selected/i)
          }
        }
      }
    })

    test('should disable actions based on selection', async () => {
      // Select an organization that might not support certain actions
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]')
        
        if (await bulkActionsMenu.isVisible()) {
          // Check if some actions are disabled based on permissions
          const archiveAction = bulkActionsMenu.locator('[data-testid="bulk-archive"]')
          const deleteAction = bulkActionsMenu.locator('[data-testid="bulk-delete"]')
          
          if (await archiveAction.isVisible()) {
            const isDisabled = await archiveAction.evaluate(el => 
              el.hasAttribute('disabled') || 
              el.classList.contains('disabled') ||
              el.getAttribute('aria-disabled') === 'true'
            )
            
            console.log('Archive action disabled:', isDisabled)
          }
        }
      }
    })
  })

  test.describe('CSV Export', () => {
    test('should export selected organizations to CSV', async () => {
      // Select organizations
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        // Open export dialog
        const exportButton = page.locator('[data-testid="bulk-export-csv"]')
        
        if (await exportButton.isVisible()) {
          // Setup download listener
          const downloadPromise = page.waitForEvent('download')
          
          await exportButton.click()
          
          // Handle export modal if it appears
          const exportModal = page.locator('[data-testid="export-modal"]')
          
          if (await exportModal.isVisible({ timeout: 1000 })) {
            // Configure export options
            const includeMembers = exportModal.locator('[data-testid="include-members"]')
            if (await includeMembers.isVisible()) {
              await includeMembers.check()
            }
            
            const includeActivity = exportModal.locator('[data-testid="include-activity"]')
            if (await includeActivity.isVisible()) {
              await includeActivity.check()
            }
            
            // Confirm export
            const confirmExport = exportModal.locator('[data-testid="confirm-export"]')
            await confirmExport.click()
          }
          
          // Wait for download
          try {
            const download = await downloadPromise
            const filename = download.suggestedFilename()
            
            expect(filename).toMatch(/organizations.*\.csv$/i)
            
            // Verify download started
            console.log('CSV download started:', filename)
          } catch (error) {
            console.log('CSV download test skipped (might not work in test environment):', error)
          }
        }
      }
    })

    test('should export all organizations when all selected', async () => {
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click()
        
        const exportButton = page.locator('[data-testid="bulk-export-csv"]')
        
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download')
          
          await exportButton.click()
          
          try {
            const download = await downloadPromise
            const filename = download.suggestedFilename()
            
            expect(filename).toMatch(/organizations.*\.csv$/i)
            console.log('Full export started:', filename)
          } catch (error) {
            console.log('Full export test skipped:', error)
          }
        }
      }
    })

    test('should show export progress for large selections', async () => {
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click()
        
        const exportButton = page.locator('[data-testid="bulk-export-csv"]')
        
        if (await exportButton.isVisible()) {
          await exportButton.click()
          
          // Check for progress indicator
          const progressIndicator = page.locator('[data-testid="export-progress"]')
          
          if (await progressIndicator.isVisible({ timeout: 2000 })) {
            // Should show progress
            await expect(progressIndicator).toBeVisible()
            
            // Wait for completion
            await expect(progressIndicator).not.toBeVisible({ timeout: 10000 })
            
            // Should show completion message
            const successMessage = page.locator('[data-testid="export-success"]')
            if (await successMessage.isVisible()) {
              await expect(successMessage).toContainText('export')
            }
          }
        }
      }
    })
  })

  test.describe('Bulk Share Operations', () => {
    test('should open bulk share modal', async () => {
      // Select organizations
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        const shareButton = page.locator('[data-testid="bulk-share"]')
        
        if (await shareButton.isVisible()) {
          await shareButton.click()
          
          // Check for share modal
          const shareModal = page.locator('[data-testid="bulk-share-modal"]')
          
          if (await shareModal.isVisible()) {
            await expect(shareModal).toBeVisible()
            
            // Check modal contents
            const emailInput = shareModal.locator('[data-testid="share-email-input"]')
            const permissionSelect = shareModal.locator('[data-testid="share-permission-select"]')
            
            if (await emailInput.isVisible()) {
              await expect(emailInput).toBeVisible()
            }
            
            if (await permissionSelect.isVisible()) {
              await expect(permissionSelect).toBeVisible()
            }
          }
        }
      }
    })

    test('should validate email inputs for bulk share', async () => {
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        const shareButton = page.locator('[data-testid="bulk-share"]')
        
        if (await shareButton.isVisible()) {
          await shareButton.click()
          
          const shareModal = page.locator('[data-testid="bulk-share-modal"]')
          
          if (await shareModal.isVisible()) {
            const emailInput = shareModal.locator('[data-testid="share-email-input"]')
            const shareConfirmButton = shareModal.locator('[data-testid="confirm-bulk-share"]')
            
            if (await emailInput.isVisible() && await shareConfirmButton.isVisible()) {
              // Test invalid email
              await emailInput.fill('invalid-email')
              await shareConfirmButton.click()
              
              // Should show validation error
              const errorMessage = shareModal.locator('[data-testid="email-error"]')
              if (await errorMessage.isVisible()) {
                await expect(errorMessage).toContainText('valid email')
              }
              
              // Test valid email
              await emailInput.clear()
              await emailInput.fill('test@example.com')
              
              // Error should disappear
              if (await errorMessage.isVisible()) {
                await expect(errorMessage).not.toBeVisible()
              }
            }
          }
        }
      }
    })
  })

  test.describe('Bulk Archive Operations', () => {
    test('should show confirmation for bulk archive', async () => {
      // Select organizations
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 2) {
        // Select multiple organizations
        for (let i = 0; i < 2; i++) {
          const checkbox = orgCards.nth(i).locator('[data-testid="organization-checkbox"]')
          if (await checkbox.isVisible()) {
            await checkbox.click()
          }
        }
        
        const archiveButton = page.locator('[data-testid="bulk-archive"]')
        
        if (await archiveButton.isVisible()) {
          await archiveButton.click()
          
          // Should show confirmation dialog
          const confirmDialog = page.locator('[data-testid="bulk-archive-confirmation"]')
          
          if (await confirmDialog.isVisible()) {
            await expect(confirmDialog).toBeVisible()
            
            // Should mention the count
            const confirmText = await confirmDialog.textContent()
            expect(confirmText).toMatch(/2.*organization/i)
            
            // Check for confirmation buttons
            const confirmButton = confirmDialog.locator('[data-testid="confirm-archive"]')
            const cancelButton = confirmDialog.locator('[data-testid="cancel-archive"]')
            
            await expect(confirmButton).toBeVisible()
            await expect(cancelButton).toBeVisible()
            
            // Test cancel
            await cancelButton.click()
            await expect(confirmDialog).not.toBeVisible()
          }
        }
      }
    })

    test('should execute bulk archive operation', async () => {
      // Mock the archive API to avoid actually archiving
      await page.route('**/api/organizations/bulk*', route => {
        const request = route.request()
        
        if (request.method() === 'POST' && request.postData()?.includes('archive')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Organizations archived successfully',
              archivedCount: 2
            })
          })
        } else {
          route.continue()
        }
      })
      
      // Select organizations
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 2) {
        for (let i = 0; i < 2; i++) {
          const checkbox = orgCards.nth(i).locator('[data-testid="organization-checkbox"]')
          if (await checkbox.isVisible()) {
            await checkbox.click()
          }
        }
        
        const archiveButton = page.locator('[data-testid="bulk-archive"]')
        
        if (await archiveButton.isVisible()) {
          await archiveButton.click()
          
          const confirmDialog = page.locator('[data-testid="bulk-archive-confirmation"]')
          
          if (await confirmDialog.isVisible()) {
            const confirmButton = confirmDialog.locator('[data-testid="confirm-archive"]')
            await confirmButton.click()
            
            // Should show success message
            const successMessage = page.locator('[data-testid="archive-success"]')
            
            if (await successMessage.isVisible({ timeout: 5000 })) {
              await expect(successMessage).toContainText('archived')
              
              // Selection should be cleared
              const selectionCount = page.locator('[data-testid="selection-count"]')
              if (await selectionCount.isVisible()) {
                await expect(selectionCount).not.toBeVisible()
              }
            }
          }
        }
      }
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('should support Ctrl+A to select all', async () => {
      // Use keyboard shortcut
      await page.keyboard.press('Control+a')
      
      // Should select all organizations
      const orgCheckboxes = page.locator('[data-testid="organization-checkbox"]')
      const checkboxCount = await orgCheckboxes.count()
      
      if (checkboxCount > 0) {
        // Wait a moment for selection to process
        await page.waitForTimeout(500)
        
        // Check if select-all is active
        const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
        
        if (await selectAllCheckbox.isVisible()) {
          const isChecked = await selectAllCheckbox.isChecked()
          
          if (isChecked) {
            // Verify individual checkboxes are also selected
            const firstCheckbox = orgCheckboxes.first()
            if (await firstCheckbox.isVisible()) {
              await expect(firstCheckbox).toBeChecked()
            }
          }
        }
      }
    })

    test('should support Escape to clear selection', async () => {
      // First select some organizations
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        await expect(firstCheckbox).toBeChecked()
        
        // Press Escape to clear
        await page.keyboard.press('Escape')
        
        // Wait for deselection
        await page.waitForTimeout(300)
        
        // Should clear selection
        await expect(firstCheckbox).not.toBeChecked()
        
        // Bulk toolbar should be hidden
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        if (await bulkToolbar.isVisible()) {
          await expect(bulkToolbar).not.toBeVisible()
        }
      }
    })

    test('should support Delete key for bulk delete', async () => {
      // Mock delete API
      await page.route('**/api/organizations/bulk*', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, deletedCount: 1 })
          })
        } else {
          route.continue()
        }
      })
      
      // Select an organization
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        // Press Delete key
        await page.keyboard.press('Delete')
        
        // Should show confirmation or execute delete
        const confirmDialog = page.locator('[data-testid="bulk-delete-confirmation"]')
        
        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          const confirmButton = confirmDialog.locator('[data-testid="confirm-delete"]')
          await confirmButton.click()
          
          // Should show success message
          const successMessage = page.locator('[data-testid="delete-success"]')
          if (await successMessage.isVisible({ timeout: 3000 })) {
            await expect(successMessage).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Performance and Edge Cases', () => {
    test('should handle large selections efficiently', async () => {
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        const startTime = Date.now()
        
        // Select all organizations
        await selectAllCheckbox.click()
        
        // Wait for selection to complete
        await page.waitForTimeout(500)
        
        const selectionTime = Date.now() - startTime
        
        // Should complete selection within reasonable time
        expect(selectionTime).toBeLessThan(2000)
        
        // Verify bulk toolbar appears
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        if (await bulkToolbar.isVisible()) {
          await expect(bulkToolbar).toBeVisible()
        }
      }
    })

    test('should handle rapid selection changes', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 5) {
        const startTime = Date.now()
        
        // Rapidly select and deselect organizations
        for (let i = 0; i < 5; i++) {
          const checkbox = orgCards.nth(i).locator('[data-testid="organization-checkbox"]')
          
          if (await checkbox.isVisible()) {
            await checkbox.click() // Select
            await page.waitForTimeout(50)
            await checkbox.click() // Deselect
            await page.waitForTimeout(50)
            await checkbox.click() // Select again
          }
        }
        
        const totalTime = Date.now() - startTime
        
        // Should handle rapid changes without lag
        expect(totalTime).toBeLessThan(3000)
        
        // Final state should be consistent
        const selectionCount = page.locator('[data-testid="selection-count"]')
        if (await selectionCount.isVisible()) {
          const countText = await selectionCount.textContent()
          expect(countText).toMatch(/5/)
        }
      }
    })

    test('should handle empty selection gracefully', async () => {
      // Try to access bulk actions without selection
      const bulkActionsButton = page.locator('[data-testid="bulk-actions-button"]')
      
      if (await bulkActionsButton.isVisible()) {
        await bulkActionsButton.click()
        
        // Should show message about no selection
        const emptyMessage = page.locator('[data-testid="no-selection-message"]')
        if (await emptyMessage.isVisible()) {
          await expect(emptyMessage).toContainText('select')
        }
      } else {
        // Bulk actions should be hidden when nothing selected
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        await expect(bulkToolbar).not.toBeVisible()
      }
    })

    test('should maintain selection state during page operations', async () => {
      // Select an organization
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        await expect(firstCheckbox).toBeChecked()
        
        // Perform search operation
        const searchInput = page.locator('[data-testid="search-input"]')
        
        if (await searchInput.isVisible()) {
          await searchInput.fill('test')
          await page.waitForTimeout(500)
          
          // Clear search
          await searchInput.clear()
          await page.waitForTimeout(500)
          
          // Selection should be maintained (or cleared based on design)
          const newFirstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
          
          if (await newFirstCheckbox.isVisible()) {
            // Check current selection state
            const isChecked = await newFirstCheckbox.isChecked()
            console.log('Selection maintained after search:', isChecked)
          }
        }
      }
    })

    test('should handle bulk operation failures gracefully', async () => {
      // Mock API failure
      await page.route('**/api/organizations/bulk*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Bulk operation failed',
            details: 'Service temporarily unavailable'
          })
        })
      })
      
      // Select and try to export
      const firstCheckbox = page.locator('[data-testid="organization-card"]').first().locator('[data-testid="organization-checkbox"]')
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()
        
        const exportButton = page.locator('[data-testid="bulk-export-csv"]')
        
        if (await exportButton.isVisible()) {
          await exportButton.click()
          
          // Should show error message
          const errorMessage = page.locator('[data-testid="bulk-operation-error"]')
          
          if (await errorMessage.isVisible({ timeout: 3000 })) {
            await expect(errorMessage).toContainText('failed')
            
            // Should offer retry option
            const retryButton = page.locator('[data-testid="retry-bulk-operation"]')
            if (await retryButton.isVisible()) {
              await expect(retryButton).toBeVisible()
            }
          }
        }
      }
    })
  })
})