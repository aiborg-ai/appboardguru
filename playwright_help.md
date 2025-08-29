# 🎭 Playwright E2E Testing - Complete Help Guide

## 📚 Table of Contents
1. [Quick Start (30 Seconds)](#quick-start-30-seconds)
2. [What is Playwright MCP?](#what-is-playwright-mcp)
3. [Installation Status](#installation-status)
4. [Running Tests - 3 Methods](#running-tests---3-methods)
5. [Test Files Overview](#test-files-overview)
6. [Writing Your Own Tests](#writing-your-own-tests)
7. [MCP Test Helper Functions](#mcp-test-helper-functions)
8. [Common Test Patterns](#common-test-patterns)
9. [Debugging Tests](#debugging-tests)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Best Practices](#best-practices)
12. [Quick Command Reference](#quick-command-reference)

---

## 🚀 Quick Start (30 Seconds)

Get your first test running immediately:

```bash
# Step 1: Start your development server
npm run dev

# Step 2: Run the test menu
./run-playwright-mcp.sh

# Step 3: Press "1" for Standalone Tests (no login required)
# Watch the tests run and pass! ✅
```

**That's it!** You've just run your first Playwright test.

---

## 🎯 What is Playwright MCP?

**Playwright MCP** is an enhanced E2E (End-to-End) testing framework for AppBoardGuru that combines:

- **Playwright**: Microsoft's modern web testing framework
- **MCP (Model Context Protocol)**: AI-powered test generation and analysis
- **Smart Helpers**: Intelligent utilities that make testing easier

### Key Benefits:
✅ **Works Immediately** - Standalone tests run without any setup  
✅ **Smart Element Finding** - Automatically tries multiple strategies to find elements  
✅ **Visual Debugging** - See tests run in a browser with UI mode  
✅ **Auto-Generated Tests** - Click around your app and generate test code  
✅ **Performance Monitoring** - Built-in metrics for page load times  
✅ **Cross-Browser Testing** - Test on Chrome, Firefox, and Safari  

---

## ✅ Installation Status

### Already Installed:
- ✅ Playwright v1.55.0 installed
- ✅ Test framework configured
- ✅ Helper utilities created
- ✅ Example tests ready to run
- ✅ 9 standalone tests verified working

### File Structure Created:
```
appboardguru2/
├── run-playwright-mcp.sh              # 🎯 Main test runner (use this!)
├── playwright-mcp.config.ts           # Configuration file
├── __tests__/e2e/playwright-mcp/
│   ├── tests/
│   │   ├── standalone-test.spec.ts    # ✅ Works without login (9 tests)
│   │   ├── example-tests.spec.ts      # 📚 15 learning examples
│   │   ├── auth-flow.spec.ts          # Authentication tests
│   │   ├── board-management.spec.ts   # Board feature tests
│   │   └── asset-vault-management.spec.ts # File management tests
│   ├── helpers/
│   │   └── mcp-test-helper.ts         # Smart test utilities
│   └── reporters/
│       └── mcp-reporter.ts            # AI-powered reporting
```

---

## 🎮 Running Tests - 3 Methods

### Method 1: Interactive Menu (Easiest) ⭐
```bash
./run-playwright-mcp.sh
```
Menu Options:
1. **Standalone Tests** ← Start here! No login needed
2. All MCP Tests - Full test suite
3. Authentication Tests - Login/logout tests
4. Board Management Tests - Board features
5. Asset & Vault Tests - File management
6. **Open Playwright UI** ← Visual test runner
7. **Run in Debug Mode** ← Step through tests
8. Exit

### Method 2: Direct Commands
```bash
# Run standalone tests (works immediately)
npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts --config=playwright-mcp.config.ts

# Run example tests (15 patterns to learn from)
npx playwright test __tests__/e2e/playwright-mcp/tests/example-tests.spec.ts --config=playwright-mcp.config.ts

# Run all tests
npx playwright test --config=playwright-mcp.config.ts

# Run specific browser
npx playwright test --config=playwright-mcp.config.ts --project=chromium
npx playwright test --config=playwright-mcp.config.ts --project=firefox
npx playwright test --config=playwright-mcp.config.ts --project=webkit
```

### Method 3: Visual/Debug Modes
```bash
# UI Mode - See tests run visually
npx playwright test --ui --config=playwright-mcp.config.ts

# Debug Mode - Step through line by line
npx playwright test --debug --config=playwright-mcp.config.ts

# Headed Mode - Watch browser during tests
npx playwright test --headed --config=playwright-mcp.config.ts

# Generate tests from browser clicks
npx playwright codegen localhost:3001
```

---

## 📁 Test Files Overview

### 1. **standalone-test.spec.ts** ✅ (Works Immediately)
9 tests that work without authentication:
- Landing page loads
- Navigation elements
- Login page accessible
- User interactions
- Performance metrics
- Responsive design (Desktop/Tablet/Mobile)
- Accessibility checks
- Console error monitoring
- Network activity tracking

### 2. **example-tests.spec.ts** 📚 (Learning Resource)
15 complete examples with comments:
1. Simple page load test
2. Clicking buttons and links
3. Filling and submitting forms
4. Smart actions with MCP Helper
5. Waiting for elements
6. Common assertions
7. Handling popups and dialogs
8. File upload and download
9. API testing
10. Performance and accessibility
11. Responsive design testing
12. Debugging techniques
13. Data-driven testing
14. Keyboard and mouse actions
15. Error handling

### 3. **auth-flow.spec.ts** 🔐
11 authentication tests:
- User login/logout
- Registration flow
- Password reset
- Session management
- Role-based access
- OAuth integration
- Multi-factor auth
- Account lockout

### 4. **board-management.spec.ts** 📋
11 board management tests:
- Create new board
- Edit board settings
- Add committees
- Invite members
- Schedule meetings
- Manage documents
- Set permissions
- View analytics
- Track compliance
- Archive boards

### 5. **asset-vault-management.spec.ts** 📁
12 file management tests:
- Upload single file
- Bulk file upload
- Create vaults
- Share assets
- Manage permissions
- Document versioning
- Email-to-asset processing
- Search and filtering
- Add annotations
- Download files
- Archive vaults

---

## ✍️ Writing Your Own Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Runs before each test
    await page.goto('/')
  })
  
  test('should do something', async ({ page }) => {
    // Arrange - Set up test data
    const testData = 'example'
    
    // Act - Perform actions
    await page.click('button')
    await page.fill('#input', testData)
    
    // Assert - Check results
    await expect(page.locator('.result')).toBeVisible()
    await expect(page.locator('.result')).toHaveText(testData)
  })
})
```

### Using the MCP Test Helper
```typescript
import { test } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'

test('test with helper', async ({ page, context }) => {
  const helper = new MCPTestHelper(page, context)
  
  // Smart clicking (tries multiple strategies)
  await helper.smartClick('Submit')
  
  // Smart form filling
  await helper.smartFill('#email', 'test@example.com')
  
  // Generate test data
  const user = helper.generateTestData('user')
  console.log(user) // { email, password, firstName, lastName, role }
  
  // Quick login
  await helper.login('test@example.com', 'password')
  
  // Take screenshot with annotations
  await helper.takeAnnotatedScreenshot('test-complete', [
    { selector: '.success', text: 'Success!' }
  ])
})
```

---

## 🛠️ MCP Test Helper Functions

The MCPTestHelper provides these intelligent functions:

### 1. Smart Element Finding
```typescript
await helper.findElement('Submit')
// Automatically tries:
// 1. data-testid="Submit"
// 2. role="button" with name="Submit"
// 3. text="Submit"
// 4. placeholder="Submit"
// 5. label="Submit"
// 6. CSS selector if all else fails
```

### 2. Smart Actions
```typescript
// Click with retry logic
await helper.smartClick('Submit', {
  retries: 3,     // Try 3 times
  delay: 1000     // Wait 1s between retries
})

// Fill and verify
await helper.smartFill('#email', 'test@example.com')
// Automatically clears, fills, and verifies the value
```

### 3. Test Data Generation
```typescript
// Generate realistic test data
const user = helper.generateTestData('user')
// Returns: {
//   email: 'test.user.1234567@appboardguru.com',
//   password: 'Test123!@#',
//   firstName: 'Test',
//   lastName: 'User1234567',
//   role: 'member'
// }

const org = helper.generateTestData('organization')
const asset = helper.generateTestData('asset')
const vault = helper.generateTestData('vault')
```

### 4. Performance Monitoring
```typescript
const metrics = await helper.collectPerformanceMetrics()
console.log(metrics)
// {
//   domContentLoaded: 150,
//   loadComplete: 300,
//   firstPaint: 100,
//   firstContentfulPaint: 120,
//   memory: { used: 50000000, total: 100000000 }
// }
```

### 5. Accessibility Testing
```typescript
const results = await helper.checkAccessibility()
if (results.violations?.length > 0) {
  console.log('Accessibility issues:', results.violations)
}
```

---

## 📖 Common Test Patterns

### 1. Page Navigation
```typescript
// Go to page
await page.goto('/')
await page.goto('/dashboard')

// Wait for navigation
await page.click('a[href="/about"]')
await page.waitForURL('**/about')

// Go back/forward
await page.goBack()
await page.goForward()
```

### 2. Element Selection (Best Practices)
```typescript
// Best: data-testid
await page.locator('[data-testid="submit"]').click()

// Good: Role
await page.getByRole('button', { name: 'Submit' }).click()

// Good: Label
await page.getByLabel('Email').fill('test@example.com')

// OK: Text
await page.getByText('Submit').click()

// Avoid: Classes (fragile)
await page.locator('.btn-submit').click()
```

### 3. Form Interactions
```typescript
// Text input
await page.fill('#name', 'John Doe')

// Select dropdown
await page.selectOption('#country', 'USA')

// Checkbox
await page.check('#agree')
await page.uncheck('#subscribe')

// Radio button
await page.click('input[type="radio"][value="yes"]')

// File upload
await page.setInputFiles('input[type="file"]', '/path/to/file.pdf')

// Submit
await page.click('button[type="submit"]')
```

### 4. Waiting Strategies
```typescript
// Wait for element
await page.waitForSelector('.content')

// Wait for element to hide
await page.waitForSelector('.loading', { state: 'hidden' })

// Wait for network idle
await page.waitForLoadState('networkidle')

// Wait for specific text
await page.waitForFunction(
  text => document.body.innerText.includes(text),
  'Welcome'
)

// Custom timeout
await page.waitForSelector('.slow', { timeout: 10000 })
```

### 5. Assertions
```typescript
// Visibility
await expect(page.locator('.element')).toBeVisible()
await expect(page.locator('.hidden')).toBeHidden()

// Text
await expect(page.locator('h1')).toHaveText('Welcome')
await expect(page.locator('p')).toContainText('Hello')

// Count
await expect(page.locator('.item')).toHaveCount(5)

// URL/Title
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle('Dashboard')

// Form values
await expect(page.locator('#email')).toHaveValue('test@example.com')

// Enabled/Disabled
await expect(page.locator('button')).toBeEnabled()
await expect(page.locator('input[readonly]')).toBeDisabled()
```

---

## 🐛 Debugging Tests

### 1. Visual UI Mode
```bash
npx playwright test --ui --config=playwright-mcp.config.ts
```
- See tests run step-by-step
- Time travel through test execution
- Inspect DOM at any point
- View network requests

### 2. Debug Mode
```bash
npx playwright test --debug --config=playwright-mcp.config.ts
```
- Set breakpoints
- Step through code
- Inspect variables
- Use browser DevTools

### 3. Screenshots
```typescript
// Take screenshot
await page.screenshot({ path: 'debug.png', fullPage: true })

// Automatic screenshots on failure
// Found in: test-results/
```

### 4. Console Logging
```typescript
// Log browser console
page.on('console', msg => console.log('Browser:', msg.text()))

// Log network
page.on('request', req => console.log('Request:', req.url()))
page.on('response', res => console.log('Response:', res.status()))
```

### 5. Pause Execution
```typescript
// Pause test (in debug mode)
await page.pause()

// Wait specific time
await page.waitForTimeout(2000)  // 2 seconds
```

### 6. View Test Report
```bash
# After tests run
npx playwright show-report

# Reports are in:
# - playwright-report/index.html (HTML)
# - test-results/ (screenshots)
```

---

## 🔧 Troubleshooting Guide

### Issue 1: "No tests found"
**Solution:**
```bash
# Check test file exists
ls __tests__/e2e/playwright-mcp/tests/

# Use full path
npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts --config=playwright-mcp.config.ts
```

### Issue 2: "Browser not installed"
**Solution:**
```bash
# Option 1: Install browsers (optional)
npx playwright install chromium

# Option 2: Just run tests (works without installation)
./run-playwright-mcp.sh
# Select option 1
```

### Issue 3: "Timeout errors"
**Solution:**
```typescript
// Increase timeout in test
test.setTimeout(60000)  // 60 seconds

// Or wait for specific element
await page.waitForSelector('.element', { timeout: 10000 })
```

### Issue 4: "Port 3000 in use"
**Solution:**
```bash
# Your dev server runs on port 3001
export BASE_URL=http://localhost:3001
./run-playwright-mcp.sh
```

### Issue 5: "Element not found"
**Solution:**
```typescript
// Use better selectors
await page.locator('[data-testid="submit"]')  // Best

// Wait for element first
await page.waitForSelector('.element')
await page.locator('.element').click()

// Use MCP helper
await helper.smartClick('Submit')  // Tries multiple strategies
```

### Issue 6: "Login required for tests"
**Solution:**
```bash
# Run standalone tests (no login needed)
./run-playwright-mcp.sh
# Select option 1

# Or run example tests
npx playwright test __tests__/e2e/playwright-mcp/tests/example-tests.spec.ts --config=playwright-mcp.config.ts
```

---

## ✨ Best Practices

### 1. Use Test IDs in Your React Components
```jsx
// In your React code
<button data-testid="submit-form">Submit</button>

// In your test
await page.locator('[data-testid="submit-form"]').click()
```

### 2. Organize Tests Logically
```typescript
test.describe('User Management', () => {
  test.describe('Registration', () => {
    test('valid email', async ({ page }) => {})
    test('invalid email', async ({ page }) => {})
  })
  
  test.describe('Login', () => {
    test('successful login', async ({ page }) => {})
    test('failed login', async ({ page }) => {})
  })
})
```

### 3. Use Page Objects for Complex Pages
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('#email', email)
    await this.page.fill('#password', password)
    await this.page.click('[data-testid="login"]')
  }
}

// In test
const loginPage = new LoginPage(page)
await loginPage.login('test@example.com', 'password')
```

### 4. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => localStorage.clear())
  
  // Take screenshot if failed
  const testInfo = test.info()
  if (testInfo.status !== 'passed') {
    await page.screenshot({ path: `failures/${testInfo.title}.png` })
  }
})
```

### 5. Make Tests Independent
```typescript
// Bad: Tests depend on each other
test('create user', async ({ page }) => {
  // Creates user that next test needs
})

test('edit user', async ({ page }) => {
  // Assumes previous test ran
})

// Good: Each test is independent
test('edit user', async ({ page }) => {
  // Create user first
  await createTestUser()
  // Then test editing
})
```

---

## ⚡ Quick Command Reference

### Essential Commands
```bash
# Run test menu
./run-playwright-mcp.sh

# Run standalone tests (no auth needed)
npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts --config=playwright-mcp.config.ts

# Run example tests
npx playwright test __tests__/e2e/playwright-mcp/tests/example-tests.spec.ts --config=playwright-mcp.config.ts

# UI Mode (visual)
npx playwright test --ui --config=playwright-mcp.config.ts

# Debug mode
npx playwright test --debug --config=playwright-mcp.config.ts

# See browser
npx playwright test --headed --config=playwright-mcp.config.ts

# Generate tests from clicks
npx playwright codegen localhost:3001

# View report
npx playwright show-report

# Get help
npx playwright test --help
```

### Test File Locations
```bash
# Main test directory
cd __tests__/e2e/playwright-mcp/tests/

# List all test files
ls *.spec.ts

# Run specific test file
npx playwright test [filename].spec.ts --config=playwright-mcp.config.ts
```

### Configuration Files
- **Main runner**: `./run-playwright-mcp.sh`
- **Config**: `playwright-mcp.config.ts`
- **Helper**: `__tests__/e2e/playwright-mcp/helpers/mcp-test-helper.ts`
- **Reports**: `playwright-report/`

---

## 🎉 Success Checklist

✅ **Playwright installed** (v1.55.0)  
✅ **9 standalone tests passing**  
✅ **Test runner ready** (`./run-playwright-mcp.sh`)  
✅ **Example tests available** (15 patterns)  
✅ **Helper functions working**  
✅ **Visual UI mode available**  
✅ **Debug mode configured**  
✅ **Test reports generating**  

---

## 🚀 Next Steps

1. **Run your first test**: `./run-playwright-mcp.sh` → Option 1
2. **Explore UI Mode**: `npx playwright test --ui --config=playwright-mcp.config.ts`
3. **Learn from examples**: Review `example-tests.spec.ts`
4. **Write your own test**: Copy a pattern and modify
5. **Generate tests**: `npx playwright codegen localhost:3001`

---

## 📞 Getting More Help

- **Playwright Docs**: https://playwright.dev/docs
- **Example Tests**: `__tests__/e2e/playwright-mcp/tests/example-tests.spec.ts`
- **Quick Reference**: `PLAYWRIGHT_QUICK_REFERENCE.md`
- **Full Guide**: `PLAYWRIGHT_MCP_GUIDE.md`

---

**Remember**: Start with `./run-playwright-mcp.sh` and select Option 1 for immediate success! 🎭✨