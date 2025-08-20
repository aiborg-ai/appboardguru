// Test utilities exports
export * from './test-database'

// Common test helpers
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const expectToThrow = async (fn: () => Promise<any>, expectedError?: string | RegExp) => {
  try {
    await fn()
    throw new Error('Expected function to throw, but it did not')
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError)
      } else {
        expect(error.message).toMatch(expectedError)
      }
    }
    return error
  }
}

export const createMockRequest = (options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  query?: Record<string, string>
} = {}) => {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    body: options.body,
    query: options.query || {},
  }
}

export const createMockResponse = () => {
  const response = {
    status: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    statusCode: 200,
    setStatus: function(code: number) {
      this.status = code
      this.statusCode = code
      return this
    },
    setHeader: function(key: string, value: string) {
      this.headers[key] = value
      return this
    },
    json: function(data: any) {
      this.body = data
      this.setHeader('Content-Type', 'application/json')
      return this
    },
    send: function(data: any) {
      this.body = data
      return this
    },
    end: function(data?: any) {
      if (data) this.body = data
      return this
    },
  }
  
  return response
}

// Performance testing helpers
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  
  return {
    result,
    duration: end - start,
  }
}

export const runBenchmark = async (
  fn: () => Promise<any>,
  iterations: number = 100
): Promise<{
  averageTime: number
  minTime: number
  maxTime: number
  totalTime: number
}> => {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn)
    times.push(duration)
  }
  
  return {
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    totalTime: times.reduce((sum, time) => sum + time, 0),
  }
}

// Data validation helpers
export const validateApiResponse = (response: any, expectedShape: Record<string, any>) => {
  Object.keys(expectedShape).forEach(key => {
    expect(response).toHaveProperty(key)
    
    if (typeof expectedShape[key] === 'object' && expectedShape[key] !== null) {
      validateApiResponse(response[key], expectedShape[key])
    } else if (expectedShape[key] !== undefined) {
      expect(typeof response[key]).toBe(typeof expectedShape[key])
    }
  })
}

export const validatePagination = (paginationData: any) => {
  expect(paginationData).toHaveProperty('page')
  expect(paginationData).toHaveProperty('limit')
  expect(paginationData).toHaveProperty('total')
  expect(paginationData).toHaveProperty('totalPages')
  expect(paginationData).toHaveProperty('hasNext')
  expect(paginationData).toHaveProperty('hasPrev')
  
  expect(typeof paginationData.page).toBe('number')
  expect(typeof paginationData.limit).toBe('number')
  expect(typeof paginationData.total).toBe('number')
  expect(typeof paginationData.totalPages).toBe('number')
  expect(typeof paginationData.hasNext).toBe('boolean')
  expect(typeof paginationData.hasPrev).toBe('boolean')
  
  expect(paginationData.page).toBeGreaterThanOrEqual(1)
  expect(paginationData.limit).toBeGreaterThan(0)
  expect(paginationData.total).toBeGreaterThanOrEqual(0)
  expect(paginationData.totalPages).toBeGreaterThanOrEqual(0)
}

// Error testing helpers
export const expectApiError = (response: any, expectedCode?: number, expectedMessage?: string) => {
  expect(response.success).toBe(false)
  expect(response).toHaveProperty('error')
  
  if (expectedCode) {
    expect(response.status || response.statusCode).toBe(expectedCode)
  }
  
  if (expectedMessage) {
    expect(response.error).toContain(expectedMessage)
  }
}

export const expectApiSuccess = (response: any, expectedData?: any) => {
  expect(response.success).toBe(true)
  expect(response).toHaveProperty('data')
  
  if (expectedData) {
    expect(response.data).toMatchObject(expectedData)
  }
}

// Database testing helpers
export const withTransaction = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  // Implement transaction wrapper for tests
  // This would wrap the callback in a database transaction
  // and rollback after the test
  return await callback()
}

export const withTestUser = async <T>(
  callback: (user: any) => Promise<T>,
  userData?: any
): Promise<T> => {
  const { testDb } = await import('./test-database')
  const user = await testDb.createUser(userData)
  
  try {
    return await callback(user)
  } finally {
    // Cleanup handled by testDb.cleanup()
  }
}

export const withTestOrganization = async <T>(
  callback: (org: any, user: any) => Promise<T>,
  orgData?: any,
  userData?: any
): Promise<T> => {
  const { testDb } = await import('./test-database')
  
  const user = await testDb.createUser(userData)
  const organization = await testDb.createOrganization({
    created_by: user.id,
    ...orgData,
  })
  
  try {
    return await callback(organization, user)
  } finally {
    // Cleanup handled by testDb.cleanup()
  }
}

// File testing helpers
export const createTempFile = (content: string, filename: string = 'test.txt'): File => {
  const blob = new Blob([content], { type: 'text/plain' })
  return new File([blob], filename, { type: 'text/plain' })
}

export const createMockFile = (
  size: number = 1024,
  type: string = 'application/pdf',
  name: string = 'test.pdf'
): File => {
  const content = 'x'.repeat(size)
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Date testing helpers
export const getDateString = (daysFromNow: number = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

export const isRecentDate = (dateString: string, maxAgeMs: number = 5000): boolean => {
  const date = new Date(dateString)
  const now = new Date()
  return (now.getTime() - date.getTime()) <= maxAgeMs
}

// Environment helpers
export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test'
}

export const skipInProduction = (testFn: () => void) => {
  if (process.env.NODE_ENV === 'production') {
    test.skip('Skipped in production environment', testFn)
  } else {
    testFn()
  }
}