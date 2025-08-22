/**
 * Enhanced Database Client with Performance Monitoring
 * Wraps Supabase client with comprehensive monitoring and performance tracking
 */

import { createServerClient, SupabaseClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { monitor } from '@/lib/monitoring'
import { telemetry, withDatabaseTelemetry } from '@/lib/telemetry'

interface QueryMetadata {
  table?: string
  operation?: string
  filters?: Record<string, any>
  joins?: string[]
  limit?: number
  orderBy?: string
}

export class EnhancedDatabaseClient {
  private client: SupabaseClient<Database>
  private clientType: 'server' | 'client' | 'admin'

  constructor(client: SupabaseClient<Database>, type: 'server' | 'client' | 'admin' = 'server') {
    this.client = client
    this.clientType = type
  }

  /**
   * Enhanced select query with monitoring
   */
  async select(
    table: string,
    query: string,
    metadata?: QueryMetadata
  ) {
    const startTime = Date.now()
    const operationName = `select_${table}`
    
    try {
      const result = await this.client
        .from(table)
        .select(query)

      const duration = Date.now() - startTime
      
      // Record metrics
      monitor.trackDatabaseQuery(operationName, duration, {
        table,
        query: query.substring(0, 100), // Truncate for logging
        clientType: this.clientType,
        ...metadata
      })
      
      telemetry.recordDatabaseQuery('select', table, duration, true)
      
      // Log slow queries
      if (duration > 500) {
        console.warn(`Slow SELECT query on ${table}: ${duration}ms`, {
          query: query.substring(0, 200),
          metadata
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      monitor.trackError(`db:${operationName}`, error as Error, {
        table,
        query: query.substring(0, 100),
        duration
      })
      
      telemetry.recordDatabaseQuery('select', table, duration, false)
      
      throw error
    }
  }

  /**
   * Enhanced insert query with monitoring
   */
  async insert(
    table: string,
    data: any | any[],
    metadata?: QueryMetadata
  ) {
    const startTime = Date.now()
    const operationName = `insert_${table}`
    const isArray = Array.isArray(data)
    const recordCount = isArray ? data.length : 1
    
    try {
      const result = await this.client
        .from(table)
        .insert(data)

      const duration = Date.now() - startTime
      
      // Record metrics
      monitor.trackDatabaseQuery(operationName, duration, {
        table,
        recordCount,
        clientType: this.clientType,
        ...metadata
      })
      
      telemetry.recordDatabaseQuery('insert', table, duration, true)
      
      // Track business metrics
      telemetry.recordBusinessMetric(`${table}_created`, recordCount)
      
      // Log slow inserts
      if (duration > 1000) {
        console.warn(`Slow INSERT query on ${table}: ${duration}ms`, {
          recordCount,
          metadata
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      monitor.trackError(`db:${operationName}`, error as Error, {
        table,
        recordCount,
        duration
      })
      
      telemetry.recordDatabaseQuery('insert', table, duration, false)
      
      throw error
    }
  }

  /**
   * Enhanced update query with monitoring
   */
  async update(
    table: string,
    data: any,
    filters: Record<string, any>,
    metadata?: QueryMetadata
  ) {
    const startTime = Date.now()
    const operationName = `update_${table}`
    
    try {
      let query = this.client.from(table).update(data)
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const result = await query

      const duration = Date.now() - startTime
      
      // Record metrics
      monitor.trackDatabaseQuery(operationName, duration, {
        table,
        filters,
        clientType: this.clientType,
        ...metadata
      })
      
      telemetry.recordDatabaseQuery('update', table, duration, true)
      
      // Track business metrics
      telemetry.recordBusinessMetric(`${table}_updated`, 1)
      
      // Log slow updates
      if (duration > 1000) {
        console.warn(`Slow UPDATE query on ${table}: ${duration}ms`, {
          filters,
          metadata
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      monitor.trackError(`db:${operationName}`, error as Error, {
        table,
        filters,
        duration
      })
      
      telemetry.recordDatabaseQuery('update', table, duration, false)
      
      throw error
    }
  }

  /**
   * Enhanced delete query with monitoring
   */
  async delete(
    table: string,
    filters: Record<string, any>,
    metadata?: QueryMetadata
  ) {
    const startTime = Date.now()
    const operationName = `delete_${table}`
    
    try {
      let query = this.client.from(table).delete()
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const result = await query

      const duration = Date.now() - startTime
      
      // Record metrics
      monitor.trackDatabaseQuery(operationName, duration, {
        table,
        filters,
        clientType: this.clientType,
        ...metadata
      })
      
      telemetry.recordDatabaseQuery('delete', table, duration, true)
      
      // Track business metrics
      telemetry.recordBusinessMetric(`${table}_deleted`, 1)
      
      // Log slow deletes
      if (duration > 500) {
        console.warn(`Slow DELETE query on ${table}: ${duration}ms`, {
          filters,
          metadata
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      monitor.trackError(`db:${operationName}`, error as Error, {
        table,
        filters,
        duration
      })
      
      telemetry.recordDatabaseQuery('delete', table, duration, false)
      
      throw error
    }
  }

  /**
   * Enhanced RPC call with monitoring
   */
  async rpc(
    functionName: string,
    params?: Record<string, any>,
    metadata?: QueryMetadata
  ) {
    const startTime = Date.now()
    const operationName = `rpc_${functionName}`
    
    try {
      const result = await this.client.rpc(functionName, params)

      const duration = Date.now() - startTime
      
      // Record metrics
      monitor.trackDatabaseQuery(operationName, duration, {
        function: functionName,
        params: JSON.stringify(params).substring(0, 100),
        clientType: this.clientType,
        ...metadata
      })
      
      telemetry.recordDatabaseQuery('rpc', functionName, duration, true)
      
      // Log slow RPC calls
      if (duration > 2000) {
        console.warn(`Slow RPC call ${functionName}: ${duration}ms`, {
          params,
          metadata
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      monitor.trackError(`db:${operationName}`, error as Error, {
        function: functionName,
        params: JSON.stringify(params).substring(0, 100),
        duration
      })
      
      telemetry.recordDatabaseQuery('rpc', functionName, duration, false)
      
      throw error
    }
  }

  /**
   * Raw client access for complex operations
   */
  get raw() {
    return this.client
  }

  /**
   * Auth operations with monitoring
   */
  get auth() {
    return {
      getUser: withDatabaseTelemetry(
        () => this.client.auth.getUser(),
        'auth',
        'getUser'
      ),
      
      signInWithPassword: withDatabaseTelemetry(
        (credentials: { email: string; password: string }) => 
          this.client.auth.signInWithPassword(credentials),
        'auth',
        'signInWithPassword'
      ),
      
      signUp: withDatabaseTelemetry(
        (credentials: { email: string; password: string }) => 
          this.client.auth.signUp(credentials),
        'auth',
        'signUp'
      ),
      
      signOut: withDatabaseTelemetry(
        () => this.client.auth.signOut(),
        'auth',
        'signOut'
      )
    }
  }

  /**
   * Storage operations with monitoring
   */
  get storage() {
    return {
      from: (bucket: string) => ({
        upload: withDatabaseTelemetry(
          (path: string, file: File | Blob) => 
            this.client.storage.from(bucket).upload(path, file),
          'storage',
          `upload_${bucket}`
        ),
        
        download: withDatabaseTelemetry(
          (path: string) => 
            this.client.storage.from(bucket).download(path),
          'storage',
          `download_${bucket}`
        ),
        
        remove: withDatabaseTelemetry(
          (paths: string[]) => 
            this.client.storage.from(bucket).remove(paths),
          'storage',
          `remove_${bucket}`
        )
      })
    }
  }
}

/**
 * Factory function to create enhanced database client
 */
export function createEnhancedSupabaseClient(cookies?: any): EnhancedDatabaseClient {
  if (cookies) {
    // Server-side client
    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    )
    return new EnhancedDatabaseClient(client, 'server')
  } else if (typeof window !== 'undefined') {
    // Client-side client
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return new EnhancedDatabaseClient(client, 'client')
  } else {
    throw new Error('Invalid environment for creating Supabase client')
  }
}

/**
 * Create admin client with enhanced monitoring
 */
export function createEnhancedAdminClient(): EnhancedDatabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service role key is required for admin client')
  }

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )

  return new EnhancedDatabaseClient(client, 'admin')
}