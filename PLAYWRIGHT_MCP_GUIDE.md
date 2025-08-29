# 🎭 Playwright MCP E2E Testing Guide for AppBoardGuru

## Table of Contents
1. [Quick Start](#quick-start)
2. [What is Playwright MCP?](#what-is-playwright-mcp)
3. [Installation & Setup](#installation--setup)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Helper Functions](#test-helper-functions)
7. [Debugging Tests](#debugging-tests)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Quick Start

### Run Your First Test in 30 Seconds
```bash
# 1. Start your dev server (if not already running)
npm run dev

# 2. Run the test menu
./run-playwright-mcp.sh

# 3. Select option 1 (Standalone Tests)
# Tests will run and show results!
```

### View Test Results
```bash
# Open the HTML report
npx playwright show-report
```

---

## What is Playwright MCP?

Playwright MCP (Model Context Protocol) is an enhanced E2E testing framework that combines:
- **Playwright**: Modern web testing and automation
- **MCP Integration**: AI-powered test generation and analysis
- **Smart Helpers**: Intelligent element finding and test utilities

### Key Features
✅ **No Authentication Required** for basic tests  
✅ **Smart Element Finding** with multiple fallback strategies  
✅ **Automatic Performance Monitoring**  
✅ **Built-in Accessibility Testing**  
✅ **AI-Powered Test Analysis and Suggestions**  
✅ **Cross-browser Support** (Chrome, Firefox, Safari)  
✅ **Mobile Responsive Testing**  

---

## Installation & Setup

### Prerequisites
```bash
# Check if Node.js is installed
node --version  # Should be v18 or higher

# Check if npm is installed
npm --version   # Should be v8 or higher
```

### Initial Setup (Already Done)
```bash
# Playwright is already installed in your project
# If you need to reinstall:
npm install @playwright/test --save-dev

# Install browsers (optional - tests work without this)
npx playwright install chromium
```

### File Structure
```
__tests__/e2e/playwright-mcp/
├── tests/                    # Your test files
│   ├── standalone-test.spec.ts    # Works without auth ✅
│   ├── auth-flow.spec.ts          # Authentication tests
│   ├── board-management.spec.ts   # Board features
│   └── asset-vault-management.spec.ts # File management
├── helpers/
│   └── mcp-test-helper.ts    # Smart test utilities
├── reporters/
│   └── mcp-reporter.ts       # AI-powered reporting
└── config/
    └── playwright-mcp.config.ts # Configuration
```

---

## Running Tests

### Method 1: Interactive Menu (Easiest)
```bash
./run-playwright-mcp.sh
```
This opens a menu where you can select:
1. **Standalone Tests** - No login required ✅
2. All MCP Tests - Full suite
3. Authentication Tests
4. Board Management Tests
5. Asset & Vault Tests
6. **Open UI Mode** - Visual test runner
7. **Debug Mode** - Step through tests
8. Exit

### Method 2: Direct Commands

#### Run Specific Test Files
```bash
# Run standalone tests (no auth needed)
npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts --config=playwright-mcp.config.ts

# Run auth tests
npx playwright test __tests__/e2e/playwright-mcp/tests/auth-flow.spec.ts --config=playwright-mcp.config.ts

# Run all tests
npx playwright test --config=playwright-mcp.config.ts
```

#### Run in Different Modes
```bash
# UI Mode - Visual test runner
npx playwright test --ui --config=playwright-mcp.config.ts

# Debug Mode - Step through tests
npx playwright test --debug --config=playwright-mcp.config.ts

# Headed Mode - See browser
npx playwright test --headed --config=playwright-mcp.config.ts
```

#### Run Specific Browsers
```bash
# Chrome only
npx playwright test --project=chromium --config=playwright-mcp.config.ts

# Firefox only
npx playwright test --project=firefox --config=playwright-mcp.config.ts

# Safari only
npx playwright test --project=webkit --config=playwright-mcp.config.ts
```

### Method 3: Generate Tests from Browser Actions
```bash
# Open Playwright Codegen
npx playwright codegen http://localhost:3001

# This opens a browser where you can:
# 1. Click around your app
# 2. Fill forms
# 3. Navigate pages
# Playwright generates test code automatically!
```

---

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/')
  })
  
  test('should do something', async ({ page }) => {
    // Your test code here
    await page.click('button')
    await expect(page.locator('.result')).toBeVisible()
  })
})
```

### Using MCP Test Helper
```typescript
import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'

test('smart test with helper', async ({ page, context }) => {
  const helper = new MCPTestHelper(page, context)
  
  // Smart element finding
  await helper.smartClick('Submit')  // Finds by text, role, id, etc.
  
  // Smart fill with validation
  await helper.smartFill('#email', 'test@example.com')
  
  // Generate test data
  const user = helper.generateTestData('user')
  const asset = helper.generateTestData('asset')
  
  // Login helper
  await helper.login('test@example.com', 'password')
  
  // Take annotated screenshot
  await helper.takeAnnotatedScreenshot('test-result', [
    { selector: '.success', text: 'Success message' }
  ])
})
```

### Common Test Patterns

#### 1. Testing Page Load
```typescript
test('page loads successfully', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1')).toBeVisible()
})
```

#### 2. Form Submission
```typescript
test('submit form', async ({ page }) => {
  await page.fill('#email', 'test@example.com')
  await page.fill('#password', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

#### 3. API Testing
```typescript
test('api endpoint works', async ({ request }) => {
  const response = await request.get('/api/users')
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data).toHaveProperty('users')
})
```

#### 4. Responsive Testing
```typescript
test('responsive design', async ({ page }) => {
  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 })
  await expect(page.locator('.desktop-menu')).toBeVisible()
  
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 })
  await expect(page.locator('.mobile-menu')).toBeVisible()
})
```

---

## Test Helper Functions

The MCPTestHelper provides these smart functions:

### Smart Element Finding
```typescript
// Tries multiple strategies automatically
await helper.findElement('Submit Button')
// Attempts: test-id → role → text → placeholder → label → CSS
```

### Smart Actions
```typescript
// Click with retry logic
await helper.smartClick('Submit', { 
  retries: 3,    // Try 3 times
  delay: 1000    // Wait 1s between retries
})

// Fill with validation
await helper.smartFill('#email', 'test@example.com')
// Verifies the value was actually filled
```

### Test Data Generation
```typescript
const user = helper.generateTestData('user')
// Returns: { email, password, firstName, lastName, role }

const org = helper.generateTestData('organization')
// Returns: { name, slug, description, industry, size }

const asset = helper.generateTestData('asset')
// Returns: { name, description, tags, category }

const vault = helper.generateTestData('vault')
// Returns: { name, description, isPublic, permissions }
```

### Performance Monitoring
```typescript
const metrics = await helper.collectPerformanceMetrics()
// Returns: {
//   domContentLoaded: 100,
//   loadComplete: 200,
//   firstPaint: 150,
//   firstContentfulPaint: 180,
//   memory: { ... }
// }
```

### Accessibility Testing
```typescript
const a11yResults = await helper.checkAccessibility()
// Returns axe-core accessibility violations
```

### Screenshot with Annotations
```typescript
await helper.takeAnnotatedScreenshot('test-name', [
  { selector: '#error', text: 'Error here' },
  { selector: '.success', text: 'Success!' }
])
```

---

## Debugging Tests

### 1. UI Mode (Visual Debugging)
```bash
npx playwright test --ui --config=playwright-mcp.config.ts
```
- See tests run visually
- Time travel through test steps
- Inspect DOM at each step
- View network requests

### 2. Debug Mode (Step Through)
```bash
npx playwright test --debug --config=playwright-mcp.config.ts
```
- Pause at breakpoints
- Step through line by line
- Inspect variables
- Use browser DevTools

### 3. Headed Mode (See Browser)
```bash
npx playwright test --headed --config=playwright-mcp.config.ts
```
- Watch tests run in real browser
- Good for visual debugging

### 4. Slow Motion
```typescript
test.use({
  launchOptions: {
    slowMo: 1000  // Slow down by 1 second
  }
})
```

### 5. Screenshots on Failure
Tests automatically take screenshots on failure.
Find them in: `test-results/`

### 6. Videos
```bash
# Enable video recording
npx playwright test --video=on --config=playwright-mcp.config.ts
```

### 7. Trace Viewer
```bash
# Record trace
npx playwright test --trace=on --config=playwright-mcp.config.ts

# View trace
npx playwright show-trace trace.zip
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Running in Docker
```bash
# Use the Docker script
./docker-playwright-tests.sh
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "No tests found"
```bash
# Check test file location
ls __tests__/e2e/playwright-mcp/tests/

# Run with explicit path
npx playwright test path/to/test.spec.ts --config=playwright-mcp.config.ts
```

#### 2. "Browser not installed"
```bash
# Install browsers
npx playwright install chromium

# Or run without system browsers (works fine)
./run-playwright-mcp.sh
# Select option 1 (Standalone tests)
```

#### 3. "Timeout errors"
```typescript
// Increase timeout in test
test.setTimeout(60000)  // 60 seconds

// Or in config
export default defineConfig({
  timeout: 60000,
})
```

#### 4. "Element not found"
```typescript
// Use better selectors
await page.locator('[data-testid="submit"]')  // Best
await page.getByRole('button', { name: 'Submit' })  // Good
await page.locator('#submit')  // OK
await page.locator('.btn')  // Avoid
```

#### 5. "Port 3000 in use"
```bash
# Your dev server runs on port 3001
export BASE_URL=http://localhost:3001
./run-playwright-mcp.sh
```

---

## Best Practices

### 1. Use Test IDs
```html
<!-- In your React components -->
<button data-testid="submit-form">Submit</button>
```
```typescript
// In tests
await page.locator('[data-testid="submit-form"]').click()
```

### 2. Wait for Elements Properly
```typescript
// ❌ Bad - hardcoded wait
await page.waitForTimeout(5000)

// ✅ Good - wait for specific condition
await page.waitForSelector('.loading', { state: 'hidden' })
await expect(page.locator('.result')).toBeVisible()
```

### 3. Use Page Objects
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('#email', email)
    await this.page.fill('#password', password)
    await this.page.click('[data-testid="login-submit"]')
  }
}

// In test
const loginPage = new LoginPage(page)
await loginPage.login('test@example.com', 'password')
```

### 4. Group Related Tests
```typescript
test.describe('User Authentication', () => {
  test.describe('Login', () => {
    test('with valid credentials', async ({ page }) => {})
    test('with invalid credentials', async ({ page }) => {})
  })
  
  test.describe('Registration', () => {
    test('new user', async ({ page }) => {})
    test('existing user', async ({ page }) => {})
  })
})
```

### 5. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data
  await page.evaluate(() => localStorage.clear())
})
```

### 6. Use Fixtures for Common Setup
```typescript
const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login')
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'password')
    await page.click('[type="submit"]')
    
    // Use the authenticated page
    await use(page)
    
    // Logout after test
    await page.click('[data-testid="logout"]')
  }
})

test('authenticated test', async ({ authenticatedPage }) => {
  // Already logged in!
  await authenticatedPage.goto('/dashboard')
})
```

---

## Quick Reference

### Essential Commands
```bash
# Run tests
./run-playwright-mcp.sh           # Interactive menu
npx playwright test               # Run all tests
npx playwright test --ui          # UI mode
npx playwright test --debug       # Debug mode
npx playwright test --headed      # See browser

# Generate tests
npx playwright codegen localhost:3001

# View results
npx playwright show-report        # HTML report
cat test-results/results.json     # JSON results

# Help
npx playwright test --help        # Playwright help
```

### File Locations
- **Tests**: `__tests__/e2e/playwright-mcp/tests/`
- **Config**: `playwright-mcp.config.ts`
- **Helper**: `__tests__/e2e/playwright-mcp/helpers/mcp-test-helper.ts`
- **Reports**: `playwright-report/`
- **Screenshots**: `test-results/`

### Test Status Indicators
- ✅ **Green** - Test passed
- ❌ **Red** - Test failed
- ⏭️ **Yellow** - Test skipped
- ⏱️ **Gray** - Test pending

---

## Getting Help

### Resources
- **Playwright Docs**: https://playwright.dev/docs
- **Selectors Guide**: https://playwright.dev/docs/selectors
- **Assertions**: https://playwright.dev/docs/test-assertions
- **API Reference**: https://playwright.dev/docs/api/class-test

### Support
- Check test examples in `standalone-test.spec.ts`
- View the README at `__tests__/e2e/playwright-mcp/README.md`
- Run tests in UI mode to see what's happening
- Use debug mode to step through tests

---

## Summary

You now have a complete Playwright MCP testing setup that:
- ✅ Works immediately with standalone tests
- ✅ Provides smart test helpers
- ✅ Includes AI-powered analysis
- ✅ Supports multiple browsers
- ✅ Has visual debugging tools
- ✅ Generates tests from browser actions

**Start with**: `./run-playwright-mcp.sh` and select option 1!

Happy Testing! 🎭