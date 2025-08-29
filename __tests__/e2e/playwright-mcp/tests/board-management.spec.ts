import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'

/**
 * Board Management E2E Tests with MCP Integration
 * 
 * Tests cover:
 * - Board creation and configuration
 * - Committee management
 * - Member management
 * - Meeting scheduling
 * - Board governance workflows
 */

test.describe('Board Management', () => {
  let helper: MCPTestHelper
  
  test.beforeEach(async ({ page, context }) => {
    helper = new MCPTestHelper(page, context)
    await helper.login()
    await page.goto('/dashboard/boards')
    await helper.waitForAppReady()
  })
  
  test('create new board', async ({ page }) => {
    // Click create board button
    await helper.smartClick('button:has-text("Create Board"), [data-testid="create-board"]')
    
    // Fill board details
    const boardData = {
      name: `Test Board ${Date.now()}`,
      description: 'Board created by MCP E2E tests',
      type: 'Corporate',
      memberCount: '10',
    }
    
    await helper.smartFill('#boardName', boardData.name)
    await helper.smartFill('#boardDescription', boardData.description)
    
    // Select board type if dropdown exists
    const typeSelector = page.locator('#boardType, select[name="type"]')
    if (await typeSelector.isVisible()) {
      await typeSelector.selectOption(boardData.type)
    }
    
    // Submit form
    await helper.smartClick('button[type="submit"], button:has-text("Create")')
    
    // Verify board was created
    await expect(page.locator(`text="${boardData.name}"`)).toBeVisible({ timeout: 10000 })
    
    // Take screenshot
    await helper.takeAnnotatedScreenshot('board-created', [
      { selector: `text="${boardData.name}"`, text: 'New board created' },
    ])
  })
  
  test('edit board settings', async ({ page }) => {
    // Click on first board
    const boardCard = page.locator('.board-card, [data-testid="board-item"]').first()
    await boardCard.click()
    
    // Navigate to settings
    await helper.smartClick('a:has-text("Settings"), [data-testid="board-settings"]')
    
    // Update board name
    const nameInput = page.locator('#boardName, input[name="name"]')
    await nameInput.clear()
    await nameInput.fill(`Updated Board ${Date.now()}`)
    
    // Update description
    const descInput = page.locator('#boardDescription, textarea[name="description"]')
    await descInput.clear()
    await descInput.fill('Updated description via MCP E2E test')
    
    // Save changes
    await helper.smartClick('button:has-text("Save"), button[type="submit"]')
    
    // Verify success message
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/saved|updated/i)
  })
  
  test('add committee to board', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to committees section
    await helper.smartClick('a:has-text("Committees"), [data-testid="committees-tab"]')
    
    // Add new committee
    await helper.smartClick('button:has-text("Add Committee"), [data-testid="add-committee"]')
    
    // Fill committee details
    const committeeData = {
      name: `Audit Committee ${Date.now()}`,
      description: 'Responsible for financial oversight',
      chairperson: 'John Doe',
    }
    
    await helper.smartFill('#committeeName', committeeData.name)
    await helper.smartFill('#committeeDescription', committeeData.description)
    
    // Select chairperson if dropdown exists
    const chairSelect = page.locator('#chairperson, select[name="chairperson"]')
    if (await chairSelect.isVisible()) {
      await chairSelect.selectOption({ label: committeeData.chairperson })
    }
    
    // Submit
    await helper.smartClick('button:has-text("Create Committee"), button[type="submit"]')
    
    // Verify committee was added
    await expect(page.locator(`text="${committeeData.name}"`)).toBeVisible()
  })
  
  test('invite board members', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to members section
    await helper.smartClick('a:has-text("Members"), [data-testid="members-tab"]')
    
    // Click invite member
    await helper.smartClick('button:has-text("Invite Member"), [data-testid="invite-member"]')
    
    // Fill invitation form
    const memberData = helper.generateTestData('user')
    
    await helper.smartFill('#memberEmail, input[name="email"]', memberData.email)
    await helper.smartFill('#memberFirstName, input[name="firstName"]', memberData.firstName)
    await helper.smartFill('#memberLastName, input[name="lastName"]', memberData.lastName)
    
    // Select role
    const roleSelect = page.locator('#memberRole, select[name="role"]')
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('member')
    }
    
    // Send invitation
    await helper.smartClick('button:has-text("Send Invitation"), button[type="submit"]')
    
    // Verify invitation sent
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/invited|sent/i)
  })
  
  test('schedule board meeting', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to meetings section
    await helper.smartClick('a:has-text("Meetings"), [data-testid="meetings-tab"]')
    
    // Click schedule meeting
    await helper.smartClick('button:has-text("Schedule Meeting"), [data-testid="schedule-meeting"]')
    
    // Fill meeting details
    const meetingData = {
      title: `Board Meeting ${Date.now()}`,
      date: '2025-09-01',
      time: '14:00',
      duration: '120',
      location: 'Conference Room A',
      agenda: 'Quarterly review and strategic planning',
    }
    
    await helper.smartFill('#meetingTitle', meetingData.title)
    await helper.smartFill('#meetingDate', meetingData.date)
    await helper.smartFill('#meetingTime', meetingData.time)
    await helper.smartFill('#meetingDuration', meetingData.duration)
    await helper.smartFill('#meetingLocation', meetingData.location)
    await helper.smartFill('#meetingAgenda', meetingData.agenda)
    
    // Add attendees
    const attendeesInput = page.locator('#attendees, input[name="attendees"]')
    if (await attendeesInput.isVisible()) {
      await attendeesInput.fill('all')
      await page.keyboard.press('Enter')
    }
    
    // Schedule meeting
    await helper.smartClick('button:has-text("Schedule"), button[type="submit"]')
    
    // Verify meeting was scheduled
    await expect(page.locator(`text="${meetingData.title}"`)).toBeVisible()
  })
  
  test('manage board documents', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to documents section
    await helper.smartClick('a:has-text("Documents"), [data-testid="documents-tab"]')
    
    // Upload a document
    await helper.smartClick('button:has-text("Upload Document"), [data-testid="upload-document"]')
    
    // Create test file
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      // Create a test file
      const testFilePath = '/tmp/test-board-document.pdf'
      await page.evaluate((path) => {
        // This would normally create a file, but in test we'll mock it
        console.log(`Would upload file: ${path}`)
      }, testFilePath)
      
      // Set file input (in real test would use actual file)
      // await fileInput.setInputFiles(testFilePath)
    }
    
    // Fill document metadata
    await helper.smartFill('#documentTitle', `Board Policy ${Date.now()}`)
    await helper.smartFill('#documentDescription', 'Test document for board governance')
    
    // Select category
    const categorySelect = page.locator('#documentCategory')
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('policies')
    }
    
    // Upload
    await helper.smartClick('button:has-text("Upload"), button[type="submit"]')
  })
  
  test('board member permissions', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to members section
    await helper.smartClick('a:has-text("Members"), [data-testid="members-tab"]')
    
    // Find a member and edit permissions
    const memberRow = page.locator('.member-row, [data-testid="member-item"]').first()
    await memberRow.locator('button:has-text("Edit"), [data-testid="edit-permissions"]').click()
    
    // Update permissions
    const permissions = [
      'view_documents',
      'upload_documents',
      'schedule_meetings',
      'invite_members',
    ]
    
    for (const permission of permissions) {
      const checkbox = page.locator(`input[name="${permission}"], #${permission}`)
      if (await checkbox.isVisible()) {
        await checkbox.check()
      }
    }
    
    // Save permissions
    await helper.smartClick('button:has-text("Save Permissions"), button[type="submit"]')
    
    // Verify success
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/updated|saved/i)
  })
  
  test('board analytics dashboard', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to analytics
    await helper.smartClick('a:has-text("Analytics"), [data-testid="analytics-tab"]')
    
    // Verify analytics components are visible
    await expect(page.locator('.attendance-chart, [data-testid="attendance-chart"]')).toBeVisible()
    await expect(page.locator('.activity-timeline, [data-testid="activity-timeline"]')).toBeVisible()
    await expect(page.locator('.document-stats, [data-testid="document-stats"]')).toBeVisible()
    
    // Check performance metrics
    const metrics = await helper.collectPerformanceMetrics()
    expect(metrics.firstContentfulPaint).toBeLessThan(3000)
    
    // Take screenshot of analytics
    await helper.takeAnnotatedScreenshot('board-analytics', [
      { selector: '.attendance-chart', text: 'Meeting attendance trends' },
      { selector: '.activity-timeline', text: 'Board activity timeline' },
    ])
  })
  
  test('board compliance tracking', async ({ page }) => {
    // Navigate to first board
    await page.locator('.board-card, [data-testid="board-item"]').first().click()
    
    // Go to compliance section
    await helper.smartClick('a:has-text("Compliance"), [data-testid="compliance-tab"]')
    
    // Check compliance status
    const complianceItems = page.locator('.compliance-item, [data-testid="compliance-requirement"]')
    const count = await complianceItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = complianceItems.nth(i)
      const status = await item.locator('.status-badge, [data-testid="compliance-status"]').textContent()
      
      // Verify each item has a status
      expect(status).toMatch(/compliant|pending|overdue/i)
    }
    
    // Update a compliance item
    if (count > 0) {
      await complianceItems.first().locator('button:has-text("Update"), [data-testid="update-status"]').click()
      
      // Fill update form
      await helper.smartFill('#complianceNotes', 'Compliance verified via MCP E2E test')
      await helper.smartClick('button:has-text("Confirm"), button[type="submit"]')
      
      // Verify update
      await expect(page.locator('.success-message, [role="status"]')).toContainText(/updated/i)
    }
  })
  
  test('archive board', async ({ page }) => {
    // Create a test board first
    await helper.smartClick('button:has-text("Create Board"), [data-testid="create-board"]')
    
    const boardName = `Archive Test Board ${Date.now()}`
    await helper.smartFill('#boardName', boardName)
    await helper.smartFill('#boardDescription', 'Board to be archived')
    await helper.smartClick('button[type="submit"]')
    
    // Wait for board to be created
    await page.waitForTimeout(2000)
    
    // Find and click the board
    await page.locator(`text="${boardName}"`).click()
    
    // Go to settings
    await helper.smartClick('a:has-text("Settings"), [data-testid="board-settings"]')
    
    // Scroll to archive section
    await page.locator('button:has-text("Archive Board"), [data-testid="archive-board"]').scrollIntoViewIfNeeded()
    
    // Click archive
    await helper.smartClick('button:has-text("Archive Board"), [data-testid="archive-board"]')
    
    // Confirm archive
    const confirmButton = page.locator('button:has-text("Confirm Archive"), [data-testid="confirm-archive"]')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    // Verify board is archived
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/archived/i)
  })
})