import type { 
  User, 
  Organization, 
  Vault, 
  Asset,
  UserInsert,
  OrganizationInsert,
  VaultInsert,
  AssetInsert
} from '@/types'

// Test user fixtures
export const testUsers = {
  admin: {
    id: 'test-admin-1',
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin' as const,
    status: 'approved' as const,
    company: 'Test Company',
    position: 'Administrator',
  } satisfies Partial<User>,

  director: {
    id: 'test-director-1',
    email: 'director@test.com',
    full_name: 'Board Director',
    role: 'director' as const,
    status: 'approved' as const,
    company: 'Test Company',
    position: 'Board Director',
  } satisfies Partial<User>,

  viewer: {
    id: 'test-viewer-1',
    email: 'viewer@test.com',
    full_name: 'Test Viewer',
    role: 'viewer' as const,
    status: 'approved' as const,
    company: 'Test Company',
    position: 'Observer',
  } satisfies Partial<User>,

  pending: {
    id: 'test-pending-1',
    email: 'pending@test.com',
    full_name: 'Pending User',
    role: 'pending' as const,
    status: 'pending' as const,
    company: 'Test Company',
    position: 'New User',
  } satisfies Partial<User>,
}

// Test organization fixtures
export const testOrganizations = {
  primary: {
    id: 'test-org-1',
    name: 'Primary Test Organization',
    slug: 'primary-test-org',
    description: 'Main organization for testing',
    industry: 'Technology',
    organization_size: 'medium' as const,
    is_active: true,
  } satisfies Partial<Organization>,

  secondary: {
    id: 'test-org-2',
    name: 'Secondary Test Organization',
    slug: 'secondary-test-org',
    description: 'Secondary organization for testing',
    industry: 'Finance',
    organization_size: 'large' as const,
    is_active: true,
  } satisfies Partial<Organization>,

  inactive: {
    id: 'test-org-inactive',
    name: 'Inactive Test Organization',
    slug: 'inactive-test-org',
    description: 'Inactive organization for testing',
    is_active: false,
    deleted_at: new Date().toISOString(),
  } satisfies Partial<Organization>,
}

// Test vault fixtures
export const testVaults = {
  active: {
    id: 'test-vault-1',
    name: 'Q1 2024 Board Meeting',
    description: 'First quarter board meeting materials',
    status: 'active' as const,
    priority: 'high' as const,
    meeting_date: '2024-03-15T10:00:00Z',
    tags: ['quarterly', 'financial-review'],
  } satisfies Partial<Vault>,

  draft: {
    id: 'test-vault-2',
    name: 'Strategic Planning Session',
    description: 'Materials for strategic planning',
    status: 'draft' as const,
    priority: 'medium' as const,
    meeting_date: '2024-04-20T14:00:00Z',
    tags: ['strategic', 'planning'],
  } satisfies Partial<Vault>,

  archived: {
    id: 'test-vault-archived',
    name: 'Archived Vault',
    description: 'Old vault for testing',
    status: 'archived' as const,
    priority: 'low' as const,
    archived_at: '2024-01-01T00:00:00Z',
  } satisfies Partial<Vault>,
}

// Test asset fixtures
export const testAssets = {
  pdf: {
    id: 'test-asset-1',
    title: 'Q1 Financial Report',
    description: 'Quarterly financial performance report',
    file_name: 'q1-financial-report.pdf',
    file_type: 'application/pdf',
    file_size: 2048000, // 2MB
    status: 'ready' as const,
    visibility: 'organization' as const,
    summary: 'Financial performance exceeded expectations with 15% growth...',
    tags: ['financial', 'quarterly', 'performance'],
    watermark_applied: true,
  } satisfies Partial<Asset>,

  processing: {
    id: 'test-asset-2',
    title: 'Strategic Analysis Document',
    description: 'Market analysis and strategic recommendations',
    file_name: 'strategic-analysis.docx',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 1536000, // 1.5MB
    status: 'processing' as const,
    visibility: 'private' as const,
    tags: ['strategy', 'analysis', 'market'],
    watermark_applied: false,
  } satisfies Partial<Asset>,

  failed: {
    id: 'test-asset-failed',
    title: 'Failed Upload Test',
    description: 'Asset that failed processing',
    file_name: 'failed-document.pdf',
    file_type: 'application/pdf',
    file_size: 512000,
    status: 'failed' as const,
    visibility: 'private' as const,
    watermark_applied: false,
  } satisfies Partial<Asset>,
}

// Test invitation fixtures
export const testInvitations = {
  organizationPending: {
    id: 'test-org-invitation-1',
    email: 'newuser@test.com',
    role: 'member' as const,
    status: 'pending' as const,
    invitation_token: 'test-token-123',
    email_verification_code: '123456',
    personal_message: 'Welcome to our organization!',
    max_attempts: 3,
    attempt_count: 0,
  },

  vaultPending: {
    id: 'test-vault-invitation-1',
    email: 'boardmember@test.com',
    role: 'viewer' as const,
    status: 'pending' as const,
    message: 'Please review these board materials',
    deadline: '2024-03-20T23:59:59Z',
  },

  expired: {
    id: 'test-invitation-expired',
    email: 'expired@test.com',
    role: 'viewer' as const,
    status: 'expired' as const,
    token_expires_at: '2024-01-01T00:00:00Z', // Past date
  },
}

// Factory functions for creating test data with relationships
export const createTestUser = (overrides: Partial<UserInsert> = {}): UserInsert => ({
  id: `test-user-${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  full_name: 'Test User',
  role: 'director',
  status: 'approved',
  company: 'Test Company',
  position: 'Board Member',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  password_set: true,
  ...overrides,
})

export const createTestOrganization = (createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert => ({
  id: `test-org-${Date.now()}`,
  name: `Test Organization ${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: 'A test organization',
  industry: 'Technology',
  organization_size: 'medium',
  created_by: createdBy,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  ...overrides,
})

export const createTestVault = (organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert => ({
  id: `test-vault-${Date.now()}`,
  name: `Test Vault ${Date.now()}`,
  description: 'A test vault for testing',
  organization_id: organizationId,
  created_by: createdBy,
  status: 'draft',
  priority: 'medium',
  meeting_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tags: ['test'],
  ...overrides,
})

export const createTestAsset = (organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert => ({
  id: `test-asset-${Date.now()}`,
  title: `Test Asset ${Date.now()}`,
  description: 'A test asset for testing',
  file_path: `test-assets/test-file-${Date.now()}.pdf`,
  file_name: `test-file-${Date.now()}.pdf`,
  file_type: 'application/pdf',
  file_size: 1024000, // 1MB
  uploaded_by: uploadedBy,
  organization_id: organizationId,
  status: 'ready',
  visibility: 'organization',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  watermark_applied: true,
  tags: ['test'],
  ...overrides,
})

// Bulk data generators for performance testing
export const generateBulkUsers = (count: number, baseData: Partial<UserInsert> = {}): UserInsert[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({
      email: `user${index}@test.com`,
      full_name: `Test User ${index}`,
      ...baseData,
    })
  )
}

export const generateBulkVaults = (count: number, organizationId: string, createdBy: string): VaultInsert[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestVault(organizationId, createdBy, {
      name: `Test Vault ${index}`,
      priority: index % 2 === 0 ? 'high' : 'medium',
      status: index % 3 === 0 ? 'draft' : 'active',
    })
  )
}

export const generateBulkAssets = (count: number, organizationId: string, uploadedBy: string): AssetInsert[] => {
  const fileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  return Array.from({ length: count }, (_, index) => 
    createTestAsset(organizationId, uploadedBy, {
      title: `Test Asset ${index}`,
      file_type: fileTypes[index % fileTypes.length],
      file_name: `test-asset-${index}.${fileTypes[index % fileTypes.length].split('/')[1]}`,
      status: index % 10 === 0 ? 'processing' : 'ready',
    })
  )
}

// Test scenarios for complex testing
export const testScenarios = {
  // Multi-organization setup
  multiOrg: {
    users: [testUsers.admin, testUsers.director, testUsers.viewer],
    organizations: [testOrganizations.primary, testOrganizations.secondary],
    vaults: [testVaults.active, testVaults.draft],
    assets: [testAssets.pdf, testAssets.processing],
  },

  // Single user workflow
  singleUserWorkflow: {
    user: testUsers.director,
    organization: testOrganizations.primary,
    vaults: [testVaults.active],
    assets: [testAssets.pdf],
  },

  // Edge cases
  edgeCases: {
    users: [testUsers.pending],
    organizations: [testOrganizations.inactive],
    vaults: [testVaults.archived],
    assets: [testAssets.failed],
    invitations: [testInvitations.expired],
  },
}

export type TestScenario = keyof typeof testScenarios