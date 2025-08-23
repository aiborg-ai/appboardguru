# Organization Features Test Suite

This document provides an overview of the comprehensive test suite created for the organization features, including the recent navigation fixes and vault-organization integration enhancements.

## Test Coverage Summary

### 1. Unit Tests
**File:** `__tests__/unit/components/organization-detail-page.test.tsx`

**Coverage:**
- Organization detail page component rendering
- Loading states and error handling
- Member management functionality
- Feature display and configuration
- Context updates and navigation
- Responsive behavior
- API integration and data handling

**Key Tests:**
- Component renders loading state correctly
- Organization details display properly
- Error boundaries work for 404 and server errors
- Retry functionality works correctly
- Navigation between pages works
- Mobile viewport handling
- Feature flags display correctly

### 2. Integration Tests
**File:** `__tests__/integration/vault-organization-flow.test.ts`

**Coverage:**
- Vault creation with new organization
- Vault creation with existing organization
- Organization data validation during vault creation
- Duplicate slug handling
- Context refresh after creation
- Feature inheritance from organization to vault
- Transaction rollback scenarios
- Audit logging integration
- Performance of combined operations

**Key Tests:**
- Creating organization during vault creation saves both to database
- Organization membership is properly established
- Duplicate slugs are handled gracefully
- Organization context refreshes correctly
- Features are inherited properly
- Rollback works when vault creation fails
- Performance is acceptable for combined operations

### 3. End-to-End Tests
**File:** `__tests__/e2e/organization-navigation-fixes.spec.ts`

**Coverage:**
- Organization creation navigation flow (fix for redirect to home page)
- Authentication redirect loop prevention
- Complete user journey from creation to management
- Vault-organization integration user flow
- Error handling in user interface
- Debug logging verification

**Key Tests:**
- Organization creation navigates to detail page (not home)
- No authentication redirect loops during creation
- Slug validation and navigation works correctly
- Fallback navigation when slug is missing
- Complete user journey works end-to-end
- Vault creation with organization works in UI
- Error states are handled gracefully
- Debug logging provides proper information

### 4. Error Handling & Edge Cases
**File:** `__tests__/edge-cases/organization-error-handling.test.ts`

**Coverage:**
- Slug generation edge cases (empty, special characters, Unicode, very long)
- Authentication failures (expired tokens, malformed headers, revoked permissions)
- Database connection issues (timeouts, constraint violations, transaction rollbacks)
- Vault-organization creation edge cases
- Context refresh failures
- Validation edge cases (malformed JSON, large payloads, null values)
- Rate limiting scenarios

**Key Tests:**
- Empty slugs are auto-generated from organization name
- Special characters in slugs are normalized
- Very long slugs are truncated appropriately
- Unicode characters are converted to ASCII-safe formats
- Expired JWT tokens return proper 401 errors
- Database timeouts are handled gracefully
- Constraint violations return proper error messages
- Transaction rollbacks work correctly
- Rate limiting protects against burst requests
- Malformed JSON is handled properly

### 5. Performance & Accessibility Tests
**File:** `__tests__/performance/organization-performance.spec.ts`

**Coverage:**
- Page load performance (organizations list, creation, detail pages)
- Rendering performance with large datasets
- Form input responsiveness
- Memory leak detection during navigation
- Accessibility compliance (WCAG 2.1 AA)
- Keyboard navigation support
- Screen reader compatibility
- Responsive design performance
- API performance metrics

**Key Tests:**
- Pages load in under 2-3 seconds
- Large organization lists render efficiently
- No memory leaks during rapid navigation
- Forms respond to input quickly
- All pages pass WCAG accessibility checks
- Keyboard navigation works properly
- ARIA labels and roles are correct
- Mobile viewport performs well
- API operations complete in acceptable time

## Running the Tests

### Prerequisites
```bash
npm install
```

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run organization unit tests specifically
npm run test __tests__/unit/components/organization-detail-page.test.tsx

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run all integration tests
npm run test __tests__/integration/

# Run vault-organization flow tests
npm run test __tests__/integration/vault-organization-flow.test.ts
```

### End-to-End Tests
```bash
# Run all E2E tests
npm run e2e

# Run organization navigation tests specifically
npm run e2e __tests__/e2e/organization-navigation-fixes.spec.ts

# Run with headed browser (visible)
npm run e2e:headed

# Run with debug mode
npm run e2e:debug
```

### Performance Tests
```bash
# Run performance tests
npm run e2e __tests__/performance/organization-performance.spec.ts

# Run accessibility tests only
npm run e2e:accessibility
```

### Edge Case Tests
```bash
# Run error handling tests
npm run test __tests__/edge-cases/organization-error-handling.test.ts
```

## Test Environment Setup

### Required Environment Variables
```env
# Test database
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/test_db
SUPABASE_URL=your-test-supabase-url
SUPABASE_ANON_KEY=your-test-supabase-key

# Test authentication
TEST_JWT_SECRET=your-test-jwt-secret
TEST_ADMIN_EMAIL=admin@e2e-test.com
TEST_ADMIN_PASSWORD=test-password-123
```

### Test Database Setup
```bash
# Create test database
createdb appboardguru_test

# Run migrations
npm run db:migrate
```

## Specific Issues Addressed by Tests

### 1. Organization Creation Redirect Fix
- **Issue:** Organization creation was redirecting to home page instead of organization detail page
- **Tests:** E2E tests verify navigation goes to `/dashboard/organizations/{slug}` after creation
- **Coverage:** `organization-navigation-fixes.spec.ts` lines 15-95

### 2. Authentication Redirect Loop Fix  
- **Issue:** Creating organizations caused authentication redirect loops
- **Tests:** E2E tests monitor for unexpected redirects to login pages
- **Coverage:** `organization-navigation-fixes.spec.ts` lines 97-158

### 3. Vault-Organization Integration
- **Issue:** Organizations created during vault creation weren't showing in organization list
- **Tests:** Integration tests verify database persistence and context refresh
- **Coverage:** `vault-organization-flow.test.ts` lines 15-160

### 4. Missing Dynamic Route Fix
- **Issue:** `/dashboard/organizations/[slug]/page.tsx` was missing causing 404s
- **Tests:** Unit tests for the organization detail page component
- **Coverage:** `organization-detail-page.test.tsx` entire file

### 5. Fallback Navigation
- **Issue:** Navigation should fallback to organizations list when slug is missing
- **Tests:** E2E tests verify fallback behavior
- **Coverage:** `organization-navigation-fixes.spec.ts` lines 75-95

## Test Reports

### Coverage Reports
Tests generate coverage reports in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration

### E2E Reports
Playwright generates test reports in `test-results/` and `playwright-report/`:
- Screenshots of failures
- Video recordings (when enabled)
- Trace files for debugging

### Performance Reports
Performance tests output metrics including:
- Page load times
- Memory usage patterns
- API response times
- Accessibility scan results

## Continuous Integration

### GitHub Actions
Add to `.github/workflows/test.yml`:
```yaml
- name: Run Organization Tests
  run: |
    npm run test __tests__/unit/components/organization-detail-page.test.tsx
    npm run test __tests__/integration/vault-organization-flow.test.ts
    npm run test __tests__/edge-cases/organization-error-handling.test.ts

- name: Run E2E Organization Tests
  run: |
    npm run e2e __tests__/e2e/organization-navigation-fixes.spec.ts
    npm run e2e __tests__/performance/organization-performance.spec.ts
```

## Maintenance Guidelines

### Adding New Tests
1. Follow existing naming conventions
2. Use data factories for test data generation
3. Clean up test data after each test
4. Add appropriate test tags (`@smoke`, `@regression`, `@critical`)
5. Document test purpose and coverage

### Test Data Management
- Use `TestUtils.createTestData()` for consistent test data
- Clean up created organizations/vaults after tests
- Use isolated test database for integration tests
- Mock external API calls in unit tests

### Performance Benchmarks
- Page loads: < 2-3 seconds
- API operations: < 5 seconds
- Memory usage: < 50MB for large lists
- Accessibility: WCAG 2.1 AA compliance

## Troubleshooting

### Common Issues
1. **Test timeouts**: Increase timeout values for slower environments
2. **Database connection**: Ensure test database is running and accessible
3. **Authentication**: Verify test user credentials are correct
4. **Port conflicts**: Ensure test server runs on available port

### Debug Mode
```bash
# Run with debug output
DEBUG=true npm run test

# Run E2E with debug
npm run e2e:debug

# Playwright debug mode
npx playwright test --debug __tests__/e2e/organization-navigation-fixes.spec.ts
```

This comprehensive test suite ensures the organization features work correctly across all scenarios and provides confidence in the navigation fixes and new functionality.