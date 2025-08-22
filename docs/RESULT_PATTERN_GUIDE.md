# Result Pattern Implementation Guide

## Overview

The Result pattern is a functional programming approach to error handling that replaces traditional try/catch blocks with explicit success/failure types. This approach provides better type safety, composability, and error recovery strategies.

## Core Types

### Result<T, E>

The Result type represents either a successful operation with data of type `T` or a failed operation with error of type `E`.

```typescript
type Result<T, E = RepositoryError> = 
  | { success: true; data: T; metadata?: Record<string, any> }
  | { success: false; error: E; metadata?: Record<string, any> }
```

### RepositoryError

A comprehensive error class with categorization, severity levels, and recovery information:

```typescript
class RepositoryError {
  code: ErrorCode
  category: ErrorCategory
  message: string
  details?: Record<string, any>
  originalError?: unknown
  timestamp: Date
  context?: Record<string, any>
  recoverable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}
```

## Error Categories and Codes

### Error Categories
- `VALIDATION` - Input validation errors
- `AUTHENTICATION` - User authentication issues
- `AUTHORIZATION` - Permission and access control
- `RESOURCE` - Data not found, conflicts, etc.
- `BUSINESS_RULE` - Domain logic violations
- `DATABASE` - Database operation failures
- `NETWORK` - Network connectivity issues
- `EXTERNAL_SERVICE` - Third-party service failures
- `SYSTEM` - Internal system errors

### Common Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource already exists
- `BUSINESS_RULE_VIOLATION` - Domain rule violated
- `DATABASE_ERROR` - Database operation failed
- `TIMEOUT` - Operation timed out
- `RATE_LIMITED` - Too many requests

## Usage Patterns

### Basic Usage

```typescript
// Service method using Result pattern
async getUserById(userId: string): Promise<Result<User>> {
  // Validation
  if (!userId) {
    return failure(RepositoryError.validation('User ID is required'))
  }

  // Database operation with error handling
  const result = await this.executeDbOperation(
    () => this.repositories.users.findById(userId),
    'get_user_by_id',
    { userId }
  )

  if (!result.success) {
    return failure(result.error)
  }

  if (!result.data) {
    return failure(RepositoryError.notFound('User', userId))
  }

  return success(result.data)
}
```

### Error Handling and Recovery

```typescript
// Using recovery strategies
const result = await this.executeWithRecovery(
  () => this.externalApiCall(),
  'external_services' // Uses retry + fallback strategies
)

// Pattern matching for error handling
const response = match(result, {
  success: (data) => ({ status: 200, data }),
  failure: (error) => ({
    status: getHTTPStatusFromError(error),
    error: {
      code: error.code,
      message: error.message,
      details: error.details
    }
  })
})
```

### Chaining Operations

```typescript
// Chain multiple Result operations
const processUser = async (userId: string): Promise<Result<ProcessedUser>> => {
  const userResult = await this.getUserById(userId)
  if (!userResult.success) {
    return failure(userResult.error)
  }

  const permissionResult = await this.checkPermissions(userResult.data.id)
  if (!permissionResult.success) {
    return failure(permissionResult.error)
  }

  const processed = await this.processUserData(userResult.data)
  return success(processed)
}

// Or use flatMapResult for cleaner chaining
const processUser = async (userId: string): Promise<Result<ProcessedUser>> => {
  return flatMapResult(
    await this.getUserById(userId),
    async (user) => {
      return flatMapResult(
        await this.checkPermissions(user.id),
        async () => success(await this.processUserData(user))
      )
    }
  )
}
```

### Parallel Operations

```typescript
// Execute operations in parallel with Result pattern
const getUserDetails = async (userId: string): Promise<Result<UserDetails>> => {
  const operations = [
    () => this.getUserById(userId),
    () => this.getUserPreferences(userId),
    () => this.getUserOrganizations(userId)
  ]

  const parallelResult = await this.parallel(operations, false) // don't fail fast
  if (!parallelResult.success) {
    return failure(parallelResult.error)
  }

  const [user, preferences, organizations] = parallelResult.data
  return success({ user, preferences, organizations })
}
```

## BaseService Integration

The enhanced BaseService provides Result pattern utilities:

### Key Methods
- `getCurrentUser()` - Returns Result<User>
- `checkPermission()` - Returns Result<boolean>
- `validateInput()` - Returns Result<T>
- `executeDbOperation()` - Wraps DB calls with timeout/retry
- `executeWithRecovery()` - Applies recovery strategies
- `parallel()` - Execute multiple operations in parallel

### Example Service Implementation

```typescript
export class UserService extends BaseService {
  async createUser(data: CreateUserRequest): Promise<Result<User>> {
    // Get current user (authentication)
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return failure(currentUserResult.error)
    }

    // Validate input
    const validationResult = this.validateWithContext(
      data,
      createUserSchema,
      'user creation'
    )
    if (!validationResult.success) {
      return failure(validationResult.error)
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user',
      'create',
      data.organizationId
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Execute database operation
    const createResult = await this.executeDbOperation(
      () => this.repositories.users.create(validationResult.data),
      'create_user',
      { userData: validationResult.data }
    )

    if (!createResult.success) {
      return failure(createResult.error)
    }

    // Log success
    await this.logActivity('create_user', 'user', createResult.data.id)
    
    return success(createResult.data)
  }
}
```

## Recovery Strategies

### Built-in Strategies

1. **RetryStrategy** - Retry operations with exponential backoff
2. **FallbackStrategy** - Provide default values on certain failures
3. **CacheStrategy** - Use cached values when operations fail

### Custom Recovery Strategy

```typescript
const customRecovery: RecoveryStrategy<User> = {
  canRecover: (error) => error.code === ErrorCode.EXTERNAL_SERVICE_ERROR,
  recover: async (error) => {
    // Try alternative data source
    const fallbackResult = await getFallbackUserData()
    return fallbackResult ? success(fallbackResult) : failure(error)
  }
}

// Use in service
const result = await withRecovery(userResult, [customRecovery])
```

## API Integration

### Converting Results to HTTP Responses

```typescript
// API route handler
export async function GET(request: Request) {
  const userId = extractUserIdFromRequest(request)
  const result = await userService.getUserById(userId)
  
  // Convert Result to API response
  const response = resultToAPIResponse(result)
  const status = result.success ? 200 : getHTTPStatusFromError(result.error)
  
  return new Response(JSON.stringify(response), { status })
}

// Or use the enhanced error handler
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = await userService.createUser(data)
    
    if (!result.success) {
      return handleResultError(result.error, response)
    }
    
    return Response.json({ success: true, data: result.data })
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
```

## Best Practices

### 1. Always Validate Inputs
```typescript
// Good
const validationResult = this.validateWithContext(data, schema, 'operation')
if (!validationResult.success) {
  return failure(validationResult.error)
}

// Bad
try {
  const validated = schema.parse(data)
} catch (error) {
  throw new Error('Validation failed')
}
```

### 2. Use Specific Error Types
```typescript
// Good
return failure(RepositoryError.notFound('User', userId))
return failure(RepositoryError.businessRule('age_limit', 'User must be 18+'))

// Bad
return failure(RepositoryError.internal('Something went wrong'))
```

### 3. Implement Graceful Degradation
```typescript
// Continue operation even if non-critical parts fail
const [userResult, preferencesResult, settingsResult] = await Promise.all([
  this.getUser(userId),
  this.getUserPreferences(userId),
  this.getUserSettings(userId)
])

// Main data must succeed, others can fail gracefully
if (!userResult.success) {
  return failure(userResult.error)
}

return success({
  user: userResult.data,
  preferences: preferencesResult.success ? preferencesResult.data : defaultPreferences,
  settings: settingsResult.success ? settingsResult.data : defaultSettings
})
```

### 4. Use Recovery Strategies for External Dependencies
```typescript
// Setup recovery for external API calls
const apiResult = await this.executeWithRecovery(
  () => this.externalApiService.getData(),
  'external_services' // Applies retry + fallback strategies
)
```

### 5. Log Errors with Context
```typescript
const result = await this.executeDbOperation(
  () => this.repository.updateUser(userId, data),
  'update_user',
  { userId, changes: Object.keys(data) } // Helpful context for debugging
)
```

## Testing Result Pattern Code

### Unit Test Examples

```typescript
describe('UserService.createUser', () => {
  it('should return validation error for invalid data', async () => {
    const result = await userService.createUser({ email: 'invalid' })
    
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(result.error.category).toBe(ErrorCategory.VALIDATION)
    }
  })

  it('should return success for valid user creation', async () => {
    const validUser = { email: 'test@example.com', name: 'Test User' }
    const result = await userService.createUser(validUser)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe(validUser.email)
    }
  })

  it('should handle database errors gracefully', async () => {
    jest.spyOn(repository, 'create').mockRejectedValue(new Error('DB Error'))
    
    const result = await userService.createUser(validUser)
    
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.category).toBe(ErrorCategory.DATABASE)
    }
  })
})
```

## Migration from Try/Catch

### Before (Try/Catch)
```typescript
async getUser(userId: string): Promise<User> {
  try {
    if (!userId) {
      throw new Error('User ID required')
    }
    
    const user = await this.repository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}
```

### After (Result Pattern)
```typescript
async getUser(userId: string): Promise<Result<User>> {
  if (!userId) {
    return failure(RepositoryError.validation('User ID required'))
  }

  const result = await this.executeDbOperation(
    () => this.repository.findById(userId),
    'get_user',
    { userId }
  )

  if (!result.success) {
    return failure(result.error)
  }

  if (!result.data) {
    return failure(RepositoryError.notFound('User', userId))
  }

  return success(result.data)
}
```

## Conclusion

The Result pattern provides:
- **Type Safety**: Errors are part of the type system
- **Composability**: Easy to chain and combine operations
- **Recovery**: Built-in error recovery strategies
- **Monitoring**: Rich error context for debugging
- **Consistency**: Uniform error handling across the application

This implementation ensures robust, maintainable, and predictable error handling throughout the AppBoardGuru application.