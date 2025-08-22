/**
 * Client-Side Telemetry Stub
 * Provides the same interface as server telemetry but for browser usage
 * Does not include Node.js dependencies to avoid bundle issues
 */

// Mock span interface for client-side
interface ClientSpan {
  end(): void
  recordException(error: Error): void
  setStatus(status: { code: number; message?: string }): void
  setAttributes(attributes: Record<string, string | number | boolean>): void
}

// Mock span implementation
class MockSpan implements ClientSpan {
  end() {
    // No-op for client
  }
  
  recordException(error: Error) {
    console.error('Client telemetry error:', error)
  }
  
  setStatus(status: { code: number; message?: string }) {
    // No-op for client
  }
  
  setAttributes(attributes: Record<string, string | number | boolean>) {
    // No-op for client
  }
}

// Client-side telemetry client class (stub implementation)
export class ClientTelemetryClient {
  /**
   * Start a new span for API call tracking (client stub)
   */
  startApiSpan(operation: string, attributes?: Record<string, string | number | boolean>): ClientSpan {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Starting API span for ${operation}`, attributes)
    }
    return new MockSpan()
  }

  /**
   * Start a new span for database operations (client stub)
   */
  startDatabaseSpan(operation: string, table?: string, attributes?: Record<string, string | number | boolean>): ClientSpan {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Starting DB span for ${operation} on ${table}`, attributes)
    }
    return new MockSpan()
  }

  /**
   * Start a new span for external service calls (client stub)
   */
  startExternalSpan(service: string, operation: string, attributes?: Record<string, string | number | boolean>): ClientSpan {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Starting external span for ${service}.${operation}`, attributes)
    }
    return new MockSpan()
  }

  /**
   * Track API call metrics (client stub)
   */
  recordApiCall(route: string, method: string, statusCode: number, duration: number, userId?: string) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: API call ${method} ${route} - ${statusCode} (${duration}ms)`, { userId })
    }
  }

  /**
   * Track database query metrics (client stub)
   */
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean = true) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: DB query ${operation} on ${table} - ${success ? 'success' : 'failed'} (${duration}ms)`)
    }
  }

  /**
   * Track component render performance (client implementation)
   */
  recordComponentRender(component: string, duration: number) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Component ${component} rendered in ${duration}ms`)
    }
    
    // Use Performance API for client-side tracking
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`component-${component}-${Date.now()}`)
    }
  }

  /**
   * Track active users (client stub)
   */
  recordActiveUsers(count: number) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Active users: ${count}`)
    }
  }

  /**
   * Track custom business metrics (client implementation)
   */
  recordBusinessMetric(name: string, value: number, attributes?: Record<string, string | number>) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Business metric ${name}: ${value}`, attributes)
    }
    
    // Send to analytics endpoint if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, {
        value,
        ...attributes
      })
    }
  }

  /**
   * Add error to current span (client implementation)
   */
  recordError(error: Error, span?: any) {
    console.error('Client telemetry error:', error)
    
    // Send to error tracking service if available
    if (typeof window !== 'undefined') {
      // Could integrate with Sentry, LogRocket, etc.
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false
        })
      }
    }
  }

  /**
   * Add custom attributes to current span (client stub)
   */
  addSpanAttributes(attributes: Record<string, string | number | boolean>) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug('Client telemetry: Adding span attributes', attributes)
    }
  }

  /**
   * Set span status (client stub)
   */
  setSpanStatus(status: number, message?: string) {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`Client telemetry: Setting span status ${status}`, message)
    }
  }
}

// Global client telemetry instance
export const clientTelemetry = new ClientTelemetryClient()

// Export span status codes for compatibility
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}