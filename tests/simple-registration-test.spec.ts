import { test, expect } from '@playwright/test'

test('Simple registration form test with detailed logging', async ({ page }) => {
  // Track all network activity
  const networkLogs: any[] = []
  
  page.on('request', request => {
    networkLogs.push({
      type: 'REQUEST',
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    })
  })

  page.on('response', async response => {
    const responseData = {
      type: 'RESPONSE',
      url: response.url(),
      status: response.status(),
      headers: response.headers()
    }
    
    try {
      const text = await response.text()
      responseData.body = text
    } catch (e) {
      responseData.body = `[Could not read response body: ${e.message}]`
    }
    
    networkLogs.push(responseData)
  })

  // Track console logs
  const consoleLogs: any[] = []
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    })
  })

  // Navigate to homepage
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  console.log('=== STEP 1: Page loaded ===')

  // Click Request Access button
  await page.click('text="Request Access"')
  await page.waitForTimeout(1000)

  console.log('=== STEP 2: Modal opened ===')

  // Fill form with the problematic email
  await page.fill('input[name="fullName"]', 'Hirendra Vikram')
  await page.fill('input[name="email"]', 'hirendra@gmail.com')
  await page.fill('input[name="company"]', 'FIRST HANDS ON AI CIC')
  await page.fill('input[name="position"]', 'gujs')
  await page.fill('textarea[name="message"]', 'gahgsh')

  console.log('=== STEP 3: Form filled ===')

  // Take screenshot before submit
  await page.screenshot({ path: 'tests/screenshots/before-submit.png' })

  // Submit form and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/send-registration-email') && 
      response.request().method() === 'POST'
    ),
    page.click('button[type="submit"]')
  ])

  console.log('=== STEP 4: Form submitted ===')
  console.log('Response status:', response.status())
  console.log('Response headers:', response.headers())

  // Wait a bit for UI to update
  await page.waitForTimeout(2000)

  // Take screenshot after submit
  await page.screenshot({ path: 'tests/screenshots/after-submit.png' })

  console.log('=== STEP 5: Checking UI state ===')

  // Check what's visible on screen
  const isSuccessVisible = await page.isVisible('text="Request Submitted!"')
  const isErrorVisible = await page.isVisible('text="Request Failed"')
  
  console.log('Success message visible:', isSuccessVisible)
  console.log('Error message visible:', isErrorVisible)

  if (isErrorVisible) {
    const errorText = await page.textContent('.bg-red-50')
    console.log('Error message text:', errorText)
  }

  // Get the actual response body
  const responseBody = await response.text()
  console.log('Actual API response body:', responseBody)

  // Try to parse as JSON
  try {
    const jsonResponse = JSON.parse(responseBody)
    console.log('Parsed JSON response:', JSON.stringify(jsonResponse, null, 2))
  } catch (e) {
    console.log('Response is not valid JSON:', e.message)
  }

  console.log('=== FINAL NETWORK LOGS ===')
  networkLogs
    .filter(log => log.url.includes('send-registration-email'))
    .forEach((log, index) => {
      console.log(`Network Log ${index + 1}:`, JSON.stringify(log, null, 2))
    })

  console.log('=== FINAL CONSOLE LOGS ===')
  consoleLogs.forEach((log, index) => {
    console.log(`Console Log ${index + 1}: [${log.type}] ${log.text}`)
  })

  // Final assertion - response should be successful
  expect(response.status()).toBe(200)
  
  // Parse and check response structure
  const jsonResponse = JSON.parse(responseBody)
  expect(jsonResponse.success).toBe(true)
  expect(jsonResponse.data).toBeDefined()
  expect(jsonResponse.data.registrationId).toBeDefined()
})