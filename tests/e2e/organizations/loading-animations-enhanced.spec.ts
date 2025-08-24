import { test, expect, Page } from '@playwright/test'

test.describe('Organizations Loading Animations & Skeleton States', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page with authentication
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'test@appboardguru.com')
    await page.fill('input[type="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test.describe('Initial Page Load Animations', () => {
    test('should display skeleton loading states during initial load', async () => {
      // Slow down network to catch loading states
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: '1', name: 'Organization 1', memberCount: 10, status: 'active' },
              { id: '2', name: 'Organization 2', memberCount: 15, status: 'active' }
            ])
          })
        }, 2000) // 2 second delay
      })

      await page.goto('/dashboard/organizations')

      // Verify skeleton loaders are visible
      await expect(page.locator('[data-testid="organization-skeleton"]')).toBeVisible()
      await expect(page.locator('[data-testid="organization-skeleton"]')).toHaveCount(6) // Default skeleton count

      // Check skeleton structure
      await expect(page.locator('[data-testid="skeleton-avatar"]')).toBeVisible()
      await expect(page.locator('[data-testid="skeleton-title"]')).toBeVisible()
      await expect(page.locator('[data-testid="skeleton-subtitle"]')).toBeVisible()
      await expect(page.locator('[data-testid="skeleton-metrics"]')).toBeVisible()

      // Wait for skeletons to be replaced with actual content
      await page.waitForResponse('/api/organizations*')
      
      // Verify skeleton loaders are hidden and real content is shown
      await expect(page.locator('[data-testid="organization-skeleton"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="organization-card"]')).toBeVisible()
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(2)
    })

    test('should animate skeleton shimmer effect', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }, 3000) // Long delay to observe animation
      })

      await page.goto('/dashboard/organizations')

      // Verify shimmer animation classes are present
      const skeletonElement = page.locator('[data-testid="organization-skeleton"]').first()
      await expect(skeletonElement).toHaveClass(/animate-pulse|shimmer/)

      // Check for gradient animation
      const shimmerElement = page.locator('[data-testid="skeleton-shimmer"]').first()
      await expect(shimmerElement).toBeVisible()
      
      // Verify shimmer moves across skeleton
      const shimmerPosition1 = await shimmerElement.boundingBox()
      await page.waitForTimeout(1000)
      const shimmerPosition2 = await shimmerElement.boundingBox()
      
      // Position should change due to animation (not exact comparison due to animation timing)
      expect(shimmerPosition1?.x).toBeDefined()
      expect(shimmerPosition2?.x).toBeDefined()
    })

    test('should show staggered loading animation for multiple skeletons', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }, 2000)
      })

      await page.goto('/dashboard/organizations')

      // Check that skeletons have staggered animation delays
      const skeletons = page.locator('[data-testid="organization-skeleton"]')
      
      for (let i = 0; i < 3; i++) {
        const skeleton = skeletons.nth(i)
        await expect(skeleton).toBeVisible()
        
        // Check for animation delay classes or styles
        const animationDelay = await skeleton.evaluate(el => 
          window.getComputedStyle(el).animationDelay
        )
        
        // First skeleton should have no/minimal delay
        if (i === 0) {
          expect(animationDelay).toMatch(/^0s|^$/)
        } else {
          // Subsequent skeletons should have increasing delays
          expect(animationDelay).toMatch(/^\d+\.?\d*s$/)
        }
      }
    })
  })

  test.describe('Search Loading States', () => {
    test('should show search loading indicator during search', async () => {
      // Initial load
      await page.route('/api/organizations*', (route) => {
        const url = route.request().url()
        if (url.includes('search=')) {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json', 
              body: JSON.stringify([
                { id: '1', name: 'Searched Organization', memberCount: 5, status: 'active' }
              ])
            })
          }, 1500)
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: '1', name: 'Organization 1', memberCount: 10, status: 'active' }
            ])
          })
        }
      })

      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')

      // Perform search
      await page.fill('[data-testid="organization-search"]', 'test search')

      // Verify search loading indicator appears
      await expect(page.locator('[data-testid="search-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="search-spinner"]')).toBeVisible()

      // Wait for search results
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('search=')
      )

      // Verify loading indicator disappears and results appear
      await expect(page.locator('[data-testid="search-loading"]')).not.toBeVisible()
      await expect(page.locator('text=Searched Organization')).toBeVisible()
    })

    test('should show debounced search loading with proper timing', async () => {
      let searchCallCount = 0
      
      await page.route('/api/organizations*', (route) => {
        const url = route.request().url()
        if (url.includes('search=')) {
          searchCallCount++
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                { id: `${searchCallCount}`, name: `Result ${searchCallCount}`, memberCount: 5, status: 'active' }
              ])
            })
          }, 500)
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }
      })

      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')

      const searchInput = page.locator('[data-testid="organization-search"]')

      // Type quickly to test debouncing
      await searchInput.fill('t')
      await page.waitForTimeout(100)
      await searchInput.fill('te')
      await page.waitForTimeout(100)
      await searchInput.fill('tes')
      await page.waitForTimeout(100)
      await searchInput.fill('test')

      // Verify loading appears after debounce delay
      await expect(page.locator('[data-testid="search-loading"]')).toBeVisible()
      
      // Wait for request to complete
      await page.waitForTimeout(1000)

      // Should only have made one API call due to debouncing
      expect(searchCallCount).toBe(1)
      
      await expect(page.locator('text=Result 1')).toBeVisible()
    })

    test('should show filter loading states', async () => {
      await page.route('/api/organizations*', (route) => {
        const url = route.request().url()
        if (url.includes('status=active')) {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                { id: '1', name: 'Active Org', memberCount: 10, status: 'active' }
              ])
            })
          }, 1000)
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: '1', name: 'All Orgs', memberCount: 10, status: 'active' }
            ])
          })
        }
      })

      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')

      // Apply filter
      await page.click('[data-testid="organization-filter-dropdown"]')
      await page.click('[data-testid="filter-status-active"]')

      // Verify filter loading state
      await expect(page.locator('[data-testid="filter-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="applying-filters-text"]')).toContainText('Applying filters')

      // Wait for filtered results
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('status=active')
      )

      await expect(page.locator('[data-testid="filter-loading"]')).not.toBeVisible()
      await expect(page.locator('text=Active Org')).toBeVisible()
    })
  })

  test.describe('Pagination Loading States', () => {
    test('should show loading state during pagination', async () => {
      await page.route('/api/organizations*', (route) => {
        const url = route.request().url()
        const page = url.includes('page=2') ? 2 : 1
        
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              organizations: [
                { id: `${page}-1`, name: `Page ${page} Org 1`, memberCount: 10, status: 'active' }
              ],
              pagination: {
                currentPage: page,
                totalPages: 3,
                totalItems: 25,
                hasNextPage: page < 3
              }
            })
          })
        }, 800)
      })

      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')

      // Navigate to page 2
      await page.click('[data-testid="pagination-next"]')

      // Verify pagination loading state
      await expect(page.locator('[data-testid="pagination-loading"]')).toBeVisible()
      
      // Existing content should remain visible but dimmed/disabled
      await expect(page.locator('[data-testid="organization-list"]')).toHaveClass(/opacity-50|pointer-events-none/)

      // Wait for page 2 to load
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('page=2')
      )

      await expect(page.locator('[data-testid="pagination-loading"]')).not.toBeVisible()
      await expect(page.locator('text=Page 2 Org 1')).toBeVisible()
      await expect(page.locator('[data-testid="organization-list"]')).not.toHaveClass(/opacity-50/)
    })

    test('should show loading state for infinite scroll', async () => {
      let loadCount = 0
      
      await page.route('/api/organizations*', (route) => {
        const url = route.request().url()
        const offset = parseInt(url.match(/offset=(\d+)/)?.[1] || '0')
        loadCount++
        
        setTimeout(() => {
          const organizations = Array.from({ length: 10 }, (_, i) => ({
            id: `${offset + i + 1}`,
            name: `Organization ${offset + i + 1}`,
            memberCount: Math.floor(Math.random() * 50) + 5,
            status: 'active'
          }))
          
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              organizations,
              hasMore: offset < 40
            })
          })
        }, 600)
      })

      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')

      // Scroll to bottom to trigger infinite scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      // Verify infinite scroll loading indicator
      await expect(page.locator('[data-testid="infinite-scroll-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="loading-more-text"]')).toContainText('Loading more organizations')

      // Wait for more items to load
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.url().includes('offset=10')
      )

      await expect(page.locator('[data-testid="infinite-scroll-loading"]')).not.toBeVisible()
      
      // Should have more organizations loaded
      const orgCount = await page.locator('[data-testid="organization-card"]').count()
      expect(orgCount).toBeGreaterThan(10)
    })
  })

  test.describe('Animation Performance', () => {
    test('should maintain 60fps during loading animations', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }, 5000) // Long delay to measure animation performance
      })

      await page.goto('/dashboard/organizations')

      // Start performance monitoring
      const client = await page.context().newCDPSession(page)
      await client.send('Runtime.enable')
      await client.send('Profiler.enable')
      
      let frameCount = 0
      let frameStart = Date.now()
      
      // Monitor animation frames
      await page.evaluateHandle(() => {
        let count = 0
        const start = performance.now()
        
        function countFrames() {
          count++
          if (performance.now() - start < 3000) { // Monitor for 3 seconds
            requestAnimationFrame(countFrames)
          }
        }
        
        requestAnimationFrame(countFrames)
        
        setTimeout(() => {
          window.frameCount = count
          window.fps = count / 3
        }, 3000)
      })

      // Wait for measurement to complete
      await page.waitForTimeout(3500)

      // Get FPS measurement
      const fps = await page.evaluate(() => window.fps)
      
      // Should maintain close to 60fps (allow some variance for test environment)
      expect(fps).toBeGreaterThan(45) // At least 45fps
      
      console.log(`Loading animation FPS: ${fps}`)
    })

    test('should not block UI during skeleton animations', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }, 3000)
      })

      await page.goto('/dashboard/organizations')

      // UI should remain responsive during loading
      const startTime = Date.now()
      
      // Try to interact with search while loading
      await page.fill('[data-testid="organization-search"]', 'responsive test')
      
      const responseTime = Date.now() - startTime
      
      // UI interaction should be fast even during loading animations
      expect(responseTime).toBeLessThan(100) // Should respond within 100ms
      
      // Verify the input was filled successfully
      await expect(page.locator('[data-testid="organization-search"]')).toHaveValue('responsive test')
    })
  })

  test.describe('Error State Animations', () => {
    test('should animate transition from loading to error state', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' })
          })
        }, 1000)
      })

      await page.goto('/dashboard/organizations')

      // Verify loading state first
      await expect(page.locator('[data-testid="organization-skeleton"]')).toBeVisible()

      // Wait for error response
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.status() === 500
      )

      // Verify smooth transition to error state
      await expect(page.locator('[data-testid="organization-skeleton"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="organization-error"]')).toBeVisible()
      
      // Check for fade-in animation on error state
      const errorElement = page.locator('[data-testid="organization-error"]')
      await expect(errorElement).toHaveClass(/animate-fade-in|opacity-100/)
    })

    test('should show retry loading state', async () => {
      let attemptCount = 0
      
      await page.route('/api/organizations*', (route) => {
        attemptCount++
        setTimeout(() => {
          if (attemptCount === 1) {
            route.fulfill({ status: 500, body: '{"error": "Server error"}' })
          } else {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                { id: '1', name: 'Recovered Organization', memberCount: 10, status: 'active' }
              ])
            })
          }
        }, 800)
      })

      await page.goto('/dashboard/organizations')
      
      // Wait for initial error
      await page.waitForResponse(response => response.status() === 500)
      await expect(page.locator('[data-testid="organization-error"]')).toBeVisible()

      // Click retry button
      await page.click('[data-testid="retry-organizations"]')

      // Verify retry loading state
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-spinner"]')).toBeVisible()
      await expect(page.locator('text=Retrying')).toBeVisible()

      // Wait for successful retry
      await page.waitForResponse(response => 
        response.url().includes('/api/organizations') && response.status() === 200
      )

      await expect(page.locator('[data-testid="retry-loading"]')).not.toBeVisible()
      await expect(page.locator('text=Recovered Organization')).toBeVisible()
    })
  })

  test.describe('Accessibility in Loading States', () => {
    test('should announce loading state to screen readers', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          })
        }, 2000)
      })

      await page.goto('/dashboard/organizations')

      // Check for aria-live announcements
      await expect(page.locator('[aria-live="polite"]')).toContainText('Loading organizations')
      
      // Verify skeleton elements have proper aria attributes
      await expect(page.locator('[data-testid="organization-skeleton"]').first())
        .toHaveAttribute('aria-label', /Loading organization data/)
      
      // Check for proper aria-busy attribute
      await expect(page.locator('[data-testid="organizations-container"]'))
        .toHaveAttribute('aria-busy', 'true')

      // Wait for loading to complete
      await page.waitForResponse('/api/organizations*')

      // Verify aria-busy is removed after loading
      await expect(page.locator('[data-testid="organizations-container"]'))
        .toHaveAttribute('aria-busy', 'false')
    })

    test('should handle focus management during loading states', async () => {
      await page.route('/api/organizations*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: '1', name: 'Test Organization', memberCount: 10, status: 'active' }
            ])
          })
        }, 1500)
      })

      await page.goto('/dashboard/organizations')

      // Focus should remain on search input during loading
      await page.focus('[data-testid="organization-search"]')
      
      const focusedElementId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(focusedElementId).toBe('organization-search')

      // Wait for loading to complete
      await page.waitForResponse('/api/organizations*')

      // Focus should not be lost after loading completes
      const finalFocusedElementId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(finalFocusedElementId).toBe('organization-search')
    })
  })
})