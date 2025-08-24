import { test, expect, Page } from '@playwright/test'

test.describe('Organizations Bulk Actions', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Mock organizations data for bulk operations
    await page.route('/api/organizations*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organizations: [
              { 
                id: '1', 
                name: 'Alpha Corporation', 
                memberCount: 25, 
                status: 'active',
                createdAt: '2024-01-01',
                lastActivity: '2024-01-15',
                canExport: true,
                canArchive: true,
                canShare: true
              },
              { 
                id: '2', 
                name: 'Beta Industries', 
                memberCount: 50, 
                status: 'active',
                createdAt: '2024-02-01',
                lastActivity: '2024-01-14',
                canExport: true,
                canArchive: true,
                canShare: true
              },
              { 
                id: '3', 
                name: 'Gamma Startup', 
                memberCount: 8, 
                status: 'pending',
                createdAt: '2024-03-01',
                lastActivity: '2024-01-13',
                canExport: true,
                canArchive: false, // Cannot archive pending orgs
                canShare: true
              },
              { 
                id: '4', 
                name: 'Delta Consulting', 
                memberCount: 15, 
                status: 'inactive',
                createdAt: '2024-01-15',
                lastActivity: '2024-01-10',
                canExport: false, // Cannot export inactive orgs
                canArchive: true,
                canShare: false
              },
              { 
                id: '5', 
                name: 'Epsilon Networks', 
                memberCount: 35, 
                status: 'active',
                createdAt: '2024-02-15',
                lastActivity: '2024-01-16',
                canExport: true,
                canArchive: true,
                canShare: true
              }
            ],
            totalCount: 5
          })
        })
      } else {
        route.continue()
      }
    })

    // Mock bulk operation APIs
    await page.route('/api/organizations/bulk/export', (route) => {
      const data = JSON.parse(route.request().postData() || '{}')
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: `Exported ${data.organizationIds.length} organizations successfully`,
            downloadUrl: '/exports/organizations-export-2024-01-15.csv',
            exportId: 'export-123'
          })
        })
      }, 1500) // Simulate processing time
    })

    await page.route('/api/organizations/bulk/archive', (route) => {
      const data = JSON.parse(route.request().postData() || '{}')
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: `Archived ${data.organizationIds.length} organizations successfully`,
            archivedCount: data.organizationIds.length
          })
        })
      }, 2000)
    })

    await page.route('/api/organizations/bulk/share', (route) => {
      const data = JSON.parse(route.request().postData() || '{}')
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: `Shared ${data.organizationIds.length} organizations with ${data.recipients.length} recipients`,
            shareId: 'share-456'
          })
        })
      }, 1000)
    })

    // Navigate to organizations page with authentication
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'test@appboardguru.com')
    await page.fill('input[type="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Selection Interface', () => {
    test('should select individual organizations', async () => {
      // Initially no selections
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
      
      // Select first organization
      await page.click('[data-testid="organization-checkbox-1"]')
      
      // Bulk actions bar should appear
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 selected')
      
      // Organization should be visually selected
      await expect(page.locator('[data-testid="organization-card-1"]')).toHaveClass(/selected|bg-blue/)
      
      // Select second organization
      await page.click('[data-testid="organization-checkbox-2"]')
      
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected')
    })

    test('should select all organizations with master checkbox', async () => {
      // Click select all checkbox
      await page.click('[data-testid="select-all-checkbox"]')
      
      // All organizations should be selected
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('5 selected')
      
      // All individual checkboxes should be checked
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="organization-checkbox-${i}"]`)).toBeChecked()
        await expect(page.locator(`[data-testid="organization-card-${i}"]`)).toHaveClass(/selected/)
      }
      
      // Master checkbox should be checked (not indeterminate)
      await expect(page.locator('[data-testid="select-all-checkbox"]')).toBeChecked()
    })

    test('should handle indeterminate state of master checkbox', async () => {
      // Select only some organizations
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-3"]')
      
      // Master checkbox should be indeterminate
      const masterCheckbox = page.locator('[data-testid="select-all-checkbox"]')
      const isIndeterminate = await masterCheckbox.evaluate(el => (el as HTMLInputElement).indeterminate)
      expect(isIndeterminate).toBe(true)
      
      // Should not be checked
      await expect(masterCheckbox).not.toBeChecked()
    })

    test('should deselect all when clicking master checkbox in indeterminate state', async () => {
      // Select some organizations first
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      
      // Click master checkbox (should deselect all)
      await page.click('[data-testid="select-all-checkbox"]')
      
      // All should be deselected
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
      
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="organization-checkbox-${i}"]`)).not.toBeChecked()
      }
    })

    test('should show selection count and context', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-3"]')
      
      // Should show detailed selection info
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected')
      await expect(page.locator('[data-testid="selection-context"]')).toContainText('Alpha Corporation, Gamma Startup')
      
      // Should show total available count
      await expect(page.locator('[data-testid="total-available"]')).toContainText('of 5 organizations')
    })

    test('should support keyboard navigation for selection', async () => {
      // Focus first checkbox
      await page.focus('[data-testid="organization-checkbox-1"]')
      
      // Select with space
      await page.keyboard.press('Space')
      await expect(page.locator('[data-testid="organization-checkbox-1"]')).toBeChecked()
      
      // Navigate to next with arrow keys
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Space')
      await expect(page.locator('[data-testid="organization-checkbox-2"]')).toBeChecked()
    })

    test('should clear selection with escape key', async () => {
      // Select some organizations
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
      
      // Press escape to clear selection
      await page.keyboard.press('Escape')
      
      // Selection should be cleared
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
      
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`[data-testid="organization-checkbox-${i}"]`)).not.toBeChecked()
      }
    })
  })

  test.describe('Bulk Export Functionality', () => {
    test('should export selected organizations successfully', async () => {
      // Select exportable organizations
      await page.click('[data-testid="organization-checkbox-1"]') // Alpha Corporation
      await page.click('[data-testid="organization-checkbox-2"]') // Beta Industries
      
      // Click export button
      await page.click('[data-testid="bulk-export-button"]')
      
      // Export modal should open
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="export-modal-title"]')).toContainText('Export Organizations')
      
      // Should show selected organizations
      await expect(page.locator('[data-testid="export-item-count"]')).toContainText('2 organizations')
      await expect(page.locator('[data-testid="export-item-list"]')).toContainText('Alpha Corporation')
      await expect(page.locator('[data-testid="export-item-list"]')).toContainText('Beta Industries')
      
      // Configure export options
      await page.selectOption('[data-testid="export-format-select"]', 'csv')
      await page.check('[data-testid="include-member-details"]')
      await page.check('[data-testid="include-activity-data"]')
      
      // Start export
      await page.click('[data-testid="confirm-export-button"]')
      
      // Should show progress
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="export-status"]')).toContainText('Preparing export...')
      
      // Wait for export to complete
      await page.waitForResponse('/api/organizations/bulk/export')
      
      // Should show success state
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="export-success-message"]')).toContainText('Exported 2 organizations successfully')
      
      // Download link should be available
      await expect(page.locator('[data-testid="download-export-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="download-export-button"]')).toHaveAttribute('href', '/exports/organizations-export-2024-01-15.csv')
      
      // Selection should be cleared after successful export
      await page.click('[data-testid="close-export-modal"]')
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
    })

    test('should handle partial export permissions', async () => {
      // Select mix of exportable and non-exportable organizations
      await page.click('[data-testid="organization-checkbox-1"]') // Exportable
      await page.click('[data-testid="organization-checkbox-4"]') // Non-exportable (inactive)
      
      await page.click('[data-testid="bulk-export-button"]')
      
      // Should show warning about permissions
      await expect(page.locator('[data-testid="export-permission-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="export-permission-warning"]')).toContainText('1 organization cannot be exported')
      
      // Should list organizations that cannot be exported
      await expect(page.locator('[data-testid="non-exportable-list"]')).toContainText('Delta Consulting (inactive status)')
      
      // Should show actual export count
      await expect(page.locator('[data-testid="actual-export-count"]')).toContainText('1 organization will be exported')
    })

    test('should handle export errors gracefully', async () => {
      // Mock export failure
      await page.route('/api/organizations/bulk/export', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Export service temporarily unavailable',
              errorCode: 'EXPORT_SERVICE_DOWN'
            })
          })
        }, 1000)
      })
      
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-export-button"]')
      await page.click('[data-testid="confirm-export-button"]')
      
      await page.waitForResponse('/api/organizations/bulk/export')
      
      // Should show error state
      await expect(page.locator('[data-testid="export-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="export-error-message"]')).toContainText('Export service temporarily unavailable')
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-export-button"]')).toBeVisible()
      
      // Should not clear selection on error
      await page.click('[data-testid="close-export-modal"]')
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible()
    })

    test('should support different export formats', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-export-button"]')
      
      // Test CSV format
      await page.selectOption('[data-testid="export-format-select"]', 'csv')
      await expect(page.locator('[data-testid="format-description"]')).toContainText('Comma-separated values file')
      await expect(page.locator('[data-testid="csv-options"]')).toBeVisible()
      
      // Test Excel format
      await page.selectOption('[data-testid="export-format-select"]', 'xlsx')
      await expect(page.locator('[data-testid="format-description"]')).toContainText('Microsoft Excel file')
      await expect(page.locator('[data-testid="excel-options"]')).toBeVisible()
      
      // Test JSON format
      await page.selectOption('[data-testid="export-format-select"]', 'json')
      await expect(page.locator('[data-testid="format-description"]')).toContainText('JavaScript Object Notation')
      await expect(page.locator('[data-testid="json-options"]')).toBeVisible()
    })

    test('should allow custom field selection for export', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-export-button"]')
      
      // Open field selection
      await page.click('[data-testid="customize-fields-button"]')
      
      // Should show available fields
      await expect(page.locator('[data-testid="field-selector"]')).toBeVisible()
      
      // Basic fields (always selected)
      await expect(page.locator('[data-testid="field-name"]')).toBeChecked()
      await expect(page.locator('[data-testid="field-name"]')).toBeDisabled()
      
      // Optional fields
      await expect(page.locator('[data-testid="field-memberCount"]')).toBeChecked()
      await expect(page.locator('[data-testid="field-createdAt"]')).not.toBeChecked()
      
      // Select additional fields
      await page.check('[data-testid="field-createdAt"]')
      await page.check('[data-testid="field-lastActivity"]')
      await page.uncheck('[data-testid="field-memberCount"]')
      
      // Should update field count
      await expect(page.locator('[data-testid="selected-fields-count"]')).toContainText('3 fields selected')
      
      // Should show preview
      await expect(page.locator('[data-testid="export-preview"]')).toContainText('Name, Created Date, Last Activity')
    })
  })

  test.describe('Bulk Archive Functionality', () => {
    test('should archive selected organizations with confirmation', async () => {
      // Select archivable organizations
      await page.click('[data-testid="organization-checkbox-1"]') // Alpha Corporation
      await page.click('[data-testid="organization-checkbox-2"]') // Beta Industries
      
      await page.click('[data-testid="bulk-archive-button"]')
      
      // Should show confirmation modal
      await expect(page.locator('[data-testid="archive-confirmation-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="archive-modal-title"]')).toContainText('Archive Organizations')
      
      // Should show warning about archiving
      await expect(page.locator('[data-testid="archive-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="archive-warning"]')).toContainText('Archiving will make these organizations read-only')
      
      // Should list organizations to be archived
      await expect(page.locator('[data-testid="archive-item-list"]')).toContainText('Alpha Corporation')
      await expect(page.locator('[data-testid="archive-item-list"]')).toContainText('Beta Industries')
      
      // Should require confirmation input
      await page.fill('[data-testid="archive-confirmation-input"]', 'ARCHIVE')
      
      // Confirm button should be enabled after correct input
      await expect(page.locator('[data-testid="confirm-archive-button"]')).not.toBeDisabled()
      
      await page.click('[data-testid="confirm-archive-button"]')
      
      // Should show progress
      await expect(page.locator('[data-testid="archive-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="archive-status"]')).toContainText('Archiving organizations...')
      
      await page.waitForResponse('/api/organizations/bulk/archive')
      
      // Should show success
      await expect(page.locator('[data-testid="archive-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="archive-success-message"]')).toContainText('Archived 2 organizations successfully')
      
      // Should clear selection
      await page.click('[data-testid="close-archive-modal"]')
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible()
    })

    test('should prevent archiving organizations without permission', async () => {
      // Select organization that cannot be archived (pending status)
      await page.click('[data-testid="organization-checkbox-3"]') // Gamma Startup
      
      // Archive button should be disabled or show warning
      const archiveButton = page.locator('[data-testid="bulk-archive-button"]')
      const isDisabled = await archiveButton.isDisabled()
      
      if (isDisabled) {
        // Button is disabled
        await expect(archiveButton).toBeDisabled()
        
        // Should show tooltip explaining why
        await page.hover('[data-testid="bulk-archive-button"]')
        await expect(page.locator('[data-testid="archive-disabled-tooltip"]')).toContainText('Cannot archive pending organizations')
      } else {
        // Button is enabled but shows warning in modal
        await page.click('[data-testid="bulk-archive-button"]')
        
        await expect(page.locator('[data-testid="archive-permission-warning"]')).toBeVisible()
        await expect(page.locator('[data-testid="non-archivable-list"]')).toContainText('Gamma Startup (pending status)')
      }
    })

    test('should handle bulk archive with mixed permissions', async () => {
      // Select mix of archivable and non-archivable organizations
      await page.click('[data-testid="organization-checkbox-1"]') // Archivable
      await page.click('[data-testid="organization-checkbox-3"]') // Non-archivable (pending)
      
      await page.click('[data-testid="bulk-archive-button"]')
      
      // Should show mixed permissions warning
      await expect(page.locator('[data-testid="mixed-archive-permissions"]')).toBeVisible()
      await expect(page.locator('[data-testid="will-archive-count"]')).toContainText('1 organization will be archived')
      await expect(page.locator('[data-testid="cannot-archive-count"]')).toContainText('1 organization cannot be archived')
      
      // Should list both categories
      await expect(page.locator('[data-testid="archivable-list"]')).toContainText('Alpha Corporation')
      await expect(page.locator('[data-testid="non-archivable-list"]')).toContainText('Gamma Startup')
      
      // Should allow proceeding with partial archive
      await page.fill('[data-testid="archive-confirmation-input"]', 'ARCHIVE')
      await page.click('[data-testid="confirm-partial-archive-button"]')
      
      await page.waitForResponse('/api/organizations/bulk/archive')
      
      // Should show partial success
      await expect(page.locator('[data-testid="partial-archive-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="archive-summary"]')).toContainText('1 organization archived, 1 skipped')
    })

    test('should provide undo option after archiving', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-archive-button"]')
      await page.fill('[data-testid="archive-confirmation-input"]', 'ARCHIVE')
      await page.click('[data-testid="confirm-archive-button"]')
      
      await page.waitForResponse('/api/organizations/bulk/archive')
      
      // Should show undo option
      await expect(page.locator('[data-testid="undo-archive-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="undo-timeout"]')).toContainText('Undo in 30 seconds')
      
      // Mock undo API
      await page.route('/api/organizations/bulk/unarchive', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Successfully unarchived organizations' })
        })
      })
      
      await page.click('[data-testid="undo-archive-button"]')
      
      await page.waitForResponse('/api/organizations/bulk/unarchive')
      
      await expect(page.locator('[data-testid="undo-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="undo-message"]')).toContainText('Successfully unarchived organizations')
    })
  })

  test.describe('Bulk Share Functionality', () => {
    test('should share organizations with multiple recipients', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      
      await page.click('[data-testid="bulk-share-button"]')
      
      // Share modal should open
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="share-modal-title"]')).toContainText('Share Organizations')
      
      // Should show organizations to be shared
      await expect(page.locator('[data-testid="share-item-count"]')).toContainText('2 organizations')
      
      // Add recipients
      await page.fill('[data-testid="recipient-email-1"]', 'manager@example.com')
      await page.click('[data-testid="add-recipient-button"]')
      await page.fill('[data-testid="recipient-email-2"]', 'board@example.com')
      
      // Set sharing options
      await page.selectOption('[data-testid="share-permission-select"]', 'read-only')
      await page.check('[data-testid="include-contact-details"]')
      await page.check('[data-testid="include-activity-summary"]')
      
      // Add custom message
      await page.fill('[data-testid="share-message"]', 'Please review these organization details for our board meeting.')
      
      await page.click('[data-testid="confirm-share-button"]')
      
      // Should show progress
      await expect(page.locator('[data-testid="share-progress"]')).toBeVisible()
      
      await page.waitForResponse('/api/organizations/bulk/share')
      
      // Should show success
      await expect(page.locator('[data-testid="share-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="share-success-message"]')).toContainText('Shared 2 organizations with 2 recipients')
    })

    test('should validate recipient email addresses', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-share-button"]')
      
      // Try invalid email
      await page.fill('[data-testid="recipient-email-1"]', 'invalid-email')
      await page.click('[data-testid="confirm-share-button"]')
      
      // Should show validation error
      await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-validation-error"]')).toContainText('Please enter a valid email address')
      
      // Should not proceed with sharing
      await expect(page.locator('[data-testid="share-progress"]')).not.toBeVisible()
    })

    test('should handle sharing permissions restrictions', async () => {
      // Select organization that cannot be shared
      await page.click('[data-testid="organization-checkbox-4"]') // Delta Consulting (cannot share)
      
      await page.click('[data-testid="bulk-share-button"]')
      
      // Should show permission warning
      await expect(page.locator('[data-testid="share-permission-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="non-sharable-list"]')).toContainText('Delta Consulting')
      
      // Should show reason
      await expect(page.locator('[data-testid="share-restriction-reason"]')).toContainText('Inactive organizations cannot be shared')
    })

    test('should preview sharing content before sending', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-share-button"]')
      
      await page.fill('[data-testid="recipient-email-1"]', 'test@example.com')
      await page.fill('[data-testid="share-message"]', 'Test sharing message')
      
      // Click preview button
      await page.click('[data-testid="preview-share-button"]')
      
      // Should show preview modal
      await expect(page.locator('[data-testid="share-preview-modal"]')).toBeVisible()
      
      // Should show preview content
      await expect(page.locator('[data-testid="preview-subject"]')).toContainText('Organization Access Shared')
      await expect(page.locator('[data-testid="preview-message"]')).toContainText('Test sharing message')
      await expect(page.locator('[data-testid="preview-org-list"]')).toContainText('Alpha Corporation')
      
      // Should show recipient list
      await expect(page.locator('[data-testid="preview-recipients"]')).toContainText('test@example.com')
      
      // Should allow editing from preview
      await page.click('[data-testid="edit-from-preview-button"]')
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible()
    })
  })

  test.describe('Bulk Actions Performance and UX', () => {
    test('should show proper loading states during bulk operations', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      await page.click('[data-testid="bulk-export-button"]')
      await page.click('[data-testid="confirm-export-button"]')
      
      // Should disable actions during processing
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toHaveClass(/processing|disabled/)
      
      // Should show progress indicators
      await expect(page.locator('[data-testid="bulk-progress-spinner"]')).toBeVisible()
      await expect(page.locator('[data-testid="bulk-progress-text"]')).toContainText('Processing...')
      
      // Should prevent additional selections during processing
      await page.click('[data-testid="organization-checkbox-3"]')
      await expect(page.locator('[data-testid="organization-checkbox-3"]')).not.toBeChecked()
      
      await page.waitForResponse('/api/organizations/bulk/export')
      
      // Should re-enable actions after completion
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toHaveClass(/processing/)
    })

    test('should handle large selections efficiently', async () => {
      // Mock larger dataset
      await page.route('/api/organizations*', (route) => {
        const organizations = Array.from({ length: 100 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Organization ${i + 1}`,
          memberCount: Math.floor(Math.random() * 100) + 5,
          status: 'active',
          canExport: true,
          canArchive: true,
          canShare: true
        }))
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ organizations, totalCount: 100 })
        })
      })
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Select all (should be performant even with 100 items)
      const startTime = Date.now()
      await page.click('[data-testid="select-all-checkbox"]')
      const selectionTime = Date.now() - startTime
      
      // Should complete selection within reasonable time
      expect(selectionTime).toBeLessThan(1000) // Less than 1 second
      
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('100 selected')
      
      // Bulk actions bar should remain responsive
      await expect(page.locator('[data-testid="bulk-export-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="bulk-archive-button"]')).toBeVisible()
    })

    test('should provide keyboard shortcuts for bulk actions', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      
      // Test keyboard shortcuts
      // Ctrl+A / Cmd+A to select all
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('5 selected')
      
      // Ctrl+E / Cmd+E for export
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+e' : 'Control+e')
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
      
      // Escape to close modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="export-modal"]')).not.toBeVisible()
      
      // Delete key for archive
      await page.keyboard.press('Delete')
      await expect(page.locator('[data-testid="archive-confirmation-modal"]')).toBeVisible()
    })

    test('should show helpful tooltips for disabled actions', async () => {
      // Select organization that has restrictions
      await page.click('[data-testid="organization-checkbox-4"]') // Delta Consulting (limited permissions)
      
      // Hover over disabled export button
      await page.hover('[data-testid="bulk-export-button"]')
      
      const tooltip = page.locator('[data-testid="bulk-tooltip"]')
      if (await tooltip.isVisible()) {
        await expect(tooltip).toContainText('Cannot export inactive organizations')
      } else {
        // Button might be completely disabled
        await expect(page.locator('[data-testid="bulk-export-button"]')).toBeDisabled()
      }
    })

    test('should maintain selection state during page navigation', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="organization-checkbox-2"]')
      
      // Navigate to different page/filter
      await page.fill('[data-testid="organization-search"]', 'Alpha')
      await page.waitForTimeout(600) // Wait for debounce
      await page.waitForResponse(response => response.url().includes('search=Alpha'))
      
      // Selection should be maintained for visible items
      await expect(page.locator('[data-testid="organization-checkbox-1"]')).toBeChecked()
      
      // Clear search to see all organizations
      await page.fill('[data-testid="organization-search"]', '')
      await page.waitForTimeout(600)
      
      // Previously selected items should still be selected
      await expect(page.locator('[data-testid="organization-checkbox-1"]')).toBeChecked()
      await expect(page.locator('[data-testid="organization-checkbox-2"]')).toBeChecked()
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected')
    })
  })

  test.describe('Accessibility for Bulk Actions', () => {
    test('should provide proper ARIA labels and announcements', async () => {
      // Check ARIA labels on selection controls
      await expect(page.locator('[data-testid="select-all-checkbox"]')).toHaveAttribute('aria-label', /Select all organizations/)
      
      await page.click('[data-testid="organization-checkbox-1"]')
      
      // Should announce selection changes
      await expect(page.locator('[aria-live="polite"]')).toContainText('1 organization selected')
      
      // Bulk actions should have proper labels
      await expect(page.locator('[data-testid="bulk-export-button"]')).toHaveAttribute('aria-label', /Export selected organizations/)
      await expect(page.locator('[data-testid="bulk-archive-button"]')).toHaveAttribute('aria-label', /Archive selected organizations/)
      
      // Should indicate when actions are disabled
      const disabledActions = page.locator('[data-testid^="bulk-"][disabled]')
      const count = await disabledActions.count()
      for (let i = 0; i < count; i++) {
        await expect(disabledActions.nth(i)).toHaveAttribute('aria-disabled', 'true')
      }
    })

    test('should support screen reader navigation of bulk actions', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      
      // Focus should move to bulk actions bar
      const bulkActionsBar = page.locator('[data-testid="bulk-actions-bar"]')
      await expect(bulkActionsBar).toHaveAttribute('role', 'toolbar')
      await expect(bulkActionsBar).toHaveAttribute('aria-label', /Bulk actions for selected organizations/)
      
      // Should be able to navigate actions with tab
      await page.focus('[data-testid="bulk-export-button"]')
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(focusedElement).toBe('bulk-archive-button')
    })

    test('should handle focus management in modals', async () => {
      await page.click('[data-testid="organization-checkbox-1"]')
      await page.click('[data-testid="bulk-export-button"]')
      
      // Focus should be on first interactive element in modal
      const exportModal = page.locator('[data-testid="export-modal"]')
      await expect(exportModal).toBeFocused()
      
      // Should trap focus within modal
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(['export-format-select', 'close-export-modal', 'confirm-export-button']).toContain(focusedElement)
      
      // Escape should close modal and return focus
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="export-modal"]')).not.toBeVisible()
      
      // Focus should return to trigger button
      const currentFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(currentFocus).toBe('bulk-export-button')
    })
  })
})