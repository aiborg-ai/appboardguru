# AppBoardGuru Testing Guide

## Overview

This comprehensive testing guide documents our approach to achieving and maintaining 80% test coverage across the AppBoardGuru codebase. Our testing strategy covers unit tests, integration tests, component tests, and performance tests with automated CI/CD integration.

## Test Coverage Goals

- **Overall Target**: 80% coverage across all metrics (lines, functions, branches, statements)
- **Repository Layer**: 85% coverage (critical business logic)
- **Service Layer**: 80% coverage
- **API Controllers**: 75% coverage
- **React Components**: 70% coverage
- **Hooks and Utils**: 75% coverage

## Testing Architecture

### 1. Unit Tests (`__tests__/unit/`)

Unit tests focus on testing individual components, functions, and classes in isolation.

#### Repositories (`__tests__/unit/repositories/`)
```typescript
// Example: Testing UserRepository
describe('UserRepository', () => {
  it('should create user successfully', async () => {
    const userData = UserFactory.build()
    mockSupabase.single.mockResolvedValue({ data: userData, error: null })
    
    const result = await userRepository.create(userData)
    
    expect(result.success).toBe(true)
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining(userData))
  })
})
```

**Key Patterns:**
- Mock external dependencies (Supabase client)
- Test both success and failure scenarios
- Validate result patterns (success/failure)
- Test edge cases and error handling

#### Services (`__tests__/unit/services/`)
```typescript
// Example: Testing AssetService
describe('AssetService', () => {
  it('should validate permissions before upload', async () => {
    mockVaultRepository.validateMemberAccess.mockResolvedValue({ 
      success: false, 
      error: new Error('Access denied') 
    })

    const result = await assetService.uploadAsset(userId, uploadData, fileBuffer)
    
    expect(result.success).toBe(false)
    expect(result.error.message).toContain('Access denied')
  })
})
```

**Key Patterns:**
- Mock repository dependencies
- Test business logic validation
- Test permission and authorization flows
- Test error propagation and handling

### 2. Integration Tests (`__tests__/integration/`)

Integration tests verify that different parts of the system work together correctly.

#### API Integration (`__tests__/integration/api/`)
```typescript
// Example: Testing Assets API
describe('/api/assets', () => {
  it('should return assets with proper authentication', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { vault_id: testVault.id },
      headers: { authorization: 'Bearer mock-jwt-token' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
  })
})
```

**Key Patterns:**
- Use `node-mocks-http` for API testing
- Test complete request/response cycles
- Verify authentication and authorization
- Test error scenarios and status codes

#### Database Transactions (`__tests__/integration/transactions.test.ts`)
```typescript
describe('Transaction System', () => {
  it('should rollback on operation failure', async () => {
    const operations = [
      async () => success({ id: 'user1' }),
      async () => failure(RepositoryError.validation('Invalid data')),
    ]

    const result = await transactionCoordinator.executeTransaction(operations)
    
    expect(result.success).toBe(false)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_transaction')
  })
})
```

### 3. Component Tests (`__tests__/components/`)

Component tests verify React component behavior, rendering, and user interactions.

```typescript
// Example: Testing AssetGrid component
describe('AssetGrid', () => {
  it('should handle asset selection', async () => {
    const mockOnSelectionChange = jest.fn()
    
    renderWithQueryClient(
      <AssetGrid 
        assets={mockAssets}
        selectable={true}
        onSelectionChange={mockOnSelectionChange}
      />
    )

    const checkbox = screen.getByTestId(`asset-checkbox-${mockAssets[0].id}`)
    fireEvent.click(checkbox)

    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockAssets[0].id])
  })
})
```

**Key Patterns:**
- Use React Testing Library
- Test user interactions (clicks, keyboard input)
- Verify accessibility attributes
- Test responsive behavior
- Mock external hooks and services

### 4. Performance Tests (`__tests__/performance/`)

Performance tests ensure components and systems perform efficiently under load.

```typescript
describe('Virtual Scroll Performance', () => {
  it('should render large datasets efficiently', async () => {
    const largeDataset = AssetFactory.buildList(10000)

    const { duration } = await performanceHelpers.measureRenderTime(() => {
      return render(<VirtualScrollList data={largeDataset} />)
    })

    expect(duration).toBeLessThan(100) // Under 100ms
  })
})
```

## Testing Utilities

### Factories (`__tests__/factories/`)

Factories generate consistent test data:

```typescript
// AssetFactory
export const AssetFactory = {
  build: (overrides = {}) => ({
    id: `asset-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Document.pdf',
    file_type: 'application/pdf',
    file_size: 1024 * 1024,
    vault_id: 'vault-123',
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  buildList: (count, overrides = {}) => 
    Array.from({ length: count }, () => AssetFactory.build(overrides))
}
```

### Test Helpers (`__tests__/utils/test-helpers.ts`)

Common utilities for testing:

- **Database Helpers**: Create and manage test data
- **API Helpers**: Mock HTTP requests and responses
- **Performance Helpers**: Measure execution times
- **Assertion Helpers**: Validate common patterns

## Configuration Files

### Jest Configuration (`jest.config.coverage.js`)

```javascript
const customJestConfig = {
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/lib/repositories/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
  },
  
  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
}
```

## CI/CD Integration

### GitHub Actions (`.github/workflows/test-coverage.yml`)

Our CI pipeline:

1. **Parallel Test Execution**: Tests run in parallel across 4 shards
2. **Multiple Node Versions**: Test on Node.js 18.x and 20.x
3. **Database Integration**: PostgreSQL service for integration tests
4. **Coverage Reporting**: Codecov integration and PR comments
5. **Performance Benchmarking**: Track performance regressions

### Test Commands

```bash
# Run all tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:components
npm run test:performance

# CI-specific commands
npm run test:coverage:ci

# Generate coverage report
npm run test:coverage:report
```

## Best Practices

### 1. Test Organization

- **Group by functionality**: Tests should be organized by feature/domain
- **Descriptive naming**: Test names should clearly describe what they test
- **Consistent structure**: Use consistent describe/it block organization

### 2. Mocking Strategy

- **Mock external dependencies**: Database clients, API clients, file systems
- **Use dependency injection**: Make components testable by injecting dependencies
- **Mock at boundaries**: Mock at system boundaries, not internal functions

### 3. Test Data Management

- **Use factories**: Generate consistent test data with factories
- **Isolate tests**: Each test should create its own data
- **Clean up**: Ensure tests clean up after themselves

### 4. Performance Considerations

- **Optimize test speed**: Use appropriate timeouts and parallel execution
- **Mock heavy operations**: Mock file I/O, network calls, database operations
- **Profile slow tests**: Identify and optimize slow test suites

### 5. Error Testing

- **Test error paths**: Ensure error scenarios are covered
- **Validate error messages**: Test that appropriate errors are returned
- **Test error recovery**: Verify systems handle errors gracefully

## Coverage Analysis

### Monitoring Coverage

1. **Local Development**: Run `npm run test:coverage:report` to see detailed coverage
2. **CI Pipeline**: Coverage reports are automatically generated and uploaded
3. **PR Reviews**: Coverage changes are reported on pull requests
4. **Trends**: Track coverage trends over time with Codecov

### Improving Coverage

1. **Identify gaps**: Use coverage reports to find untested code
2. **Prioritize critical paths**: Focus on business-critical functionality
3. **Add integration tests**: Often more effective than many unit tests
4. **Test error scenarios**: Error paths are commonly missed

### Coverage Metrics

- **Lines**: Percentage of code lines executed during tests
- **Functions**: Percentage of functions called during tests
- **Branches**: Percentage of conditional branches tested
- **Statements**: Percentage of statements executed during tests

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation()
  
  // Test loading state
  expect(service.isLoading).toBe(true)
  
  const result = await promise
  
  // Test completed state
  expect(service.isLoading).toBe(false)
  expect(result.success).toBe(true)
})
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  mockRepository.findById.mockResolvedValue({
    success: false,
    error: new Error('Not found')
  })

  const result = await service.getItem('invalid-id')
  
  expect(result.success).toBe(false)
  expect(result.error.message).toBe('Not found')
})
```

### Testing Permissions

```typescript
it('should enforce permissions', async () => {
  mockAuth.getUser.mockResolvedValue({ 
    data: { user: { role: 'viewer' } }
  })

  const result = await service.deleteItem('item-id')
  
  expect(result.success).toBe(false)
  expect(result.error.message).toContain('permission')
})
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or optimize async operations
2. **Flaky tests**: Ensure proper cleanup and avoid race conditions  
3. **Memory leaks**: Check for unclosed resources and event listeners
4. **Coverage gaps**: Add tests for untested branches and error paths

### Debug Commands

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test file
npm test -- UserRepository.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run tests and watch for changes
npm test -- --watch
```

## Conclusion

This testing strategy ensures comprehensive coverage of the AppBoardGuru application while maintaining fast feedback loops and catching issues early. The combination of unit tests, integration tests, component tests, and performance tests provides confidence in the system's reliability and maintainability.

Regular monitoring of coverage metrics and continuous improvement of test quality will help maintain the 80% coverage target and ensure the long-term success of the application.