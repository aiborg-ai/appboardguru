const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');
  
  // Ensure coverage directory exists
  const coverageDir = path.join(__dirname, 'coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  // Ensure test results directory exists
  const testResultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Clean up any previous test artifacts
  try {
    if (fs.existsSync(path.join(__dirname, '.jest-cache'))) {
      execSync('rm -rf .jest-cache', { cwd: __dirname });
    }
  } catch (error) {
    console.warn('Warning: Could not clean Jest cache:', error.message);
  }
  
  // Set up environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';
  
  // Initialize test database if needed
  try {
    const { testDb } = require('./__tests__/utils/test-database');
    if (testDb && typeof testDb.globalSetup === 'function') {
      await testDb.globalSetup();
    }
  } catch (error) {
    console.warn('Warning: Test database setup failed:', error.message);
  }
  
  // Record test run metadata
  const metadata = {
    startTime: new Date().toISOString(),
    nodeVersion: process.version,
    jestVersion: require('jest/package.json').version,
    platform: process.platform,
    arch: process.arch,
    cpus: require('os').cpus().length,
    totalMemory: require('os').totalmem(),
    freeMemory: require('os').freemem(),
  };
  
  fs.writeFileSync(
    path.join(testResultsDir, 'test-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('✅ Global test environment setup complete');
};
