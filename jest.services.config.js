const path = require('path');

module.exports = {
  displayName: 'Services Tests',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname),
  testMatch: [
    '<rootDir>/src/__tests__/services/**/*.test.(js|ts)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/jest.env.js'],
  collectCoverageFrom: [
    'src/lib/services/**/*.{js,ts}',
    '!src/lib/services/**/*.d.ts',
    '!src/lib/services/**/index.{js,ts}',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/services',
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};