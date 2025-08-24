import { test, expect, Page } from '@playwright/test'

test.describe('Organizations Advanced Search & Filtering', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Mock large dataset for comprehensive testing
    await page.route('/api/organizations*', (route) => {
      const url = new URL(route.request().url())
      const search = url.searchParams.get('search') || ''
      const status = url.searchParams.get('status') || ''
      const minMembers = parseInt(url.searchParams.get('minMembers') || '0')
      const maxMembers = parseInt(url.searchParams.get('maxMembers') || '1000')
      const tags = url.searchParams.get('tags')?.split(',') || []
      const sortBy = url.searchParams.get('sortBy') || 'name'
      const sortOrder = url.searchParams.get('sortOrder') || 'asc'
      
      // Mock dataset
      let organizations = [
        { 
          id: '1', 
          name: 'Alpha Corporation', 
          memberCount: 25, 
          status: 'active',
          tags: ['enterprise', 'technology'],
          createdAt: '2024-01-01',
          lastActivity: '2024-01-15',
          description: 'A technology corporation focused on innovation'
        },
        { 
          id: '2', 
          name: 'Beta Industries', 
          memberCount: 50, 
          status: 'active',
          tags: ['manufacturing', 'large'],
          createdAt: '2024-02-01',
          lastActivity: '2024-01-14',
          description: 'Manufacturing company with global operations'
        },
        { 
          id: '3', 
          name: 'Gamma Startup', 
          memberCount: 8, 
          status: 'pending',
          tags: ['startup', 'technology'],
          createdAt: '2024-03-01',
          lastActivity: '2024-01-13',
          description: 'Innovative startup in the tech space'
        },
        { 
          id: '4', 
          name: 'Delta Consulting', 
          memberCount: 15, 
          status: 'inactive',
          tags: ['consulting', 'small'],
          createdAt: '2024-01-15',
          lastActivity: '2024-01-10',
          description: 'Professional consulting services'
        },
        { 
          id: '5', 
          name: 'Epsilon Networks', 
          memberCount: 35, 
          status: 'active',
          tags: ['technology', 'networking'],
          createdAt: '2024-02-15',
          lastActivity: '2024-01-16',
          description: 'Network infrastructure and solutions'
        }
      ]

      // Apply search filter
      if (search) {
        organizations = organizations.filter(org =>
          org.name.toLowerCase().includes(search.toLowerCase()) ||
          org.description.toLowerCase().includes(search.toLowerCase())
        )
      }

      // Apply status filter
      if (status) {
        organizations = organizations.filter(org => org.status === status)
      }

      // Apply member count filter
      organizations = organizations.filter(org => 
        org.memberCount >= minMembers && org.memberCount <= maxMembers
      )

      // Apply tags filter
      if (tags.length > 0 && tags[0] !== '') {
        organizations = organizations.filter(org =>
          tags.some(tag => org.tags.includes(tag))
        )
      }

      // Apply sorting
      organizations.sort((a, b) => {
        let aVal, bVal
        switch (sortBy) {
          case 'memberCount':
            aVal = a.memberCount
            bVal = b.memberCount
            break
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime()
            bVal = new Date(b.createdAt).getTime()
            break
          case 'lastActivity':
            aVal = new Date(a.lastActivity).getTime()
            bVal = new Date(b.lastActivity).getTime()
            break
          default:
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
        }

        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        }
      })

      const delay = url.searchParams.has('delay') ? parseInt(url.searchParams.get('delay')!) : 0
      
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organizations,
            totalCount: organizations.length,
            facets: {
              status: {
                active: 3,
                pending: 1,
                inactive: 1
              },
              memberCount: {
                '1-10': 1,
                '11-25': 2,
                '26-50': 2,
                '51+': 0
              },
              tags: {
                technology: 3,
                enterprise: 1,
                manufacturing: 1,
                startup: 1,
                consulting: 1,
                networking: 1,
                large: 1,
                small: 1
              }
            }
          })
        })
      }, delay)
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

  test.describe('Search Functionality', () => {
    test('should perform basic text search with debouncing', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      // Type search query
      await searchInput.fill('alpha')
      
      // Wait for debounced search (should be ~500ms)
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('search=alpha')
      )
      
      // Verify search results
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(1)
      await expect(page.locator('text=Alpha Corporation')).toBeVisible()
      
      // Verify search results count
      await expect(page.locator('[data-testid="search-results-count"]')).toContainText('1 organization found')
    })

    test('should search across multiple fields (name and description)', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      // Search by description content
      await searchInput.fill('innovation')
      
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('search=innovation')
      )
      
      // Should find both Alpha Corporation and Gamma Startup
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(2)
      await expect(page.locator('text=Alpha Corporation')).toBeVisible()
      await expect(page.locator('text=Gamma Startup')).toBeVisible()
    })

    test('should handle empty search results gracefully', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      await searchInput.fill('nonexistentorganization')
      
      await page.waitForResponse(response => 
        response.url().includes('search=nonexistentorganization')
      )
      
      // Verify empty state
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="empty-search-results"]')).toBeVisible()
      await expect(page.locator('text=No organizations match your search')).toBeVisible()
      
      // Verify search suggestions
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible()
      await expect(page.locator('[data-testid="clear-search-button"]')).toBeVisible()
    })

    test('should clear search results', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      // Perform search
      await searchInput.fill('alpha')
      await page.waitForResponse(response => response.url().includes('search=alpha'))
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(1)
      
      // Clear search
      await page.click('[data-testid="clear-search-button"]')
      
      // Verify all organizations are shown again
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && !response.url().includes('search=')
      )
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(5)
      await expect(searchInput).toHaveValue('')
    })

    test('should show search suggestions and autocomplete', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      // Mock search suggestions API
      await page.route('/api/organizations/suggestions*', (route) => {
        const query = new URL(route.request().url()).searchParams.get('q') || ''
        const suggestions = [
          'Alpha Corporation',
          'Alpha Industries',
          'Beta Industries'
        ].filter(name => name.toLowerCase().includes(query.toLowerCase()))
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions })
        })
      })
      
      // Start typing
      await searchInput.fill('alp')
      
      // Wait for suggestions dropdown
      await expect(page.locator('[data-testid="search-suggestions-dropdown"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-suggestion"]')).toHaveCount(2)
      
      // Click on suggestion
      await page.click('[data-testid="search-suggestion"]', { hasText: 'Alpha Corporation' })
      
      // Verify suggestion is applied
      await expect(searchInput).toHaveValue('Alpha Corporation')
      await page.waitForResponse(response => response.url().includes('search=Alpha+Corporation'))
      await expect(page.locator('text=Alpha Corporation')).toBeVisible()
    })

    test('should support keyboard navigation in search suggestions', async () => {
      const searchInput = page.locator('[data-testid="organization-search"]')
      
      await page.route('/api/organizations/suggestions*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            suggestions: ['Alpha Corporation', 'Alpha Industries', 'Beta Alpha']
          })
        })
      })
      
      await searchInput.fill('alp')
      await expect(page.locator('[data-testid="search-suggestions-dropdown"]')).toBeVisible()
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-testid="search-suggestion"].highlighted').first()).toBeVisible()
      
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('[data-testid="search-suggestion"].highlighted').nth(1)).toBeVisible()
      
      // Select with Enter
      await page.keyboard.press('Enter')
      
      await expect(searchInput).toHaveValue('Alpha Industries')
    })
  })

  test.describe('Status Filtering', () => {
    test('should filter by active status', async () => {
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')
      
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('status=active')
      )
      
      // Should show only active organizations
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(3)
      
      // Verify active status badge on all visible organizations
      const statusBadges = page.locator('[data-testid="organization-status-badge"]')
      await expect(statusBadges).toHaveCount(3)
      
      for (let i = 0; i < 3; i++) {
        await expect(statusBadges.nth(i)).toContainText('Active')
        await expect(statusBadges.nth(i)).toHaveClass(/status-active|text-green/)
      }
      
      // Verify filter is applied in UI
      await expect(page.locator('[data-testid="applied-filter-status"]')).toBeVisible()
      await expect(page.locator('[data-testid="applied-filter-status"]')).toContainText('Status: Active')
    })

    test('should filter by pending status', async () => {
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-pending"]')
      
      await page.waitForResponse(response => response.url().includes('status=pending'))
      
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(1)
      await expect(page.locator('text=Gamma Startup')).toBeVisible()
      await expect(page.locator('[data-testid="organization-status-badge"]')).toContainText('Pending')
    })

    test('should show status facet counts', async () => {
      await page.click('[data-testid="status-filter-dropdown"]')
      
      // Verify facet counts are displayed
      await expect(page.locator('[data-testid="facet-status-active"]')).toContainText('Active (3)')
      await expect(page.locator('[data-testid="facet-status-pending"]')).toContainText('Pending (1)')
      await expect(page.locator('[data-testid="facet-status-inactive"]')).toContainText('Inactive (1)')
    })

    test('should clear status filter', async () => {
      // Apply status filter first
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')
      await page.waitForResponse(response => response.url().includes('status=active'))
      
      // Clear the filter
      await page.click('[data-testid="clear-status-filter"]')
      
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && !response.url().includes('status=')
      )
      
      // Should show all organizations again
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(5)
      await expect(page.locator('[data-testid="applied-filter-status"]')).not.toBeVisible()
    })
  })

  test.describe('Member Count Range Filtering', () => {
    test('should filter by member count range', async () => {
      await page.click('[data-testid="member-count-filter-dropdown"]')
      
      // Set range 20-40 members
      await page.fill('[data-testid="min-members-input"]', '20')
      await page.fill('[data-testid="max-members-input"]', '40')
      await page.click('[data-testid="apply-member-range"]')
      
      await page.waitForResponse(response => 
        response.url().includes('minMembers=20') && response.url().includes('maxMembers=40')
      )
      
      // Should show organizations with 25 and 35 members
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(2)
      await expect(page.locator('text=Alpha Corporation')).toBeVisible() // 25 members
      await expect(page.locator('text=Epsilon Networks')).toBeVisible() // 35 members
      
      // Verify applied filter display
      await expect(page.locator('[data-testid="applied-filter-members"]')).toBeVisible()
      await expect(page.locator('[data-testid="applied-filter-members"]')).toContainText('Members: 20-40')
    })

    test('should use predefined member count ranges', async () => {
      await page.click('[data-testid="member-count-filter-dropdown"]')
      await page.click('[data-testid="member-range-1-10"]')
      
      await page.waitForResponse(response => 
        response.url().includes('minMembers=1') && response.url().includes('maxMembers=10')
      )
      
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(1)
      await expect(page.locator('text=Gamma Startup')).toBeVisible() // 8 members
    })

    test('should validate member count range inputs', async () => {
      await page.click('[data-testid="member-count-filter-dropdown"]')
      
      // Try to set invalid range (max < min)
      await page.fill('[data-testid="min-members-input"]', '50')
      await page.fill('[data-testid="max-members-input"]', '20')
      await page.click('[data-testid="apply-member-range"]')
      
      // Should show validation error
      await expect(page.locator('[data-testid="member-range-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-range-error"]')).toContainText('Maximum must be greater than minimum')
      
      // Filter should not be applied
      const currentUrl = page.url()
      expect(currentUrl).not.toContain('minMembers=50')
    })

    test('should show member count distribution', async () => {
      await page.click('[data-testid="member-count-filter-dropdown"]')
      
      // Verify distribution histogram/chart
      await expect(page.locator('[data-testid="member-count-distribution"]')).toBeVisible()
      
      // Check distribution bars
      await expect(page.locator('[data-testid="distribution-bar-1-10"]')).toHaveAttribute('data-count', '1')
      await expect(page.locator('[data-testid="distribution-bar-11-25"]')).toHaveAttribute('data-count', '2')
      await expect(page.locator('[data-testid="distribution-bar-26-50"]')).toHaveAttribute('data-count', '2')
    })
  })

  test.describe('Tag Filtering', () => {
    test('should filter by single tag', async () => {
      await page.click('[data-testid="tags-filter-dropdown"]')
      await page.click('[data-testid="tag-filter-technology"]')
      
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('tags=technology')
      )
      
      // Should show 3 organizations with technology tag
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(3)
      await expect(page.locator('text=Alpha Corporation')).toBeVisible()
      await expect(page.locator('text=Gamma Startup')).toBeVisible()
      await expect(page.locator('text=Epsilon Networks')).toBeVisible()
    })

    test('should filter by multiple tags (OR logic)', async () => {
      await page.click('[data-testid="tags-filter-dropdown"]')
      await page.click('[data-testid="tag-filter-technology"]')
      await page.click('[data-testid="tag-filter-consulting"]')
      
      await page.waitForResponse(response => 
        response.url().includes('tags=technology,consulting')
      )
      
      // Should show organizations with either technology OR consulting tags
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(4)
    })

    test('should show tag cloud with counts', async () => {
      await page.click('[data-testid="tags-filter-dropdown"]')
      
      // Verify tag cloud
      await expect(page.locator('[data-testid="tag-cloud"]')).toBeVisible()
      
      // Check individual tags with counts
      await expect(page.locator('[data-testid="tag-technology"]')).toContainText('technology (3)')
      await expect(page.locator('[data-testid="tag-enterprise"]')).toContainText('enterprise (1)')
      await expect(page.locator('[data-testid="tag-manufacturing"]')).toContainText('manufacturing (1)')
      
      // Tags should be sized/styled based on frequency
      const techTag = page.locator('[data-testid="tag-technology"]')
      const enterpriseTag = page.locator('[data-testid="tag-enterprise"]')
      
      // Technology tag should be larger (more frequent)
      const techSize = await techTag.evaluate(el => window.getComputedStyle(el).fontSize)
      const enterpriseSize = await enterpriseTag.evaluate(el => window.getComputedStyle(el).fontSize)
      
      expect(parseFloat(techSize)).toBeGreaterThan(parseFloat(enterpriseSize))
    })

    test('should support tag search within tag filter', async () => {
      await page.click('[data-testid="tags-filter-dropdown"]')
      
      // Search for specific tags
      await page.fill('[data-testid="tag-search-input"]', 'tech')
      
      // Should filter tag list
      await expect(page.locator('[data-testid="tag-technology"]')).toBeVisible()
      await expect(page.locator('[data-testid="tag-enterprise"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="tag-manufacturing"]')).not.toBeVisible()
    })
  })

  test.describe('Date Range Filtering', () => {
    test('should filter by creation date range', async () => {
      await page.click('[data-testid="date-filter-dropdown"]')
      await page.click('[data-testid="date-filter-tab-created"]')
      
      // Set date range for February 2024
      await page.fill('[data-testid="start-date-input"]', '2024-02-01')
      await page.fill('[data-testid="end-date-input"]', '2024-02-28')
      await page.click('[data-testid="apply-date-range"]')
      
      await page.waitForResponse(response => 
        response.url().includes('createdAfter=2024-02-01') && 
        response.url().includes('createdBefore=2024-02-28')
      )
      
      // Should show organizations created in February
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(2)
      await expect(page.locator('text=Beta Industries')).toBeVisible()
      await expect(page.locator('text=Epsilon Networks')).toBeVisible()
    })

    test('should use predefined date ranges', async () => {
      await page.click('[data-testid="date-filter-dropdown"]')
      await page.click('[data-testid="quick-date-last-30-days"]')
      
      // Should apply last 30 days filter
      await page.waitForResponse(response => response.url().includes('createdAfter='))
      
      // Verify quick filter is highlighted
      await expect(page.locator('[data-testid="quick-date-last-30-days"]')).toHaveClass(/active|selected/)
      
      // Verify applied filter display
      await expect(page.locator('[data-testid="applied-filter-date"]')).toContainText('Last 30 days')
    })

    test('should filter by last activity date', async () => {
      await page.click('[data-testid="date-filter-dropdown"]')
      await page.click('[data-testid="date-filter-tab-activity"]')
      await page.click('[data-testid="quick-date-last-7-days"]')
      
      await page.waitForResponse(response => response.url().includes('lastActivityAfter='))
      
      // Should show organizations active in last 7 days
      const expectedCount = await page.locator('[data-testid="organization-card"]').count()
      expect(expectedCount).toBeGreaterThan(0)
    })
  })

  test.describe('Advanced Search Combinations', () => {
    test('should combine multiple filters', async () => {
      // Apply multiple filters
      await page.fill('[data-testid="organization-search"]', 'corp')
      await page.waitForTimeout(600) // Wait for debounce
      
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')
      
      await page.click('[data-testid="tags-filter-dropdown"]')
      await page.click('[data-testid="tag-filter-technology"]')
      
      // Wait for combined filter request
      await page.waitForResponse(response => {
        const url = response.url()
        return url.includes('search=corp') && 
               url.includes('status=active') && 
               url.includes('tags=technology')
      })
      
      // Should show Alpha Corporation only
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(1)
      await expect(page.locator('text=Alpha Corporation')).toBeVisible()
      
      // Verify all applied filters are shown
      await expect(page.locator('[data-testid="applied-filters"]')).toBeVisible()
      await expect(page.locator('[data-testid="applied-filter-search"]')).toContainText('Search: corp')
      await expect(page.locator('[data-testid="applied-filter-status"]')).toContainText('Status: Active')
      await expect(page.locator('[data-testid="applied-filter-tags"]')).toContainText('Tags: technology')
    })

    test('should clear all filters at once', async () => {
      // Apply multiple filters
      await page.fill('[data-testid="organization-search"]', 'alpha')
      await page.waitForTimeout(600)
      
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')
      
      await page.waitForResponse(response => response.url().includes('search=alpha'))
      
      // Clear all filters
      await page.click('[data-testid="clear-all-filters"]')
      
      await page.waitForResponse(response => {
        const url = response.url()
        return url.includes('/api/organizations') && 
               !url.includes('search=') && 
               !url.includes('status=')
      })
      
      // Should show all organizations
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(5)
      await expect(page.locator('[data-testid="applied-filters"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="organization-search"]')).toHaveValue('')
    })

    test('should save and load filter presets', async () => {
      // Apply some filters
      await page.fill('[data-testid="organization-search"]', 'tech')
      await page.waitForTimeout(600)
      
      await page.click('[data-testid="status-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')
      
      await page.waitForResponse(response => response.url().includes('search=tech'))
      
      // Save as preset
      await page.click('[data-testid="save-filter-preset"]')
      await page.fill('[data-testid="preset-name-input"]', 'Active Tech Orgs')
      await page.click('[data-testid="confirm-save-preset"]')
      
      // Verify preset is saved
      await expect(page.locator('[data-testid="preset-saved-notification"]')).toBeVisible()
      
      // Clear filters
      await page.click('[data-testid="clear-all-filters"]')
      await page.waitForResponse(response => !response.url().includes('search='))
      
      // Load preset
      await page.click('[data-testid="load-filter-presets"]')
      await page.click('[data-testid="preset-Active Tech Orgs"]')
      
      // Verify preset is applied
      await expect(page.locator('[data-testid="organization-search"]')).toHaveValue('tech')
      await expect(page.locator('[data-testid="applied-filter-status"]')).toBeVisible()
    })
  })

  test.describe('Sorting Options', () => {
    test('should sort by name (ascending and descending)', async () => {
      // Default sort should be name ascending
      const firstOrgName = await page.locator('[data-testid="organization-card"] h3').first().textContent()
      expect(firstOrgName).toBe('Alpha Corporation')
      
      // Change to descending
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-name-desc"]')
      
      await page.waitForResponse(response => 
        response.url().includes('sortBy=name') && response.url().includes('sortOrder=desc')
      )
      
      // First organization should now be Gamma Startup (last alphabetically)
      const firstOrgNameDesc = await page.locator('[data-testid="organization-card"] h3').first().textContent()
      expect(firstOrgNameDesc).toBe('Gamma Startup')
    })

    test('should sort by member count', async () => {
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-memberCount-desc"]')
      
      await page.waitForResponse(response => 
        response.url().includes('sortBy=memberCount') && response.url().includes('sortOrder=desc')
      )
      
      // Beta Industries should be first (50 members)
      const firstOrg = await page.locator('[data-testid="organization-card"]').first()
      await expect(firstOrg).toContainText('Beta Industries')
      await expect(firstOrg).toContainText('50 members')
    })

    test('should sort by creation date', async () => {
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-createdAt-desc"]')
      
      await page.waitForResponse(response => response.url().includes('sortBy=createdAt'))
      
      // Most recent should be first (Gamma Startup - March 2024)
      await expect(page.locator('[data-testid="organization-card"]').first()).toContainText('Gamma Startup')
    })

    test('should sort by last activity', async () => {
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-lastActivity-desc"]')
      
      await page.waitForResponse(response => response.url().includes('sortBy=lastActivity'))
      
      // Most recently active should be first
      await expect(page.locator('[data-testid="organization-card"]').first()).toContainText('Epsilon Networks')
    })

    test('should maintain sort order when filtering', async () => {
      // Set sort order first
      await page.click('[data-testid="sort-dropdown"]')
      await page.click('[data-testid="sort-memberCount-desc"]')
      await page.waitForResponse(response => response.url().includes('sortBy=memberCount'))
      
      // Apply filter
      await page.fill('[data-testid="organization-search"]', 'a')
      await page.waitForTimeout(600)
      
      await page.waitForResponse(response => 
        response.url().includes('search=a') && response.url().includes('sortBy=memberCount')
      )
      
      // Results should still be sorted by member count desc
      const orgCards = page.locator('[data-testid="organization-card"]')
      const firstMemberCount = await orgCards.first().locator('[data-testid="member-count"]').textContent()
      const secondMemberCount = await orgCards.nth(1).locator('[data-testid="member-count"]').textContent()
      
      expect(parseInt(firstMemberCount!)).toBeGreaterThanOrEqual(parseInt(secondMemberCount!))
    })
  })

  test.describe('Search Performance and UX', () => {
    test('should show search progress indicator for slow searches', async () => {
      // Add delay to API response
      await page.route('/api/organizations*', (route) => {
        const url = new URL(route.request().url())
        if (url.searchParams.has('search')) {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ organizations: [], totalCount: 0 })
            })
          }, 2000) // 2 second delay
        } else {
          route.continue()
        }
      })

      await page.fill('[data-testid="organization-search"]', 'slow search')
      
      // Should show progress indicator
      await expect(page.locator('[data-testid="search-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-progress-bar"]')).toBeVisible()
      
      // Progress should animate
      const initialWidth = await page.locator('[data-testid="search-progress-bar"]').evaluate(el => el.style.width)
      await page.waitForTimeout(1000)
      const laterWidth = await page.locator('[data-testid="search-progress-bar"]').evaluate(el => el.style.width)
      
      expect(laterWidth).not.toBe(initialWidth) // Width should change
    })

    test('should handle concurrent search requests properly', async () => {
      let requestCount = 0
      
      await page.route('/api/organizations*', (route) => {
        const url = new URL(route.request().url())
        if (url.searchParams.has('search')) {
          requestCount++
          const searchTerm = url.searchParams.get('search')
          
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ 
                organizations: [{ 
                  id: '1', 
                  name: `Result for ${searchTerm}`, 
                  memberCount: 10, 
                  status: 'active' 
                }], 
                totalCount: 1 
              })
            })
          }, 500)
        } else {
          route.continue()
        }
      })

      const searchInput = page.locator('[data-testid="organization-search"]')
      
      // Type quickly to trigger multiple requests
      await searchInput.fill('a')
      await page.waitForTimeout(100)
      await searchInput.fill('ab')
      await page.waitForTimeout(100)
      await searchInput.fill('abc')
      
      // Wait for final request
      await page.waitForResponse(response => 
        response.url().includes('search=abc')
      )
      
      // Should show result for the latest search term
      await expect(page.locator('text=Result for abc')).toBeVisible()
      
      // Should not show results from earlier requests
      await expect(page.locator('text=Result for a')).not.toBeVisible()
      await expect(page.locator('text=Result for ab')).not.toBeVisible()
    })

    test('should provide keyboard shortcuts for common actions', async () => {
      // Focus search with Ctrl+F or Cmd+F
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f')
      
      const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(activeElement).toBe('organization-search')
      
      // Clear search with Escape
      await page.fill('[data-testid="organization-search"]', 'test')
      await page.keyboard.press('Escape')
      
      await expect(page.locator('[data-testid="organization-search"]')).toHaveValue('')
      
      // Navigate filters with Tab
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to open dropdown with Enter or Space
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="status-filter-dropdown"]')).toBeVisible()
    })
  })
})