/**
 * Enhanced API Documentation Generator
 * Generates comprehensive OpenAPI specs, interactive docs, and SDKs
 */

import { OpenAPIV3 } from 'openapi-types'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { OpenAPIRegistry, getOpenAPIRegistry } from '../../openapi/registry'
import { typeDefs } from '../../graphql/schema'
import { buildSchema, printSchema, GraphQLSchema } from 'graphql'

export interface APIDocumentationConfig {
  outputDir: string
  includeGraphQL: boolean
  includeSamples: boolean
  includeSDKs: boolean
  supportedLanguages: string[]
  generateChangelog: boolean
  includePostmanCollection: boolean
  includeCurlExamples: boolean
  themeConfig?: {
    primaryColor: string
    logo: string
    customCSS?: string
  }
}

export interface EndpointExample {
  summary: string
  description: string
  request: {
    headers?: Record<string, string>
    body?: any
    queryParams?: Record<string, string>
  }
  response: {
    status: number
    headers?: Record<string, string>
    body: any
  }
}

export interface SDKConfig {
  language: string
  packageName: string
  version: string
  description: string
  repository?: string
  author?: string
  license?: string
}

export class EnhancedAPIDocumentationGenerator {
  private registry: OpenAPIRegistry
  private config: APIDocumentationConfig
  private graphqlSchema?: GraphQLSchema

  constructor(config: APIDocumentationConfig) {
    this.config = {
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
      ...config
    }
    this.registry = getOpenAPIRegistry()
    
    if (config.includeGraphQL) {
      try {
        this.graphqlSchema = buildSchema(typeDefs.loc?.source.body || '')
      } catch (error) {
        console.error('Failed to build GraphQL schema for documentation:', error)
      }
    }
  }

  /**
   * Generate complete API documentation suite
   */
  async generateAll(): Promise<void> {
    await this.ensureOutputDirectory()
    
    console.log('🚀 Generating comprehensive API documentation...')
    
    // Generate OpenAPI specification
    const openAPISpec = await this.generateEnhancedOpenAPISpec()
    await this.writeOpenAPISpec(openAPISpec)
    
    // Generate interactive documentation
    await this.generateInteractiveDocumentation(openAPISpec)
    
    // Generate GraphQL documentation
    if (this.config.includeGraphQL && this.graphqlSchema) {
      await this.generateGraphQLDocumentation()
    }
    
    // Generate endpoint examples
    if (this.config.includeSamples) {
      await this.generateEndpointExamples(openAPISpec)
    }
    
    // Generate cURL examples
    if (this.config.includeCurlExamples) {
      await this.generateCurlExamples(openAPISpec)
    }
    
    // Generate Postman collection
    if (this.config.includePostmanCollection) {
      await this.generatePostmanCollection(openAPISpec)
    }
    
    // Generate SDKs
    if (this.config.includeSDKs) {
      await this.generateSDKs(openAPISpec)
    }
    
    // Generate changelog
    if (this.config.generateChangelog) {
      await this.generateChangelog()
    }
    
    // Generate migration guides
    await this.generateMigrationGuides()
    
    console.log('✅ API documentation generation complete!')
    console.log(`📖 Documentation available at: ${join(this.config.outputDir, 'index.html')}`)
  }

  /**
   * Generate enhanced OpenAPI specification with examples and detailed schemas
   */
  private async generateEnhancedOpenAPISpec(): Promise<OpenAPIV3.Document> {
    const baseSpec = JSON.parse(this.registry.generateSpec()) as OpenAPIV3.Document
    
    // Enhance with additional information
    baseSpec.info = {
      ...baseSpec.info,
      version: process.env.API_VERSION || '1.0.0',
      description: this.generateAPIDescription(),
      termsOfService: process.env.TERMS_OF_SERVICE_URL,
      contact: {
        name: 'AppBoardGuru API Support',
        email: 'api-support@appboardguru.com',
        url: 'https://appboardguru.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    }

    // Add security schemes
    baseSpec.components = {
      ...baseSpec.components,
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      }
    }

    // Add global security
    baseSpec.security = [
      { ApiKeyAuth: [] },
      { BearerAuth: [] }
    ]

    // Add servers with different environments
    baseSpec.servers = [
      {
        url: process.env.PRODUCTION_API_URL || 'https://api.appboardguru.com',
        description: 'Production server'
      },
      {
        url: process.env.STAGING_API_URL || 'https://staging-api.appboardguru.com',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]

    // Enhance paths with examples and additional documentation
    if (baseSpec.paths) {
      for (const [path, pathItem] of Object.entries(baseSpec.paths)) {
        if (pathItem && typeof pathItem === 'object') {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (operation && typeof operation === 'object' && 'responses' in operation) {
              await this.enhanceOperation(operation as OpenAPIV3.OperationObject, path, method)
            }
          }
        }
      }
    }

    // Add common response schemas
    baseSpec.components = {
      ...baseSpec.components,
      schemas: {
        ...baseSpec.components?.schemas,
        ...this.generateCommonSchemas()
      }
    }

    return baseSpec
  }

  private generateAPIDescription(): string {
    return `
# AppBoardGuru API

Welcome to the AppBoardGuru API! This comprehensive API provides access to board governance, asset management, and collaboration features.

## Features

- 🔐 **Secure Authentication** - API key and JWT-based authentication
- 📊 **Comprehensive Asset Management** - Upload, organize, and collaborate on documents
- 🏢 **Organization Management** - Multi-tenant organization support
- 📋 **Board Governance** - Meeting management, resolutions, and actionables  
- 🔍 **Advanced Search** - Full-text search across all content
- 📈 **Analytics & Reporting** - Detailed usage and performance metrics
- 🔄 **Real-time Collaboration** - WebSocket-based real-time features
- 📱 **GraphQL Support** - Flexible querying with GraphQL endpoint

## Getting Started

1. **Get an API Key** - Contact support to obtain your API key
2. **Choose Your Approach** - Use REST endpoints or GraphQL
3. **Make Your First Request** - Try the health check endpoint
4. **Explore the Docs** - Use the interactive documentation below

## Rate Limits

API requests are rate-limited based on your subscription tier:

- **Free Tier**: 1,000 requests/hour
- **Premium Tier**: 10,000 requests/hour  
- **Enterprise Tier**: 100,000 requests/hour

## Support

- 📧 **Email**: api-support@appboardguru.com
- 💬 **Chat**: Available in your dashboard
- 📖 **Documentation**: https://docs.appboardguru.com
- 🐛 **Issues**: https://github.com/appboardguru/api/issues
    `.trim()
  }

  private async enhanceOperation(
    operation: OpenAPIV3.OperationObject, 
    path: string, 
    method: string
  ): Promise<void> {
    // Add examples based on endpoint type
    const examples = await this.generateOperationExamples(path, method)
    
    if (examples.length > 0) {
      // Add request examples
      if (operation.requestBody && typeof operation.requestBody === 'object' && 'content' in operation.requestBody) {
        for (const [mediaType, mediaTypeObject] of Object.entries(operation.requestBody.content)) {
          if (mediaTypeObject && typeof mediaTypeObject === 'object') {
            mediaTypeObject.examples = examples.reduce((acc, example) => {
              acc[example.summary.toLowerCase().replace(/\s+/g, '_')] = {
                summary: example.summary,
                description: example.description,
                value: example.request.body
              }
              return acc
            }, {} as Record<string, OpenAPIV3.ExampleObject>)
          }
        }
      }

      // Add response examples
      if (operation.responses) {
        for (const [status, response] of Object.entries(operation.responses)) {
          if (response && typeof response === 'object' && 'content' in response) {
            const matchingExamples = examples.filter(ex => ex.response.status.toString() === status)
            if (matchingExamples.length > 0 && response.content) {
              for (const [mediaType, mediaTypeObject] of Object.entries(response.content)) {
                if (mediaTypeObject && typeof mediaTypeObject === 'object') {
                  mediaTypeObject.examples = matchingExamples.reduce((acc, example) => {
                    acc[example.summary.toLowerCase().replace(/\s+/g, '_')] = {
                      summary: example.summary,
                      description: example.description,
                      value: example.response.body
                    }
                    return acc
                  }, {} as Record<string, OpenAPIV3.ExampleObject>)
                }
              }
            }
          }
        }
      }
    }

    // Add rate limiting information
    if (this.isRateLimitedEndpoint(path, method)) {
      operation.description = (operation.description || '') + '\n\n**Rate Limiting**: This endpoint is rate-limited. See the rate limiting section for details.'
    }

    // Add authentication requirements
    if (this.requiresAuth(path, method)) {
      operation.security = [{ ApiKeyAuth: [] }]
    }
  }

  private async generateOperationExamples(path: string, method: string): Promise<EndpointExample[]> {
    const examples: EndpointExample[] = []

    // Generate examples based on common patterns
    if (path.includes('/assets') && method === 'GET') {
      examples.push({
        summary: 'List Assets',
        description: 'Get a list of assets with pagination',
        request: {
          headers: { 'X-API-Key': 'your-api-key' },
          queryParams: { page: '1', limit: '20' }
        },
        response: {
          status: 200,
          body: {
            success: true,
            data: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Board Meeting Minutes - Q1 2024',
                description: 'Quarterly board meeting minutes',
                fileName: 'board-minutes-q1-2024.pdf',
                fileSize: 2048576,
                contentType: 'application/pdf',
                status: 'ready',
                createdAt: '2024-03-15T10:30:00Z'
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 45,
              totalPages: 3
            }
          }
        }
      })
    }

    if (path.includes('/organizations') && method === 'POST') {
      examples.push({
        summary: 'Create Organization',
        description: 'Create a new organization',
        request: {
          headers: { 'X-API-Key': 'your-api-key', 'Content-Type': 'application/json' },
          body: {
            name: 'Acme Corporation',
            description: 'A leading technology company',
            website: 'https://acme.com'
          }
        },
        response: {
          status: 201,
          body: {
            success: true,
            data: {
              id: '987fcdeb-51d2-4a1b-9c3e-123456789abc',
              name: 'Acme Corporation',
              description: 'A leading technology company',
              website: 'https://acme.com',
              slug: 'acme-corporation',
              createdAt: '2024-03-15T10:30:00Z'
            }
          }
        }
      })
    }

    return examples
  }

  private generateCommonSchemas(): Record<string, OpenAPIV3.SchemaObject> {
    return {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Resource not found' },
          code: { type: 'string', example: 'RESOURCE_NOT_FOUND' },
          details: { type: 'object' },
          requestId: { type: 'string', example: 'req_123456789' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, example: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
          total: { type: 'integer', minimum: 0, example: 45 },
          totalPages: { type: 'integer', minimum: 0, example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPreviousPage: { type: 'boolean', example: false }
        }
      },
      UUID: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        example: '123e4567-e89b-12d3-a456-426614174000'
      },
      Timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-03-15T10:30:00Z'
      }
    }
  }

  private async generateInteractiveDocumentation(spec: OpenAPIV3.Document): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spec.info.title} - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui.css" />
    <style>
        ${this.generateCustomCSS()}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: './openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.presets.standalone
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                filter: true,
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                onComplete: function() {
                    console.log('Swagger UI loaded successfully');
                }
            });
        }
    </script>
</body>
</html>
    `.trim()

    await this.writeFile('index.html', htmlContent)
  }

  private generateCustomCSS(): string {
    const primaryColor = this.config.themeConfig?.primaryColor || '#3b82f6'
    
    return `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { color: ${primaryColor}; }
        .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .swagger-ui .btn.authorize { background-color: ${primaryColor}; border-color: ${primaryColor}; }
        .swagger-ui .btn.authorize:hover { background-color: ${this.darkenColor(primaryColor, 0.1)}; }
        ${this.config.themeConfig?.customCSS || ''}
    `
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening - in production, use a proper color manipulation library
    return color // Placeholder
  }

  private async generateGraphQLDocumentation(): Promise<void> {
    if (!this.graphqlSchema) return

    const schemaString = printSchema(this.graphqlSchema)
    
    const graphqlDocs = `
# GraphQL Schema

AppBoardGuru provides a powerful GraphQL API that allows you to query and mutate data with precise control over the response structure.

## Endpoint

\`\`\`
POST /api/graphql
\`\`\`

## Authentication

Include your API key in the request headers:

\`\`\`
X-API-Key: your-api-key
Content-Type: application/json
\`\`\`

## Schema

\`\`\`graphql
${schemaString}
\`\`\`

## Example Queries

### Get User Profile with Organizations

\`\`\`graphql
query GetUserProfile {
  me {
    id
    fullName
    email
    organizations {
      id
      name
      slug
      memberCount
    }
  }
}
\`\`\`

### List Assets with Pagination

\`\`\`graphql
query ListAssets($filters: AssetFilters, $pagination: PaginationInput) {
  assets(filters: $filters, pagination: $pagination) {
    edges {
      node {
        id
        title
        description
        status
        uploader {
          fullName
        }
        organization {
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    totalCount
  }
}
\`\`\`

### Create Asset

\`\`\`graphql
mutation CreateAsset($input: CreateAssetInput!, $file: Upload!) {
  createAsset(input: $input, file: $file) {
    id
    title
    status
    filePath
  }
}
\`\`\`

## Subscriptions

GraphQL subscriptions provide real-time updates:

\`\`\`graphql
subscription AssetUpdates($assetId: UUID!) {
  assetStatusChanged(assetId: $assetId) {
    asset {
      id
      status
    }
    previousStatus
    newStatus
  }
}
\`\`\`

## Error Handling

GraphQL errors are returned in the standard format:

\`\`\`json
{
  "errors": [
    {
      "message": "Asset not found",
      "extensions": {
        "code": "ASSET_NOT_FOUND"
      }
    }
  ]
}
\`\`\`
    `.trim()

    await this.writeFile('graphql.md', graphqlDocs)
  }

  private async generateEndpointExamples(spec: OpenAPIV3.Document): Promise<void> {
    const examples: Record<string, any> = {}

    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (pathItem && typeof pathItem === 'object') {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (operation && typeof operation === 'object' && 'responses' in operation) {
              const op = operation as OpenAPIV3.OperationObject
              const key = `${method.toUpperCase()} ${path}`
              
              examples[key] = {
                summary: op.summary,
                description: op.description,
                operationId: op.operationId,
                tags: op.tags
              }
            }
          }
        }
      }
    }

    await this.writeFile('examples.json', JSON.stringify(examples, null, 2))
  }

  private async generateCurlExamples(spec: OpenAPIV3.Document): Promise<void> {
    const curlExamples: string[] = []

    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (pathItem && typeof pathItem === 'object') {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (operation && typeof operation === 'object' && 'responses' in operation) {
              const op = operation as OpenAPIV3.OperationObject
              const curl = this.generateCurlCommand(path, method.toUpperCase(), op)
              curlExamples.push(curl)
            }
          }
        }
      }
    }

    const curlDocs = `
# cURL Examples

Here are cURL command examples for all API endpoints:

${curlExamples.join('\n\n')}
    `.trim()

    await this.writeFile('curl-examples.md', curlDocs)
  }

  private generateCurlCommand(path: string, method: string, operation: OpenAPIV3.OperationObject): string {
    const baseUrl = '${API_BASE_URL}' // Template variable
    const fullPath = path.replace(/{([^}]+)}/g, '${$1}') // Convert OpenAPI params to template vars
    
    let curl = `# ${operation.summary || `${method} ${path}`}\n`
    curl += `curl -X ${method} \\\n`
    curl += `  "${baseUrl}${fullPath}" \\\n`
    curl += `  -H "X-API-Key: \${API_KEY}" \\\n`
    curl += `  -H "Content-Type: application/json"`

    // Add request body example if applicable
    if (method !== 'GET' && method !== 'DELETE' && operation.requestBody) {
      curl += ` \\\n  -d '{\n    "example": "data"\n  }'`
    }

    return curl
  }

  private async generatePostmanCollection(spec: OpenAPIV3.Document): Promise<void> {
    const collection = {
      info: {
        name: spec.info.title,
        description: spec.info.description,
        version: spec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'apikey',
        apikey: [
          { key: 'key', value: 'X-API-Key', type: 'string' },
          { key: 'value', value: '{{API_KEY}}', type: 'string' },
          { key: 'in', value: 'header', type: 'string' }
        ]
      },
      variable: [
        { key: 'API_BASE_URL', value: 'https://api.appboardguru.com', type: 'string' },
        { key: 'API_KEY', value: 'your-api-key-here', type: 'string' }
      ],
      item: [] as any[]
    }

    // Convert OpenAPI paths to Postman requests
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (pathItem && typeof pathItem === 'object') {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (operation && typeof operation === 'object' && 'responses' in operation) {
              const op = operation as OpenAPIV3.OperationObject
              collection.item.push(this.createPostmanItem(path, method.toUpperCase(), op))
            }
          }
        }
      }
    }

    await this.writeFile('postman-collection.json', JSON.stringify(collection, null, 2))
  }

  private createPostmanItem(path: string, method: string, operation: OpenAPIV3.OperationObject): any {
    const item = {
      name: operation.summary || `${method} ${path}`,
      request: {
        method: method,
        header: [
          { key: 'X-API-Key', value: '{{API_KEY}}', type: 'text' }
        ],
        url: {
          raw: `{{API_BASE_URL}}${path}`,
          host: ['{{API_BASE_URL}}'],
          path: path.split('/').filter(p => p)
        }
      },
      response: [] as any[]
    }

    // Add request body if applicable
    if (method !== 'GET' && method !== 'DELETE' && operation.requestBody) {
      item.request.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' })
      ;(item.request as any).body = {
        mode: 'raw',
        raw: JSON.stringify({ example: 'data' }, null, 2)
      }
    }

    return item
  }

  private async generateSDKs(spec: OpenAPIV3.Document): Promise<void> {
    console.log('🔧 Generating SDKs...')
    
    for (const language of this.config.supportedLanguages) {
      try {
        await this.generateSDK(spec, language)
      } catch (error) {
        console.error(`Failed to generate ${language} SDK:`, error)
      }
    }
  }

  private async generateSDK(spec: OpenAPIV3.Document, language: string): Promise<void> {
    const sdkDir = join(this.config.outputDir, 'sdks', language)
    await this.ensureDirectory(sdkDir)

    switch (language) {
      case 'typescript':
        await this.generateTypeScriptSDK(spec, sdkDir)
        break
      case 'javascript':
        await this.generateJavaScriptSDK(spec, sdkDir)
        break
      case 'python':
        await this.generatePythonSDK(spec, sdkDir)
        break
      // Add other languages as needed
      default:
        console.log(`SDK generation for ${language} not implemented yet`)
    }
  }

  private async generateTypeScriptSDK(spec: OpenAPIV3.Document, outputDir: string): Promise<void> {
    // Generate TypeScript interfaces from OpenAPI schemas
    const interfaces = this.generateTypeScriptInterfaces(spec)
    
    const sdkContent = `
/**
 * AppBoardGuru API TypeScript SDK
 * Generated from OpenAPI specification
 */

${interfaces}

export interface APIClientConfig {
  baseURL?: string
  apiKey: string
  timeout?: number
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  requestId?: string
}

export class AppBoardGuruAPI {
  private baseURL: string
  private apiKey: string
  private timeout: number

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL || 'https://api.appboardguru.com'
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<APIResponse<T>> {
    const url = \`\${this.baseURL}\${endpoint}\`
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || \`HTTP \${response.status}\`)
    }

    return result
  }

  // Assets API
  async getAssets(params?: {
    page?: number
    limit?: number
    organizationId?: string
  }): Promise<APIResponse<Asset[]>> {
    const queryParams = new URLSearchParams(params as any).toString()
    const endpoint = queryParams ? \`/api/assets?\${queryParams}\` : '/api/assets'
    return this.request<Asset[]>('GET', endpoint)
  }

  async createAsset(data: CreateAssetRequest): Promise<APIResponse<Asset>> {
    return this.request<Asset>('POST', '/api/assets', data)
  }

  // Organizations API
  async getOrganizations(): Promise<APIResponse<Organization[]>> {
    return this.request<Organization[]>('GET', '/api/organizations')
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<APIResponse<Organization>> {
    return this.request<Organization>('POST', '/api/organizations', data)
  }

  // Add other endpoint methods...
}

export default AppBoardGuruAPI
    `.trim()

    await this.writeFile(join(outputDir, 'index.ts'), sdkContent)
    await this.writeFile(join(outputDir, 'package.json'), JSON.stringify({
      name: '@appboardguru/api-client',
      version: '1.0.0',
      description: 'TypeScript/JavaScript client for AppBoardGuru API',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        prepublish: 'npm run build'
      },
      dependencies: {},
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0'
      }
    }, null, 2))
  }

  private generateTypeScriptInterfaces(spec: OpenAPIV3.Document): string {
    let interfaces = ''

    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        if (schema && typeof schema === 'object' && 'type' in schema) {
          interfaces += this.generateTypeScriptInterface(name, schema as OpenAPIV3.SchemaObject)
          interfaces += '\n\n'
        }
      }
    }

    return interfaces
  }

  private generateTypeScriptInterface(name: string, schema: OpenAPIV3.SchemaObject): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `export type ${name} = any // Complex schema not supported`
    }

    let interfaceStr = `export interface ${name} {\n`
    
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === 'object') {
        const optional = !schema.required?.includes(propName) ? '?' : ''
        const type = this.getTypeScriptType(propSchema as OpenAPIV3.SchemaObject)
        interfaceStr += `  ${propName}${optional}: ${type}\n`
      }
    }
    
    interfaceStr += '}'
    return interfaceStr
  }

  private getTypeScriptType(schema: OpenAPIV3.SchemaObject): string {
    switch (schema.type) {
      case 'string':
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'array':
        return schema.items ? `${this.getTypeScriptType(schema.items as OpenAPIV3.SchemaObject)}[]` : 'any[]'
      case 'object':
        return 'Record<string, any>'
      default:
        return 'any'
    }
  }

  private async generateJavaScriptSDK(spec: OpenAPIV3.Document, outputDir: string): Promise<void> {
    // Similar to TypeScript but without types
    const sdkContent = `
/**
 * AppBoardGuru API JavaScript SDK
 */

class AppBoardGuruAPI {
  constructor(config) {
    this.baseURL = config.baseURL || 'https://api.appboardguru.com'
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  async request(method, endpoint, data) {
    const url = \`\${this.baseURL}\${endpoint}\`
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || \`HTTP \${response.status}\`)
    }

    return result
  }

  // Assets API
  async getAssets(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    const endpoint = queryParams ? \`/api/assets?\${queryParams}\` : '/api/assets'
    return this.request('GET', endpoint)
  }

  async createAsset(data) {
    return this.request('POST', '/api/assets', data)
  }

  // Organizations API
  async getOrganizations() {
    return this.request('GET', '/api/organizations')
  }

  async createOrganization(data) {
    return this.request('POST', '/api/organizations', data)
  }
}

module.exports = AppBoardGuruAPI
    `.trim()

    await this.writeFile(join(outputDir, 'index.js'), sdkContent)
  }

  private async generatePythonSDK(spec: OpenAPIV3.Document, outputDir: string): Promise<void> {
    const sdkContent = `
"""
AppBoardGuru API Python SDK
"""

import requests
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class APIResponse:
    success: bool
    data: Any = None
    error: Optional[str] = None
    request_id: Optional[str] = None


class AppBoardGuruAPI:
    def __init__(self, api_key: str, base_url: str = "https://api.appboardguru.com", timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> APIResponse:
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                timeout=self.timeout
            )
            
            result = response.json()
            
            if not response.ok:
                raise Exception(result.get('error', f'HTTP {response.status_code}'))
            
            return APIResponse(
                success=result.get('success', True),
                data=result.get('data'),
                error=result.get('error'),
                request_id=result.get('requestId')
            )
            
        except requests.exceptions.RequestException as e:
            return APIResponse(success=False, error=str(e))

    # Assets API
    def get_assets(self, **params) -> APIResponse:
        """Get list of assets"""
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        endpoint = f"/api/assets?{query_string}" if query_string else "/api/assets"
        return self._request('GET', endpoint)

    def create_asset(self, data: Dict[str, Any]) -> APIResponse:
        """Create a new asset"""
        return self._request('POST', '/api/assets', data)

    # Organizations API
    def get_organizations(self) -> APIResponse:
        """Get list of organizations"""
        return self._request('GET', '/api/organizations')

    def create_organization(self, data: Dict[str, Any]) -> APIResponse:
        """Create a new organization"""
        return self._request('POST', '/api/organizations', data)
    `.trim()

    await this.writeFile(join(outputDir, '__init__.py'), sdkContent)
    await this.writeFile(join(outputDir, 'setup.py'), `
from setuptools import setup, find_packages

setup(
    name='appboardguru-api',
    version='1.0.0',
    description='Python client for AppBoardGuru API',
    packages=find_packages(),
    install_requires=[
        'requests>=2.28.0',
    ],
    python_requires='>=3.7',
)
    `.trim())
  }

  private async generateChangelog(): Promise<void> {
    const changelog = `
# Changelog

All notable changes to the AppBoardGuru API will be documented in this file.

## [1.0.0] - 2024-03-15

### Added
- Initial release of AppBoardGuru API
- Asset management endpoints
- Organization management
- User authentication and authorization
- GraphQL support
- Real-time collaboration features
- Comprehensive rate limiting
- API key management

### Security
- API key authentication
- Rate limiting with adaptive algorithms  
- Request/response validation
- Audit logging

## [0.9.0] - 2024-02-15

### Added
- Beta release for testing
- Core asset and organization endpoints
- Basic authentication

### Changed
- Improved error response format
- Enhanced validation

## [0.8.0] - 2024-01-15

### Added
- Alpha release for internal testing
- Initial API design and implementation
    `.trim()

    await this.writeFile('CHANGELOG.md', changelog)
  }

  private async generateMigrationGuides(): Promise<void> {
    const migrationGuide = `
# API Migration Guides

This document provides guidance for migrating between different versions of the AppBoardGuru API.

## Version 2.0 Migration Guide (Coming Soon)

### Breaking Changes
- Authentication method changes
- New endpoint structure
- Updated response formats

### Migration Steps
1. Update authentication headers
2. Modify endpoint URLs
3. Update response handling
4. Test thoroughly

## Best Practices for Migrations

1. **Use API versioning** - Always specify the API version in your requests
2. **Test in staging** - Thoroughly test migrations in a staging environment
3. **Monitor error rates** - Watch for increased error rates after migration
4. **Have a rollback plan** - Be prepared to rollback if issues arise

## Support

For migration assistance, contact our API support team at api-support@appboardguru.com
    `.trim()

    await this.writeFile('MIGRATION.md', migrationGuide)
  }

  private async writeOpenAPISpec(spec: OpenAPIV3.Document): Promise<void> {
    await this.writeFile('openapi.json', JSON.stringify(spec, null, 2))
    
    // Also generate YAML version
    const yaml = this.jsonToYaml(spec)
    await this.writeFile('openapi.yaml', yaml)
  }

  private jsonToYaml(obj: any): string {
    // Simple JSON to YAML conversion - in production, use a proper YAML library
    return JSON.stringify(obj, null, 2)
      .replace(/"/g, '')
      .replace(/,/g, '')
      .replace(/\{/g, '')
      .replace(/\}/g, '')
  }

  private async ensureOutputDirectory(): Promise<void> {
    await this.ensureDirectory(this.config.outputDir)
    await this.ensureDirectory(join(this.config.outputDir, 'sdks'))
  }

  private async ensureDirectory(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private async writeFile(filename: string, content: string): Promise<void> {
    const filePath = join(this.config.outputDir, filename)
    writeFileSync(filePath, content, 'utf8')
    console.log(`📝 Generated: ${filename}`)
  }

  private isRateLimitedEndpoint(path: string, method: string): boolean {
    // Determine if endpoint has rate limiting
    return !path.includes('/health')
  }

  private requiresAuth(path: string, method: string): boolean {
    // Determine if endpoint requires authentication
    return !path.includes('/health') && !path.includes('/docs')
  }
}