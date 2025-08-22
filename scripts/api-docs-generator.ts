#!/usr/bin/env ts-node

/**
 * API Documentation Generator
 * Generates comprehensive API documentation from OpenAPI specs
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { execSync } from 'child_process'

interface GeneratorConfig {
  inputDir: string
  outputDir: string
  generateSDK: boolean
  generateTests: boolean
  generateExamples: boolean
  languages: ('typescript' | 'javascript' | 'python' | 'go')[]
  versions: string[]
}

class APIDocumentationGenerator {
  private config: GeneratorConfig

  constructor(config: GeneratorConfig) {
    this.config = config
  }

  /**
   * Generate complete API documentation
   */
  async generate(): Promise<void> {
    console.log('📚 Generating API documentation...')

    // Create output directories
    await this.createDirectories()

    // Process each API version
    for (const version of this.config.versions) {
      console.log(`\n🔄 Processing API version ${version}...`)
      await this.processVersion(version)
    }

    // Generate interactive documentation
    await this.generateInteractiveDocumentation()

    // Generate postman collections
    await this.generatePostmanCollections()

    // Generate SDK if requested
    if (this.config.generateSDK) {
      await this.generateSDKs()
    }

    // Generate API tests if requested
    if (this.config.generateTests) {
      await this.generateAPITests()
    }

    // Generate examples if requested
    if (this.config.generateExamples) {
      await this.generateExamples()
    }

    console.log('\n✅ API documentation generation completed!')
  }

  /**
   * Create necessary directories
   */
  private async createDirectories(): Promise<void> {
    const directories = [
      this.config.outputDir,
      path.join(this.config.outputDir, 'specs'),
      path.join(this.config.outputDir, 'interactive'),
      path.join(this.config.outputDir, 'postman'),
      path.join(this.config.outputDir, 'sdk'),
      path.join(this.config.outputDir, 'tests'),
      path.join(this.config.outputDir, 'examples')
    ]

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  /**
   * Process a specific API version
   */
  private async processVersion(version: string): Promise<void> {
    const specFile = path.join(this.config.inputDir, `openapi-${version}.yaml`)
    
    try {
      // Check if spec file exists
      await fs.access(specFile)
    } catch {
      console.log(`⚠️  Spec file not found: ${specFile}, skipping...`)
      return
    }

    // Load and validate spec
    const spec = await this.loadAndValidateSpec(specFile)
    if (!spec) return

    // Copy spec to output
    await fs.copyFile(specFile, path.join(this.config.outputDir, 'specs', `openapi-${version}.yaml`))

    // Generate version-specific documentation
    await this.generateVersionDocumentation(version, spec)
  }

  /**
   * Load and validate OpenAPI specification
   */
  private async loadAndValidateSpec(specFile: string): Promise<any> {
    try {
      const content = await fs.readFile(specFile, 'utf8')
      const spec = yaml.load(content)

      // Basic validation
      if (!spec || typeof spec !== 'object') {
        throw new Error('Invalid YAML structure')
      }

      if (!spec.openapi || !spec.info || !spec.paths) {
        throw new Error('Missing required OpenAPI fields')
      }

      console.log(`✅ Loaded spec: ${spec.info.title} v${spec.info.version}`)
      return spec

    } catch (error) {
      console.error(`❌ Failed to load spec ${specFile}:`, error)
      return null
    }
  }

  /**
   * Generate documentation for a specific version
   */
  private async generateVersionDocumentation(version: string, spec: any): Promise<void> {
    // Generate HTML documentation
    await this.generateHTMLDocs(version, spec)

    // Generate Markdown documentation
    await this.generateMarkdownDocs(version, spec)

    // Generate API reference
    await this.generateAPIReference(version, spec)
  }

  /**
   * Generate HTML documentation
   */
  private async generateHTMLDocs(version: string, spec: any): Promise<void> {
    const template = `
<!DOCTYPE html>
<html>
<head>
    <title>${spec.info.title} - API Documentation ${version}</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
        .swagger-ui .topbar { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '../specs/openapi-${version}.yaml',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ]
        });
    </script>
</body>
</html>
    `

    await fs.writeFile(
      path.join(this.config.outputDir, 'interactive', `${version}.html`),
      template.trim(),
      'utf8'
    )
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdownDocs(version: string, spec: any): Promise<void> {
    let markdown = `# ${spec.info.title} - API Documentation (${version})\n\n`
    
    if (spec.info.description) {
      markdown += `${spec.info.description}\n\n`
    }

    markdown += `**Version:** ${spec.info.version}\n\n`

    if (spec.servers) {
      markdown += `## Servers\n\n`
      for (const server of spec.servers) {
        markdown += `- **${server.url}**`
        if (server.description) {
          markdown += ` - ${server.description}`
        }
        markdown += `\n`
      }
      markdown += `\n`
    }

    // Generate paths documentation
    if (spec.paths) {
      markdown += `## API Endpoints\n\n`
      
      for (const [path, methods] of Object.entries(spec.paths)) {
        markdown += `### ${path}\n\n`
        
        for (const [method, operation] of Object.entries(methods as any)) {
          if (typeof operation !== 'object') continue
          
          markdown += `#### ${method.toUpperCase()}\n\n`
          
          if (operation.summary) {
            markdown += `**Summary:** ${operation.summary}\n\n`
          }
          
          if (operation.description) {
            markdown += `**Description:** ${operation.description}\n\n`
          }
          
          if (operation.parameters) {
            markdown += `**Parameters:**\n\n`
            for (const param of operation.parameters) {
              markdown += `- **${param.name}** (${param.in})`
              if (param.required) markdown += ` *required*`
              if (param.description) markdown += ` - ${param.description}`
              markdown += `\n`
            }
            markdown += `\n`
          }
          
          if (operation.responses) {
            markdown += `**Responses:**\n\n`
            for (const [status, response] of Object.entries(operation.responses)) {
              markdown += `- **${status}**: ${response.description || 'No description'}\n`
            }
            markdown += `\n`
          }
        }
      }
    }

    await fs.writeFile(
      path.join(this.config.outputDir, `api-${version}.md`),
      markdown,
      'utf8'
    )
  }

  /**
   * Generate API reference
   */
  private async generateAPIReference(version: string, spec: any): Promise<void> {
    const reference = {
      version,
      title: spec.info.title,
      description: spec.info.description,
      baseUrl: spec.servers?.[0]?.url || '',
      endpoints: [],
      schemas: spec.components?.schemas || {}
    }

    // Extract endpoints
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (typeof operation !== 'object') continue
          
          reference.endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags || [],
            parameters: operation.parameters || [],
            responses: operation.responses || {},
            security: operation.security
          })
        }
      }
    }

    await fs.writeFile(
      path.join(this.config.outputDir, `reference-${version}.json`),
      JSON.stringify(reference, null, 2),
      'utf8'
    )
  }

  /**
   * Generate interactive documentation
   */
  private async generateInteractiveDocumentation(): Promise<void> {
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AppBoardGuru API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f8fafc;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #1e40af;
            margin-bottom: 2rem;
        }
        .version-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        .version-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        .version-card h3 {
            margin: 0 0 1rem 0;
            color: #374151;
        }
        .btn {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .btn:hover {
            background: #2563eb;
        }
        .resources {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }
        .resource-card {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AppBoardGuru API Documentation</h1>
        
        <div class="version-grid">
            ${this.config.versions.map(version => `
                <div class="version-card">
                    <h3>API ${version}</h3>
                    <p>Interactive documentation and examples for API version ${version}.</p>
                    <a href="interactive/${version}.html" class="btn">View Docs</a>
                    <a href="api-${version}.md" class="btn">Markdown</a>
                    <a href="specs/openapi-${version}.yaml" class="btn">OpenAPI Spec</a>
                </div>
            `).join('')}
        </div>
        
        <h2>Additional Resources</h2>
        <div class="resources">
            <div class="resource-card">
                <h4>Postman Collections</h4>
                <p>Import ready-to-use Postman collections for API testing.</p>
                <a href="postman/" class="btn">Download</a>
            </div>
            <div class="resource-card">
                <h4>SDKs</h4>
                <p>Client libraries for popular programming languages.</p>
                <a href="sdk/" class="btn">Browse SDKs</a>
            </div>
            <div class="resource-card">
                <h4>Examples</h4>
                <p>Code examples and integration guides.</p>
                <a href="examples/" class="btn">View Examples</a>
            </div>
        </div>
    </div>
</body>
</html>
    `

    await fs.writeFile(
      path.join(this.config.outputDir, 'index.html'),
      indexHtml.trim(),
      'utf8'
    )
  }

  /**
   * Generate Postman collections
   */
  private async generatePostmanCollections(): Promise<void> {
    for (const version of this.config.versions) {
      try {
        const specFile = path.join(this.config.outputDir, 'specs', `openapi-${version}.yaml`)
        const outputFile = path.join(this.config.outputDir, 'postman', `appboardguru-${version}.json`)

        // Use openapi-to-postman converter
        const cmd = `npx openapi-to-postmanv2 -s ${specFile} -o ${outputFile} -p -O folderStrategy=Tags,includeAuthInfoInExample=false`
        
        execSync(cmd, { stdio: 'inherit' })
        console.log(`✅ Generated Postman collection for ${version}`)

      } catch (error) {
        console.error(`❌ Failed to generate Postman collection for ${version}:`, error)
      }
    }
  }

  /**
   * Generate SDKs for different languages
   */
  private async generateSDKs(): Promise<void> {
    const { SDKGenerator } = await import('./generate-sdk')

    for (const version of this.config.versions) {
      const specFile = path.join(this.config.outputDir, 'specs', `openapi-${version}.yaml`)
      
      try {
        const specContent = await fs.readFile(specFile, 'utf8')
        const spec = yaml.load(specContent) as any

        for (const language of this.config.languages) {
          const outputDir = path.join(this.config.outputDir, 'sdk', `${language}-${version}`)
          
          const config = {
            packageName: `@appboardguru/sdk-${language}`,
            version: '1.0.0',
            description: `AppBoardGuru API SDK for ${language} (${version})`,
            language,
            outputDir,
            includeTests: true,
            includeExamples: true
          }

          const generator = new SDKGenerator(spec, config)
          await generator.generate()
        }

      } catch (error) {
        console.error(`❌ Failed to generate SDKs for ${version}:`, error)
      }
    }
  }

  /**
   * Generate API tests
   */
  private async generateAPITests(): Promise<void> {
    const testTemplate = `
/**
 * Generated API Tests
 */

import { APITestSuite } from './api-test-suite'

describe('AppBoardGuru API Tests', () => {
  const testSuite = new APITestSuite('http://localhost:3000/api')

  beforeAll(async () => {
    await testSuite.authenticate()
  })

  describe('Health Endpoints', () => {
    test('should return system health', async () => {
      await testSuite.testHealthEndpoints()
    })
  })

  describe('Authentication', () => {
    test('should handle authentication flows', async () => {
      await testSuite.testAuthenticationEndpoints()
    })
  })

  describe('Asset Management', () => {
    test('should handle asset operations', async () => {
      await testSuite.testAssetEndpoints()
    })
  })

  describe('Notifications', () => {
    test('should handle notification operations', async () => {
      await testSuite.testNotificationEndpoints()
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      await testSuite.testRateLimiting()
    })
  })

  describe('Versioning', () => {
    test('should handle API versioning', async () => {
      await testSuite.testVersioning()
    })
  })

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      await testSuite.testErrorHandling()
    })
  })

  describe('Performance', () => {
    test('should meet performance requirements', async () => {
      await testSuite.testPerformance()
    })
  })
})
    `

    await fs.writeFile(
      path.join(this.config.outputDir, 'tests', 'api.test.ts'),
      testTemplate.trim(),
      'utf8'
    )
  }

  /**
   * Generate code examples
   */
  private async generateExamples(): Promise<void> {
    const examples = {
      'basic-authentication.md': `
# Basic Authentication

## Magic Link Authentication

\`\`\`javascript
const response = await fetch('/api/auth/magic-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

const result = await response.json();
console.log(result.message); // "Magic link has been sent to your email"
\`\`\`

## OTP Verification

\`\`\`javascript
const response = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    otpCode: '123456',
    purpose: 'first_login'
  })
});

const result = await response.json();
if (result.verified) {
  console.log('OTP verified successfully');
  if (result.setupLink) {
    window.location.href = result.setupLink;
  }
}
\`\`\`
      `,

      'asset-management.md': `
# Asset Management Examples

## Upload an Asset

\`\`\`javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('title', 'My Document');
formData.append('description', 'Important document');
formData.append('category', 'reports');

const response = await fetch('/api/assets/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken,
  },
  body: formData
});

const result = await response.json();
console.log('Asset uploaded:', result.asset);
\`\`\`

## List Assets with Filtering

\`\`\`javascript
const params = new URLSearchParams({
  page: '1',
  limit: '10',
  category: 'reports',
  search: 'financial',
  sortBy: 'updated_at',
  sortOrder: 'desc'
});

const response = await fetch(\`/api/assets?\${params}\`, {
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'API-Version': 'v2'
  }
});

const result = await response.json();
console.log('Assets:', result.assets);
console.log('Pagination:', result.pagination);
\`\`\`
      `,

      'notifications.md': `
# Notification Management

## Get Notification Counts

\`\`\`javascript
const response = await fetch('/api/notifications/count', {
  headers: {
    'Authorization': 'Bearer ' + authToken,
  }
});

const counts = await response.json();
console.log(\`You have \${counts.unread} unread notifications\`);
\`\`\`

## Mark Notifications as Read

\`\`\`javascript
const notificationIds = ['uuid1', 'uuid2', 'uuid3'];

const response = await fetch('/api/notifications/bulk', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'mark_read',
    notification_ids: notificationIds
  })
});

const result = await response.json();
console.log(\`Marked \${result.affected_count} notifications as read\`);
\`\`\`
      `
    }

    for (const [filename, content] of Object.entries(examples)) {
      await fs.writeFile(
        path.join(this.config.outputDir, 'examples', filename),
        content.trim(),
        'utf8'
      )
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const inputDir = args[0] || 'docs/api'
  const outputDir = args[1] || 'docs/generated'

  const config: GeneratorConfig = {
    inputDir,
    outputDir,
    generateSDK: process.argv.includes('--sdk'),
    generateTests: process.argv.includes('--tests'),
    generateExamples: process.argv.includes('--examples'),
    languages: ['typescript', 'javascript', 'python'],
    versions: ['v1', 'v2']
  }

  try {
    const generator = new APIDocumentationGenerator(config)
    await generator.generate()

    console.log('\n🎉 API documentation generation completed successfully!')
    console.log(`📁 Output directory: ${outputDir}`)
    console.log(`🌐 Open ${path.join(outputDir, 'index.html')} to view the documentation`)

  } catch (error) {
    console.error('❌ Documentation generation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { APIDocumentationGenerator }