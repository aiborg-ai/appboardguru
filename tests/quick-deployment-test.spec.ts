import { test, expect } from '@playwright/test'

// Let's test some known working URLs to verify deployment
const POSSIBLE_URLS = [
  'https://appboardguru.vercel.app',
  'https://appboardguru-git-main-h-viks-projects.vercel.app', 
  'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app',
  'https://appboardguru-latest.vercel.app'
]

test.describe('Quick Deployment Verification', () => {
  
  test('Find working production URL', async ({ page }) => {
    console.log('=== Finding Working Production URL ===')
    
    let workingUrl = null
    
    for (const url of POSSIBLE_URLS) {
      try {
        console.log(`Testing URL: ${url}`)
        
        await page.goto(url, { timeout: 10000 })
        
        // Check if page loaded successfully
        const title = await page.title()
        const content = await page.textContent('body')
        
        console.log(`  Title: "${title}"`)
        console.log(`  Content length: ${content?.length || 0} chars`)
        
        if (title && !title.includes('404') && !title.includes('Not Found') && content && content.length > 100) {
          workingUrl = url
          console.log(`  ✅ Working URL found: ${url}`)
          
          // Take screenshot of working deployment
          await page.screenshot({ 
            path: `tests/screenshots/working-deployment.png`, 
            fullPage: true 
          })
          
          // Look for BoardGuru specific content
          const hasRequestAccess = content.toLowerCase().includes('request access')
          const hasBoardGuru = content.toLowerCase().includes('boardguru') || title.toLowerCase().includes('boardguru')
          const hasBoard = content.toLowerCase().includes('board')
          
          console.log(`  - Has "Request Access": ${hasRequestAccess}`)
          console.log(`  - Has "BoardGuru": ${hasBoardGuru}`)
          console.log(`  - Has "Board": ${hasBoard}`)
          
          break
        } else {
          console.log(`  ❌ URL not working: ${title || 'No title'}`)
        }
        
      } catch (error) {
        console.log(`  ❌ URL failed: ${error.message}`)
        continue
      }
    }
    
    if (workingUrl) {
      console.log(`\n🎉 Found working deployment at: ${workingUrl}`)
      
      // Test basic functionality on working URL
      await page.goto(workingUrl)
      await page.waitForLoadState('networkidle')
      
      // Check for registration modal
      const requestButton = page.locator('text="Request Access"').first()
      if (await requestButton.isVisible()) {
        await requestButton.click()
        await page.waitForTimeout(2000)
        
        const modal = page.locator('[role="dialog"], .modal').first()
        const hasModal = await modal.isVisible()
        console.log(`✅ Registration modal works: ${hasModal}`)
        
        await page.screenshot({ 
          path: 'tests/screenshots/working-modal.png', 
          fullPage: true 
        })
      }
      
    } else {
      console.log('\n❌ No working URLs found')
      
      // Take screenshots of all failed attempts
      for (let i = 0; i < POSSIBLE_URLS.length; i++) {
        try {
          await page.goto(POSSIBLE_URLS[i])
          await page.screenshot({ 
            path: `tests/screenshots/failed-url-${i}.png`, 
            fullPage: true 
          })
        } catch (error) {
          console.log(`Could not screenshot ${POSSIBLE_URLS[i]}:`, error.message)
        }
      }
    }
    
    // At least one URL should work
    expect(workingUrl).toBeTruthy()
  })

  test('Test deployment build status', async ({ page }) => {
    console.log('=== Testing Build and Deployment Status ===')
    
    // Test if we can access any static files
    const testUrls = [
      'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app/favicon.ico',
      'https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app/_next/static',
      'https://appboardguru.vercel.app',
      'https://appboardguru-git-main-h-viks-projects.vercel.app'
    ]
    
    let anyWorking = false
    
    for (const url of testUrls) {
      try {
        const response = await page.goto(url, { timeout: 10000 })
        const status = response?.status() || 0
        
        console.log(`${url} - Status: ${status}`)
        
        if (status >= 200 && status < 400) {
          anyWorking = true
          
          if (!url.includes('favicon') && !url.includes('_next')) {
            // This is a main page
            const content = await page.textContent('body')
            const title = await page.title()
            
            console.log(`✅ Working deployment found!`)
            console.log(`   Title: ${title}`)
            console.log(`   Content preview: ${content?.substring(0, 100)}...`)
            
            await page.screenshot({ 
              path: 'tests/screenshots/verified-deployment.png', 
              fullPage: true 
            })
            
            break
          }
        }
        
      } catch (error) {
        console.log(`${url} - Error: ${error.message}`)
      }
    }
    
    console.log(`\nDeployment status: ${anyWorking ? '✅ ONLINE' : '❌ OFFLINE'}`)
    
    // At least static files should be accessible
    expect(anyWorking).toBe(true)
  })

  test.afterAll(async () => {
    console.log('\n=== DEPLOYMENT TEST SUMMARY ===')
    console.log('Tests completed to verify deployment status')
    console.log('Check screenshots in tests/screenshots/ for visual verification')
    console.log('==================================')
  })
})