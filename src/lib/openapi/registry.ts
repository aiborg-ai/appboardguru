/**
 * OpenAPI Registry
 * Central registry for API endpoint metadata and automatic discovery
 */

import { APIEndpointMeta, OpenAPIGenerator } from './generator'
import { ZodSchema } from 'zod'

export interface EndpointRegistration {
  meta: APIEndpointMeta
  filePath: string
  registeredAt: Date
}

export class OpenAPIRegistry {
  private static instance: OpenAPIRegistry
  private endpoints: Map<string, EndpointRegistration> = new Map()
  private generator: OpenAPIGenerator

  private constructor() {
    this.generator = new OpenAPIGenerator(
      'AppBoardGuru API',
      '1.0.0',
      'Comprehensive API for board management and collaboration platform',
      [
        { url: process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api', description: 'API Server' }
      ]
    )
  }

  static getInstance(): OpenAPIRegistry {
    if (!OpenAPIRegistry.instance) {
      OpenAPIRegistry.instance = new OpenAPIRegistry()
    }
    return OpenAPIRegistry.instance
  }

  /**
   * Register an API endpoint with its metadata
   */
  register(meta: APIEndpointMeta, filePath?: string): void {
    const key = `${meta.method}:${meta.path}`
    
    this.endpoints.set(key, {
      meta,
      filePath: filePath || 'unknown',
      registeredAt: new Date()
    })

    // Add to OpenAPI generator
    this.generator.addEndpoint(meta)

    console.log(`[OpenAPI] Registered ${key} from ${filePath}`)
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints(): EndpointRegistration[] {
    return Array.from(this.endpoints.values())
  }

  /**
   * Get endpoint by method and path
   */
  getEndpoint(method: string, path: string): EndpointRegistration | undefined {
    const key = `${method}:${path}`
    return this.endpoints.get(key)
  }

  /**
   * Generate complete OpenAPI specification
   */
  generateSpec(): string {
    return this.generator.toJSON()
  }

  /**
   * Generate OpenAPI specification as YAML
   */
  generateYAMLSpec(): string {
    return this.generator.toYAML()
  }

  /**
   * Get statistics about registered endpoints
   */
  getStats() {
    const endpoints = this.getEndpoints()
    const methodCounts = endpoints.reduce((acc, endpoint) => {
      acc[endpoint.meta.method] = (acc[endpoint.meta.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tagCounts = endpoints.reduce((acc, endpoint) => {
      endpoint.meta.tags?.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    const authRequiredCount = endpoints.filter(e => e.meta.requiresAuth).length

    return {
      total: endpoints.length,
      byMethod: methodCounts,
      byTag: tagCounts,
      authenticated: authRequiredCount,
      unauthenticated: endpoints.length - authRequiredCount,
      lastRegistered: endpoints.reduce((latest, endpoint) => 
        endpoint.registeredAt > latest ? endpoint.registeredAt : latest, 
        new Date(0)
      )
    }
  }

  /**
   * Clear all registered endpoints
   */
  clear(): void {
    this.endpoints.clear()
    this.generator = new OpenAPIGenerator(
      'AppBoardGuru API',
      '1.0.0',
      'Comprehensive API for board management and collaboration platform'
    )
  }

  /**
   * Remove endpoint by method and path
   */
  unregister(method: string, path: string): boolean {
    const key = `${method}:${path}`
    return this.endpoints.delete(key)
  }

  /**
   * Validate endpoint registration
   */
  private validateEndpoint(meta: APIEndpointMeta): string[] {
    const errors: string[] = []

    if (!meta.method) {
      errors.push('Method is required')
    }

    if (!meta.path) {
      errors.push('Path is required')
    }

    if (!meta.summary) {
      errors.push('Summary is required')
    }

    if (meta.path && !meta.path.startsWith('/')) {
      errors.push('Path must start with /')
    }

    return errors
  }

  /**
   * Bulk register endpoints from configuration
   */
  bulkRegister(endpoints: Array<{ meta: APIEndpointMeta; filePath?: string }>): void {
    endpoints.forEach(({ meta, filePath }) => {
      try {
        const errors = this.validateEndpoint(meta)
        if (errors.length > 0) {
          console.warn(`[OpenAPI] Validation errors for ${meta.method} ${meta.path}:`, errors)
          return
        }
        this.register(meta, filePath)
      } catch (error) {
        console.error(`[OpenAPI] Failed to register ${meta.method} ${meta.path}:`, error)
      }
    })
  }
}

/**
 * Decorator function for automatic endpoint registration
 */
export function ApiEndpoint(meta: Omit<APIEndpointMeta, 'method'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Determine HTTP method from function name
    const method = propertyKey.toUpperCase() as APIEndpointMeta['method']
    
    const fullMeta: APIEndpointMeta = {
      ...meta,
      method
    }

    // Register with OpenAPI registry
    const registry = OpenAPIRegistry.getInstance()
    registry.register(fullMeta, target.constructor.name)

    return descriptor
  }
}

/**
 * Helper function for manual endpoint registration
 */
export function registerEndpoint(meta: APIEndpointMeta, filePath?: string): void {
  const registry = OpenAPIRegistry.getInstance()
  registry.register(meta, filePath)
}

/**
 * Get the global OpenAPI registry instance
 */
export function getOpenAPIRegistry(): OpenAPIRegistry {
  return OpenAPIRegistry.getInstance()
}

// Export singleton instance
export const openAPIRegistry = OpenAPIRegistry.getInstance()