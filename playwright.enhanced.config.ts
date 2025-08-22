import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Enhanced Playwright configuration for comprehensive E2E testing
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  
  /* Global test timeout */
  timeout: 30000,
  
  /* Timeout for each assertion */
  expect: {
    timeout: 10000,
  },
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(process.env.CI ? [['github' as const]] : [['list' as const]]),
  ],
  
  /* Global setup files */
  globalSetup: require.resolve('./__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./__tests__/e2e/global-teardown.ts'),
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Trace options */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Screenshot options */
    screenshot: process.env.CI ? 'only-on-failure' : 'on-first-retry',
    
    /* Video recording */
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Action timeout */
    actionTimeout: 15000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* User agent */
    userAgent: 'BoardGuru E2E Tests',
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'e2e',
    },
    
    /* Permissions */
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  
  /* Test output directory */
  outputDir: 'test-results/',
  
  /* Configure projects for different browsers and contexts */
  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    
    /* Desktop Chrome */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Desktop Chrome - Mobile simulation */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Desktop Firefox */
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Desktop Safari */
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Tablet */
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Different user roles */
    {
      name: 'director-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'test-results/auth/director-user.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'viewer-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'test-results/auth/viewer-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* API testing */
    {
      name: 'api',
      testMatch: /.*api\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },
    
    /* Accessibility testing */
    {
      name: 'accessibility',
      testMatch: /.*a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'test-results/auth/admin-user.json',
      },
      dependencies: ['setup'],
    },
    
    /* Performance testing */
    {
      name: 'performance',
      testMatch: /.*perf\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
          ],
        },
      },
    },
  ],
  
  /* Web server configuration for local development */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
    },
  },
  
  /* Test metadata */
  metadata: {
    'test-suite': 'BoardGuru E2E Tests',
    'environment': process.env.NODE_ENV || 'test',
    'version': process.env.npm_package_version || '1.0.0',
  },
  
  /* Maximum failures before stopping */
  maxFailures: process.env.CI ? 10 : undefined,
})