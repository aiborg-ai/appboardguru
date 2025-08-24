/**
 * Jest Configuration for Crisis Management System Tests
 * Specialized configuration for testing the crisis management components
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Crisis Management System Tests',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Test patterns - focus on crisis management tests
  testMatch: [
    '<rootDir>/src/lib/services/__tests__/crisis-*.test.ts',
    '<rootDir>/src/lib/services/__tests__/incident-*.test.ts',
    '<rootDir>/src/lib/services/__tests__/emergency-*.test.ts',
    '<rootDir>/src/lib/services/__tests__/situation-*.test.ts',
    '<rootDir>/src/lib/services/__tests__/post-incident-*.test.ts',
    '<rootDir>/src/components/crisis-command-center/__tests__/*.test.tsx',
    '<rootDir>/src/app/api/crisis/**/__tests__/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/crisis-management',
  collectCoverageFrom: [
    'src/lib/services/crisis-*.ts',
    'src/lib/services/incident-*.ts',
    'src/lib/services/emergency-*.ts',
    'src/lib/services/situation-*.ts',
    'src/lib/services/post-incident-*.ts',
    'src/components/crisis-command-center/**/*.{ts,tsx}',
    'src/app/api/crisis/**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    'src/lib/services/crisis-management.service.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/lib/services/incident-response-workflows.service.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/components/crisis-command-center/CrisisCommandCenter.tsx': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test timeout for async operations
  testTimeout: 30000,
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output for detailed test information
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reporters for CI/CD integration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'Crisis Management System Tests',
        outputDirectory: '<rootDir>/test-results/crisis-management',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results/crisis-management',
        filename: 'report.html',
        pageTitle: 'Crisis Management System Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: false,
        openReport: false,
      },
    ],
  ],
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache/crisis-management',
  
  // Parallel test execution
  maxWorkers: '50%',
}

// Export Jest configuration
module.exports = createJestConfig(customJestConfig)