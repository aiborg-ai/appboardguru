import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        URL: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        window: 'readonly',
        document: 'readonly',
        Image: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        React: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
      },
    },
    rules: {
      // Allow any during migration but warn about it
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      
      // Disable some strict rules that would cause too many errors during migration
      '@typescript-eslint/no-unsafe-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      
      // Next.js specific rules
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
      '*.js',
      '*.mjs',
    ],
  },
];