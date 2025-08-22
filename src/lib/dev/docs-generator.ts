/**
 * Documentation Generator
 * Auto-generates API docs, component storybook, database schema docs, and architecture diagrams
 */

import fs from 'fs'
import path from 'path'
import { Logger } from '../logging/logger'
import { schemaValidator } from './schema-validator'
import { testDataGenerator } from './test-data-generator'

const logger = Logger.getLogger('DocsGenerator')

// Documentation interfaces
export interface DocumentationConfig {
  outputDir: string
  includePaths: string[]
  excludePaths: string[]
  generateAPI: boolean
  generateComponents: boolean
  generateDatabase: boolean
  generateArchitecture: boolean
  includeExamples: boolean
  includeTypeDefinitions: boolean
  theme: 'default' | 'modern' | 'minimal'
}

export interface APIDocumentation {
  title: string
  version: string
  baseUrl: string
  endpoints: APIEndpoint[]
  schemas: SchemaDefinition[]
  examples: APIExample[]
  authentication: AuthenticationMethod[]
}

export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  summary: string
  description: string
  tags: string[]
  parameters: APIParameter[]
  requestBody?: RequestBodyDefinition
  responses: APIResponse[]
  security?: SecurityRequirement[]
  examples: APIExample[]
  deprecated: boolean
}

export interface APIParameter {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  required: boolean
  description: string
  schema: TypeSchema
  example?: any
}

export interface RequestBodyDefinition {
  required: boolean
  content: ContentDefinition[]
}

export interface APIResponse {
  statusCode: number
  description: string
  content: ContentDefinition[]
  headers?: HeaderDefinition[]
}

export interface ContentDefinition {
  mediaType: string
  schema: TypeSchema
  examples?: Record<string, any>
}

export interface HeaderDefinition {
  name: string
  required: boolean
  description: string
  schema: TypeSchema
}

export interface SecurityRequirement {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  flows?: OAuthFlows
}

export interface TypeSchema {
  type: string
  format?: string
  properties?: Record<string, TypeSchema>
  items?: TypeSchema
  required?: string[]
  enum?: any[]
  example?: any
  description?: string
}

export interface SchemaDefinition {
  name: string
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties: Record<string, TypeSchema>
  required: string[]
  description: string
  examples: any[]
}

export interface APIExample {
  name: string
  summary: string
  description: string
  value: any
}

export interface AuthenticationMethod {
  type: string
  scheme: string
  description: string
  flows?: OAuthFlows
}

export interface OAuthFlows {
  authorizationCode?: OAuthFlow
  implicit?: OAuthFlow
  password?: OAuthFlow
  clientCredentials?: OAuthFlow
}

export interface OAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export interface ComponentDocumentation {
  name: string
  description: string
  props: ComponentProp[]
  examples: ComponentExample[]
  storybook: StorybookStory[]
  usage: UsageExample[]
  dependencies: string[]
  category: string
}

export interface ComponentProp {
  name: string
  type: string
  required: boolean
  defaultValue?: any
  description: string
  examples: any[]
}

export interface ComponentExample {
  name: string
  description: string
  code: string
  preview?: string
}

export interface StorybookStory {
  title: string
  component: string
  args: Record<string, any>
  argTypes: Record<string, any>
  parameters?: Record<string, any>
}

export interface UsageExample {
  scenario: string
  code: string
  description: string
}

export interface DatabaseDocumentation {
  version: string
  description: string
  tables: TableDocumentation[]
  relationships: RelationshipDocumentation[]
  indexes: IndexDocumentation[]
  views: ViewDocumentation[]
  functions: FunctionDocumentation[]
  migrations: MigrationDocumentation[]
  erd: ERDDefinition
}

export interface TableDocumentation {
  name: string
  schema: string
  description: string
  columns: ColumnDocumentation[]
  primaryKey: string[]
  foreignKeys: ForeignKeyDocumentation[]
  indexes: string[]
  triggers: string[]
  constraints: string[]
  rowCount: number
  size: string
  businessPurpose: string
  dataRetention?: string
}

export interface ColumnDocumentation {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  description: string
  businessMeaning: string
  constraints: string[]
  examples: any[]
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface RelationshipDocumentation {
  name: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  description: string
  cascadeOptions: string
}

export interface IndexDocumentation {
  name: string
  table: string
  columns: string[]
  type: string
  unique: boolean
  description: string
  usage: string
  performance: string
}

export interface ViewDocumentation {
  name: string
  description: string
  columns: ColumnDocumentation[]
  dependencies: string[]
  businessPurpose: string
  query: string
}

export interface FunctionDocumentation {
  name: string
  schema: string
  description: string
  parameters: ParameterDocumentation[]
  returnType: string
  language: string
  businessPurpose: string
  usage: string
  examples: string[]
}

export interface ParameterDocumentation {
  name: string
  type: string
  mode: 'in' | 'out' | 'inout'
  defaultValue?: string
  description: string
}

export interface MigrationDocumentation {
  version: string
  description: string
  upScript: string
  downScript: string
  dependencies: string[]
  impact: 'low' | 'medium' | 'high'
}

export interface ERDDefinition {
  tables: ERDTable[]
  relationships: ERDRelationship[]
  layout: ERDLayout
}

export interface ERDTable {
  name: string
  position: { x: number; y: number }
  columns: ERDColumn[]
}

export interface ERDColumn {
  name: string
  type: string
  primaryKey: boolean
  foreignKey: boolean
  nullable: boolean
}

export interface ERDRelationship {
  from: string
  to: string
  type: string
  label?: string
}

export interface ERDLayout {
  width: number
  height: number
  theme: string
}

export interface ArchitectureDocumentation {
  overview: string
  layers: ArchitectureLayer[]
  components: ArchitectureComponent[]
  dataFlow: DataFlowDiagram
  deploymentDiagram: DeploymentDiagram
  patterns: ArchitecturePattern[]
  principles: ArchitecturePrinciple[]
  decisions: ArchitectureDecision[]
}

export interface ArchitectureLayer {
  name: string
  description: string
  responsibilities: string[]
  technologies: string[]
  components: string[]
}

export interface ArchitectureComponent {
  name: string
  type: 'service' | 'library' | 'database' | 'external'
  description: string
  responsibilities: string[]
  dependencies: string[]
  apis: string[]
  technologies: string[]
}

export interface DataFlowDiagram {
  processes: DataFlowProcess[]
  dataStores: DataFlowStore[]
  externalEntities: DataFlowEntity[]
  flows: DataFlowConnection[]
}

export interface DataFlowProcess {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
}

export interface DataFlowStore {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
}

export interface DataFlowEntity {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
}

export interface DataFlowConnection {
  from: string
  to: string
  label: string
  data: string
}

export interface DeploymentDiagram {
  environments: DeploymentEnvironment[]
  services: DeploymentService[]
  connections: DeploymentConnection[]
}

export interface DeploymentEnvironment {
  name: string
  type: 'development' | 'staging' | 'production'
  infrastructure: InfrastructureComponent[]
}

export interface InfrastructureComponent {
  name: string
  type: 'server' | 'database' | 'load_balancer' | 'cache' | 'cdn'
  specifications: string[]
  services: string[]
}

export interface DeploymentService {
  name: string
  version: string
  environment: string
  replicas: number
  resources: ResourceRequirements
}

export interface ResourceRequirements {
  cpu: string
  memory: string
  storage: string
}

export interface DeploymentConnection {
  from: string
  to: string
  protocol: string
  port: number
  description: string
}

export interface ArchitecturePattern {
  name: string
  description: string
  context: string
  problem: string
  solution: string
  consequences: string[]
  examples: string[]
}

export interface ArchitecturePrinciple {
  name: string
  statement: string
  rationale: string
  implications: string[]
}

export interface ArchitectureDecision {
  id: string
  title: string
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  context: string
  decision: string
  consequences: string[]
  date: Date
  author: string
}

// Main Documentation Generator class
export class DocumentationGenerator {
  private config: DocumentationConfig

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      outputDir: './docs',
      includePaths: ['./src'],
      excludePaths: ['node_modules', '.next', 'dist'],
      generateAPI: true,
      generateComponents: true,
      generateDatabase: true,
      generateArchitecture: true,
      includeExamples: true,
      includeTypeDefinitions: true,
      theme: 'modern',
      ...config
    }
  }

  /**
   * Generate all documentation
   */
  async generateAll(): Promise<{
    apiDocs?: APIDocumentation
    componentDocs?: ComponentDocumentation[]
    databaseDocs?: DatabaseDocumentation
    architectureDocs?: ArchitectureDocumentation
    outputFiles: string[]
  }> {
    logger.info('Starting documentation generation', {
      config: this.config
    })

    const results: any = {}
    const outputFiles: string[] = []

    // Ensure output directory exists
    this.ensureOutputDirectory()

    if (this.config.generateAPI) {
      logger.info('Generating API documentation...')
      results.apiDocs = await this.generateAPIDocumentation()
      const apiFiles = await this.writeAPIDocumentation(results.apiDocs)
      outputFiles.push(...apiFiles)
    }

    if (this.config.generateComponents) {
      logger.info('Generating component documentation...')
      results.componentDocs = await this.generateComponentDocumentation()
      const componentFiles = await this.writeComponentDocumentation(results.componentDocs)
      outputFiles.push(...componentFiles)
    }

    if (this.config.generateDatabase) {
      logger.info('Generating database documentation...')
      results.databaseDocs = await this.generateDatabaseDocumentation()
      const dbFiles = await this.writeDatabaseDocumentation(results.databaseDocs)
      outputFiles.push(...dbFiles)
    }

    if (this.config.generateArchitecture) {
      logger.info('Generating architecture documentation...')
      results.architectureDocs = await this.generateArchitectureDocumentation()
      const archFiles = await this.writeArchitectureDocumentation(results.architectureDocs)
      outputFiles.push(...archFiles)
    }

    // Generate index page
    const indexFile = await this.generateIndexPage(results)
    outputFiles.push(indexFile)

    logger.info('Documentation generation completed', {
      totalFiles: outputFiles.length,
      outputDir: this.config.outputDir
    })

    return { ...results, outputFiles }
  }

  /**
   * Generate API documentation
   */
  async generateAPIDocumentation(): Promise<APIDocumentation> {
    const endpoints = await this.discoverAPIEndpoints()
    const schemas = await this.extractTypeSchemas()
    const examples = await this.generateAPIExamples()

    return {
      title: 'AppBoardGuru API',
      version: '1.0.0',
      baseUrl: process.env.API_BASE_URL || 'https://api.appboardguru.com',
      endpoints,
      schemas,
      examples,
      authentication: this.getAuthenticationMethods()
    }
  }

  /**
   * Generate component documentation
   */
  async generateComponentDocumentation(): Promise<ComponentDocumentation[]> {
    const componentFiles = await this.discoverComponents()
    const components: ComponentDocumentation[] = []

    for (const file of componentFiles) {
      try {
        const componentDoc = await this.analyzeComponent(file)
        if (componentDoc) {
          components.push(componentDoc)
        }
      } catch (error) {
        logger.warn(`Failed to analyze component ${file}`, error)
      }
    }

    return components.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Generate database documentation
   */
  async generateDatabaseDocumentation(): Promise<DatabaseDocumentation> {
    const schema = await schemaValidator['loadDatabaseSchema']()
    
    return {
      version: '1.0.0',
      description: 'AppBoardGuru Database Schema Documentation',
      tables: await this.documentTables(schema.tables),
      relationships: await this.documentRelationships(schema.relationships),
      indexes: await this.documentIndexes(schema.indexes),
      views: await this.documentViews(schema.views),
      functions: await this.documentFunctions(schema.functions),
      migrations: await this.documentMigrations(),
      erd: await this.generateERD(schema)
    }
  }

  /**
   * Generate architecture documentation
   */
  async generateArchitectureDocumentation(): Promise<ArchitectureDocumentation> {
    return {
      overview: this.generateArchitectureOverview(),
      layers: this.defineArchitectureLayers(),
      components: await this.analyzeArchitecturalComponents(),
      dataFlow: await this.generateDataFlowDiagram(),
      deploymentDiagram: await this.generateDeploymentDiagram(),
      patterns: this.documentArchitecturePatterns(),
      principles: this.defineArchitecturePrinciples(),
      decisions: await this.loadArchitectureDecisions()
    }
  }

  /**
   * Private helper methods
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }

    // Create subdirectories
    const subdirs = ['api', 'components', 'database', 'architecture', 'assets']
    subdirs.forEach(dir => {
      const fullPath = path.join(this.config.outputDir, dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
      }
    })
  }

  private async discoverAPIEndpoints(): Promise<APIEndpoint[]> {
    // This would scan the API route files and extract endpoint information
    const endpoints: APIEndpoint[] = []

    // Mock endpoints based on known API structure
    const mockEndpoints = [
      {
        path: '/api/organizations',
        method: 'GET' as const,
        summary: 'List organizations',
        description: 'Retrieve a list of organizations the user has access to',
        tags: ['Organizations'],
        parameters: [
          {
            name: 'limit',
            in: 'query' as const,
            required: false,
            description: 'Maximum number of organizations to return',
            schema: { type: 'integer', example: 10 }
          }
        ],
        responses: [
          {
            statusCode: 200,
            description: 'Successful response',
            content: [
              {
                mediaType: 'application/json',
                schema: {
                  type: 'array',
                  items: { type: 'object', properties: {} }
                }
              }
            ]
          }
        ],
        examples: [],
        deprecated: false
      }
    ]

    return mockEndpoints
  }

  private async extractTypeSchemas(): Promise<SchemaDefinition[]> {
    // This would extract TypeScript interfaces and convert them to schema definitions
    return [
      {
        name: 'Organization',
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          name: { type: 'string', description: 'Organization name' },
          slug: { type: 'string', description: 'URL-friendly identifier' }
        },
        required: ['id', 'name', 'slug'],
        description: 'Organization entity',
        examples: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Example Corp',
            slug: 'example-corp'
          }
        ]
      }
    ]
  }

  private async generateAPIExamples(): Promise<APIExample[]> {
    // Generate realistic examples using the test data generator
    const sampleData = testDataGenerator.generateCompleteDataset({
      organizations: 1,
      usersPerOrg: 1,
      vaultsPerOrg: 1,
      assetsPerVault: 1,
      meetingsPerOrg: 1,
      activitiesPerUser: 1
    })

    return [
      {
        name: 'Organization Example',
        summary: 'Sample organization data',
        description: 'A realistic example of organization data',
        value: sampleData.organizations[0]
      }
    ]
  }

  private getAuthenticationMethods(): AuthenticationMethod[] {
    return [
      {
        type: 'http',
        scheme: 'bearer',
        description: 'JWT Bearer token authentication',
        flows: {
          authorizationCode: {
            authorizationUrl: '/auth/authorize',
            tokenUrl: '/auth/token',
            scopes: {
              'read:organizations': 'Read organization data',
              'write:organizations': 'Modify organization data'
            }
          }
        }
      }
    ]
  }

  private async discoverComponents(): Promise<string[]> {
    const componentDirs = [
      'src/components',
      'src/features',
      'src/ui'
    ]

    const components: string[] = []

    for (const dir of componentDirs) {
      if (fs.existsSync(dir)) {
        const files = this.findComponentFiles(dir)
        components.push(...files)
      }
    }

    return components
  }

  private findComponentFiles(dir: string): string[] {
    const files: string[] = []
    const items = fs.readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      
      if (item.isDirectory()) {
        files.push(...this.findComponentFiles(fullPath))
      } else if (item.isFile() && /\.(tsx|jsx)$/.test(item.name)) {
        files.push(fullPath)
      }
    }

    return files
  }

  private async analyzeComponent(filePath: string): Promise<ComponentDocumentation | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const componentName = this.extractComponentName(content, filePath)
      
      if (!componentName) return null

      return {
        name: componentName,
        description: this.extractComponentDescription(content),
        props: this.extractComponentProps(content),
        examples: this.generateComponentExamples(componentName, content),
        storybook: this.generateStorybookStories(componentName),
        usage: this.generateUsageExamples(componentName),
        dependencies: this.extractDependencies(content),
        category: this.categorizeComponent(filePath)
      }
    } catch (error) {
      logger.error(`Error analyzing component ${filePath}`, error)
      return null
    }
  }

  private extractComponentName(content: string, filePath: string): string | null {
    // Try to extract component name from export or function declaration
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/)
    if (exportMatch) return exportMatch[1]

    // Fallback to filename
    const filename = path.basename(filePath, path.extname(filePath))
    return filename.charAt(0).toUpperCase() + filename.slice(1)
  }

  private extractComponentDescription(content: string): string {
    // Extract JSDoc comments or inline comments
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\s*\n/)
    if (jsdocMatch) return jsdocMatch[1]

    const commentMatch = content.match(/\/\/\s*(.+)/)
    if (commentMatch) return commentMatch[1]

    return 'Component description not available'
  }

  private extractComponentProps(content: string): ComponentProp[] {
    // This would analyze TypeScript interfaces for props
    const props: ComponentProp[] = []

    // Mock props extraction
    const interfaceMatch = content.match(/interface\s+\w*Props\s*{([^}]+)}/s)
    if (interfaceMatch) {
      const propsContent = interfaceMatch[1]
      const propMatches = propsContent.match(/(\w+)(\??):\s*([^;]+)/g) || []
      
      for (const match of propMatches) {
        const [, name, optional, type] = match.match(/(\w+)(\??):\s*([^;]+)/) || []
        if (name && type) {
          props.push({
            name,
            type: type.trim(),
            required: !optional,
            description: `${name} property`,
            examples: []
          })
        }
      }
    }

    return props
  }

  private generateComponentExamples(name: string, content: string): ComponentExample[] {
    return [
      {
        name: `Basic ${name}`,
        description: `Basic usage of ${name} component`,
        code: `<${name} />`,
        preview: `<!-- Preview would be generated here -->`
      }
    ]
  }

  private generateStorybookStories(componentName: string): StorybookStory[] {
    return [
      {
        title: `Components/${componentName}`,
        component: componentName,
        args: {},
        argTypes: {},
        parameters: {
          docs: {
            description: {
              component: `${componentName} component documentation`
            }
          }
        }
      }
    ]
  }

  private generateUsageExamples(componentName: string): UsageExample[] {
    return [
      {
        scenario: 'Basic Usage',
        code: `import { ${componentName} } from '@/components';\n\nfunction App() {\n  return <${componentName} />;\n}`,
        description: `How to use ${componentName} in your application`
      }
    ]
  }

  private extractDependencies(content: string): string[] {
    const importMatches = content.match(/import\s+.+\s+from\s+['"]([^'"]+)['"]/g) || []
    return importMatches
      .map(match => match.match(/from\s+['"]([^'"]+)['"]/)![1])
      .filter(dep => !dep.startsWith('.'))
  }

  private categorizeComponent(filePath: string): string {
    if (filePath.includes('/ui/')) return 'UI Components'
    if (filePath.includes('/forms/')) return 'Form Components'
    if (filePath.includes('/layout/')) return 'Layout Components'
    if (filePath.includes('/organisms/')) return 'Complex Components'
    if (filePath.includes('/molecules/')) return 'Composite Components'
    if (filePath.includes('/atoms/')) return 'Basic Components'
    return 'Other'
  }

  private async documentTables(tables: any[]): Promise<TableDocumentation[]> {
    return tables.map(table => ({
      name: table.name,
      schema: table.schema || 'public',
      description: `${table.name} table`,
      columns: table.columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        defaultValue: col.defaultValue,
        description: `${col.name} column`,
        businessMeaning: `Business meaning of ${col.name}`,
        constraints: [],
        examples: [],
        sensitivity: 'internal' as const
      })),
      primaryKey: table.primaryKey || [],
      foreignKeys: table.foreignKeys?.map((fk: any) => ({
        column: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn
      })) || [],
      indexes: table.indexes || [],
      triggers: [],
      constraints: table.constraints || [],
      rowCount: table.rowCount || 0,
      size: this.formatBytes(table.size || 0),
      businessPurpose: `Storage for ${table.name} data`,
      dataRetention: undefined
    }))
  }

  private async documentRelationships(relationships: any[]): Promise<RelationshipDocumentation[]> {
    return relationships.map(rel => ({
      name: `${rel.fromTable}_${rel.toTable}`,
      fromTable: rel.fromTable,
      fromColumn: rel.fromColumn,
      toTable: rel.toTable,
      toColumn: rel.toColumn,
      type: rel.type || 'one-to-many',
      description: `Relationship between ${rel.fromTable} and ${rel.toTable}`,
      cascadeOptions: 'CASCADE'
    }))
  }

  private async documentIndexes(indexes: any[]): Promise<IndexDocumentation[]> {
    return indexes.map(idx => ({
      name: idx.name,
      table: idx.table,
      columns: idx.columns,
      type: idx.type,
      unique: idx.unique,
      description: `Index on ${idx.columns.join(', ')}`,
      usage: 'Query optimization',
      performance: 'Improves query performance'
    }))
  }

  private async documentViews(views: any[]): Promise<ViewDocumentation[]> {
    return views.map(view => ({
      name: view.name,
      description: view.description || `${view.name} view`,
      columns: view.columns || [],
      dependencies: view.dependencies || [],
      businessPurpose: `View for ${view.name} data`,
      query: view.definition || 'SELECT * FROM table'
    }))
  }

  private async documentFunctions(functions: any[]): Promise<FunctionDocumentation[]> {
    return functions.map(func => ({
      name: func.name,
      schema: func.schema || 'public',
      description: func.description || `${func.name} function`,
      parameters: func.parameters || [],
      returnType: func.returnType || 'void',
      language: func.language || 'sql',
      businessPurpose: `Function for ${func.name} operations`,
      usage: 'Database operation',
      examples: []
    }))
  }

  private async documentMigrations(): Promise<MigrationDocumentation[]> {
    // This would scan migration files
    return []
  }

  private async generateERD(schema: any): Promise<ERDDefinition> {
    const tables: ERDTable[] = schema.tables.map((table: any, index: number) => ({
      name: table.name,
      position: {
        x: (index % 4) * 200,
        y: Math.floor(index / 4) * 150
      },
      columns: table.columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        primaryKey: table.primaryKey?.includes(col.name) || false,
        foreignKey: table.foreignKeys?.some((fk: any) => fk.column === col.name) || false,
        nullable: col.nullable
      }))
    }))

    const relationships: ERDRelationship[] = schema.relationships.map((rel: any) => ({
      from: rel.fromTable,
      to: rel.toTable,
      type: rel.type,
      label: `${rel.fromColumn} -> ${rel.toColumn}`
    }))

    return {
      tables,
      relationships,
      layout: {
        width: 1200,
        height: 800,
        theme: this.config.theme
      }
    }
  }

  private generateArchitectureOverview(): string {
    return `
# AppBoardGuru Architecture Overview

AppBoardGuru is a modern board governance platform built with Next.js, TypeScript, and Supabase.
The application follows Domain-Driven Design (DDD) principles with a layered architecture.

## Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Form Handling**: React Hook Form with Zod validation

## Architecture Principles
- Domain-Driven Design (DDD)
- Clean Architecture
- SOLID principles
- TypeScript-first development
- Performance optimization
- Security by design
    `
  }

  private defineArchitectureLayers(): ArchitectureLayer[] {
    return [
      {
        name: 'Presentation Layer',
        description: 'User interface and user experience components',
        responsibilities: [
          'User interface rendering',
          'User interaction handling',
          'State management',
          'Form validation'
        ],
        technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
        components: ['Pages', 'Components', 'Hooks', 'Stores']
      },
      {
        name: 'Application Layer',
        description: 'Business logic and application services',
        responsibilities: [
          'Business rule implementation',
          'Use case orchestration',
          'External service integration',
          'Data transformation'
        ],
        technologies: ['TypeScript', 'Next.js API Routes'],
        components: ['Services', 'Controllers', 'Middleware']
      },
      {
        name: 'Domain Layer',
        description: 'Core business entities and domain logic',
        responsibilities: [
          'Entity definitions',
          'Business rule validation',
          'Domain events',
          'Value objects'
        ],
        technologies: ['TypeScript'],
        components: ['Entities', 'Repositories', 'Domain Services']
      },
      {
        name: 'Infrastructure Layer',
        description: 'External integrations and technical implementations',
        responsibilities: [
          'Database access',
          'External API calls',
          'File storage',
          'Authentication'
        ],
        technologies: ['Supabase', 'PostgreSQL', 'Node.js'],
        components: ['Database', 'External APIs', 'File Storage']
      }
    ]
  }

  private async analyzeArchitecturalComponents(): Promise<ArchitectureComponent[]> {
    // This would analyze the codebase to identify architectural components
    return [
      {
        name: 'User Management Service',
        type: 'service',
        description: 'Handles user authentication and profile management',
        responsibilities: [
          'User registration and login',
          'Profile management',
          'Permission handling'
        ],
        dependencies: ['Supabase Auth', 'Database'],
        apis: ['/api/auth/*', '/api/user/*'],
        technologies: ['Next.js', 'Supabase']
      },
      {
        name: 'Organization Service',
        type: 'service',
        description: 'Manages organization data and operations',
        responsibilities: [
          'Organization CRUD operations',
          'Member management',
          'Settings management'
        ],
        dependencies: ['Database', 'User Service'],
        apis: ['/api/organizations/*'],
        technologies: ['Next.js', 'PostgreSQL']
      }
    ]
  }

  private async generateDataFlowDiagram(): Promise<DataFlowDiagram> {
    return {
      processes: [
        {
          id: 'P1',
          name: 'User Authentication',
          description: 'Handles user login and authentication',
          position: { x: 100, y: 100 }
        },
        {
          id: 'P2',
          name: 'Organization Management',
          description: 'Manages organization operations',
          position: { x: 300, y: 100 }
        }
      ],
      dataStores: [
        {
          id: 'D1',
          name: 'User Database',
          description: 'Stores user information',
          position: { x: 100, y: 250 }
        },
        {
          id: 'D2',
          name: 'Organization Database',
          description: 'Stores organization data',
          position: { x: 300, y: 250 }
        }
      ],
      externalEntities: [
        {
          id: 'E1',
          name: 'User',
          description: 'Application users',
          position: { x: 50, y: 50 }
        }
      ],
      flows: [
        {
          from: 'E1',
          to: 'P1',
          label: 'Login Request',
          data: 'User credentials'
        },
        {
          from: 'P1',
          to: 'D1',
          label: 'User Lookup',
          data: 'User data'
        }
      ]
    }
  }

  private async generateDeploymentDiagram(): Promise<DeploymentDiagram> {
    return {
      environments: [
        {
          name: 'Production',
          type: 'production',
          infrastructure: [
            {
              name: 'Vercel',
              type: 'server',
              specifications: ['Serverless Functions', 'Edge Network'],
              services: ['Web Application', 'API Routes']
            },
            {
              name: 'Supabase',
              type: 'database',
              specifications: ['PostgreSQL 14', 'Managed Service'],
              services: ['Database', 'Authentication', 'Storage']
            }
          ]
        }
      ],
      services: [
        {
          name: 'Web Application',
          version: '1.0.0',
          environment: 'Production',
          replicas: 1,
          resources: {
            cpu: '1 vCPU',
            memory: '1 GB',
            storage: '10 GB'
          }
        }
      ],
      connections: [
        {
          from: 'Web Application',
          to: 'Supabase',
          protocol: 'HTTPS',
          port: 443,
          description: 'Database and auth connection'
        }
      ]
    }
  }

  private documentArchitecturePatterns(): ArchitecturePattern[] {
    return [
      {
        name: 'Repository Pattern',
        description: 'Encapsulates data access logic',
        context: 'Data access layer implementation',
        problem: 'Need to abstract database operations and provide consistent interface',
        solution: 'Create repository classes that encapsulate database queries',
        consequences: [
          'Improved testability',
          'Better separation of concerns',
          'Easier to switch data sources'
        ],
        examples: ['UserRepository', 'OrganizationRepository']
      },
      {
        name: 'Service Layer',
        description: 'Encapsulates business logic',
        context: 'Business logic implementation',
        problem: 'Need to organize complex business operations',
        solution: 'Create service classes that coordinate domain operations',
        consequences: [
          'Better organization of business logic',
          'Improved reusability',
          'Cleaner controllers'
        ],
        examples: ['UserService', 'OrganizationService']
      }
    ]
  }

  private defineArchitecturePrinciples(): ArchitecturePrinciple[] {
    return [
      {
        name: 'Domain-Driven Design',
        statement: 'The architecture should reflect the business domain',
        rationale: 'Better alignment between code structure and business concepts',
        implications: [
          'Domain models drive the architecture',
          'Ubiquitous language used throughout',
          'Business logic encapsulated in domain layer'
        ]
      },
      {
        name: 'Type Safety First',
        statement: 'All code should be strongly typed with TypeScript',
        rationale: 'Catch errors at compile time and improve developer experience',
        implications: [
          'No any types allowed',
          'Strict TypeScript configuration',
          'Type-safe database queries'
        ]
      }
    ]
  }

  private async loadArchitectureDecisions(): Promise<ArchitectureDecision[]> {
    // This would load ADRs from files
    return [
      {
        id: 'ADR-001',
        title: 'Use Next.js for Full-Stack Development',
        status: 'accepted',
        context: 'Need to choose technology stack for web application',
        decision: 'Use Next.js for both frontend and backend development',
        consequences: [
          'Single framework for full-stack development',
          'Excellent TypeScript support',
          'Great performance with SSR/SSG',
          'Strong ecosystem and community'
        ],
        date: new Date('2024-01-01'),
        author: 'Architecture Team'
      }
    ]
  }

  private async writeAPIDocumentation(apiDocs: APIDocumentation): Promise<string[]> {
    const files: string[] = []

    // Generate OpenAPI spec
    const openApiSpec = this.generateOpenAPISpec(apiDocs)
    const openApiFile = path.join(this.config.outputDir, 'api', 'openapi.yaml')
    fs.writeFileSync(openApiFile, openApiSpec)
    files.push(openApiFile)

    // Generate HTML documentation
    const htmlDoc = this.generateAPIHTML(apiDocs)
    const htmlFile = path.join(this.config.outputDir, 'api', 'index.html')
    fs.writeFileSync(htmlFile, htmlDoc)
    files.push(htmlFile)

    // Generate markdown documentation
    const markdownDoc = this.generateAPIMarkdown(apiDocs)
    const markdownFile = path.join(this.config.outputDir, 'api', 'README.md')
    fs.writeFileSync(markdownFile, markdownDoc)
    files.push(markdownFile)

    return files
  }

  private async writeComponentDocumentation(componentDocs: ComponentDocumentation[]): Promise<string[]> {
    const files: string[] = []

    // Generate component index
    const indexContent = this.generateComponentIndex(componentDocs)
    const indexFile = path.join(this.config.outputDir, 'components', 'index.html')
    fs.writeFileSync(indexFile, indexContent)
    files.push(indexFile)

    // Generate individual component docs
    for (const component of componentDocs) {
      const componentDoc = this.generateComponentHTML(component)
      const componentFile = path.join(this.config.outputDir, 'components', `${component.name}.html`)
      fs.writeFileSync(componentFile, componentDoc)
      files.push(componentFile)
    }

    // Generate Storybook stories
    const storybookFile = this.generateStorybookIndex(componentDocs)
    const storybookPath = path.join(this.config.outputDir, 'components', 'storybook.js')
    fs.writeFileSync(storybookPath, storybookFile)
    files.push(storybookPath)

    return files
  }

  private async writeDatabaseDocumentation(dbDocs: DatabaseDocumentation): Promise<string[]> {
    const files: string[] = []

    // Generate database overview
    const overviewContent = this.generateDatabaseOverview(dbDocs)
    const overviewFile = path.join(this.config.outputDir, 'database', 'index.html')
    fs.writeFileSync(overviewFile, overviewContent)
    files.push(overviewFile)

    // Generate ERD
    const erdContent = this.generateERDHTML(dbDocs.erd)
    const erdFile = path.join(this.config.outputDir, 'database', 'erd.html')
    fs.writeFileSync(erdFile, erdContent)
    files.push(erdFile)

    // Generate table documentation
    for (const table of dbDocs.tables) {
      const tableDoc = this.generateTableHTML(table)
      const tableFile = path.join(this.config.outputDir, 'database', `${table.name}.html`)
      fs.writeFileSync(tableFile, tableDoc)
      files.push(tableFile)
    }

    return files
  }

  private async writeArchitectureDocumentation(archDocs: ArchitectureDocumentation): Promise<string[]> {
    const files: string[] = []

    // Generate architecture overview
    const overviewContent = this.generateArchitectureHTML(archDocs)
    const overviewFile = path.join(this.config.outputDir, 'architecture', 'index.html')
    fs.writeFileSync(overviewFile, overviewContent)
    files.push(overviewFile)

    // Generate component diagrams
    const componentDiagram = this.generateComponentDiagram(archDocs.components)
    const diagramFile = path.join(this.config.outputDir, 'architecture', 'components.html')
    fs.writeFileSync(diagramFile, componentDiagram)
    files.push(diagramFile)

    return files
  }

  private async generateIndexPage(results: any): Promise<string> {
    const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AppBoardGuru Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a1a1a; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
        .card { padding: 20px; border: 1px solid #e1e1e1; border-radius: 6px; background: #fafafa; }
        .card h3 { margin-top: 0; color: #333; }
        .card a { color: #0066cc; text-decoration: none; }
        .card a:hover { text-decoration: underline; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 10px; background: #f0f8ff; border-radius: 4px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #0066cc; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AppBoardGuru Documentation</h1>
        <p class="subtitle">Comprehensive documentation for the AppBoardGuru platform</p>
        
        <div class="stats">
            ${results.apiDocs ? `<div class="stat"><div class="stat-number">${results.apiDocs.endpoints.length}</div><div class="stat-label">API Endpoints</div></div>` : ''}
            ${results.componentDocs ? `<div class="stat"><div class="stat-number">${results.componentDocs.length}</div><div class="stat-label">Components</div></div>` : ''}
            ${results.databaseDocs ? `<div class="stat"><div class="stat-number">${results.databaseDocs.tables.length}</div><div class="stat-label">Database Tables</div></div>` : ''}
        </div>

        <div class="grid">
            ${results.apiDocs ? `
            <div class="card">
                <h3>API Documentation</h3>
                <p>Complete REST API reference with examples and schemas.</p>
                <p><a href="api/index.html">View API Docs</a> | <a href="api/openapi.yaml">OpenAPI Spec</a></p>
            </div>
            ` : ''}
            
            ${results.componentDocs ? `
            <div class="card">
                <h3>Component Library</h3>
                <p>React component documentation with props, examples, and usage guidelines.</p>
                <p><a href="components/index.html">View Components</a></p>
            </div>
            ` : ''}
            
            ${results.databaseDocs ? `
            <div class="card">
                <h3>Database Schema</h3>
                <p>Database tables, relationships, and entity documentation.</p>
                <p><a href="database/index.html">View Schema</a> | <a href="database/erd.html">ERD</a></p>
            </div>
            ` : ''}
            
            ${results.architectureDocs ? `
            <div class="card">
                <h3>Architecture</h3>
                <p>System architecture, patterns, and design decisions.</p>
                <p><a href="architecture/index.html">View Architecture</a></p>
            </div>
            ` : ''}
        </div>
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e1e1e1; color: #666; text-align: center;">
            <p>Generated on ${new Date().toLocaleDateString()} by AppBoardGuru Documentation Generator</p>
        </footer>
    </div>
</body>
</html>`

    const indexFile = path.join(this.config.outputDir, 'index.html')
    fs.writeFileSync(indexFile, indexContent)
    return indexFile
  }

  // Helper methods for content generation
  private generateOpenAPISpec(apiDocs: APIDocumentation): string {
    // Generate OpenAPI 3.0 YAML specification
    return `openapi: 3.0.0
info:
  title: ${apiDocs.title}
  version: ${apiDocs.version}
servers:
  - url: ${apiDocs.baseUrl}
paths:
${apiDocs.endpoints.map(endpoint => `  ${endpoint.path}:
    ${endpoint.method.toLowerCase()}:
      summary: ${endpoint.summary}
      description: ${endpoint.description}
      tags: [${endpoint.tags.join(', ')}]`).join('\n')}
components:
  schemas:
${apiDocs.schemas.map(schema => `    ${schema.name}:
      type: ${schema.type}
      description: ${schema.description}`).join('\n')}`
  }

  private generateAPIHTML(apiDocs: APIDocumentation): string {
    return `<!DOCTYPE html>
<html><head><title>${apiDocs.title}</title></head>
<body><h1>${apiDocs.title}</h1>
<p>Version: ${apiDocs.version}</p>
<p>Base URL: ${apiDocs.baseUrl}</p>
</body></html>`
  }

  private generateAPIMarkdown(apiDocs: APIDocumentation): string {
    return `# ${apiDocs.title}

Version: ${apiDocs.version}
Base URL: ${apiDocs.baseUrl}

## Endpoints

${apiDocs.endpoints.map(endpoint => `### ${endpoint.method} ${endpoint.path}

${endpoint.description}

**Tags:** ${endpoint.tags.join(', ')}
`).join('\n')}`
  }

  private generateComponentIndex(componentDocs: ComponentDocumentation[]): string {
    return `<!DOCTYPE html>
<html><head><title>Component Library</title></head>
<body><h1>Component Library</h1>
<ul>
${componentDocs.map(comp => `<li><a href="${comp.name}.html">${comp.name}</a> - ${comp.description}</li>`).join('\n')}
</ul>
</body></html>`
  }

  private generateComponentHTML(component: ComponentDocumentation): string {
    return `<!DOCTYPE html>
<html><head><title>${component.name}</title></head>
<body>
<h1>${component.name}</h1>
<p>${component.description}</p>
<h2>Props</h2>
<ul>
${component.props.map(prop => `<li><strong>${prop.name}</strong> (${prop.type})${prop.required ? ' *' : ''}: ${prop.description}</li>`).join('\n')}
</ul>
</body></html>`
  }

  private generateStorybookIndex(componentDocs: ComponentDocumentation[]): string {
    return `// Storybook stories generated from component documentation
${componentDocs.map(comp => comp.storybook.map(story => `
export default {
  title: '${story.title}',
  component: ${story.component},
  args: ${JSON.stringify(story.args)},
  argTypes: ${JSON.stringify(story.argTypes)}
};

export const Default = {};
`).join('\n')).join('\n')}`
  }

  private generateDatabaseOverview(dbDocs: DatabaseDocumentation): string {
    return `<!DOCTYPE html>
<html><head><title>Database Documentation</title></head>
<body>
<h1>Database Documentation</h1>
<p>${dbDocs.description}</p>
<h2>Tables</h2>
<ul>
${dbDocs.tables.map(table => `<li><a href="${table.name}.html">${table.name}</a> (${table.rowCount} rows, ${table.size})</li>`).join('\n')}
</ul>
</body></html>`
  }

  private generateERDHTML(erd: ERDDefinition): string {
    return `<!DOCTYPE html>
<html><head><title>Entity Relationship Diagram</title></head>
<body>
<h1>Entity Relationship Diagram</h1>
<div id="erd" style="width: ${erd.layout.width}px; height: ${erd.layout.height}px; border: 1px solid #ccc;">
  <!-- ERD would be rendered here with a library like D3.js or Mermaid -->
</div>
</body></html>`
  }

  private generateTableHTML(table: TableDocumentation): string {
    return `<!DOCTYPE html>
<html><head><title>${table.name} Table</title></head>
<body>
<h1>${table.name}</h1>
<p>${table.description}</p>
<h2>Columns</h2>
<table border="1">
<tr><th>Name</th><th>Type</th><th>Nullable</th><th>Description</th></tr>
${table.columns.map(col => `<tr><td>${col.name}</td><td>${col.type}</td><td>${col.nullable}</td><td>${col.description}</td></tr>`).join('\n')}
</table>
</body></html>`
  }

  private generateArchitectureHTML(archDocs: ArchitectureDocumentation): string {
    return `<!DOCTYPE html>
<html><head><title>Architecture Documentation</title></head>
<body>
<h1>Architecture Documentation</h1>
<div>${archDocs.overview}</div>
<h2>Layers</h2>
<ul>
${archDocs.layers.map(layer => `<li><strong>${layer.name}</strong>: ${layer.description}</li>`).join('\n')}
</ul>
</body></html>`
  }

  private generateComponentDiagram(components: ArchitectureComponent[]): string {
    return `<!DOCTYPE html>
<html><head><title>Component Diagram</title></head>
<body>
<h1>Component Diagram</h1>
<div>
${components.map(comp => `<div style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
  <h3>${comp.name}</h3>
  <p>${comp.description}</p>
  <p><strong>Type:</strong> ${comp.type}</p>
</div>`).join('\n')}
</div>
</body></html>`
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export singleton and factory
export const docsGenerator = new DocumentationGenerator()

export function createDocsGenerator(config?: Partial<DocumentationConfig>): DocumentationGenerator {
  return new DocumentationGenerator(config)
}

// CLI utility for documentation generation
export const DocsCLI = {
  /**
   * Generate all documentation
   */
  generateAll: async (config?: Partial<DocumentationConfig>) => {
    const generator = createDocsGenerator(config)
    return generator.generateAll()
  },

  /**
   * Generate specific documentation type
   */
  generateAPI: async (config?: Partial<DocumentationConfig>) => {
    const generator = createDocsGenerator(config)
    return generator.generateAPIDocumentation()
  },

  generateComponents: async (config?: Partial<DocumentationConfig>) => {
    const generator = createDocsGenerator(config)
    return generator.generateComponentDocumentation()
  },

  generateDatabase: async (config?: Partial<DocumentationConfig>) => {
    const generator = createDocsGenerator(config)
    return generator.generateDatabaseDocumentation()
  },

  generateArchitecture: async (config?: Partial<DocumentationConfig>) => {
    const generator = createDocsGenerator(config)
    return generator.generateArchitectureDocumentation()
  }
}