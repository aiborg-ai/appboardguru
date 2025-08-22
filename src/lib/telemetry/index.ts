/**
 * Telemetry Configuration
 * Server-side telemetry exports to avoid conditional module loading issues
 */

// Use dynamic imports for server-side telemetry
let telemetryModule: any = null

export const initializeTelemetry = async () => {
  if (typeof window === 'undefined') {
    // Server-side: Import full telemetry with Node.js dependencies
    if (!telemetryModule) {
      telemetryModule = await import('./server')
    }
    return telemetryModule.initializeServerTelemetry()
  } else {
    // Client-side: No-op
    console.debug('Client-side telemetry initialized')
  }
}

export const telemetry = {
  startSpan: (name: string, options?: any) => {
    if (typeof window === 'undefined' && telemetryModule) {
      return telemetryModule.serverTelemetry.startSpan(name, options)
    }
    return { end: () => {} } // Client-side stub
  },
  trace: (name: string, fn: () => any) => {
    if (typeof window === 'undefined' && telemetryModule) {
      return telemetryModule.serverTelemetry.trace(name, fn)
    }
    return fn() // Client-side passthrough
  },
  startApiSpan: (name: string) => {
    if (typeof window === 'undefined' && telemetryModule) {
      return telemetryModule.serverTelemetry.startApiSpan?.(name) || { end: () => {} }
    }
    return { end: () => {} }
  },
  startDatabaseSpan: (operation: string, table: string) => {
    if (typeof window === 'undefined' && telemetryModule) {
      return telemetryModule.serverTelemetry.startDatabaseSpan?.(operation, table) || { end: () => {} }
    }
    return { end: () => {} }
  },
  recordApiCall: (route: string, method: string, status: number, duration: number) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.recordApiCall?.(route, method, status, duration)
    }
  },
  recordDatabaseQuery: (operation: string, table: string, duration: number, success: boolean) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.recordDatabaseQuery?.(operation, table, duration, success)
    }
  },
  recordError: (error: Error, span?: any) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.recordError?.(error, span)
    } else {
      console.error('Client telemetry error:', error)
    }
  },
  setSpanStatus: (status: any) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.setSpanStatus?.(status)
    }
  },
  recordComponentRender: (component: string, duration: number) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.recordComponentRender?.(component, duration)
    } else if (typeof window !== 'undefined') {
      // Client-side performance tracking
      console.debug(`Component ${component} rendered in ${duration}ms`)
    }
  },
  recordBusinessMetric: (name: string, value: number, attributes?: Record<string, string | number>) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.recordBusinessMetric?.(name, value, attributes)
    } else if (typeof window !== 'undefined') {
      console.debug(`Business metric ${name}: ${value}`, attributes)
    }
  },
  addSpanAttributes: (attributes: Record<string, string | number | boolean>) => {
    if (typeof window === 'undefined' && telemetryModule) {
      telemetryModule.serverTelemetry.addSpanAttributes?.(attributes)
    }
  }
}

export const SpanStatusCode = {
  OK: 1,
  ERROR: 2
}

/**
 * Middleware wrapper for API routes with telemetry
 */
export function withTelemetry<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const span = telemetry.startApiSpan(operationName)
    const startTime = Date.now()
    
    try {
      const result = await handler(...args)
      const duration = Date.now() - startTime
      
      // Extract request details if available
      const request = args[0] as Request
      const method = request?.method || 'UNKNOWN'
      const url = request?.url || ''
      const route = new URL(url).pathname
      
      const status = result.status || 200
      
      telemetry.recordApiCall(route, method, status, duration)
      telemetry.setSpanStatus(status >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      telemetry.recordError(error as Error, span)
      
      // Extract request details for error tracking
      const request = args[0] as Request
      const method = request?.method || 'UNKNOWN'
      const url = request?.url || ''
      const route = new URL(url).pathname
      
      telemetry.recordApiCall(route, method, 500, duration)
      throw error
    } finally {
      span.end()
    }
  }) as T
}

/**
 * Database query wrapper with telemetry
 */
export function withDatabaseTelemetry<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  operation: string,
  table: string
): T {
  return (async (...args: Parameters<T>) => {
    const span = telemetry.startDatabaseSpan(operation, table)
    const startTime = Date.now()
    
    try {
      const result = await queryFn(...args)
      const duration = Date.now() - startTime
      
      telemetry.recordDatabaseQuery(operation, table, duration, true)
      telemetry.setSpanStatus(SpanStatusCode.OK)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      telemetry.recordDatabaseQuery(operation, table, duration, false)
      telemetry.recordError(error as Error, span)
      throw error
    } finally {
      span.end()
    }
  }) as T
}