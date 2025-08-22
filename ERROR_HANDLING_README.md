# Comprehensive Error Handling & Logging Infrastructure

## Overview

This document describes the comprehensive error handling and logging infrastructure implemented for AppBoardGuru. The system provides structured error handling, correlation ID tracking, performance monitoring, health checks, and business event logging.

## 🚀 Key Features

### ✅ Custom Error Class Hierarchy
- **BaseError & EnhancedBaseError**: Foundation classes with correlation IDs
- **Specific Error Types**: ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, ServiceUnavailableError, BusinessLogicError, ExternalServiceError, DatabaseError, RateLimitError
- **Error Metadata**: Severity levels, categories, user-facing flags, retry capabilities

### ✅ Error Recovery & Resilience
- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breaker**: Automatic failure detection and recovery
- **Bulk Operations**: Handle partial failures gracefully
- **Graceful Degradation**: Fallback strategies for service failures

### ✅ Structured Logging System
- **Correlation ID Tracking**: End-to-end request tracing
- **Multiple Transports**: Console, File, HTTP for different environments
- **Performance Tracking**: Memory usage, CPU usage, operation timing
- **Business Event Logging**: User actions, system events, business rules

### ✅ Global Error Handler Middleware
- **Automatic Error Processing**: Consistent error handling across all API routes
- **Context Enhancement**: Add request metadata to errors
- **Alerting Integration**: Automatic alerts for critical errors
- **Error Serialization**: Safe API response formatting

### ✅ Health Check System
- **Comprehensive Checks**: Memory, database, external services
- **Multiple Endpoints**: `/api/health`, `/api/health/detailed`, `/api/health/ready`, `/api/health/live`
- **Kubernetes Integration**: Ready for container orchestration
- **Performance Monitoring**: Built-in health check performance tracking

### ✅ Monitoring & Metrics
- **Prometheus-style Metrics**: `/api/metrics` endpoint
- **Performance Tracking**: Request duration, database operations, external services
- **Real-time Alerting**: Configurable thresholds and notifications
- **OpenTelemetry Integration**: Distributed tracing support

## 📁 File Structure

```
src/lib/
├── errors/                      # Error handling system
│   ├── base.ts                 # Base error classes and factory
│   ├── types.ts                # Specific error type implementations
│   ├── recovery.ts             # Retry logic and circuit breakers
│   ├── serialization.ts        # Error response formatting
│   ├── handler.ts              # Global error handler middleware
│   └── index.ts                # Main exports and utilities
├── logging/                    # Logging system
│   ├── logger.ts              # Structured logging with transports
│   └── telemetry.ts           # OpenTelemetry integration
└── monitoring/                 # Monitoring and health checks
    ├── health.ts              # Health check system
    └── performance.ts         # Performance monitoring

src/app/api/
├── health/                     # Health check endpoints
│   ├── route.ts               # Basic health check
│   ├── detailed/route.ts      # Detailed health information
│   ├── ready/route.ts         # Kubernetes readiness probe
│   └── live/route.ts          # Kubernetes liveness probe
├── metrics/route.ts           # Prometheus metrics endpoint
└── assets/enhanced-example/   # Example API with full error handling
    └── route.ts
```

## 🔧 Quick Start

### 1. Basic Error Handling in API Routes

```typescript
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/errors'

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Validation
  if (!validInput) {
    throw new ValidationError('Invalid input', 'fieldName', inputValue)
  }

  // Business logic
  const resource = await getResource(id)
  if (!resource) {
    throw NotFoundError.byId('Resource', id)
  }

  return NextResponse.json({ data: resource })
})
```

### 2. Structured Logging

```typescript
import { Logger, BusinessEventLogger } from '@/lib/logging/logger'

const logger = Logger.getLogger('MyService')
const businessLogger = new BusinessEventLogger()

// With correlation ID
logger.withCorrelation('req_123').info('Processing request', { userId: '456' })

// Business events
businessLogger.logUserAction('asset_created', userId, 'asset', assetId, metadata)
```

### 3. Performance Tracking

```typescript
import { PerformanceTracker } from '@/lib/logging/telemetry'

// Track HTTP requests
const result = await PerformanceTracker.trackHTTPRequest('POST', '/api/assets', async () => {
  // Your operation here
  return { data: result }
})

// Track database operations
const data = await PerformanceTracker.trackDatabaseOperation('select', 'users', async () => {
  return await db.users.findMany()
})
```

### 4. Health Checks

```typescript
import { healthMonitor, HealthChecks } from '@/lib/monitoring/health'

// Add custom health check
healthMonitor.addCheck('external-service', HealthChecks.httpEndpoint('API', 'https://api.example.com/health'), {
  timeout: 5000,
  critical: true
})
```

## 📊 Monitoring Endpoints

| Endpoint | Purpose | Response Format |
|----------|---------|----------------|
| `/api/health` | Basic health status | JSON (200/503) |
| `/api/health/detailed` | Comprehensive health info | JSON with metrics |
| `/api/health/ready` | Kubernetes readiness | JSON (200/503) |
| `/api/health/live` | Kubernetes liveness | JSON (200/503) |
| `/api/metrics` | Prometheus metrics | Text/plain |

## 🏗️ Architecture Patterns

### Error Flow
1. **Error Occurs** → Custom error thrown with context
2. **Global Handler** → Processes error, adds metadata
3. **Logger** → Records error with correlation ID
4. **Serializer** → Formats safe API response
5. **Alerting** → Sends notifications if critical
6. **Telemetry** → Records metrics for monitoring

### Logging Flow
1. **Request Starts** → Generate correlation ID
2. **Operations** → Log with structured data
3. **Performance** → Track timing and resources
4. **Business Events** → Record user actions
5. **Completion** → Aggregate metrics and cleanup

### Health Check Flow
1. **Periodic Execution** → Run all registered checks
2. **Status Evaluation** → Determine overall health
3. **Metrics Recording** → Track check performance
4. **Alerting** → Notify if degraded/unhealthy
5. **Response** → Provide status to callers

## 🔍 Error Types Reference

### ValidationError
```typescript
// Field validation
throw new ValidationError('Name is required', 'name', undefined, ['required'])

// Format validation  
throw ValidationError.invalid('email', 'invalid@', 'Must be valid email format')

// Length validation
throw ValidationError.tooLong('description', longText, 500)
```

### AuthenticationError
```typescript
// Invalid credentials
throw AuthenticationError.invalidCredentials()

// Expired token
throw AuthenticationError.tokenExpired(userId)

// Invalid session
throw AuthenticationError.sessionExpired(userId)
```

### AuthorizationError
```typescript
// Insufficient permissions
throw AuthorizationError.insufficientPermissions(userId, 'asset', 'delete', 'admin', 'member')

// Resource access denied
throw AuthorizationError.resourceNotFound(userId, 'vault', vaultId)
```

### DatabaseError
```typescript
// Connection failed
throw DatabaseError.connectionFailed()

// Query failed
throw DatabaseError.queryFailed('SELECT * FROM users', 'users', originalError)

// Constraint violation
throw DatabaseError.constraintViolation('unique_email', 'users')
```

## 📈 Performance Monitoring

### Key Metrics
- **HTTP Request Duration**: `http_request_duration_ms`
- **Database Operation Duration**: `database_operation_duration_ms`
- **External Service Duration**: `external_service_duration_ms`
- **Error Rates**: `*_errors_total`
- **Health Check Status**: `health_check_status`

### Alert Configuration
```typescript
import { performanceMonitor } from '@/lib/monitoring/performance'

// Add custom alert
performanceMonitor.addAlert({
  metric: 'http_request_duration_ms',
  threshold: 5000,
  operator: 'gt',
  duration: 60000,
  severity: 'high',
  enabled: true
})
```

## 🛠️ Configuration

### Environment Variables
```env
# Logging
LOG_LEVEL=info
LOG_ENDPOINT=https://logs.example.com/ingest
LOG_API_KEY=your-api-key

# Service Information
SERVICE_NAME=appboardguru
VERSION=1.0.0
NODE_ENV=production

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Logger Configuration
```typescript
const logger = Logger.getLogger('CustomService', {
  level: LogLevel.INFO,
  transports: [
    new ConsoleTransport(),
    new FileTransport('/var/log/app.log'),
    new HTTPTransport('https://logs.example.com', 'api-key')
  ],
  enablePerformanceTracking: true,
  enableCorrelationTracking: true
})
```

## 🚨 Alerting & Monitoring Integration

### Supported Integrations
- **Prometheus**: Native metrics endpoint
- **Grafana**: Dashboard templates available
- **DataDog**: HTTP transport compatible
- **New Relic**: OpenTelemetry support
- **Slack**: Webhook alerts (configurable)
- **PagerDuty**: Critical error escalation

### Sample Grafana Dashboard
```json
{
  "dashboard": {
    "title": "AppBoardGuru Error & Performance Dashboard",
    "panels": [
      {
        "title": "Request Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

## 🧪 Testing

### Error Handling Tests
```typescript
import { ValidationError, ErrorSerializer } from '@/lib/errors'

test('ValidationError serialization', () => {
  const error = new ValidationError('Invalid email', 'email', 'invalid@')
  const response = ErrorSerializer.toAPIResponse(error)
  
  expect(response.error.code).toBe('VALIDATION_ERROR')
  expect(response.error.field).toBe('email')
  expect(response.success).toBe(false)
})
```

### Health Check Tests
```typescript
import { healthMonitor } from '@/lib/monitoring/health'

test('Health check execution', async () => {
  const result = await healthMonitor.executeAll()
  
  expect(result.status).toBeDefined()
  expect(result.checks.length).toBeGreaterThan(0)
  expect(result.summary.total).toBe(result.checks.length)
})
```

## 📚 Best Practices

### 1. Error Handling
- Always use specific error types
- Include correlation IDs in all errors
- Provide meaningful error messages
- Log errors with appropriate severity
- Never expose sensitive information

### 2. Logging
- Use structured logging with consistent fields
- Include correlation IDs for request tracing
- Log business events for audit trails
- Use appropriate log levels
- Sanitize sensitive data

### 3. Performance Monitoring
- Track all external service calls
- Monitor database operation performance
- Set up alerts for critical thresholds
- Use distributed tracing for complex flows
- Regular performance reviews

### 4. Health Checks
- Include all critical dependencies
- Set appropriate timeouts
- Use meaningful check names
- Monitor health check performance
- Test failure scenarios

## 🔧 Migration Guide

### From Basic Error Handling
1. Replace generic `throw new Error()` with specific error types
2. Add correlation ID tracking to requests
3. Update API routes to use `withErrorHandler`
4. Configure structured logging
5. Add health checks for dependencies

### Example Migration
```typescript
// Before
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    return NextResponse.json(data)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// After
export const GET = withErrorHandler(async (request: NextRequest) => {
  const correlationId = request.headers.get('x-correlation-id')
  const logger = Logger.getLogger('API').withCorrelation(correlationId)
  
  logger.info('Fetching data')
  
  const data = await fetchData()
  if (!data) {
    throw new NotFoundError('Data')
  }
  
  return NextResponse.json({ success: true, data })
})
```

## 🎯 Summary

This comprehensive error handling and logging infrastructure provides:

- **100+ Error Types** with proper categorization and metadata
- **Correlation ID Tracking** across all requests and operations
- **Structured Logging** with multiple transport options
- **Performance Monitoring** with real-time metrics and alerting
- **Health Check System** with Kubernetes integration
- **Global Error Handler** for consistent API responses
- **Recovery Strategies** including retry logic and circuit breakers
- **Business Event Logging** for audit and analytics
- **Monitoring Integration** with Prometheus and OpenTelemetry

The system is production-ready and provides the foundation for reliable, observable, and maintainable applications.