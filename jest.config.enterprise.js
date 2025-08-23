/**
 * Jest Configuration for Enterprise Features Testing
 * Comprehensive test setup for $500K/seat application
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Custom Jest configuration for enterprise features
const customJestConfig = {
  displayName: 'Enterprise BoardMates Features',
  
  // Test environment setup
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.enterprise.js'
  ],
  
  // Test patterns
  testMatch: [
    // Unit tests
    '<rootDir>/__tests__/unit/**/*.test.{js,jsx,ts,tsx}',
    
    // Component tests
    '<rootDir>/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
    
    // Integration tests
    '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
    
    // Performance tests
    '<rootDir>/__tests__/performance/**/*.test.{js,jsx,ts,tsx}',
    
    // Accessibility tests
    '<rootDir>/__tests__/accessibility/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/testing/(.*)$': '<rootDir>/src/testing/$1'
  },
  
  // Transform patterns
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/enterprise',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json-summary'
  ],
  
  // Coverage thresholds for enterprise features
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Service layer requirements
    './src/lib/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Component requirements
    './src/components/boardmates/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/lib/services/**/*.{js,ts}',
    'src/components/boardmates/**/*.{js,jsx,ts,tsx}',
    'src/features/**/BoardMatesStep.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/**/node_modules/**'
  ],
  
  // Test timeout for complex operations
  testTimeout: 30000,
  
  // Mock modules
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Test sequencer for optimized execution
  testSequencer: '<rootDir>/jest.sequencer.enterprise.js',
  
  // Performance and memory settings
  maxWorkers: '50%',
  workerIdleMemoryLimit: '500MB',
  
  // Test result processing
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/enterprise',
      outputName: 'enterprise-test-results.xml',
      suiteName: 'Enterprise BoardMates Features'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results/enterprise',
      filename: 'enterprise-test-report.html',
      expand: true,
      hideIcon: false
    }]
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.enterprise.js',
  globalTeardown: '<rootDir>/jest.global-teardown.enterprise.js',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],
  
  // Custom environment variables for testing
  testEnvironmentOptions: {
    url: 'http://localhost:3006'
  }
}

// Export the Jest configuration
module.exports = createJestConfig(customJestConfig)