# Playwright Testing Guide for AppBoardGuru

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Test Structure](#test-structure)
4. [Running Tests](#running-tests)
5. [Test Suites](#test-suites)
6. [Writing Tests](#writing-tests)
7. [Configuration](#configuration)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive documentation for Playwright end-to-end testing in the AppBoardGuru application. Our test suite covers all major functionality including authentication, dashboard navigation, asset management, vault operations, organization management, boardmates, and meetings.

## Installation

### Prerequisites
- Node.js 18+ installed
- AppBoardGuru application running locally or deployed
- Test user account created

### Install Playwright

```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

### Environment Setup

Create a `.env.test` file in the project root:

```env
# Test Environment Variables
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test.director@appboardguru.com
TEST_USER_PASSWORD=TestDirector123!

# Optional: For CI/CD
CI=false
HEADLESS=false
SLOW_MO=0
```

## Test Structure

```
tests/
├── e2e/
│   ├── .auth/              # Auth state storage (gitignored)
│   │   └── user.json        # Saved authentication state
│   ├── auth/
│   │   ├── auth.setup.ts   # Authentication setup
│   │   └── login.spec.ts   # Login flow tests
│   ├── dashboard/
│   │   └── navigation.spec.ts
│   ├── assets/
│   │   └── asset-management.spec.ts
│   ├── vaults/
│   │   └── vault-management.spec.ts
│   ├── organizations/
│   │   └── organization-management.spec.ts
│   ├── boardmates/
│   │   └── boardmates.spec.ts
│   └── meetings/
│       └── meeting-management.spec.ts
├── fixtures/               # Test fixtures and data
├── helpers/               # Utility functions
└── playwright.config.ts   # Playwright configuration
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npx playwright test

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test file
npx playwright test tests/e2e/auth/login.spec.ts

# Run tests matching a pattern
npx playwright test -g "should login"

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run with UI mode (recommended for development)
npx playwright test --ui
```

### NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:chrome": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:webkit": "playwright test --project=webkit",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen http://localhost:3000"
  }
}
```

### Parallel Execution

```bash
# Run tests in parallel (default)
npx playwright test

# Run tests sequentially
npx playwright test --workers=1

# Set specific number of workers
npx playwright test --workers=4
```

## Test Suites

### 1. Authentication Tests (`auth/`)
- Login with valid credentials
- Login with invalid credentials
- Password reset flow
- Remember me functionality
- Logout functionality
- Session persistence

### 2. Dashboard Navigation (`dashboard/`)
- Main navigation menu
- Sidebar navigation
- Breadcrumb navigation
- Responsive menu behavior
- Search functionality
- User profile menu
- Notifications panel

### 3. Asset Management (`assets/`)
- View assets list
- Upload single file
- Bulk file upload
- Search and filter assets
- Sort assets
- View asset details
- Delete assets
- Drag and drop upload
- File validation

### 4. Vault Management (`vaults/`)
- Create new vault (wizard flow)
- View vault details
- Upload documents to vault
- Manage vault members
- Edit vault settings
- Delete vault
- Search vault documents
- View activity log
- Export vault contents

### 5. Organization Management (`organizations/`)
- Create organization
- View organization details
- Add/remove members
- Manage roles
- Update settings
- Switch organizations
- View activity
- Billing management
- Delete organization

### 6. BoardMates Management (`boardmates/`)
- Add boardmate (wizard flow)
- View boardmate profile
- Edit boardmate information
- Filter by board type
- Search boardmates
- Manage committees
- Export boardmates list
- Send messages
- Remove boardmate
- View activity history

### 7. Meeting Management (`meetings/`)
- Schedule meeting
- View meeting details
- Add agenda items
- Upload documents
- Manage attendees
- Edit meeting details
- Cancel meeting
- Record minutes
- Manage recordings
- Calendar view
- Send reminders
- Mark attendance

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/path');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('selector');
    
    // Act
    await element.click();
    
    // Assert
    await expect(element).toBeVisible();
  });
});
```

### Common Patterns

#### 1. Page Object Model
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

#### 2. Custom Fixtures
```typescript
// fixtures/test.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

export const test = base.extend<{
  loginPage: LoginPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

#### 3. Data-Driven Tests
```typescript
const testData = [
  { email: 'user1@test.com', password: 'pass1' },
  { email: 'user2@test.com', password: 'pass2' },
];

testData.forEach(({ email, password }) => {
  test(`login with ${email}`, async ({ page }) => {
    // Test implementation
  });
});
```

## Configuration

### playwright.config.ts

Key configuration options:

```typescript
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  // Retries
  retries: process.env.CI ? 2 : 0,
  
  // Timeout
  timeout: 60000,
  
  // Base URL
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Projects (browsers)
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  
  // Dev server
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
        
      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Vercel Integration

```json
// vercel.json
{
  "github": {
    "silent": true
  },
  "functions": {
    "tests/e2e/**/*.spec.ts": {
      "includeFiles": "tests/**"
    }
  }
}
```

## Best Practices

### 1. Selectors
```typescript
// ❌ Bad: Brittle selectors
await page.click('.btn-primary-2xl-blue');

// ✅ Good: Semantic selectors
await page.click('button:has-text("Submit")');
await page.click('[data-testid="submit-button"]');
await page.click('button[type="submit"]');
```

### 2. Waits and Timeouts
```typescript
// ❌ Bad: Hard-coded waits
await page.waitForTimeout(5000);

// ✅ Good: Wait for specific conditions
await page.waitForLoadState('networkidle');
await page.waitForSelector('.content', { state: 'visible' });
await expect(page.locator('.spinner')).toBeHidden();
```

### 3. Assertions
```typescript
// ❌ Bad: No timeout
expect(await page.locator('.message').textContent()).toBe('Success');

// ✅ Good: Auto-waiting assertions
await expect(page.locator('.message')).toHaveText('Success');
await expect(page.locator('.modal')).toBeVisible({ timeout: 10000 });
```

### 4. Test Isolation
```typescript
// ✅ Good: Each test is independent
test.beforeEach(async ({ page }) => {
  // Reset to known state
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});
```

### 5. Error Handling
```typescript
// ✅ Good: Handle expected failures gracefully
const element = page.locator('.optional-element');
if (await element.count() > 0) {
  await element.click();
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Issues
```bash
# Clear auth state
rm -rf tests/e2e/.auth/

# Re-run setup
npx playwright test --project=setup
```

#### 2. Timeout Errors
```typescript
// Increase timeout for slow operations
await page.click('button', { timeout: 30000 });
await expect(page.locator('.result')).toBeVisible({ timeout: 15000 });
```

#### 3. Flaky Tests
```typescript
// Add retry logic
for (let i = 0; i < 3; i++) {
  try {
    await page.click('.sometimes-not-ready');
    break;
  } catch (e) {
    if (i === 2) throw e;
    await page.waitForTimeout(1000);
  }
}
```

#### 4. Element Not Found
```typescript
// Debug selectors
await page.pause(); // Opens inspector
await page.locator('selector').highlight(); // Highlights element
```

### Debug Commands

```bash
# Generate test code
npx playwright codegen http://localhost:3000

# Open test report
npx playwright show-report

# Run in debug mode
PWDEBUG=1 npx playwright test

# Run with verbose logging
DEBUG=pw:api npx playwright test

# Take screenshots on each step
npx playwright test --screenshot=on
```

### Accessibility Testing

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

## Performance Testing

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000); // 3 seconds
  
  // Measure Core Web Vitals
  const metrics = await page.evaluate(() => {
    return {
      FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      LCP: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
    };
  });
  
  expect(metrics.FCP).toBeLessThan(1800); // 1.8s
  expect(metrics.LCP).toBeLessThan(2500); // 2.5s
});
```

## Visual Testing

```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  });
});
```

## API Testing Integration

```typescript
test('API and UI integration', async ({ page, request }) => {
  // Create data via API
  const response = await request.post('/api/assets', {
    data: { title: 'Test Asset' }
  });
  const asset = await response.json();
  
  // Verify in UI
  await page.goto('/dashboard/assets');
  await expect(page.locator(`text="${asset.title}"`)).toBeVisible();
  
  // Clean up
  await request.delete(`/api/assets/${asset.id}`);
});
```

## Mobile Testing

```typescript
// Test on mobile devices
test.describe('Mobile', () => {
  test.use({ ...devices['iPhone 12'] });
  
  test('responsive design', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.mobile-menu')).toBeVisible();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review test output and reports
3. Enable debug mode for detailed logs
4. Contact the development team

---

**Last Updated:** December 2024
**Playwright Version:** Latest
**Test Coverage:** Authentication, Dashboard, Assets, Vaults, Organizations, BoardMates, Meetings