import { test, expect, Page } from '@playwright/test'
import { TestUtils } from './utils'

test.describe('Organization Navigation Fixes @critical @regression', () => {
  let authenticatedPage: Page

  test.beforeEach(async ({ page, browser }) => {
    // Create authenticated context
    const context = await browser.newContext()
    authenticatedPage = await context.newPage()
    
    // Sign in before each test
    await TestUtils.signIn(authenticatedPage, {
      email: 'admin@e2e-test.com',
      password: 'test-password-123'
    })
    
    // Verify authentication
    await expect(authenticatedPage.locator('[data-testid="user-profile"]')).toBeVisible()
  })

  test.describe('Organization Creation Navigation Fix', () => {
    test('should navigate to organization detail page after creation (not home)', async () => {
      const testData = TestUtils.createTestData()
      const orgName = testData.organization.name
      const orgSlug = testData.organization.slug

      // Navigate to organization creation page
      await authenticatedPage.goto('/dashboard/organizations/create')
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()

      // Fill organization details
      await authenticatedPage.fill('[data-testid="org-name-input"]', orgName)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', orgSlug)
      await authenticatedPage.fill('[data-testid="org-description-input"]', 'E2E test organization for navigation fix')

      // Create organization
      await authenticatedPage.click('[data-testid="create-org-button"]')
      
      // Wait for creation to complete
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible({ timeout: 10000 })

      // Click "Go to Organization" button
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')

      // Should navigate to organization detail page, NOT home page
      await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/organizations/${orgSlug}$`))
      
      // Should show organization detail page content
      await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
      await expect(authenticatedPage.locator('h1')).toContainText(orgName)
      
      // Should NOT be on home page
      await expect(authenticatedPage.locator('[data-testid="dashboard-home"]')).not.toBeVisible()
    })

    test('should handle slug validation and navigation correctly', async () => {
      const orgName = 'Test Organization for Slug Validation'
      
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Fill with valid name but invalid slug initially
      await authenticatedPage.fill('[data-testid="org-name-input"]', orgName)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'Invalid Slug With Spaces')
      
      // Try to create - should show validation error
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="slug-error"]')).toBeVisible()
      
      // Fix the slug
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'valid-slug-test')
      
      // Create successfully
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      // Navigate to organization
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      // Should navigate to correct organization with fixed slug
      await expect(authenticatedPage).toHaveURL(/\/dashboard\/organizations\/valid-slug-test$/)
      await expect(authenticatedPage.locator('h1')).toContainText(orgName)
    })

    test('should provide fallback navigation when slug is missing', async () => {
      // Mock a scenario where organization is created but slug is somehow missing
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Intercept the creation API to return organization without slug
      await authenticatedPage.route('**/api/organizations', async route => {
        if (route.request().method() === 'POST') {
          const response = await route.fetch()
          const data = await response.json()
          
          // Remove slug from response to simulate edge case
          if (data.organization) {
            delete data.organization.slug
          }
          
          await route.fulfill({
            response,
            json: data,
          })
        } else {
          await route.continue()
        }
      })
      
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      // Click go to organization - should fallback to organizations list
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      // Should navigate to organizations list as fallback
      await expect(authenticatedPage).toHaveURL(/\/dashboard\/organizations\/?$/)
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
    })
  })

  test.describe('Authentication Redirect Loop Fix', () => {
    test('should not redirect to login when creating organization', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Should show create organization page, not redirect to login
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
      
      // Fill and submit form
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      // Monitor for any unexpected redirects to login page
      let redirectedToLogin = false
      
      authenticatedPage.on('framenavigated', frame => {
        if (frame === authenticatedPage.mainFrame()) {
          const url = frame.url()
          if (url.includes('/auth/signin') || url.includes('/auth/login')) {
            redirectedToLogin = true
          }
        }
      })
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      
      // Wait for processing
      await authenticatedPage.waitForTimeout(3000)
      
      // Should never have redirected to login
      expect(redirectedToLogin).toBe(false)
      
      // Should show success or still be on create page
      const isOnCreatePage = await authenticatedPage.locator('[data-testid="create-organization-page"]').isVisible()
      const showsSuccess = await authenticatedPage.locator('[data-testid="creation-success"]').isVisible()
      
      expect(isOnCreatePage || showsSuccess).toBe(true)
    })

    test('should maintain authentication session during organization operations', async () => {
      await authenticatedPage.goto('/dashboard/organizations')
      
      // Create organization
      await authenticatedPage.click('[data-testid="create-organization-button"]')
      
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      // Navigate to organization
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      // Should still be authenticated - check for user profile
      await expect(authenticatedPage.locator('[data-testid="user-profile"]')).toBeVisible()
      
      // Should be on organization page, not login page
      await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/organizations/${testData.organization.slug}$`))
      await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
    })
  })

  test.describe('Complete User Journey', () => {
    test('should complete full organization creation to management journey', async () => {
      const testData = TestUtils.createTestData()
      const orgName = testData.organization.name
      const orgSlug = testData.organization.slug

      // Step 1: Navigate to organizations
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()

      const initialOrgCount = await authenticatedPage.locator('[data-testid="organization-item"]').count()

      // Step 2: Start organization creation
      await authenticatedPage.click('[data-testid="create-organization-button"]')
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()

      // Step 3: Fill organization details
      await authenticatedPage.fill('[data-testid="org-name-input"]', orgName)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', orgSlug)
      await authenticatedPage.fill('[data-testid="org-description-input"]', 'Full journey test organization')

      // Step 4: Create organization
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()

      // Step 5: Navigate to organization detail
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/organizations/${orgSlug}$`))

      // Step 6: Verify organization detail page
      await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
      await expect(authenticatedPage.locator('h1')).toContainText(orgName)
      await expect(authenticatedPage.locator('[data-testid="org-description"]')).toContainText('Full journey test organization')

      // Step 7: Navigate back to organizations list
      await authenticatedPage.click('[data-testid="back-to-organizations"]')
      await expect(authenticatedPage).toHaveURL(/\/dashboard\/organizations\/?$/)

      // Step 8: Verify new organization appears in list
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      const finalOrgCount = await authenticatedPage.locator('[data-testid="organization-item"]').count()
      expect(finalOrgCount).toBe(initialOrgCount + 1)

      // Step 9: Verify the new organization is in the list
      const newOrgItem = authenticatedPage.locator('[data-testid="organization-item"]').filter({ hasText: orgName })
      await expect(newOrgItem).toBeVisible()

      // Step 10: Click on organization from list should navigate back to detail
      await newOrgItem.click()
      await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/organizations/${orgSlug}$`))
    })

    test('should handle organization creation with vault integration', async () => {
      // Step 1: Navigate to vault creation
      await authenticatedPage.goto('/dashboard/vaults/create')
      await expect(authenticatedPage.locator('[data-testid="create-vault-page"]')).toBeVisible()

      // Step 2: Choose to create new organization during vault creation
      await authenticatedPage.click('[data-testid="create-new-organization-option"]')
      
      const testData = TestUtils.createTestData()
      const orgName = testData.organization.name
      const orgSlug = testData.organization.slug
      const vaultName = `${testData.organization.name} Board Pack`

      // Step 3: Fill organization details in vault creation flow
      await authenticatedPage.fill('[data-testid="vault-org-name-input"]', orgName)
      await authenticatedPage.fill('[data-testid="vault-org-slug-input"]', orgSlug)
      
      // Step 4: Fill vault details
      await authenticatedPage.fill('[data-testid="vault-name-input"]', vaultName)
      await authenticatedPage.fill('[data-testid="vault-description-input"]', 'Test vault with new organization')

      // Step 5: Create vault with organization
      await authenticatedPage.click('[data-testid="create-vault-button"]')
      await expect(authenticatedPage.locator('[data-testid="vault-creation-success"]')).toBeVisible({ timeout: 15000 })

      // Step 6: Should show success message mentioning both vault and organization
      await expect(authenticatedPage.locator('[data-testid="success-message"]')).toContainText('organization')
      await expect(authenticatedPage.locator('[data-testid="success-message"]')).toContainText('vault')

      // Step 7: Navigate to organizations to verify new organization exists
      await authenticatedPage.goto('/dashboard/organizations')
      
      // Should see the new organization
      const newOrgItem = authenticatedPage.locator('[data-testid="organization-item"]').filter({ hasText: orgName })
      await expect(newOrgItem).toBeVisible()

      // Step 8: Click on organization to verify it has the vault
      await newOrgItem.click()
      await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/organizations/${orgSlug}$`))
      
      // Should show organization has 1 vault
      await expect(authenticatedPage.locator('[data-testid="vault-count"]')).toContainText('1')
    })
  })

  test.describe('Error Handling Navigation', () => {
    test('should handle organization creation errors gracefully', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Mock API error
      await authenticatedPage.route('**/api/organizations', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error during creation' }),
          })
        } else {
          route.continue()
        }
      })
      
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      
      // Should show error message, not navigate away
      await expect(authenticatedPage.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(authenticatedPage.locator('[data-testid="error-message"]')).toContainText('Server error')
      
      // Should still be on create page
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
      
      // Should not redirect to home or login
      expect(authenticatedPage.url()).toContain('/dashboard/organizations/create')
    })

    test('should handle network timeouts during creation', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Mock slow API response
      await authenticatedPage.route('**/api/organizations', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
          route.continue()
        } else {
          route.continue()
        }
      })
      
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      
      // Should show loading state
      await expect(authenticatedPage.locator('[data-testid="loading-spinner"]')).toBeVisible()
      
      // After timeout, should show error or timeout message
      await expect(authenticatedPage.locator('[data-testid="timeout-error"]').or(
        authenticatedPage.locator('[data-testid="error-message"]')
      )).toBeVisible({ timeout: 15000 })
      
      // Should still be on create page, not navigate away
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
    })
  })

  test.describe('Debug Logging Verification', () => {
    test('should log navigation actions for debugging', async () => {
      const consoleLogs: string[] = []
      
      // Capture console logs
      authenticatedPage.on('console', msg => {
        if (msg.type() === 'log') {
          consoleLogs.push(msg.text())
        }
      })
      
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      const testData = TestUtils.createTestData()
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', testData.organization.name)
      await authenticatedPage.fill('[data-testid="org-slug-input"]', testData.organization.slug)
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      // Should have debug logs about navigation
      const navigationLogs = consoleLogs.filter(log => 
        log.includes('Navigating to organization') || 
        log.includes('fullUrl') ||
        log.includes(testData.organization.slug)
      )
      
      expect(navigationLogs.length).toBeGreaterThan(0)
      
      // Should log the complete navigation details
      const detailedLog = consoleLogs.find(log => 
        log.includes('name:') && 
        log.includes('slug:') && 
        log.includes('id:')
      )
      
      expect(detailedLog).toBeDefined()
    })
  })
})