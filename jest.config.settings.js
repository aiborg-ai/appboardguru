/**
 * Jest Configuration for Settings System Tests
 * Following CLAUDE.md testing guidelines with 80% overall coverage target
 */

const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/testing/jest.setup.ts',
    '<rootDir>/src/testing/settings-test-config.ts'
  ],
  
  // Module mapping for TypeScript paths
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    // Handle CSS/SCSS imports
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    // Handle static assets
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/testing/__mocks__/fileMock.js'
  },
  
  // Coverage configuration following CLAUDE.md targets
  collectCoverage: true,
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],
  coverageDirectory: '<rootDir>/coverage/settings',
  
  // Coverage thresholds per CLAUDE.md guidelines
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Repository layer: 85% target
    './src/lib/repositories/settings.repository.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Service layer: 80% target
    './src/lib/services/settings.service.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Component layer: 70% target
    './src/features/dashboard/settings/**/*.tsx': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/features/dashboard/settings/**/*.{ts,tsx}',
    'src/hooks/useUserContext.ts',
    'src/hooks/useSettings.ts',
    'src/lib/repositories/settings.repository.ts',
    'src/lib/services/settings.service.ts',
    'src/types/settings-validation.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/testing/**'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
    '!<rootDir>/src/**/*.e2e.{test,spec}.{ts,tsx}' // Exclude E2E tests
  ],
  
  // Performance settings
  maxWorkers: '50%',
  testTimeout: 10000,
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Advanced settings
  verbose: true,
  bail: false,
  errorOnDeprecated: true,
  
  // Custom test sequencer for optimized execution order
  testSequencer: '<rootDir>/src/testing/CustomTestSequencer.js',
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/testing/globalSetup.ts',
  globalTeardown: '<rootDir>/src/testing/globalTeardown.ts',
  
  // Additional Jest settings for React Testing Library
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
}