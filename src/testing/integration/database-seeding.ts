/**
 * Database Seeding for Integration Tests
 * Realistic governance data seeding with relationship integrity and isolation
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, Ok, Err } from '../../lib/result'
import { EnhancedTestDataGenerator, createTestDataGenerator, generateMockDataset } from '../../lib/dev/test-data-generator'
import { generateCompleteTestDataset } from '../../lib/test-utils/sample-data-generators'
import type { AppError } from '../../lib/result/types'

export interface SeedConfiguration {
  organizations: number
  usersPerOrg: number
  vaultsPerOrg: number
  assetsPerVault: number
  meetingsPerOrg: number
  activitiesPerUser: number
  includeAnomalies?: boolean
  includeSeasonalPatterns?: boolean
  seed?: number
  cleanupOnFailure?: boolean
  validateRelationships?: boolean
}

export interface SeedResult {
  seedId: string
  organizationIds: string[]
  userIds: string[]
  vaultIds: string[]
  assetIds: string[]
  meetingIds: string[]
  activityIds: string[]
  executionTime: number
  recordsCreated: number
  relationships: SeedRelationshipMap
}

export interface SeedRelationshipMap {
  organizationMembers: Array<{ organizationId: string; userId: string; role: string }>
  vaultMembers: Array<{ vaultId: string; userId: string; role: string }>
  assetPermissions: Array<{ assetId: string; userId: string; permission: string }>
  meetingAttendees: Array<{ meetingId: string; userId: string; status: string }>
  boardStructures: Array<{ organizationId: string; chairpersonId: string; members: string[] }>
}

export interface SeedCleanupInfo {
  seedId: string
  tables: string[]
  recordCounts: Record<string, number>
  cleanupOrder: string[]
  dependencies: Record<string, string[]>
}

export class DatabaseSeeder {
  private supabase: SupabaseClient<Database>
  private dataGenerator: EnhancedTestDataGenerator
  private activeSeedIds: Set<string> = new Set()

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.dataGenerator = createTestDataGenerator({ realisticPatterns: true })
  }

  /**
   * Seed database with realistic governance data
   */
  async seedDatabase(config: SeedConfiguration): Promise<Result<SeedResult, AppError>> {
    const seedId = `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      this.activeSeedIds.add(seedId)

      // Generate test data
      const dataset = this.dataGenerator.generateCompleteDataset({
        organizations: config.organizations,
        usersPerOrg: config.usersPerOrg,
        vaultsPerOrg: config.vaultsPerOrg,
        assetsPerVault: config.assetsPerVault,
        meetingsPerOrg: config.meetingsPerOrg,
        activitiesPerUser: config.activitiesPerUser
      })

      // Start database transaction
      const { data: transactionData, error: transactionError } = await this.supabase
        .rpc('begin_seed_transaction', { seed_id: seedId })

      if (transactionError) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to start seed transaction: ${transactionError.message}`,
          timestamp: new Date(),
          cause: transactionError
        })
      }

      const relationships: SeedRelationshipMap = {
        organizationMembers: [],
        vaultMembers: [],
        assetPermissions: [],
        meetingAttendees: [],
        boardStructures: []
      }

      // Seed organizations
      const organizationIds = await this.seedOrganizations(seedId, dataset.organizations, relationships)
      if (!organizationIds.success) {
        await this.rollbackSeed(seedId)
        return organizationIds
      }

      // Seed users and organization memberships
      const userIds = await this.seedUsers(seedId, dataset.users, relationships)
      if (!userIds.success) {
        await this.rollbackSeed(seedId)
        return userIds
      }

      // Seed vaults
      const vaultIds = await this.seedVaults(seedId, dataset.vaults, relationships)
      if (!vaultIds.success) {
        await this.rollbackSeed(seedId)
        return vaultIds
      }

      // Seed assets
      const assetIds = await this.seedAssets(seedId, dataset.assets, relationships)
      if (!assetIds.success) {
        await this.rollbackSeed(seedId)
        return assetIds
      }

      // Seed meetings
      const meetingIds = await this.seedMeetings(seedId, dataset.meetings, relationships)
      if (!meetingIds.success) {
        await this.rollbackSeed(seedId)
        return meetingIds
      }

      // Seed activities
      const activityIds = await this.seedActivities(seedId, dataset.activities)
      if (!activityIds.success) {
        await this.rollbackSeed(seedId)
        return activityIds
      }

      // Validate relationships if requested
      if (config.validateRelationships) {
        const validationResult = await this.validateSeedRelationships(relationships)
        if (!validationResult.success) {
          await this.rollbackSeed(seedId)
          return validationResult
        }
      }

      // Commit transaction
      const { error: commitError } = await this.supabase
        .rpc('commit_seed_transaction', { seed_id: seedId })

      if (commitError) {
        await this.rollbackSeed(seedId)
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to commit seed transaction: ${commitError.message}`,
          timestamp: new Date(),
          cause: commitError
        })
      }

      const executionTime = Date.now() - startTime
      const recordsCreated = organizationIds.data.length + 
                           userIds.data.length + 
                           vaultIds.data.length + 
                           assetIds.data.length + 
                           meetingIds.data.length + 
                           activityIds.data.length

      const result: SeedResult = {
        seedId,
        organizationIds: organizationIds.data,
        userIds: userIds.data,
        vaultIds: vaultIds.data,
        assetIds: assetIds.data,
        meetingIds: meetingIds.data,
        activityIds: activityIds.data,
        executionTime,
        recordsCreated,
        relationships
      }

      return Ok(result)

    } catch (error) {
      if (config.cleanupOnFailure !== false) {
        await this.rollbackSeed(seedId)
      }
      
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Seed operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined,
        context: { seedId, config }
      })
    }
  }

  /**
   * Clean up seed data
   */
  async cleanupSeed(seedId: string): Promise<Result<SeedCleanupInfo, AppError>> {
    try {
      if (!this.activeSeedIds.has(seedId)) {
        return Err({
          code: 'NOT_FOUND' as any,
          message: `Seed ID not found: ${seedId}`,
          timestamp: new Date()
        })
      }

      const cleanupOrder = [
        'activities',
        'meeting_attendees',
        'meeting_resolutions',
        'meeting_action_items',
        'meetings',
        'asset_versions',
        'asset_permissions',
        'assets',
        'vault_members',
        'vaults',
        'organization_members',
        'board_committees',
        'board_structures',
        'organizations',
        'user_profiles',
        'users'
      ]

      const recordCounts: Record<string, number> = {}
      const dependencies: Record<string, string[]> = {
        activities: ['users', 'organizations'],
        meeting_attendees: ['meetings', 'users'],
        meeting_resolutions: ['meetings'],
        meeting_action_items: ['meetings', 'users'],
        meetings: ['organizations'],
        asset_versions: ['assets'],
        asset_permissions: ['assets', 'users'],
        assets: ['vaults', 'users'],
        vault_members: ['vaults', 'users'],
        vaults: ['organizations'],
        organization_members: ['organizations', 'users'],
        board_committees: ['organizations', 'users'],
        board_structures: ['organizations'],
        organizations: [],
        user_profiles: ['users'],
        users: []
      }

      // Delete records in proper order to avoid foreign key constraints
      for (const table of cleanupOrder) {
        const { count, error } = await this.supabase
          .from(table as any)
          .delete()
          .eq('seed_id', seedId)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.warn(`Failed to cleanup table ${table}:`, error)
          recordCounts[table] = 0
        } else {
          recordCounts[table] = count || 0
        }
      }

      this.activeSeedIds.delete(seedId)

      const cleanupInfo: SeedCleanupInfo = {
        seedId,
        tables: cleanupOrder,
        recordCounts,
        cleanupOrder,
        dependencies
      }

      return Ok(cleanupInfo)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Cleanup failed for seed ${seedId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Create isolated test environment
   */
  async createIsolatedEnvironment(testName: string): Promise<Result<IsolatedEnvironment, AppError>> {
    const environmentId = `env_${testName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Create test schema namespace
      const { error: schemaError } = await this.supabase
        .rpc('create_test_schema', { schema_name: environmentId })

      if (schemaError) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to create isolated schema: ${schemaError.message}`,
          timestamp: new Date(),
          cause: schemaError
        })
      }

      // Set up RLS policies for isolation
      const { error: rlsError } = await this.supabase
        .rpc('setup_test_isolation', { environment_id: environmentId })

      if (rlsError) {
        await this.cleanupIsolatedEnvironment(environmentId)
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to setup RLS isolation: ${rlsError.message}`,
          timestamp: new Date(),
          cause: rlsError
        })
      }

      const environment: IsolatedEnvironment = {
        environmentId,
        testName,
        schemaName: environmentId,
        createdAt: new Date(),
        supabaseClient: this.createIsolatedClient(environmentId),
        cleanup: () => this.cleanupIsolatedEnvironment(environmentId)
      }

      return Ok(environment)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Failed to create isolated environment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Seed pre-configured governance scenarios
   */
  async seedGovernanceScenario(scenario: 'small-board' | 'large-enterprise' | 'startup' | 'nonprofit'): Promise<Result<SeedResult, AppError>> {
    const scenarios: Record<typeof scenario, SeedConfiguration> = {
      'small-board': {
        organizations: 1,
        usersPerOrg: 8,
        vaultsPerOrg: 4,
        assetsPerVault: 15,
        meetingsPerOrg: 12,
        activitiesPerUser: 75,
        includeAnomalies: false,
        validateRelationships: true
      },
      'large-enterprise': {
        organizations: 3,
        usersPerOrg: 25,
        vaultsPerOrg: 12,
        assetsPerVault: 50,
        meetingsPerOrg: 24,
        activitiesPerUser: 150,
        includeAnomalies: true,
        includeSeasonalPatterns: true,
        validateRelationships: true
      },
      'startup': {
        organizations: 1,
        usersPerOrg: 5,
        vaultsPerOrg: 3,
        assetsPerVault: 8,
        meetingsPerOrg: 6,
        activitiesPerUser: 40,
        includeAnomalies: false,
        validateRelationships: true
      },
      'nonprofit': {
        organizations: 2,
        usersPerOrg: 12,
        vaultsPerOrg: 6,
        assetsPerVault: 20,
        meetingsPerOrg: 16,
        activitiesPerUser: 90,
        includeAnomalies: false,
        validateRelationships: true
      }
    }

    return this.seedDatabase(scenarios[scenario])
  }

  // Private helper methods

  private async seedOrganizations(
    seedId: string, 
    organizations: any[], 
    relationships: SeedRelationshipMap
  ): Promise<Result<string[], AppError>> {
    try {
      const orgData = organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        industry: org.industry,
        size: org.size,
        type: org.type,
        headquarters: org.headquarters,
        website: org.website,
        founded_at: org.foundedAt.toISOString(),
        settings: org.settings,
        compliance_profile: org.complianceProfile,
        board_structure: org.boardStructure,
        seed_id: seedId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await this.supabase
        .from('organizations')
        .insert(orgData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed organizations: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Store board structure relationships
      organizations.forEach(org => {
        relationships.boardStructures.push({
          organizationId: org.id,
          chairpersonId: org.boardStructure.chairperson,
          members: org.boardStructure.committees.flatMap((c: any) => c.memberIds)
        })
      })

      return Ok(data.map(org => org.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Organization seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async seedUsers(
    seedId: string, 
    users: any[], 
    relationships: SeedRelationshipMap
  ): Promise<Result<string[], AppError>> {
    try {
      // Seed auth users first
      const authUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Note: In a real implementation, you would use Supabase admin API
      // For testing, we'll simulate user creation

      // Seed user profiles
      const profileData = users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        display_name: user.displayName,
        title: user.title,
        department: user.department,
        phone: user.phone,
        linkedin_url: user.linkedinUrl,
        profile_picture_url: user.profilePictureUrl,
        expertise: user.expertise,
        joined_at: user.joinedAt.toISOString(),
        last_active_at: user.lastActiveAt.toISOString(),
        preferences: user.preferences,
        biometric_profile: user.biometricProfile,
        seed_id: seedId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert(profileData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed users: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Seed organization memberships
      const membershipData = users
        .filter(user => user.organizationId)
        .map(user => {
          const membership = {
            organization_id: user.organizationId,
            user_id: user.id,
            role: user.role,
            status: 'active',
            joined_at: user.joinedAt.toISOString(),
            seed_id: seedId
          }

          relationships.organizationMembers.push({
            organizationId: user.organizationId,
            userId: user.id,
            role: user.role
          })

          return membership
        })

      if (membershipData.length > 0) {
        const { error: membershipError } = await this.supabase
          .from('organization_members')
          .insert(membershipData)

        if (membershipError) {
          return Err({
            code: 'DATABASE_ERROR' as any,
            message: `Failed to seed organization memberships: ${membershipError.message}`,
            timestamp: new Date(),
            cause: membershipError
          })
        }
      }

      return Ok(data.map(user => user.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `User seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async seedVaults(
    seedId: string, 
    vaults: any[], 
    relationships: SeedRelationshipMap
  ): Promise<Result<string[], AppError>> {
    try {
      const vaultData = vaults.map(vault => ({
        id: vault.id,
        name: vault.name,
        description: vault.description,
        organization_id: vault.organizationId,
        created_by: vault.createdBy,
        created_at: vault.createdAt.toISOString(),
        last_accessed_at: vault.lastAccessedAt.toISOString(),
        settings: vault.settings,
        asset_count: vault.assetCount,
        total_size: vault.totalSize,
        access_pattern: vault.accessPattern,
        seed_id: seedId,
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await this.supabase
        .from('vaults')
        .insert(vaultData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed vaults: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Seed vault memberships
      const membershipData = vaults.flatMap(vault => 
        vault.members.map((member: any) => {
          const membership = {
            vault_id: vault.id,
            user_id: member.userId,
            role: member.role,
            permissions: member.permissions,
            added_at: member.addedAt.toISOString(),
            added_by: member.addedBy,
            seed_id: seedId
          }

          relationships.vaultMembers.push({
            vaultId: vault.id,
            userId: member.userId,
            role: member.role
          })

          return membership
        })
      )

      if (membershipData.length > 0) {
        const { error: membershipError } = await this.supabase
          .from('vault_members')
          .insert(membershipData)

        if (membershipError) {
          return Err({
            code: 'DATABASE_ERROR' as any,
            message: `Failed to seed vault memberships: ${membershipError.message}`,
            timestamp: new Date(),
            cause: membershipError
          })
        }
      }

      return Ok(data.map(vault => vault.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Vault seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async seedAssets(
    seedId: string, 
    assets: any[], 
    relationships: SeedRelationshipMap
  ): Promise<Result<string[], AppError>> {
    try {
      const assetData = assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        description: asset.description,
        type: asset.type,
        category: asset.category,
        file_size: asset.fileSize,
        mime_type: asset.mimeType,
        organization_id: asset.organizationId,
        uploaded_by: asset.uploadedBy,
        uploaded_at: asset.uploadedAt.toISOString(),
        last_modified_at: asset.lastModifiedAt.toISOString(),
        vault_ids: asset.vaultIds,
        tags: asset.tags,
        permissions: asset.permissions,
        metadata: asset.metadata,
        seed_id: seedId
      }))

      const { data, error } = await this.supabase
        .from('assets')
        .insert(assetData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed assets: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Seed asset versions and permissions
      const versionData = assets.flatMap(asset => 
        asset.versions.map((version: any) => ({
          asset_id: asset.id,
          version: version.version,
          uploaded_by: version.uploadedBy,
          uploaded_at: version.uploadedAt.toISOString(),
          change_log: version.changeLog,
          file_size: version.fileSize,
          checksum: version.checksum,
          seed_id: seedId
        }))
      )

      if (versionData.length > 0) {
        const { error: versionError } = await this.supabase
          .from('asset_versions')
          .insert(versionData)

        if (versionError) {
          return Err({
            code: 'DATABASE_ERROR' as any,
            message: `Failed to seed asset versions: ${versionError.message}`,
            timestamp: new Date(),
            cause: versionError
          })
        }
      }

      // Track asset permissions for relationships
      assets.forEach(asset => {
        ['viewers', 'editors', 'commenters'].forEach(permType => {
          if (asset.permissions[permType]) {
            asset.permissions[permType].forEach((userId: string) => {
              relationships.assetPermissions.push({
                assetId: asset.id,
                userId,
                permission: permType.slice(0, -1) // Remove 's' suffix
              })
            })
          }
        })
      })

      return Ok(data.map(asset => asset.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Asset seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async seedMeetings(
    seedId: string, 
    meetings: any[], 
    relationships: SeedRelationshipMap
  ): Promise<Result<string[], AppError>> {
    try {
      const meetingData = meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        type: meeting.type,
        organization_id: meeting.organizationId,
        scheduled_at: meeting.scheduledAt.toISOString(),
        start_time: meeting.startTime.toISOString(),
        end_time: meeting.endTime.toISOString(),
        status: meeting.status,
        location: meeting.location,
        meeting_link: meeting.meetingLink,
        agenda: meeting.agenda,
        minutes: meeting.minutes,
        recordings: meeting.recordings,
        seed_id: seedId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await this.supabase
        .from('meetings')
        .insert(meetingData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed meetings: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Seed meeting attendees
      const attendeeData = meetings.flatMap(meeting => 
        meeting.attendees.map((attendee: any) => {
          const attendeeRecord = {
            meeting_id: meeting.id,
            user_id: attendee.userId,
            status: attendee.status,
            role: attendee.role,
            joined_at: attendee.joinTime?.toISOString(),
            left_at: attendee.leaveTime?.toISOString(),
            seed_id: seedId
          }

          relationships.meetingAttendees.push({
            meetingId: meeting.id,
            userId: attendee.userId,
            status: attendee.status
          })

          return attendeeRecord
        })
      )

      if (attendeeData.length > 0) {
        const { error: attendeeError } = await this.supabase
          .from('meeting_attendees')
          .insert(attendeeData)

        if (attendeeError) {
          return Err({
            code: 'DATABASE_ERROR' as any,
            message: `Failed to seed meeting attendees: ${attendeeError.message}`,
            timestamp: new Date(),
            cause: attendeeError
          })
        }
      }

      // Seed resolutions and action items
      const resolutionData = meetings.flatMap(meeting => 
        meeting.resolutions.map((resolution: any) => ({
          id: resolution.id,
          meeting_id: meeting.id,
          title: resolution.title,
          description: resolution.description,
          proposed_by: resolution.proposedBy,
          seconded_by: resolution.secondedBy,
          status: resolution.status,
          votes: resolution.votes,
          approved_at: resolution.approvedAt?.toISOString(),
          seed_id: seedId,
          created_at: new Date().toISOString()
        }))
      )

      const actionItemData = meetings.flatMap(meeting => 
        meeting.actionItems.map((item: any) => ({
          id: item.id,
          meeting_id: meeting.id,
          title: item.title,
          description: item.description,
          assigned_to: item.assignedTo,
          due_date: item.dueDate.toISOString(),
          status: item.status,
          priority: item.priority,
          created_at: item.createdAt.toISOString(),
          completed_at: item.completedAt?.toISOString(),
          seed_id: seedId
        }))
      )

      if (resolutionData.length > 0) {
        await this.supabase.from('meeting_resolutions').insert(resolutionData)
      }

      if (actionItemData.length > 0) {
        await this.supabase.from('meeting_action_items').insert(actionItemData)
      }

      return Ok(data.map(meeting => meeting.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Meeting seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async seedActivities(
    seedId: string, 
    activities: any[]
  ): Promise<Result<string[], AppError>> {
    try {
      const activityData = activities.map(activity => ({
        id: activity.id,
        user_id: activity.userId,
        organization_id: activity.organizationId,
        type: activity.type,
        category: activity.category,
        description: activity.description,
        metadata: activity.metadata,
        timestamp: activity.timestamp.toISOString(),
        ip_address: activity.ipAddress,
        user_agent: activity.userAgent,
        session_id: activity.sessionId,
        duration: activity.duration,
        context: activity.context,
        seed_id: seedId
      }))

      const { data, error } = await this.supabase
        .from('activities')
        .insert(activityData)
        .select('id')

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to seed activities: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      return Ok(data.map(activity => activity.id))

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Activity seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async validateSeedRelationships(relationships: SeedRelationshipMap): Promise<Result<void, AppError>> {
    // Validate that all referenced users exist in organizations
    for (const member of relationships.organizationMembers) {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', member.userId)
        .single()

      if (error || !data) {
        return Err({
          code: 'VALIDATION_ERROR' as any,
          message: `Invalid relationship: User ${member.userId} not found for organization ${member.organizationId}`,
          timestamp: new Date(),
          context: { relationship: member }
        })
      }
    }

    // Validate vault memberships
    for (const member of relationships.vaultMembers) {
      const { data: vault } = await this.supabase
        .from('vaults')
        .select('organization_id')
        .eq('id', member.vaultId)
        .single()

      const { data: user } = await this.supabase
        .from('organization_members')
        .select('user_id')
        .eq('user_id', member.userId)
        .eq('organization_id', vault?.organization_id)
        .single()

      if (!user) {
        return Err({
          code: 'VALIDATION_ERROR' as any,
          message: `Invalid relationship: User ${member.userId} is not a member of organization for vault ${member.vaultId}`,
          timestamp: new Date(),
          context: { relationship: member }
        })
      }
    }

    return Ok(undefined)
  }

  private async rollbackSeed(seedId: string): Promise<void> {
    try {
      await this.supabase.rpc('rollback_seed_transaction', { seed_id: seedId })
      this.activeSeedIds.delete(seedId)
    } catch (error) {
      console.error(`Failed to rollback seed ${seedId}:`, error)
    }
  }

  private createIsolatedClient(environmentId: string): SupabaseClient<Database> {
    // Create a new Supabase client with RLS context for the isolated environment
    // This would typically involve setting session variables or using a different schema
    return this.supabase // Simplified for this example
  }

  private async cleanupIsolatedEnvironment(environmentId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .rpc('cleanup_test_schema', { schema_name: environmentId })

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to cleanup isolated environment: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Environment cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }
}

export interface IsolatedEnvironment {
  environmentId: string
  testName: string
  schemaName: string
  createdAt: Date
  supabaseClient: SupabaseClient<Database>
  cleanup: () => Promise<Result<void, AppError>>
}

// Export singleton and factory functions
export function createDatabaseSeeder(supabase: SupabaseClient<Database>): DatabaseSeeder {
  return new DatabaseSeeder(supabase)
}

// Pre-configured seeding functions
export async function seedSmallBoardScenario(seeder: DatabaseSeeder): Promise<Result<SeedResult, AppError>> {
  return seeder.seedGovernanceScenario('small-board')
}

export async function seedLargeEnterpriseScenario(seeder: DatabaseSeeder): Promise<Result<SeedResult, AppError>> {
  return seeder.seedGovernanceScenario('large-enterprise')
}

export async function seedStartupScenario(seeder: DatabaseSeeder): Promise<Result<SeedResult, AppError>> {
  return seeder.seedGovernanceScenario('startup')
}

export async function seedNonprofitScenario(seeder: DatabaseSeeder): Promise<Result<SeedResult, AppError>> {
  return seeder.seedGovernanceScenario('nonprofit')
}