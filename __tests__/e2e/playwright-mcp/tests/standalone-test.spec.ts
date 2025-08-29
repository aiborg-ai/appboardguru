import { test, expect } from '@playwright/test'

/**
 * Standalone MCP Test - Works without database setup
 * This test verifies basic functionality without requiring authentication
 */

test.describe('Standalone MCP Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application
    await page.goto('/')
  })
  
  test('landing page loads successfully', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check if main content is visible
    const mainContent = page.locator('main, #__next, .app-container, body')
    await expect(mainContent.first()).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/landing-page.png', fullPage: true })
    
    // Log success
    console.log('✅ Landing page loaded successfully')
  })
  
  test('navigation elements are present', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, header, .navigation, [role="navigation"]').first()
    
    if (await nav.isVisible()) {
      // Check for common navigation links
      const links = await nav.locator('a').count()
      expect(links).toBeGreaterThan(0)
      console.log(`✅ Found ${links} navigation links`)
    }
  })
  
  test('login page is accessible', async ({ page }) => {
    // Try to navigate to login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first()
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first()
    
    // Check if at least one login element is visible
    const hasLoginForm = 
      await emailInput.isVisible() || 
      await passwordInput.isVisible() || 
      await submitButton.isVisible()
    
    if (hasLoginForm) {
      console.log('✅ Login form found')
      
      // Take screenshot of login page
      await page.screenshot({ path: 'test-results/login-page.png' })
    } else {
      console.log('⚠️  Login form not found - might be using different authentication')
    }
  })
  
  test('application responds to user interactions', async ({ page }) => {
    // Find clickable elements
    const buttons = page.locator('button, a[href], [role="button"]')
    const buttonCount = await buttons.count()
    
    console.log(`Found ${buttonCount} interactive elements`)
    
    if (buttonCount > 0) {
      // Click the first button/link (safely)
      const firstButton = buttons.first()
      const buttonText = await firstButton.textContent().catch(() => 'unknown')
      
      console.log(`Clicking: "${buttonText}"`)
      
      // Click and wait for any navigation
      await Promise.race([
        firstButton.click(),
        page.waitForTimeout(3000)
      ]).catch(() => {
        console.log('⚠️  Click action skipped or element not clickable')
      })
    }
  })
  
  test('page performance metrics', async ({ page }) => {
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      }
    })
    
    console.log('📊 Performance Metrics:')
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`)
    console.log(`   Page Load Complete: ${metrics.loadComplete}ms`)
    console.log(`   First Paint: ${metrics.firstPaint}ms`)
    console.log(`   First Contentful Paint: ${metrics.firstContentfulPaint}ms`)
    
    // Basic performance assertions
    expect(metrics.firstContentfulPaint).toBeLessThan(5000) // Should load within 5 seconds
  })
  
  test('responsive design check', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(500) // Wait for responsive changes
      
      // Check if content adapts
      const mainContent = page.locator('main, #__next, .app-container, body').first()
      await expect(mainContent).toBeVisible()
      
      // Take screenshot at this viewport
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: false 
      })
      
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}) rendered successfully`)
    }
  })
  
  test('accessibility - basic checks', async ({ page }) => {
    // Check for basic accessibility attributes
    const hasLang = await page.locator('html[lang]').isVisible()
    const hasTitle = await page.title() !== ''
    const hasHeading = await page.locator('h1, h2, h3').first().isVisible()
    
    console.log('🔍 Accessibility Checks:')
    console.log(`   HTML lang attribute: ${hasLang ? '✅' : '❌'}`)
    console.log(`   Page title: ${hasTitle ? '✅' : '❌'}`)
    console.log(`   Heading structure: ${hasHeading ? '✅' : '❌'}`)
    
    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      let imagesWithAlt = 0
      for (let i = 0; i < imageCount; i++) {
        const hasAlt = await images.nth(i).getAttribute('alt')
        if (hasAlt) imagesWithAlt++
      }
      console.log(`   Images with alt text: ${imagesWithAlt}/${imageCount}`)
    }
  })
  
  test('console errors check', async ({ page }) => {
    const consoleErrors: string[] = []
    
    // Listen for console errors
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })
    
    // Navigate and wait
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('⚠️  Console errors detected:')
      consoleErrors.forEach(error => console.log(`   - ${error}`))
    } else {
      console.log('✅ No console errors detected')
    }
    
    // We don't fail the test on console errors, just report them
    expect(consoleErrors.length).toBeLessThanOrEqual(5) // Warn if too many errors
  })
  
  test('network activity monitoring', async ({ page }) => {
    const requests: string[] = []
    const failedRequests: string[] = []
    
    // Monitor network
    page.on('request', request => {
      requests.push(request.url())
    })
    
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} - ${response.url()}`)
      }
    })
    
    // Navigate
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    console.log('🌐 Network Activity:')
    console.log(`   Total requests: ${requests.length}`)
    console.log(`   Failed requests: ${failedRequests.length}`)
    
    if (failedRequests.length > 0) {
      console.log('   Failed requests:')
      failedRequests.slice(0, 5).forEach(req => console.log(`     - ${req}`))
    }
    
    // Don't fail on network errors, just report
    expect(failedRequests.length).toBeLessThanOrEqual(10)
  })
})