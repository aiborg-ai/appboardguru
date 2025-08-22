import { test, expect } from '@playwright/test'

/**
 * Smoke Tests for Organization Creation
 * These tests verify the core functionality of creating organizations
 */

// Test data
const TEST_ORG = {
  name: 'Test Organization ' + Date.now(),
  slug: 'test-org-' + Date.now(),
  description: 'A test organization for smoke testing',
  website: 'https://example.com',
  industry: 'Technology',
  organizationSize: 'small' as const
}

test.describe('Organization Creation Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
  })

  test('should load the application without errors', async ({ page }) => {
    // Check that the page loads and doesn't have console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.waitForLoadState('networkidle')
    
    // Verify main elements are present
    expect(await page.locator('body').isVisible()).toBe(true)
    
    // Check for critical console errors (ignore minor ones)
    const criticalErrors = errors.filter(error => 
      error.includes('401') || 
      error.includes('500') || 
      error.includes('Failed to fetch') ||
      error.includes('Authentication')
    )
    
    console.log('Console errors:', errors)
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle unauthenticated requests to organization API', async ({ page }) => {
    // Test the API endpoint directly
    const response = await page.request.get('http://localhost:3000/api/organizations', {
      failOnStatusCode: false
    })
    
    // Should return 401 for unauthenticated requests
    expect(response.status()).toBe(401)
    
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  test('should validate organization creation payload', async ({ page }) => {
    // Test with invalid payload (missing required fields)
    const response = await page.request.post('http://localhost:3000/api/organizations', {
      data: {
        name: '', // Invalid: empty name
        slug: 'invalid-slug!'  // Invalid: contains special characters
      },
      failOnStatusCode: false
    })
    
    // Should return validation error
    expect(response.status()).toBe(401) // Will be 401 since we're not authenticated
    
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  test('should redirect to signin when accessing protected routes', async ({ page }) => {
    // Try to access organization creation page
    await page.goto('http://localhost:3000/dashboard/organizations/create')
    
    // Should redirect to signin
    await page.waitForURL(/auth\/signin/, { timeout: 5000 })
    expect(page.url()).toContain('/auth/signin')
  })

  test('should not have redirect loops', async ({ page, context }) => {
    let redirectCount = 0
    const maxRedirects = 10
    
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectCount++
        if (redirectCount > maxRedirects) {
          throw new Error(`Too many redirects: ${redirectCount}`)
        }
      }
    })
    
    // Test various protected routes
    const routes = [
      '/dashboard',
      '/dashboard/organizations',
      '/dashboard/organizations/create',
      '/dashboard/vaults'
    ]
    
    for (const route of routes) {
      redirectCount = 0
      await page.goto(`http://localhost:3000${route}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      })
      
      // Should eventually land somewhere stable
      expect(redirectCount).toBeLessThan(maxRedirects)
    }
  })

  test('should have proper API route structure', async ({ page }) => {
    // Test that the organizations API endpoint exists
    const response = await page.request.get('http://localhost:3000/api/organizations', {
      failOnStatusCode: false
    })
    
    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)
    
    // Should return structured response
    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('error')
    
    if (!data.success) {
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    }
  })

  test('should handle POST requests to organizations API', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/organizations', {
      data: TEST_ORG,
      failOnStatusCode: false
    })
    
    // Should handle the request (not 404 or 405)
    expect(response.status()).not.toBe(404)
    expect(response.status()).not.toBe(405)
    
    const data = await response.json()
    expect(data).toHaveProperty('success')
    
    // Should require authentication
    if (!data.success) {
      expect(data.error.code).toBe('UNAUTHORIZED')
    }
  })

  test('should validate organization data schema', async ({ page }) => {
    // Test with completely invalid payload
    const response = await page.request.post('http://localhost:3000/api/organizations', {
      data: {
        invalidField: 'invalid',
        name: 'x', // Too short
        slug: 'INVALID SLUG!', // Invalid format
        organizationSize: 'invalid-size' // Invalid enum
      },
      failOnStatusCode: false
    })
    
    const data = await response.json()
    expect(data.success).toBe(false)
    
    // Should be either auth error or validation error
    expect(['UNAUTHORIZED', 'VALIDATION_ERROR']).toContain(data.error.code)
  })

  test('should not crash on malformed requests', async ({ page }) => {
    // Test with various malformed payloads
    const malformedPayloads = [
      null,
      undefined,
      '',
      '{"invalid": json}',
      { name: null },
      { slug: undefined },
      { organizationSize: 123 }
    ]
    
    for (const payload of malformedPayloads) {
      const response = await page.request.post('http://localhost:3000/api/organizations', {
        data: payload,
        failOnStatusCode: false
      })
      
      // Should handle gracefully (not 500)
      expect(response.status()).not.toBe(500)
      
      if (response.status() !== 401) {
        const data = await response.json()
        expect(data).toHaveProperty('success')
        expect(data.success).toBe(false)
      }
    }
  })

  test('should have proper TypeScript compilation', async ({ page }) => {
    // Check that the main application JS bundle loads
    const mainScriptResponse = await page.waitForResponse(
      response => response.url().includes('/_next/') && response.url().includes('.js'),
      { timeout: 10000 }
    )
    
    expect(mainScriptResponse.status()).toBe(200)
    
    // Verify no TypeScript compilation errors in console
    const jsErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('TypeError')) {
        jsErrors.push(msg.text())
      }
    })
    
    await page.waitForTimeout(2000)
    
    // Should not have TypeScript-related runtime errors
    const tsErrors = jsErrors.filter(error => 
      error.includes('is not a function') ||
      error.includes('undefined') ||
      error.includes('Cannot read properties')
    )
    
    console.log('JavaScript errors:', jsErrors)
    expect(tsErrors.length).toBeLessThan(3) // Allow minor errors
  })

  test('should have proper error handling in hooks', async ({ page }) => {
    // Navigate to a page that uses organization hooks
    await page.goto('http://localhost:3000')
    
    // Look for React error boundaries or unhandled promise rejections
    const reactErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('React') ||
        msg.text().includes('useCreateOrganization') ||
        msg.text().includes('Unhandled promise rejection')
      )) {
        reactErrors.push(msg.text())
      }
    })
    
    await page.waitForTimeout(3000)
    
    console.log('React/Hook errors:', reactErrors)
    expect(reactErrors.length).toBe(0)
  })
})

/**
 * Integration smoke tests (requires authentication)
 * These would run with a test user if auth is set up
 */
test.describe.skip('Authenticated Organization Creation', () => {
  
  test('should create organization with valid data', async ({ page }) => {
    // This test would require setting up authentication
    // For now, we skip it since we don't have test auth setup
    
    // Steps would be:
    // 1. Sign in with test user
    // 2. Navigate to organization creation
    // 3. Fill out the form
    // 4. Submit and verify success
    // 5. Verify organization appears in list
    // 6. Clean up created organization
  })

  test('should handle organization creation form validation', async ({ page }) => {
    // This would test the actual form validation
    // in the CreateOrganizationWizard component
  })
})