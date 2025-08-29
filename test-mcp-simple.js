#!/usr/bin/env node

/**
 * Simple Playwright MCP Test Runner
 * Runs tests using npx without requiring system-level browser installations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎭 AppBoardGuru Playwright MCP Test Runner');
console.log('==========================================\n');

// Configuration
const TEST_DIR = path.join(__dirname, '__tests__', 'e2e', 'playwright-mcp', 'tests');
const CONFIG_FILE = 'playwright.enhanced.config.ts';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Check if test directory exists
if (!fs.existsSync(TEST_DIR)) {
  console.error('❌ Test directory not found:', TEST_DIR);
  console.log('\nMCP tests are located at: __tests__/e2e/playwright-mcp/tests/');
  process.exit(1);
}

// Test suites
const testSuites = {
  all: `${TEST_DIR}/*.spec.ts`,
  auth: `${TEST_DIR}/auth-flow.spec.ts`,
  board: `${TEST_DIR}/board-management.spec.ts`,
  assets: `${TEST_DIR}/asset-vault-management.spec.ts`,
};

// Parse command line arguments
const args = process.argv.slice(2);
const suite = args[0] || 'all';
const mode = args[1] || 'run';

// Validate suite
if (!testSuites[suite] && suite !== 'help') {
  console.error(`❌ Invalid test suite: ${suite}`);
  console.log('\nAvailable suites:');
  Object.keys(testSuites).forEach(s => console.log(`  - ${s}`));
  process.exit(1);
}

// Show help
if (suite === 'help') {
  console.log('Usage: node test-mcp-simple.js [suite] [mode]');
  console.log('\nSuites:');
  console.log('  all     - Run all MCP tests');
  console.log('  auth    - Run authentication tests');
  console.log('  board   - Run board management tests');
  console.log('  assets  - Run asset & vault tests');
  console.log('\nModes:');
  console.log('  run     - Run tests normally (default)');
  console.log('  ui      - Open Playwright UI');
  console.log('  debug   - Run in debug mode');
  console.log('  headed  - Run with visible browser');
  console.log('\nExamples:');
  console.log('  node test-mcp-simple.js all');
  console.log('  node test-mcp-simple.js auth ui');
  console.log('  node test-mcp-simple.js board debug');
  process.exit(0);
}

// Check if dev server is running
console.log('🔍 Checking development server...');
const http = require('http');

function checkServer() {
  return new Promise((resolve) => {
    http.get(BASE_URL, (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function runTests() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️  Development server not running');
    console.log('   Please start it with: npm run dev');
    console.log('   Then run this script again.\n');
    process.exit(1);
  }
  
  console.log('✅ Development server is running\n');
  
  // Build playwright command
  const testPath = testSuites[suite];
  const playwrightArgs = ['playwright', 'test', testPath, `--config=${CONFIG_FILE}`];
  
  // Add mode-specific flags
  switch (mode) {
    case 'ui':
      playwrightArgs.push('--ui');
      break;
    case 'debug':
      playwrightArgs.push('--debug');
      break;
    case 'headed':
      playwrightArgs.push('--headed');
      break;
  }
  
  console.log(`🚀 Running ${suite} tests in ${mode} mode...\n`);
  console.log(`Command: npx ${playwrightArgs.join(' ')}\n`);
  console.log('========================================\n');
  
  // Run Playwright tests
  const playwright = spawn('npx', playwrightArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE_URL,
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME, '.cache', 'playwright'),
      FORCE_COLOR: '1',
    },
  });
  
  playwright.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Tests completed successfully!');
      console.log('\n📊 View report with: npx playwright show-report');
    } else if (code === null) {
      // UI mode or debug mode was closed
      console.log('\n👋 Test runner closed');
    } else {
      console.log(`\n❌ Tests failed with exit code: ${code}`);
      console.log('\n📊 View report with: npx playwright show-report');
    }
  });
  
  playwright.on('error', (err) => {
    console.error('\n❌ Failed to start Playwright:', err.message);
    console.log('\nTry installing Playwright first:');
    console.log('  npm install @playwright/test');
    console.log('  npx playwright install');
  });
}

// Run tests
runTests().catch(console.error);