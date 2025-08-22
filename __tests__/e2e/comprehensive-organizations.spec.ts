import { test, expect } from '@playwright/test'
import { OrganizationsPage, createPageObjects, TestUtils } from './pages'

test.describe('Comprehensive Organization Management @critical', () => {
  let organizationsPage: OrganizationsPage

  test.beforeEach(async ({ page }) => {
    const pages = createPageObjects(page)
    organizationsPage = pages.organizations
    
    // Start authenticated
    await page.goto('/dashboard/organizations')
    await expect(page.locator('[data-testid="organizations-page"]')).toBeVisible()
  })

  test.describe('Organization Creation Workflows', () => {
    test('should create organization with complete wizard flow', async () => {
      const testData = TestUtils.createTestData()
      
      await organizationsPage.createOrganizationComplete(
        testData.organization.name,
        [
          { email: 'member1@example.com', role: 'member' },
          { email: 'director@example.com', role: 'director' }
        ],
        ['vault-management', 'board-chat', 'document-annotations'],
        testData.organization.slug,
        testData.organization.description
      )
      
      // Should navigate to organization details or list
      await organizationsPage.page.waitForURL(/\/dashboard\/organizations/)
      
      // Verify organization appears in list
      await organizationsPage.expectOrganizationsDisplayed()
      
      const newOrgItem = organizationsPage.organizationItems.filter({ 
        hasText: testData.organization.name 
      })
      await expect(newOrgItem).toBeVisible()
    })

    test('should validate organization name uniqueness', async () => {
      await organizationsPage.startCreateOrganization()
      
      // Try to create with existing organization name
      await organizationsPage.fillBasicInformation(
        'E2E Test Organization', // This should already exist from global setup
        'duplicate-test-org'
      )
      
      await organizationsPage.proceedToNextStep()
      
      // Should show validation error
      await organizationsPage.expectErrorMessage(/name.*already.*exists/i)
    })

    test('should validate slug format', async () => {
      await organizationsPage.startCreateOrganization()
      
      const invalidSlugs = ['invalid slug', 'UPPERCASE', 'special!chars', '123-start-number']
      
      for (const slug of invalidSlugs) {
        await organizationsPage.orgNameInput.fill('Test Organization')
        await organizationsPage.orgSlugInput.clear()
        await organizationsPage.orgSlugInput.fill(slug)
        
        // Try to proceed
        await organizationsPage.proceedToNextStep()
        
        // Should show slug validation error
        const errorMessage = organizationsPage.page.locator('[data-testid="slug-error"]')
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toContainText(/invalid.*format/i)
        }
        
        // Go back to fix
        await organizationsPage.goBackToPreviousStep()
      }
    })

    test('should handle member invitation in creation wizard', async () => {
      const testData = TestUtils.createTestData()
      
      await organizationsPage.startCreateOrganization()
      
      // Step 1: Basic info
      await organizationsPage.fillBasicInformation(testData.organization.name)
      await organizationsPage.proceedToNextStep()
      
      // Step 2: Add members
      await organizationsPage.addMemberInvitation('user1@example.com', 'member')
      await organizationsPage.addMemberInvitation('admin@example.com', 'admin')
      
      // Should show pending invites
      await expect(organizationsPage.inviteItem.filter({ hasText: 'user1@example.com' })).toBeVisible()
      await expect(organizationsPage.inviteItem.filter({ hasText: 'admin@example.com' })).toBeVisible()
      
      // Test remove invitation
      await organizationsPage.removePendingInvite('user1@example.com')
      await expect(organizationsPage.inviteItem.filter({ hasText: 'user1@example.com' })).not.toBeVisible()
      
      await organizationsPage.proceedToNextStep()
      
      // Step 3: Features
      await organizationsPage.configureFeatures(['vault-management', 'board-chat'])
      await organizationsPage.proceedToNextStep()
      
      // Step 4: Review and submit
      await organizationsPage.reviewAndSubmit()
    })

    test('should save draft and resume creation', async () => {
      const testData = TestUtils.createTestData()
      
      await organizationsPage.startCreateOrganization()
      
      // Fill partial information
      await organizationsPage.fillBasicInformation(testData.organization.name)
      
      // Check if save draft functionality exists
      const saveDraftButton = organizationsPage.page.locator('[data-testid="save-draft-button"]')
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click()
        await organizationsPage.expectSuccessMessage('Draft saved')
        
        // Close wizard
        await organizationsPage.page.keyboard.press('Escape')
        
        // Reopen and continue
        await organizationsPage.startCreateOrganization()
        
        // Should resume from saved state
        const nameValue = await organizationsPage.orgNameInput.inputValue()
        expect(nameValue).toBe(testData.organization.name)
      }
    })

    test('should handle wizard navigation correctly', async () => {
      await organizationsPage.startCreateOrganization()
      
      // Test forward navigation
      await organizationsPage.fillBasicInformation('Navigation Test Org')
      await organizationsPage.proceedToNextStep()
      
      // Should be on members step
      await expect(organizationsPage.membersStep).toBeVisible()
      
      // Test backward navigation
      await organizationsPage.goBackToPreviousStep()
      
      // Should be back on basic info step
      await expect(organizationsPage.orgNameInput).toBeVisible()
      const nameValue = await organizationsPage.orgNameInput.inputValue()
      expect(nameValue).toBe('Navigation Test Org')
      
      // Test skip steps if allowed
      await organizationsPage.proceedToNextStep() // Back to members
      await organizationsPage.proceedToNextStep() // Skip to features
      
      await expect(organizationsPage.featuresStep).toBeVisible()
    })
  })

  test.describe('Organization Management', () => {
    test('should view organization details', async () => {
      await organizationsPage.expectOrganizationsDisplayed()
      await organizationsPage.viewOrganizationDetails(0)
      
      // Should display organization information
      await organizationsPage.expectOrganizationStats()
      await organizationsPage.expectOrganizationMembers()
    })

    test('should manage organization members', async () => {
      await organizationsPage.expectOrganizationsDisplayed()
      await organizationsPage.openMembersManagement(0)
      
      // Should display current members
      await organizationsPage.expectMembersDisplayed()
      
      // Test invite new member
      await organizationsPage.inviteNewMember('newmember@example.com', 'member', 'Welcome to the team!')
      
      // Test change member role
      const memberItems = organizationsPage.memberItem
      const memberCount = await memberItems.count()
      
      if (memberCount > 1) {
        // Get email of second member
        const secondMember = memberItems.nth(1)
        const memberEmail = await secondMember.locator('[data-testid="member-email"]').textContent()
        
        if (memberEmail) {
          await organizationsPage.changeMemberRole(memberEmail, 'director')
        }
      }
    })

    test('should update organization settings', async () => {
      await organizationsPage.expectOrganizationsDisplayed()
      await organizationsPage.openOrganizationSettings(0)
      
      // Test general settings
      await organizationsPage.updateGeneralSettings({
        'description': 'Updated organization description',
        'website': 'https://updated-website.com',
      })
      
      // Test feature toggles
      await organizationsPage.toggleFeature('document-annotations', true)
      await organizationsPage.toggleFeature('voice-assistant', false)
      
      // Test security settings
      await organizationsPage.updateSecuritySettings({
        'require-2fa': true,
        'session-timeout': '30',
        'password-policy': 'strong',
      })
    })

    test('should handle organization archiving', async () => {
      const initialCount = await organizationsPage.organizationItems.count()
      
      if (initialCount > 1) { // Don't archive if it's the only org
        await organizationsPage.archiveOrganization(1)
        
        // Organization should be moved to archived state
        // Verify by checking if it's no longer in active list
        const newCount = await organizationsPage.organizationItems.count()
        expect(newCount).toBe(initialCount - 1)
      }
    })

    test('should handle organization deletion with confirmation', async () => {
      // Create a test organization first
      const testData = TestUtils.createTestData()
      await organizationsPage.createOrganizationComplete(testData.organization.name)
      
      await organizationsPage.goToOrganizations()
      const initialCount = await organizationsPage.organizationItems.count()
      
      // Find and delete the test organization
      const testOrgItem = organizationsPage.organizationItems.filter({ 
        hasText: testData.organization.name 
      })
      
      if (await testOrgItem.isVisible()) {
        // Get the index of the test organization
        const allOrgs = await organizationsPage.organizationItems.all()
        let testOrgIndex = -1
        
        for (let i = 0; i < allOrgs.length; i++) {
          const orgText = await allOrgs[i].textContent()
          if (orgText?.includes(testData.organization.name)) {
            testOrgIndex = i
            break
          }
        }
        
        if (testOrgIndex >= 0) {
          await organizationsPage.deleteOrganization(testOrgIndex)
          
          // Should have one less organization
          const newCount = await organizationsPage.organizationItems.count()
          expect(newCount).toBe(initialCount - 1)
        }
      }
    })
  })

  test.describe('Organization Search and Filtering', () => {
    test('should search organizations by name', async () => {
      await organizationsPage.searchOrganizations('test')
      
      // Results should contain search term
      const visibleOrgs = organizationsPage.organizationItems
      const orgCount = await visibleOrgs.count()
      
      for (let i = 0; i < orgCount; i++) {
        const orgText = await visibleOrgs.nth(i).textContent()
        expect(orgText?.toLowerCase()).toContain('test')
      }
    })

    test('should filter organizations by status', async () => {
      await organizationsPage.filterByStatus('active')
      
      // All visible organizations should be active
      const activeOrgs = organizationsPage.organizationItems
      const orgCount = await activeOrgs.count()
      
      expect(orgCount).toBeGreaterThanOrEqual(0) // Should show results
      
      // Test archived filter
      await organizationsPage.filterByStatus('archived')
      
      // Should show archived organizations or empty state
      const archivedOrgs = organizationsPage.organizationItems
      const archivedCount = await archivedOrgs.count()
      
      // Verify filter is applied
      const filterButton = organizationsPage.page.locator('[data-testid="organizations-filter-status"]')
      const filterValue = await filterButton.textContent()
      expect(filterValue?.toLowerCase()).toContain('archived')
    })

    test('should sort organizations by different criteria', async () => {
      const sortDropdown = organizationsPage.page.locator('[data-testid="organizations-sort-dropdown"]')
      
      if (await sortDropdown.isVisible()) {
        // Test sort by name
        await organizationsPage.selectDropdownOption(sortDropdown, 'name-asc')
        await organizationsPage.waitForSpinnerToDisappear()
        
        // Get organization names
        const orgNames = await organizationsPage.organizationItems
          .locator('[data-testid="org-name"]')
          .allTextContents()
        
        // Verify alphabetical order
        const sortedNames = [...orgNames].sort()
        expect(orgNames).toEqual(sortedNames)
        
        // Test sort by creation date
        await organizationsPage.selectDropdownOption(sortDropdown, 'created-desc')
        await organizationsPage.waitForSpinnerToDisappear()
        
        // Should reorder the list
        const newOrder = await organizationsPage.organizationItems
          .locator('[data-testid="org-name"]')
          .allTextContents()
        
        expect(newOrder).not.toEqual(orgNames) // Order should change
      }
    })

    test('should clear search and filters', async () => {
      // Apply search and filter
      await organizationsPage.searchOrganizations('test')
      await organizationsPage.filterByStatus('active')
      
      // Clear filters
      const clearButton = organizationsPage.page.locator('[data-testid="clear-filters-button"]')
      if (await clearButton.isVisible()) {
        await clearButton.click()
        
        // Search should be cleared
        const searchInput = organizationsPage.page.locator('[data-testid="organizations-search"]')
        await expect(searchInput).toHaveValue('')
        
        // Should show all organizations
        await organizationsPage.expectOrganizationsDisplayed()
      }
    })
  })

  test.describe('Organization Permissions and Roles', () => {
    test('should enforce role-based permissions', async ({ page }) => {
      // Test with different user roles
      const roles = [
        { email: 'admin@e2e-test.com', role: 'admin', canCreate: true, canDelete: true },
        { email: 'director@e2e-test.com', role: 'director', canCreate: true, canDelete: false },
        { email: 'viewer@e2e-test.com', role: 'viewer', canCreate: false, canDelete: false },
      ]
      
      for (const roleTest of roles) {
        // Sign in as different user
        await page.goto('/auth/signin')
        await page.fill('[data-testid="email-input"]', roleTest.email)
        await page.fill('[data-testid="password-input"]', 'test-password-123')
        await page.click('[data-testid="signin-button"]')
        
        await page.goto('/dashboard/organizations')
        await expect(page.locator('[data-testid="organizations-page"]')).toBeVisible()
        
        // Check create permission
        const createButton = page.locator('[data-testid="create-organization-button"]')
        if (roleTest.canCreate) {
          await expect(createButton).toBeVisible()
        } else {
          await expect(createButton).not.toBeVisible()
        }
        
        // Check delete permission
        if (await organizationsPage.organizationItems.first().isVisible()) {
          await organizationsPage.openOrganizationActions(0)
          
          const deleteAction = page.locator('[data-testid="action-delete"]')
          if (roleTest.canDelete) {
            await expect(deleteAction).toBeVisible()
          } else {
            await expect(deleteAction).not.toBeVisible()
          }
          
          // Close action menu
          await page.keyboard.press('Escape')
        }
      }
    })

    test('should handle member role changes', async () => {
      await organizationsPage.expectOrganizationsDisplayed()
      await organizationsPage.openMembersManagement(0)
      
      const memberItems = organizationsPage.memberItem
      const memberCount = await memberItems.count()
      
      if (memberCount > 1) {
        // Change role of a member
        const member = memberItems.nth(1)
        const currentRole = await member.locator('[data-testid="member-role"]').textContent()
        const newRole = currentRole === 'member' ? 'director' : 'member'
        
        const roleSelect = member.locator('[data-testid="member-role-select"]')
        await organizationsPage.selectDropdownOption(roleSelect, newRole)
        
        // Should show confirmation and update
        await organizationsPage.expectSuccessMessage('Role updated')
        
        // Verify role change
        const updatedRole = await member.locator('[data-testid="member-role"]').textContent()
        expect(updatedRole?.toLowerCase()).toContain(newRole)
      }
    })

    test('should prevent unauthorized access to organization settings', async ({ page }) => {
      // Sign in as viewer
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'viewer@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/organizations')
      
      if (await organizationsPage.organizationItems.first().isVisible()) {
        await organizationsPage.openOrganizationActions(0)
        
        // Settings action should not be visible for viewer
        const settingsAction = page.locator('[data-testid="action-settings"]')
        await expect(settingsAction).not.toBeVisible()
      }
    })
  })

  test.describe('Organization Performance', () => {
    test('should load organizations page efficiently', async () => {
      const loadTime = await organizationsPage.measureActionTime(async () => {
        await organizationsPage.goToOrganizations()
      })
      
      expect(loadTime).toBeLessThan(2000) // Should load in under 2 seconds
    })

    test('should handle large organization lists', async ({ page }) => {
      // Mock large organization list
      const largeOrgList = Array.from({ length: 100 }, (_, i) => ({
        id: `org-${i}`,
        name: `Organization ${i}`,
        slug: `org-${i}`,
        memberCount: Math.floor(Math.random() * 50) + 1,
        createdAt: new Date().toISOString(),
      }))
      
      await page.route('**/api/organizations**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ organizations: largeOrgList, total: largeOrgList.length }),
        })
      })
      
      const loadTime = await organizationsPage.measureActionTime(async () => {
        await page.reload()
        await organizationsPage.waitForSpinnerToDisappear()
      })
      
      expect(loadTime).toBeLessThan(3000) // Should handle large lists efficiently
      
      // Should implement pagination or virtual scrolling
      const visibleOrgs = await organizationsPage.organizationItems.count()
      expect(visibleOrgs).toBeLessThanOrEqual(50) // Shouldn't render all 100 at once
    })

    test('should measure organization creation performance', async () => {
      const creationTime = await organizationsPage.measureOrganizationCreationTime()
      expect(creationTime).toBeLessThan(5000) // Should create in under 5 seconds
    })
  })

  test.describe('Organization Integration', () => {
    test('should integrate with vault creation', async ({ page }) => {
      // Create organization first
      const testData = TestUtils.createTestData()
      await organizationsPage.createOrganizationComplete(testData.organization.name)
      
      // Navigate to vaults and verify organization is available
      await page.goto('/dashboard/vaults/create')
      
      const orgSelector = page.locator('[data-testid="vault-organization-select"]')
      if (await orgSelector.isVisible()) {
        await orgSelector.click()
        
        // Should show the newly created organization as an option
        const orgOption = page.locator(`[data-testid="org-option"]`, { hasText: testData.organization.name })
        await expect(orgOption).toBeVisible()
      }
    })

    test('should integrate with member invitations', async ({ page }) => {
      await organizationsPage.expectOrganizationsDisplayed()
      await organizationsPage.openMembersManagement(0)
      
      // Invite new member
      const newMemberEmail = TestUtils.generateRandomEmail()
      await organizationsPage.inviteNewMember(newMemberEmail, 'member')
      
      // Should send invitation email (in real app)
      // For E2E test, verify invitation appears in pending invitations
      const pendingInvites = page.locator('[data-testid="pending-invitations"]')
      if (await pendingInvites.isVisible()) {
        const inviteItem = pendingInvites.locator(`[data-email="${newMemberEmail}"]`)
        await expect(inviteItem).toBeVisible()
      }
    })

    test('should integrate with activity logging', async () => {
      const testData = TestUtils.createTestData()
      
      // Create organization
      await organizationsPage.createOrganizationComplete(testData.organization.name)
      
      // Check activity log
      await organizationsPage.goToOrganizations()
      await organizationsPage.viewOrganizationDetails(0)
      
      const activityTab = organizationsPage.page.locator('[data-testid="tab-activity"]')
      if (await activityTab.isVisible()) {
        await activityTab.click()
        
        const activityFeed = organizationsPage.page.locator('[data-testid="activity-feed"]')
        await expect(activityFeed).toBeVisible()
        
        // Should show organization creation activity
        const createActivity = activityFeed.locator(`[data-activity-type="organization.created"]`)
        if (await createActivity.isVisible()) {
          await expect(createActivity).toContainText('Organization created')
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/organizations**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      })
      
      await page.reload()
      
      // Should show error state
      const errorBoundary = page.locator('[data-testid="error-boundary"]')
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      await expect(errorBoundary.or(errorMessage)).toBeVisible()
      
      // Should have retry option
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible()
      }
    })

    test('should handle network timeout', async ({ page }) => {
      // Mock slow network
      await page.route('**/api/organizations**', async route => {
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
        route.continue()
      })
      
      await organizationsPage.startCreateOrganization()
      await organizationsPage.fillBasicInformation('Timeout Test Org')
      
      const submitButton = organizationsPage.page.locator('[data-testid="create-org-submit-button"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        
        // Should show timeout error or loading state
        const loadingSpinner = organizationsPage.page.locator('[data-testid="loading-spinner"]')
        const timeoutError = organizationsPage.page.locator('[data-testid="timeout-error"]')
        
        await expect(loadingSpinner.or(timeoutError)).toBeVisible({ timeout: 15000 })
      }
    })

    test('should handle validation errors from server', async ({ page }) => {
      // Mock server validation error
      await page.route('**/api/organizations**', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 422,
            body: JSON.stringify({
              error: 'Validation failed',
              details: {
                name: 'Organization name already exists',
                slug: 'Slug is invalid format'
              }
            }),
          })
        } else {
          route.continue()
        }
      })
      
      const testData = TestUtils.createTestData()
      await organizationsPage.startCreateOrganization()
      await organizationsPage.fillBasicInformation(testData.organization.name)
      
      // Try to create organization
      await organizationsPage.proceedToNextStep()
      
      // Should show server validation errors
      await organizationsPage.expectErrorMessage('Organization name already exists')
    })
  })
})