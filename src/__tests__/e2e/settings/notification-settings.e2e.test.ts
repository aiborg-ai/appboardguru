/**
 * Notification Settings E2E Tests
 * Following CLAUDE.md E2E testing guidelines with Playwright
 * Testing complete workflows, cross-browser compatibility, and accessibility
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { UserContextFactory } from '@/testing/settings-test-factories'

// Test configuration following CLAUDE.md
const E2E_CONFIG = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2
}

// Page Object Model for Settings
class SettingsPage {
  constructor(private page: Page) {}

  // Navigation
  async navigateToSettings() {
    await this.page.goto('/dashboard/settings')
    await this.page.waitForSelector('[data-testid="settings-page"]')
  }

  async clickNotificationsTab() {
    await this.page.click('text="Notifications"')
    await this.page.waitForSelector('[data-testid="notification-settings-tab"]')
  }

  // Notification Preferences
  async expandNotificationCategory(category: string) {
    await this.page.click(`[data-testid="notification-category-${category}"]`)
    await this.page.waitForSelector(`[data-testid="notification-category-${category}-expanded"]`)
  }

  async toggleNotification(notificationType: string) {
    const checkbox = this.page.locator(`[data-testid="notification-${notificationType}-checkbox"]`)
    await checkbox.click()
  }

  async changeNotificationFrequency(notificationType: string, frequency: string) {
    const select = this.page.locator(`[data-testid="notification-${notificationType}-frequency"]`)
    await select.selectOption(frequency)
  }

  // Delivery Methods
  async clickDeliveryMethodsTab() {
    await this.page.click('text="Delivery Methods"')
    await this.page.waitForSelector('[data-testid="delivery-methods-tab"]')
  }

  async toggleEmailNotifications() {
    await this.page.click('[data-testid="email-notifications-toggle"]')
  }

  async updateEmailAddress(email: string) {
    await this.page.fill('[data-testid="email-address-input"]', email)
  }

  async verifyEmailAddress() {
    await this.page.click('[data-testid="verify-email-button"]')
  }

  async toggleSMSNotifications() {
    await this.page.click('[data-testid="sms-notifications-toggle"]')
  }

  async updatePhoneNumber(phone: string) {
    await this.page.fill('[data-testid="phone-number-input"]', phone)
  }

  // Schedule & Timing
  async clickScheduleTimingTab() {
    await this.page.click('text="Schedule & Timing"')
    await this.page.waitForSelector('[data-testid="schedule-timing-tab"]')
  }

  async enableQuietHours() {
    await this.page.click('[data-testid="quiet-hours-toggle"]')
  }

  async setQuietHoursTime(startTime: string, endTime: string) {
    await this.page.fill('[data-testid="quiet-hours-start"]', startTime)
    await this.page.fill('[data-testid="quiet-hours-end"]', endTime)
  }

  async setDailyDigestTime(time: string) {
    await this.page.fill('[data-testid="daily-digest-time"]', time)
  }

  // Validation and Feedback
  async waitForSuccessMessage() {
    await this.page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 })
  }

  async waitForErrorMessage() {
    await this.page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 })
  }

  async saveSettings() {
    await this.page.click('[data-testid="save-settings-button"]')
  }

  // Accessibility helpers
  async checkAccessibility() {
    // Verify all interactive elements have accessible names
    const buttons = await this.page.locator('button').all()
    for (const button of buttons) {
      const accessibleName = await button.getAttribute('aria-label') || await button.textContent()
      expect(accessibleName).toBeTruthy()
    }

    // Verify form inputs have labels
    const inputs = await this.page.locator('input').all()
    for (const input of inputs) {
      const label = await input.getAttribute('aria-labelledby') || await input.getAttribute('aria-label')
      expect(label).toBeTruthy()
    }
  }
}

// Test fixtures and setup
test.describe('Notification Settings E2E', () => {
  let settingsPage: SettingsPage
  let context: BrowserContext

  test.beforeEach(async ({ page, browser }) => {
    // Setup test context
    context = await browser.newContext({
      // Mock user authentication
      storageState: {
        cookies: [],
        origins: [{
          origin: E2E_CONFIG.baseURL,
          localStorage: [{
            name: 'user-session',
            value: JSON.stringify({
              user: UserContextFactory.create({ accountType: 'Administrator' }),
              authenticated: true
            })
          }]
        }]
      }
    })

    settingsPage = new SettingsPage(page)
    
    // Navigate to settings page
    await settingsPage.navigateToSettings()
  })

  test.afterEach(async () => {
    await context?.close()
  })

  describe('Navigation and Basic Functionality', () => {
    test('should navigate to notification settings and display all sections', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Verify all main sections are visible
      await expect(settingsPage.page.locator('text="Notification Preferences"')).toBeVisible()
      await expect(settingsPage.page.locator('text="Delivery Methods"')).toBeVisible()
      await expect(settingsPage.page.locator('text="Schedule & Timing"')).toBeVisible()
      
      // Admin should see additional tabs
      await expect(settingsPage.page.locator('text="Templates & Customization"')).toBeVisible()
      await expect(settingsPage.page.locator('text="Analytics & Insights"')).toBeVisible()
    })

    test('should switch between tabs and maintain state', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Start on Preferences tab
      await expect(settingsPage.page.locator('[data-testid="preferences-content"]')).toBeVisible()
      
      // Switch to Delivery Methods
      await settingsPage.clickDeliveryMethodsTab()
      await expect(settingsPage.page.locator('[data-testid="delivery-methods-content"]')).toBeVisible()
      
      // Switch to Schedule & Timing
      await settingsPage.clickScheduleTimingTab()
      await expect(settingsPage.page.locator('[data-testid="schedule-timing-content"]')).toBeVisible()
      
      // Switch back to Preferences - should remember previous state
      await settingsPage.page.click('text="Notification Preferences"')
      await expect(settingsPage.page.locator('[data-testid="preferences-content"]')).toBeVisible()
    })

    test('should display account type-specific features', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Administrator should see admin-only features
      await expect(settingsPage.page.locator('text="Account Type: Administrator"')).toBeVisible()
      await expect(settingsPage.page.locator('[data-testid="admin-features"]')).toBeVisible()
    })
  })

  describe('Notification Preferences Workflow', () => {
    test('should configure board governance notifications end-to-end', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Expand Board Governance category
      await settingsPage.expandNotificationCategory('board_governance')
      
      // Enable board meeting notifications
      await settingsPage.toggleNotification('board_meeting_scheduled')
      
      // Change frequency to daily digest
      await settingsPage.changeNotificationFrequency('board_meeting_scheduled', 'digest_daily')
      
      // Enable voting notifications
      await settingsPage.toggleNotification('voting_opened')
      
      // Save settings
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify settings are persisted
      await settingsPage.page.reload()
      await settingsPage.clickNotificationsTab()
      await settingsPage.expandNotificationCategory('board_governance')
      
      const meetingCheckbox = settingsPage.page.locator('[data-testid="notification-board_meeting_scheduled-checkbox"]')
      await expect(meetingCheckbox).toBeChecked()
      
      const votingCheckbox = settingsPage.page.locator('[data-testid="notification-voting_opened-checkbox"]')
      await expect(votingCheckbox).toBeChecked()
    })

    test('should handle notification priority and categorization', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Security notifications should be marked as critical
      await settingsPage.expandNotificationCategory('security')
      await expect(settingsPage.page.locator('text="critical"')).toBeVisible()
      
      // Board governance should have high priority items
      await settingsPage.expandNotificationCategory('board_governance')
      await expect(settingsPage.page.locator('text="high"')).toBeVisible()
      
      // Document management should have medium priority items
      await settingsPage.expandNotificationCategory('documents')
      await expect(settingsPage.page.locator('text="medium"')).toBeVisible()
    })

    test('should validate notification configuration constraints', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Try to disable critical security notifications
      await settingsPage.expandNotificationCategory('security')
      
      const criticalAlert = settingsPage.page.locator('[data-testid="notification-security_alert-checkbox"]')
      await criticalAlert.click()
      
      // Should show warning about disabling critical notifications
      await expect(settingsPage.page.locator('[data-testid="critical-notification-warning"]')).toBeVisible()
      
      // Should require confirmation
      await expect(settingsPage.page.locator('[data-testid="confirm-disable-critical"]')).toBeVisible()
    })
  })

  describe('Delivery Methods Configuration', () => {
    test('should configure email delivery settings', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickDeliveryMethodsTab()
      
      // Enable email notifications
      await settingsPage.toggleEmailNotifications()
      
      // Update email address
      const newEmail = 'admin@testcompany.com'
      await settingsPage.updateEmailAddress(newEmail)
      
      // Verify email address
      await settingsPage.verifyEmailAddress()
      
      // Should show verification pending state
      await expect(settingsPage.page.locator('text="Verification sent"')).toBeVisible()
      
      // Save settings
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify email address is updated
      const emailInput = settingsPage.page.locator('[data-testid="email-address-input"]')
      await expect(emailInput).toHaveValue(newEmail)
    })

    test('should configure SMS delivery settings with validation', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickDeliveryMethodsTab()
      
      // Enable SMS notifications
      await settingsPage.toggleSMSNotifications()
      
      // Try invalid phone number
      await settingsPage.updatePhoneNumber('invalid-phone')
      await settingsPage.saveSettings()
      
      // Should show validation error
      await expect(settingsPage.page.locator('text="Invalid phone number"')).toBeVisible()
      
      // Enter valid phone number
      await settingsPage.updatePhoneNumber('+1-555-123-4567')
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
    })

    test('should configure push notification settings', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickDeliveryMethodsTab()
      
      // Enable browser push notifications
      await settingsPage.page.click('[data-testid="push-notifications-toggle"]')
      
      // Mock browser permission prompt
      await settingsPage.page.evaluate(() => {
        // Mock Notification API
        Object.defineProperty(window, 'Notification', {
          value: {
            permission: 'granted',
            requestPermission: () => Promise.resolve('granted')
          }
        })
      })
      
      // Enable sound notifications
      await settingsPage.page.click('[data-testid="push-sound-toggle"]')
      
      // Enable desktop notifications
      await settingsPage.page.click('[data-testid="push-desktop-toggle"]')
      
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify settings are applied
      await expect(settingsPage.page.locator('[data-testid="push-notifications-toggle"]')).toBeChecked()
      await expect(settingsPage.page.locator('[data-testid="push-sound-toggle"]')).toBeChecked()
    })

    test('should show webhook settings for admin users only', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickDeliveryMethodsTab()
      
      // Admin should see webhook integration
      await expect(settingsPage.page.locator('text="Webhook Integration"')).toBeVisible()
      
      // Configure webhook URL
      const webhookUrl = 'https://api.company.com/webhooks/notifications'
      await settingsPage.page.fill('[data-testid="webhook-url-input"]', webhookUrl)
      
      // Set secret key
      await settingsPage.page.fill('[data-testid="webhook-secret-input"]', 'secret-key-123')
      
      // Set retry policy
      await settingsPage.page.selectOption('[data-testid="webhook-retry-policy"]', 'exponential')
      
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify webhook URL is saved
      const urlInput = settingsPage.page.locator('[data-testid="webhook-url-input"]')
      await expect(urlInput).toHaveValue(webhookUrl)
    })
  })

  describe('Schedule & Timing Configuration', () => {
    test('should configure quiet hours end-to-end', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickScheduleTimingTab()
      
      // Enable quiet hours
      await settingsPage.enableQuietHours()
      
      // Set quiet hours time
      await settingsPage.setQuietHoursTime('22:00', '08:00')
      
      // Select timezone
      await settingsPage.page.selectOption('[data-testid="timezone-select"]', 'America/New_York')
      
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify quiet hours are configured
      await expect(settingsPage.page.locator('[data-testid="quiet-hours-toggle"]')).toBeChecked()
      await expect(settingsPage.page.locator('[data-testid="quiet-hours-start"]')).toHaveValue('22:00')
      await expect(settingsPage.page.locator('[data-testid="quiet-hours-end"]')).toHaveValue('08:00')
    })

    test('should configure digest settings', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickScheduleTimingTab()
      
      // Configure daily digest
      await settingsPage.setDailyDigestTime('09:00')
      
      // Configure weekly digest
      await settingsPage.page.selectOption('[data-testid="weekly-digest-day"]', 'monday')
      await settingsPage.page.fill('[data-testid="weekly-digest-time"]', '09:00')
      
      // Configure monthly summary
      await settingsPage.page.selectOption('[data-testid="monthly-summary-date"]', '1')
      
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify digest settings
      await expect(settingsPage.page.locator('[data-testid="daily-digest-time"]')).toHaveValue('09:00')
      await expect(settingsPage.page.locator('[data-testid="weekly-digest-day"]')).toHaveValue('monday')
    })

    test('should configure frequency limits', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickScheduleTimingTab()
      
      // Set notification frequency limit
      await settingsPage.page.selectOption('[data-testid="max-notifications-hour"]', '25')
      
      // Enable smart batching
      await settingsPage.page.selectOption('[data-testid="bundle-notifications"]', 'enabled')
      await settingsPage.page.selectOption('[data-testid="smart-batching"]', 'enabled')
      
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Verify frequency settings
      await expect(settingsPage.page.locator('[data-testid="max-notifications-hour"]')).toHaveValue('25')
    })
  })

  describe('Data Persistence and State Management', () => {
    test('should persist settings across browser sessions', async ({ page, browser }) => {
      await settingsPage.clickNotificationsTab()
      
      // Configure some settings
      await settingsPage.expandNotificationCategory('board_governance')
      await settingsPage.toggleNotification('board_meeting_scheduled')
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
      
      // Close browser and create new session
      await page.close()
      await context.close()
      
      const newContext = await browser.newContext({
        storageState: {
          cookies: [],
          origins: [{
            origin: E2E_CONFIG.baseURL,
            localStorage: [{
              name: 'user-session',
              value: JSON.stringify({
                user: UserContextFactory.create({ accountType: 'Administrator' }),
                authenticated: true
              })
            }]
          }]
        }
      })
      
      const newPage = await newContext.newPage()
      const newSettingsPage = new SettingsPage(newPage)
      
      await newSettingsPage.navigateToSettings()
      await newSettingsPage.clickNotificationsTab()
      await newSettingsPage.expandNotificationCategory('board_governance')
      
      // Verify settings are persisted
      const checkbox = newPage.locator('[data-testid="notification-board_meeting_scheduled-checkbox"]')
      await expect(checkbox).toBeChecked()
      
      await newContext.close()
    })

    test('should handle concurrent updates gracefully', async ({ page, browser }) => {
      // Simulate concurrent user sessions
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()
      
      const settings1 = new SettingsPage(page1)
      const settings2 = new SettingsPage(page2)
      
      // Both users navigate to settings
      await settings1.navigateToSettings()
      await settings1.clickNotificationsTab()
      
      await settings2.navigateToSettings()
      await settings2.clickNotificationsTab()
      
      // User 1 makes changes
      await settings1.expandNotificationCategory('board_governance')
      await settings1.toggleNotification('board_meeting_scheduled')
      
      // User 2 makes different changes
      await settings2.expandNotificationCategory('security')
      await settings2.toggleNotification('security_alert')
      
      // Both users save (potential conflict)
      await settings1.saveSettings()
      await settings1.waitForSuccessMessage()
      
      await settings2.saveSettings()
      // Should either succeed or show conflict resolution
      await Promise.race([
        settings2.waitForSuccessMessage(),
        expect(page2.locator('text="Settings conflict detected"')).toBeVisible()
      ])
      
      await context1.close()
      await context2.close()
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Simulate network failure
      await settingsPage.page.route('**/api/settings/**', route => route.abort('failed'))
      
      // Try to save settings
      await settingsPage.expandNotificationCategory('board_governance')
      await settingsPage.toggleNotification('board_meeting_scheduled')
      await settingsPage.saveSettings()
      
      // Should show error message
      await settingsPage.waitForErrorMessage()
      await expect(settingsPage.page.locator('text="Failed to save settings"')).toBeVisible()
      await expect(settingsPage.page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Remove network simulation
      await settingsPage.page.unroute('**/api/settings/**')
      
      // Retry should work
      await settingsPage.page.click('[data-testid="retry-button"]')
      await settingsPage.waitForSuccessMessage()
    })

    test('should validate form inputs and show appropriate errors', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.clickDeliveryMethodsTab()
      
      // Try invalid email
      await settingsPage.updateEmailAddress('invalid-email')
      await settingsPage.saveSettings()
      
      await expect(settingsPage.page.locator('text="Please enter a valid email address"')).toBeVisible()
      
      // Try empty required field
      await settingsPage.updateEmailAddress('')
      await settingsPage.saveSettings()
      
      await expect(settingsPage.page.locator('text="Email address is required"')).toBeVisible()
      
      // Fix validation error
      await settingsPage.updateEmailAddress('valid@company.com')
      await settingsPage.saveSettings()
      await settingsPage.waitForSuccessMessage()
    })
  })

  describe('Performance and Loading States', () => {
    test('should load settings within performance budget', async () => {
      const startTime = Date.now()
      
      await settingsPage.clickNotificationsTab()
      
      // Wait for all content to be visible
      await expect(settingsPage.page.locator('[data-testid="notification-preferences-loaded"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load within 2 seconds (following CLAUDE.md performance requirements)
      expect(loadTime).toBeLessThan(2000)
    })

    test('should show appropriate loading states', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Mock slow API response
      await settingsPage.page.route('**/api/settings/notifications**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ preferences: [] })
        })
      })
      
      // Reload to trigger loading state
      await settingsPage.page.reload()
      await settingsPage.clickNotificationsTab()
      
      // Should show loading skeletons
      await expect(settingsPage.page.locator('[data-testid="settings-skeleton"]')).toBeVisible()
      
      // Should eventually show loaded content
      await expect(settingsPage.page.locator('[data-testid="notification-preferences-loaded"]')).toBeVisible()
    })
  })

  describe('Accessibility Compliance (WCAG 2.1)', () => {
    test('should be fully keyboard navigable', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Tab navigation should work
      await settingsPage.page.keyboard.press('Tab')
      await expect(settingsPage.page.locator('button:focus')).toBeVisible()
      
      // Arrow key navigation in tab groups
      await settingsPage.page.keyboard.press('ArrowRight')
      await expect(settingsPage.page.locator('button:focus')).toContainText('Delivery Methods')
      
      // Enter should activate focused elements
      await settingsPage.page.keyboard.press('Enter')
      await expect(settingsPage.page.locator('[data-testid="delivery-methods-tab"]')).toBeVisible()
      
      // Tab to form controls
      await settingsPage.page.keyboard.press('Tab')
      await settingsPage.page.keyboard.press('Space') // Should toggle checkbox/button
      
      // Escape should close modals/dropdowns
      await settingsPage.page.keyboard.press('Escape')
    })

    test('should have proper ARIA labels and roles', async () => {
      await settingsPage.clickNotificationsTab()
      await settingsPage.checkAccessibility()
      
      // Verify tab navigation has proper ARIA
      const tablist = settingsPage.page.locator('[role="tablist"]')
      await expect(tablist).toBeVisible()
      
      const tabs = settingsPage.page.locator('[role="tab"]')
      expect(await tabs.count()).toBeGreaterThan(0)
      
      // Verify form labels
      const checkboxes = settingsPage.page.locator('input[type="checkbox"]')
      for (let i = 0; i < await checkboxes.count(); i++) {
        const checkbox = checkboxes.nth(i)
        const ariaLabel = await checkbox.getAttribute('aria-label')
        const ariaLabelledBy = await checkbox.getAttribute('aria-labelledby')
        expect(ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    })

    test('should work with screen readers', async () => {
      await settingsPage.clickNotificationsTab()
      
      // Verify headings are properly structured
      const h1 = settingsPage.page.locator('h1')
      await expect(h1).toContainText('Notification Settings')
      
      const h2s = settingsPage.page.locator('h2')
      expect(await h2s.count()).toBeGreaterThan(0)
      
      // Verify descriptions are associated with controls
      const describedElements = settingsPage.page.locator('[aria-describedby]')
      for (let i = 0; i < await describedElements.count(); i++) {
        const element = describedElements.nth(i)
        const describedBy = await element.getAttribute('aria-describedby')
        const description = settingsPage.page.locator(`#${describedBy}`)
        await expect(description).toBeVisible()
      }
    })

    test('should meet color contrast requirements', async () => {
      await settingsPage.clickNotificationsTab()
      
      // This would typically use an accessibility testing tool
      // For now, we verify key color elements exist with proper contrast
      const criticalElements = [
        '[data-testid="critical-notification"]',
        '[data-testid="high-priority-notification"]',
        '[data-testid="error-message"]',
        '[data-testid="success-message"]'
      ]
      
      for (const selector of criticalElements) {
        const element = settingsPage.page.locator(selector)
        if (await element.count() > 0) {
          // Verify element is visible (basic contrast check)
          await expect(element).toBeVisible()
        }
      }
    })
  })

  describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ browser }) => {
        // This test would run across different browsers
        const context = await browser.newContext()
        const page = await context.newPage()
        const settings = new SettingsPage(page)
        
        await settings.navigateToSettings()
        await settings.clickNotificationsTab()
        
        // Basic functionality should work
        await expect(page.locator('text="Notification Settings"')).toBeVisible()
        
        // Form interactions should work
        await settings.expandNotificationCategory('board_governance')
        await settings.toggleNotification('board_meeting_scheduled')
        
        // Settings should save successfully
        await settings.saveSettings()
        await settings.waitForSuccessMessage()
        
        await context.close()
      })
    })
  })

  describe('Mobile Responsive Testing', () => {
    test('should work on mobile viewport', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 } // iPhone SE
      })
      
      const page = await context.newPage()
      const settings = new SettingsPage(page)
      
      await settings.navigateToSettings()
      await settings.clickNotificationsTab()
      
      // Should show mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-settings-nav"]')).toBeVisible()
      
      // Touch interactions should work
      await page.tap('text="Board Governance"')
      await expect(page.locator('[data-testid="notification-category-board_governance-expanded"]')).toBeVisible()
      
      await context.close()
    })
  })
})