/**
 * Supabase Client Mock Implementation
 * Comprehensive mocking for database and storage operations
 * Following CLAUDE.md patterns for external service mocking
 */

import { jest } from '@jest/globals'

// Storage mock implementation
export class MockSupabaseStorage {
  private files: Map<string, { data: any; metadata: any }> = new Map()
  private buckets: Set<string> = new Set(['assets'])

  from(bucket: string) {
    return {
      upload: jest.fn().mockImplementation(async (path: string, file: any, options?: any) => {
        if (!this.buckets.has(bucket)) {
          return {
            data: null,
            error: { message: `Bucket "${bucket}" not found`, statusCode: '404' }
          }
        }

        // Simulate upload conditions
        if (path.includes('malware')) {
          return {
            data: null,
            error: { message: 'Upload blocked by security policy', statusCode: '403' }
          }
        }

        if (file?.size > 50 * 1024 * 1024) {
          return {
            data: null,
            error: { message: 'File too large', statusCode: '413' }
          }
        }

        // Simulate network issues
        if (path.includes('network-fail')) {
          return {
            data: null,
            error: { message: 'Network error', statusCode: '503' }
          }
        }

        const uploadData = {
          path,
          id: `file_${Math.random().toString(36).substr(2, 9)}`,
          fullPath: `${bucket}/${path}`
        }

        this.files.set(path, {
          data: file,
          metadata: {
            ...options?.metadata,
            contentType: options?.contentType,
            size: file?.size || 0,
            uploadedAt: new Date().toISOString()
          }
        })

        return { data: uploadData, error: null }
      }),

      download: jest.fn().mockImplementation(async (path: string) => {
        const file = this.files.get(path)
        if (!file) {
          return {
            data: null,
            error: { message: 'File not found', statusCode: '404' }
          }
        }

        return {
          data: file.data,
          error: null
        }
      }),

      remove: jest.fn().mockImplementation(async (paths: string[]) => {
        const removed = paths.filter(path => {
          if (this.files.has(path)) {
            this.files.delete(path)
            return true
          }
          return false
        })

        return {
          data: removed.map(path => ({ name: path })),
          error: null
        }
      }),

      list: jest.fn().mockImplementation(async (path: string = '') => {
        const files = Array.from(this.files.keys())
          .filter(filePath => filePath.startsWith(path))
          .map(filePath => ({
            name: filePath.split('/').pop(),
            id: `file_${Math.random().toString(36).substr(2, 9)}`,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            last_accessed_at: null,
            metadata: this.files.get(filePath)?.metadata
          }))

        return { data: files, error: null }
      }),

      getPublicUrl: jest.fn().mockImplementation((path: string) => {
        return {
          data: {
            publicUrl: `https://mock-storage.supabase.co/storage/v1/object/public/${bucket}/${path}`
          }
        }
      }),

      createSignedUrl: jest.fn().mockImplementation(async (path: string, expiresIn: number) => {
        if (!this.files.has(path)) {
          return {
            data: null,
            error: { message: 'File not found', statusCode: '404' }
          }
        }

        return {
          data: {
            signedUrl: `https://mock-storage.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock-token-${Date.now()}`
          },
          error: null
        }
      }),

      move: jest.fn().mockImplementation(async (fromPath: string, toPath: string) => {
        const file = this.files.get(fromPath)
        if (!file) {
          return {
            data: null,
            error: { message: 'File not found', statusCode: '404' }
          }
        }

        this.files.set(toPath, file)
        this.files.delete(fromPath)

        return {
          data: { message: 'Successfully moved' },
          error: null
        }
      })
    }
  }

  listBuckets = jest.fn().mockImplementation(async () => {
    const buckets = Array.from(this.buckets).map(name => ({
      id: name,
      name,
      owner: '',
      public: false,
      type: 'STANDARD',
      file_size_limit: null,
      allowed_mime_types: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    return { data: buckets, error: null }
  })

  createBucket = jest.fn().mockImplementation(async (id: string, options?: any) => {
    if (this.buckets.has(id)) {
      return {
        data: null,
        error: { message: 'Bucket already exists', statusCode: '409' }
      }
    }

    this.buckets.add(id)
    return {
      data: {
        name: id,
        id,
        owner: '',
        public: options?.public || false,
        created_at: new Date().toISOString()
      },
      error: null
    }
  })

  deleteBucket = jest.fn().mockImplementation(async (id: string) => {
    if (!this.buckets.has(id)) {
      return {
        data: null,
        error: { message: 'Bucket not found', statusCode: '404' }
      }
    }

    this.buckets.delete(id)
    // Also remove all files in the bucket
    const filesToRemove = Array.from(this.files.keys())
    filesToRemove.forEach(path => this.files.delete(path))

    return {
      data: { message: 'Successfully deleted' },
      error: null
    }
  })

  // Test utilities
  clearStorage() {
    this.files.clear()
  }

  getStoredFiles() {
    return Array.from(this.files.entries())
  }

  addBucket(name: string) {
    this.buckets.add(name)
  }

  removeBucket(name: string) {
    this.buckets.delete(name)
  }
}

// Database mock implementation
export class MockSupabaseDatabase {
  private tables: Map<string, Map<string, any>> = new Map([
    ['assets', new Map()],
    ['asset_shares', new Map()],
    ['asset_annotations', new Map()],
    ['organizations', new Map()],
    ['vaults', new Map()],
    ['users', new Map()]
  ])

  from(table: string) {
    return {
      select: jest.fn().mockImplementation((columns: string = '*') => {
        return {
          eq: jest.fn().mockImplementation((column: string, value: any) => {
            return this.mockQueryBuilder(table, { [column]: value })
          }),
          neq: jest.fn().mockImplementation((column: string, value: any) => {
            return this.mockQueryBuilder(table, { [`${column}_neq`]: value })
          }),
          in: jest.fn().mockImplementation((column: string, values: any[]) => {
            return this.mockQueryBuilder(table, { [`${column}_in`]: values })
          }),
          gte: jest.fn().mockImplementation((column: string, value: any) => {
            return this.mockQueryBuilder(table, { [`${column}_gte`]: value })
          }),
          lte: jest.fn().mockImplementation((column: string, value: any) => {
            return this.mockQueryBuilder(table, { [`${column}_lte`]: value })
          }),
          like: jest.fn().mockImplementation((column: string, pattern: string) => {
            return this.mockQueryBuilder(table, { [`${column}_like`]: pattern })
          }),
          order: jest.fn().mockImplementation((column: string, options?: any) => {
            return this.mockQueryBuilder(table, { _order: { column, ...options } })
          }),
          limit: jest.fn().mockImplementation((count: number) => {
            return this.mockQueryBuilder(table, { _limit: count })
          }),
          range: jest.fn().mockImplementation((from: number, to: number) => {
            return this.mockQueryBuilder(table, { _range: { from, to } })
          }),
          single: jest.fn().mockImplementation(() => {
            return this.mockQueryBuilder(table, { _single: true })
          })
        }
      }),

      insert: jest.fn().mockImplementation((data: any) => {
        return this.mockMutationBuilder(table, 'insert', data)
      }),

      update: jest.fn().mockImplementation((data: any) => {
        return this.mockMutationBuilder(table, 'update', data)
      }),

      delete: jest.fn().mockImplementation(() => {
        return this.mockMutationBuilder(table, 'delete')
      }),

      upsert: jest.fn().mockImplementation((data: any) => {
        return this.mockMutationBuilder(table, 'upsert', data)
      })
    }
  }

  private mockQueryBuilder(table: string, filters: any = {}) {
    return {
      then: async (resolve: any) => {
        const tableData = this.tables.get(table)
        if (!tableData) {
          return resolve({ data: null, error: { message: 'Table not found' } })
        }

        let results = Array.from(tableData.values())

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (key.startsWith('_')) return // Skip meta filters

          if (key.endsWith('_neq')) {
            const column = key.replace('_neq', '')
            results = results.filter(item => item[column] !== value)
          } else if (key.endsWith('_in')) {
            const column = key.replace('_in', '')
            results = results.filter(item => (value as any[]).includes(item[column]))
          } else if (key.endsWith('_gte')) {
            const column = key.replace('_gte', '')
            results = results.filter(item => item[column] >= value)
          } else if (key.endsWith('_lte')) {
            const column = key.replace('_lte', '')
            results = results.filter(item => item[column] <= value)
          } else if (key.endsWith('_like')) {
            const column = key.replace('_like', '')
            const pattern = (value as string).replace(/%/g, '.*')
            const regex = new RegExp(pattern, 'i')
            results = results.filter(item => regex.test(item[column]))
          } else {
            results = results.filter(item => item[key] === value)
          }
        })

        // Apply ordering
        if (filters._order) {
          const { column, ascending = true } = filters._order
          results.sort((a, b) => {
            const aVal = a[column]
            const bVal = b[column]
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            return ascending ? comparison : -comparison
          })
        }

        // Apply limits
        if (filters._limit) {
          results = results.slice(0, filters._limit)
        }

        if (filters._range) {
          const { from, to } = filters._range
          results = results.slice(from, to + 1)
        }

        // Return single result if requested
        if (filters._single) {
          return resolve({
            data: results.length > 0 ? results[0] : null,
            error: results.length === 0 ? { message: 'No rows found' } : null
          })
        }

        return resolve({ data: results, error: null })
      }
    }
  }

  private mockMutationBuilder(table: string, operation: string, data?: any) {
    return {
      eq: jest.fn().mockImplementation((column: string, value: any) => {
        return {
          select: jest.fn().mockImplementation(() => {
            return this.executeMutation(table, operation, data, { [column]: value })
          }),
          then: (resolve: any) => {
            return this.executeMutation(table, operation, data, { [column]: value }).then(resolve)
          }
        }
      }),
      select: jest.fn().mockImplementation(() => {
        return this.executeMutation(table, operation, data)
      }),
      then: (resolve: any) => {
        return this.executeMutation(table, operation, data).then(resolve)
      }
    }
  }

  private async executeMutation(table: string, operation: string, data?: any, filters: any = {}) {
    const tableData = this.tables.get(table)
    if (!tableData) {
      return { data: null, error: { message: 'Table not found' } }
    }

    switch (operation) {
      case 'insert':
        const insertData = Array.isArray(data) ? data : [data]
        const insertedRows = insertData.map((row: any) => {
          const id = row.id || `${table}_${Math.random().toString(36).substr(2, 9)}`
          const newRow = {
            ...row,
            id,
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || new Date().toISOString()
          }
          tableData.set(id, newRow)
          return newRow
        })
        return { data: insertedRows, error: null }

      case 'update':
        const updateResults = []
        for (const [id, row] of tableData.entries()) {
          const matches = Object.entries(filters).every(([key, value]) => row[key] === value)
          if (matches || Object.keys(filters).length === 0) {
            const updatedRow = {
              ...row,
              ...data,
              updated_at: new Date().toISOString()
            }
            tableData.set(id, updatedRow)
            updateResults.push(updatedRow)
          }
        }
        return { data: updateResults, error: null }

      case 'delete':
        const deleteResults = []
        for (const [id, row] of tableData.entries()) {
          const matches = Object.entries(filters).every(([key, value]) => row[key] === value)
          if (matches) {
            tableData.delete(id)
            deleteResults.push(row)
          }
        }
        return { data: deleteResults, error: null }

      case 'upsert':
        // Simple upsert: update if exists, insert if not
        const upsertData = Array.isArray(data) ? data : [data]
        const upsertResults = []
        
        for (const row of upsertData) {
          const existingId = row.id
          if (existingId && tableData.has(existingId)) {
            // Update existing
            const updatedRow = {
              ...tableData.get(existingId),
              ...row,
              updated_at: new Date().toISOString()
            }
            tableData.set(existingId, updatedRow)
            upsertResults.push(updatedRow)
          } else {
            // Insert new
            const id = existingId || `${table}_${Math.random().toString(36).substr(2, 9)}`
            const newRow = {
              ...row,
              id,
              created_at: row.created_at || new Date().toISOString(),
              updated_at: row.updated_at || new Date().toISOString()
            }
            tableData.set(id, newRow)
            upsertResults.push(newRow)
          }
        }
        
        return { data: upsertResults, error: null }

      default:
        return { data: null, error: { message: `Unknown operation: ${operation}` } }
    }
  }

  // Test utilities
  seedTable(table: string, data: any[]) {
    const tableData = this.tables.get(table) || new Map()
    data.forEach(row => {
      const id = row.id || `${table}_${Math.random().toString(36).substr(2, 9)}`
      tableData.set(id, { ...row, id })
    })
    this.tables.set(table, tableData)
  }

  clearTable(table: string) {
    this.tables.set(table, new Map())
  }

  clearAllTables() {
    this.tables.forEach((tableData) => tableData.clear())
  }

  getTableData(table: string) {
    return Array.from(this.tables.get(table)?.values() || [])
  }

  getRowById(table: string, id: string) {
    return this.tables.get(table)?.get(id)
  }
}

// Main Supabase mock
export class MockSupabaseClient {
  storage: MockSupabaseStorage
  database: MockSupabaseDatabase

  constructor() {
    this.storage = new MockSupabaseStorage()
    this.database = new MockSupabaseDatabase()
  }

  from(table: string) {
    return this.database.from(table)
  }

  auth = {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' }
        }
      },
      error: null
    }),

    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: { access_token: 'mock-token' } },
      error: null
    }),

    signOut: jest.fn().mockResolvedValue({ error: null })
  }

  // Test utilities
  reset() {
    this.storage.clearStorage()
    this.database.clearAllTables()
    jest.clearAllMocks()
  }

  setupAuthFailure() {
    this.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User not authenticated' }
    })
  }

  setupDatabaseError(error: string = 'Database connection failed') {
    // Override database operations to return errors
    const originalFrom = this.database.from.bind(this.database)
    this.database.from = jest.fn().mockImplementation(() => ({
      select: () => ({ then: (resolve: any) => resolve({ data: null, error: { message: error } }) }),
      insert: () => ({ then: (resolve: any) => resolve({ data: null, error: { message: error } }) }),
      update: () => ({ then: (resolve: any) => resolve({ data: null, error: { message: error } }) }),
      delete: () => ({ then: (resolve: any) => resolve({ data: null, error: { message: error } }) })
    }))
  }

  setupStorageError(error: string = 'Storage service unavailable') {
    const mockError = { message: error, statusCode: '503' }
    this.storage.from = jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      download: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      remove: jest.fn().mockResolvedValue({ data: null, error: mockError })
    })
  }
}

// Export factory function
export function createMockSupabaseClient(): MockSupabaseClient {
  return new MockSupabaseClient()
}