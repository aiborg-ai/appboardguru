import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Vercel/Supabase Environment Testing
 * 
 * This configuration is designed to test against the deployed application
 * on Vercel with Supabase backend, using existing test data.
 * 
 * No local database setup required!
 */
export default defineConfig({
  testDir: './__tests__/e2e/vercel-tests',
  
  // Test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail on CI if test.only is left in
  forbidOnly: !!process.env.CI,
  
  // Retry on CI
  retries: process.env.CI ? 2 : 0,
  
  // Number of workers
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-vercel' }],
    ['json', { outputFile: 'test-results/vercel-results.json' }],
  ],
  
  // NO global setup - we're using existing Supabase data
  // globalSetup: undefined,
  
  // Shared settings for all tests
  use: {
    // Base URL - can be overridden with VERCEL_URL env variable
    baseURL: process.env.VERCEL_URL || process.env.BASE_URL || 'https://appboardguru.vercel.app',
    
    // Trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Longer timeouts for production environment
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Accept cookies/storage
    ignoreHTTPSErrors: true,
    
    // Custom headers
    extraHTTPHeaders: {
      'X-Test-Environment': 'vercel-e2e',
    },
  },
  
  // Output directory
  outputDir: 'test-results-vercel/',
  
  // Test projects
  projects: [
    // Chrome Desktop
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // No storage state - we'll login in each test or test suite
      },
    },
    
    // Firefox Desktop
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Safari Desktop
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    
    // Mobile Safari
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
    
    // Tablet
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
  ],
  
  // No web server needed - testing against deployed app
  // webServer: undefined,
})