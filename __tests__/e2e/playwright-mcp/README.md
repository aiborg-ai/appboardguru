# Playwright MCP E2E Testing Suite for AppBoardGuru

## Overview

This directory contains a comprehensive E2E testing framework that integrates Playwright with MCP (Model Context Protocol) for intelligent test generation, execution, and analysis.

## Features

### 🤖 MCP Integration
- **AI-Assisted Test Generation**: Automatically generate test cases from user interactions
- **Smart Element Selection**: Intelligent fallback strategies for finding elements
- **Automated Assertions**: AI-powered assertion generation
- **Test Recording**: Record user actions and convert to test code
- **Performance Analysis**: Automatic performance metrics collection
- **Accessibility Testing**: Built-in WCAG compliance checking

### 📋 Test Coverage
1. **Authentication Flows**
   - User login/logout
   - Registration
   - Password reset
   - OAuth integration
   - Role-based access control
   - Multi-factor authentication

2. **Board Management**
   - Board creation and configuration
   - Committee management
   - Member invitations and permissions
   - Meeting scheduling
   - Compliance tracking
   - Analytics dashboard

3. **Asset & Vault Management**
   - File upload (single and bulk)
   - Vault creation and permissions
   - Asset sharing
   - Document versioning
   - Email-to-asset processing
   - Annotations and comments

## Installation

### Prerequisites
```bash
# Install Playwright browsers
npx playwright install

# Install system dependencies (if needed)
sudo npx playwright install-deps
```

### Setup
```bash
# Navigate to the MCP test directory
cd __tests__/e2e/playwright-mcp

# Install dependencies
npm install
```

## Configuration

The test suite uses a custom configuration file at `config/playwright-mcp.config.ts` that includes:

- Multiple browser projects (Chrome, Firefox, Safari, Mobile)
- MCP-specific project for code generation
- Custom reporter for AI analysis
- Automatic video recording and screenshots
- Performance monitoring

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# Board management tests
npm run test:board

# Asset and vault tests
npm run test:assets
```

### Interactive Mode
```bash
# Open Playwright UI
npm run test:ui

# Debug mode with browser
npm run test:debug

# Run with visible browser
npm run test:headed
```

### Code Generation
```bash
# Start code generation session
npm run codegen

# Or use MCP code generation project
npm run test:codegen
```

## MCP Test Helper

The `MCPTestHelper` class provides intelligent test utilities:

### Smart Element Finding
```typescript
// Automatically tries multiple strategies
await helper.findElement('Submit Button')
// Tries: test-id, role, text, placeholder, label, title, CSS selector
```

### Smart Actions
```typescript
// Click with retry logic
await helper.smartClick('Submit', { retries: 3, delay: 1000 })

// Fill with validation
await helper.smartFill('#email', 'test@example.com')
```

### Test Data Generation
```typescript
const user = helper.generateTestData('user')
const org = helper.generateTestData('organization')
const asset = helper.generateTestData('asset')
const vault = helper.generateTestData('vault')
```

### Recording & Code Generation
```typescript
// Start recording actions
const recording = await helper.startRecording('my-test')

// Perform actions...

// Stop and generate code
const actions = recording.stop()
const testCode = helper.generateTestCode(actions, 'my-test')
```

### Performance Monitoring
```typescript
const metrics = await helper.collectPerformanceMetrics()
// Returns: domContentLoaded, firstPaint, memory usage, etc.
```

### Accessibility Testing
```typescript
const a11yResults = await helper.checkAccessibility()
// Returns axe-core results with violations
```

## MCP Reporter

The custom MCP reporter provides:

### Test Analysis
- Automatic failure pattern detection
- Performance metrics collection
- Test execution insights
- AI-powered suggestions

### Output Files
- `reports/mcp-results.json` - Structured test results for AI analysis
- `reports/html/index.html` - Interactive HTML report
- `reports/junit.xml` - JUnit format for CI/CD

### View Reports
```bash
npm run report
```

## CI/CD Integration

### GitHub Actions
```yaml
name: E2E Tests with MCP

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm test
        working-directory: __tests__/e2e/playwright-mcp
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: __tests__/e2e/playwright-mcp/reports/
```

## Best Practices

### 1. Use Test IDs
Add `data-testid` attributes to your components:
```tsx
<button data-testid="submit-button">Submit</button>
```

### 2. Page Object Model
Create page objects for complex pages:
```typescript
class DashboardPage {
  constructor(private page: Page) {}
  
  async navigateToBoards() {
    await this.page.click('[data-testid="boards-nav"]')
  }
}
```

### 3. Test Data Cleanup
Always clean up test data:
```typescript
test.afterEach(async () => {
  // Clean up created resources
})
```

### 4. Use Fixtures
Create reusable test fixtures:
```typescript
const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await login(page)
    await use(page)
    await logout(page)
  }
})
```

## Troubleshooting

### Browser Installation Issues
```bash
# Install with system dependencies
sudo npx playwright install-deps

# Or install specific browser
npx playwright install chromium
```

### Timeout Issues
Increase timeout in config:
```typescript
use: {
  timeout: 60000, // 60 seconds
}
```

### Flaky Tests
Use retry logic:
```typescript
retries: process.env.CI ? 2 : 1
```

### Debugging
```bash
# Run with debug output
DEBUG=pw:api npm test

# Use inspector
npm run test:debug
```

## Advanced Features

### Custom Assertions
```typescript
expect.extend({
  async toHaveCustomProperty(received, property) {
    // Custom assertion logic
  }
})
```

### Network Mocking
```typescript
await page.route('**/api/*', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ mocked: true })
  })
})
```

### Visual Testing
```typescript
await expect(page).toHaveScreenshot('dashboard.png')
```

### API Testing
```typescript
const response = await page.request.post('/api/login', {
  data: { email: 'test@example.com', password: 'password' }
})
expect(response.ok()).toBeTruthy()
```

## Contributing

1. Follow the existing test patterns
2. Use the MCPTestHelper for common operations
3. Add data-testid attributes for new UI elements
4. Write descriptive test names
5. Include both positive and negative test cases
6. Document any new helper methods

## Support

For issues or questions:
- Check existing tests for examples
- Review Playwright documentation
- Consult the MCP integration guide
- Contact the development team

## License

Copyright © 2025 AppBoardGuru. All rights reserved.