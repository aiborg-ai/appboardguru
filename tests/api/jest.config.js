/**
 * Jest configuration for API tests
 */

module.exports = {
  displayName: 'API Integration Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/api'],
  testMatch: [
    '**/tests/api/**/*.test.ts',
    '**/tests/api/**/*.test.js',
    '**/tests/api/**/*.spec.ts',
    '**/tests/api/**/*.spec.js'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tests/tsconfig.json'
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/api/setup.ts'
  ],
  testTimeout: 30000, // 30 seconds for API tests
  maxWorkers: 4, // Limit concurrent tests to avoid overwhelming API
  verbose: true,
  bail: false, // Continue running tests even if some fail
  detectOpenHandles: true,
  forceExit: true,
  
  // Custom test environments for different scenarios
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['**/tests/api/unit/**/*.test.ts'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['**/tests/api/integration/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/api/integration/setup.ts']
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['**/tests/api/e2e/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/api/e2e/setup.ts'],
      testTimeout: 60000 // Longer timeout for E2E tests
    }
  ],

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tests/tsconfig.json'
    }
  },

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'api-tests.xml',
      suiteName: 'API Integration Tests'
    }],
    ['jest-html-reporter', {
      outputPath: 'test-results/api-tests.html',
      pageTitle: 'AppBoardGuru API Test Results',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],

  // Custom matchers and utilities
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
}