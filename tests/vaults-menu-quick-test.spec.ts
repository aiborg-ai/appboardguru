import { test, expect } from '@playwright/test'

test('Quick Vaults menu test', async ({ page }) => {
  const PRODUCTION_URL = 'https://appboardguru.vercel.app'
  
  console.log('Testing if Vaults menu appears in production...')
  
  try {
    await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    console.log(`URL: ${currentUrl}`)
    
    if (currentUrl.includes('/dashboard')) {
      console.log('Dashboard accessible - checking menu items...')
      
      // Check for both Organizations and Vaults
      const organizationsVisible = await page.locator('text="Organizations"').isVisible({ timeout: 2000 })
      const vaultsVisible = await page.locator('text="Vaults"').isVisible({ timeout: 2000 })
      
      console.log(`Organizations menu: ${organizationsVisible ? '✅ Found' : '❌ Not found'}`)
      console.log(`Vaults menu: ${vaultsVisible ? '✅ Found' : '❌ Not found'}`)
      
      if (vaultsVisible) {
        console.log('SUCCESS: Vaults menu is visible!')
        await page.locator('text="Vaults"').click()
        await page.waitForTimeout(2000)
        const vaultsUrl = page.url()
        console.log(`Vaults page URL: ${vaultsUrl}`)
      }
      
      // List all navigation items for debugging
      const navItems = await page.locator('nav a, nav button').allTextContents()
      console.log('All nav items:', navItems.filter(item => item.trim().length > 0))
      
    } else {
      console.log('Dashboard redirect - user not authenticated')
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
})