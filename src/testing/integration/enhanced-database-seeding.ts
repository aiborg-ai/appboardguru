/**
 * Enhanced Database Seeding System
 * Provides comprehensive test data seeding with transaction support and cleanup
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure } from '../../lib/result'
import { testDataGenerator, EnhancedTestDataGenerator } from '../../lib/dev/test-data-generator'
import { generateCompleteTestDataset } from '../../lib/test-utils/sample-data-generators'
import { TransactionCoordinator } from '../../lib/repositories/transaction-coordinator'
import type { GeneratedUser, GeneratedOrganization, GeneratedAsset, GeneratedVault, GeneratedMeeting } from '../../lib/dev/test-data-generator'

export interface SeedingOptions {
  organizationCount?: number
  usersPerOrg?: number
  vaultsPerOrg?: number
  assetsPerVault?: number
  meetingsPerOrg?: number
  includeAnomalies?: boolean
  includeSeasonalData?: boolean
  seed?: number
  isolation?: 'none' | 'transaction' | 'schema'
  cleanup?: boolean
  retainOnFailure?: boolean
}

export interface SeededData {
  organizations: GeneratedOrganization[]
  users: GeneratedUser[]
  vaults: GeneratedVault[]
  assets: GeneratedAsset[]
  meetings: GeneratedMeeting[]
  metadata: SeedingMetadata
}

export interface SeedingMetadata {
  seedId: string
  timestamp: Date
  options: SeedingOptions
  statistics: {
    totalRecords: number
    recordsByTable: Record<string, number>
    seedingTime: number
    memoryUsage: NodeJS.MemoryUsage
  }
  cleanupInfo: {
    createdTables: string[]
    createdRecords: Array<{ table: string; id: string }>
    cleanupFunctions: Array<() => Promise<void>>
  }
}

export interface SeedingResult {
  success: boolean
  data?: SeededData
  error?: Error
  seedId: string
  duration: number
}

export class EnhancedDatabaseSeeder {
  private supabase: SupabaseClient<Database>
  private transactionCoordinator?: TransactionCoordinator
  private dataGenerator: EnhancedTestDataGenerator
  private activeSeedsRegistry: Map<string, SeedingMetadata> = new Map()

  constructor(
    supabase: SupabaseClient<Database>,
    transactionCoordinator?: TransactionCoordinator
  ) {
    this.supabase = supabase
    this.transactionCoordinator = transactionCoordinator
    this.dataGenerator = testDataGenerator
  }

  /**
   * Seed database with comprehensive test data
   */
  async seedDatabase(options: SeedingOptions = {}): Promise<Result<SeededData>> {
    const seedId = this.generateSeedId()
    const startTime = Date.now()
    const startMemory = process.memoryUsage()

    const defaultOptions: SeedingOptions = {
      organizationCount: 2,
      usersPerOrg: 5,
      vaultsPerOrg: 3,
      assetsPerVault: 10,
      meetingsPerOrg: 4,
      includeAnomalies: false,
      includeSeasonalData: true,
      isolation: 'transaction',
      cleanup: true,
      retainOnFailure: true,
      ...options
    }

    try {
      // Create seed metadata
      const metadata: SeedingMetadata = {
        seedId,
        timestamp: new Date(),
        options: defaultOptions,
        statistics: {
          totalRecords: 0,
          recordsByTable: {},
          seedingTime: 0,
          memoryUsage: startMemory
        },
        cleanupInfo: {
          createdTables: [],
          createdRecords: [],
          cleanupFunctions: []
        }
      }

      this.activeSeedsRegistry.set(seedId, metadata)

      // Generate test data
      const dataset = this.dataGenerator.generateCompleteDataset({
        organizations: defaultOptions.organizationCount!,
        usersPerOrg: defaultOptions.usersPerOrg!,
        vaultsPerOrg: defaultOptions.vaultsPerOrg!,
        assetsPerVault: defaultOptions.assetsPerVault!,
        meetingsPerOrg: defaultOptions.meetingsPerOrg!,
        activitiesPerUser: 20
      })

      // Apply isolation if needed
      if (defaultOptions.isolation === 'schema') {
        await this.createIsolatedSchema(seedId)
      }

      // Seed data with transaction support
      let seededData: SeededData
      if (defaultOptions.isolation === 'transaction' && this.transactionCoordinator) {
        seededData = await this.seedWithTransaction(dataset, metadata)
      } else {
        seededData = await this.seedWithoutTransaction(dataset, metadata)
      }

      // Update statistics
      const endTime = Date.now()
      metadata.statistics.seedingTime = endTime - startTime
      metadata.statistics.memoryUsage = process.memoryUsage()
      metadata.statistics.totalRecords = this.calculateTotalRecords(seededData)
      metadata.statistics.recordsByTable = this.calculateRecordsByTable(seededData)

      return success(seededData)

    } catch (error) {
      if (defaultOptions.retainOnFailure) {
        // Keep partial data for debugging
        console.warn(`Seeding failed for ${seedId}, retaining partial data for debugging`)
      } else {
        await this.cleanup(seedId)
      }
      
      return failure(error instanceof Error ? error : new Error('Unknown seeding error'))
    }
  }

  /**
   * Seed data within a transaction for ACID compliance
   */
  private async seedWithTransaction(
    dataset: ReturnType<EnhancedTestDataGenerator['generateCompleteDataset']>,
    metadata: SeedingMetadata
  ): Promise<SeededData> {
    if (!this.transactionCoordinator) {
      throw new Error('Transaction coordinator required for transactional seeding')
    }

    const beginResult = await this.transactionCoordinator.begin({
      mode: 'SINGLE_DOMAIN',
      timeout: 300000, // 5 minutes
      enableMetrics: true
    })

    if (!beginResult.success) {
      throw new Error(`Failed to begin transaction: ${beginResult.error.message}`)
    }

    const transactionId = beginResult.data.id

    try {
      // Seed organizations first
      const organizations = await this.seedOrganizations(dataset.organizations, metadata)
      
      // Seed users for each organization
      const users = await this.seedUsers(dataset.users, metadata)
      
      // Seed vaults
      const vaults = await this.seedVaults(dataset.vaults, metadata)
      
      // Seed assets
      const assets = await this.seedAssets(dataset.assets, metadata)
      
      // Seed meetings
      const meetings = await this.seedMeetings(dataset.meetings, metadata)

      // Commit transaction
      const commitResult = await this.transactionCoordinator.commit(transactionId)
      if (!commitResult.success) {
        throw new Error(`Failed to commit transaction: ${commitResult.error.message}`)
      }

      return {
        organizations,
        users,
        vaults,
        assets,
        meetings,
        metadata
      }

    } catch (error) {
      await this.transactionCoordinator.rollback(transactionId, 'Seeding failed')
      throw error
    }
  }

  /**
   * Seed data without transaction (fallback)
   */
  private async seedWithoutTransaction(
    dataset: ReturnType<EnhancedTestDataGenerator['generateCompleteDataset']>,
    metadata: SeedingMetadata
  ): Promise<SeededData> {
    // Seed in dependency order
    const organizations = await this.seedOrganizations(dataset.organizations, metadata)
    const users = await this.seedUsers(dataset.users, metadata)
    const vaults = await this.seedVaults(dataset.vaults, metadata)
    const assets = await this.seedAssets(dataset.assets, metadata)
    const meetings = await this.seedMeetings(dataset.meetings, metadata)

    return {
      organizations,
      users,
      vaults,
      assets,
      meetings,
      metadata
    }
  }

  /**
   * Seed organizations table
   */
  private async seedOrganizations(
    organizations: GeneratedOrganization[],
    metadata: SeedingMetadata
  ): Promise<GeneratedOrganization[]> {
    const results: GeneratedOrganization[] = []

    for (const org of organizations) {
      const { data, error } = await this.supabase
        .from('organizations')
        .insert({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          industry: org.industry,
          size: org.size,
          settings: org.settings,
          created_at: org.createdAt.toISOString(),
          updated_at: org.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to seed organization ${org.id}: ${error.message}`)
      }

      metadata.cleanupInfo.createdRecords.push({
        table: 'organizations',
        id: org.id
      })

      results.push(org)
    }

    metadata.statistics.recordsByTable['organizations'] = results.length
    return results
  }

  /**
   * Seed users table
   */
  private async seedUsers(
    users: GeneratedUser[],
    metadata: SeedingMetadata
  ): Promise<GeneratedUser[]> {
    const results: GeneratedUser[] = []

    for (const user of users) {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          avatar_url: user.avatarUrl,
          preferences: user.preferences,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to seed user ${user.id}: ${error.message}`)
      }

      // Create organization membership
      if (user.organizationId) {
        await this.supabase
          .from('organization_members')
          .insert({
            organization_id: user.organizationId,
            user_id: user.id,
            role: user.role,
            status: 'active',
            joined_at: user.createdAt.toISOString()
          })
      }

      metadata.cleanupInfo.createdRecords.push(
        { table: 'users', id: user.id },
        { table: 'organization_members', id: `${user.organizationId}-${user.id}` }
      )

      results.push(user)
    }

    metadata.statistics.recordsByTable['users'] = results.length
    return results
  }

  /**
   * Seed vaults table
   */
  private async seedVaults(
    vaults: GeneratedVault[],
    metadata: SeedingMetadata
  ): Promise<GeneratedVault[]> {
    const results: GeneratedVault[] = []

    for (const vault of vaults) {
      const { data, error } = await this.supabase
        .from('vaults')
        .insert({
          id: vault.id,
          name: vault.name,
          description: vault.description,
          organization_id: vault.organizationId,
          status: vault.status,
          priority: vault.priority,
          meeting_date: vault.meetingDate?.toISOString(),
          created_by: vault.createdBy,
          created_at: vault.createdAt.toISOString(),
          updated_at: vault.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to seed vault ${vault.id}: ${error.message}`)
      }

      metadata.cleanupInfo.createdRecords.push({
        table: 'vaults',
        id: vault.id
      })

      results.push(vault)
    }

    metadata.statistics.recordsByTable['vaults'] = results.length
    return results
  }

  /**
   * Seed assets table
   */
  private async seedAssets(
    assets: GeneratedAsset[],
    metadata: SeedingMetadata
  ): Promise<GeneratedAsset[]> {
    const results: GeneratedAsset[] = []

    for (const asset of assets) {
      const { data, error } = await this.supabase
        .from('assets')
        .insert({
          id: asset.id,
          title: asset.title,
          file_name: asset.fileName,
          file_type: asset.fileType,
          file_size: asset.fileSize,
          description: asset.description,
          category: asset.category,
          organization_id: asset.organizationId,
          uploaded_by: asset.uploadedBy,
          processing_status: asset.processingStatus,
          created_at: asset.createdAt.toISOString(),
          updated_at: asset.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to seed asset ${asset.id}: ${error.message}`)
      }

      // Link assets to vaults
      for (const vaultId of asset.vaultIds) {
        await this.supabase
          .from('vault_assets')
          .insert({
            vault_id: vaultId,
            asset_id: asset.id,
            added_at: asset.createdAt.toISOString()
          })
      }

      metadata.cleanupInfo.createdRecords.push(
        { table: 'assets', id: asset.id },
        ...asset.vaultIds.map(vaultId => ({
          table: 'vault_assets',
          id: `${vaultId}-${asset.id}`
        }))
      )

      results.push(asset)
    }

    metadata.statistics.recordsByTable['assets'] = results.length
    return results
  }

  /**
   * Seed meetings table
   */
  private async seedMeetings(
    meetings: GeneratedMeeting[],
    metadata: SeedingMetadata
  ): Promise<GeneratedMeeting[]> {
    const results: GeneratedMeeting[] = []

    for (const meeting of meetings) {
      const { data, error } = await this.supabase
        .from('meetings')
        .insert({
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          type: meeting.type,
          scheduled_date: meeting.scheduledDate.toISOString(),
          duration_minutes: meeting.durationMinutes,
          organization_id: meeting.organizationId,
          created_by: meeting.createdBy,
          status: meeting.status,
          created_at: meeting.createdAt.toISOString(),
          updated_at: meeting.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to seed meeting ${meeting.id}: ${error.message}`)
      }

      // Create meeting invitations
      for (const inviteeId of meeting.invitees) {
        await this.supabase
          .from('meeting_invitations')
          .insert({
            meeting_id: meeting.id,
            user_id: inviteeId,
            status: 'pending',
            sent_at: meeting.createdAt.toISOString()
          })
      }

      // Create meeting resolutions
      for (const resolution of meeting.resolutions) {
        await this.supabase
          .from('meeting_resolutions')
          .insert({
            id: resolution.id,
            meeting_id: meeting.id,
            title: resolution.title,
            description: resolution.description,
            type: resolution.type,
            status: resolution.status,
            created_at: resolution.createdAt.toISOString()
          })
      }

      metadata.cleanupInfo.createdRecords.push(
        { table: 'meetings', id: meeting.id },
        ...meeting.invitees.map(inviteeId => ({
          table: 'meeting_invitations',
          id: `${meeting.id}-${inviteeId}`
        })),
        ...meeting.resolutions.map(resolution => ({
          table: 'meeting_resolutions',
          id: resolution.id
        }))
      )

      results.push(meeting)
    }

    metadata.statistics.recordsByTable['meetings'] = results.length
    return results
  }

  /**
   * Create isolated schema for test isolation
   */
  private async createIsolatedSchema(seedId: string): Promise<void> {
    const schemaName = `test_${seedId.replace(/-/g, '_')}`
    
    await this.supabase.rpc('create_test_schema', {
      schema_name: schemaName
    })

    // Switch to isolated schema
    await this.supabase.rpc('set_search_path', {
      path: schemaName
    })
  }

  /**
   * Clean up seeded data
   */
  async cleanup(seedId?: string): Promise<Result<void>> {
    try {
      if (seedId) {
        const metadata = this.activeSeedsRegistry.get(seedId)
        if (metadata) {
          await this.cleanupSeed(metadata)
          this.activeSeedsRegistry.delete(seedId)
        }
      } else {
        // Clean up all active seeds
        for (const [id, metadata] of this.activeSeedsRegistry) {
          await this.cleanupSeed(metadata)
        }
        this.activeSeedsRegistry.clear()
      }

      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Cleanup failed'))
    }
  }

  /**
   * Clean up specific seed
   */
  private async cleanupSeed(metadata: SeedingMetadata): Promise<void> {
    // Execute custom cleanup functions first
    for (const cleanupFn of metadata.cleanupInfo.cleanupFunctions) {
      try {
        await cleanupFn()
      } catch (error) {
        console.warn('Cleanup function failed:', error)
      }
    }

    // Delete records in reverse dependency order
    const tablePriority = {
      'meeting_resolutions': 1,
      'meeting_invitations': 2,
      'vault_assets': 3,
      'organization_members': 4,
      'meetings': 5,
      'assets': 6,
      'vaults': 7,
      'users': 8,
      'organizations': 9
    }

    const recordsByTable = new Map<string, string[]>()
    for (const record of metadata.cleanupInfo.createdRecords) {
      if (!recordsByTable.has(record.table)) {
        recordsByTable.set(record.table, [])
      }
      recordsByTable.get(record.table)!.push(record.id)
    }

    // Sort tables by cleanup priority
    const sortedTables = Array.from(recordsByTable.keys()).sort(
      (a, b) => (tablePriority[a as keyof typeof tablePriority] || 999) - 
                (tablePriority[b as keyof typeof tablePriority] || 999)
    )

    for (const table of sortedTables) {
      const ids = recordsByTable.get(table)!
      try {
        await this.supabase
          .from(table as any)
          .delete()
          .in('id', ids)
      } catch (error) {
        console.warn(`Failed to cleanup table ${table}:`, error)
      }
    }

    // Drop isolated schema if created
    if (metadata.options.isolation === 'schema') {
      const schemaName = `test_${metadata.seedId.replace(/-/g, '_')}`
      try {
        await this.supabase.rpc('drop_test_schema', {
          schema_name: schemaName
        })
      } catch (error) {
        console.warn(`Failed to drop schema ${schemaName}:`, error)
      }
    }
  }

  /**
   * Get seeding statistics
   */
  getSeedingStatistics(seedId?: string): SeedingMetadata[] {
    if (seedId) {
      const metadata = this.activeSeedsRegistry.get(seedId)
      return metadata ? [metadata] : []
    }
    return Array.from(this.activeSeedsRegistry.values())
  }

  /**
   * Create realistic board governance scenario
   */
  async seedBoardGovernanceScenario(options: Partial<SeedingOptions> = {}): Promise<Result<SeededData>> {
    return this.seedDatabase({
      organizationCount: 1,
      usersPerOrg: 8, // CEO, Directors, Secretary, etc.
      vaultsPerOrg: 3, // Board Pack, Compliance, Strategic
      assetsPerVault: 15, // Financial reports, policies, minutes
      meetingsPerOrg: 6, // Quarterly + special meetings
      includeAnomalies: false,
      includeSeasonalData: true,
      ...options
    })
  }

  /**
   * Create asset collaboration scenario
   */
  async seedAssetCollaborationScenario(options: Partial<SeedingOptions> = {}): Promise<Result<SeededData>> {
    return this.seedDatabase({
      organizationCount: 2,
      usersPerOrg: 5,
      vaultsPerOrg: 2,
      assetsPerVault: 20, // Heavy focus on documents
      meetingsPerOrg: 3,
      includeAnomalies: false,
      includeSeasonalData: false,
      ...options
    })
  }

  /**
   * Create compliance audit scenario
   */
  async seedComplianceAuditScenario(options: Partial<SeedingOptions> = {}): Promise<Result<SeededData>> {
    return this.seedDatabase({
      organizationCount: 1,
      usersPerOrg: 6,
      vaultsPerOrg: 4, // Multiple compliance areas
      assetsPerVault: 12,
      meetingsPerOrg: 4,
      includeAnomalies: true, // Include suspicious activities
      includeSeasonalData: true,
      ...options
    })
  }

  /**
   * Utility methods
   */
  private generateSeedId(): string {
    return `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateTotalRecords(data: SeededData): number {
    return data.organizations.length +
           data.users.length +
           data.vaults.length +
           data.assets.length +
           data.meetings.length
  }

  private calculateRecordsByTable(data: SeededData): Record<string, number> {
    return {
      organizations: data.organizations.length,
      users: data.users.length,
      vaults: data.vaults.length,
      assets: data.assets.length,
      meetings: data.meetings.length
    }
  }
}

// Export singleton instance for convenience
export const databaseSeeder = new EnhancedDatabaseSeeder(
  // Will be initialized with actual client in test setup
  {} as SupabaseClient<Database>
)

// Export factory function for custom configurations
export function createDatabaseSeeder(
  supabase: SupabaseClient<Database>,
  transactionCoordinator?: TransactionCoordinator
): EnhancedDatabaseSeeder {
  return new EnhancedDatabaseSeeder(supabase, transactionCoordinator)
}

// Export convenient seeding functions
export async function seedTestData(
  supabase: SupabaseClient<Database>,
  options?: SeedingOptions
): Promise<Result<SeededData>> {
  const seeder = new EnhancedDatabaseSeeder(supabase)
  return seeder.seedDatabase(options)
}

export async function seedBoardGovernanceData(
  supabase: SupabaseClient<Database>,
  options?: Partial<SeedingOptions>
): Promise<Result<SeededData>> {
  const seeder = new EnhancedDatabaseSeeder(supabase)
  return seeder.seedBoardGovernanceScenario(options)
}

export async function cleanupTestData(
  supabase: SupabaseClient<Database>,
  seedId?: string
): Promise<Result<void>> {
  const seeder = new EnhancedDatabaseSeeder(supabase)
  return seeder.cleanup(seedId)
}