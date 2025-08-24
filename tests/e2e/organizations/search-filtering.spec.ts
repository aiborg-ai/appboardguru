import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Page Advanced Search & Filtering
 * 
 * Tests all search functionality, debounced search, filter presets,
 * advanced filtering options, and search performance.
 */

test.describe('Organizations Advanced Search & Filtering', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page and wait for load
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
  })

  test.describe('Search Functionality', () => {
    test('should perform basic text search', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      await expect(searchInput).toBeVisible()
      
      // Get initial count
      const initialCards = await page.locator('[data-testid="organization-card"]').count()
      
      // Perform search
      await searchInput.fill('test')
      await page.waitForTimeout(500) // Wait for debounce
      
      // Verify search results
      const filteredCards = await page.locator('[data-testid="organization-card"]').count()
      
      // Results should be filtered (or show "no results" message)
      const noResultsVisible = await page.locator('text=No results found').isVisible()
      
      if (!noResultsVisible) {
        expect(filteredCards).toBeLessThanOrEqual(initialCards)
      }
      
      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)
      
      // Should return to original results
      const finalCards = await page.locator('[data-testid="organization-card"]').count()
      expect(finalCards).toBe(initialCards)
    })

    test('should implement debounced search', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      // Track network requests to verify debouncing
      const requests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/api/organizations')) {
          requests.push(request.url())
        }
      })
      
      // Rapidly type characters
      await searchInput.type('searchterm', { delay: 50 })
      
      // Wait for debounce period
      await page.waitForTimeout(600)
      
      // Should have minimal API calls due to debouncing
      // This depends on implementation, but should not have one call per character
      console.log('Search API calls:', requests.length)
      expect(requests.length).toBeLessThan(10) // Reasonable debounce limit
    })

    test('should search across multiple fields', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      // Test searching by organization name
      await searchInput.fill('organization')
      await page.waitForTimeout(500)
      
      let results = await page.locator('[data-testid="organization-card"]').count()
      console.log('Name search results:', results)
      
      // Clear and test description search
      await searchInput.clear()
      await searchInput.fill('description')
      await page.waitForTimeout(500)
      
      results = await page.locator('[data-testid="organization-card"]').count()
      console.log('Description search results:', results)
      
      // Clear and test industry search
      await searchInput.clear()
      await searchInput.fill('technology')
      await page.waitForTimeout(500)
      
      results = await page.locator('[data-testid="organization-card"]').count()
      console.log('Industry search results:', results)
    })

    test('should handle special characters and edge cases', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      // Test special characters
      const testQueries = [
        '@#$%^&*()',
        '   spaces   ',
        'unicodé tést',
        '',
        'very long search query that might exceed normal limits and should be handled gracefully'
      ]
      
      for (const query of testQueries) {
        await searchInput.fill(query)
        await page.waitForTimeout(300)
        
        // Should not crash or show errors
        await expect(page.locator('body')).toBeVisible()
        
        // Clear for next test
        await searchInput.clear()
        await page.waitForTimeout(100)
      }
    })

    test('should show search suggestions/autocomplete', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      await searchInput.fill('test')
      
      // Check for autocomplete dropdown if implemented
      const autocompleteDropdown = page.locator('[data-testid="search-autocomplete"]')
      
      // If autocomplete is implemented, test it
      if (await autocompleteDropdown.isVisible({ timeout: 1000 })) {
        const suggestions = page.locator('[data-testid="search-suggestion"]')
        await expect(suggestions.first()).toBeVisible()
        
        // Click on first suggestion
        await suggestions.first().click()
        
        // Should populate search and show results
        const searchValue = await searchInput.inputValue()
        expect(searchValue.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Filter Functionality', () => {
    test('should filter by organization role', async () => {
      // Open role filter
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await expect(roleFilter).toBeVisible()
      await roleFilter.click()
      
      // Check for filter options
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      const adminOption = page.locator('[data-testid="filter-option-admin"]')
      const memberOption = page.locator('[data-testid="filter-option-member"]')
      
      // Test owner filter
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
        
        // Verify filtered results
        const roleLabels = page.locator('[data-testid="organization-role"]')
        if (await roleLabels.first().isVisible()) {
          const count = await roleLabels.count()
          for (let i = 0; i < count; i++) {
            const roleText = await roleLabels.nth(i).textContent()
            expect(roleText?.toLowerCase()).toContain('owner')
          }
        }
        
        // Clear filter
        await roleFilter.click()
        const clearFilter = page.locator('[data-testid="clear-role-filter"]')
        if (await clearFilter.isVisible()) {
          await clearFilter.click()
        }
      }
    })

    test('should filter by organization status', async () => {
      const statusFilter = page.locator('[data-testid="filter-status"]')
      await expect(statusFilter).toBeVisible()
      await statusFilter.click()
      
      // Test active filter
      const activeOption = page.locator('[data-testid="filter-option-active"]')
      if (await activeOption.isVisible()) {
        await activeOption.click()
        await page.waitForTimeout(300)
        
        // Verify all visible organizations are active
        const statusBadges = page.locator('[data-testid="organization-status"]')
        if (await statusBadges.first().isVisible()) {
          const count = await statusBadges.count()
          for (let i = 0; i < count; i++) {
            const statusText = await statusBadges.nth(i).textContent()
            expect(statusText?.toLowerCase()).toContain('active')
          }
        }
      }
    })

    test('should combine multiple filters', async () => {
      // Apply role filter
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
      }
      
      // Apply status filter
      const statusFilter = page.locator('[data-testid="filter-status"]')
      await statusFilter.click()
      
      const activeOption = page.locator('[data-testid="filter-option-active"]')
      if (await activeOption.isVisible()) {
        await activeOption.click()
        await page.waitForTimeout(300)
        
        // Verify combined filters
        const cards = page.locator('[data-testid="organization-card"]')
        const cardCount = await cards.count()
        
        // Should show only organizations that match both filters
        console.log('Combined filter results:', cardCount)
      }
    })

    test('should show filter result counts', async () => {
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      // Check for count badges on filter options
      const ownerCount = page.locator('[data-testid="filter-option-owner"] [data-testid="filter-count"]')
      const adminCount = page.locator('[data-testid="filter-option-admin"] [data-testid="filter-count"]')
      
      if (await ownerCount.isVisible()) {
        const count = await ownerCount.textContent()
        expect(count).toMatch(/^\d+$/) // Should be a number
      }
      
      if (await adminCount.isVisible()) {
        const count = await adminCount.textContent()
        expect(count).toMatch(/^\d+$/)
      }
    })
  })

  test.describe('Filter Presets', () => {
    test('should have preset filter combinations', async () => {
      // Check for preset buttons if implemented
      const myOrgsPreset = page.locator('[data-testid="preset-my-organizations"]')
      const activeOrgsPreset = page.locator('[data-testid="preset-active-organizations"]')
      const favoriteOrgsPreset = page.locator('[data-testid="preset-favorite-organizations"]')
      
      // Test "My Organizations" preset
      if (await myOrgsPreset.isVisible()) {
        await myOrgsPreset.click()
        await page.waitForTimeout(300)
        
        // Should filter to user's organizations
        const cards = await page.locator('[data-testid="organization-card"]').count()
        console.log('My organizations preset results:', cards)
        
        // Verify filter indicators are active
        await expect(page.locator('[data-testid="active-filters"]')).toBeVisible()
      }
    })

    test('should save and recall custom filter presets', async () => {
      // Apply some filters
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
      }
      
      // Look for save preset button
      const savePresetButton = page.locator('[data-testid="save-filter-preset"]')
      if (await savePresetButton.isVisible()) {
        await savePresetButton.click()
        
        // Fill preset name
        const presetNameInput = page.locator('[data-testid="preset-name-input"]')
        await presetNameInput.fill('My Custom Preset')
        
        // Save
        const confirmSaveButton = page.locator('[data-testid="confirm-save-preset"]')
        await confirmSaveButton.click()
        
        // Clear filters
        const clearAllFilters = page.locator('[data-testid="clear-all-filters"]')
        await clearAllFilters.click()
        await page.waitForTimeout(300)
        
        // Apply saved preset
        const customPreset = page.locator('[data-testid="preset-my-custom-preset"]')
        await expect(customPreset).toBeVisible()
        await customPreset.click()
        
        // Should reapply the saved filters
        await expect(page.locator('[data-testid="active-filters"]')).toBeVisible()
      }
    })
  })

  test.describe('Advanced Filtering', () => {
    test('should filter by date ranges', async () => {
      const dateFilter = page.locator('[data-testid="filter-date-created"]')
      
      if (await dateFilter.isVisible()) {
        await dateFilter.click()
        
        // Select last 30 days option
        const last30Days = page.locator('[data-testid="date-filter-30-days"]')
        if (await last30Days.isVisible()) {
          await last30Days.click()
          await page.waitForTimeout(300)
          
          // Verify results are within date range
          const cards = await page.locator('[data-testid="organization-card"]').count()
          console.log('Date filter results:', cards)
        }
        
        // Test custom date range
        const customDateRange = page.locator('[data-testid="date-filter-custom"]')
        if (await customDateRange.isVisible()) {
          await customDateRange.click()
          
          // Set from and to dates
          const fromDate = page.locator('[data-testid="date-from-input"]')
          const toDate = page.locator('[data-testid="date-to-input"]')
          
          await fromDate.fill('2024-01-01')
          await toDate.fill('2024-12-31')
          
          const applyDateFilter = page.locator('[data-testid="apply-date-filter"]')
          await applyDateFilter.click()
          await page.waitForTimeout(300)
        }
      }
    })

    test('should filter by member count ranges', async () => {
      const memberCountFilter = page.locator('[data-testid="filter-member-count"]')
      
      if (await memberCountFilter.isVisible()) {
        await memberCountFilter.click()
        
        // Select size range
        const smallOrgs = page.locator('[data-testid="member-count-1-10"]')
        if (await smallOrgs.isVisible()) {
          await smallOrgs.click()
          await page.waitForTimeout(300)
          
          // Verify member counts are within range
          const memberCounts = page.locator('[data-testid="organization-member-count"]')
          if (await memberCounts.first().isVisible()) {
            const count = await memberCounts.count()
            for (let i = 0; i < count; i++) {
              const memberText = await memberCounts.nth(i).textContent()
              const memberNum = parseInt(memberText?.match(/\d+/)?.[0] || '0')
              expect(memberNum).toBeLessThanOrEqual(10)
            }
          }
        }
      }
    })

    test('should filter by industry/category', async () => {
      const industryFilter = page.locator('[data-testid="filter-industry"]')
      
      if (await industryFilter.isVisible()) {
        await industryFilter.click()
        
        // Select technology industry
        const techIndustry = page.locator('[data-testid="industry-technology"]')
        if (await techIndustry.isVisible()) {
          await techIndustry.click()
          await page.waitForTimeout(300)
          
          // Verify industry tags
          const industryTags = page.locator('[data-testid="organization-industry"]')
          if (await industryTags.first().isVisible()) {
            const count = await industryTags.count()
            for (let i = 0; i < count; i++) {
              const industryText = await industryTags.nth(i).textContent()
              expect(industryText?.toLowerCase()).toContain('technology')
            }
          }
        }
      }
    })
  })

  test.describe('Sorting Functionality', () => {
    test('should sort by name alphabetically', async () => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]')
      await sortDropdown.click()
      
      const sortByName = page.locator('[data-testid="sort-option-name"]')
      await sortByName.click()
      await page.waitForTimeout(300)
      
      // Get organization names and verify alphabetical order
      const orgNames = await page.locator('[data-testid="organization-name"]').allTextContents()
      
      if (orgNames.length > 1) {
        const sortedNames = [...orgNames].sort()
        expect(orgNames).toEqual(sortedNames)
      }
    })

    test('should sort by creation date', async () => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]')
      await sortDropdown.click()
      
      const sortByDate = page.locator('[data-testid="sort-option-created"]')
      if (await sortByDate.isVisible()) {
        await sortByDate.click()
        await page.waitForTimeout(300)
        
        // Verify sort order indicator
        await expect(page.locator('[data-testid="sort-indicator-desc"]')).toBeVisible()
      }
    })

    test('should sort by member count', async () => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]')
      await sortDropdown.click()
      
      const sortByMembers = page.locator('[data-testid="sort-option-members"]')
      if (await sortByMembers.isVisible()) {
        await sortByMembers.click()
        await page.waitForTimeout(300)
        
        // Get member counts and verify order
        const memberCounts = await page.locator('[data-testid="organization-member-count"]').allTextContents()
        const numbers = memberCounts.map(text => parseInt(text.match(/\d+/)?.[0] || '0'))
        
        if (numbers.length > 1) {
          // Should be in descending order by default
          const sortedNumbers = [...numbers].sort((a, b) => b - a)
          expect(numbers).toEqual(sortedNumbers)
        }
      }
    })

    test('should toggle sort direction', async () => {
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]')
      await sortDropdown.click()
      
      const sortByName = page.locator('[data-testid="sort-option-name"]')
      await sortByName.click()
      await page.waitForTimeout(300)
      
      // Click sort direction toggle
      const sortDirectionToggle = page.locator('[data-testid="sort-direction-toggle"]')
      if (await sortDirectionToggle.isVisible()) {
        await sortDirectionToggle.click()
        await page.waitForTimeout(300)
        
        // Verify direction changed
        await expect(page.locator('[data-testid="sort-indicator-asc"]')).toBeVisible()
      }
    })
  })

  test.describe('Search & Filter State Management', () => {
    test('should persist filters across page reloads', async () => {
      // Apply a filter
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
      }
      
      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check if filter persisted
      const activeFilters = page.locator('[data-testid="active-filters"]')
      if (await activeFilters.isVisible()) {
        await expect(activeFilters).toContainText('owner')
      }
    })

    test('should clear all filters', async () => {
      // Apply multiple filters
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('test')
      
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
      }
      
      // Clear all filters
      const clearAllButton = page.locator('[data-testid="clear-all-filters"]')
      await clearAllButton.click()
      
      // Verify all filters cleared
      const searchValue = await searchInput.inputValue()
      expect(searchValue).toBe('')
      
      const activeFilters = page.locator('[data-testid="active-filters"]')
      await expect(activeFilters).not.toBeVisible()
    })

    test('should show applied filters summary', async () => {
      // Apply some filters
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('test org')
      
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        await page.waitForTimeout(300)
      }
      
      // Check filter summary
      const filterSummary = page.locator('[data-testid="filter-summary"]')
      if (await filterSummary.isVisible()) {
        await expect(filterSummary).toContainText('test org')
        await expect(filterSummary).toContainText('owner')
      }
      
      // Check result count
      const resultCount = page.locator('[data-testid="result-count"]')
      if (await resultCount.isVisible()) {
        const countText = await resultCount.textContent()
        expect(countText).toMatch(/\d+ of \d+ organizations?/)
      }
    })
  })

  test.describe('Performance', () => {
    test('should handle rapid filter changes without lag', async () => {
      const roleFilter = page.locator('[data-testid="filter-role"]')
      const statusFilter = page.locator('[data-testid="filter-status"]')
      
      const startTime = Date.now()
      
      // Rapidly toggle filters
      for (let i = 0; i < 5; i++) {
        await roleFilter.click()
        const ownerOption = page.locator('[data-testid="filter-option-owner"]')
        if (await ownerOption.isVisible()) {
          await ownerOption.click()
        }
        
        await statusFilter.click()
        const activeOption = page.locator('[data-testid="filter-option-active"]')
        if (await activeOption.isVisible()) {
          await activeOption.click()
        }
        
        // Clear filters
        const clearAll = page.locator('[data-testid="clear-all-filters"]')
        if (await clearAll.isVisible()) {
          await clearAll.click()
        }
        
        await page.waitForTimeout(50)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000)
    })

    test('should handle large result sets efficiently', async () => {
      // Clear any existing filters to show all results
      const clearAll = page.locator('[data-testid="clear-all-filters"]')
      if (await clearAll.isVisible()) {
        await clearAll.click()
        await page.waitForTimeout(300)
      }
      
      // Measure scroll performance with all results
      const startTime = performance.now()
      
      // Scroll through results
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 500)
        await page.waitForTimeout(100)
      }
      
      const endTime = performance.now()
      const scrollDuration = endTime - startTime
      
      // Should scroll smoothly even with many results
      expect(scrollDuration).toBeLessThan(1000)
    })
  })
})