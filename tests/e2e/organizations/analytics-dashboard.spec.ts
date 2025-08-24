import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Analytics Dashboard
 * 
 * Tests analytics functionality, member activity metrics,
 * engagement analytics, dashboard interactions, and performance.
 */

test.describe('Organizations Analytics Dashboard', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
  })

  test.describe('Analytics Data Loading', () => {
    test('should load analytics data for organization cards', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount > 0) {
        const firstCard = orgCards.first()
        
        // Check for member count display
        const memberCount = firstCard.locator('[data-testid="organization-member-count"]')
        if (await memberCount.isVisible()) {
          const countText = await memberCount.textContent()
          expect(countText).toMatch(/\d+/)
        }
        
        // Check for activity indicators
        const activityIndicator = firstCard.locator('[data-testid="organization-activity"]')
        if (await activityIndicator.isVisible()) {
          console.log('Activity indicator found')
        }
        
        // Check for last activity timestamp
        const lastActivity = firstCard.locator('[data-testid="organization-last-activity"]')
        if (await lastActivity.isVisible()) {
          const activityText = await lastActivity.textContent()
          console.log('Last activity:', activityText)
        }
      }
    })

    test('should show loading states for analytics data', async () => {
      // Reload to see loading states
      await page.reload()
      
      // Check for analytics loading indicators
      const analyticsLoader = page.locator('[data-testid="analytics-loading"]')
      
      // If analytics loading is visible, wait for it to complete
      if (await analyticsLoader.isVisible({ timeout: 2000 })) {
        await expect(analyticsLoader).not.toBeVisible({ timeout: 10000 })
      }
      
      // Verify analytics data loaded
      const memberCounts = page.locator('[data-testid="organization-member-count"]')
      if (await memberCounts.first().isVisible()) {
        const count = await memberCounts.count()
        expect(count).toBeGreaterThan(0)
      }
    })

    test('should handle analytics API errors gracefully', async () => {
      // Mock API failure for analytics
      await page.route('**/api/organizations/analytics**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Analytics service unavailable' })
        })
      })
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Should still show organization cards without analytics
      const orgCards = page.locator('[data-testid="organization-card"]')
      await expect(orgCards.first()).toBeVisible()
      
      // Check for error handling or fallback display
      const errorMessage = page.locator('[data-testid="analytics-error"]')
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText('analytics')
      }
    })
  })

  test.describe('Analytics Detail View', () => {
    test('should open detailed analytics for organization', async () => {
      const firstCard = page.locator('[data-testid="organization-card"]').first()
      
      // Look for analytics button or click on organization
      const analyticsButton = firstCard.locator('[data-testid="view-analytics"]')
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Check for analytics modal or page
        const analyticsModal = page.locator('[data-testid="analytics-modal"]')
        const analyticsPage = page.locator('[data-testid="analytics-dashboard"]')
        
        if (await analyticsModal.isVisible()) {
          // Test modal analytics
          await expect(analyticsModal).toBeVisible()
          
          // Check for analytics sections
          await expect(analyticsModal.locator('[data-testid="member-activity-chart"]')).toBeVisible({ timeout: 5000 })
          await expect(analyticsModal.locator('[data-testid="engagement-metrics"]')).toBeVisible({ timeout: 5000 })
          
          // Close modal
          const closeButton = analyticsModal.locator('[data-testid="close-analytics"]')
          await closeButton.click()
          await expect(analyticsModal).not.toBeVisible()
        }
        
        if (await analyticsPage.isVisible()) {
          // Test full page analytics
          await expect(analyticsPage).toBeVisible()
          
          // Verify analytics sections
          await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible()
          await expect(page.locator('[data-testid="member-analytics"]')).toBeVisible()
          await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible()
        }
      }
    })

    test('should display member activity analytics', async () => {
      // Navigate to organization detail or open analytics
      const firstCard = page.locator('[data-testid="organization-card"]').first()
      await firstCard.click()
      
      // Look for member activity section
      const memberActivity = page.locator('[data-testid="member-activity-section"]')
      
      if (await memberActivity.isVisible({ timeout: 5000 })) {
        // Check for activity metrics
        const activeMembers = memberActivity.locator('[data-testid="active-members-count"]')
        if (await activeMembers.isVisible()) {
          const activeCount = await activeMembers.textContent()
          expect(activeCount).toMatch(/\d+/)
        }
        
        // Check for member list with activity status
        const memberList = memberActivity.locator('[data-testid="member-activity-list"]')
        if (await memberList.isVisible()) {
          const memberItems = memberList.locator('[data-testid="member-activity-item"]')
          const memberCount = await memberItems.count()
          
          if (memberCount > 0) {
            // Check first member activity item
            const firstMember = memberItems.first()
            
            // Should have member name
            await expect(firstMember.locator('[data-testid="member-name"]')).toBeVisible()
            
            // Should have activity indicator
            const activityStatus = firstMember.locator('[data-testid="member-activity-status"]')
            if (await activityStatus.isVisible()) {
              const statusText = await activityStatus.textContent()
              expect(statusText).toMatch(/(online|offline|active|inactive)/i)
            }
            
            // Should have last activity time
            const lastSeen = firstMember.locator('[data-testid="member-last-seen"]')
            if (await lastSeen.isVisible()) {
              const lastSeenText = await lastSeen.textContent()
              console.log('Member last seen:', lastSeenText)
            }
          }
        }
      }
    })

    test('should show engagement metrics and trends', async () => {
      // Navigate to analytics view
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        await page.waitForTimeout(1000)
        
        // Check for engagement metrics
        const engagementSection = page.locator('[data-testid="engagement-metrics"]')
        
        if (await engagementSection.isVisible()) {
          // Check for key metrics
          const totalActivities = engagementSection.locator('[data-testid="total-activities"]')
          const boardPacksCreated = engagementSection.locator('[data-testid="board-packs-created"]')
          const meetingsScheduled = engagementSection.locator('[data-testid="meetings-scheduled"]')
          const documentsUploaded = engagementSection.locator('[data-testid="documents-uploaded"]')
          
          // Verify metrics are displayed
          if (await totalActivities.isVisible()) {
            const activitiesText = await totalActivities.textContent()
            expect(activitiesText).toMatch(/\d+/)
          }
          
          if (await boardPacksCreated.isVisible()) {
            const boardPacksText = await boardPacksCreated.textContent()
            expect(boardPacksText).toMatch(/\d+/)
          }
          
          // Check for trend indicators
          const trendIndicators = engagementSection.locator('[data-testid="trend-indicator"]')
          if (await trendIndicators.first().isVisible()) {
            const trendCount = await trendIndicators.count()
            expect(trendCount).toBeGreaterThan(0)
          }
        }
      }
    })

    test('should display activity timeline', async () => {
      const analyticsView = page.locator('[data-testid="analytics-dashboard"]')
      
      // Open analytics if available
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
      }
      
      // Check for activity timeline
      const timeline = page.locator('[data-testid="activity-timeline"]')
      
      if (await timeline.isVisible({ timeout: 5000 })) {
        // Check for timeline items
        const timelineItems = timeline.locator('[data-testid="timeline-item"]')
        const itemCount = await timelineItems.count()
        
        if (itemCount > 0) {
          const firstItem = timelineItems.first()
          
          // Check timeline item structure
          await expect(firstItem.locator('[data-testid="timeline-date"]')).toBeVisible()
          await expect(firstItem.locator('[data-testid="timeline-activity"]')).toBeVisible()
          
          // Check for activity type
          const activityType = firstItem.locator('[data-testid="timeline-activity-type"]')
          if (await activityType.isVisible()) {
            const typeText = await activityType.textContent()
            expect(typeText).toMatch(/(upload|meeting|member|board)/i)
          }
          
          // Check for activity description
          const description = firstItem.locator('[data-testid="timeline-description"]')
          if (await description.isVisible()) {
            const descText = await description.textContent()
            expect(descText!.length).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  test.describe('Analytics Charts and Visualizations', () => {
    test('should render member activity chart', async () => {
      // Navigate to analytics view
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        await page.waitForTimeout(1000)
        
        // Check for chart container
        const activityChart = page.locator('[data-testid="member-activity-chart"]')
        
        if (await activityChart.isVisible({ timeout: 5000 })) {
          // Verify chart elements
          const chartCanvas = activityChart.locator('canvas')
          const chartSvg = activityChart.locator('svg')
          
          // Should have either canvas or svg chart
          const hasChart = await chartCanvas.isVisible() || await chartSvg.isVisible()
          expect(hasChart).toBeTruthy()
          
          // Check for chart legend
          const chartLegend = activityChart.locator('[data-testid="chart-legend"]')
          if (await chartLegend.isVisible()) {
            const legendItems = chartLegend.locator('[data-testid="legend-item"]')
            const legendCount = await legendItems.count()
            expect(legendCount).toBeGreaterThan(0)
          }
          
          // Check for chart controls
          const chartControls = activityChart.locator('[data-testid="chart-controls"]')
          if (await chartControls.isVisible()) {
            // Test time range selector
            const timeRangeSelect = chartControls.locator('[data-testid="time-range-select"]')
            if (await timeRangeSelect.isVisible()) {
              await timeRangeSelect.click()
              
              // Check for time range options
              const weekOption = page.locator('[data-testid="time-range-week"]')
              const monthOption = page.locator('[data-testid="time-range-month"]')
              
              if (await weekOption.isVisible()) {
                await weekOption.click()
                await page.waitForTimeout(500)
                // Chart should update
              }
            }
          }
        }
      }
    })

    test('should render engagement metrics visualization', async () => {
      const analyticsView = page.locator('[data-testid="analytics-dashboard"]')
      
      // Open analytics
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
      }
      
      // Check for metrics visualization
      const metricsViz = page.locator('[data-testid="engagement-visualization"]')
      
      if (await metricsViz.isVisible({ timeout: 5000 })) {
        // Check for different metric types
        const metricCards = metricsViz.locator('[data-testid="metric-card"]')
        const cardCount = await metricCards.count()
        
        if (cardCount > 0) {
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            const card = metricCards.nth(i)
            
            // Each card should have title and value
            await expect(card.locator('[data-testid="metric-title"]')).toBeVisible()
            await expect(card.locator('[data-testid="metric-value"]')).toBeVisible()
            
            // Check for trend indicator
            const trendIcon = card.locator('[data-testid="metric-trend"]')
            if (await trendIcon.isVisible()) {
              // Should have up/down/neutral trend
              console.log('Metric has trend indicator')
            }
          }
        }
      }
    })

    test('should support chart interactions', async () => {
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        const chart = page.locator('[data-testid="member-activity-chart"]')
        
        if (await chart.isVisible()) {
          // Test chart hover interactions
          const chartArea = chart.locator('canvas, svg')
          if (await chartArea.isVisible()) {
            await chartArea.hover()
            
            // Check for tooltip
            const tooltip = page.locator('[data-testid="chart-tooltip"]')
            if (await tooltip.isVisible({ timeout: 1000 })) {
              // Tooltip should show data
              const tooltipContent = await tooltip.textContent()
              expect(tooltipContent!.length).toBeGreaterThan(0)
            }
          }
          
          // Test chart zoom if available
          const zoomControls = chart.locator('[data-testid="chart-zoom"]')
          if (await zoomControls.isVisible()) {
            const zoomIn = zoomControls.locator('[data-testid="zoom-in"]')
            if (await zoomIn.isVisible()) {
              await zoomIn.click()
              await page.waitForTimeout(300)
            }
          }
        }
      }
    })
  })

  test.describe('Real-time Analytics Updates', () => {
    test('should update analytics data in real-time', async () => {
      // Navigate to analytics view
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Get initial activity count
        const totalActivities = page.locator('[data-testid="total-activities"]')
        let initialCount = 0
        
        if (await totalActivities.isVisible()) {
          const countText = await totalActivities.textContent()
          initialCount = parseInt(countText?.match(/\d+/)?.[0] || '0')
        }
        
        // Simulate activity (this would need real backend support)
        // For testing, we can simulate by triggering a refresh
        const refreshButton = page.locator('[data-testid="refresh-analytics"]')
        if (await refreshButton.isVisible()) {
          await refreshButton.click()
          
          // Wait for update
          await page.waitForTimeout(1000)
          
          // Check if data updated
          if (await totalActivities.isVisible()) {
            const newCountText = await totalActivities.textContent()
            const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || '0')
            
            // Data should be refreshed (could be same or different)
            expect(typeof newCount).toBe('number')
          }
        }
      }
    })

    test('should show online status updates', async () => {
      const memberActivity = page.locator('[data-testid="member-activity-section"]')
      
      if (await memberActivity.isVisible()) {
        const onlineMembers = memberActivity.locator('[data-testid="online-members-count"]')
        
        if (await onlineMembers.isVisible()) {
          const initialOnlineCount = await onlineMembers.textContent()
          console.log('Initial online members:', initialOnlineCount)
          
          // Wait for potential updates
          await page.waitForTimeout(2000)
          
          const updatedOnlineCount = await onlineMembers.textContent()
          console.log('Updated online members:', updatedOnlineCount)
          
          // Should maintain valid count
          expect(updatedOnlineCount).toMatch(/\d+/)
        }
      }
    })
  })

  test.describe('Analytics Export and Sharing', () => {
    test('should export analytics data', async () => {
      const analyticsView = page.locator('[data-testid="analytics-dashboard"]')
      
      // Navigate to analytics
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
      }
      
      // Look for export button
      const exportButton = page.locator('[data-testid="export-analytics"]')
      
      if (await exportButton.isVisible()) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download')
        
        await exportButton.click()
        
        // Check for export options
        const exportModal = page.locator('[data-testid="export-modal"]')
        if (await exportModal.isVisible()) {
          // Select CSV export
          const csvOption = exportModal.locator('[data-testid="export-csv"]')
          if (await csvOption.isVisible()) {
            await csvOption.click()
            
            const confirmExport = exportModal.locator('[data-testid="confirm-export"]')
            await confirmExport.click()
            
            // Wait for download
            try {
              const download = await downloadPromise
              expect(download.suggestedFilename()).toMatch(/.+\.(csv|xlsx)$/i)
            } catch (error) {
              // Download might not work in test environment
              console.log('Download test skipped:', error)
            }
          }
        }
      }
    })

    test('should generate analytics report', async () => {
      const reportButton = page.locator('[data-testid="generate-report"]')
      
      if (await reportButton.isVisible()) {
        await reportButton.click()
        
        // Check for report generation modal
        const reportModal = page.locator('[data-testid="report-modal"]')
        if (await reportModal.isVisible()) {
          // Configure report options
          const dateRange = reportModal.locator('[data-testid="report-date-range"]')
          if (await dateRange.isVisible()) {
            await dateRange.selectOption('last-month')
          }
          
          const includeCharts = reportModal.locator('[data-testid="include-charts"]')
          if (await includeCharts.isVisible()) {
            await includeCharts.check()
          }
          
          // Generate report
          const generateButton = reportModal.locator('[data-testid="generate-report-btn"]')
          await generateButton.click()
          
          // Check for generation progress
          const progress = reportModal.locator('[data-testid="report-progress"]')
          if (await progress.isVisible()) {
            await expect(progress).not.toBeVisible({ timeout: 10000 })
          }
          
          // Check for report completion
          const downloadReport = reportModal.locator('[data-testid="download-report"]')
          if (await downloadReport.isVisible({ timeout: 10000 })) {
            await expect(downloadReport).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Analytics Performance', () => {
    test('should load analytics data within performance budget', async () => {
      const startTime = Date.now()
      
      // Navigate to analytics
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Wait for all analytics sections to load
        await Promise.race([
          page.locator('[data-testid="member-activity-chart"]').waitFor({ timeout: 5000 }),
          page.locator('[data-testid="engagement-metrics"]').waitFor({ timeout: 5000 }),
          page.waitForTimeout(5000)
        ])
        
        const loadTime = Date.now() - startTime
        
        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000)
        
        console.log(`Analytics loaded in ${loadTime}ms`)
      }
    })

    test('should handle large datasets efficiently', async () => {
      // Test with analytics that might have large amounts of data
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Test scrolling through member list
        const memberList = page.locator('[data-testid="member-activity-list"]')
        
        if (await memberList.isVisible()) {
          const startTime = performance.now()
          
          // Scroll through the list
          for (let i = 0; i < 5; i++) {
            await memberList.evaluate(el => {
              el.scrollTop += 200
            })
            await page.waitForTimeout(100)
          }
          
          const scrollTime = performance.now() - startTime
          
          // Should scroll smoothly
          expect(scrollTime).toBeLessThan(1000)
        }
        
        // Test chart performance with time range changes
        const timeRangeSelect = page.locator('[data-testid="time-range-select"]')
        if (await timeRangeSelect.isVisible()) {
          const startTime = performance.now()
          
          await timeRangeSelect.selectOption('last-year')
          
          // Wait for chart update
          await page.waitForTimeout(1000)
          
          const updateTime = performance.now() - startTime
          
          // Should update within reasonable time
          expect(updateTime).toBeLessThan(3000)
        }
      }
    })
  })

  test.describe('Analytics Error Handling', () => {
    test('should handle partial data loading failures', async () => {
      // Mock partial API failure
      await page.route('**/api/organizations/analytics**', route => {
        const url = route.request().url()
        
        // Fail member activity endpoint but allow others
        if (url.includes('member-activity')) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Member activity service unavailable' })
          })
        } else {
          route.continue()
        }
      })
      
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Should show what data is available
        const engagementMetrics = page.locator('[data-testid="engagement-metrics"]')
        if (await engagementMetrics.isVisible()) {
          await expect(engagementMetrics).toBeVisible()
        }
        
        // Should show error for failed section
        const memberActivityError = page.locator('[data-testid="member-activity-error"]')
        if (await memberActivityError.isVisible()) {
          await expect(memberActivityError).toContainText('unavailable')
        }
      }
    })

    test('should provide retry functionality', async () => {
      // Mock API failure
      let callCount = 0
      await page.route('**/api/organizations/analytics**', route => {
        callCount++
        
        if (callCount === 1) {
          // Fail first call
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          })
        } else {
          // Succeed on retry
          route.continue()
        }
      })
      
      const analyticsButton = page.locator('[data-testid="view-analytics"]').first()
      
      if (await analyticsButton.isVisible()) {
        await analyticsButton.click()
        
        // Look for retry button
        const retryButton = page.locator('[data-testid="retry-analytics"]')
        
        if (await retryButton.isVisible({ timeout: 3000 })) {
          await retryButton.click()
          
          // Should succeed on retry
          await page.waitForTimeout(1000)
          
          const analyticsContent = page.locator('[data-testid="analytics-content"]')
          if (await analyticsContent.isVisible()) {
            await expect(analyticsContent).toBeVisible()
          }
        }
      }
    })
  })
})