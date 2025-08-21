/**
 * Test HTTP Client
 * Provides utilities for making HTTP requests in tests
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface TestClientConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
}

export class TestClient {
  private client: AxiosInstance

  constructor(accessToken?: string, config: TestClientConfig = {}) {
    const baseURL = config.baseURL || process.env.TEST_API_BASE_URL || 'http://localhost:3000'
    
    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...config.headers
      },
      // Don't throw on HTTP error status codes
      validateStatus: () => true
    })

    // Add request/response interceptors for debugging
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === 'test' && process.env.DEBUG_API_TESTS) {
          console.log(`→ ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data
          })
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => {
        if (process.env.NODE_ENV === 'test' && process.env.DEBUG_API_TESTS) {
          console.log(`← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            data: response.data
          })
        }
        return response
      },
      (error) => {
        if (process.env.NODE_ENV === 'test' && process.env.DEBUG_API_TESTS) {
          console.error('API Error:', error.response?.data || error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config)
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config)
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config)
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config)
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config)
  }

  /**
   * HEAD request
   */
  async head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.head(url, config)
  }

  /**
   * OPTIONS request
   */
  async options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.options(url, config)
  }

  /**
   * Set authorization header
   */
  setAuth(accessToken: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  /**
   * Remove authorization header
   */
  clearAuth(): void {
    delete this.client.defaults.headers.common['Authorization']
  }

  /**
   * Set custom header
   */
  setHeader(name: string, value: string): void {
    this.client.defaults.headers.common[name] = value
  }

  /**
   * Remove custom header
   */
  removeHeader(name: string): void {
    delete this.client.defaults.headers.common[name]
  }

  /**
   * Get response timing information
   */
  async timedRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<{ response: AxiosResponse<T>; duration: number }> {
    const start = Date.now()
    
    let response: AxiosResponse<T>
    switch (method) {
      case 'GET':
        response = await this.get(url, config)
        break
      case 'POST':
        response = await this.post(url, data, config)
        break
      case 'PUT':
        response = await this.put(url, data, config)
        break
      case 'PATCH':
        response = await this.patch(url, data, config)
        break
      case 'DELETE':
        response = await this.delete(url, config)
        break
      default:
        throw new Error(`Unsupported method: ${method}`)
    }
    
    const duration = Date.now() - start
    return { response, duration }
  }

  /**
   * Make multiple concurrent requests
   */
  async concurrent<T = any>(
    requests: Array<() => Promise<AxiosResponse<T>>>
  ): Promise<AxiosResponse<T>[]> {
    const results = await Promise.allSettled(requests.map(req => req()))
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        throw result.reason
      }
    })
  }

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile<T = any>(
    url: string,
    file: File | Buffer,
    fieldName = 'file',
    additionalFields?: Record<string, string>
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    
    if (file instanceof File) {
      formData.append(fieldName, file)
    } else {
      // For Node.js Buffer
      formData.append(fieldName, file, 'test-file.txt')
    }

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
  }

  /**
   * Wait for condition with timeout
   */
  async waitFor<T>(
    condition: () => Promise<T>,
    options: {
      timeout?: number
      interval?: number
      timeoutMessage?: string
    } = {}
  ): Promise<T> {
    const { 
      timeout = 10000, 
      interval = 100, 
      timeoutMessage = 'Condition not met within timeout' 
    } = options

    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      try {
        const result = await condition()
        if (result) {
          return result
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(timeoutMessage)
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health')
      return response.status === 200
    } catch (error) {
      return false
    }
  }
}

/**
 * Factory function to create test client
 */
export function createTestClient(
  accessToken?: string, 
  config?: TestClientConfig
): TestClient {
  return new TestClient(accessToken, config)
}

/**
 * Create test client with admin privileges
 */
export async function createAdminTestClient(): Promise<TestClient> {
  // This would typically authenticate as an admin user
  // Implementation depends on your auth system
  const adminToken = process.env.TEST_ADMIN_TOKEN
  
  if (!adminToken) {
    throw new Error('TEST_ADMIN_TOKEN environment variable is required for admin tests')
  }
  
  return createTestClient(adminToken)
}

/**
 * Retry wrapper for flaky tests
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }
  
  throw lastError
}

/**
 * Assert response structure matches API specification
 */
export function assertAPIResponse(response: AxiosResponse, expectedStatus = 200): void {
  expect(response.status).toBe(expectedStatus)
  expect(response.data).toHaveProperty('success')
  expect(response.data).toHaveProperty('requestId')
  
  if (response.data.success) {
    expect(response.data).toHaveProperty('data')
  } else {
    expect(response.data).toHaveProperty('error')
    expect(response.data.error).toHaveProperty('code')
    expect(response.data.error).toHaveProperty('message')
  }
}

/**
 * Assert pagination structure
 */
export function assertPaginationResponse(response: AxiosResponse): void {
  assertAPIResponse(response)
  expect(response.data.data).toHaveProperty('items')
  expect(response.data.data).toHaveProperty('pagination')
  expect(response.data.data.pagination).toHaveProperty('page')
  expect(response.data.data.pagination).toHaveProperty('limit')
  expect(response.data.data.pagination).toHaveProperty('total')
  expect(response.data.data.pagination).toHaveProperty('total_pages')
  expect(response.data.data.pagination).toHaveProperty('has_next')
  expect(response.data.data.pagination).toHaveProperty('has_prev')
}