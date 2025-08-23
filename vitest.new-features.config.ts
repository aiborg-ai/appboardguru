import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Test execution settings
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Include patterns for new feature tests
    include: [
      'src/__tests__/repositories/**/*.test.ts',
      'src/__tests__/services/**/*.test.ts',
      'src/__tests__/api/**/*.test.ts',
      'src/__tests__/performance/**/*.test.ts',
      'src/__tests__/e2e/**/*.test.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      '**/*.d.ts',
      'src/__tests__/setup/**',
      'src/__tests__/mocks/**',
      'src/__tests__/factories/**'
    ],
    
    // Test timeouts (CLAUDE.md requirement: sub-200ms for API, longer for complex workflows)
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 10000, // 10 seconds for hooks
    
    // Coverage configuration (CLAUDE.md requirement: 80% coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/new-features',
      
      // Coverage thresholds per CLAUDE.md
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for critical components
        'src/lib/repositories/voice.repository.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        },
        'src/lib/repositories/audit.repository.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        },
        'src/lib/repositories/smart-sharing.repository.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        },
        'src/lib/services/user.service.ts': {
          branches: 80,
          functions: 85,
          lines: 80,
          statements: 80
        },
        'src/lib/services/calendar.service.ts': {
          branches: 80,
          functions: 85,
          lines: 80,
          statements: 80
        }
      },
      
      // Files to include in coverage
      include: [
        'src/lib/repositories/voice.repository.ts',
        'src/lib/repositories/audit.repository.ts',
        'src/lib/repositories/smart-sharing.repository.ts',
        'src/lib/services/user.service.ts',
        'src/lib/services/calendar.service.ts',
        'src/lib/services/asset.service.ts',
        'src/lib/services/compliance.service.ts'
      ],
      
      // Files to exclude from coverage
      exclude: [
        'src/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/**/*.d.ts'
      ]
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/new-features-results.json',
      html: './test-results/new-features-report.html'
    },
    
    // Pool configuration for performance
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
        minForks: 1
      }
    },
    
    // Setup files
    setupFiles: [
      './src/__tests__/setup/vitest.setup.ts'
    ],
    
    // Performance monitoring
    benchmark: {
      reporters: ['verbose']
    },
    
    // Watch mode configuration (for development)
    watch: false,
    
    // Retry failed tests (for flaky test resilience)
    retry: 1,
    
    // Concurrent test execution
    sequence: {
      concurrent: true,
      shuffle: false,
      hooks: 'stack'
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './src/__tests__')
    }
  },
  
  // Define configuration for mocking
  define: {
    __TEST__: true,
    __NEW_FEATURES_TEST__: true
  },
  
  // Esbuild configuration for TypeScript
  esbuild: {
    target: 'node16',
    sourcemap: true
  }
})