import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Dashboard Page Object Model
 * Handles main dashboard functionality, navigation, and layout
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URL
  readonly dashboardUrl = '/dashboard'

  // Main layout elements
  get dashboardContent(): Locator {
    return this.page.locator('[data-testid="dashboard-content"]')
  }

  get sidebar(): Locator {
    return this.page.locator('[data-testid="sidebar"]')
  }

  get mobileSidebar(): Locator {
    return this.page.locator('[data-testid="mobile-sidebar"]')
  }

  get mobileMenuTrigger(): Locator {
    return this.page.locator('[data-testid="mobile-menu-trigger"]')
  }

  get header(): Locator {
    return this.page.locator('[data-testid="header"]')
  }

  // Navigation elements
  get navDashboard(): Locator {
    return this.page.locator('[data-testid="nav-dashboard"]')
  }

  get navOrganizations(): Locator {
    return this.page.locator('[data-testid="nav-organizations"]')
  }

  get navVaults(): Locator {
    return this.page.locator('[data-testid="nav-vaults"]')
  }

  get navAssets(): Locator {
    return this.page.locator('[data-testid="nav-assets"]')
  }

  get navMeetings(): Locator {
    return this.page.locator('[data-testid="nav-meetings"]')
  }

  get navBoardmates(): Locator {
    return this.page.locator('[data-testid="nav-boardmates"]')
  }

  get navSettings(): Locator {
    return this.page.locator('[data-testid="nav-settings"]')
  }

  get navInstruments(): Locator {
    return this.page.locator('[data-testid="nav-instruments"]')
  }

  get navCalendar(): Locator {
    return this.page.locator('[data-testid="nav-calendar"]')
  }

  // User menu elements
  get userMenuTrigger(): Locator {
    return this.page.locator('[data-testid="user-menu-trigger"]')
  }

  get userMenuDropdown(): Locator {
    return this.page.locator('[data-testid="user-menu-dropdown"]')
  }

  get userMenuEmail(): Locator {
    return this.page.locator('[data-testid="user-menu-email"]')
  }

  get menuProfile(): Locator {
    return this.page.locator('[data-testid="menu-profile"]')
  }

  get menuSettings(): Locator {
    return this.page.locator('[data-testid="menu-settings"]')
  }

  get signoutButton(): Locator {
    return this.page.locator('[data-testid="signout-button"]')
  }

  // Organization selector
  get organizationSelector(): Locator {
    return this.page.locator('[data-testid="organization-selector"]')
  }

  get organizationDropdown(): Locator {
    return this.page.locator('[data-testid="organization-dropdown"]')
  }

  // Dashboard content elements
  get welcomeMessage(): Locator {
    return this.page.locator('[data-testid="welcome-message"]')
  }

  get metricsGrid(): Locator {
    return this.page.locator('[data-testid="metrics-grid"]')
  }

  get metricOrganizations(): Locator {
    return this.page.locator('[data-testid="metric-organizations"]')
  }

  get metricVaults(): Locator {
    return this.page.locator('[data-testid="metric-vaults"]')
  }

  get metricAssets(): Locator {
    return this.page.locator('[data-testid="metric-assets"]')
  }

  get metricMeetings(): Locator {
    return this.page.locator('[data-testid="metric-meetings"]')
  }

  get recentActivity(): Locator {
    return this.page.locator('[data-testid="recent-activity"]')
  }

  get activityFeed(): Locator {
    return this.page.locator('[data-testid="activity-feed"]')
  }

  get activityItems(): Locator {
    return this.page.locator('[data-testid="activity-item"]')
  }

  // Quick actions
  get quickActions(): Locator {
    return this.page.locator('[data-testid="quick-actions"]')
  }

  get quickCreateOrganization(): Locator {
    return this.page.locator('[data-testid="quick-create-organization"]')
  }

  get quickCreateVault(): Locator {
    return this.page.locator('[data-testid="quick-create-vault"]')
  }

  get quickUploadAsset(): Locator {
    return this.page.locator('[data-testid="quick-upload-asset"]')
  }

  get quickCreateMeeting(): Locator {
    return this.page.locator('[data-testid="quick-create-meeting"]')
  }

  // Search functionality
  get globalSearch(): Locator {
    return this.page.locator('[data-testid="global-search"]')
  }

  get searchResults(): Locator {
    return this.page.locator('[data-testid="search-results"]')
  }

  get searchResultAsset(): Locator {
    return this.page.locator('[data-testid="search-result-asset"]')
  }

  get searchResultVault(): Locator {
    return this.page.locator('[data-testid="search-result-vault"]')
  }

  // Notifications
  get notificationsButton(): Locator {
    return this.page.locator('[data-testid="notifications-button"]')
  }

  get notificationsBadge(): Locator {
    return this.page.locator('[data-testid="notifications-badge"]')
  }

  get notificationsPanel(): Locator {
    return this.page.locator('[data-testid="notifications-panel"]')
  }

  // Board chat
  get boardChatButton(): Locator {
    return this.page.locator('[data-testid="board-chat-button"]')
  }

  get boardChatPanel(): Locator {
    return this.page.locator('[data-testid="board-chat-panel"]')
  }

  // Navigation methods
  async goToDashboard(): Promise<void> {
    await this.page.goto(this.dashboardUrl)
    await expect(this.dashboardContent).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  async navigateToOrganizations(): Promise<void> {
    await this.navOrganizations.click()
    await this.waitForUrl('/dashboard/organizations')
    await expect(this.page.locator('[data-testid="organizations-page"]')).toBeVisible()
  }

  async navigateToVaults(): Promise<void> {
    await this.navVaults.click()
    await this.waitForUrl('/dashboard/vaults')
    await expect(this.page.locator('[data-testid="vaults-page"]')).toBeVisible()
  }

  async navigateToAssets(): Promise<void> {
    await this.navAssets.click()
    await this.waitForUrl('/dashboard/assets')
    await expect(this.page.locator('[data-testid="assets-page"]')).toBeVisible()
  }

  async navigateToMeetings(): Promise<void> {
    await this.navMeetings.click()
    await this.waitForUrl('/dashboard/meetings')
    await expect(this.page.locator('[data-testid="meetings-page"]')).toBeVisible()
  }

  async navigateToBoardmates(): Promise<void> {
    await this.navBoardmates.click()
    await this.waitForUrl('/dashboard/boardmates')
    await expect(this.page.locator('[data-testid="boardmates-page"]')).toBeVisible()
  }

  async navigateToSettings(): Promise<void> {
    await this.navSettings.click()
    await this.waitForUrl('/dashboard/settings')
    await expect(this.page.locator('[data-testid="settings-page"]')).toBeVisible()
  }

  async navigateToCalendar(): Promise<void> {
    await this.navCalendar.click()
    await this.waitForUrl('/dashboard/calendar')
    await expect(this.page.locator('[data-testid="calendar-page"]')).toBeVisible()
  }

  async navigateToInstruments(): Promise<void> {
    await this.navInstruments.click()
    await this.waitForUrl('/dashboard/instruments')
    await expect(this.page.locator('[data-testid="instruments-page"]')).toBeVisible()
  }

  // User menu actions
  async openUserMenu(): Promise<void> {
    await this.userMenuTrigger.click()
    await expect(this.userMenuDropdown).toBeVisible()
  }

  async signOut(): Promise<void> {
    await this.openUserMenu()
    await this.signoutButton.click()
    await this.waitForUrl('/')
  }

  async goToProfile(): Promise<void> {
    await this.openUserMenu()
    await this.menuProfile.click()
    await this.waitForUrl('/dashboard/profile')
  }

  async expectUserInfo(email: string): Promise<void> {
    await this.openUserMenu()
    await expect(this.userMenuEmail).toContainText(email)
  }

  // Organization selector methods
  async switchOrganization(organizationId: string): Promise<void> {
    await this.organizationSelector.click()
    await expect(this.organizationDropdown).toBeVisible()
    
    const orgOption = this.page.locator(`[data-testid="org-option-${organizationId}"]`)
    await orgOption.click()
    
    await this.waitForSpinnerToDisappear()
  }

  async expectCurrentOrganization(organizationName: string): Promise<void> {
    await expect(this.organizationSelector).toContainText(organizationName)
  }

  // Dashboard content verification
  async expectDashboardElements(): Promise<void> {
    await expect(this.welcomeMessage).toBeVisible()
    await expect(this.metricsGrid).toBeVisible()
    await expect(this.recentActivity).toBeVisible()
    await expect(this.quickActions).toBeVisible()
  }

  async expectMetrics(): Promise<void> {
    await expect(this.metricOrganizations).toBeVisible()
    await expect(this.metricVaults).toBeVisible()
    await expect(this.metricAssets).toBeVisible()
    
    // Check that metrics display numbers
    await expect(this.metricOrganizations.locator('[data-testid="metric-value"]')).toContainText(/\d+/)
    await expect(this.metricVaults.locator('[data-testid="metric-value"]')).toContainText(/\d+/)
    await expect(this.metricAssets.locator('[data-testid="metric-value"]')).toContainText(/\d+/)
  }

  async expectRecentActivity(): Promise<void> {
    await expect(this.activityFeed).toBeVisible()
    
    // Should have at least one activity item
    const activityCount = await this.activityItems.count()
    expect(activityCount).toBeGreaterThan(0)
    
    // Each activity item should have timestamp and description
    const firstActivity = this.activityItems.first()
    await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible()
    await expect(firstActivity.locator('[data-testid="activity-description"]')).toBeVisible()
  }

  // Quick actions
  async clickQuickCreateOrganization(): Promise<void> {
    await this.quickCreateOrganization.click()
    await expect(this.page.locator('[data-testid="create-organization-modal"]')).toBeVisible()
  }

  async clickQuickCreateVault(): Promise<void> {
    await this.quickCreateVault.click()
    await expect(this.page.locator('[data-testid="create-vault-modal"]')).toBeVisible()
  }

  async clickQuickUploadAsset(): Promise<void> {
    await this.quickUploadAsset.click()
    await expect(this.page.locator('[data-testid="upload-asset-modal"]')).toBeVisible()
  }

  // Search functionality
  async performSearch(query: string): Promise<void> {
    await this.globalSearch.fill(query)
    await expect(this.searchResults).toBeVisible()
  }

  async expectSearchResults(): Promise<void> {
    await expect(this.searchResults).toBeVisible()
    
    // Should have at least one result
    const results = this.page.locator('[data-testid^="search-result-"]')
    const resultCount = await results.count()
    expect(resultCount).toBeGreaterThan(0)
  }

  async clickSearchResult(type: 'asset' | 'vault', index = 0): Promise<void> {
    const result = this.page.locator(`[data-testid="search-result-${type}"]`).nth(index)
    await result.click()
    
    if (type === 'asset') {
      await this.page.waitForURL(/\/assets\//)
    } else if (type === 'vault') {
      await this.page.waitForURL(/\/vaults\//)
    }
  }

  // Responsive design testing
  async testMobileLayout(): Promise<void> {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 })
    
    // Sidebar should be hidden on mobile
    await expect(this.sidebar).toHaveClass(/hidden|collapsed/)
    
    // Mobile menu trigger should be visible
    await expect(this.mobileMenuTrigger).toBeVisible()
    
    // Test mobile menu
    await this.mobileMenuTrigger.click()
    await expect(this.mobileSidebar).toBeVisible()
  }

  async testTabletLayout(): Promise<void> {
    // Set tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 })
    
    // Content should adapt to tablet size
    await expect(this.dashboardContent).toBeVisible()
    await expect(this.metricsGrid).toBeVisible()
  }

  async testDesktopLayout(): Promise<void> {
    // Set desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 })
    
    // Sidebar should be visible on desktop
    await expect(this.sidebar).toBeVisible()
    await expect(this.sidebar).not.toHaveClass(/collapsed/)
  }

  // Performance testing
  async measureDashboardLoadTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.goToDashboard()
    })
  }

  async measureNavigationTime(destination: 'organizations' | 'vaults' | 'assets'): Promise<number> {
    return await this.measureActionTime(async () => {
      switch (destination) {
        case 'organizations':
          await this.navigateToOrganizations()
          break
        case 'vaults':
          await this.navigateToVaults()
          break
        case 'assets':
          await this.navigateToAssets()
          break
      }
    })
  }

  // Notifications
  async openNotifications(): Promise<void> {
    await this.notificationsButton.click()
    await expect(this.notificationsPanel).toBeVisible()
  }

  async expectNotificationBadge(count?: number): Promise<void> {
    await expect(this.notificationsBadge).toBeVisible()
    if (count !== undefined) {
      await expect(this.notificationsBadge).toContainText(String(count))
    }
  }

  // Board chat
  async openBoardChat(): Promise<void> {
    await this.boardChatButton.click()
    await expect(this.boardChatPanel).toBeVisible()
  }

  // Keyboard shortcuts
  async testKeyboardShortcuts(): Promise<void> {
    // Test search shortcut (S key)
    await this.page.keyboard.press('KeyS')
    await expect(this.globalSearch).toBeFocused()
    
    // Test escape to blur
    await this.page.keyboard.press('Escape')
    await expect(this.globalSearch).not.toBeFocused()
    
    // Test navigation shortcuts (if implemented)
    await this.page.keyboard.press('KeyG')
    await this.page.keyboard.press('KeyD')
    await expect(this.page).toHaveURL('/dashboard')
  }

  // Error handling
  async testNetworkErrorHandling(): Promise<void> {
    // Intercept network requests and simulate failure
    await this.page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })
    
    await this.page.reload()
    
    // Should show error boundary or error state
    const errorBoundary = this.page.locator('[data-testid="error-boundary"]')
    const errorMessage = this.page.locator('[data-testid="error-message"]')
    
    await expect(errorBoundary.or(errorMessage)).toBeVisible()
    
    // Should have retry button
    await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible()
  }
}