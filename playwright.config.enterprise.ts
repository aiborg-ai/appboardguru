/**
 * Playwright Configuration for Enterprise E2E Testing
 * Testing complete user workflows for $500K/seat application
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Test directory
  testDir: '__tests__/e2e',
  
  // Test files pattern
  testMatch: /.*\.spec\.ts/,
  
  // Global test timeout
  timeout: 60000,
  
  // Global expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'test-results/e2e/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/e2e/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/e2e/junit-results.xml' 
    }],
    ['line']
  ],
  
  // Global setup and teardown
  globalSetup: require.resolve('./playwright.global-setup.ts'),
  globalTeardown: require.resolve('./playwright.global-teardown.ts'),
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3006',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    
    // Collect trace when retrying the failed test
    trace: 'retry-with-trace',
    
    // Record video for failed tests
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Action timeout
    actionTimeout: 10000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
    },
  },
  
  // Test output directory
  outputDir: 'test-results/e2e/artifacts',
  
  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile devices (for responsive testing)
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet devices
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    
    // High-resolution displays (for enterprise users)
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 2,
      },
    },
    
    // Accessibility testing with specific settings
    {
      name: 'accessibility-audit',
      use: {
        ...devices['Desktop Chrome'],
        // Specific settings for accessibility testing
        reducedMotion: 'reduce',
        forcedColors: 'none',
        colorScheme: 'light',
      },
    },
    
    // Performance testing configuration
    {
      name: 'performance-audit',
      use: {
        ...devices['Desktop Chrome'],
        // Performance-specific settings
        viewport: { width: 1920, height: 1080 },
        // Throttle CPU for performance testing
        launchOptions: {
          args: ['--cpu-throttle-rate=4'],
        },
      },
    },
  ],
  
  // Local dev server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3006,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_ENTERPRISE_FEATURES: 'true',
      NEXT_PUBLIC_AI_FEATURES: 'true',
      NEXT_PUBLIC_VOICE_COMMANDS: 'true',
      NEXT_PUBLIC_COMPLIANCE_CHECKING: 'true',
    },
  },
  
  // Test metadata
  metadata: {
    'test-suite': 'Enterprise BoardMates Features',
    'application-value': '$500,000 USD per seat',
    'quality-standard': 'Enterprise Grade',
    'accessibility-compliance': 'WCAG 2.1 AA',
    'performance-target': '<5s load time',
    'browser-support': 'Chrome 90+, Firefox 88+, Safari 14+',
    'device-support': 'Desktop, Tablet, Mobile',
  },
})