import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '../../types/database'

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  url: string
  anonKey: string
  serviceKey?: string
  connectionPoolSize?: number
  enableRealtime?: boolean
  debug?: boolean
}

/**
 * Connection pool manager for database connections
 */
class ConnectionPool {
  private connections: Map<string, SupabaseClient<Database>> = new Map()
  private maxConnections: number

  constructor(maxConnections: number = 10) {
    this.maxConnections = maxConnections
  }

  getConnection(key: string, factory: () => SupabaseClient<Database>): SupabaseClient<Database> {
    if (!this.connections.has(key)) {
      if (this.connections.size >= this.maxConnections) {
        // Simple LRU eviction - remove first connection
        const firstKey = this.connections.keys().next().value
        this.connections.delete(firstKey)
      }
      
      this.connections.set(key, factory())
    }
    
    return this.connections.get(key)!
  }

  closeAll(): void {
    this.connections.clear()
  }

  getStats(): { total: number; max: number } {
    return {
      total: this.connections.size,
      max: this.maxConnections
    }
  }
}

// Global connection pool
const connectionPool = new ConnectionPool()

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    url: process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co',
    anonKey: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'placeholder-key',
    serviceKey: process.env['SUPABASE_SERVICE_ROLE_KEY'],
    connectionPoolSize: parseInt(process.env['DB_CONNECTION_POOL_SIZE'] || '10'),
    enableRealtime: process.env['DB_ENABLE_REALTIME'] === 'true',
    debug: process.env['NODE_ENV'] === 'development'
  }
}

/**
 * Create a client-side Supabase connection
 */
export function createClientConnection(): SupabaseClient<Database> {
  const config = getDatabaseConfig()
  
  return connectionPool.getConnection('client', () => 
    createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        storageKey: 'appboardguru-auth'
      },
      realtime: {
        enabled: config.enableRealtime
      },
      global: {
        headers: {
          'X-Client-Info': 'appboardguru-web'
        }
      }
    })
  )
}

/**
 * Create a server-side Supabase connection with cookie handling
 * Only works in server components
 */
export async function createServerConnection(): Promise<SupabaseClient<Database>> {
  const config = getDatabaseConfig()
  
  // Dynamic import to avoid issues in client-side code
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient<Database>(
    config.url,
    config.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.delete(name)
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'appboardguru-server'
        }
      }
    }
  )
}

/**
 * Create an admin connection using service role key
 */
export function createAdminConnection(): SupabaseClient<Database> {
  const config = getDatabaseConfig()
  
  if (!config.serviceKey) {
    throw new Error('Service role key is required for admin connection')
  }

  return connectionPool.getConnection('admin', () =>
    createClient<Database>(config.url, config.serviceKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'X-Client-Info': 'appboardguru-admin'
        }
      }
    })
  )
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(client: SupabaseClient<Database>): Promise<{
  status: 'healthy' | 'unhealthy'
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }

    const latency = Date.now() - start

    return {
      status: 'healthy',
      latency
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Execute a function with automatic retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Execute multiple database operations in a transaction-like manner
 * Note: Supabase doesn't have true transactions, so this implements
 * a compensating transaction pattern
 */
export async function executeTransaction<T>(
  client: SupabaseClient<Database>,
  operations: Array<{
    operation: () => Promise<any>
    compensate?: () => Promise<any>
    description?: string
  }>
): Promise<T[]> {
  const results: T[] = []
  const executedOperations: Array<{
    index: number
    compensate?: () => Promise<any>
  }> = []

  try {
    for (let i = 0; i < operations.length; i++) {
      const { operation, compensate, description } = operations[i]
      
      try {
        const result = await operation()
        results.push(result)
        
        if (compensate) {
          executedOperations.push({ index: i, compensate })
        }
      } catch (error) {
        console.error(`Transaction operation ${i} failed: ${description}`, error)
        
        // Execute compensating actions in reverse order
        for (let j = executedOperations.length - 1; j >= 0; j--) {
          const { index, compensate } = executedOperations[j]
          try {
            if (compensate) {
              await compensate()
              console.log(`Compensated operation ${index}`)
            }
          } catch (compensateError) {
            console.error(`Failed to compensate operation ${index}:`, compensateError)
          }
        }
        
        throw error
      }
    }
    
    return results
  } catch (error) {
    throw error
  }
}

/**
 * Connection monitoring and metrics
 */
export class DatabaseMonitor {
  private metrics: {
    queryCount: number
    errorCount: number
    totalLatency: number
    connectionCount: number
  } = {
    queryCount: 0,
    errorCount: 0,
    totalLatency: 0,
    connectionCount: 0
  }

  recordQuery(latency: number): void {
    this.metrics.queryCount++
    this.metrics.totalLatency += latency
  }

  recordError(): void {
    this.metrics.errorCount++
  }

  recordConnection(): void {
    this.metrics.connectionCount++
  }

  getMetrics(): {
    queryCount: number
    errorCount: number
    averageLatency: number
    errorRate: number
    connectionCount: number
  } {
    return {
      queryCount: this.metrics.queryCount,
      errorCount: this.metrics.errorCount,
      averageLatency: this.metrics.queryCount > 0 
        ? this.metrics.totalLatency / this.metrics.queryCount 
        : 0,
      errorRate: this.metrics.queryCount > 0 
        ? (this.metrics.errorCount / this.metrics.queryCount) * 100 
        : 0,
      connectionCount: this.metrics.connectionCount
    }
  }

  reset(): void {
    this.metrics = {
      queryCount: 0,
      errorCount: 0,
      totalLatency: 0,
      connectionCount: 0
    }
  }
}

// Global monitor instance
export const databaseMonitor = new DatabaseMonitor()

/**
 * Middleware to wrap Supabase client methods with monitoring
 */
export function createMonitoredClient(client: SupabaseClient<Database>): SupabaseClient<Database> {
  const originalFrom = client.from.bind(client)
  
  client.from = (table: string) => {
    const queryBuilder = originalFrom(table)
    
    // Wrap common methods with monitoring
    const wrapMethod = (method: any, methodName: string) => {
      return async (...args: any[]) => {
        const start = Date.now()
        databaseMonitor.recordConnection()
        
        try {
          const result = await method.apply(queryBuilder, args)
          const latency = Date.now() - start
          databaseMonitor.recordQuery(latency)
          
          if (result.error) {
            databaseMonitor.recordError()
          }
          
          return result
        } catch (error) {
          databaseMonitor.recordError()
          throw error
        }
      }
    }

    // Wrap key methods
    if (queryBuilder.select) {
      queryBuilder.select = wrapMethod(queryBuilder.select.bind(queryBuilder), 'select')
    }
    if (queryBuilder.insert) {
      queryBuilder.insert = wrapMethod(queryBuilder.insert.bind(queryBuilder), 'insert')
    }
    if (queryBuilder.update) {
      queryBuilder.update = wrapMethod(queryBuilder.update.bind(queryBuilder), 'update')
    }
    if (queryBuilder.delete) {
      queryBuilder.delete = wrapMethod(queryBuilder.delete.bind(queryBuilder), 'delete')
    }

    return queryBuilder
  }

  return client
}

/**
 * Get connection pool statistics
 */
export function getConnectionPoolStats() {
  return connectionPool.getStats()
}

/**
 * Close all connections in the pool
 */
export function closeAllConnections(): void {
  connectionPool.closeAll()
}

/**
 * Database migration utilities
 */
export class MigrationRunner {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async runMigration(
    migrationName: string,
    migrationSql: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if migration already ran
      const { data: existingMigration, error: checkError } = await this.client
        .from('_migrations')
        .select('name')
        .eq('name', migrationName)
        .single()

      if (!checkError && existingMigration) {
        console.log(`Migration ${migrationName} already executed`)
        return { success: true }
      }

      // Execute migration SQL using RPC
      const { error: migrationError } = await this.client
        .rpc('execute_sql', { sql_query: migrationSql })

      if (migrationError) {
        throw migrationError
      }

      // Record migration
      const { error: recordError } = await this.client
        .from('_migrations')
        .insert({
          name: migrationName,
          executed_at: new Date().toISOString()
        })

      if (recordError) {
        throw recordError
      }

      console.log(`Migration ${migrationName} executed successfully`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Migration ${migrationName} failed:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  async getPendingMigrations(availableMigrations: string[]): Promise<string[]> {
    const { data: executedMigrations, error } = await this.client
      .from('_migrations')
      .select('name')

    if (error) {
      console.error('Failed to fetch executed migrations:', error)
      return availableMigrations
    }

    const executedNames = new Set(executedMigrations?.map(m => m.name) || [])
    return availableMigrations.filter(name => !executedNames.has(name))
  }
}