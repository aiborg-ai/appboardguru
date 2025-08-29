# 🚀 Vercel/Supabase E2E Testing Guide

## Overview

This guide explains how to run E2E tests directly against your deployed AppBoardGuru application on Vercel with Supabase backend. **No local database setup required!**

## ✅ Key Benefits

- **No Local Setup**: Tests run against your actual deployed environment
- **Real Data**: Uses existing test user and data in Supabase
- **Production-Ready**: Test your actual production or staging environment
- **Simple Configuration**: Just run the tests - everything is pre-configured
- **Fast Execution**: No database initialization or seed data required

## 📋 Prerequisites

### Test User (Already in Supabase)
- **Email**: `test.director@appboardguru.com`
- **Password**: `TestDirector123!`
- **Role**: Director/Owner
- **Has**: Organizations, Vaults, Assets, Meetings, Full test data

### Required Software
- Node.js 18+ installed
- npm or yarn
- Playwright (will be installed automatically)

## 🚀 Quick Start (30 Seconds)

```bash
# 1. Run the test menu
./run-vercel-tests.sh

# 2. Select environment (1 for Production)
# 3. Select test suite (4 for Quick Smoke Test)
# Watch tests run!
```

## 📁 File Structure

```
__tests__/e2e/vercel-tests/
├── helpers/
│   └── vercel-test-helper.ts    # Test utilities with correct credentials
├── vercel-auth.spec.ts          # Authentication tests (8 scenarios)
├── vercel-dashboard.spec.ts     # Dashboard tests (11 scenarios)
└── vercel-integration.spec.ts   # (Optional) Full integration tests

Configuration:
├── playwright-vercel.config.ts   # Vercel-specific configuration
├── run-vercel-tests.sh          # Test runner script
└── VERCEL_TESTING_GUIDE.md      # This file
```

## 🎯 Running Tests

### Method 1: Interactive Menu (Recommended)
```bash
./run-vercel-tests.sh
```

Menu options:
1. **All Vercel Tests** - Run complete test suite
2. **Authentication Tests Only** - Test login/logout flows
3. **Dashboard Tests Only** - Test dashboard functionality
4. **Quick Smoke Test** - Fast login verification
5. **Run with UI Mode** - Visual test runner
6. **Run with Debug Mode** - Step through tests
7. **Generate Test Report** - View results
8. **Exit**

### Method 2: Direct Commands

```bash
# Test production environment
VERCEL_URL=https://appboardguru.vercel.app npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts

# Test staging environment
VERCEL_URL=https://appboardguru-staging.vercel.app npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts

# Test local development
VERCEL_URL=http://localhost:3001 npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts

# Run specific test file
npx playwright test __tests__/e2e/vercel-tests/vercel-auth.spec.ts --config=playwright-vercel.config.ts

# Run in UI mode
npx playwright test --ui --config=playwright-vercel.config.ts

# Run in debug mode
npx playwright test --debug --config=playwright-vercel.config.ts
```

### Method 3: Environment Variables

```bash
# Set environment variable
export VERCEL_URL=https://appboardguru.vercel.app

# Run tests
npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts
```

## 📝 Test Suites

### 1. Authentication Tests (`vercel-auth.spec.ts`)
- ✅ Landing page loads
- ✅ Successful login with test.director account
- ✅ Failed login with wrong password
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Protected route access
- ✅ Dashboard navigation
- ✅ User information display

### 2. Dashboard Tests (`vercel-dashboard.spec.ts`)
- ✅ Main dashboard display
- ✅ Organizations listing
- ✅ Boards section
- ✅ Assets section (150+ test assets)
- ✅ Vaults section (3 test vaults)
- ✅ Meetings section
- ✅ Search functionality
- ✅ Notifications/Activity
- ✅ Settings page
- ✅ Responsive design

## 🔧 Configuration

### Test Configuration (`playwright-vercel.config.ts`)
```typescript
{
  // No global setup - uses existing Supabase data
  baseURL: process.env.VERCEL_URL || 'https://appboardguru.vercel.app',
  
  // Test projects
  projects: [
    'chromium',     // Chrome desktop
    'firefox',      // Firefox desktop
    'webkit',       // Safari desktop
    'mobile-chrome', // Mobile Chrome
    'mobile-safari', // Mobile Safari
    'tablet',       // iPad
  ]
}
```

### Environment URLs
- **Production**: `https://appboardguru.vercel.app`
- **Staging**: `https://appboardguru-staging.vercel.app`
- **Local**: `http://localhost:3001`
- **Custom**: Any URL you specify

## 🧪 Test Data

The test user (`test.director@appboardguru.com`) has access to:

### Organizations
- Test Board Organization
- Multiple member organizations

### Vaults (3)
- Board Documents
- Financial Reports
- Legal & Compliance

### Assets (150+)
- Financial reports
- Strategic plans
- Meeting minutes
- Board policies
- Training materials

### Meetings
- Quarterly board reviews
- Committee meetings
- Strategic planning sessions

## 🐛 Debugging

### View Browser During Tests
```bash
npx playwright test --headed --config=playwright-vercel.config.ts
```

### Debug Mode (Step Through)
```bash
npx playwright test --debug --config=playwright-vercel.config.ts
```

### UI Mode (Visual Runner)
```bash
npx playwright test --ui --config=playwright-vercel.config.ts
```

### Screenshots
Screenshots are automatically saved to:
```
test-results-vercel/screenshots/
```

### View Test Report
```bash
npx playwright show-report playwright-report-vercel
```

## 📊 Test Reports

After tests run, you'll find:
- **HTML Report**: `playwright-report-vercel/index.html`
- **Screenshots**: `test-results-vercel/screenshots/`
- **JSON Results**: `test-results/vercel-results.json`
- **Videos**: `test-results-vercel/` (on failure)

## ⚡ CI/CD Integration

### GitHub Actions
```yaml
name: Vercel E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run Vercel E2E Tests
        env:
          VERCEL_URL: ${{ secrets.VERCEL_URL }}
        run: |
          npx playwright test __tests__/e2e/vercel-tests/*.spec.ts \
            --config=playwright-vercel.config.ts
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report-vercel/
```

### Vercel Preview Deployments
```bash
# Test preview deployment
VERCEL_URL=https://appboardguru-git-feature-branch.vercel.app ./run-vercel-tests.sh
```

## 🔐 Security Notes

- Test credentials are for testing only
- Never commit real user credentials
- Use environment variables for sensitive data
- Test user has limited permissions in production
- Regular cleanup of test data recommended

## 🚨 Troubleshooting

### "Connection refused" or timeout
- Check if the Vercel URL is correct
- Verify the deployment is live
- Check network connectivity
- Try increasing timeout in config

### "Login failed"
- Verify test user exists in Supabase
- Check password is correct: `TestDirector123!`
- Ensure Supabase auth is configured

### "Element not found"
- App UI might have changed
- Check selectors in test helper
- Use debug mode to inspect

### "Tests are slow"
- Normal for production testing (network latency)
- Consider testing staging environment
- Use local environment for faster feedback

## 📚 Additional Resources

### Test Files
- `vercel-test-helper.ts` - Helper utilities
- `vercel-auth.spec.ts` - Authentication tests
- `vercel-dashboard.spec.ts` - Dashboard tests

### Configuration
- `playwright-vercel.config.ts` - Playwright config
- `run-vercel-tests.sh` - Test runner script

### Documentation
- `playwright_help.md` - General Playwright guide
- `TEST_ACCOUNTS_DOCUMENTATION.md` - Test user details
- `CLAUDE.md` - Project documentation

## ✅ Best Practices

1. **Run smoke tests first** - Quick validation
2. **Test staging before production** - Safer approach
3. **Use UI mode for debugging** - Visual feedback
4. **Take screenshots** - Document issues
5. **Check test reports** - Detailed results
6. **Keep tests independent** - No test dependencies
7. **Clean up test data** - Periodically clean test artifacts

## 🎯 Quick Commands Reference

```bash
# Run all tests
./run-vercel-tests.sh

# Quick smoke test
./run-vercel-tests.sh
# Select option 4

# Test specific environment
VERCEL_URL=https://your-deployment.vercel.app ./run-vercel-tests.sh

# View report
npx playwright show-report playwright-report-vercel

# Debug mode
npx playwright test --debug --config=playwright-vercel.config.ts

# UI mode
npx playwright test --ui --config=playwright-vercel.config.ts
```

## 🎉 Success!

You're now ready to test your Vercel deployment with real Supabase data. No complex setup required - just run the tests and get immediate feedback on your application's functionality.

**Remember**: The test user `test.director@appboardguru.com` with password `TestDirector123!` is already set up in your Supabase environment with full test data!