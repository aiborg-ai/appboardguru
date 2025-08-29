# 🎭 Playwright MCP Quick Reference Card

## 🚀 Quick Start (30 seconds)
```bash
# 1. Start dev server
npm run dev

# 2. Run test menu
./run-playwright-mcp.sh

# 3. Select option 1 (Standalone Tests)
```

## 📋 Test Menu Options
1. **Standalone Tests** ← Start here! (No login needed)
2. All MCP Tests (Full suite)
3. Authentication Tests
4. Board Management Tests
5. Asset & Vault Tests
6. **UI Mode** ← Visual test runner
7. **Debug Mode** ← Step through tests
8. Exit

## ⌨️ Essential Commands
```bash
# Interactive menu (easiest)
./run-playwright-mcp.sh

# Run specific tests
npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts --config=playwright-mcp.config.ts

# Visual UI mode
npx playwright test --ui --config=playwright-mcp.config.ts

# Debug mode
npx playwright test --debug --config=playwright-mcp.config.ts

# See browser while testing
npx playwright test --headed --config=playwright-mcp.config.ts

# Generate tests from clicks
npx playwright codegen localhost:3001

# View test report
npx playwright show-report
```

## 🎯 Smart Test Helper Functions
```typescript
import { MCPTestHelper } from '../helpers/mcp-test-helper'

const helper = new MCPTestHelper(page, context)

// Smart clicking (tries multiple strategies)
await helper.smartClick('Submit')

// Smart form filling
await helper.smartFill('#email', 'test@example.com')

// Generate test data
const user = helper.generateTestData('user')
const org = helper.generateTestData('organization')
const asset = helper.generateTestData('asset')
const vault = helper.generateTestData('vault')

// Quick login
await helper.login('test@example.com', 'password')

// Performance metrics
const metrics = await helper.collectPerformanceMetrics()

// Accessibility check
const a11y = await helper.checkAccessibility()

// Annotated screenshot
await helper.takeAnnotatedScreenshot('name', [
  { selector: '#element', text: 'Note' }
])
```

## 📝 Basic Test Structure
```typescript
import { test, expect } from '@playwright/test'

test('test name', async ({ page }) => {
  // Navigate
  await page.goto('/')
  
  // Click
  await page.click('button')
  
  // Fill form
  await page.fill('#input', 'value')
  
  // Assert
  await expect(page.locator('.result')).toBeVisible()
})
```

## 🔍 Selectors (Best to Worst)
```typescript
// 1. Test ID (Best)
await page.locator('[data-testid="submit"]')

// 2. Role
await page.getByRole('button', { name: 'Submit' })

// 3. Label
await page.getByLabel('Email')

// 4. Placeholder
await page.getByPlaceholder('Enter email')

// 5. Text
await page.getByText('Submit')

// 6. ID
await page.locator('#submit')

// 7. Class (Avoid)
await page.locator('.btn-submit')
```

## ✅ Common Assertions
```typescript
// Visibility
await expect(page.locator('.element')).toBeVisible()
await expect(page.locator('.element')).toBeHidden()

// Text content
await expect(page.locator('.element')).toHaveText('Hello')
await expect(page.locator('.element')).toContainText('Hello')

// Count
await expect(page.locator('.item')).toHaveCount(5)

// URL
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle('Dashboard')

// Form values
await expect(page.locator('#input')).toHaveValue('test')

// Attributes
await expect(page.locator('button')).toBeEnabled()
await expect(page.locator('button')).toBeDisabled()
```

## 🐛 Debugging Tips
```bash
# Visual UI Mode
npx playwright test --ui

# Step-by-step debug
npx playwright test --debug

# See browser
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=1000

# Take screenshots
await page.screenshot({ path: 'debug.png' })

# Pause test
await page.pause()
```

## 📊 View Results
```bash
# HTML report
npx playwright show-report

# Results location
cat playwright-report/index.html
cat test-results/results.json
ls test-results/  # Screenshots
```

## ⚠️ Common Fixes

**"No tests found"**
```bash
# Use explicit path
npx playwright test path/to/test.spec.ts --config=playwright-mcp.config.ts
```

**"Timeout errors"**
```typescript
test.setTimeout(60000)  // Increase timeout
```

**"Element not found"**
```typescript
// Wait for element first
await page.waitForSelector('.element')
await page.locator('.element').click()
```

**"Port 3000 in use"**
```bash
# Your dev server is on 3001
export BASE_URL=http://localhost:3001
```

## 📁 File Locations
- **Tests**: `__tests__/e2e/playwright-mcp/tests/`
- **Helper**: `__tests__/e2e/playwright-mcp/helpers/mcp-test-helper.ts`
- **Config**: `playwright-mcp.config.ts`
- **Runner**: `./run-playwright-mcp.sh`
- **Reports**: `playwright-report/`
- **Screenshots**: `test-results/`

## 🎬 Generate Tests from Browser
```bash
# Opens browser - click around and it generates code!
npx playwright codegen localhost:3001
```

## 💡 Pro Tips
1. **Start with standalone tests** - They work without login
2. **Use UI mode** for visual debugging
3. **Use test IDs** in your React components
4. **Take screenshots** when debugging
5. **Run headed mode** to see what's happening

---

**Quick Help**: `npx playwright test --help`  
**Full Guide**: See `PLAYWRIGHT_MCP_GUIDE.md`  
**Start Testing**: `./run-playwright-mcp.sh` → Option 1