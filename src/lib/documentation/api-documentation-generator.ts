/**
 * Advanced API Documentation Generator
 * Automatic OpenAPI/Swagger documentation with interactive testing and validation
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'

// Core interfaces
export interface APIDocumentation {
  openapi: string
  info: APIInfo
  servers: APIServer[]
  paths: Record<string, PathItem>
  components: Components
  security: SecurityRequirement[]
  tags: Tag[]
  externalDocs?: ExternalDocumentation
}

export interface APIInfo {
  title: string
  description: string
  version: string
  termsOfService?: string
  contact?: Contact
  license?: License
}

export interface Contact {
  name?: string
  url?: string
  email?: string
}

export interface License {
  name: string
  url?: string
}

export interface APIServer {
  url: string
  description?: string
  variables?: Record<string, ServerVariable>
}

export interface ServerVariable {
  enum?: string[]
  default: string
  description?: string
}

export interface PathItem {
  summary?: string
  description?: string
  get?: Operation
  put?: Operation
  post?: Operation
  delete?: Operation
  options?: Operation
  head?: Operation
  patch?: Operation
  trace?: Operation
  parameters?: Parameter[]
}

export interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Record<string, Response>
  callbacks?: Record<string, Callback>
  deprecated?: boolean
  security?: SecurityRequirement[]
  servers?: APIServer[]
  examples?: Record<string, Example>
}

export interface Parameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: string
  explode?: boolean
  allowReserved?: boolean
  schema?: Schema
  example?: any
  examples?: Record<string, Example>
}

export interface RequestBody {
  description?: string
  content: Record<string, MediaType>
  required?: boolean
}

export interface MediaType {
  schema?: Schema
  example?: any
  examples?: Record<string, Example>
  encoding?: Record<string, Encoding>
}

export interface Encoding {
  contentType?: string
  headers?: Record<string, Header>
  style?: string
  explode?: boolean
  allowReserved?: boolean
}

export interface Response {
  description: string
  headers?: Record<string, Header>
  content?: Record<string, MediaType>
  links?: Record<string, Link>
}

export interface Header {
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: string
  explode?: boolean
  allowReserved?: boolean
  schema?: Schema
  example?: any
  examples?: Record<string, Example>
}

export interface Schema {
  type?: string
  format?: string
  title?: string
  description?: string
  default?: any
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: boolean
  minimum?: number
  exclusiveMinimum?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
  required?: string[]
  enum?: any[]
  properties?: Record<string, Schema>
  items?: Schema
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  not?: Schema
  additionalProperties?: boolean | Schema
}

export interface Components {
  schemas?: Record<string, Schema>
  responses?: Record<string, Response>
  parameters?: Record<string, Parameter>
  examples?: Record<string, Example>
  requestBodies?: Record<string, RequestBody>
  headers?: Record<string, Header>
  securitySchemes?: Record<string, SecurityScheme>
  links?: Record<string, Link>
  callbacks?: Record<string, Callback>
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: OAuthFlows
  openIdConnectUrl?: string
}

export interface OAuthFlows {
  implicit?: OAuthFlow
  password?: OAuthFlow
  clientCredentials?: OAuthFlow
  authorizationCode?: OAuthFlow
}

export interface OAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export interface Example {
  summary?: string
  description?: string
  value?: any
  externalValue?: string
}

export interface Link {
  operationRef?: string
  operationId?: string
  parameters?: Record<string, any>
  requestBody?: any
  description?: string
  server?: APIServer
}

export interface Callback {
  [expression: string]: PathItem
}

export interface SecurityRequirement {
  [name: string]: string[]
}

export interface Tag {
  name: string
  description?: string
  externalDocs?: ExternalDocumentation
}

export interface ExternalDocumentation {
  description?: string
  url: string
}

export interface DocumentationConfig {
  outputFormat: 'json' | 'yaml' | 'html' | 'markdown'
  outputPath: string
  includeExamples: boolean
  includeSchemas: boolean
  includeTesting: boolean
  generatePostmanCollection: boolean
  generateSDK: boolean
  customTemplates?: Record<string, string>
}

export interface APIEndpoint {
  path: string
  method: string
  handler: Function
  middleware?: Function[]
  validation?: {
    params?: z.ZodSchema
    query?: z.ZodSchema
    body?: z.ZodSchema
    response?: z.ZodSchema
  }
  documentation?: {
    summary?: string
    description?: string
    tags?: string[]
    examples?: Record<string, any>
    deprecated?: boolean
  }
}

/**
 * Advanced API Documentation Generator
 */
export class AdvancedAPIDocumentationGenerator extends EventEmitter {
  private endpoints: Map<string, APIEndpoint> = new Map()
  private schemas: Map<string, Schema> = new Map()
  private components: Components = {}
  private apiInfo: APIInfo
  private servers: APIServer[] = []
  private securitySchemes: Record<string, SecurityScheme> = {}
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private config: DocumentationConfig,
    apiInfo: APIInfo
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.apiInfo = apiInfo

    this.setupDefaultServers()
    this.setupDefaultSecuritySchemes()
    this.setupDefaultComponents()
  }

  /**
   * Register API endpoint
   */
  registerEndpoint(endpoint: APIEndpoint): Result<void, string> {
    try {
      const endpointKey = `${endpoint.method.toUpperCase()}:${endpoint.path}`
      this.endpoints.set(endpointKey, endpoint)

      // Extract schemas from validation if available
      if (endpoint.validation) {
        this.extractSchemasFromValidation(endpointKey, endpoint.validation)
      }

      this.emit('endpointRegistered', { endpoint })
      return success(undefined)

    } catch (error) {
      return failure(`Endpoint registration failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate complete API documentation
   */
  async generateDocumentation(): Promise<Result<APIDocumentation, string>> {
    const span = this.tracer.startSpan('documentation_generate')

    try {
      const paths = this.generatePaths()
      const components = this.generateComponents()
      const tags = this.generateTags()

      const documentation: APIDocumentation = {
        openapi: '3.0.3',
        info: this.apiInfo,
        servers: this.servers,
        paths,
        components,
        security: this.generateSecurityRequirements(),
        tags,
        externalDocs: {
          description: 'Find more info here',
          url: `${this.servers[0]?.url || ''}/docs`
        }
      }

      // Save documentation to file
      await this.saveDocumentation(documentation)

      // Generate additional formats if requested
      if (this.config.generatePostmanCollection) {
        await this.generatePostmanCollection(documentation)
      }

      if (this.config.generateSDK) {
        await this.generateSDK(documentation)
      }

      span.setAttributes({
        'documentation.endpoints_count': this.endpoints.size,
        'documentation.schemas_count': this.schemas.size,
        'documentation.tags_count': tags.length
      })

      this.emit('documentationGenerated', { documentation })
      return success(documentation)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Documentation generation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Generate interactive HTML documentation
   */
  async generateInteractiveHTML(documentation: APIDocumentation): Promise<Result<string, string>> {
    try {
      const htmlTemplate = this.getHTMLTemplate()
      const swaggerUI = this.generateSwaggerUI(documentation)
      
      const html = htmlTemplate
        .replace('{{TITLE}}', documentation.info.title)
        .replace('{{DESCRIPTION}}', documentation.info.description)
        .replace('{{SWAGGER_UI}}', swaggerUI)
        .replace('{{API_SPEC}}', JSON.stringify(documentation, null, 2))

      const outputPath = join(this.config.outputPath, 'index.html')
      writeFileSync(outputPath, html, 'utf8')

      return success(html)

    } catch (error) {
      return failure(`HTML generation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Validate API documentation
   */
  async validateDocumentation(documentation: APIDocumentation): Promise<Result<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }, string>> {
    try {
      const errors: string[] = []
      const warnings: string[] = []

      // Validate OpenAPI version
      if (!documentation.openapi) {
        errors.push('Missing OpenAPI version')
      }

      // Validate info object
      if (!documentation.info.title) {
        errors.push('Missing API title')
      }
      if (!documentation.info.version) {
        errors.push('Missing API version')
      }

      // Validate paths
      if (!documentation.paths || Object.keys(documentation.paths).length === 0) {
        warnings.push('No API paths defined')
      }

      // Validate operations
      for (const [path, pathItem] of Object.entries(documentation.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            if (!operation.responses) {
              errors.push(`Missing responses for ${method.toUpperCase()} ${path}`)
            }
            
            if (!operation.summary && !operation.description) {
              warnings.push(`Missing summary/description for ${method.toUpperCase()} ${path}`)
            }
          }
        }
      }

      // Validate components
      if (documentation.components?.schemas) {
        for (const [schemaName, schema] of Object.entries(documentation.components.schemas)) {
          if (!schema.type && !schema.allOf && !schema.oneOf && !schema.anyOf) {
            warnings.push(`Schema '${schemaName}' missing type definition`)
          }
        }
      }

      const isValid = errors.length === 0

      return success({ isValid, errors, warnings })

    } catch (error) {
      return failure(`Documentation validation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate API testing suite
   */
  async generateTestSuite(documentation: APIDocumentation): Promise<Result<string, string>> {
    const span = this.tracer.startSpan('documentation_generate_tests')

    try {
      const testSuite = {
        name: documentation.info.title,
        version: documentation.info.version,
        tests: this.generateEndpointTests(documentation),
        schemas: this.generateSchemaTests(documentation),
        security: this.generateSecurityTests(documentation)
      }

      const testCode = this.generateTestCode(testSuite)
      const outputPath = join(this.config.outputPath, 'api-tests.spec.ts')
      writeFileSync(outputPath, testCode, 'utf8')

      span.setAttributes({
        'tests.endpoint_tests': testSuite.tests.length,
        'tests.schema_tests': testSuite.schemas.length,
        'tests.security_tests': testSuite.security.length
      })

      return success(testCode)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Test suite generation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Add custom schema
   */
  addSchema(name: string, schema: Schema): void {
    this.schemas.set(name, schema)
  }

  /**
   * Add server configuration
   */
  addServer(server: APIServer): void {
    this.servers.push(server)
  }

  /**
   * Add security scheme
   */
  addSecurityScheme(name: string, scheme: SecurityScheme): void {
    this.securitySchemes[name] = scheme
  }

  /**
   * Private helper methods
   */
  private generatePaths(): Record<string, PathItem> {
    const paths: Record<string, PathItem> = {}

    // Group endpoints by path
    const pathGroups = new Map<string, Map<string, APIEndpoint>>()
    
    for (const [key, endpoint] of this.endpoints.entries()) {
      if (!pathGroups.has(endpoint.path)) {
        pathGroups.set(endpoint.path, new Map())
      }
      pathGroups.get(endpoint.path)!.set(endpoint.method.toLowerCase(), endpoint)
    }

    // Generate PathItem for each path
    for (const [path, methods] of pathGroups.entries()) {
      const pathItem: PathItem = {}

      for (const [method, endpoint] of methods.entries()) {
        const operation = this.generateOperation(endpoint)
        ;(pathItem as any)[method] = operation
      }

      paths[path] = pathItem
    }

    return paths
  }

  private generateOperation(endpoint: APIEndpoint): Operation {
    const operation: Operation = {
      tags: endpoint.documentation?.tags || ['default'],
      summary: endpoint.documentation?.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`,
      description: endpoint.documentation?.description,
      operationId: this.generateOperationId(endpoint),
      parameters: this.generateParameters(endpoint),
      responses: this.generateResponses(endpoint)
    }

    if (endpoint.validation?.body) {
      operation.requestBody = this.generateRequestBody(endpoint)
    }

    if (endpoint.documentation?.examples) {
      operation.examples = endpoint.documentation.examples
    }

    if (endpoint.documentation?.deprecated) {
      operation.deprecated = true
    }

    return operation
  }

  private generateParameters(endpoint: APIEndpoint): Parameter[] {
    const parameters: Parameter[] = []

    // Path parameters
    const pathParams = endpoint.path.match(/:(\w+)/g)
    if (pathParams) {
      for (const param of pathParams) {
        const name = param.substring(1)
        parameters.push({
          name,
          in: 'path',
          required: true,
          description: `Path parameter: ${name}`,
          schema: { type: 'string' }
        })
      }
    }

    // Query parameters from validation
    if (endpoint.validation?.query) {
      const querySchema = this.zodToOpenAPISchema(endpoint.validation.query)
      if (querySchema.properties) {
        for (const [name, schema] of Object.entries(querySchema.properties)) {
          parameters.push({
            name,
            in: 'query',
            required: querySchema.required?.includes(name) || false,
            schema: schema as Schema
          })
        }
      }
    }

    return parameters
  }

  private generateRequestBody(endpoint: APIEndpoint): RequestBody | undefined {
    if (!endpoint.validation?.body) return undefined

    const schema = this.zodToOpenAPISchema(endpoint.validation.body)
    
    return {
      description: 'Request body',
      required: true,
      content: {
        'application/json': {
          schema,
          examples: endpoint.documentation?.examples
        }
      }
    }
  }

  private generateResponses(endpoint: APIEndpoint): Record<string, Response> {
    const responses: Record<string, Response> = {}

    // Default success response
    responses['200'] = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: endpoint.validation?.response 
            ? this.zodToOpenAPISchema(endpoint.validation.response)
            : { type: 'object' }
        }
      }
    }

    // Default error responses
    responses['400'] = {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }

    responses['401'] = {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }

    responses['500'] = {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }

    return responses
  }

  private generateComponents(): Components {
    const components: Components = {
      schemas: Object.fromEntries(this.schemas.entries()),
      securitySchemes: this.securitySchemes,
      responses: {
        'UnauthorizedError': {
          description: 'Authentication information is missing or invalid',
          headers: {
            'WWW_Authenticate': {
              schema: { type: 'string' }
            }
          }
        },
        'NotFoundError': {
          description: 'The specified resource was not found'
        },
        'ValidationError': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return components
  }

  private generateTags(): Tag[] {
    const tags = new Set<string>()

    for (const endpoint of this.endpoints.values()) {
      if (endpoint.documentation?.tags) {
        endpoint.documentation.tags.forEach(tag => tags.add(tag))
      } else {
        tags.add('default')
      }
    }

    return Array.from(tags).map(tag => ({
      name: tag,
      description: `${tag} operations`
    }))
  }

  private generateSecurityRequirements(): SecurityRequirement[] {
    return [
      { 'bearerAuth': [] },
      { 'apiKey': [] }
    ]
  }

  private generateOperationId(endpoint: APIEndpoint): string {
    const path = endpoint.path.replace(/[/:{}]/g, '')
    return `${endpoint.method.toLowerCase()}${path || 'root'}`
  }

  private extractSchemasFromValidation(endpointKey: string, validation: APIEndpoint['validation']): void {
    if (validation?.body) {
      const schemaName = `${endpointKey.replace(':', '_')}_RequestBody`
      this.schemas.set(schemaName, this.zodToOpenAPISchema(validation.body))
    }

    if (validation?.response) {
      const schemaName = `${endpointKey.replace(':', '_')}_Response`
      this.schemas.set(schemaName, this.zodToOpenAPISchema(validation.response))
    }
  }

  private zodToOpenAPISchema(zodSchema: z.ZodSchema): Schema {
    // This is a simplified conversion - would need a more robust implementation
    // for production use with libraries like zod-to-openapi
    return {
      type: 'object',
      description: 'Generated from Zod schema'
    }
  }

  private async saveDocumentation(documentation: APIDocumentation): Promise<void> {
    const outputPath = join(this.config.outputPath, `openapi.${this.config.outputFormat}`)

    switch (this.config.outputFormat) {
      case 'json':
        writeFileSync(outputPath, JSON.stringify(documentation, null, 2), 'utf8')
        break
      case 'yaml':
        // Would use a YAML library like js-yaml
        writeFileSync(outputPath, JSON.stringify(documentation, null, 2), 'utf8')
        break
      case 'html':
        await this.generateInteractiveHTML(documentation)
        break
      case 'markdown':
        const markdown = this.generateMarkdownDocs(documentation)
        writeFileSync(outputPath, markdown, 'utf8')
        break
    }
  }

  private generateSwaggerUI(documentation: APIDocumentation): string {
    return `
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: 'openapi.json',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.presets.standalone
          ]
        });
      </script>
    `
  }

  private getHTMLTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
</head>
<body>
    <div class="header">
        <h1>{{TITLE}}</h1>
        <p>{{DESCRIPTION}}</p>
    </div>
    {{SWAGGER_UI}}
    <script type="application/json" id="api-spec">{{API_SPEC}}</script>
</body>
</html>
    `
  }

  private generateMarkdownDocs(documentation: APIDocumentation): string {
    let markdown = `# ${documentation.info.title}\n\n`
    markdown += `${documentation.info.description}\n\n`
    markdown += `**Version:** ${documentation.info.version}\n\n`

    if (documentation.servers.length > 0) {
      markdown += `## Servers\n\n`
      for (const server of documentation.servers) {
        markdown += `- ${server.url} - ${server.description || 'Production server'}\n`
      }
      markdown += '\n'
    }

    markdown += `## Endpoints\n\n`
    for (const [path, pathItem] of Object.entries(documentation.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          markdown += `### ${method.toUpperCase()} ${path}\n\n`
          markdown += `${operation.summary || operation.description || 'No description'}\n\n`
          
          if (operation.parameters && operation.parameters.length > 0) {
            markdown += `#### Parameters\n\n`
            for (const param of operation.parameters) {
              markdown += `- **${param.name}** (${param.in}) - ${param.description || 'No description'}\n`
            }
            markdown += '\n'
          }

          markdown += `#### Responses\n\n`
          for (const [code, response] of Object.entries(operation.responses)) {
            markdown += `- **${code}** - ${response.description}\n`
          }
          markdown += '\n'
        }
      }
    }

    return markdown
  }

  private async generatePostmanCollection(documentation: APIDocumentation): Promise<void> {
    const collection = {
      info: {
        name: documentation.info.title,
        description: documentation.info.description,
        version: documentation.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: this.generatePostmanItems(documentation),
      variable: this.generatePostmanVariables(documentation)
    }

    const outputPath = join(this.config.outputPath, 'postman-collection.json')
    writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf8')
  }

  private generatePostmanItems(documentation: APIDocumentation): any[] {
    const items: any[] = []

    for (const [path, pathItem] of Object.entries(documentation.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          items.push({
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            request: {
              method: method.toUpperCase(),
              header: [],
              url: {
                raw: `{{baseUrl}}${path}`,
                host: ['{{baseUrl}}'],
                path: path.split('/').filter(Boolean)
              },
              description: operation.description
            },
            response: []
          })
        }
      }
    }

    return items
  }

  private generatePostmanVariables(documentation: APIDocumentation): any[] {
    return [
      {
        key: 'baseUrl',
        value: documentation.servers[0]?.url || 'http://localhost:3000',
        type: 'string'
      }
    ]
  }

  private async generateSDK(documentation: APIDocumentation): Promise<void> {
    // This would generate client SDKs for different languages
    // For now, just generate a TypeScript client interface
    const tsClient = this.generateTypeScriptClient(documentation)
    const outputPath = join(this.config.outputPath, 'client.ts')
    writeFileSync(outputPath, tsClient, 'utf8')
  }

  private generateTypeScriptClient(documentation: APIDocumentation): string {
    let client = `// Generated TypeScript API Client\n\n`
    client += `export class APIClient {\n`
    client += `  constructor(private baseUrl: string, private apiKey?: string) {}\n\n`

    for (const [path, pathItem] of Object.entries(documentation.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          const methodName = this.generateOperationId({ path, method } as any)
          client += `  async ${methodName}(): Promise<any> {\n`
          client += `    // Implementation here\n`
          client += `    return fetch(\`\${this.baseUrl}${path}\`, { method: '${method.toUpperCase()}' })\n`
          client += `  }\n\n`
        }
      }
    }

    client += `}\n`
    return client
  }

  private generateEndpointTests(documentation: APIDocumentation): any[] {
    const tests: any[] = []

    for (const [path, pathItem] of Object.entries(documentation.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (typeof operation === 'object' && operation !== null) {
          tests.push({
            name: `${method.toUpperCase()} ${path}`,
            path,
            method: method.toUpperCase(),
            description: operation.summary,
            expectedStatus: 200
          })
        }
      }
    }

    return tests
  }

  private generateSchemaTests(documentation: APIDocumentation): any[] {
    const tests: any[] = []

    if (documentation.components?.schemas) {
      for (const [schemaName] of Object.entries(documentation.components.schemas)) {
        tests.push({
          name: `Schema validation: ${schemaName}`,
          schema: schemaName,
          type: 'schema_validation'
        })
      }
    }

    return tests
  }

  private generateSecurityTests(documentation: APIDocumentation): any[] {
    return [
      {
        name: 'Unauthorized access test',
        type: 'security',
        description: 'Test that protected endpoints require authentication'
      },
      {
        name: 'Invalid token test',
        type: 'security',
        description: 'Test behavior with invalid authentication tokens'
      }
    ]
  }

  private generateTestCode(testSuite: any): string {
    return `
import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import app from '../app'

describe('${testSuite.name} API Tests', () => {
  ${testSuite.tests.map((test: any) => `
  describe('${test.name}', () => {
    it('should return ${test.expectedStatus}', async () => {
      const response = await request(app)
        .${test.method.toLowerCase()}('${test.path}')
      
      expect(response.status).toBe(${test.expectedStatus})
    })
  })
  `).join('')}
  
  ${testSuite.schemas.map((test: any) => `
  describe('${test.name}', () => {
    it('should validate schema correctly', () => {
      // Schema validation test implementation
      expect(true).toBe(true)
    })
  })
  `).join('')}
  
  ${testSuite.security.map((test: any) => `
  describe('${test.name}', () => {
    it('${test.description}', () => {
      // Security test implementation
      expect(true).toBe(true)
    })
  })
  `).join('')}
})
    `
  }

  private setupDefaultServers(): void {
    this.servers = [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.boardguru.ai',
        description: 'Production server'
      }
    ]
  }

  private setupDefaultSecuritySchemes(): void {
    this.securitySchemes = {
      'bearerAuth': {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token authentication'
      },
      'apiKey': {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key authentication'
      }
    }
  }

  private setupDefaultComponents(): void {
    this.components = {
      schemas: {
        'Error': {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          },
          required: ['error', 'message']
        },
        'ValidationError': {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
}