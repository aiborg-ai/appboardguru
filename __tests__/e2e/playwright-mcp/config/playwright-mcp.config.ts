import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright MCP Configuration for AppBoardGuru E2E Testing
 * 
 * This configuration integrates with MCP (Model Context Protocol) for:
 * - AI-driven test generation
 * - Automated test recording
 * - Intelligent test assertions
 * - Real-time test debugging
 */

export default defineConfig({
  testDir: '../tests',
  
  // Test execution settings
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5000,
  },
  
  // Parallel execution for speed
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration for MCP integration
  reporter: [
    ['html', { outputFolder: path.join(__dirname, '../reports/html') }],
    ['json', { outputFile: path.join(__dirname, '../reports/results.json') }],
    ['junit', { outputFile: path.join(__dirname, '../reports/junit.xml') }],
    ['list'],
    [path.join(__dirname, '../reporters/mcp-reporter.ts')], // Custom MCP reporter
  ],
  
  // Shared settings for all tests
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    
    // Collect trace for debugging
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording for MCP analysis
    video: process.env.RECORD_VIDEO === 'true' ? 'on' : 'retain-on-failure',
    
    // Authentication state
    storageState: path.join(__dirname, '../auth/auth.json'),
    
    // MCP-specific settings
    contextOptions: {
      // Enable clipboard access for copy/paste tests
      permissions: ['clipboard-read', 'clipboard-write'],
      
      // Custom user agent for MCP tracking
      userAgent: 'AppBoardGuru-E2E-MCP/1.0',
    },
  },
  
  // Projects for different test scenarios
  projects: [
    {
      name: 'setup',
      testMatch: '**/global-setup.ts',
      use: {
        storageState: undefined,
      },
    },
    
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'mcp-codegen',
      use: {
        ...devices['Desktop Chrome'],
        // Special configuration for MCP code generation
        launchOptions: {
          slowMo: 100, // Slow down for recording
        },
        contextOptions: {
          recordVideo: {
            dir: path.join(__dirname, '../recordings'),
            size: { width: 1280, height: 720 },
          },
        },
      },
      dependencies: ['setup'],
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Output folder for test results
  outputDir: path.join(__dirname, '../test-results'),
})