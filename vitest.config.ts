/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      'tests/fixtures/**',
      'tests/screenshots/**',
      'node_modules/**',
    ],
    coverage: {
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{js,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,tsx}',
        'src/**/*.spec.{js,ts,tsx}',
        'src/config/**',
        'src/types/**',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})