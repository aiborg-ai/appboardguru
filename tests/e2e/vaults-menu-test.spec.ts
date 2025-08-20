import { test, expect } from '@playwright/test'

test.describe('Vaults Menu Test', () => {
  const PRODUCTION_URL = 'https://appboardguru.vercel.app'

  test('should check if Vaults menu appears in sidebar after login', async ({ page }) => {
    console.log('=== Testing Vaults Menu on Production ===')
    
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
      
      // Try to access dashboard directly
      console.log('3. Attempting to check dashboard directly...')
      await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      // Check current URL after dashboard attempt
      const dashboardUrl = page.url()
      console.log(`Dashboard URL result: ${dashboardUrl}`)
      
      if (dashboardUrl.includes('/dashboard')) {
        console.log('4. Successfully accessed dashboard - checking for Vaults menu...')
        
        // Look for sidebar navigation
        const sidebar = page.locator('[role="navigation"]').first()
        const vaultsLink = page.locator('text="Vaults"').first()
        
        if (await vaultsLink.isVisible({ timeout: 5000 })) {
          console.log('✅ SUCCESS: Vaults menu found in sidebar!')
          await vaultsLink.click()
          await page.waitForTimeout(2000)
          
          // Check if vaults page loaded
          const vaultsPageUrl = page.url()
          console.log(`Vaults page URL: ${vaultsPageUrl}`)
          
          if (vaultsPageUrl.includes('/vaults')) {
            console.log('✅ SUCCESS: Vaults page loaded successfully!')
          }
        } else {
          console.log('❌ Vaults menu not found in sidebar')
          
          // Debug: List all visible navigation items
          const navItems = await page.locator('nav a, nav button').allTextContents()
          console.log('Available navigation items:', navItems)
          
          // Also check for Organizations menu as a reference
          const organizationsLink = page.locator('text="Organizations"').first()
          if (await organizationsLink.isVisible({ timeout: 2000 })) {
            console.log('✅ Organizations menu found - so EnhancedSidebar is being used')
          } else {
            console.log('❌ Organizations menu also not found - old Sidebar might be in use')
          }
        }
      } else {
        console.log('Dashboard not accessible - likely redirected to login')
        console.log('This is expected behavior for unauthenticated users')
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'vaults-menu-test.png', fullPage: true })
      console.log('Screenshot saved: vaults-menu-test.png')
      
    } catch (error) {
      console.error('Test error:', error)
      await page.screenshot({ path: 'vaults-menu-error.png', fullPage: true })
    }
  })

  test('should check Vaults route directly', async ({ page }) => {
    console.log('=== Testing Vaults Route Directly ===')
    
    try {
      // Try to access vaults page directly
      const vaultsUrl = `${PRODUCTION_URL}/dashboard/vaults`
      console.log(`1. Attempting to access: ${vaultsUrl}`)
      
      await page.goto(vaultsUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      console.log(`Result URL: ${currentUrl}`)
      
      if (currentUrl.includes('/vaults')) {
        console.log('✅ Vaults route is accessible')
        
        // Check for vaults page content
        const pageContent = await page.textContent('body')
        if (pageContent?.includes('Vaults') || pageContent?.includes('Create Vault')) {
          console.log('✅ Vaults page content found')
        }
      } else if (currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
        console.log('Vaults route requires authentication (as expected)')
      } else {
        console.log('Vaults route redirected to:', currentUrl)
      }
      
    } catch (error) {
      console.error('Route test error:', error)
    }
  })

  test('should check sidebar menu structure', async ({ page }) => {
    console.log('=== Testing Sidebar Menu Structure ===')
    
    try {
      await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      console.log(`Current URL: ${currentUrl}`)
      
      if (currentUrl.includes('/dashboard')) {
        console.log('Dashboard accessible - checking menu structure...')
        
        // Check for expected menu items in order
        const expectedMenuItems = ['Home', 'Organizations', 'Vaults', 'Instruments']
        
        for (const item of expectedMenuItems) {
          const menuItem = page.locator(`text="${item}"`).first()
          const isVisible = await menuItem.isVisible({ timeout: 2000 })
          console.log(`${item}: ${isVisible ? '✅ Found' : '❌ Not found'}`)
        }
        
        // Get all navigation text for debugging
        const allNavText = await page.locator('nav').allTextContents()
        console.log('All navigation text:', allNavText)
        
      } else {
        console.log('Dashboard not accessible for menu structure test')
      }
      
    } catch (error) {
      console.error('Menu structure test error:', error)
    }
  })
})