# Branded Type System Documentation

## Overview

The AppBoardGuru branded type system provides compile-time type safety by preventing ID confusion and type mixing. It uses TypeScript's nominal typing patterns to create "branded" types that look like strings at runtime but are distinct types at compile time.

## Architecture

### Core Components

1. **Branded Types** (`src/types/branded.ts`) - Central definition of all branded types
2. **Compile-Time Safety** (`src/types/compile-time-safety.ts`) - Advanced type-level safety utilities
3. **Helper Utilities** (`src/lib/utils/branded-type-helpers.ts`) - Migration and conversion helpers
4. **Type Safety Tests** (`src/types/__tests__/branded-type-safety.test.ts`) - Comprehensive test suite

### Design Principles

- **Centralized Definition**: All branded types are defined in a single location
- **Runtime Validation**: Optional validation with detailed error reporting
- **Compile-Time Safety**: Prevents type mixing at build time
- **Backward Compatibility**: Existing code continues to work during migration
- **Developer Experience**: Clear error messages and helpful utilities

## Available Branded Types

### ID Types

```typescript
// User and Organization
UserId, OrganizationId

// Asset Management
AssetId, VaultId, DocumentId, AnnotationId, CommentId

// Board Management
BoardId, BoardMateId, CommitteeId

// Session and Communication
SessionId, SocketId, RoomId

// Notifications and Events
NotificationId, EventId, CalendarEventId, MeetingId

// Document Processing
TocId, SummaryId, PodcastId

// Workflow and Compliance
WorkflowId, RuleId, ComplianceWorkflowId, ActivityLogId

// System
TemplateId, InvitationId
```

### Utility Types

```typescript
// String types
Email, Slug, Url, FilePath, MimeType, JsonString, ISODateString, JWT, ApiKey

// Number types
Percentage, FileSize, Timestamp, Port, Version
```

## Usage Guide

### Basic Usage

#### Creating Branded IDs

```typescript
import { createUserId, createAssetId } from '../types/branded'

// Safe creation with validation
const userResult = createUserId('550e8400-e29b-41d4-a716-446655440000')
if (userResult.success) {
  const userId = userResult.data // UserId type
}

// Unsafe creation (for internal use)
import { unsafeUserId } from '../types/branded'
const userId = unsafeUserId('550e8400-e29b-41d4-a716-446655440000')
```

#### Type Safety in Functions

```typescript
// Functions can enforce specific ID types
function getUserProfile(userId: UserId) {
  // Implementation
}

function getAssetData(assetId: AssetId) {
  // Implementation
}

// This works
getUserProfile(userId)

// This causes a compile error - prevents ID mixing!
// getUserProfile(assetId) // ❌ Compile error
```

#### Converting Between Types

```typescript
import { extractId, convertIdType } from '../types/branded'

// Extract underlying string
const idString = extractId(userId) // string

// Safe conversion between types
const assetResult = convertIdType(userId, createAssetId)
if (assetResult.success) {
  const assetId = assetResult.data // AssetId type
}
```

### Advanced Patterns

#### Organization-Scoped IDs

```typescript
import { createOrgScopedId, extractScope } from '../types/branded'

const scopedAssetResult = createOrgScopedId(
  'asset-123', 
  orgId, 
  createAssetId
)

if (scopedAssetResult.success) {
  const scopedAsset = scopedAssetResult.data
  const scope = extractScope(scopedAsset) // OrganizationId
}
```

#### Batch Operations

```typescript
import { validateBatch, mapBrandedIds } from '../types/branded'

// Validate multiple IDs at once
const batchResult = validateBatch(['id1', 'id2', 'id3'], createUserId)

// Transform IDs with error handling
const { valid, invalid } = mapBrandedIds(userIds, (userId) => 
  convertIdType(userId, createAssetId)
)
```

## Migration Guide

### Step 1: Update Type Imports

Replace imports from scattered branded type files:

```typescript
// Before (scattered imports)
import { UserId } from '../types/database'
import { AssetId } from '../lib/repositories/types'
import { SocketId } from '../types/websocket'

// After (centralized import)
import { UserId, AssetId, SocketId } from '../types/branded'
```

### Step 2: Use Helper Utilities

```typescript
import { BrandedIdMigrator } from '../lib/utils/branded-type-helpers'

// Migrate existing plain string IDs
const migrationResult = BrandedIdMigrator.migrate('user-123', 'UserId', 'user service')

// Batch migration with reporting
const batchResult = BrandedIdMigrator.batchMigrate(
  plainStringIds, 
  'UserId', 
  'user import'
)
console.log(`Migration success rate: ${batchResult.report.successRate}%`)
```

### Step 3: Update API Handlers

```typescript
import { ApiIdExtractor } from '../lib/utils/branded-type-helpers'

// Extract and validate IDs from API requests
export async function handler(request: Request) {
  const body = await request.json()
  
  const userIdResult = ApiIdExtractor.extractId(body, 'userId', 'UserId')
  if (!userIdResult.success) {
    return new Response(userIdResult.error, { status: 400 })
  }
  
  const userId = userIdResult.data
  // Now you have a properly typed UserId
}
```

### Step 4: Update Database Code

```typescript
import { DatabaseIdHelpers } from '../lib/utils/branded-type-helpers'

// Convert branded IDs for database queries
const queryParams = DatabaseIdHelpers.toQueryParams({ userId, orgId })

// Process database results with branded ID mapping
const processedRow = DatabaseIdHelpers.processQueryResult(dbRow, {
  user_id: 'UserId',
  organization_id: 'OrganizationId',
  asset_id: 'AssetId'
})
```

## Best Practices

### 1. Use Validation Constructors for External Input

```typescript
// ✅ Good - validate external input
const userIdResult = createUserId(externalId)
if (userIdResult.success) {
  processUser(userIdResult.data)
}

// ❌ Bad - no validation
const userId = externalId as UserId
```

### 2. Use Unsafe Constructors for Internal/Trusted Data

```typescript
// ✅ Good - internal data you trust
const userId = unsafeUserId(trustedInternalId)

// ❌ Bad - validating already-trusted data
const userIdResult = createUserId(trustedInternalId) // Unnecessary validation
```

### 3. Leverage Compile-Time Safety

```typescript
// ✅ Good - compiler prevents mistakes
function processUserAsset(userId: UserId, assetId: AssetId) {
  // Implementation
}

// ❌ Bad - runtime error possible
function processUserAsset(userId: string, assetId: string) {
  // Could accidentally pass wrong IDs
}
```

### 4. Use Type Guards for Unknown Data

```typescript
// ✅ Good - safe handling of unknown data
function handleUnknownId(value: unknown) {
  if (isUserId(value)) {
    // TypeScript knows this is UserId now
    return processUser(value)
  }
  return null
}
```

### 5. Extract IDs for External APIs

```typescript
// ✅ Good - extract for external consumption
const apiResponse = {
  userId: extractId(userId),
  assetIds: assetIds.map(extractId)
}

// ❌ Bad - branded types in API responses
const apiResponse = {
  userId, // Contains branding information
  assetIds
}
```

## Error Handling

### Validation Errors

```typescript
const result = createUserId('invalid-id')
if (!result.success) {
  console.error(result.error) // "Invalid UserId: ID must be a valid UUID or NanoID format"
  console.error(result.issues) // Detailed validation issues
}
```

### Type Mixing Prevention

```typescript
// Compile-time error prevention
function compareUsers(user1: UserId, user2: UserId) {
  return user1 === user2 // This works
}

// This would cause a compile error:
// compareUsers(userId, assetId) // ❌ Types don't match
```

## Testing

### Unit Tests

```typescript
import { createUserId, isUserId } from '../types/branded'

describe('User ID validation', () => {
  it('should create valid user ID', () => {
    const result = createUserId('550e8400-e29b-41d4-a716-446655440000')
    expect(result.success).toBe(true)
    expect(isUserId(result.data)).toBe(true)
  })
  
  it('should reject invalid user ID', () => {
    const result = createUserId('invalid')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid UserId')
  })
})
```

### Integration Tests

```typescript
describe('API endpoints', () => {
  it('should handle branded IDs correctly', () => {
    const userId = unsafeUserId('550e8400-e29b-41d4-a716-446655440000')
    
    // Test that functions accept branded types
    expect(() => getUserProfile(userId)).not.toThrow()
    
    // Test that API serialization works
    const response = serializeForResponse({ userId })
    expect(typeof response.userId).toBe('string')
  })
})
```

## Troubleshooting

### Common Issues

#### 1. "Type 'string' is not assignable to type 'UserId'"

```typescript
// Problem
const userId: UserId = 'plain-string' // ❌ Error

// Solution
const userId = unsafeUserId('plain-string') // ✅ Fixed
// Or with validation:
const result = createUserId('plain-string')
const userId = result.success ? result.data : null
```

#### 2. "Argument of type 'AssetId' is not assignable to parameter of type 'UserId'"

```typescript
// Problem
function processUser(userId: UserId) { /* ... */ }
processUser(assetId) // ❌ Wrong type

// Solution
// Use the correct ID type, or convert if needed
const userIdResult = convertIdType(assetId, createUserId)
if (userIdResult.success) {
  processUser(userIdResult.data)
}
```

#### 3. Migration Warnings

```typescript
// If you see warnings during migration:
// "Migration warning: Invalid UserId in user service: invalid-format"

// Check your data format and validation:
const result = createUserId(suspiciousId)
if (!result.success) {
  console.log('Fix this ID:', suspiciousId, result.error)
}
```

## Performance Considerations

- **Zero Runtime Cost**: Branded types have no runtime overhead
- **Compile-Time Only**: All type checking happens during build
- **Validation Optional**: Only validate when needed (external input)
- **Memory Efficient**: No additional memory used for branding

## Future Enhancements

- **Code Generation**: Auto-generate branded types from database schema
- **ESLint Rules**: Custom rules to enforce branded type usage
- **IDE Extensions**: Better developer experience with branded types
- **Serialization**: Automatic serialization/deserialization for APIs

## Related Documentation

- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)
- [Database Types Documentation](./DATABASE_TYPES.md)
- [API Development Guidelines](./API_GUIDELINES.md)