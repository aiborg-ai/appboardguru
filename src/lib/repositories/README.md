# Repository Pattern Implementation

This directory contains a comprehensive repository abstraction layer that eliminates direct Supabase calls throughout the application, providing better type safety, error handling, and maintainability.

## Architecture Overview

The repository pattern consists of several key components:

### Core Components

- **BaseRepository**: Abstract base class with common CRUD operations, transactions, and utilities
- **Result Pattern**: Consistent error handling with `Result<T>` types
- **Branded Types**: Type-safe IDs (UserId, OrganizationId, etc.)
- **Connection Management**: Database connection pooling and monitoring
- **Repository Factory**: Dependency injection container

### Available Repositories

- **UserRepository**: User authentication, profiles, and preferences
- **OrganizationRepository**: Organization management and membership
- **AssetRepository**: File management, sharing, and annotations
- **VaultRepository**: Vault and permission management
- **NotificationRepository**: Notification system
- **CalendarRepository**: Events and scheduling
- **ComplianceRepository**: Compliance workflows and templates
- **ActivityRepository**: Logging and analytics

## Usage Examples

### Basic Usage

```typescript
import { createServerRepositoryFactory } from '@/lib/repositories'

// In API route
export async function GET() {
  const repositories = await createServerRepositoryFactory()
  
  // Get current user with proper error handling
  const userResult = await repositories.users.getCurrentUserId()
  if (!userResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Find user's organizations
  const orgsResult = await repositories.organizations.findByUser(
    userResult.data,
    { limit: 10, sortBy: 'name' }
  )
  
  if (!orgsResult.success) {
    return NextResponse.json({ 
      error: orgsResult.error.message 
    }, { status: 500 })
  }
  
  return NextResponse.json(orgsResult.data)
}
```

### Client-Side Usage

```typescript
import { createClientRepositoryFactory } from '@/lib/repositories'

const repositories = createClientRepositoryFactory()

// Fetch notifications with filters
const result = await repositories.notifications.findByUserId(
  userId,
  {
    status: 'unread',
    priority: 'high',
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  },
  {
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
)

if (result.success) {
  console.log(`Found ${result.data.total} notifications`)
  console.log(result.data.data) // Paginated results
}
```

### Transaction Example

```typescript
import { createAdminRepositoryFactory } from '@/lib/repositories'

const repositories = createAdminRepositoryFactory()

// Create organization with initial member in a transaction
const result = await repositories.organizations.create(
  {
    name: 'New Organization',
    slug: 'new-org',
    description: 'A new organization'
  },
  creatorUserId // This automatically adds creator as owner
)

if (result.success) {
  console.log('Organization created with owner:', result.data)
}
```

### Error Handling

```typescript
const result = await repositories.users.findById(userId)

if (result.success) {
  const user = result.data
  // Use user data
} else {
  const error = result.error
  
  switch (error.code) {
    case 'NOT_FOUND':
      // Handle user not found
      break
    case 'UNAUTHORIZED':
      // Handle permission error
      break
    case 'VALIDATION_ERROR':
      // Handle validation error
      console.log('Missing fields:', error.details?.missingFields)
      break
    default:
      // Handle other errors
      console.error('Error:', error.message)
  }
}
```

## Migration Guide

### Before (Direct Supabase)

```typescript
export async function GET() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 49)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data })
}
```

### After (Repository Pattern)

```typescript
export async function GET() {
  const repositories = await createServerRepositoryFactory()
  
  const userResult = await repositories.users.getCurrentUserId()
  if (!userResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const notificationsResult = await repositories.notifications.findByUserId(
    userResult.data,
    {}, // filters
    { limit: 50, sortBy: 'created_at', sortOrder: 'desc' }
  )

  if (!notificationsResult.success) {
    return NextResponse.json({ 
      error: notificationsResult.error.message 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    notifications: notificationsResult.data.data,
    total: notificationsResult.data.total,
    pagination: notificationsResult.data
  })
}
```

## Benefits

### 1. Type Safety
- Branded types prevent ID confusion
- Compile-time checking for database operations
- IntelliSense support for all operations

### 2. Consistent Error Handling
- Result pattern eliminates try/catch blocks
- Structured error information with codes and details
- Proper HTTP status mapping

### 3. Automatic Logging
- All operations are automatically logged to audit_logs
- Activity tracking with user context
- Performance monitoring built-in

### 4. Permission Checking
- Built-in organization and vault permission checks
- Consistent authorization patterns
- Proper error responses for unauthorized access

### 5. Connection Management
- Automatic connection pooling
- Query monitoring and metrics
- Health checks and retry logic

## Advanced Features

### Custom Filters and Queries

```typescript
// Complex filtering
const assetsResult = await repositories.assets.findByOrganization(
  organizationId,
  userId,
  {
    category: 'documents',
    file_type: 'pdf',
    tags: ['important', 'board-meeting'],
    dateFrom: new Date('2023-01-01'),
    fileSize: { min: 1000, max: 10000000 }
  },
  {
    limit: 25,
    search: 'quarterly report',
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
)
```

### Statistics and Analytics

```typescript
// Get comprehensive stats
const statsResult = await repositories.compliance.getStats(organizationId, userId)

if (statsResult.success) {
  const stats = statsResult.data
  console.log(`Compliance health score: ${stats.complianceHealth.score}`)
  console.log(`Overdue workflows: ${stats.overdue}`)
  console.log(`Completion rate: ${stats.completionRate}%`)
}
```

### Bulk Operations

```typescript
// Bulk create notifications
const notificationsResult = await repositories.notifications.bulkCreate([
  {
    user_id: userId1,
    type: 'system',
    category: 'maintenance',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight'
  },
  {
    user_id: userId2,
    type: 'system',
    category: 'maintenance',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight'
  }
])
```

## Performance Monitoring

```typescript
import { databaseMonitor, getConnectionPoolStats } from '@/lib/repositories'

// Get performance metrics
const metrics = databaseMonitor.getMetrics()
console.log('Average query latency:', metrics.averageLatency, 'ms')
console.log('Error rate:', metrics.errorRate, '%')

// Get connection pool stats
const poolStats = getConnectionPoolStats()
console.log(`Pool usage: ${poolStats.total}/${poolStats.max}`)
```

## Testing

```typescript
// Test with mock data
import { createClientRepositoryFactory } from '@/lib/repositories'

const repositories = createClientRepositoryFactory()

// Repositories return consistent Result types for easy testing
const result = await repositories.users.create({
  email: 'test@example.com',
  full_name: 'Test User'
})

expect(result.success).toBe(true)
expect(result.data.email).toBe('test@example.com')
```

## Best Practices

1. **Always check Result success**: Never assume operations succeed
2. **Use branded types**: Import and use UserId, OrganizationId, etc.
3. **Handle specific error codes**: Check error.code for appropriate responses
4. **Use appropriate repository factory**: Server for API routes, Client for components
5. **Leverage filtering and pagination**: Use built-in query options instead of manual filtering
6. **Log important operations**: Repositories automatically log to audit trail
7. **Use transactions for multi-step operations**: Repository base class provides transaction support

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional
DB_CONNECTION_POOL_SIZE=10
DB_ENABLE_REALTIME=true
```

This repository pattern provides a robust, type-safe, and maintainable way to interact with your database while eliminating the ~200 direct Supabase calls throughout the application.