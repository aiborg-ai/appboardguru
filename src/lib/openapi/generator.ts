/**
 * OpenAPI Schema Generator
 * Automatically generates OpenAPI specs from Zod schemas and API handlers
 */

import { z, ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

// OpenAPI specification interfaces
export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  servers: Array<{
    url: string
    description?: string
  }>
  paths: Record<string, PathItem>
  components?: {
    schemas?: Record<string, any>
    securitySchemes?: Record<string, any>
  }
}

export interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  delete?: Operation
  patch?: Operation
}

export interface Operation {
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Record<string, Response>
  security?: Array<Record<string, string[]>>
}

export interface Parameter {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  required?: boolean
  schema: any
  description?: string
}

export interface RequestBody {
  required?: boolean
  content: Record<string, MediaType>
}

export interface Response {
  description: string
  content?: Record<string, MediaType>
  headers?: Record<string, Header>
}

export interface MediaType {
  schema: any
  examples?: Record<string, any>
}

export interface Header {
  schema: any
  description?: string
}

// API endpoint metadata for documentation
export interface APIEndpointMeta {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  summary: string
  description?: string
  tags?: string[]
  requestSchema?: ZodSchema
  querySchema?: ZodSchema
  responseSchema?: ZodSchema
  requiresAuth?: boolean
  rateLimit?: string
  examples?: {
    request?: any
    response?: any
  }
}

export class OpenAPIGenerator {
  private spec: OpenAPISpec
  private schemas: Map<string, any> = new Map()
  
  constructor(
    title: string,
    version: string,
    description?: string,
    servers: Array<{ url: string; description?: string }> = []
  ) {
    this.spec = {
      openapi: '3.0.3',
      info: { title, version, description },
      servers: servers.length > 0 ? servers : [
        { url: 'http://localhost:3000', description: 'Development server' },
        { url: 'https://api.example.com', description: 'Production server' }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      }
    }
  }
  
  /**
   * Add API endpoint to the spec
   */
  addEndpoint(meta: APIEndpointMeta): this {
    const path = this.normalizePath(meta.path)
    
    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {}
    }
    
    const operation: Operation = {
      summary: meta.summary,
      description: meta.description,
      operationId: this.generateOperationId(meta.method, path),
      tags: meta.tags || this.extractTagFromPath(path),
      responses: this.generateResponses(meta.responseSchema, meta.examples?.response)
    }
    
    // Add security if required
    if (meta.requiresAuth) {
      operation.security = [{ BearerAuth: [] }]
    }
    
    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(meta.method) && meta.requestSchema) {
      operation.requestBody = this.generateRequestBody(meta.requestSchema, meta.examples?.request)
    }
    
    // Add query parameters
    if (meta.querySchema) {
      operation.parameters = this.generateQueryParameters(meta.querySchema)
    }
    
    // Add rate limiting info in description
    if (meta.rateLimit) {
      operation.description = `${operation.description || ''}\n\n**Rate Limit:** ${meta.rateLimit}`.trim()
    }
    
    this.spec.paths[path][meta.method.toLowerCase() as keyof PathItem] = operation
    
    return this
  }
  
  /**
   * Generate request body from Zod schema
   */
  private generateRequestBody(schema: ZodSchema, example?: any): RequestBody {
    const jsonSchema = this.zodToOpenApiSchema(schema)
    
    return {
      required: true,
      content: {
        'application/json': {
          schema: jsonSchema,
          ...(example && { examples: { default: { value: example } } })
        }
      }
    }
  }
  
  /**
   * Generate query parameters from Zod schema
   */
  private generateQueryParameters(schema: ZodSchema): Parameter[] {
    const jsonSchema = this.zodToOpenApiSchema(schema)
    const parameters: Parameter[] = []
    
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      Object.entries(jsonSchema.properties).forEach(([name, propSchema]) => {
        parameters.push({
          name,
          in: 'query',
          required: jsonSchema.required?.includes(name) || false,
          schema: propSchema,
          description: (propSchema as any).description
        })
      })
    }
    
    return parameters
  }
  
  /**
   * Generate responses
   */
  private generateResponses(responseSchema?: ZodSchema, example?: any): Record<string, Response> {
    const responses: Record<string, Response> = {
      '400': {
        description: 'Bad Request - Invalid input or validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Validation failed' },
                    details: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      },
      '401': {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authentication required' }
                  }
                }
              }
            }
          }
        }
      },
      '429': {
        description: 'Too Many Requests - Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'RATE_LIMITED' },
                    message: { type: 'string', example: 'Rate limit exceeded' }
                  }
                }
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'INTERNAL_ERROR' },
                    message: { type: 'string', example: 'Internal server error' }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Add success response
    if (responseSchema) {
      const jsonSchema = this.zodToOpenApiSchema(responseSchema)
      responses['200'] = {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: jsonSchema,
                meta: {
                  type: 'object',
                  properties: {
                    timing: {
                      type: 'object',
                      properties: {
                        duration: { type: 'number' },
                        cached: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            },
            ...(example && { examples: { default: { value: { success: true, data: example } } } })
          }
        }
      }
    } else {
      responses['200'] = {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' }
              }
            }
          }
        }
      }
    }
    
    return responses
  }
  
  /**
   * Convert Zod schema to OpenAPI schema
   */
  private zodToOpenApiSchema(schema: ZodSchema): any {
    try {
      return zodToJsonSchema(schema, {
        target: 'openApi3',
        $refStrategy: 'relative'
      })
    } catch (error) {
      console.warn('Failed to convert Zod schema to JSON schema:', error)
      return { type: 'object' }
    }
  }
  
  /**
   * Normalize API path for OpenAPI
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/api/, '') // Remove /api prefix
      .replace(/\[([^\]]+)\]/g, '{$1}') // Convert Next.js [id] to OpenAPI {id}
      .replace(/\/+$/, '') || '/' // Remove trailing slashes
  }
  
  /**
   * Generate operation ID from method and path
   */
  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split('/').filter(Boolean)
    const resource = pathParts[pathParts.length - 1]
    
    const methodMap: Record<string, string> = {
      GET: pathParts.some(p => p.includes('{')) ? 'get' : 'list',
      POST: 'create',
      PUT: 'update',
      PATCH: 'patch',
      DELETE: 'delete'
    }
    
    return `${methodMap[method] || method.toLowerCase()}${this.capitalize(resource || 'resource')}`
  }
  
  /**
   * Extract tags from path
   */
  private extractTagFromPath(path: string): string[] {
    const parts = path.split('/').filter(Boolean)
    return parts.length > 0 ? [this.capitalize(parts[0])] : ['API']
  }
  
  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }
  
  /**
   * Get the complete OpenAPI specification
   */
  getSpec(): OpenAPISpec {
    // Add collected schemas to components
    this.spec.components!.schemas = Object.fromEntries(this.schemas)
    return this.spec
  }
  
  /**
   * Generate OpenAPI spec as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.getSpec(), null, 2)
  }
  
  /**
   * Generate OpenAPI spec as YAML string
   */
  toYAML(): string {
    // Simple YAML conversion - in production, use a proper YAML library
    const spec = this.getSpec()
    return this.objectToYAML(spec, 0)
  }
  
  private objectToYAML(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent)
    let yaml = ''
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue
      
      yaml += `${spaces}${key}:`
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += '\n' + this.objectToYAML(value, indent + 1)
      } else if (Array.isArray(value)) {
        yaml += '\n'
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.objectToYAML(item, indent + 2)}`
          } else {
            yaml += `${spaces}  - ${item}\n`
          }
        })
      } else {
        yaml += ` ${typeof value === 'string' ? `"${value}"` : value}\n`
      }
    }
    
    return yaml
  }
}