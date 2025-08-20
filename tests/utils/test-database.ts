import { createSupabaseAdminClient } from '@/config/database.config'
import { createTestUser, createTestOrganization, createTestVault, createTestAsset } from '../fixtures/test-data'
import type { 
  UserInsert, 
  OrganizationInsert, 
  VaultInsert, 
  AssetInsert 
} from '@/types'

class TestDatabase {
  private supabase = createSupabaseAdminClient()
  private testDataIds: {
    users: string[]
    organizations: string[]
    vaults: string[]
    assets: string[]
    invitations: string[]
  } = {
    users: [],
    organizations: [],
    vaults: [],
    assets: [],
    invitations: [],
  }

  /**
   * Set up test database - run before all tests
   */
  async setup(): Promise<void> {
    // Enable row-level security if not already enabled
    await this.enableRLS()
    
    // Create test schema if needed
    await this.createTestSchema()
  }

  /**
   * Clean up all test data - run after all tests
   */
  async cleanup(): Promise<void> {
    try {
      // Delete in reverse dependency order to avoid foreign key constraints
      await this.clearInvitations()
      await this.clearAssets()
      await this.clearVaults()
      await this.clearOrganizations()
      await this.clearUsers()
      
      // Clear tracking arrays
      Object.keys(this.testDataIds).forEach(key => {
        this.testDataIds[key as keyof typeof this.testDataIds] = []
      })
    } catch (error) {
      console.error('Test cleanup failed:', error)
      throw error
    }
  }

  /**
   * Create test user
   */
  async createUser(userData: Partial<UserInsert> = {}): Promise<any> {
    const user = createTestUser(userData)
    
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }

    this.testDataIds.users.push(data.id)
    return data
  }

  /**
   * Create test organization
   */
  async createOrganization(orgData: Partial<OrganizationInsert> & { created_by: string }): Promise<any> {
    const organization = createTestOrganization(orgData.created_by, orgData)
    
    const { data, error } = await this.supabase
      .from('organizations')
      .insert(organization)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test organization: ${error.message}`)
    }

    this.testDataIds.organizations.push(data.id)
    
    // Add creator as organization owner
    await this.addOrganizationMember(data.id, orgData.created_by, 'owner')
    
    return data
  }

  /**
   * Create test vault
   */
  async createVault(vaultData: Partial<VaultInsert> & { organization_id: string; created_by: string }): Promise<any> {
    const vault = createTestVault(vaultData.organization_id, vaultData.created_by, vaultData)
    
    const { data, error } = await this.supabase
      .from('vaults')
      .insert(vault)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test vault: ${error.message}`)
    }

    this.testDataIds.vaults.push(data.id)
    
    // Add creator as vault owner
    await this.addVaultMember(data.id, vaultData.created_by, 'owner')
    
    return data
  }

  /**
   * Create test asset
   */
  async createAsset(assetData: Partial<AssetInsert> & { organization_id: string; uploaded_by: string }): Promise<any> {
    const asset = createTestAsset(assetData.organization_id, assetData.uploaded_by, assetData)
    
    const { data, error } = await this.supabase
      .from('board_packs')
      .insert(asset)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test asset: ${error.message}`)
    }

    this.testDataIds.assets.push(data.id)
    return data
  }

  /**
   * Add organization member
   */
  async addOrganizationMember(organizationId: string, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'active',
        joined_at: new Date().toISOString(),
        is_primary: role === 'owner',
      })

    if (error) {
      throw new Error(`Failed to add organization member: ${error.message}`)
    }
  }

  /**
   * Add vault member
   */
  async addVaultMember(vaultId: string, userId: string, role: string = 'viewer'): Promise<void> {
    const { error } = await this.supabase
      .from('vault_members')
      .insert({
        vault_id: vaultId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to add vault member: ${error.message}`)
    }
  }

  /**
   * Create organization invitation
   */
  async createOrganizationInvitation(organizationId: string, email: string, invitedBy: string, role: string = 'member'): Promise<any> {
    const invitation = {
      id: `test-invitation-${Date.now()}`,
      organization_id: organizationId,
      email,
      role,
      invitation_token: `token-${Date.now()}`,
      email_verification_code: Math.random().toString(36).substring(2, 8),
      invited_by: invitedBy,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      max_attempts: 3,
      attempt_count: 0,
    }

    const { data, error } = await this.supabase
      .from('organization_invitations')
      .insert(invitation)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create organization invitation: ${error.message}`)
    }

    this.testDataIds.invitations.push(data.id)
    return data
  }

  /**
   * Create vault invitation
   */
  async createVaultInvitation(vaultId: string, userId: string, invitedBy: string, role: string = 'viewer'): Promise<any> {
    const invitation = {
      id: `test-vault-invitation-${Date.now()}`,
      vault_id: vaultId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const { data, error } = await this.supabase
      .from('vault_invitations')
      .insert(invitation)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create vault invitation: ${error.message}`)
    }

    this.testDataIds.invitations.push(data.id)
    return data
  }

  /**
   * Get authentication headers for testing API endpoints
   */
  async getAuthHeaders(userId: string): Promise<Record<string, string>> {
    // In a real implementation, you'd create a JWT token or session
    // For testing, we'll simulate the auth header
    return {
      'Authorization': `Bearer test-token-${userId}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Clear specific resource types
   */
  async clearUsers(): Promise<void> {
    if (this.testDataIds.users.length > 0) {
      await this.supabase
        .from('users')
        .delete()
        .in('id', this.testDataIds.users)
      
      this.testDataIds.users = []
    }
  }

  async clearOrganizations(): Promise<void> {
    if (this.testDataIds.organizations.length > 0) {
      // Clear organization members first
      await this.supabase
        .from('organization_members')
        .delete()
        .in('organization_id', this.testDataIds.organizations)
      
      // Clear organizations
      await this.supabase
        .from('organizations')
        .delete()
        .in('id', this.testDataIds.organizations)
      
      this.testDataIds.organizations = []
    }
  }

  async clearVaults(): Promise<void> {
    if (this.testDataIds.vaults.length > 0) {
      // Clear vault members first
      await this.supabase
        .from('vault_members')
        .delete()
        .in('vault_id', this.testDataIds.vaults)
      
      // Clear vault assets
      await this.supabase
        .from('vault_assets')
        .delete()
        .in('vault_id', this.testDataIds.vaults)
      
      // Clear vaults
      await this.supabase
        .from('vaults')
        .delete()
        .in('id', this.testDataIds.vaults)
      
      this.testDataIds.vaults = []
    }
  }

  async clearAssets(): Promise<void> {
    if (this.testDataIds.assets.length > 0) {
      await this.supabase
        .from('board_packs')
        .delete()
        .in('id', this.testDataIds.assets)
      
      this.testDataIds.assets = []
    }
  }

  async clearInvitations(): Promise<void> {
    if (this.testDataIds.invitations.length > 0) {
      // Clear both organization and vault invitations
      await this.supabase
        .from('organization_invitations')
        .delete()
        .in('id', this.testDataIds.invitations)
      
      await this.supabase
        .from('vault_invitations')
        .delete()
        .in('id', this.testDataIds.invitations)
      
      this.testDataIds.invitations = []
    }
  }

  /**
   * Database setup helpers
   */
  private async enableRLS(): Promise<void> {
    // Enable RLS on all tables (if not already enabled)
    const tables = [
      'users',
      'organizations',
      'organization_members',
      'vaults',
      'vault_members',
      'board_packs',
      'organization_invitations',
      'vault_invitations',
    ]

    for (const table of tables) {
      try {
        await this.supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        })
      } catch (error) {
        // Ignore if already enabled
        console.warn(`RLS already enabled for ${table}`)
      }
    }
  }

  private async createTestSchema(): Promise<void> {
    // Create any test-specific schema elements if needed
    // This could include test-only tables, functions, etc.
  }

  /**
   * Utility methods for assertions
   */
  async countRecords(table: string, filters: Record<string, any> = {}): Promise<number> {
    let query = this.supabase.from(table).select('*', { count: 'exact', head: true })
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { count, error } = await query
    
    if (error) {
      throw new Error(`Failed to count records: ${error.message}`)
    }
    
    return count || 0
  }

  async recordExists(table: string, id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .single()
    
    return !error && !!data
  }
}

// Export singleton instance
export const testDb = new TestDatabase()

// Export class for direct instantiation if needed
export { TestDatabase }