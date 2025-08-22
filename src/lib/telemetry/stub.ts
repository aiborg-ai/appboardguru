/**
 * Telemetry Stub - Temporary no-op implementation for build compatibility
 */

export const telemetry = {
  recordError: (error: Error) => {
    console.error('Telemetry error (stub):', error)
  },
  recordMetric: (name: string, value: number) => {
    console.debug('Telemetry metric (stub):', name, value)
  },
  startSpan: (name: string, options?: any) => ({ end: () => {} }),
  trace: (name: string, fn: () => any) => fn(),
  startApiSpan: (name: string) => ({ end: () => {} }),
  startDatabaseSpan: (operation: string, table: string) => ({ end: () => {} }),
  recordApiCall: (route: string, method: string, status: number, duration: number) => {},
  recordDatabaseQuery: (operation: string, table: string, duration: number, success: boolean) => {},
  setSpanStatus: (status: any) => {},
  recordComponentRender: (component: string, duration: number) => {},
  recordBusinessMetric: (name: string, value: number, attributes?: Record<string, string | number>) => {},
  addSpanAttributes: (attributes: Record<string, string | number | boolean>) => {}
}

export const withTelemetry = (fn: any, name?: string) => {
  return fn
}

export const withDatabaseTelemetry = (queryFn: any, operation: string, table: string) => {
  return queryFn
}

export const withErrorHandler = (fn: any) => {
  return fn
}

export const initializeTelemetry = async () => {
  console.debug('Telemetry initialization (stub)')
}

export const SpanStatusCode = {
  OK: 1,
  ERROR: 2
}