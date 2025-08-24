/**
 * Vitest Configuration for Real-Time Collaboration Tests
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    testTimeout: 10000,
    include: [
      'tests/**/*.test.{ts,tsx}',
      'tests/components/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/performance/**/*.test.{ts,tsx}',
    ],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/components/collaboration/**',
        'src/lib/stores/realtime-collaboration.store.ts',
        'src/hooks/useDocumentCollaboration.ts',
        'src/lib/graphql/realtime-subscriptions.ts',
      ],
      exclude: [
        'tests/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
    pool: 'forks',
    isolate: true,
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-results/realtime-tests.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './tests'),
    },
  },
  define: {
    'import.meta.vitest': false,
  },
})