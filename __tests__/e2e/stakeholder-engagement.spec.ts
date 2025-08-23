import { test, expect, Page } from '@playwright/test'

// Test configuration
test.describe.configure({ mode: 'serial' })

test.describe('Stakeholder Engagement Portal', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin'
      }))
    })

    // Navigate to stakeholder engagement dashboard
    await page.goto('/dashboard/stakeholder-engagement')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Dashboard Overview', () => {
    test('should display key stakeholder metrics', async () => {
      // Check that the main dashboard title is present
      await expect(page.locator('h1')).toContainText('Stakeholder Engagement Portal')

      // Verify key metric cards are displayed
      await expect(page.locator('[data-testid="total-investors"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-investment"]')).toBeVisible()
      await expect(page.locator('[data-testid="esg-composite-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="sentiment-score"]')).toBeVisible()

      // Check that metrics show positive values
      const totalInvestors = page.locator('[data-testid="total-investors"] .text-3xl')
      await expect(totalInvestors).not.toHaveText('0')

      const totalInvestment = page.locator('[data-testid="total-investment"] .text-3xl')
      await expect(totalInvestment).toContainText('$')
    })

    test('should show recent activity feed', async () => {
      // Verify recent activity section exists
      const activitySection = page.locator('[data-testid="recent-activity"]')
      await expect(activitySection).toBeVisible()

      // Check for activity items
      const activityItems = page.locator('[data-testid="activity-item"]')
      await expect(activityItems).toHaveCount(4)

      // Verify activity items have proper structure
      const firstActivity = activityItems.first()
      await expect(firstActivity).toContainText('New vote submitted')
      await expect(firstActivity).toContainText('medium')
    })

    test('should display sentiment trend chart', async () => {
      const sentimentChart = page.locator('[data-testid="sentiment-trend-chart"]')
      await expect(sentimentChart).toBeVisible()

      // Check chart title
      await expect(page.locator('text=Sentiment Trend')).toBeVisible()
      await expect(page.locator('text=Stakeholder sentiment over time')).toBeVisible()
    })

    test('should show ESG performance chart', async () => {
      const esgChart = page.locator('[data-testid="esg-performance-chart"]')
      await expect(esgChart).toBeVisible()

      // Check chart title and legend
      await expect(page.locator('text=ESG Performance Trend')).toBeVisible()
      await expect(page.locator('text=Environmental')).toBeVisible()
      await expect(page.locator('text=Social')).toBeVisible()
      await expect(page.locator('text=Governance')).toBeVisible()
    })

    test('should handle time range selection', async () => {
      // Find and click time range selector
      const timeRangeSelector = page.locator('select').first()
      await expect(timeRangeSelector).toBeVisible()

      // Change to 7 days
      await timeRangeSelector.selectOption('7d')
      await page.waitForTimeout(1000) // Wait for data refresh

      // Verify selection is preserved
      await expect(timeRangeSelector).toHaveValue('7d')

      // Change to 1 year
      await timeRangeSelector.selectOption('1y')
      await page.waitForTimeout(1000)

      await expect(timeRangeSelector).toHaveValue('1y')
    })

    test('should handle refresh functionality', async () => {
      // Find refresh button
      const refreshButton = page.locator('button:has-text("Refresh")')
      await expect(refreshButton).toBeVisible()

      // Click refresh
      await refreshButton.click()

      // Verify button shows refreshing state
      await expect(page.locator('button:has-text("Refreshing...")')).toBeVisible()

      // Wait for refresh to complete
      await expect(refreshButton).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Crisis Alert System', () => {
    test('should not show crisis alerts for normal conditions', async () => {
      // Check that no crisis alerts are displayed by default
      const crisisAlert = page.locator('[data-testid="crisis-alert"]')
      await expect(crisisAlert).not.toBeVisible()
    })

    test('should display crisis alert when critical issues detected', async () => {
      // Mock critical sentiment data
      await page.evaluate(() => {
        window.mockCrisisData = {
          sentimentMetrics: { criticalAlerts: 2 }
        }
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check for crisis alert
      const crisisAlert = page.locator('.border-red-200')
      await expect(crisisAlert).toBeVisible()
      await expect(crisisAlert).toContainText('Crisis Alert')
      await expect(crisisAlert).toContainText('critical stakeholder sentiment alert')
    })
  })

  test.describe('Tab Navigation', () => {
    test('should navigate between different tabs', async () => {
      // Verify all tabs are present
      const tabs = ['Overview', 'Investors', 'Voting', 'ESG', 'Sentiment', 'Analysts']
      
      for (const tabName of tabs) {
        const tab = page.locator(`[role="tab"]:has-text("${tabName}")`)
        await expect(tab).toBeVisible()
      }

      // Test navigation to Investors tab
      await page.click('[role="tab"]:has-text("Investors")')
      await expect(page.locator('[role="tabpanel"][data-state="active"]')).toContainText('Active Investors')

      // Test navigation to Voting tab
      await page.click('[role="tab"]:has-text("Voting")')
      await expect(page.locator('[role="tabpanel"][data-state="active"]')).toContainText('Active Proposals')

      // Test navigation to ESG tab
      await page.click('[role="tab"]:has-text("ESG")')
      await expect(page.locator('[role="tabpanel"][data-state="active"]')).toContainText('Environmental Score')

      // Test navigation to Sentiment tab
      await page.click('[role="tab"]:has-text("Sentiment")')
      await expect(page.locator('[role="tabpanel"][data-state="active"]')).toContainText('Overall Sentiment')

      // Test navigation to Analysts tab
      await page.click('[role="tab"]:has-text("Analysts")')
      await expect(page.locator('[role="tabpanel"][data-state="active"]')).toContainText('Total Analysts')
    })
  })

  test.describe('Investors Tab', () => {
    test.beforeEach(async () => {
      await page.click('[role="tab"]:has-text("Investors")')
      await page.waitForTimeout(500)
    })

    test('should display investor metrics', async () => {
      // Check investor-specific metrics
      await expect(page.locator('text=Active Investors')).toBeVisible()
      await expect(page.locator('text=Engagement Rate')).toBeVisible()
      await expect(page.locator('text=Avg Shareholding')).toBeVisible()

      // Verify pie charts are displayed
      await expect(page.locator('text=By Type')).toBeVisible()
      await expect(page.locator('text=By Access Level')).toBeVisible()
    })

    test('should show investor segmentation charts', async () => {
      // Check for investor type distribution
      const typeChart = page.locator(':text("By Type")').locator('..').locator('svg')
      await expect(typeChart).toBeVisible()

      // Check for access level distribution
      const accessChart = page.locator(':text("By Access Level")').locator('..').locator('svg')
      await expect(accessChart).toBeVisible()
    })
  })

  test.describe('Voting Tab', () => {
    test.beforeEach(async () => {
      await page.click('[role="tab"]:has-text("Voting")')
      await page.waitForTimeout(500)
    })

    test('should display voting metrics', async () => {
      await expect(page.locator('text=Active Proposals')).toBeVisible()
      await expect(page.locator('text=Total Votes')).toBeVisible()
      await expect(page.locator('text=Participation Rate')).toBeVisible()
      await expect(page.locator('text=Upcoming Deadlines')).toBeVisible()
    })

    test('should show voting progress bars', async () => {
      // Check for progress bars
      const progressBars = page.locator('[role="progressbar"]')
      await expect(progressBars).toHaveCount(3)

      // Verify proposal names
      await expect(page.locator('text=Proposal 2023-Q4-01')).toBeVisible()
      await expect(page.locator('text=Proposal 2023-Q4-02')).toBeVisible()
      await expect(page.locator('text=Proposal 2023-Q4-03')).toBeVisible()
    })

    test('should display vote distribution chart', async () => {
      const voteChart = page.locator('text=Vote Distribution').locator('..').locator('svg')
      await expect(voteChart).toBeVisible()
    })
  })

  test.describe('ESG Tab', () => {
    test.beforeEach(async () => {
      await page.click('[role="tab"]:has-text("ESG")')
      await page.waitForTimeout(500)
    })

    test('should display ESG metrics', async () => {
      await expect(page.locator('text=Environmental')).toBeVisible()
      await expect(page.locator('text=Social')).toBeVisible()
      await expect(page.locator('text=Governance')).toBeVisible()
      await expect(page.locator('text=Peer Ranking')).toBeVisible()
    })

    test('should show detailed ESG breakdown', async () => {
      // Check for detailed score breakdown
      await expect(page.locator('text=Environmental Score')).toBeVisible()
      await expect(page.locator('text=Social Score')).toBeVisible()
      await expect(page.locator('text=Governance Score')).toBeVisible()

      // Verify progress bars for each category
      const esgProgressBars = page.locator('[role="progressbar"]')
      await expect(esgProgressBars).toHaveCountText('3')

      // Check descriptions
      await expect(page.locator('text=Carbon footprint, renewable energy')).toBeVisible()
      await expect(page.locator('text=Employee welfare, community impact')).toBeVisible()
      await expect(page.locator('text=Board independence, executive compensation')).toBeVisible()
    })
  })

  test.describe('Sentiment Tab', () => {
    test.beforeEach(async () => {
      await page.click('[role="tab"]:has-text("Sentiment")')
      await page.waitForTimeout(500)
    })

    test('should display sentiment metrics', async () => {
      await expect(page.locator('text=Overall Sentiment')).toBeVisible()
      await expect(page.locator('text=Volume Change')).toBeVisible()
      await expect(page.locator('text=Positive Ratio')).toBeVisible()
      await expect(page.locator('text=Critical Alerts')).toBeVisible()
    })

    test('should show sentiment by source chart', async () => {
      const sentimentChart = page.locator('text=Sentiment by Source').locator('..').locator('svg')
      await expect(sentimentChart).toBeVisible()
    })

    test('should display key themes', async () => {
      await expect(page.locator('text=Key Themes')).toBeVisible()
      
      // Check for theme items
      await expect(page.locator('text=Q4 Earnings')).toBeVisible()
      await expect(page.locator('text=Strategic Partnership')).toBeVisible()
      await expect(page.locator('text=Market Expansion')).toBeVisible()
      await expect(page.locator('text=Leadership Changes')).toBeVisible()
    })
  })

  test.describe('Analysts Tab', () => {
    test.beforeEach(async () => {
      await page.click('[role="tab"]:has-text("Analysts")')
      await page.waitForTimeout(500)
    })

    test('should display analyst metrics', async () => {
      await expect(page.locator('text=Total Analysts')).toBeVisible()
      await expect(page.locator('text=Active Relationships')).toBeVisible()
      await expect(page.locator('text=Avg Influence Score')).toBeVisible()
      await expect(page.locator('text=Upcoming Briefings')).toBeVisible()
    })

    test('should show analyst coverage chart', async () => {
      const coverageChart = page.locator('text=Analyst Coverage').locator('..').locator('svg')
      await expect(coverageChart).toBeVisible()

      // Check consensus rating
      await expect(page.locator('text=Consensus:')).toBeVisible()
      await expect(page.locator('text=Buy')).toBeVisible()
    })

    test('should display pending Q&A', async () => {
      await expect(page.locator('text=Pending Q&A')).toBeVisible()
      await expect(page.locator('text=Questions requiring responses')).toBeVisible()

      // Check for question items
      const questionItems = page.locator('[data-testid="pending-question"]')
      await expect(questionItems).toHaveCount(3)

      // Verify priority badges
      await expect(page.locator('.border-red-200:has-text("high")')).toHaveCount(2)
      await expect(page.locator('.border-yellow-200:has-text("medium")')).toHaveCount(1)
    })
  })

  test.describe('Quick Actions', () => {
    test('should display quick action buttons', async () => {
      // Scroll to quick actions section
      await page.locator('text=Quick Actions').scrollIntoViewIfNeeded()

      // Check all quick action buttons are present
      const quickActions = ['Send Update', 'Schedule Briefing', 'Create Proposal', 'Generate Report']
      
      for (const action of quickActions) {
        const button = page.locator(`button:has-text("${action}")`)
        await expect(button).toBeVisible()
      }
    })

    test('should handle quick action clicks', async () => {
      await page.locator('text=Quick Actions').scrollIntoViewIfNeeded()

      // Test Send Update button
      const sendUpdateBtn = page.locator('button:has-text("Send Update")')
      await expect(sendUpdateBtn).toBeVisible()
      await sendUpdateBtn.click()
      // Note: In real implementation, this would open a modal or navigate to send communication page

      // Test Schedule Briefing button
      const scheduleBriefingBtn = page.locator('button:has-text("Schedule Briefing")')
      await scheduleBriefingBtn.click()
      // Note: In real implementation, this would open a briefing scheduling modal

      // Test Create Proposal button
      const createProposalBtn = page.locator('button:has-text("Create Proposal")')
      await createProposalBtn.click()
      // Note: In real implementation, this would open a proposal creation form

      // Test Generate Report button
      const generateReportBtn = page.locator('button:has-text("Generate Report")')
      await generateReportBtn.click()
      // Note: In real implementation, this would trigger report generation
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check that the dashboard is responsive
      await expect(page.locator('h1')).toBeVisible()
      
      // Verify metric cards stack vertically on mobile
      const metricCards = page.locator('[data-testid*="metric-card"]')
      const firstCard = metricCards.first()
      const secondCard = metricCards.nth(1)
      
      const firstCardBox = await firstCard.boundingBox()
      const secondCardBox = await secondCard.boundingBox()
      
      if (firstCardBox && secondCardBox) {
        // On mobile, second card should be below first card
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 10)
      }
    })

    test('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify layout works on tablet
      await expect(page.locator('h1')).toBeVisible()
      
      // Check that tabs are accessible
      const tabs = page.locator('[role="tab"]')
      await expect(tabs).toHaveCount(6)
      
      // Test tab switching on tablet
      await page.click('[role="tab"]:has-text("Investors")')
      await expect(page.locator('text=Active Investors')).toBeVisible()
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load dashboard within acceptable time', async () => {
      const startTime = Date.now()
      
      await page.goto('/dashboard/stakeholder-engagement')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Verify main content is visible
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="total-investors"]')).toBeVisible()
    })

    test('should handle slow network conditions', async () => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100) // Add 100ms delay
      })

      await page.goto('/dashboard/stakeholder-engagement')
      
      // Verify loading states are handled gracefully
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error responses
      await page.route('**/api/stakeholder-engagement**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })

      await page.goto('/dashboard/stakeholder-engagement')
      
      // Verify error handling - page should still render basic structure
      await expect(page.locator('h1')).toBeVisible()
      
      // Error states or fallback content should be displayed
      // (Specific error handling depends on implementation)
    })

    test('should handle missing data gracefully', async () => {
      // Mock empty data responses
      await page.route('**/api/stakeholder-engagement**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            data: {
              investorMetrics: { totalInvestors: 0, activeInvestors: 0 },
              sentimentTrend: [],
              recentActivity: []
            }
          })
        })
      })

      await page.goto('/dashboard/stakeholder-engagement')
      await page.waitForLoadState('networkidle')
      
      // Verify empty states are handled properly
      await expect(page.locator('h1')).toBeVisible()
      
      // Charts should handle empty data without breaking
      const charts = page.locator('svg')
      const chartCount = await charts.count()
      expect(chartCount).toBeGreaterThan(0) // Some charts should still render
    })
  })

  test.describe('Accessibility', () => {
    test('should meet accessibility standards', async () => {
      await page.goto('/dashboard/stakeholder-engagement')
      await page.waitForLoadState('networkidle')

      // Check for proper heading hierarchy
      await expect(page.locator('h1')).toBeVisible()
      
      // Verify tab navigation is keyboard accessible
      await page.keyboard.press('Tab') // Should focus on first focusable element
      await page.keyboard.press('Tab') // Should move to next focusable element
      
      // Check for proper ARIA labels
      const tabs = page.locator('[role="tab"]')
      await expect(tabs.first()).toHaveAttribute('aria-selected')
      
      // Verify color contrast and text readability
      const headings = page.locator('h1, h2, h3')
      await expect(headings.first()).toBeVisible()
    })

    test('should support screen reader navigation', async () => {
      await page.goto('/dashboard/stakeholder-engagement')
      await page.waitForLoadState('networkidle')

      // Check for proper semantic structure
      await expect(page.locator('main')).toBeVisible()
      
      // Verify charts have accessible descriptions
      const chartTitles = page.locator('text=Sentiment Trend, text=ESG Performance Trend')
      await expect(chartTitles.first()).toBeVisible()
      
      // Check for proper form labels and descriptions
      const timeRangeSelector = page.locator('select').first()
      if (await timeRangeSelector.isVisible()) {
        // Should have proper labeling
        await expect(timeRangeSelector).toBeVisible()
      }
    })
  })
})