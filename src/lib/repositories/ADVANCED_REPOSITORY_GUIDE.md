# Advanced Repository Layer Integration Guide

This guide covers the integration and usage of the enhanced repository layer features including type-safe query builders, intelligent caching, batch operations, optimistic locking, saga transactions, and performance monitoring.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Type-Safe Query Builder](#type-safe-query-builder)
4. [Intelligent Caching](#intelligent-caching)
5. [Batch Operations](#batch-operations)
6. [Optimistic Locking](#optimistic-locking)
7. [Transaction Management](#transaction-management)
8. [Performance Monitoring](#performance-monitoring)
9. [Migration Guide](#migration-guide)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Basic Enhanced Repository

```typescript
import { EnhancedUserRepository } from '@/lib/repositories/enhanced-user.repository'
import { PerformanceMonitor } from '@/lib/repositories/performance/performance-monitor'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Initialize components
const supabase = await createSupabaseServerClient()
const performanceMonitor = new PerformanceMonitor()
const userRepository = new EnhancedUserRepository(supabase, performanceMonitor)

// Start performance monitoring
performanceMonitor.start({ enableAlerting: true })

// Use enhanced features
const result = await userRepository.findById('user-123')
if (result.success) {
  console.log('User:', result.data)
  console.log('Cache hit:', result.metadata?.cached)
}
```

### 2. Type-Safe Query Building

```typescript
import { createQueryBuilder } from '@/lib/repositories/query-builder'

const users = await createQueryBuilder('users')
  .select('id', 'email', 'full_name')
  .whereEqual('is_active', true)
  .whereIn('role', ['admin', 'user'])
  .orderBy('created_at', false)
  .page(1, 20)
  .execute(supabase)
```

### 3. Batch Operations

```typescript
const batchResult = await userRepository.createBatch({
  users: [
    { email: 'user1@example.com', full_name: 'User One' },
    { email: 'user2@example.com', full_name: 'User Two' }
  ],
  sendWelcomeEmail: true,
  assignToOrganization: 'org-123'
})

if (batchResult.success) {
  console.log(`Created ${batchResult.data.successful.length} users`)
}
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                Enhanced Repository Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Type-Safe      │  │   Intelligent   │  │   Performance   │ │
│  │ Query Builder   │  │     Caching     │  │   Monitoring    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │     Batch       │  │   Optimistic    │  │   Transaction   │ │
│  │   Operations    │  │    Locking      │  │   Management    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Base Repository Layer                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Supabase Client                            │
└─────────────────────────────────────────────────────────────────┘
```

## Type-Safe Query Builder

### Features

- **Type-safe field selection**: IntelliSense for available columns
- **Fluent API**: Chainable methods for building queries
- **Complex filtering**: Support for AND/OR conditions, ranges, patterns
- **Join operations**: Type-safe joins with related tables
- **Pagination**: Built-in offset and cursor-based pagination
- **Sorting**: Multi-column sorting with null handling
- **Aggregations**: COUNT, SUM, AVG, MIN, MAX with grouping

### Basic Usage

```typescript
import { createQueryBuilder, QueryTemplates } from '@/lib/repositories/query-builder'

// Simple query
const basicQuery = createQueryBuilder('users')
  .select('id', 'email', 'full_name')
  .whereEqual('is_active', true)
  .limit(10)

// Complex query with joins
const complexQuery = createQueryBuilder('users')
  .selectAll()
  .innerJoin('organization_members', 'organization_id,role,status')
  .whereEqual('organization_members.status', 'active')
  .whereLike('email', '%@company.com')
  .orderBy('created_at', false)
  .page(2, 25)

// Execute queries
const result = await complexQuery.execute(supabase)
```

### Advanced Filtering

```typescript
// Date range filtering
const recentUsers = createQueryBuilder('users')
  .selectAll()
  .whereDateRange('created_at', thirtyDaysAgo, new Date())

// OR conditions
const adminOrActive = createQueryBuilder('users')
  .selectAll()
  .whereOr([
    { field: 'role', operator: 'eq', value: 'admin' },
    { field: 'is_active', operator: 'eq', value: true }
  ])

// Full-text search
const searchResults = createQueryBuilder('users')
  .selectAll()
  .search('john doe', ['full_name', 'email', 'username'])
```

### Query Templates

```typescript
// Use pre-built templates
const activeUsersQuery = QueryTemplates.activeOnly(
  createQueryBuilder('users').selectAll()
)

const recentUsersQuery = QueryTemplates.recent(
  createQueryBuilder('users').selectAll(),
  'created_at'
)

const orgUsersQuery = QueryTemplates.forOrganization(
  createQueryBuilder('users').selectAll(),
  'org-123'
)
```

## Intelligent Caching

### Cache Layers

The caching system uses multiple layers with automatic promotion:

1. **Memory Cache**: Fastest, limited size (~1000 items)
2. **Database Cache**: Persistent, larger capacity
3. **Optional Redis**: Distributed caching for multi-instance deployments

### Cache Configuration Presets

```typescript
import { CachePresets, CacheConfigBuilder } from '@/lib/repositories/cached-repository'

// Use presets
const userConfig = CachePresets.USER_DATA    // 5 minutes TTL
const staticConfig = CachePresets.STATIC_DATA // 30 minutes TTL
const configConfig = CachePresets.CONFIG_DATA // 1 hour TTL

// Custom configuration
const customConfig = CacheConfigBuilder.create()
  .ttl(600)                    // 10 minutes
  .priority('high')
  .tags('users', 'profiles')
  .varyBy('organization_id')
  .build()
```

### Implementing Cached Repository

```typescript
import { CachedRepository } from '@/lib/repositories/cached-repository'

class CachedUserRepository extends CachedRepository {
  protected getEntityName(): string { return 'User' }
  protected getSearchFields(): string[] { return ['email', 'full_name'] }
  protected getTableName(): string { return 'users' }

  async findById(id: string): Promise<Result<User | null>> {
    return this.cachedFindById(
      id,
      async () => {
        // Your query logic here
        const { data, error } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()
          
        return this.createResult(data, error, 'findById')
      },
      CachePresets.USER_DATA
    )
  }

  async searchUsers(filters: any): Promise<Result<User[]>> {
    return this.cachedSearch(
      filters,
      async () => {
        // Your search logic here
      },
      CachePresets.USER_DATA
    )
  }
}
```

### Cache Management

```typescript
// Clear specific patterns
await repository.clearCache(['users:findById:*'])

// Get cache statistics
const stats = await repository.getCacheStatistics()
if (stats.success) {
  console.log(`Hit rate: ${stats.data.hitRate * 100}%`)
  console.log(`Cache size: ${stats.data.cacheSize} items`)
}

// Warm cache with common data
await repository.warmCache([
  {
    keys: ['users:popular', 'users:recent'],
    priority: 'high',
    customLogic: async () => {
      // Custom warming logic
    }
  }
])
```

## Batch Operations

### Basic Batch Operations

```typescript
import { EnhancedBaseRepository, BatchOperation } from '@/lib/repositories/enhanced-base'

// Create multiple records
const createOperations: BatchOperation<UserInsert>[] = users.map(user => ({
  type: 'create',
  data: user
}))

const result = await repository.executeBatch(createOperations, {
  continueOnError: true,
  batchSize: 50
})

// Update multiple records
const updateOperations = updates.map(({ id, data }) => ({
  type: 'update',
  id,
  data
}))

const updateResult = await repository.executeBatch(updateOperations)
```

### High-Level Batch Methods

```typescript
// Batch create
const users = [
  { email: 'user1@example.com', full_name: 'User One' },
  { email: 'user2@example.com', full_name: 'User Two' }
]

const createResult = await repository.createMany(users, {
  continueOnError: true
})

// Batch update
const updates = [
  { id: 'user-1', data: { full_name: 'Updated Name 1' } },
  { id: 'user-2', data: { full_name: 'Updated Name 2' } }
]

const updateResult = await repository.updateMany(updates)

// Batch delete (soft delete)
const deleteResult = await repository.deleteMany(['user-3', 'user-4'], {
  soft: true
})
```

### Error Handling in Batches

```typescript
const result = await repository.executeBatch(operations)

if (result.success) {
  const { successful, failed, total } = result.data
  
  console.log(`Processed ${total} operations`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)
  
  // Handle failed operations
  failed.forEach(({ operation, error }) => {
    console.error(`Failed to ${operation.type}:`, error.message)
  })
}
```

## Optimistic Locking

### Basic Usage

```typescript
// Update with version check
const user = await repository.findById('user-123')
if (user.success && user.data) {
  const updateResult = await repository.updateWithLock(
    user.data.id,
    { full_name: 'Updated Name' },
    user.data.version // Expected version
  )
  
  if (!updateResult.success) {
    if (updateResult.error.code === 'CONFLICT') {
      // Handle version mismatch - reload and retry
      console.log('User was modified by another process')
    }
  }
}
```

### Batch Optimistic Updates

```typescript
const updates = [
  { id: 'user-1', expectedVersion: 5, data: { full_name: 'Name 1' } },
  { id: 'user-2', expectedVersion: 3, data: { full_name: 'Name 2' } }
]

const batchResult = await repository.updateManyWithOptimisticLock(updates, {
  continueOnError: true
})
```

### Working with Versioned Entities

```typescript
import { OptimisticLockingUtils } from '@/lib/repositories/enhanced-base'

// Check if entity supports versioning
if (OptimisticLockingUtils.isVersioned(entity)) {
  // Create update operation
  const updateOp = OptimisticLockingUtils.createUpdate(entity, {
    full_name: 'New Name'
  })
  
  // Validate version
  const versionCheck = OptimisticLockingUtils.validateVersion(entity, expectedVersion)
  if (!versionCheck.success) {
    console.log('Version mismatch detected')
  }
}
```

## Transaction Management

### Saga Pattern for Distributed Transactions

```typescript
import { SagaOrchestrator, SagaDefinition } from '@/lib/repositories/transaction-manager'

// Create saga orchestrator
const orchestrator = new SagaOrchestrator(supabase)

// Define saga
const userOnboardingSaga: SagaDefinition = {
  id: 'user_onboarding',
  name: 'User Onboarding Process',
  steps: [
    {
      id: 'create_user',
      name: 'Create User Account',
      action: async (input, context) => {
        // Create user logic
        return success(newUser)
      },
      compensation: async (output, context) => {
        // Rollback user creation
        await deleteUser(output.id)
        return success(undefined)
      }
    },
    {
      id: 'assign_permissions',
      name: 'Assign Default Permissions',
      action: async (input, context) => {
        const user = context.stepResults.get('create_user')
        // Assign permissions logic
        return success(permissions)
      },
      compensation: async (output, context) => {
        // Remove permissions
        return success(undefined)
      },
      dependencies: ['create_user']
    },
    {
      id: 'send_welcome_email',
      name: 'Send Welcome Email',
      action: async (input, context) => {
        // Send email logic
        return success({ emailSent: true })
      },
      compensation: async (output, context) => {
        // Can't unsend email, but could send cancellation
        return success(undefined)
      },
      dependencies: ['create_user']
    }
  ]
}

// Register and execute saga
orchestrator.registerSaga(userOnboardingSaga)

const execution = await orchestrator.startSaga('user_onboarding', {
  email: 'user@example.com',
  full_name: 'New User'
})
```

### Simple Transactions

```typescript
import { TransactionManager } from '@/lib/repositories/transaction-manager'

const transactionManager = new TransactionManager(supabase)

const result = await transactionManager.executeTransaction(async (client) => {
  // All operations use the same client
  const user = await createUser(client, userData)
  const permissions = await assignPermissions(client, user.id)
  const profile = await createProfile(client, user.id, profileData)
  
  return { user, permissions, profile }
})
```

### Transaction Monitoring

```typescript
// Get active transaction count
const activeCount = transactionManager.getActiveTransactionCount()

// Get saga execution status
const execution = orchestrator.getSagaExecution('transaction-id')
if (execution) {
  const metrics = execution.getMetrics()
  console.log(`Steps completed: ${metrics.completedSteps}/${metrics.stepCount}`)
}

// Get transaction logs
const logs = orchestrator.getLogs('transaction-id')
logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.message}`)
})
```

## Performance Monitoring

### Setup and Configuration

```typescript
import { PerformanceMonitor } from '@/lib/repositories/performance/performance-monitor'

const monitor = new PerformanceMonitor()

// Start monitoring with custom configuration
monitor.start({
  intervalMs: 30000,     // Collect metrics every 30 seconds
  enableAlerting: true,  // Enable performance alerts
  historySize: 10000     // Keep 10k records in history
})

// Add custom alert rules
monitor.addAlertRule({
  id: 'custom_slow_query',
  type: 'slow_query',
  threshold: 3000,       // 3 seconds
  enabled: true,
  repository: 'UserRepository',
  cooldownMinutes: 5
})
```

### Recording Performance Data

```typescript
// Manual recording (usually done automatically by enhanced repositories)
monitor.recordQuery(
  'SELECT * FROM users WHERE email = $1',
  'UserRepository',
  150,        // 150ms duration
  undefined,  // No error
  true        // Cache hit
)

// Record with error
monitor.recordQuery(
  'SELECT * FROM users WHERE invalid_column = $1',
  'UserRepository',
  500,
  new Error('Column does not exist'),
  false
)
```

### Performance Reports and Metrics

```typescript
// Get current metrics
const currentMetrics = monitor.getCurrentMetrics()
console.log(`Average response time: ${currentMetrics.averageResponseTime}ms`)
console.log(`Cache hit rate: ${currentMetrics.cacheHitRate * 100}%`)

// Generate performance report
const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
const endDate = new Date()

const reportResult = await monitor.generateReport(startDate, endDate)
if (reportResult.success) {
  const report = reportResult.data
  
  console.log('Performance Summary:')
  console.log(`Total queries: ${report.summary.totalQueries}`)
  console.log(`Error rate: ${(report.summary.errorRate * 100).toFixed(2)}%`)
  console.log(`Top query: ${report.topQueries[0]?.query}`)
  
  // Get recommendations
  report.recommendations.forEach(rec => {
    console.log(`💡 ${rec}`)
  })
}

// Repository-specific metrics
const userRepoMetrics = monitor.getRepositoryMetrics('UserRepository')
if (userRepoMetrics) {
  console.log(`User repo queries: ${userRepoMetrics.queryCount}`)
  console.log(`User repo avg time: ${userRepoMetrics.averageResponseTime}ms`)
}
```

### Alerts and Monitoring

```typescript
// Listen for alerts
monitor.on('alert:triggered', (alert) => {
  console.log(`🚨 Alert: ${alert.title}`)
  console.log(`Severity: ${alert.severity}`)
  console.log(`Current value: ${alert.currentValue}`)
  console.log(`Threshold: ${alert.threshold}`)
  
  // Send to external monitoring system
  sendToSlack(alert)
})

// Get active alerts
const activeAlerts = monitor.getActiveAlerts()
activeAlerts.forEach(alert => {
  console.log(`Active alert: ${alert.title} (${alert.severity})`)
})

// Acknowledge alerts
activeAlerts.forEach(alert => {
  monitor.acknowledgeAlert(alert.id)
})
```

## Migration Guide

### Migrating Existing Repositories

#### Step 1: Extend Enhanced Base Repository

```typescript
// Before
class UserRepository extends BaseRepository {
  // existing methods
}

// After
class UserRepository extends EnhancedBaseRepository {
  protected getTableName(): string { return 'users' }
  
  // Add required abstract methods
  protected getEntityName(): string { return 'User' }
  protected getSearchFields(): string[] { return ['email', 'full_name'] }
  
  // Implement batch operation handler
  protected async executeSingleOperation<T>(operation: BatchOperation<T>): Promise<Result<T>> {
    switch (operation.type) {
      case 'create':
        return await this.create(operation.data as UserInsert) as Result<T>
      case 'update':
        return await this.update(operation.id!, operation.data as Partial<UserUpdate>) as Result<T>
      case 'delete':
        return await this.delete(operation.id!) as Result<T>
      default:
        return failure(RepositoryError.validation(`Unknown operation: ${operation.type}`))
    }
  }
}
```

#### Step 2: Add Caching Gradually

```typescript
// Add caching to high-traffic methods
async findById(id: string): Promise<Result<User | null>> {
  return this.cachedFindById(
    id,
    async () => {
      // Your existing logic here
    },
    CachePresets.USER_DATA
  )
}

// Add search caching
async searchUsers(filters: any): Promise<Result<User[]>> {
  return this.cachedSearch(
    filters,
    async () => {
      // Your existing search logic
    },
    CachePresets.USER_DATA
  )
}
```

#### Step 3: Initialize Enhanced Components

```typescript
// Update repository initialization
const cacheManager = createCacheManager(supabase)
const performanceMonitor = new PerformanceMonitor()
const sagaOrchestrator = new SagaOrchestrator(supabase)

const userRepository = new UserRepository(
  supabase,
  performanceMonitor,
  sagaOrchestrator
)

performanceMonitor.start({ enableAlerting: true })
```

### Gradual Feature Adoption

1. **Start with Performance Monitoring**: Add monitoring first to establish baseline metrics
2. **Add Type-Safe Queries**: Replace raw queries with query builder gradually
3. **Implement Caching**: Add caching to most frequently accessed methods
4. **Batch Operations**: Replace multiple individual operations with batch operations
5. **Advanced Transactions**: Migrate complex operations to saga pattern

## Best Practices

### Performance Optimization

```typescript
// ✅ Good: Use specific column selection
const users = await createQueryBuilder('users')
  .select('id', 'email', 'full_name')  // Only needed columns
  .whereEqual('is_active', true)
  .limit(50)
  .execute(supabase)

// ❌ Bad: Select all columns
const users = await createQueryBuilder('users')
  .selectAll()  // Retrieves unnecessary data
  .execute(supabase)

// ✅ Good: Use appropriate cache TTL
const config = CacheConfigBuilder.create()
  .ttl(300)      // 5 minutes for user data
  .priority('normal')
  .build()

// ❌ Bad: Cache everything with same TTL
const config = CachePresets.STATIC_DATA  // 30 minutes for all data
```

### Error Handling

```typescript
// ✅ Good: Proper error handling with Result pattern
const result = await repository.findById(id)
if (!result.success) {
  switch (result.error.code) {
    case ErrorCode.NOT_FOUND:
      return { error: 'User not found' }
    case ErrorCode.FORBIDDEN:
      return { error: 'Access denied' }
    default:
      console.error('Unexpected error:', result.error)
      return { error: 'Internal server error' }
  }
}

// ❌ Bad: Throwing exceptions
try {
  const user = await repository.findByIdUnsafe(id)  // Throws on error
} catch (error) {
  // Hard to handle different error types
}
```

### Caching Strategy

```typescript
// ✅ Good: Layered cache invalidation
const result = await this.cachedUpdate(
  id,
  async () => updateUser(id, data),
  [
    `users:findById:${id}`,
    `users:findByEmail:${data.email}`,
    'users:search:*'
  ]
)

// ✅ Good: Cache warming for predictable access patterns
await repository.warmCache([
  {
    keys: ['users:active', 'users:admins'],
    priority: 'high',
    schedule: '0 */6 * * *' // Every 6 hours
  }
])
```

### Transaction Management

```typescript
// ✅ Good: Use sagas for complex workflows
const saga = await orchestrator.startSaga('user_onboarding', userData)

// ✅ Good: Simple transactions for ACID requirements
const result = await transactionManager.executeTransaction(async (client) => {
  const user = await createUser(client, userData)
  await assignDefaultRole(client, user.id)
  return user
})

// ❌ Bad: Manual transaction management
await supabase.rpc('begin_transaction')
try {
  // operations
  await supabase.rpc('commit_transaction')
} catch (error) {
  await supabase.rpc('rollback_transaction')
  throw error
}
```

### Monitoring and Observability

```typescript
// ✅ Good: Comprehensive monitoring setup
const monitor = new PerformanceMonitor()
monitor.start({ enableAlerting: true })

// Add repository-specific alerts
monitor.addAlertRule({
  id: 'user_repo_slow_queries',
  type: 'slow_query',
  threshold: 2000,
  repository: 'UserRepository',
  enabled: true
})

// ✅ Good: Regular performance reports
setInterval(async () => {
  const report = await monitor.generateReport(
    new Date(Date.now() - 3600000),
    new Date()
  )
  
  if (report.success) {
    await sendPerformanceReport(report.data)
  }
}, 3600000) // Every hour
```

## Troubleshooting

### Common Issues

#### Cache Miss Issues

```typescript
// Problem: Low cache hit rate
const stats = await repository.getCacheStatistics()
if (stats.success && stats.data.hitRate < 0.5) {
  // Solutions:
  // 1. Increase TTL
  // 2. Warm cache with common queries
  // 3. Check cache key consistency
}

// Problem: Cache not invalidating
// Solution: Use broader invalidation patterns
await repository.clearCache(['users:*']) // Clear all user cache
```

#### Performance Issues

```typescript
// Problem: Slow queries detected
monitor.on('alert:triggered', (alert) => {
  if (alert.type === 'slow_query') {
    // Solutions:
    // 1. Analyze query with QueryAnalyzer
    // 2. Add indexes
    // 3. Optimize query structure
    const analyzer = new QueryAnalyzer()
    const analysis = await analyzer.analyzeQuery(alert.query)
  }
})

// Problem: Memory usage growing
monitor.on('alert:triggered', (alert) => {
  if (alert.type === 'memory_usage') {
    // Solutions:
    // 1. Clear old cache entries
    // 2. Reduce cache size limits
    // 3. Check for memory leaks
    await cacheManager.clear()
  }
})
```

#### Transaction Failures

```typescript
// Problem: Saga compensation not working
orchestrator.on('saga:failed', ({ transactionId, error }) => {
  console.error(`Saga ${transactionId} failed:`, error)
  
  // Check compensation logs
  const logs = orchestrator.getLogs(transactionId)
  const compensationLogs = logs.filter(log => 
    log.message.includes('compensation')
  )
  
  // Manual cleanup if needed
  if (compensationLogs.length === 0) {
    await manualCleanup(transactionId)
  }
})
```

### Debugging Tools

```typescript
// Enable debug logging
process.env.DEBUG = 'repository:*'

// Get detailed query execution plans
const builder = createQueryBuilder('users')
  .selectAll()
  .whereEqual('is_active', true)

console.log('Query summary:', builder.getSummary())

// Monitor cache operations
cacheManager.on('cache:hit', ({ key, layer }) => {
  console.log(`Cache HIT: ${key} from ${layer}`)
})

cacheManager.on('cache:miss', ({ key }) => {
  console.log(`Cache MISS: ${key}`)
})

// Track performance metrics in real-time
monitor.on('metrics:collected', (metrics) => {
  if (metrics.averageResponseTime > 1000) {
    console.warn('High average response time:', metrics)
  }
})
```

### Health Checks

```typescript
// Repository health check endpoint
export async function GET() {
  const health = {
    cache: await cacheManager.getStats(),
    performance: monitor.getCurrentMetrics(),
    activeTransactions: transactionManager.getActiveTransactionCount(),
    alerts: monitor.getActiveAlerts().length
  }
  
  const isHealthy = 
    health.performance.averageResponseTime < 1000 &&
    health.cache.memory.hitRate > 0.7 &&
    health.activeTransactions < 10 &&
    health.alerts === 0
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'degraded',
    ...health
  }, {
    status: isHealthy ? 200 : 503
  })
}
```

## Conclusion

The enhanced repository layer provides a comprehensive foundation for building scalable, maintainable, and performant data access patterns. Start with the basic features and gradually adopt advanced capabilities as your application grows.

For additional support and examples, see:
- [Test files](/__tests__/repositories/) for comprehensive usage examples
- [Performance benchmarks](/src/lib/repositories/performance/) for optimization guidance
- [Individual component documentation](/src/lib/repositories/) for detailed API references

Remember to monitor performance metrics regularly and adjust caching and query strategies based on real-world usage patterns.