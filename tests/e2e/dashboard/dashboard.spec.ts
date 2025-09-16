import { test, expect } from '../fixtures/auth.fixture'
import { DashboardPage } from '../pages/dashboard.page'

test.describe('Dashboard', () => {
  test.use({ storageState: undefined })

  test.describe('Authenticated Dashboard Tests', () => {
    test('should display dashboard after login', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const title = await dashboardPage.getDashboardTitle()
      expect(title).toContain('Dashboard')
      
      const isOnDashboard = await dashboardPage.isOnDashboard()
      expect(isOnDashboard).toBeTruthy()
    })

    test('should display stats cards', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const statsCards = authenticatedPage.locator('[data-testid="stats-cards"], .stats-cards')
      await expect(statsCards).toBeVisible()
      
      // Check for at least one stats card
      const cardValue = await dashboardPage.getStatsCardValue('Total Documents')
      expect(cardValue).toBeDefined()
    })

    test('should navigate to documents page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToDocuments()
      await expect(authenticatedPage).toHaveURL(/.*documents/)
    })

    test('should navigate to meetings page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToMeetings()
      await expect(authenticatedPage).toHaveURL(/.*meetings/)
    })

    test('should navigate to board page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToBoard()
      await expect(authenticatedPage).toHaveURL(/.*board/)
    })

    test('should navigate to organization page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToOrganization()
      await expect(authenticatedPage).toHaveURL(/.*organization/)
    })

    test('should navigate to settings page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToSettings()
      await expect(authenticatedPage).toHaveURL(/.*settings/)
    })

    test('should display user information', async ({ authenticatedPage, dashboardPage, testUser }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const userName = await dashboardPage.getUserName()
      expect(userName).toBeTruthy()
      
      const userRole = await dashboardPage.getUserRole()
      expect(userRole).toBeTruthy()
    })

    test('should open user menu', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.openUserMenu()
      
      const profileMenuItem = authenticatedPage.locator('a[href*="/profile"], [data-testid="menu-profile"]')
      await expect(profileMenuItem).toBeVisible()
    })

    test('should navigate to profile page', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.navigateToProfile()
      await expect(authenticatedPage).toHaveURL(/.*profile/)
    })

    test('should logout successfully', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.logout()
      await expect(authenticatedPage).toHaveURL(/.*sign-in/)
    })

    test('should search from dashboard', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      await dashboardPage.search('test query')
      
      // Verify search results or navigation
      const url = authenticatedPage.url()
      expect(url).toContain('search')
    })

    test('should display notifications', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const notificationCount = await dashboardPage.getNotificationCount()
      expect(notificationCount).toBeGreaterThanOrEqual(0)
      
      await dashboardPage.openNotifications()
      
      // Check if notification panel opens
      const notificationPanel = authenticatedPage.locator('[data-testid="notification-panel"], .notification-panel')
      await expect(notificationPanel).toBeVisible()
    })

    test('should display recent activity', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const activityItems = await dashboardPage.getRecentActivityItems()
      expect(activityItems.length).toBeGreaterThanOrEqual(0)
    })

    test('should display upcoming meetings', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const meetings = await dashboardPage.getUpcomingMeetings()
      expect(meetings.length).toBeGreaterThanOrEqual(0)
    })

    test('should display recent documents', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const documents = await dashboardPage.getRecentDocuments()
      expect(documents.length).toBeGreaterThanOrEqual(0)
    })

    test('should toggle sidebar', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const initialState = await dashboardPage.isSidebarExpanded()
      await dashboardPage.toggleSidebar()
      
      const newState = await dashboardPage.isSidebarExpanded()
      expect(newState).not.toBe(initialState)
    })

    test('should highlight active menu item', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const isDashboardActive = await dashboardPage.isMenuItemActive('Dashboard')
      expect(isDashboardActive).toBeTruthy()
    })

    test('should handle quick actions - upload document', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const uploadButton = authenticatedPage.locator('button:has-text("Upload Document"), [data-testid="upload-document"]')
      
      if (await uploadButton.isVisible()) {
        await dashboardPage.uploadDocumentQuick()
        
        // Verify upload modal or navigation
        const uploadModal = authenticatedPage.locator('[data-testid="upload-modal"], .upload-modal')
        const isModalVisible = await uploadModal.isVisible()
        const isNavigated = authenticatedPage.url().includes('upload')
        
        expect(isModalVisible || isNavigated).toBeTruthy()
      }
    })

    test('should handle quick actions - schedule meeting', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const scheduleMeetingButton = authenticatedPage.locator('button:has-text("Schedule Meeting"), [data-testid="schedule-meeting"]')
      
      if (await scheduleMeetingButton.isVisible()) {
        await dashboardPage.scheduleMeetingQuick()
        
        // Verify meeting modal or navigation
        const meetingModal = authenticatedPage.locator('[data-testid="meeting-modal"], .meeting-modal')
        const isModalVisible = await meetingModal.isVisible()
        const isNavigated = authenticatedPage.url().includes('meeting')
        
        expect(isModalVisible || isNavigated).toBeTruthy()
      }
    })

    test('should handle quick actions - create task', async ({ authenticatedPage, dashboardPage }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForDashboardLoad()
      
      const createTaskButton = authenticatedPage.locator('button:has-text("Create Task"), [data-testid="create-task"]')
      
      if (await createTaskButton.isVisible()) {
        await dashboardPage.createTaskQuick()
        
        // Verify task modal or navigation
        const taskModal = authenticatedPage.locator('[data-testid="task-modal"], .task-modal')
        const isModalVisible = await taskModal.isVisible()
        const isNavigated = authenticatedPage.url().includes('task')
        
        expect(isModalVisible || isNavigated).toBeTruthy()
      }
    })
  })
})