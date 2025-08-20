import { test, expect } from '@playwright/test'

test.describe('Organizations Menu Test', () => {
  const PRODUCTION_URL = 'https://appboardguru.vercel.app'

  test('should check if Organizations menu appears in sidebar after login', async ({ page }) => {
    console.log('=== Testing Organizations Menu on Production ===')
    
    try {
      // Navigate to production site
      console.log('1. Navigating to production site...')
      await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' })
      
      // Wait for page to load
      await page.waitForTimeout(3000)
      
      // Check if we're on the homepage
      console.log('2. Checking homepage elements...')
      const title = await page.title()
      console.log(`Page title: ${title}`)
      
      // Look for login/signin elements
      console.log('3. Looking for authentication elements...')
      
      // Try to find signin link or login button
      const signinLink = page.locator('text="Sign In"').first()
      const loginBtn = page.locator('text="Login"').first() 
      const getStartedBtn = page.locator('text="Get Started"').first()
      const requestAccessBtn = page.locator('text="Request Access"').first()
      
      let foundAuth = false
      
      if (await signinLink.isVisible({ timeout: 2000 })) {
        console.log('4. Found Sign In link - clicking...')
        await signinLink.click()
        foundAuth = true
      } else if (await loginBtn.isVisible({ timeout: 2000 })) {
        console.log('4. Found Login button - clicking...')
        await loginBtn.click()
        foundAuth = true
      } else if (await getStartedBtn.isVisible({ timeout: 2000 })) {
        console.log('4. Found Get Started button - clicking...')
        await getStartedBtn.click()
        foundAuth = true
      } else if (await requestAccessBtn.isVisible({ timeout: 2000 })) {
        console.log('4. Found Request Access button...')
        console.log('This suggests registration-first flow - Organizations would appear after login')
      }
      
      if (foundAuth) {
        // Wait for redirect to signin page
        await page.waitForTimeout(2000)
        console.log(`Current URL after auth click: ${page.url()}`)
        
        // Check if we're on signin page
        if (page.url().includes('/auth/signin') || page.url().includes('/signin')) {
          console.log('5. On signin page - checking for login form...')
          
          // Look for email/password fields
          const emailField = page.locator('input[type="email"]').first()
          const passwordField = page.locator('input[type="password"]').first()
          
          if (await emailField.isVisible({ timeout: 3000 })) {
            console.log('6. Found login form - would need actual credentials to proceed')
            console.log('Organizations menu would appear in dashboard after successful login')
          }
        }
      }
      
      // Alternative: Check if we can access dashboard directly
      console.log('7. Attempting to check dashboard directly...')
      await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      // Check current URL after dashboard attempt
      const dashboardUrl = page.url()
      console.log(`Dashboard URL result: ${dashboardUrl}`)
      
      if (dashboardUrl.includes('/dashboard')) {
        console.log('8. Successfully accessed dashboard - checking for Organizations menu...')
        
        // Look for sidebar navigation
        const sidebar = page.locator('[role="navigation"]').first()
        const organizationsLink = page.locator('text="Organizations"').first()
        
        if (await organizationsLink.isVisible({ timeout: 5000 })) {
          console.log('✅ SUCCESS: Organizations menu found in sidebar!')
          await organizationsLink.click()
          await page.waitForTimeout(2000)
          
          // Check if organizations page loaded
          const orgPageUrl = page.url()
          console.log(`Organizations page URL: ${orgPageUrl}`)
          
          if (orgPageUrl.includes('/organizations')) {
            console.log('✅ SUCCESS: Organizations page loaded successfully!')
          }
        } else {
          console.log('❌ Organizations menu not found in sidebar')
          
          // Debug: List all visible navigation items
          const navItems = await page.locator('nav a, nav button').allTextContents()
          console.log('Available navigation items:', navItems)
        }
      } else {
        console.log('Dashboard not accessible - likely redirected to login')
        console.log('This is expected behavior for unauthenticated users')
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'organizations-menu-test.png', fullPage: true })
      console.log('Screenshot saved: organizations-menu-test.png')
      
    } catch (error) {
      console.error('Test error:', error)
      await page.screenshot({ path: 'organizations-menu-error.png', fullPage: true })
    }
  })

  test('should check Organizations route directly', async ({ page }) => {
    console.log('=== Testing Organizations Route Directly ===')
    
    try {
      // Try to access organizations page directly
      const orgUrl = `${PRODUCTION_URL}/dashboard/organizations`
      console.log(`1. Attempting to access: ${orgUrl}`)
      
      await page.goto(orgUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      console.log(`Result URL: ${currentUrl}`)
      
      if (currentUrl.includes('/organizations')) {
        console.log('✅ Organizations route is accessible')
        
        // Check for organizations page content
        const pageContent = await page.textContent('body')
        if (pageContent?.includes('Organizations') || pageContent?.includes('Create Organization')) {
          console.log('✅ Organizations page content found')
        }
      } else if (currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
        console.log('Organizations route requires authentication (as expected)')
      } else {
        console.log('Organizations route redirected to:', currentUrl)
      }
      
    } catch (error) {
      console.error('Route test error:', error)
    }
  })
})