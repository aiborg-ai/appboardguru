import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Dashboard Page Object Model
 */
export class DashboardPage extends BasePage {
  // Navigation elements
  private readonly sidebar: Locator
  private readonly navBar: Locator
  private readonly userMenu: Locator
  private readonly notificationBell: Locator
  private readonly searchBar: Locator
  
  // Dashboard widgets
  private readonly statsCards: Locator
  private readonly recentActivityWidget: Locator
  private readonly upcomingMeetingsWidget: Locator
  private readonly documentsWidget: Locator
  private readonly tasksWidget: Locator
  private readonly complianceWidget: Locator
  
  // Sidebar menu items
  private readonly dashboardMenuItem: Locator
  private readonly documentsMenuItem: Locator
  private readonly meetingsMenuItem: Locator
  private readonly boardMenuItem: Locator
  private readonly organizationMenuItem: Locator
  private readonly settingsMenuItem: Locator
  private readonly reportsMenuItem: Locator
  
  // User menu items
  private readonly profileMenuItem: Locator
  private readonly logoutMenuItem: Locator
  
  // Quick actions
  private readonly uploadDocumentButton: Locator
  private readonly scheduleMeetingButton: Locator
  private readonly createTaskButton: Locator

  constructor(page: Page) {
    super(page, '/dashboard')
    
    // Initialize navigation locators
    this.sidebar = page.locator('[data-testid="sidebar"], .sidebar, aside')
    this.navBar = page.locator('[data-testid="navbar"], .navbar, header')
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu')
    this.notificationBell = page.locator('[data-testid="notifications"], .notification-bell')
    this.searchBar = page.locator('input[type="search"], input[placeholder*="Search"]')
    
    // Initialize widget locators
    this.statsCards = page.locator('[data-testid="stats-cards"], .stats-cards')
    this.recentActivityWidget = page.locator('[data-testid="recent-activity"], .recent-activity')
    this.upcomingMeetingsWidget = page.locator('[data-testid="upcoming-meetings"], .upcoming-meetings')
    this.documentsWidget = page.locator('[data-testid="recent-documents"], .recent-documents')
    this.tasksWidget = page.locator('[data-testid="tasks"], .tasks-widget')
    this.complianceWidget = page.locator('[data-testid="compliance"], .compliance-widget')
    
    // Initialize menu item locators
    this.dashboardMenuItem = page.locator('a[href="/dashboard"], [data-testid="menu-dashboard"]')
    this.documentsMenuItem = page.locator('a[href*="/documents"], [data-testid="menu-documents"]')
    this.meetingsMenuItem = page.locator('a[href*="/meetings"], [data-testid="menu-meetings"]')
    this.boardMenuItem = page.locator('a[href*="/board"], [data-testid="menu-board"]')
    this.organizationMenuItem = page.locator('a[href*="/organization"], [data-testid="menu-organization"]')
    this.settingsMenuItem = page.locator('a[href*="/settings"], [data-testid="menu-settings"]')
    this.reportsMenuItem = page.locator('a[href*="/reports"], [data-testid="menu-reports"]')
    
    // Initialize user menu locators
    this.profileMenuItem = page.locator('a[href*="/profile"], [data-testid="menu-profile"]')
    this.logoutMenuItem = page.locator('button:has-text("Logout"), [data-testid="menu-logout"]')
    
    // Initialize quick action locators
    this.uploadDocumentButton = page.locator('button:has-text("Upload Document"), [data-testid="upload-document"]')
    this.scheduleMeetingButton = page.locator('button:has-text("Schedule Meeting"), [data-testid="schedule-meeting"]')
    this.createTaskButton = page.locator('button:has-text("Create Task"), [data-testid="create-task"]')
  }

  /**
   * Navigate to dashboard
   */
  async navigateToDashboard(): Promise<void> {
    await this.dashboardMenuItem.click()
    await this.page.waitForURL('**/dashboard')
  }

  /**
   * Navigate to documents
   */
  async navigateToDocuments(): Promise<void> {
    await this.documentsMenuItem.click()
    await this.page.waitForURL('**/documents')
  }

  /**
   * Navigate to meetings
   */
  async navigateToMeetings(): Promise<void> {
    await this.meetingsMenuItem.click()
    await this.page.waitForURL('**/meetings')
  }

  /**
   * Navigate to board
   */
  async navigateToBoard(): Promise<void> {
    await this.boardMenuItem.click()
    await this.page.waitForURL('**/board')
  }

  /**
   * Navigate to organization
   */
  async navigateToOrganization(): Promise<void> {
    await this.organizationMenuItem.click()
    await this.page.waitForURL('**/organization')
  }

  /**
   * Navigate to settings
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsMenuItem.click()
    await this.page.waitForURL('**/settings')
  }

  /**
   * Navigate to reports
   */
  async navigateToReports(): Promise<void> {
    await this.reportsMenuItem.click()
    await this.page.waitForURL('**/reports')
  }

  /**
   * Open user menu
   */
  async openUserMenu(): Promise<void> {
    await this.userMenu.click()
  }

  /**
   * Navigate to profile
   */
  async navigateToProfile(): Promise<void> {
    await this.openUserMenu()
    await this.profileMenuItem.click()
    await this.page.waitForURL('**/profile')
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.openUserMenu()
    await this.logoutMenuItem.click()
    await this.page.waitForURL('**/sign-in')
  }

  /**
   * Search
   */
  async search(query: string): Promise<void> {
    await this.searchBar.fill(query)
    await this.searchBar.press('Enter')
  }

  /**
   * Open notifications
   */
  async openNotifications(): Promise<void> {
    await this.notificationBell.click()
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('.badge, .count')
    if (await badge.isVisible()) {
      const text = await badge.textContent()
      return parseInt(text || '0', 10)
    }
    return 0
  }

  /**
   * Upload document quick action
   */
  async uploadDocumentQuick(): Promise<void> {
    await this.uploadDocumentButton.click()
  }

  /**
   * Schedule meeting quick action
   */
  async scheduleMeetingQuick(): Promise<void> {
    await this.scheduleMeetingButton.click()
  }

  /**
   * Create task quick action
   */
  async createTaskQuick(): Promise<void> {
    await this.createTaskButton.click()
  }

  /**
   * Get stats card value
   */
  async getStatsCardValue(cardTitle: string): Promise<string | null> {
    const card = this.statsCards.locator(`[data-card-title="${cardTitle}"], :has-text("${cardTitle}")`)
    const value = card.locator('.value, .number, [data-value]')
    if (await value.isVisible()) {
      return await value.textContent()
    }
    return null
  }

  /**
   * Get recent activity items
   */
  async getRecentActivityItems(): Promise<string[]> {
    const items = await this.recentActivityWidget.locator('.activity-item, li').allTextContents()
    return items
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(): Promise<string[]> {
    const meetings = await this.upcomingMeetingsWidget.locator('.meeting-item, li').allTextContents()
    return meetings
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(): Promise<string[]> {
    const documents = await this.documentsWidget.locator('.document-item, li').allTextContents()
    return documents
  }

  /**
   * Check if sidebar is expanded
   */
  async isSidebarExpanded(): Promise<boolean> {
    const classes = await this.sidebar.getAttribute('class')
    return classes?.includes('expanded') || classes?.includes('open') || false
  }

  /**
   * Toggle sidebar
   */
  async toggleSidebar(): Promise<void> {
    const toggleButton = this.page.locator('[data-testid="sidebar-toggle"], .sidebar-toggle')
    await toggleButton.click()
  }

  /**
   * Check if user is on dashboard
   */
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard')
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.statsCards.waitFor({ state: 'visible', timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get user name from dashboard
   */
  async getUserName(): Promise<string | null> {
    const userName = this.userMenu.locator('.user-name, .username')
    if (await userName.isVisible()) {
      return await userName.textContent()
    }
    return null
  }

  /**
   * Get user role from dashboard
   */
  async getUserRole(): Promise<string | null> {
    const userRole = this.userMenu.locator('.user-role, .role')
    if (await userRole.isVisible()) {
      return await userRole.textContent()
    }
    return null
  }

  /**
   * Check if menu item is active
   */
  async isMenuItemActive(menuItem: string): Promise<boolean> {
    const item = this.sidebar.locator(`a:has-text("${menuItem}")`)
    const classes = await item.getAttribute('class')
    return classes?.includes('active') || classes?.includes('selected') || false
  }

  /**
   * Get dashboard title
   */
  async getDashboardTitle(): Promise<string | null> {
    const title = this.page.locator('h1, [data-testid="page-title"]')
    if (await title.isVisible()) {
      return await title.textContent()
    }
    return null
  }
}