import { test, expect } from '@playwright/test'

test.describe('Registration Form Debugging', () => {
  test('Debug registration form submission', async ({ page }) => {
    // Enable network request logging
    page.on('request', request => {
      console.log(`→ ${request.method()} ${request.url()}`)
      if (request.method() === 'POST' && request.url().includes('send-registration-email')) {
        console.log('Registration request body:', request.postData())
      }
    })

    page.on('response', response => {
      console.log(`← ${response.status()} ${response.url()}`)
      if (response.url().includes('send-registration-email')) {
        response.text().then(text => {
          console.log('Registration response:', text)
        }).catch(err => {
          console.log('Could not read response text:', err)
        })
      }
    })

    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]:`, msg.text())
    })

    // Navigate to the homepage
    console.log('Navigating to homepage...')
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/homepage.png' })
    
    // Look for the registration form trigger
    console.log('Looking for registration form trigger...')
    
    // Try different selectors that might open the registration form
    const possibleTriggers = [
      'text="Request Access"',
      'text="Request access"', 
      '[data-testid="request-access"]',
      'button:has-text("Request")',
      'a:has-text("Request")',
      '.btn:has-text("Request")'
    ]
    
    let formOpened = false
    
    for (const trigger of possibleTriggers) {
      try {
        console.log(`Trying trigger: ${trigger}`)
        const element = page.locator(trigger).first()
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found trigger: ${trigger}`)
          await element.click()
          await page.waitForTimeout(1000) // Wait for modal/form to appear
          
          // Check if form appeared
          const formSelectors = [
            'text="Full Name"',
            'text="Email Address"',
            '[placeholder*="email"]',
            'input[type="email"]'
          ]
          
          for (const formSelector of formSelectors) {
            if (await page.locator(formSelector).isVisible({ timeout: 2000 })) {
              console.log('Registration form is now visible!')
              formOpened = true
              break
            }
          }
          
          if (formOpened) break
        }
      } catch (error) {
        console.log(`Trigger ${trigger} not found or not clickable`)
      }
    }
    
    if (!formOpened) {
      console.log('Could not open registration form. Taking screenshot...')
      await page.screenshot({ path: 'tests/screenshots/form-not-found.png' })
      
      // List all visible text elements for debugging
      const textElements = await page.locator('text=Request').allTextContents()
      console.log('Found text elements containing "Request":', textElements)
      
      throw new Error('Could not find or open registration form')
    }
    
    // Take screenshot of opened form
    await page.screenshot({ path: 'tests/screenshots/form-opened.png' })
    
    // Fill the form
    console.log('Filling registration form...')
    
    const testData = {
      fullName: 'Test User Debug',
      email: `debug-test-${Date.now()}@example.com`, // Use unique email
      company: 'Test Company',
      position: 'Test Position',
      message: 'This is a debug test'
    }
    
    console.log('Test data:', testData)
    
    // Fill form fields - try multiple selectors for each field
    const fieldMappings = [
      { 
        name: 'Full Name', 
        value: testData.fullName,
        selectors: ['input[name="fullName"]', '[placeholder*="full name" i]', '[placeholder*="name" i]', 'input[type="text"]:first']
      },
      { 
        name: 'Email', 
        value: testData.email,
        selectors: ['input[name="email"]', 'input[type="email"]', '[placeholder*="email" i]']
      },
      { 
        name: 'Company', 
        value: testData.company,
        selectors: ['input[name="company"]', '[placeholder*="company" i]']
      },
      { 
        name: 'Position', 
        value: testData.position,
        selectors: ['input[name="position"]', '[placeholder*="position" i]', '[placeholder*="title" i]']
      },
      { 
        name: 'Message', 
        value: testData.message,
        selectors: ['textarea[name="message"]', 'textarea', '[placeholder*="message" i]']
      }
    ]
    
    for (const field of fieldMappings) {
      console.log(`Filling ${field.name}...`)
      let filled = false
      
      for (const selector of field.selectors) {
        try {
          const element = page.locator(selector).first()
          if (await element.isVisible({ timeout: 2000 })) {
            await element.fill(field.value)
            console.log(`✅ Filled ${field.name} using selector: ${selector}`)
            filled = true
            break
          }
        } catch (error) {
          console.log(`Failed to fill ${field.name} with selector ${selector}:`, error.message)
        }
      }
      
      if (!filled) {
        console.log(`❌ Could not fill ${field.name}`)
      }
    }
    
    // Take screenshot before submission
    await page.screenshot({ path: 'tests/screenshots/form-filled.png' })
    
    // Submit the form
    console.log('Submitting form...')
    
    const submitSelectors = [
      'button[type="submit"]',
      'text="Submit Request"',
      'text="Submit"',
      '.btn:has-text("Submit")',
      'button:has-text("Request")'
    ]
    
    let submitted = false
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first()
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`Found submit button: ${selector}`)
          await button.click()
          submitted = true
          break
        }
      } catch (error) {
        console.log(`Submit button ${selector} not found or not clickable`)
      }
    }
    
    if (!submitted) {
      console.log('Could not find submit button. Taking screenshot...')
      await page.screenshot({ path: 'tests/screenshots/no-submit-button.png' })
      throw new Error('Could not find submit button')
    }
    
    // Wait for response
    console.log('Waiting for form response...')
    await page.waitForTimeout(5000) // Wait for API response
    
    // Take screenshot after submission
    await page.screenshot({ path: 'tests/screenshots/after-submit.png' })
    
    // Check for success or error messages
    const possibleMessages = [
      'text="Request Failed"',
      'text="Success"',
      'text="Thank you"',
      'text="Error"',
      'text="Failed"',
      '.error',
      '.success',
      '.alert'
    ]
    
    console.log('Checking for response messages...')
    for (const messageSelector of possibleMessages) {
      try {
        const message = page.locator(messageSelector).first()
        if (await message.isVisible({ timeout: 2000 })) {
          const text = await message.textContent()
          console.log(`Found message: ${messageSelector} = "${text}"`)
        }
      } catch (error) {
        // Message not found, continue
      }
    }
    
    // Get all text content for debugging
    const bodyText = await page.locator('body').textContent()
    console.log('Page content after submission (first 500 chars):', bodyText?.substring(0, 500))
    
    console.log('Test completed. Check screenshots in tests/screenshots/ directory.')
  })

  test('Test API endpoint directly', async ({ page }) => {
    console.log('Testing API endpoint directly...')
    
    const testData = {
      fullName: 'API Test User',
      email: `api-test-${Date.now()}@example.com`,
      company: 'API Test Company',
      position: 'API Test Position',
      message: 'Direct API test'
    }
    
    // Go to any page first to establish session
    await page.goto('/')
    
    // Make direct API call
    const response = await page.evaluate(async (data) => {
      const response = await fetch('/api/send-registration-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const text = await response.text()
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text
      }
    }, testData)
    
    console.log('Direct API response:')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers:', response.headers)
    console.log('Body:', response.body)
    
    // Try to parse as JSON
    try {
      const jsonBody = JSON.parse(response.body)
      console.log('Parsed JSON response:', JSON.stringify(jsonBody, null, 2))
    } catch (error) {
      console.log('Response is not JSON:', error.message)
    }
  })
})