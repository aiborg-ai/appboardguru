// ESLint Security Configuration for BoardGuru
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  plugins: ['security', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // Security-focused rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    
    // TypeScript security rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    
    // Additional security practices
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'strict': ['error', 'global']
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        // Relax some rules for test files
        'security/detect-non-literal-fs-filename': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'warn'
      }
    }
  ]
};