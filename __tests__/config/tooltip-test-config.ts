/**
 * Test Configuration for InfoTooltip Components
 * 
 * Comprehensive test configuration following CLAUDE.md standards
 * Sets up coverage thresholds, quality gates, and testing environments
 */

import type { Config } from '@jest/types'
import { customMatchers } from '../helpers/tooltip-test-helpers'

// ============================================================================
// TEST CONFIGURATION CONSTANTS
// ============================================================================

export const TOOLTIP_TEST_CONFIG = {
  // Coverage thresholds for InfoTooltip components
  coverage: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    perFile: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for InfoTooltip files
    patterns: {
      'src/components/ui/info-tooltip.tsx': {
        branches: 95,
        functions: 100,
        lines: 95,
        statements: 95
      },
      'src/components/ui/tooltip.tsx': {
        branches: 90,
        functions: 100,
        lines: 90,
        statements: 90
      }
    }
  },
  
  // Performance budgets
  performance: {
    renderTime: {
      single: 16, // 60fps budget
      multiple: 100, // 100 tooltips
      complex: 32 // Complex InfoSection content
    },
    memoryUsage: {
      single: 1000000, // 1MB per tooltip
      multiple: 50000000, // 50MB for 100 tooltips
      leakage: 0.3 // Max 30% memory retention after cleanup
    },
    interactionTime: {
      hover: 50, // Max 50ms for hover response
      keyboard: 10, // Max 10ms per keyboard navigation
      touch: 30 // Max 30ms for touch interactions
    },
    frameRate: {
      minimum: 30, // Minimum acceptable FPS
      target: 50 // Target FPS for smooth animations
    }
  },
  
  // Accessibility standards
  accessibility: {
    wcag: {
      level: 'AA',
      colorContrast: 4.5,
      touchTargetSize: 44 // Minimum touch target in pixels
    },
    ariaAttributes: [
      'role',
      'aria-label',
      'aria-describedby',
      'aria-expanded'
    ],
    keyboardSupport: [
      'Tab',
      'Enter',
      'Space',
      'Escape',
      'ArrowUp',
      'ArrowDown'
    ]
  },
  
  // Visual regression thresholds
  visual: {
    pixelDifference: 0.1, // Max 0.1% pixel difference
    colorThreshold: 0.05, // Max 5% color variation
    layoutShift: 0.1, // Max cumulative layout shift
    viewports: [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ]
  },
  
  // Test timeouts and retries
  timeouts: {
    unit: 5000, // 5 seconds for unit tests
    integration: 10000, // 10 seconds for integration tests
    e2e: 30000, // 30 seconds for E2E tests
    performance: 15000, // 15 seconds for performance tests
    accessibility: 20000 // 20 seconds for a11y tests
  },
  
  retries: {
    unit: 1,
    integration: 2,
    e2e: 3,
    flaky: 5
  }
} as const

// ============================================================================
// JEST CONFIGURATION
// ============================================================================

export const jestConfig: Partial<Config.InitialOptions> = {
  // Test environment setup
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/config/setup-tooltip-tests.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1'
  },
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/*.(test|spec).(ts|tsx)'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/ui/info-tooltip.tsx',
    'src/components/ui/tooltip.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.stories.*',
    '!src/**/index.ts'
  ],
  
  coverageThreshold: {
    global: TOOLTIP_TEST_CONFIG.coverage.global,
    './src/components/ui/info-tooltip.tsx': TOOLTIP_TEST_CONFIG.coverage.patterns['src/components/ui/info-tooltip.tsx'],
    './src/components/ui/tooltip.tsx': TOOLTIP_TEST_CONFIG.coverage.patterns['src/components/ui/tooltip.tsx']
  },
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Test execution
  testTimeout: TOOLTIP_TEST_CONFIG.timeouts.unit,
  maxWorkers: '50%',
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/build/'
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ]
}

// ============================================================================
// PLAYWRIGHT CONFIGURATION
// ============================================================================

export const playwrightConfig = {
  testDir: '__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? TOOLTIP_TEST_CONFIG.retries.e2e : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
}

// ============================================================================
// TEST QUALITY GATES
// ============================================================================

export const qualityGates = {
  // Coverage gates
  coverage: {
    enforceMinimum: true,
    failOnDecline: true,
    allowedDecline: 2 // Max 2% coverage decline
  },
  
  // Performance gates
  performance: {
    enforceRenderTime: true,
    enforceMemoryUsage: true,
    enforceFrameRate: true,
    allowedRegression: 10 // Max 10% performance regression
  },
  
  // Accessibility gates
  accessibility: {
    enforceWCAG: true,
    allowViolations: 0,
    enforceKeyboardNavigation: true
  },
  
  // Visual gates
  visual: {
    enforcePixelPerfection: true,
    allowedPixelDifference: TOOLTIP_TEST_CONFIG.visual.pixelDifference,
    enforceResponsiveDesign: true
  },
  
  // Test stability gates
  stability: {
    maxFlakyTests: 5, // Max 5% flaky tests
    minPassRate: 95, // Min 95% pass rate
    maxExecutionTime: {
      unit: TOOLTIP_TEST_CONFIG.timeouts.unit,
      integration: TOOLTIP_TEST_CONFIG.timeouts.integration,
      e2e: TOOLTIP_TEST_CONFIG.timeouts.e2e
    }
  }
}

// ============================================================================
// ENVIRONMENT CONFIGURATIONS
// ============================================================================

export const testEnvironments = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.unit * 2,
    retries: 1,
    coverage: false,
    screenshots: false
  },
  
  ci: {
    baseURL: process.env.CI_BASE_URL || 'http://localhost:3000',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.unit,
    retries: TOOLTIP_TEST_CONFIG.retries.e2e,
    coverage: true,
    screenshots: true,
    parallel: true
  },
  
  staging: {
    baseURL: process.env.STAGING_URL,
    timeout: TOOLTIP_TEST_CONFIG.timeouts.e2e,
    retries: TOOLTIP_TEST_CONFIG.retries.flaky,
    coverage: false,
    screenshots: true,
    visualRegression: true
  },
  
  production: {
    baseURL: process.env.PRODUCTION_URL,
    timeout: TOOLTIP_TEST_CONFIG.timeouts.e2e * 2,
    retries: TOOLTIP_TEST_CONFIG.retries.flaky,
    coverage: false,
    screenshots: false,
    smokeTestsOnly: true
  }
}

// ============================================================================
// TEST CATEGORIZATION
// ============================================================================

export const testCategories = {
  unit: {
    pattern: '**/__tests__/unit/**/*.test.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.unit,
    coverage: true,
    parallel: true
  },
  
  integration: {
    pattern: '**/__tests__/integration/**/*.test.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.integration,
    coverage: true,
    parallel: true
  },
  
  e2e: {
    pattern: '**/__tests__/e2e/**/*.spec.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.e2e,
    coverage: false,
    parallel: false
  },
  
  accessibility: {
    pattern: '**/__tests__/accessibility/**/*.test.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.accessibility,
    coverage: false,
    parallel: true
  },
  
  performance: {
    pattern: '**/__tests__/performance/**/*.test.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.performance,
    coverage: false,
    parallel: false
  },
  
  visual: {
    pattern: '**/__tests__/visual/**/*.test.(ts|tsx)',
    timeout: TOOLTIP_TEST_CONFIG.timeouts.unit,
    coverage: false,
    parallel: true
  }
}

// ============================================================================
// CUSTOM TEST COMMANDS
// ============================================================================

export const testCommands = {
  // Unit tests only
  unit: 'jest --testPathPattern=__tests__/unit',
  
  // Integration tests only
  integration: 'jest --testPathPattern=__tests__/integration',
  
  // All Jest tests (unit + integration + accessibility + performance + visual)
  jest: 'jest --testPathPattern=__tests__/(unit|integration|accessibility|performance|visual)',
  
  // E2E tests only
  e2e: 'playwright test',
  
  // Coverage report
  coverage: 'jest --coverage --testPathPattern=__tests__/(unit|integration)',
  
  // Watch mode for development
  watch: 'jest --watch --testPathPattern=__tests__/(unit|integration)',
  
  // Full test suite
  all: 'npm run test:jest && npm run test:e2e',
  
  // Quick smoke tests
  smoke: 'jest --testNamePattern="(smoke|basic)" --testPathPattern=__tests__/unit',
  
  // Performance tests only
  performance: 'jest --testPathPattern=__tests__/performance --runInBand',
  
  // Accessibility tests only
  accessibility: 'jest --testPathPattern=__tests__/accessibility',
  
  // Visual regression tests only
  visual: 'jest --testPathPattern=__tests__/visual',
  
  // Update snapshots
  updateSnapshots: 'jest --updateSnapshot',
  
  // Debug mode
  debug: 'node --inspect-brk node_modules/.bin/jest --runInBand --no-cache'
}

// ============================================================================
// REPORTING CONFIGURATION
// ============================================================================

export const reportingConfig = {
  formats: ['html', 'json', 'lcov', 'text', 'cobertura'],
  
  directories: {
    coverage: 'coverage',
    reports: 'test-results',
    screenshots: 'test-results/screenshots',
    videos: 'test-results/videos',
    traces: 'test-results/traces'
  },
  
  notifications: {
    onSuccess: process.env.CI ? 'always' : 'never',
    onFailure: 'always',
    coverageThreshold: 'always'
  },
  
  integration: {
    sonarQube: {
      enabled: !!process.env.SONAR_TOKEN,
      reportPaths: [
        'test-results/coverage/lcov.info',
        'test-results/e2e-results.xml'
      ]
    },
    
    githubActions: {
      enabled: !!process.env.GITHUB_ACTIONS,
      annotations: true,
      summaries: true
    },
    
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK,
      channels: ['#testing', '#ci-cd']
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get configuration for specific environment
 */
export const getEnvironmentConfig = (env: keyof typeof testEnvironments = 'development') => {
  return {
    ...testEnvironments[env],
    qualityGates,
    performance: TOOLTIP_TEST_CONFIG.performance,
    accessibility: TOOLTIP_TEST_CONFIG.accessibility
  }
}

/**
 * Validate test configuration
 */
export const validateTestConfig = (): boolean => {
  const requiredEnvVars = ['NODE_ENV']
  const optionalEnvVars = ['CI', 'E2E_BASE_URL', 'STAGING_URL', 'PRODUCTION_URL']
  
  const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missingRequired.length > 0) {
    console.error(`Missing required environment variables: ${missingRequired.join(', ')}`)
    return false
  }
  
  return true
}

/**
 * Generate Jest configuration with custom options
 */
export const createJestConfig = (overrides: Partial<Config.InitialOptions> = {}): Config.InitialOptions => {
  return {
    ...jestConfig,
    ...overrides,
    setupFilesAfterEnv: [
      ...(jestConfig.setupFilesAfterEnv || []),
      ...(overrides.setupFilesAfterEnv || [])
    ]
  } as Config.InitialOptions
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Main configuration
  TOOLTIP_TEST_CONFIG,
  jestConfig,
  playwrightConfig,
  
  // Quality gates and environments
  qualityGates,
  testEnvironments,
  testCategories,
  
  // Commands and reporting
  testCommands,
  reportingConfig,
  
  // Utility functions
  getEnvironmentConfig,
  validateTestConfig,
  createJestConfig
}

export default TOOLTIP_TEST_CONFIG