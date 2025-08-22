/**
 * Database Schema Validator
 * Validates database schema against TypeScript types and suggests improvements
 */

import { Logger } from '../logging/logger'
import { businessMetrics } from '../telemetry/business-metrics'

const logger = Logger.getLogger('SchemaValidator')

// Schema validation interfaces
export interface SchemaValidationResult {
  isValid: boolean
  errors: SchemaValidationError[]
  warnings: SchemaValidationWarning[]
  suggestions: SchemaSuggestion[]
  compliance: ComplianceCheck[]
  performance: PerformanceAnalysis
  coverage: TypeCoverage
}

export interface SchemaValidationError {
  type: 'missing_table' | 'missing_column' | 'type_mismatch' | 'constraint_violation' | 'foreign_key_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  table: string
  column?: string
  message: string
  expectedType?: string
  actualType?: string
  suggestion: string
}

export interface SchemaValidationWarning {
  type: 'deprecated_type' | 'performance_impact' | 'naming_convention' | 'best_practice'
  table: string
  column?: string
  message: string
  recommendation: string
  impact: 'low' | 'medium' | 'high'
}

export interface SchemaSuggestion {
  type: 'index' | 'constraint' | 'normalization' | 'optimization' | 'migration'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  implementation: string
  expectedBenefit: string
  migrationComplexity: 'easy' | 'medium' | 'hard'
}

export interface ComplianceCheck {
  framework: 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'SOX' | 'ISO27001'
  requirement: string
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown'
  details: string
  remediationSteps?: string[]
}

export interface PerformanceAnalysis {
  indexCoverage: number
  queryPerformanceScore: number
  normalizedScore: number
  potentialBottlenecks: BottleneckAnalysis[]
  recommendations: PerformanceRecommendation[]
}

export interface TypeCoverage {
  totalTables: number
  coveredTables: number
  coveragePercentage: number
  uncoveredTables: string[]
  typeMatches: TypeMatchResult[]
}

export interface BottleneckAnalysis {
  table: string
  issue: 'missing_index' | 'poor_normalization' | 'large_table' | 'complex_joins'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimatedImpact: string
}

export interface PerformanceRecommendation {
  type: 'index' | 'partition' | 'denormalization' | 'archival' | 'caching'
  table: string
  description: string
  estimatedImprovement: string
  implementationEffort: 'low' | 'medium' | 'high'
}

export interface TypeMatchResult {
  table: string
  column: string
  dbType: string
  tsType: string
  isMatch: boolean
  conversionNeeded: boolean
}

export interface DatabaseSchema {
  tables: TableDefinition[]
  indexes: IndexDefinition[]
  constraints: ConstraintDefinition[]
  relationships: RelationshipDefinition[]
  views: ViewDefinition[]
  functions: FunctionDefinition[]
}

export interface TableDefinition {
  name: string
  schema: string
  columns: ColumnDefinition[]
  primaryKey: string[]
  foreignKeys: ForeignKeyDefinition[]
  indexes: string[]
  constraints: string[]
  rowCount: number
  size: number
  lastAnalyzed?: Date
}

export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  autoIncrement: boolean
  unique: boolean
  precision?: number
  scale?: number
  maxLength?: number
}

export interface IndexDefinition {
  name: string
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'partial'
  unique: boolean
  partial: boolean
  condition?: string
  size: number
  usage: {
    scans: number
    tuplesReturned: number
    efficiency: number
  }
}

export interface ConstraintDefinition {
  name: string
  table: string
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null'
  columns: string[]
  referencedTable?: string
  referencedColumns?: string[]
  checkCondition?: string
}

export interface RelationshipDefinition {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  type: 'one_to_one' | 'one_to_many' | 'many_to_many'
  cascadeOptions: {
    onDelete: 'cascade' | 'restrict' | 'set_null' | 'no_action'
    onUpdate: 'cascade' | 'restrict' | 'set_null' | 'no_action'
  }
}

export interface ViewDefinition {
  name: string
  schema: string
  definition: string
  dependencies: string[]
  columns: ColumnDefinition[]
}

export interface FunctionDefinition {
  name: string
  schema: string
  returnType: string
  parameters: ParameterDefinition[]
  language: string
  definition: string
}

export interface ParameterDefinition {
  name: string
  type: string
  mode: 'in' | 'out' | 'inout'
  defaultValue?: string
}

export interface TypeScriptTypeDefinition {
  name: string
  properties: PropertyDefinition[]
  extends?: string[]
  exported: boolean
  filePath: string
}

export interface PropertyDefinition {
  name: string
  type: string
  optional: boolean
  readonly: boolean
  description?: string
}

// Main Schema Validator class
export class DatabaseSchemaValidator {
  private databaseSchema?: DatabaseSchema
  private typeDefinitions = new Map<string, TypeScriptTypeDefinition>()
  private validationHistory: SchemaValidationResult[] = []

  constructor() {
    this.loadTypeDefinitions()
  }

  /**
   * Validate database schema against TypeScript types
   */
  async validateSchema(
    schema?: DatabaseSchema,
    options: {
      includePerformanceAnalysis?: boolean
      includeComplianceCheck?: boolean
      strictTypeChecking?: boolean
      suggestOptimizations?: boolean
    } = {}
  ): Promise<SchemaValidationResult> {
    const startTime = performance.now()
    
    // Load schema if not provided
    const dbSchema = schema || await this.loadDatabaseSchema()
    this.databaseSchema = dbSchema

    const errors: SchemaValidationError[] = []
    const warnings: SchemaValidationWarning[] = []
    const suggestions: SchemaSuggestion[] = []
    
    // Validate table existence and structure
    const tableValidation = await this.validateTables(dbSchema)
    errors.push(...tableValidation.errors)
    warnings.push(...tableValidation.warnings)

    // Validate column types
    const typeValidation = await this.validateTypes(dbSchema, options.strictTypeChecking)
    errors.push(...typeValidation.errors)
    warnings.push(...typeValidation.warnings)

    // Validate constraints and relationships
    const constraintValidation = await this.validateConstraints(dbSchema)
    errors.push(...constraintValidation.errors)
    warnings.push(...constraintValidation.warnings)

    // Generate suggestions
    if (options.suggestOptimizations) {
      const optimizationSuggestions = await this.generateOptimizationSuggestions(dbSchema)
      suggestions.push(...optimizationSuggestions)
    }

    // Performance analysis
    let performance: PerformanceAnalysis = {
      indexCoverage: 0,
      queryPerformanceScore: 0,
      normalizedScore: 0,
      potentialBottlenecks: [],
      recommendations: []
    }

    if (options.includePerformanceAnalysis) {
      performance = await this.analyzePerformance(dbSchema)
    }

    // Compliance check
    let compliance: ComplianceCheck[] = []
    if (options.includeComplianceCheck) {
      compliance = await this.checkCompliance(dbSchema)
    }

    // Type coverage analysis
    const coverage = await this.analyzeTypeCoverage(dbSchema)

    const result: SchemaValidationResult = {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      suggestions,
      compliance,
      performance,
      coverage
    }

    // Store validation history
    this.validationHistory.push(result)
    if (this.validationHistory.length > 50) {
      this.validationHistory.splice(0, this.validationHistory.length - 50)
    }

    // Record metrics
    const validationTime = performance.now() - startTime
    businessMetrics.record('schema_validation_duration', validationTime, {
      tables_validated: dbSchema.tables.length.toString(),
      errors_found: errors.length.toString(),
      warnings_found: warnings.length.toString(),
      is_valid: result.isValid.toString()
    })

    logger.info('Schema validation completed', {
      tablesValidated: dbSchema.tables.length,
      errorsFound: errors.length,
      warningsFound: warnings.length,
      validationTimeMs: Math.round(validationTime),
      isValid: result.isValid
    })

    return result
  }

  /**
   * Compare schemas between different versions
   */
  async compareSchemas(
    currentSchema: DatabaseSchema,
    previousSchema: DatabaseSchema
  ): Promise<{
    added: { tables: string[]; columns: string[]; indexes: string[] }
    removed: { tables: string[]; columns: string[]; indexes: string[] }
    modified: { tables: string[]; columns: string[]; indexes: string[] }
    migrations: MigrationSuggestion[]
  }> {
    const added = { tables: [], columns: [], indexes: [] }
    const removed = { tables: [], columns: [], indexes: [] }
    const modified = { tables: [], columns: [], indexes: [] }
    const migrations: MigrationSuggestion[] = []

    // Compare tables
    const currentTableNames = new Set(currentSchema.tables.map(t => t.name))
    const previousTableNames = new Set(previousSchema.tables.map(t => t.name))

    // Find added tables
    for (const tableName of currentTableNames) {
      if (!previousTableNames.has(tableName)) {
        added.tables.push(tableName)
        migrations.push({
          type: 'create_table',
          description: `Create table ${tableName}`,
          sql: this.generateCreateTableSQL(currentSchema.tables.find(t => t.name === tableName)!),
          impact: 'low'
        })
      }
    }

    // Find removed tables
    for (const tableName of previousTableNames) {
      if (!currentTableNames.has(tableName)) {
        removed.tables.push(tableName)
        migrations.push({
          type: 'drop_table',
          description: `Drop table ${tableName}`,
          sql: `DROP TABLE IF EXISTS ${tableName};`,
          impact: 'high'
        })
      }
    }

    // Compare columns for existing tables
    for (const currentTable of currentSchema.tables) {
      const previousTable = previousSchema.tables.find(t => t.name === currentTable.name)
      if (!previousTable) continue

      const currentColumns = new Set(currentTable.columns.map(c => c.name))
      const previousColumns = new Set(previousTable.columns.map(c => c.name))

      // Find added columns
      for (const columnName of currentColumns) {
        if (!previousColumns.has(columnName)) {
          added.columns.push(`${currentTable.name}.${columnName}`)
          const column = currentTable.columns.find(c => c.name === columnName)!
          migrations.push({
            type: 'add_column',
            description: `Add column ${columnName} to ${currentTable.name}`,
            sql: `ALTER TABLE ${currentTable.name} ADD COLUMN ${this.generateColumnSQL(column)};`,
            impact: 'medium'
          })
        }
      }

      // Find removed columns
      for (const columnName of previousColumns) {
        if (!currentColumns.has(columnName)) {
          removed.columns.push(`${currentTable.name}.${columnName}`)
          migrations.push({
            type: 'drop_column',
            description: `Drop column ${columnName} from ${currentTable.name}`,
            sql: `ALTER TABLE ${currentTable.name} DROP COLUMN IF EXISTS ${columnName};`,
            impact: 'high'
          })
        }
      }

      // Find modified columns
      for (const currentColumn of currentTable.columns) {
        const previousColumn = previousTable.columns.find(c => c.name === currentColumn.name)
        if (previousColumn && this.isColumnModified(currentColumn, previousColumn)) {
          modified.columns.push(`${currentTable.name}.${currentColumn.name}`)
          migrations.push({
            type: 'alter_column',
            description: `Modify column ${currentColumn.name} in ${currentTable.name}`,
            sql: `ALTER TABLE ${currentTable.name} ALTER COLUMN ${this.generateColumnSQL(currentColumn)};`,
            impact: 'medium'
          })
        }
      }
    }

    return { added, removed, modified, migrations }
  }

  /**
   * Generate migration scripts
   */
  async generateMigrationScript(
    fromSchema: DatabaseSchema,
    toSchema: DatabaseSchema,
    options: {
      includeData?: boolean
      safeMode?: boolean
      batchSize?: number
    } = {}
  ): Promise<string> {
    const comparison = await this.compareSchemas(toSchema, fromSchema)
    const migrations = comparison.migrations

    let script = `-- Migration Script Generated on ${new Date().toISOString()}\n`
    script += `-- Safe Mode: ${options.safeMode}\n\n`

    if (options.safeMode) {
      script += `BEGIN;\n\n`
    }

    // Order migrations by dependency and impact
    const orderedMigrations = this.orderMigrations(migrations)

    for (const migration of orderedMigrations) {
      script += `-- ${migration.description}\n`
      script += `${migration.sql}\n\n`

      if (options.includeData && migration.type === 'create_table') {
        script += `-- TODO: Add data migration for ${migration.description}\n\n`
      }
    }

    if (options.safeMode) {
      script += `COMMIT;\n`
    }

    return script
  }

  /**
   * Validate specific entity types
   */
  async validateEntityType<T>(
    entityName: string,
    sampleData: T[],
    options: {
      checkDataIntegrity?: boolean
      validateConstraints?: boolean
      suggestIndexes?: boolean
    } = {}
  ): Promise<{
    isValid: boolean
    dataIssues: DataIntegrityIssue[]
    constraintViolations: ConstraintViolation[]
    indexSuggestions: IndexSuggestion[]
  }> {
    const dataIssues: DataIntegrityIssue[] = []
    const constraintViolations: ConstraintViolation[] = []
    const indexSuggestions: IndexSuggestion[] = []

    const table = this.databaseSchema?.tables.find(t => 
      t.name.toLowerCase() === entityName.toLowerCase()
    )

    if (!table) {
      return {
        isValid: false,
        dataIssues: [{
          type: 'missing_table',
          severity: 'critical',
          description: `Table ${entityName} not found in schema`,
          affectedRows: 0
        }],
        constraintViolations: [],
        indexSuggestions: []
      }
    }

    // Validate data integrity
    if (options.checkDataIntegrity && sampleData.length > 0) {
      const integrityIssues = this.checkDataIntegrity(table, sampleData)
      dataIssues.push(...integrityIssues)
    }

    // Validate constraints
    if (options.validateConstraints && sampleData.length > 0) {
      const violations = this.checkConstraintViolations(table, sampleData)
      constraintViolations.push(...violations)
    }

    // Suggest indexes based on data patterns
    if (options.suggestIndexes && sampleData.length > 0) {
      const suggestions = this.suggestIndexesForEntity(table, sampleData)
      indexSuggestions.push(...suggestions)
    }

    return {
      isValid: dataIssues.filter(i => i.severity === 'critical').length === 0 &&
               constraintViolations.filter(v => v.severity === 'critical').length === 0,
      dataIssues,
      constraintViolations,
      indexSuggestions
    }
  }

  /**
   * Private helper methods
   */
  private async loadDatabaseSchema(): Promise<DatabaseSchema> {
    // This would typically query the database INFORMATION_SCHEMA
    // For now, we'll return a mock schema based on known entities
    return {
      tables: [
        this.createMockTableDefinition('users'),
        this.createMockTableDefinition('organizations'),
        this.createMockTableDefinition('vaults'),
        this.createMockTableDefinition('assets'),
        this.createMockTableDefinition('activities'),
        this.createMockTableDefinition('meetings')
      ],
      indexes: [],
      constraints: [],
      relationships: [],
      views: [],
      functions: []
    }
  }

  private createMockTableDefinition(tableName: string): TableDefinition {
    const baseColumns: ColumnDefinition[] = [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        autoIncrement: false,
        unique: true
      },
      {
        name: 'created_at',
        type: 'timestamp',
        nullable: false,
        autoIncrement: false,
        unique: false,
        defaultValue: 'CURRENT_TIMESTAMP'
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        nullable: false,
        autoIncrement: false,
        unique: false,
        defaultValue: 'CURRENT_TIMESTAMP'
      }
    ]

    const specificColumns: Record<string, ColumnDefinition[]> = {
      users: [
        { name: 'email', type: 'varchar', nullable: false, autoIncrement: false, unique: true, maxLength: 255 },
        { name: 'first_name', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 100 },
        { name: 'last_name', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 100 },
        { name: 'organization_id', type: 'uuid', nullable: true, autoIncrement: false, unique: false }
      ],
      organizations: [
        { name: 'name', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 200 },
        { name: 'slug', type: 'varchar', nullable: false, autoIncrement: false, unique: true, maxLength: 100 },
        { name: 'industry', type: 'varchar', nullable: true, autoIncrement: false, unique: false, maxLength: 100 }
      ],
      vaults: [
        { name: 'name', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 200 },
        { name: 'organization_id', type: 'uuid', nullable: false, autoIncrement: false, unique: false },
        { name: 'created_by', type: 'uuid', nullable: false, autoIncrement: false, unique: false }
      ],
      assets: [
        { name: 'name', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 255 },
        { name: 'file_size', type: 'bigint', nullable: false, autoIncrement: false, unique: false },
        { name: 'organization_id', type: 'uuid', nullable: false, autoIncrement: false, unique: false },
        { name: 'uploaded_by', type: 'uuid', nullable: false, autoIncrement: false, unique: false }
      ],
      activities: [
        { name: 'user_id', type: 'uuid', nullable: false, autoIncrement: false, unique: false },
        { name: 'organization_id', type: 'uuid', nullable: false, autoIncrement: false, unique: false },
        { name: 'type', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 50 },
        { name: 'timestamp', type: 'timestamp', nullable: false, autoIncrement: false, unique: false }
      ],
      meetings: [
        { name: 'title', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 255 },
        { name: 'organization_id', type: 'uuid', nullable: false, autoIncrement: false, unique: false },
        { name: 'scheduled_at', type: 'timestamp', nullable: false, autoIncrement: false, unique: false },
        { name: 'status', type: 'varchar', nullable: false, autoIncrement: false, unique: false, maxLength: 20 }
      ]
    }

    return {
      name: tableName,
      schema: 'public',
      columns: [...baseColumns, ...(specificColumns[tableName] || [])],
      primaryKey: ['id'],
      foreignKeys: [],
      indexes: [`${tableName}_pkey`],
      constraints: [`${tableName}_pkey`],
      rowCount: 0,
      size: 0
    }
  }

  private loadTypeDefinitions(): void {
    // This would typically load from actual TypeScript files
    // For now, we'll use mock type definitions
    const entityTypes = ['User', 'Organization', 'Vault', 'Asset', 'Activity', 'Meeting']
    
    entityTypes.forEach(entityName => {
      this.typeDefinitions.set(entityName, {
        name: entityName,
        properties: this.getMockProperties(entityName),
        extends: [],
        exported: true,
        filePath: `/src/types/entities/${entityName.toLowerCase()}.types.ts`
      })
    })
  }

  private getMockProperties(entityName: string): PropertyDefinition[] {
    const baseProperties: PropertyDefinition[] = [
      { name: 'id', type: 'string', optional: false, readonly: false },
      { name: 'createdAt', type: 'Date', optional: false, readonly: false },
      { name: 'updatedAt', type: 'Date', optional: false, readonly: false }
    ]

    const specificProperties: Record<string, PropertyDefinition[]> = {
      User: [
        { name: 'email', type: 'string', optional: false, readonly: false },
        { name: 'firstName', type: 'string', optional: false, readonly: false },
        { name: 'lastName', type: 'string', optional: false, readonly: false },
        { name: 'organizationId', type: 'string', optional: true, readonly: false }
      ],
      Organization: [
        { name: 'name', type: 'string', optional: false, readonly: false },
        { name: 'slug', type: 'string', optional: false, readonly: false },
        { name: 'industry', type: 'string', optional: true, readonly: false }
      ],
      Vault: [
        { name: 'name', type: 'string', optional: false, readonly: false },
        { name: 'organizationId', type: 'string', optional: false, readonly: false },
        { name: 'createdBy', type: 'string', optional: false, readonly: false }
      ]
    }

    return [...baseProperties, ...(specificProperties[entityName] || [])]
  }

  private async validateTables(schema: DatabaseSchema): Promise<{
    errors: SchemaValidationError[]
    warnings: SchemaValidationWarning[]
  }> {
    const errors: SchemaValidationError[] = []
    const warnings: SchemaValidationWarning[] = []

    // Check if all entity types have corresponding tables
    for (const [typeName, typeDef] of this.typeDefinitions) {
      const tableName = this.typeNameToTableName(typeName)
      const table = schema.tables.find(t => t.name === tableName)
      
      if (!table) {
        errors.push({
          type: 'missing_table',
          severity: 'high',
          table: tableName,
          message: `Table ${tableName} is missing but TypeScript type ${typeName} exists`,
          suggestion: `Create table ${tableName} to match TypeScript type ${typeName}`
        })
      }
    }

    // Check table naming conventions
    for (const table of schema.tables) {
      if (!this.followsNamingConvention(table.name)) {
        warnings.push({
          type: 'naming_convention',
          table: table.name,
          message: `Table ${table.name} doesn't follow naming conventions`,
          recommendation: 'Use snake_case for table names',
          impact: 'low'
        })
      }

      // Check for missing primary key
      if (table.primaryKey.length === 0) {
        errors.push({
          type: 'constraint_violation',
          severity: 'high',
          table: table.name,
          message: `Table ${table.name} is missing a primary key`,
          suggestion: 'Add a primary key column (typically "id")'
        })
      }
    }

    return { errors, warnings }
  }

  private async validateTypes(
    schema: DatabaseSchema,
    strictTypeChecking: boolean = false
  ): Promise<{
    errors: SchemaValidationError[]
    warnings: SchemaValidationWarning[]
  }> {
    const errors: SchemaValidationError[] = []
    const warnings: SchemaValidationWarning[] = []

    for (const table of schema.tables) {
      const typeName = this.tableNameToTypeName(table.name)
      const typeDef = this.typeDefinitions.get(typeName)
      
      if (!typeDef) {
        if (strictTypeChecking) {
          errors.push({
            type: 'missing_column',
            severity: 'medium',
            table: table.name,
            message: `No TypeScript type found for table ${table.name}`,
            suggestion: `Create TypeScript type ${typeName} for table ${table.name}`
          })
        }
        continue
      }

      // Check column mappings
      for (const property of typeDef.properties) {
        const columnName = this.propertyNameToColumnName(property.name)
        const column = table.columns.find(c => c.name === columnName)
        
        if (!column) {
          errors.push({
            type: 'missing_column',
            severity: 'medium',
            table: table.name,
            column: columnName,
            message: `Column ${columnName} is missing but TypeScript property ${property.name} exists`,
            suggestion: `Add column ${columnName} to table ${table.name}`
          })
          continue
        }

        // Type compatibility check
        const isCompatible = this.areTypesCompatible(column.type, property.type)
        if (!isCompatible) {
          const severity = strictTypeChecking ? 'high' : 'medium'
          errors.push({
            type: 'type_mismatch',
            severity,
            table: table.name,
            column: column.name,
            message: `Type mismatch: DB column ${column.name} is ${column.type} but TypeScript property ${property.name} is ${property.type}`,
            expectedType: property.type,
            actualType: column.type,
            suggestion: `Update database column type to match TypeScript type or vice versa`
          })
        }

        // Nullability check
        if (!column.nullable && property.optional) {
          warnings.push({
            type: 'best_practice',
            table: table.name,
            column: column.name,
            message: `Column ${column.name} is NOT NULL but TypeScript property ${property.name} is optional`,
            recommendation: 'Ensure nullability consistency between database and TypeScript',
            impact: 'medium'
          })
        }
      }
    }

    return { errors, warnings }
  }

  private async validateConstraints(schema: DatabaseSchema): Promise<{
    errors: SchemaValidationError[]
    warnings: SchemaValidationWarning[]
  }> {
    const errors: SchemaValidationError[] = []
    const warnings: SchemaValidationWarning[] = []

    for (const table of schema.tables) {
      // Check foreign key constraints
      for (const fk of table.foreignKeys) {
        const referencedTable = schema.tables.find(t => t.name === fk.referencedTable)
        if (!referencedTable) {
          errors.push({
            type: 'foreign_key_error',
            severity: 'high',
            table: table.name,
            column: fk.column,
            message: `Foreign key references non-existent table ${fk.referencedTable}`,
            suggestion: `Create table ${fk.referencedTable} or remove foreign key constraint`
          })
        }
      }

      // Check for missing indexes on foreign keys
      for (const fk of table.foreignKeys) {
        const hasIndex = table.indexes.some(idx => 
          schema.indexes.find(i => i.name === idx)?.columns.includes(fk.column)
        )
        
        if (!hasIndex) {
          warnings.push({
            type: 'performance_impact',
            table: table.name,
            column: fk.column,
            message: `Foreign key column ${fk.column} lacks index`,
            recommendation: `Add index on ${fk.column} for better join performance`,
            impact: 'medium'
          })
        }
      }
    }

    return { errors, warnings }
  }

  private async generateOptimizationSuggestions(schema: DatabaseSchema): Promise<SchemaSuggestion[]> {
    const suggestions: SchemaSuggestion[] = []

    for (const table of schema.tables) {
      // Suggest indexes based on common patterns
      const textColumns = table.columns.filter(c => 
        c.type.includes('varchar') || c.type.includes('text')
      )
      
      for (const column of textColumns) {
        if (column.name.includes('email') || column.name.includes('slug')) {
          suggestions.push({
            type: 'index',
            priority: 'medium',
            description: `Add unique index on ${table.name}.${column.name}`,
            implementation: `CREATE UNIQUE INDEX idx_${table.name}_${column.name} ON ${table.name} (${column.name});`,
            expectedBenefit: 'Faster lookups and uniqueness enforcement',
            migrationComplexity: 'easy'
          })
        }
      }

      // Suggest partitioning for large tables
      if (table.rowCount > 1000000) {
        suggestions.push({
          type: 'optimization',
          priority: 'high',
          description: `Consider partitioning large table ${table.name}`,
          implementation: `ALTER TABLE ${table.name} PARTITION BY RANGE (created_at);`,
          expectedBenefit: 'Improved query performance and maintenance',
          migrationComplexity: 'hard'
        })
      }
    }

    return suggestions
  }

  private async analyzePerformance(schema: DatabaseSchema): Promise<PerformanceAnalysis> {
    const potentialBottlenecks: BottleneckAnalysis[] = []
    const recommendations: PerformanceRecommendation[] = []

    let indexCoverage = 0
    let totalForeignKeys = 0

    for (const table of schema.tables) {
      // Check index coverage on foreign keys
      for (const fk of table.foreignKeys) {
        totalForeignKeys++
        const hasIndex = table.indexes.some(idxName => {
          const index = schema.indexes.find(i => i.name === idxName)
          return index?.columns.includes(fk.column)
        })
        
        if (hasIndex) {
          indexCoverage++
        } else {
          potentialBottlenecks.push({
            table: table.name,
            issue: 'missing_index',
            severity: 'medium',
            description: `Missing index on foreign key ${fk.column}`,
            estimatedImpact: 'Slow JOIN operations'
          })
        }
      }

      // Check for large tables without partitioning
      if (table.rowCount > 5000000) {
        potentialBottlenecks.push({
          table: table.name,
          issue: 'large_table',
          severity: 'high',
          description: `Large table with ${table.rowCount} rows`,
          estimatedImpact: 'Slow queries, large index scans'
        })

        recommendations.push({
          type: 'partition',
          table: table.name,
          description: `Partition ${table.name} by date or other suitable column`,
          estimatedImprovement: '50-80% query performance improvement',
          implementationEffort: 'high'
        })
      }
    }

    const indexCoveragePercentage = totalForeignKeys > 0 ? (indexCoverage / totalForeignKeys) * 100 : 100

    return {
      indexCoverage: indexCoveragePercentage,
      queryPerformanceScore: this.calculatePerformanceScore(schema),
      normalizedScore: this.calculateNormalizedScore(schema),
      potentialBottlenecks,
      recommendations
    }
  }

  private async checkCompliance(schema: DatabaseSchema): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = []

    // GDPR compliance checks
    const hasPersonalDataAudit = schema.tables.some(t => 
      t.columns.some(c => c.name.includes('audit') || c.name.includes('log'))
    )

    checks.push({
      framework: 'GDPR',
      requirement: 'Data Processing Audit Trail',
      status: hasPersonalDataAudit ? 'compliant' : 'non_compliant',
      details: hasPersonalDataAudit ? 
        'Audit trail capabilities detected' : 
        'No audit trail mechanism found for personal data processing',
      remediationSteps: hasPersonalDataAudit ? [] : [
        'Add audit trail table',
        'Implement data access logging',
        'Add data retention policies'
      ]
    })

    // SOX compliance for financial data
    const hasFinancialControls = schema.tables.some(t =>
      t.name.includes('financial') || t.name.includes('audit')
    )

    checks.push({
      framework: 'SOX',
      requirement: 'Financial Data Controls',
      status: hasFinancialControls ? 'partial' : 'non_compliant',
      details: 'Financial data access controls evaluation',
      remediationSteps: [
        'Implement role-based access controls',
        'Add financial data audit trails',
        'Establish approval workflows'
      ]
    })

    return checks
  }

  private async analyzeTypeCoverage(schema: DatabaseSchema): Promise<TypeCoverage> {
    const totalTables = schema.tables.length
    const coveredTables = schema.tables.filter(table => {
      const typeName = this.tableNameToTypeName(table.name)
      return this.typeDefinitions.has(typeName)
    }).length

    const uncoveredTables = schema.tables
      .filter(table => {
        const typeName = this.tableNameToTypeName(table.name)
        return !this.typeDefinitions.has(typeName)
      })
      .map(table => table.name)

    const typeMatches: TypeMatchResult[] = []
    
    for (const table of schema.tables) {
      const typeName = this.tableNameToTypeName(table.name)
      const typeDef = this.typeDefinitions.get(typeName)
      
      if (typeDef) {
        for (const column of table.columns) {
          const propertyName = this.columnNameToPropertyName(column.name)
          const property = typeDef.properties.find(p => p.name === propertyName)
          
          if (property) {
            typeMatches.push({
              table: table.name,
              column: column.name,
              dbType: column.type,
              tsType: property.type,
              isMatch: this.areTypesCompatible(column.type, property.type),
              conversionNeeded: !this.areTypesCompatible(column.type, property.type)
            })
          }
        }
      }
    }

    return {
      totalTables,
      coveredTables,
      coveragePercentage: totalTables > 0 ? (coveredTables / totalTables) * 100 : 100,
      uncoveredTables,
      typeMatches
    }
  }

  // Helper methods for naming conventions and type mappings
  private typeNameToTableName(typeName: string): string {
    return typeName.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1) + 's'
  }

  private tableNameToTypeName(tableName: string): string {
    return tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/s$/, '')
      .replace(/^([a-z])/, (_, letter) => letter.toUpperCase())
  }

  private propertyNameToColumnName(propertyName: string): string {
    return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase()
  }

  private columnNameToPropertyName(columnName: string): string {
    return columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private followsNamingConvention(name: string): boolean {
    return /^[a-z][a-z0-9_]*[a-z0-9]$/.test(name)
  }

  private areTypesCompatible(dbType: string, tsType: string): boolean {
    const typeMapping: Record<string, string[]> = {
      'string': ['varchar', 'text', 'char', 'uuid'],
      'number': ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double'],
      'boolean': ['boolean', 'bool'],
      'Date': ['timestamp', 'timestamptz', 'date', 'time']
    }

    return typeMapping[tsType]?.some(dbTypePattern => 
      dbType.toLowerCase().includes(dbTypePattern)
    ) || false
  }

  private calculatePerformanceScore(schema: DatabaseSchema): number {
    let score = 100
    
    for (const table of schema.tables) {
      // Deduct points for missing indexes on foreign keys
      const fkWithoutIndex = table.foreignKeys.filter(fk => 
        !table.indexes.some(idxName => {
          const index = schema.indexes.find(i => i.name === idxName)
          return index?.columns.includes(fk.column)
        })
      ).length
      
      score -= fkWithoutIndex * 5

      // Deduct points for very large tables without partitioning
      if (table.rowCount > 5000000) {
        score -= 10
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateNormalizedScore(schema: DatabaseSchema): number {
    // Simple normalization score based on relationships
    const totalTables = schema.tables.length
    const tablesWithForeignKeys = schema.tables.filter(t => t.foreignKeys.length > 0).length
    
    return totalTables > 0 ? (tablesWithForeignKeys / totalTables) * 100 : 0
  }

  // Additional helper methods and interfaces would be implemented here...
}

// Supporting interfaces
interface MigrationSuggestion {
  type: 'create_table' | 'drop_table' | 'add_column' | 'drop_column' | 'alter_column' | 'add_index' | 'drop_index'
  description: string
  sql: string
  impact: 'low' | 'medium' | 'high'
}

interface DataIntegrityIssue {
  type: 'null_violation' | 'type_violation' | 'constraint_violation' | 'missing_table'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedRows: number
}

interface ConstraintViolation {
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  constraint: string
  affectedRows: number
}

interface IndexSuggestion {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist'
  reason: string
  estimatedBenefit: string
}

interface ForeignKeyDefinition {
  column: string
  referencedTable: string
  referencedColumn: string
}

// Export singleton and factory
export const schemaValidator = new DatabaseSchemaValidator()

export function createSchemaValidator(): DatabaseSchemaValidator {
  return new DatabaseSchemaValidator()
}