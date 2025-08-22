const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Enhanced Jest configuration for comprehensive test coverage
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/?(*.)+(spec|test).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/scripts/',
    '<rootDir>/tests/e2e/'
  ],
  collectCoverageFrom: [
    // Source files to include in coverage
    'src/**/*.{js,jsx,ts,tsx}',
    
    // Exclude patterns
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**',
    '!src/config/**',
    '!src/**/*.config.{js,ts}',
    '!src/examples/**',
    
    // Include critical paths
    'src/lib/repositories/**/*.{js,ts}',
    'src/lib/services/**/*.{js,ts}',
    'src/app/api/**/*.{js,ts}',
    'src/components/**/*.{jsx,tsx}',
    'src/hooks/**/*.{js,ts}',
    'src/lib/utils/**/*.{js,ts}',
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'cobertura',
    'clover'
  ],
  coverageDirectory: 'coverage',
  
  // Coverage thresholds - enforce 80% coverage goal
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher thresholds for critical components
    './src/lib/repositories/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/lib/services/': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    },
    './src/app/api/': {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75
    },
    './src/components/': {
      branches: 70,
      functions: 75,
      lines: 70,
      statements: 70
    },
    './src/hooks/': {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75
    },
  },
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true,
    }],
  },
  
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global test timeout
  testTimeout: 30000,
  
  // Setup files
  setupFiles: ['<rootDir>/jest.env.js'],
  
  // Parallel test execution
  maxWorkers: '50%',
  
  // Test result processors and reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      openReport: false,
    }],
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  
  // Coverage collection options
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/test-results/',
    '/scripts/',
    '/docs/',
    '\\.stories\\.(js|jsx|ts|tsx)$',
    '\\.test\\.(js|jsx|ts|tsx)$',
    '\\.spec\\.(js|jsx|ts|tsx)$',
  ],
  
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error handling
  errorOnDeprecated: true,
  verbose: false,
  silent: false,
  
  // Watch mode optimizations
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Snapshot testing
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Test sequencing
  testSequencer: '<rootDir>/jest.sequencer.js',
  
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
