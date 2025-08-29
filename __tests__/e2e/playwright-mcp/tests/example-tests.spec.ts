import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'

/**
 * Example Tests - Learn Playwright MCP by Example
 * 
 * This file contains common testing patterns you can copy and modify
 * for your own tests. Each test is well-commented to explain what it does.
 */

test.describe('Example Tests - Common Patterns', () => {
  
  // ========================================
  // BASIC TESTS
  // ========================================
  
  test('1. Simple page load test', async ({ page }) => {
    // Navigate to a page
    await page.goto('/')
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check if an element is visible
    const heading = page.locator('h1, h2, h3').first()
    await expect(heading).toBeVisible()
    
    // Get and log the page title
    const title = await page.title()
    console.log(`Page title: ${title}`)
  })
  
  test('2. Clicking buttons and links', async ({ page }) => {
    await page.goto('/')
    
    // Click by text
    await page.click('text=Get Started')
    
    // Click by role
    await page.getByRole('button', { name: 'Submit' }).click()
    
    // Click by test ID (best practice)
    await page.locator('[data-testid="submit-button"]').click()
    
    // Click with error handling
    try {
      await page.click('button.submit', { timeout: 5000 })
    } catch (error) {
      console.log('Button not found, skipping...')
    }
  })
  
  test('3. Filling and submitting forms', async ({ page }) => {
    await page.goto('/contact')
    
    // Fill text input
    await page.fill('#name', 'John Doe')
    
    // Fill email
    await page.fill('input[type="email"]', 'john@example.com')
    
    // Fill textarea
    await page.fill('textarea', 'This is my message')
    
    // Select dropdown option
    await page.selectOption('select#country', 'USA')
    
    // Check checkbox
    await page.check('#agree-terms')
    
    // Choose radio button
    await page.click('input[type="radio"][value="yes"]')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible()
  })
  
  // ========================================
  // USING MCP HELPER
  // ========================================
  
  test('4. Smart actions with MCP Helper', async ({ page, context }) => {
    const helper = new MCPTestHelper(page, context)
    
    await page.goto('/')
    
    // Smart click - tries multiple strategies to find element
    await helper.smartClick('Login')
    
    // Smart fill - fills and validates the input
    await helper.smartFill('#email', 'test@example.com')
    
    // Generate realistic test data
    const user = helper.generateTestData('user')
    await helper.smartFill('#firstName', user.firstName)
    await helper.smartFill('#lastName', user.lastName)
    await helper.smartFill('#email', user.email)
    
    // Take annotated screenshot
    await helper.takeAnnotatedScreenshot('form-filled', [
      { selector: '#email', text: 'Email field' },
      { selector: 'button[type="submit"]', text: 'Submit button' }
    ])
  })
  
  // ========================================
  // WAITING AND ASSERTIONS
  // ========================================
  
  test('5. Waiting for elements and conditions', async ({ page }) => {
    await page.goto('/')
    
    // Wait for element to appear
    await page.waitForSelector('.content', { state: 'visible' })
    
    // Wait for element to disappear
    await page.waitForSelector('.loading', { state: 'hidden' })
    
    // Wait for specific text
    await page.waitForFunction(
      text => document.body.innerText.includes(text),
      'Welcome'
    )
    
    // Wait for URL change
    await page.click('a[href="/about"]')
    await page.waitForURL('**/about')
    
    // Wait with timeout
    await page.waitForSelector('.slow-element', { 
      timeout: 10000  // 10 seconds
    })
    
    // Custom wait condition
    await page.waitForFunction(() => {
      const element = document.querySelector('.counter')
      return element && parseInt(element.textContent) > 5
    })
  })
  
  test('6. Common assertions', async ({ page }) => {
    await page.goto('/')
    
    // Check visibility
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('.hidden')).toBeHidden()
    
    // Check text content
    await expect(page.locator('h1')).toHaveText('Welcome')
    await expect(page.locator('p')).toContainText('Hello')
    
    // Check element count
    await expect(page.locator('.item')).toHaveCount(5)
    
    // Check URL and title
    await expect(page).toHaveURL('http://localhost:3001/')
    await expect(page).toHaveTitle(/AppBoardGuru/)
    
    // Check input values
    await expect(page.locator('#email')).toHaveValue('test@example.com')
    
    // Check attributes
    await expect(page.locator('button')).toBeEnabled()
    await expect(page.locator('input[readonly]')).toBeDisabled()
    await expect(page.locator('a')).toHaveAttribute('href', '/about')
    
    // Check CSS properties
    await expect(page.locator('.error')).toHaveCSS('color', 'rgb(255, 0, 0)')
  })
  
  // ========================================
  // ADVANCED PATTERNS
  // ========================================
  
  test('7. Handling popups and dialogs', async ({ page }) => {
    await page.goto('/')
    
    // Handle alert dialog
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`)
      await dialog.accept()  // or dialog.dismiss()
    })
    
    // Trigger an alert
    await page.click('button#show-alert')
    
    // Handle new window/tab
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('a[target="_blank"]')
    ])
    await newPage.waitForLoadState()
    console.log(`New page URL: ${newPage.url()}`)
  })
  
  test('8. File upload and download', async ({ page }) => {
    await page.goto('/upload')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('/tmp/test-file.pdf')
    
    // Upload multiple files
    await fileInput.setInputFiles([
      '/tmp/file1.pdf',
      '/tmp/file2.pdf'
    ])
    
    // Handle download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button#download')
    ])
    
    // Save download
    const path = await download.path()
    console.log(`Downloaded file: ${path}`)
  })
  
  test('9. API testing within browser tests', async ({ page, request }) => {
    // Make API call
    const response = await request.get('/api/users')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('users')
    
    // Use API data in browser test
    await page.goto('/')
    await page.evaluate((users) => {
      console.log('Users from API:', users)
    }, data.users)
    
    // Test form submission via API
    const createResponse = await request.post('/api/users', {
      data: {
        name: 'Test User',
        email: 'test@example.com'
      }
    })
    expect(createResponse.status()).toBe(201)
  })
  
  test('10. Performance and accessibility testing', async ({ page, context }) => {
    const helper = new MCPTestHelper(page, context)
    
    await page.goto('/')
    
    // Collect performance metrics
    const metrics = await helper.collectPerformanceMetrics()
    console.log('Performance metrics:', metrics)
    
    // Assert performance
    expect(metrics.firstContentfulPaint).toBeLessThan(3000)
    expect(metrics.domContentLoaded).toBeLessThan(2000)
    
    // Check accessibility
    const a11yResults = await helper.checkAccessibility()
    
    // Log any violations
    if (a11yResults.violations?.length > 0) {
      console.log('Accessibility violations found:')
      a11yResults.violations.forEach(v => {
        console.log(`- ${v.description}`)
      })
    }
  })
  
  // ========================================
  // MOBILE AND RESPONSIVE TESTING
  // ========================================
  
  test('11. Responsive design testing', async ({ page }) => {
    await page.goto('/')
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('.desktop-menu')).toBeVisible()
    await expect(page.locator('.mobile-menu')).toBeHidden()
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({ path: 'tablet-view.png' })
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('.mobile-menu')).toBeVisible()
    await expect(page.locator('.desktop-menu')).toBeHidden()
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 })
    await page.screenshot({ path: 'mobile-landscape.png' })
  })
  
  // ========================================
  // DEBUGGING HELPERS
  // ========================================
  
  test('12. Debugging techniques', async ({ page }) => {
    await page.goto('/')
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true })
    
    // Log console messages
    page.on('console', msg => console.log('Browser console:', msg.text()))
    
    // Log network requests
    page.on('request', request => {
      console.log('Request:', request.method(), request.url())
    })
    
    // Log network responses
    page.on('response', response => {
      console.log('Response:', response.status(), response.url())
    })
    
    // Pause test execution (when running with --debug)
    // await page.pause()
    
    // Add custom wait
    await page.waitForTimeout(2000)  // Wait 2 seconds
    
    // Get page HTML for debugging
    const html = await page.content()
    console.log('Page HTML length:', html.length)
    
    // Evaluate JavaScript in browser
    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 100)
      }
    })
    console.log('Page info:', result)
  })
  
  // ========================================
  // DATA-DRIVEN TESTING
  // ========================================
  
  const testCases = [
    { input: 'test@example.com', valid: true },
    { input: 'invalid-email', valid: false },
    { input: 'user@domain.co', valid: true },
  ]
  
  testCases.forEach(({ input, valid }) => {
    test(`13. Email validation: ${input} should be ${valid ? 'valid' : 'invalid'}`, async ({ page }) => {
      await page.goto('/signup')
      
      await page.fill('#email', input)
      await page.click('button[type="submit"]')
      
      if (valid) {
        await expect(page.locator('.success')).toBeVisible()
      } else {
        await expect(page.locator('.error')).toBeVisible()
      }
    })
  })
  
  // ========================================
  // KEYBOARD AND MOUSE ACTIONS
  // ========================================
  
  test('14. Keyboard and mouse interactions', async ({ page }) => {
    await page.goto('/')
    
    // Keyboard actions
    await page.keyboard.press('Tab')  // Tab navigation
    await page.keyboard.press('Enter')  // Submit
    await page.keyboard.press('Escape')  // Close modal
    await page.keyboard.type('Hello World')  // Type text
    
    // Keyboard shortcuts
    await page.keyboard.press('Control+A')  // Select all
    await page.keyboard.press('Control+C')  // Copy
    await page.keyboard.press('Control+V')  // Paste
    
    // Mouse actions
    await page.mouse.move(100, 100)  // Move mouse
    await page.mouse.click(100, 100)  // Click at coordinates
    await page.mouse.dblclick(100, 100)  // Double click
    await page.mouse.down()  // Mouse down
    await page.mouse.up()  // Mouse up
    
    // Hover
    await page.hover('.menu-item')
    
    // Drag and drop
    await page.dragAndDrop('#source', '#target')
    
    // Scroll
    await page.mouse.wheel(0, 100)  // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))  // Scroll to bottom
  })
  
  // ========================================
  // ERROR HANDLING
  // ========================================
  
  test('15. Graceful error handling', async ({ page }) => {
    try {
      await page.goto('/possibly-broken-page', { 
        waitUntil: 'networkidle',
        timeout: 5000 
      })
    } catch (error) {
      console.log('Page failed to load, continuing with fallback...')
      await page.goto('/')
    }
    
    // Handle optional elements
    const optionalElement = page.locator('.may-not-exist')
    if (await optionalElement.isVisible()) {
      await optionalElement.click()
    } else {
      console.log('Optional element not found, skipping...')
    }
    
    // Retry logic
    let retries = 3
    while (retries > 0) {
      try {
        await page.click('.flaky-button')
        break  // Success, exit loop
      } catch (error) {
        retries--
        if (retries === 0) throw error
        await page.waitForTimeout(1000)  // Wait before retry
      }
    }
  })
})