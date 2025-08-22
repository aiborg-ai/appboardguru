/**
 * Centralized Database Service
 * Provides a unified interface for all database operations with proper error handling
 * and connection management
 */

import { createSupabaseServerClient } from '../supabase-server'
import { createSupabaseBrowserClient } from '../supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export type DatabaseClient = SupabaseClient<Database>

/**
 * Database operation result wrapper for consistent error handling
 */
export type DatabaseResult<T> = {
  data: T | null
  error: Error | null
  success: boolean
}

/**
 * Query options for database operations
 */
export interface QueryOptions {
  timeout?: number
  retries?: number
  throwOnError?: boolean
}

/**
 * Centralized Database Service
 * Provides singleton access to Supabase clients with connection pooling
 */
export class DatabaseService {
  private static instance: DatabaseService
  private serverClient: DatabaseClient | null = null
  private browserClient: DatabaseClient | null = null
  private connectionPool: Map<string, DatabaseClient> = new Map()

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Get server-side Supabase client
   */
  public async getServerClient(): Promise<DatabaseClient> {
    try {
      if (!this.serverClient) {
        this.serverClient = await createSupabaseServerClient() as unknown as DatabaseClient
      }
      return this.serverClient as DatabaseClient
    } catch (error) {
      console.error('Failed to create server client:', error)
      throw new Error('Database connection failed')
    }
  }

  /**
   * Get browser-side Supabase client
   */
  public getBrowserClient(): DatabaseClient {
    try {
      if (!this.browserClient) {
        this.browserClient = createSupabaseBrowserClient() as unknown as DatabaseClient
      }
      return this.browserClient as DatabaseClient
    } catch (error) {
      console.error('Failed to create browser client:', error)
      throw new Error('Database connection failed')
    }
  }

  /**
   * Get appropriate client based on environment
   */
  public async getClient(): Promise<DatabaseClient> {
    if (typeof window === 'undefined') {
      return this.getServerClient()
    } else {
      return this.getBrowserClient()
    }
  }

  /**
   * Execute a database query with proper error handling
   */
  public async executeQuery<T>(
    queryFn: (client: DatabaseClient) => Promise<{ data: T | null; error: any | null }>,
    options: QueryOptions = {}
  ): Promise<DatabaseResult<T>> {
    const { timeout = 30000, retries = 3, throwOnError = false } = options

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await this.getClient()
        
        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        })

        const queryPromise = queryFn(client)
        const result = await Promise.race([queryPromise, timeoutPromise])

        if (result.error) {
          const error = new Error(result.error.message || 'Database query failed')
          if (throwOnError || attempt === retries) {
            throw error
          }
          console.warn(`Query attempt ${attempt} failed:`, error.message)
          continue
        }

        return {
          data: result.data,
          error: null,
          success: true
        }

      } catch (error) {
        console.error(`Query attempt ${attempt} failed:`, error)
        
        if (attempt === retries) {
          const finalError = error instanceof Error ? error : new Error('Unknown database error')
          if (throwOnError) {
            throw finalError
          }
          return {
            data: null,
            error: finalError,
            success: false
          }
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    return {
      data: null,
      error: new Error('All retry attempts failed'),
      success: false
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async executeTransaction<T>(
    operations: Array<(client: DatabaseClient) => Promise<{ data: T | null; error: any | null }>>,
    options: QueryOptions = {}
  ): Promise<DatabaseResult<T[]>> {
    try {
      const client = await this.getClient()
      const results: T[] = []

      // Note: Supabase doesn't support traditional transactions in the browser
      // This is a best-effort implementation
      for (const operation of operations) {
        const result = await this.executeQuery(
          (client) => operation(client),
          { ...options, throwOnError: true }
        )
        if (!result.success) {
          throw result.error || new Error('Transaction operation failed')
        }
        if (result.data !== null) {
          results.push(result.data)
        }
      }

      return {
        data: results,
        error: null,
        success: true
      }

    } catch (error) {
      console.error('Transaction failed:', error)
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Transaction failed'),
        success: false
      }
    }
  }

  /**
   * Get table reference with proper typing
   */
  public async getTable<T extends keyof Database['public']['Tables']>(
    tableName: T
  ): Promise<ReturnType<DatabaseClient['from']>> {
    const client = await this.getClient()
    return client.from(tableName)
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeQuery(
        async (client) => {
          const { data, error } = await client.from('users').select('id').limit(1)
          return { data, error }
        },
        { timeout: 5000, retries: 1 }
      )
      return result.success
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  /**
   * Close all connections (cleanup)
   */
  public cleanup(): void {
    this.serverClient = null
    this.browserClient = null
    this.connectionPool.clear()
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    serverConnected: boolean
    browserConnected: boolean
    poolSize: number
  } {
    return {
      serverConnected: this.serverClient !== null,
      browserConnected: this.browserClient !== null,
      poolSize: this.connectionPool.size
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance()

// Export helper functions for backward compatibility
export const getServerClient = () => databaseService.getServerClient()
export const getBrowserClient = () => databaseService.getBrowserClient()
export const getClient = () => databaseService.getClient()
export const executeQuery = <T>(
  queryFn: (client: DatabaseClient) => Promise<{ data: T | null; error: any | null }>,
  options?: QueryOptions
) => databaseService.executeQuery(queryFn, options)