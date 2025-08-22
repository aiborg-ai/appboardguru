/**
 * Advanced Mock Factory
 * Provides comprehensive mocking services for all domain entities and external dependencies
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure } from '../../lib/result'
import { testDataGenerator, EnhancedTestDataGenerator } from '../../lib/dev/test-data-generator'

export interface MockOptions {
  realistic?: boolean
  includeLatency?: boolean
  failureRate?: number
  consistentBehavior?: boolean
  seedData?: boolean
  interceptRequests?: boolean
}

export interface MockConfig {
  services: MockServiceConfig[]
  apis: MockAPIConfig[]
  database: MockDatabaseConfig
  external: MockExternalConfig[]
  realtime: MockRealtimeConfig
  storage: MockStorageConfig
}

export interface MockServiceConfig {
  name: string
  type: 'repository' | 'service' | 'controller' | 'utility'
  mock: any
  options: MockOptions
  dependencies?: string[]
}

export interface MockAPIConfig {
  baseUrl: string
  endpoints: MockEndpointConfig[]
  middleware: MockMiddleware[]
  options: MockOptions
}

export interface MockEndpointConfig {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: MockHandler
  validation?: MockValidation
  auth?: boolean
}

export interface MockHandler {
  response: (request: MockRequest) => Promise<MockResponse>
  latency?: number
  failureRate?: number
}

export interface MockRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: any
  params?: Record<string, string>
  query?: Record<string, string>
}

export interface MockResponse {
  status: number
  data?: any
  headers?: Record<string, string>
  error?: string
}

export interface MockValidation {
  schema?: any
  rules?: Array<(request: MockRequest) => boolean>
}

export interface MockMiddleware {
  name: string
  handler: (request: MockRequest, next: () => Promise<MockResponse>) => Promise<MockResponse>
}

export interface MockDatabaseConfig {
  client: MockSupabaseClient
  tables: Record<string, MockTableConfig>
  functions: Record<string, MockFunctionConfig>
  realtime: boolean
}

export interface MockTableConfig {
  name: string
  schema: any
  data: any[]
  relationships: MockRelationship[]
  policies: MockRLSPolicy[]
}

export interface MockRelationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  table: string
  foreignKey: string
  referencedKey: string
}

export interface MockRLSPolicy {
  name: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  condition: (user: any, row: any) => boolean
}

export interface MockFunctionConfig {
  name: string
  handler: (params: any) => Promise<any>
  returnType: string
}

export interface MockExternalConfig {
  name: string
  baseUrl: string
  endpoints: MockEndpointConfig[]
  auth?: MockAuthConfig
  rateLimit?: MockRateLimitConfig
}

export interface MockAuthConfig {
  type: 'bearer' | 'api-key' | 'oauth'
  credentials: Record<string, string>
}

export interface MockRateLimitConfig {
  requests: number
  window: number // milliseconds
  behavior: 'queue' | 'reject' | 'delay'
}

export interface MockRealtimeConfig {
  enabled: boolean
  channels: MockChannelConfig[]
  events: MockEventConfig[]
}

export interface MockChannelConfig {
  name: string
  events: string[]
  subscribers: MockSubscriber[]
}

export interface MockEventConfig {
  type: string
  generator: () => any
  frequency: number // milliseconds
  enabled: boolean
}

export interface MockSubscriber {
  id: string
  callback: (event: any) => void
}

export interface MockStorageConfig {
  buckets: MockBucketConfig[]
  uploadBehavior: 'success' | 'failure' | 'delay'
  downloadBehavior: 'success' | 'failure' | 'delay'
}

export interface MockBucketConfig {
  name: string
  files: MockFileConfig[]
  policies: MockStoragePolicy[]
}

export interface MockFileConfig {
  name: string
  path: string
  size: number
  type: string
  content?: Buffer | string
  metadata?: Record<string, any>
}

export interface MockStoragePolicy {
  operation: 'upload' | 'download' | 'delete'
  condition: (user: any, file: MockFileConfig) => boolean
}

export class AdvancedMockFactory {
  private mocks: Map<string, any> = new Map()
  private mockServer?: MockAPIServer
  private dataGenerator: EnhancedTestDataGenerator
  private activeMocks: Set<string> = new Set()

  constructor() {
    this.dataGenerator = testDataGenerator
  }

  /**
   * Create comprehensive mock configuration
   */
  createMockConfig(options: Partial<MockOptions> = {}): MockConfig {
    const defaultOptions: MockOptions = {
      realistic: true,
      includeLatency: true,
      failureRate: 0.05, // 5% failure rate
      consistentBehavior: true,
      seedData: true,
      interceptRequests: true,
      ...options
    }

    return {
      services: this.createServiceMocks(defaultOptions),
      apis: this.createAPIMocks(defaultOptions),
      database: this.createDatabaseMocks(defaultOptions),
      external: this.createExternalMocks(defaultOptions),
      realtime: this.createRealtimeMocks(defaultOptions),
      storage: this.createStorageMocks(defaultOptions)
    }
  }

  /**
   * Create service layer mocks
   */
  private createServiceMocks(options: MockOptions): MockServiceConfig[] {
    return [
      {
        name: 'OrganizationService',
        type: 'service',
        mock: this.createOrganizationServiceMock(options),
        options,
        dependencies: ['OrganizationRepository']
      },
      {
        name: 'UserService',
        type: 'service',
        mock: this.createUserServiceMock(options),
        options,
        dependencies: ['UserRepository']
      },
      {
        name: 'VaultService',
        type: 'service',
        mock: this.createVaultServiceMock(options),
        options,
        dependencies: ['VaultRepository', 'AssetRepository']
      },
      {
        name: 'AssetService',
        type: 'service',
        mock: this.createAssetServiceMock(options),
        options,
        dependencies: ['AssetRepository', 'StorageService']
      },
      {
        name: 'MeetingService',
        type: 'service',
        mock: this.createMeetingServiceMock(options),
        options,
        dependencies: ['MeetingRepository', 'NotificationService']
      },
      {
        name: 'NotificationService',
        type: 'service',
        mock: this.createNotificationServiceMock(options),
        options,
        dependencies: ['EmailService', 'PushService']
      },
      {
        name: 'ComplianceService',
        type: 'service',
        mock: this.createComplianceServiceMock(options),
        options,
        dependencies: ['AuditRepository']
      }
    ]
  }

  /**
   * Create API endpoint mocks
   */
  private createAPIMocks(options: MockOptions): MockAPIConfig[] {
    return [
      {
        baseUrl: '/api',
        endpoints: [
          {
            path: '/organizations',
            method: 'GET',
            handler: {
              response: async (request) => {
                const organizations = this.dataGenerator.generateOrganizations(5)
                return {
                  status: 200,
                  data: organizations
                }
              },
              latency: options.includeLatency ? 100 : 0
            }
          },
          {
            path: '/organizations',
            method: 'POST',
            handler: {
              response: async (request) => {
                const organization = this.dataGenerator.generateOrganization(request.body)
                return {
                  status: 201,
                  data: organization
                }
              },
              latency: options.includeLatency ? 200 : 0
            },
            validation: {
              rules: [
                (req) => !!req.body?.name,
                (req) => req.body?.name?.length > 0
              ]
            },
            auth: true
          },
          {
            path: '/vaults/:id/assets',
            method: 'GET',
            handler: {
              response: async (request) => {
                const assets = this.dataGenerator.generateAssets(10, {
                  vaultId: request.params?.id
                })
                return {
                  status: 200,
                  data: assets
                }
              }
            }
          },
          {
            path: '/meetings/:id/resolutions',
            method: 'POST',
            handler: {
              response: async (request) => {
                if (Math.random() < (options.failureRate || 0)) {
                  return {
                    status: 500,
                    error: 'Internal server error'
                  }
                }
                
                const resolution = this.dataGenerator.generateMeetingResolution({
                  meetingId: request.params?.id,
                  ...request.body
                })
                return {
                  status: 201,
                  data: resolution
                }
              },
              latency: options.includeLatency ? 150 : 0
            }
          }
        ],
        middleware: [
          {
            name: 'auth',
            handler: async (request, next) => {
              const authHeader = request.headers.authorization
              if (!authHeader) {
                return {
                  status: 401,
                  error: 'Authentication required'
                }
              }
              return next()
            }
          },
          {
            name: 'cors',
            handler: async (request, next) => {
              const response = await next()
              return {
                ...response,
                headers: {
                  ...response.headers,
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
              }
            }
          }
        ],
        options
      }
    ]
  }

  /**
   * Create database layer mocks
   */
  private createDatabaseMocks(options: MockOptions): MockDatabaseConfig {
    const organizations = this.dataGenerator.generateOrganizations(3)
    const users = this.dataGenerator.generateUsers(15)
    const vaults = this.dataGenerator.generateVaults(10)
    const assets = this.dataGenerator.generateAssets(50)
    const meetings = this.dataGenerator.generateMeetings(20)

    return {
      client: new MockSupabaseClient(options),
      tables: {
        organizations: {
          name: 'organizations',
          schema: {
            id: 'text',
            name: 'text',
            slug: 'text',
            description: 'text',
            created_at: 'timestamp',
            updated_at: 'timestamp'
          },
          data: organizations,
          relationships: [
            {
              type: 'one-to-many',
              table: 'users',
              foreignKey: 'organization_id',
              referencedKey: 'id'
            }
          ],
          policies: [
            {
              name: 'organization_members_only',
              operation: 'SELECT',
              condition: (user, row) => {
                return user?.organizationId === row.id ||
                       user?.role === 'admin'
              }
            }
          ]
        },
        users: {
          name: 'users',
          schema: {
            id: 'text',
            email: 'text',
            full_name: 'text',
            role: 'text',
            organization_id: 'text'
          },
          data: users,
          relationships: [],
          policies: [
            {
              name: 'users_own_data',
              operation: 'SELECT',
              condition: (user, row) => user?.id === row.id
            }
          ]
        },
        vaults: {
          name: 'vaults',
          schema: {
            id: 'text',
            name: 'text',
            description: 'text',
            organization_id: 'text',
            status: 'text'
          },
          data: vaults,
          relationships: [
            {
              type: 'many-to-many',
              table: 'assets',
              foreignKey: 'vault_id',
              referencedKey: 'id'
            }
          ],
          policies: []
        },
        assets: {
          name: 'assets',
          schema: {
            id: 'text',
            title: 'text',
            file_name: 'text',
            file_type: 'text',
            organization_id: 'text'
          },
          data: assets,
          relationships: [],
          policies: []
        },
        meetings: {
          name: 'meetings',
          schema: {
            id: 'text',
            title: 'text',
            scheduled_date: 'timestamp',
            organization_id: 'text',
            status: 'text'
          },
          data: meetings,
          relationships: [],
          policies: []
        }
      },
      functions: {
        create_test_schema: {
          name: 'create_test_schema',
          handler: async (params) => {
            return { success: true, schema: params.schema_name }
          },
          returnType: 'json'
        },
        drop_test_schema: {
          name: 'drop_test_schema',
          handler: async (params) => {
            return { success: true }
          },
          returnType: 'json'
        }
      },
      realtime: options.realistic || false
    }
  }

  /**
   * Create external service mocks
   */
  private createExternalMocks(options: MockOptions): MockExternalConfig[] {
    return [
      {
        name: 'EmailService',
        baseUrl: 'https://api.sendgrid.com',
        endpoints: [
          {
            path: '/v3/mail/send',
            method: 'POST',
            handler: {
              response: async (request) => {
                await this.simulateLatency(50)
                return {
                  status: 202,
                  data: { message: 'Email queued for delivery' }
                }
              }
            }
          }
        ],
        auth: {
          type: 'bearer',
          credentials: { token: 'mock-sendgrid-token' }
        },
        rateLimit: {
          requests: 100,
          window: 60000,
          behavior: 'delay'
        }
      },
      {
        name: 'StorageService',
        baseUrl: 'https://storage.googleapis.com',
        endpoints: [
          {
            path: '/upload/storage/v1/b/:bucket/o',
            method: 'POST',
            handler: {
              response: async (request) => {
                await this.simulateLatency(200)
                return {
                  status: 200,
                  data: {
                    name: request.body?.name || 'uploaded-file',
                    bucket: request.params?.bucket,
                    size: request.body?.size || 1024,
                    contentType: request.body?.contentType || 'application/octet-stream'
                  }
                }
              }
            }
          }
        ]
      },
      {
        name: 'CalendarService',
        baseUrl: 'https://www.googleapis.com/calendar/v3',
        endpoints: [
          {
            path: '/calendars/:calendarId/events',
            method: 'POST',
            handler: {
              response: async (request) => {
                return {
                  status: 201,
                  data: {
                    id: `event-${Date.now()}`,
                    summary: request.body?.summary,
                    start: request.body?.start,
                    end: request.body?.end,
                    attendees: request.body?.attendees
                  }
                }
              }
            }
          }
        ]
      }
    ]
  }

  /**
   * Create realtime mocks
   */
  private createRealtimeMocks(options: MockOptions): MockRealtimeConfig {
    return {
      enabled: options.realistic || false,
      channels: [
        {
          name: 'organization_updates',
          events: ['INSERT', 'UPDATE', 'DELETE'],
          subscribers: []
        },
        {
          name: 'meeting_notifications',
          events: ['meeting_started', 'meeting_ended', 'new_participant'],
          subscribers: []
        },
        {
          name: 'asset_collaboration',
          events: ['comment_added', 'annotation_created', 'document_shared'],
          subscribers: []
        }
      ],
      events: [
        {
          type: 'heartbeat',
          generator: () => ({ timestamp: new Date(), status: 'alive' }),
          frequency: 30000,
          enabled: true
        },
        {
          type: 'random_activity',
          generator: () => ({
            userId: `user-${Math.floor(Math.random() * 100)}`,
            action: ['login', 'logout', 'view_document'][Math.floor(Math.random() * 3)],
            timestamp: new Date()
          }),
          frequency: 5000,
          enabled: options.realistic || false
        }
      ]
    }
  }

  /**
   * Create storage mocks
   */
  private createStorageMocks(options: MockOptions): MockStorageConfig {
    return {
      buckets: [
        {
          name: 'documents',
          files: [
            {
              name: 'board-minutes-2024-01.pdf',
              path: '/documents/board-minutes-2024-01.pdf',
              size: 2048576,
              type: 'application/pdf',
              content: 'Mock PDF content',
              metadata: {
                uploadedBy: 'user-123',
                uploadedAt: new Date().toISOString()
              }
            }
          ],
          policies: [
            {
              operation: 'download',
              condition: (user, file) => {
                return user?.role === 'admin' || 
                       file.metadata?.uploadedBy === user?.id
              }
            }
          ]
        },
        {
          name: 'avatars',
          files: [],
          policies: [
            {
              operation: 'upload',
              condition: (user, file) => user?.id !== undefined
            }
          ]
        }
      ],
      uploadBehavior: options.failureRate && options.failureRate > 0 ? 'delay' : 'success',
      downloadBehavior: 'success'
    }
  }

  /**
   * Service mock implementations
   */
  private createOrganizationServiceMock(options: MockOptions): any {
    return {
      async findAll() {
        await this.simulateLatency(100)
        return success(this.dataGenerator.generateOrganizations(5))
      },
      async findById(id: string) {
        await this.simulateLatency(50)
        if (Math.random() < (options.failureRate || 0)) {
          return failure(new Error('Organization not found'))
        }
        return success(this.dataGenerator.generateOrganization({ id }))
      },
      async create(data: any) {
        await this.simulateLatency(150)
        return success(this.dataGenerator.generateOrganization(data))
      },
      async update(id: string, data: any) {
        await this.simulateLatency(100)
        return success(this.dataGenerator.generateOrganization({ id, ...data }))
      },
      async delete(id: string) {
        await this.simulateLatency(75)
        return success(undefined)
      }
    }
  }

  private createUserServiceMock(options: MockOptions): any {
    return {
      async findByOrganization(organizationId: string) {
        await this.simulateLatency(80)
        return success(this.dataGenerator.generateUsers(8, { organizationId }))
      },
      async inviteUser(email: string, organizationId: string, role: string) {
        await this.simulateLatency(200)
        return success({
          email,
          organizationId,
          role,
          invitationId: `inv-${Date.now()}`,
          sentAt: new Date()
        })
      },
      async updateRole(userId: string, role: string) {
        await this.simulateLatency(100)
        return success({ userId, role, updatedAt: new Date() })
      }
    }
  }

  private createVaultServiceMock(options: MockOptions): any {
    return {
      async findByOrganization(organizationId: string) {
        await this.simulateLatency(120)
        return success(this.dataGenerator.generateVaults(6, { organizationId }))
      },
      async create(data: any) {
        await this.simulateLatency(180)
        return success(this.dataGenerator.generateVault(data))
      },
      async addAsset(vaultId: string, assetId: string) {
        await this.simulateLatency(90)
        return success({ vaultId, assetId, addedAt: new Date() })
      },
      async shareVault(vaultId: string, userIds: string[]) {
        await this.simulateLatency(110)
        return success({
          vaultId,
          sharedWith: userIds,
          sharedAt: new Date()
        })
      }
    }
  }

  private createAssetServiceMock(options: MockOptions): any {
    return {
      async upload(file: any, metadata: any) {
        await this.simulateLatency(300)
        if (Math.random() < (options.failureRate || 0)) {
          return failure(new Error('Upload failed'))
        }
        return success(this.dataGenerator.generateAsset({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          ...metadata
        }))
      },
      async findByVault(vaultId: string) {
        await this.simulateLatency(100)
        return success(this.dataGenerator.generateAssets(12, { vaultId }))
      },
      async createAnnotation(assetId: string, annotation: any) {
        await this.simulateLatency(80)
        return success({
          id: `annotation-${Date.now()}`,
          assetId,
          ...annotation,
          createdAt: new Date()
        })
      }
    }
  }

  private createMeetingServiceMock(options: MockOptions): any {
    return {
      async findUpcoming(organizationId: string) {
        await this.simulateLatency(90)
        return success(this.dataGenerator.generateMeetings(4, {
          organizationId,
          upcoming: true
        }))
      },
      async create(data: any) {
        await this.simulateLatency(200)
        const meeting = this.dataGenerator.generateMeeting(data)
        
        // Simulate sending invitations
        setTimeout(() => {
          this.triggerRealtimeEvent('meeting_notifications', {
            type: 'meeting_created',
            meetingId: meeting.id,
            invitees: data.invitees
          })
        }, 1000)
        
        return success(meeting)
      },
      async addResolution(meetingId: string, resolution: any) {
        await this.simulateLatency(120)
        return success(this.dataGenerator.generateMeetingResolution({
          meetingId,
          ...resolution
        }))
      }
    }
  }

  private createNotificationServiceMock(options: MockOptions): any {
    return {
      async send(notification: any) {
        await this.simulateLatency(150)
        if (Math.random() < (options.failureRate || 0)) {
          return failure(new Error('Notification delivery failed'))
        }
        return success({
          id: `notification-${Date.now()}`,
          ...notification,
          sentAt: new Date(),
          status: 'delivered'
        })
      },
      async getForUser(userId: string) {
        await this.simulateLatency(70)
        return success(this.dataGenerator.generateNotifications(8, { userId }))
      },
      async markAsRead(notificationId: string) {
        await this.simulateLatency(50)
        return success({ notificationId, readAt: new Date() })
      }
    }
  }

  private createComplianceServiceMock(options: MockOptions): any {
    return {
      async generateAuditReport(organizationId: string, dateRange: any) {
        await this.simulateLatency(500) // Longer latency for complex operations
        return success({
          reportId: `audit-${Date.now()}`,
          organizationId,
          dateRange,
          events: this.dataGenerator.generateAuditEvents(100),
          generatedAt: new Date(),
          complianceScore: Math.floor(Math.random() * 20) + 80 // 80-100
        })
      },
      async checkGDPRCompliance(userId: string) {
        await this.simulateLatency(200)
        return success({
          userId,
          compliant: Math.random() > 0.1, // 90% compliant
          issues: Math.random() > 0.7 ? [] : ['missing_consent', 'data_retention']
        })
      }
    }
  }

  /**
   * Initialize all mocks
   */
  async initializeMocks(config: MockConfig): Promise<Result<void>> {
    try {
      // Initialize service mocks
      for (const serviceConfig of config.services) {
        this.mocks.set(serviceConfig.name, serviceConfig.mock)
        this.activeMocks.add(serviceConfig.name)
      }
      
      // Initialize API server
      this.mockServer = new MockAPIServer(config.apis)
      await this.mockServer.start()
      
      // Initialize realtime events
      if (config.realtime.enabled) {
        this.startRealtimeEvents(config.realtime)
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Mock initialization failed'))
    }
  }

  /**
   * Clean up all mocks
   */
  async cleanup(): Promise<Result<void>> {
    try {
      // Stop mock server
      if (this.mockServer) {
        await this.mockServer.stop()
      }
      
      // Clear all mocks
      this.mocks.clear()
      this.activeMocks.clear()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Mock cleanup failed'))
    }
  }

  /**
   * Get mock by name
   */
  getMock(name: string): any {
    return this.mocks.get(name)
  }

  /**
   * Check if mock is active
   */
  isMockActive(name: string): boolean {
    return this.activeMocks.has(name)
  }

  /**
   * Trigger realtime event
   */
  private triggerRealtimeEvent(channel: string, event: any): void {
    // Implementation would trigger actual realtime events
    console.log(`[MOCK] Realtime event on ${channel}:`, event)
  }

  /**
   * Start realtime event simulation
   */
  private startRealtimeEvents(config: MockRealtimeConfig): void {
    for (const event of config.events) {
      if (event.enabled) {
        setInterval(() => {
          const eventData = event.generator()
          this.triggerRealtimeEvent('global', {
            type: event.type,
            data: eventData
          })
        }, event.frequency)
      }
    }
  }

  /**
   * Simulate network latency
   */
  private async simulateLatency(ms: number): Promise<void> {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}

/**
 * Mock Supabase Client
 */
export class MockSupabaseClient {
  private tables: Map<string, MockTableConfig> = new Map()
  private functions: Map<string, MockFunctionConfig> = new Map()
  private options: MockOptions

  constructor(options: MockOptions) {
    this.options = options
  }

  from(table: string) {
    return new MockQueryBuilder(table, this.tables.get(table), this.options)
  }

  rpc(functionName: string, params?: any) {
    const func = this.functions.get(functionName)
    if (func) {
      return func.handler(params)
    }
    throw new Error(`Function ${functionName} not found`)
  }

  auth = {
    getUser: async () => {
      return {
        data: {
          user: {
            id: 'mock-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      }
    }
  }

  storage = {
    from: (bucket: string) => {
      return {
        upload: async (path: string, file: any) => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return {
            data: { path, size: file.size },
            error: null
          }
        },
        download: async (path: string) => {
          return {
            data: new Blob(['mock file content']),
            error: null
          }
        }
      }
    }
  }
}

/**
 * Mock Query Builder
 */
export class MockQueryBuilder {
  private table: string
  private tableConfig?: MockTableConfig
  private options: MockOptions
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private selectColumns: string[] = ['*']
  private limitValue?: number
  private offsetValue?: number
  private orderBy?: { column: string; ascending: boolean }

  constructor(table: string, tableConfig: MockTableConfig | undefined, options: MockOptions) {
    this.table = table
    this.tableConfig = tableConfig
    this.options = options
  }

  select(columns?: string) {
    if (columns) {
      this.selectColumns = columns.split(',').map(c => c.trim())
    }
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values })
    return this
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: 'like', value: pattern })
    return this
  }

  limit(count: number) {
    this.limitValue = count
    return this
  }

  range(from: number, to: number) {
    this.offsetValue = from
    this.limitValue = to - from + 1
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = {
      column,
      ascending: options?.ascending !== false
    }
    return this
  }

  async insert(data: any) {
    await this.simulateLatency()
    
    if (Math.random() < (this.options.failureRate || 0)) {
      return { data: null, error: new Error('Insert failed') }
    }
    
    const insertedData = Array.isArray(data) ? data : [data]
    return { data: insertedData, error: null }
  }

  async update(data: any) {
    await this.simulateLatency()
    return { data: [data], error: null }
  }

  async delete() {
    await this.simulateLatency()
    return { data: null, error: null }
  }

  async single() {
    const result = await this.execute()
    if (result.data && result.data.length > 0) {
      return { data: result.data[0], error: null }
    }
    return { data: null, error: new Error('No rows found') }
  }

  private async execute() {
    await this.simulateLatency()
    
    if (!this.tableConfig) {
      return { data: [], error: new Error(`Table ${this.table} not found`) }
    }
    
    let data = [...this.tableConfig.data]
    
    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(row => this.applyFilter(row, filter))
    }
    
    // Apply ordering
    if (this.orderBy) {
      data.sort((a, b) => {
        const aVal = a[this.orderBy!.column]
        const bVal = b[this.orderBy!.column]
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return this.orderBy!.ascending ? comparison : -comparison
      })
    }
    
    // Apply pagination
    if (this.offsetValue !== undefined) {
      data = data.slice(this.offsetValue)
    }
    if (this.limitValue !== undefined) {
      data = data.slice(0, this.limitValue)
    }
    
    // Apply column selection
    if (!this.selectColumns.includes('*')) {
      data = data.map(row => {
        const selected: any = {}
        for (const col of this.selectColumns) {
          if (row[col] !== undefined) {
            selected[col] = row[col]
          }
        }
        return selected
      })
    }
    
    return { data, error: null }
  }

  private applyFilter(row: any, filter: { column: string; operator: string; value: any }): boolean {
    const rowValue = row[filter.column]
    
    switch (filter.operator) {
      case 'eq':
        return rowValue === filter.value
      case 'neq':
        return rowValue !== filter.value
      case 'in':
        return filter.value.includes(rowValue)
      case 'like':
        return String(rowValue).includes(filter.value.replace(/%/g, ''))
      default:
        return true
    }
  }

  private async simulateLatency(): Promise<void> {
    if (this.options.includeLatency) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
    }
  }
}

/**
 * Mock API Server
 */
export class MockAPIServer {
  private configs: MockAPIConfig[]
  private server?: any

  constructor(configs: MockAPIConfig[]) {
    this.configs = configs
  }

  async start(): Promise<void> {
    // Implementation would start actual HTTP server
    console.log('[MOCK] API Server started')
  }

  async stop(): Promise<void> {
    // Implementation would stop HTTP server
    console.log('[MOCK] API Server stopped')
  }
}

// Export singleton instance
export const mockFactory = new AdvancedMockFactory()

// Export convenience functions
export function createMockConfiguration(options?: Partial<MockOptions>): MockConfig {
  return mockFactory.createMockConfig(options)
}

export async function initializeTestMocks(options?: Partial<MockOptions>): Promise<Result<void>> {
  const config = createMockConfiguration(options)
  return mockFactory.initializeMocks(config)
}

export async function cleanupTestMocks(): Promise<Result<void>> {
  return mockFactory.cleanup()
}