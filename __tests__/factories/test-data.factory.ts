/**
 * Comprehensive Test Data Factory
 * Provides consistent test data generation for E2E tests
 */

export interface TestUser {
  id?: string
  email: string
  password: string
  fullName: string
  role: 'admin' | 'director' | 'member' | 'viewer'
  organizationId?: string
  preferences?: Record<string, any>
}

export interface TestOrganization {
  id?: string
  name: string
  slug: string
  description?: string
  industry?: string
  size?: string
  type?: string
  features?: string[]
  members?: TestUser[]
  createdBy?: string
}

export interface TestVault {
  id?: string
  name: string
  description?: string
  organizationId: string
  status: 'processing' | 'draft' | 'ready' | 'archived'
  priority: 'low' | 'medium' | 'high'
  meetingDate?: string
  createdBy?: string
  members?: string[]
  assets?: string[]
  tags?: string[]
}

export interface TestAsset {
  id?: string
  title: string
  fileName: string
  fileType: string
  fileSize?: number
  description?: string
  category?: string
  organizationId: string
  uploadedBy?: string
  processingStatus?: 'pending' | 'processing' | 'ready' | 'failed'
  annotations?: TestAnnotation[]
  collaborators?: string[]
}

export interface TestMeeting {
  id?: string
  title: string
  description?: string
  type: 'board' | 'committee' | 'general' | 'emergency'
  date: string
  time: string
  duration?: number
  location?: string
  isVirtual?: boolean
  meetingLink?: string
  organizationId: string
  createdBy?: string
  invitees?: string[]
  agenda?: TestAgendaItem[]
  status?: 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
}

export interface TestAgendaItem {
  id?: string
  title: string
  description?: string
  duration?: number
  presenter?: string
  type?: string
  order?: number
}

export interface TestAnnotation {
  id?: string
  type: 'highlight' | 'comment' | 'note' | 'shape'
  text?: string
  page: number
  position: { x: number; y: number; width?: number; height?: number }
  color?: string
  createdBy?: string
  replies?: TestComment[]
}

export interface TestComment {
  id?: string
  text: string
  createdBy: string
  createdAt?: string
  parentId?: string
  replies?: TestComment[]
}

export interface TestNotification {
  id?: string
  type: string
  title: string
  message: string
  recipientId: string
  senderId?: string
  entityId?: string
  entityType?: string
  read?: boolean
  priority?: 'low' | 'medium' | 'high'
  channels?: ('email' | 'push' | 'in-app')[]
}

export interface TestBoardChatMessage {
  id?: string
  content: string
  senderId: string
  channelId: string
  parentId?: string
  type?: 'text' | 'file' | 'system'
  reactions?: Record<string, string[]>
  mentions?: string[]
}

/**
 * Test Data Factory Class
 */
export class TestDataFactory {
  private static counter = Date.now()

  private static getUniqueId(): string {
    return `test-${this.counter++}-${Math.random().toString(36).substr(2, 9)}`
  }

  private static getRandomEmail(prefix?: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 5)
    return `${prefix || 'test'}-${timestamp}-${random}@e2etest.com`
  }

  private static getRandomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private static getRandomDate(daysFromNow = 7): string {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    return date.toISOString().split('T')[0]
  }

  private static getRandomTime(): string {
    const hours = Math.floor(Math.random() * 12) + 9 // 9 AM to 8 PM
    const minutes = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  private static pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  // User Factories
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = this.getUniqueId()
    return {
      id,
      email: this.getRandomEmail('user'),
      password: 'testPassword123!',
      fullName: `Test User ${id}`,
      role: 'member',
      ...overrides,
    }
  }

  static createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: this.getRandomEmail('admin'),
      fullName: `Admin User ${this.getUniqueId()}`,
      role: 'admin',
      ...overrides,
    })
  }

  static createDirectorUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: this.getRandomEmail('director'),
      fullName: `Director User ${this.getUniqueId()}`,
      role: 'director',
      ...overrides,
    })
  }

  static createViewerUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: this.getRandomEmail('viewer'),
      fullName: `Viewer User ${this.getUniqueId()}`,
      role: 'viewer',
      ...overrides,
    })
  }

  // Organization Factories
  static createOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    const id = this.getUniqueId()
    const name = `Test Organization ${id}`
    return {
      id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description: `E2E Test Organization for testing purposes`,
      industry: this.pickRandom(['Technology', 'Finance', 'Healthcare', 'Education', 'Government']),
      size: this.pickRandom(['1-10', '11-50', '51-200', '201-500', '500+']),
      type: this.pickRandom(['Corporation', 'Non-profit', 'Government', 'Partnership']),
      features: ['vault-management', 'board-chat', 'document-annotations'],
      ...overrides,
    }
  }

  static createOrganizationWithMembers(memberCount = 3, overrides: Partial<TestOrganization> = {}): TestOrganization {
    const org = this.createOrganization(overrides)
    const members: TestUser[] = []
    
    // Always include an admin
    members.push(this.createAdminUser({ organizationId: org.id }))
    
    // Add regular members
    for (let i = 1; i < memberCount; i++) {
      const role = i === 1 ? 'director' : this.pickRandom(['member', 'viewer'])
      members.push(this.createUser({ 
        role: role as TestUser['role'],
        organizationId: org.id 
      }))
    }
    
    return { ...org, members }
  }

  // Vault Factories
  static createVault(overrides: Partial<TestVault> = {}): TestVault {
    const id = this.getUniqueId()
    return {
      id,
      name: `Test Vault ${id}`,
      description: `E2E Test Vault for testing vault functionality`,
      organizationId: overrides.organizationId || this.getUniqueId(),
      status: this.pickRandom(['processing', 'draft', 'ready']),
      priority: this.pickRandom(['low', 'medium', 'high']),
      meetingDate: this.getRandomDate(this.pickRandom([7, 14, 21, 30])),
      tags: this.pickRandom([
        ['financial', 'quarterly'],
        ['strategic', 'planning'],
        ['compliance', 'audit'],
        ['governance', 'board'],
      ]),
      ...overrides,
    }
  }

  static createActiveVault(overrides: Partial<TestVault> = {}): TestVault {
    return this.createVault({
      status: 'ready',
      priority: 'high',
      meetingDate: this.getRandomDate(7),
      ...overrides,
    })
  }

  static createDraftVault(overrides: Partial<TestVault> = {}): TestVault {
    return this.createVault({
      status: 'draft',
      priority: 'medium',
      ...overrides,
    })
  }

  static createArchivedVault(overrides: Partial<TestVault> = {}): TestVault {
    return this.createVault({
      status: 'archived',
      meetingDate: this.getRandomDate(-30), // Past date
      ...overrides,
    })
  }

  // Asset Factories
  static createAsset(overrides: Partial<TestAsset> = {}): TestAsset {
    const id = this.getUniqueId()
    const fileTypes = ['pdf', 'docx', 'xlsx', 'pptx']
    const fileType = this.pickRandom(fileTypes)
    
    return {
      id,
      title: `Test Document ${id}`,
      fileName: `test-document-${id}.${fileType}`,
      fileType,
      fileSize: Math.floor(Math.random() * 10000000) + 100000, // 100KB to 10MB
      description: `E2E Test Asset for testing document functionality`,
      category: this.pickRandom(['financial', 'legal', 'strategic', 'operational', 'compliance']),
      organizationId: overrides.organizationId || this.getUniqueId(),
      processingStatus: 'ready',
      ...overrides,
    }
  }

  static createPdfAsset(overrides: Partial<TestAsset> = {}): TestAsset {
    return this.createAsset({
      fileType: 'pdf',
      fileName: `test-pdf-${this.getUniqueId()}.pdf`,
      title: `PDF Document ${this.getUniqueId()}`,
      ...overrides,
    })
  }

  static createAssetWithAnnotations(annotationCount = 3, overrides: Partial<TestAsset> = {}): TestAsset {
    const asset = this.createAsset(overrides)
    const annotations: TestAnnotation[] = []
    
    for (let i = 0; i < annotationCount; i++) {
      annotations.push(this.createAnnotation({
        page: Math.floor(Math.random() * 5) + 1,
        position: {
          x: Math.floor(Math.random() * 400) + 50,
          y: Math.floor(Math.random() * 600) + 50,
          width: Math.floor(Math.random() * 200) + 100,
          height: 20,
        },
      }))
    }
    
    return { ...asset, annotations }
  }

  // Meeting Factories
  static createMeeting(overrides: Partial<TestMeeting> = {}): TestMeeting {
    const id = this.getUniqueId()
    const meetingTypes = ['board', 'committee', 'general', 'emergency'] as const
    
    return {
      id,
      title: `Test Meeting ${id}`,
      description: `E2E Test Meeting for testing meeting functionality`,
      type: this.pickRandom(meetingTypes),
      date: this.getRandomDate(this.pickRandom([1, 3, 7, 14])),
      time: this.getRandomTime(),
      duration: this.pickRandom([60, 90, 120, 180]), // minutes
      organizationId: overrides.organizationId || this.getUniqueId(),
      status: 'scheduled',
      ...overrides,
    }
  }

  static createBoardMeeting(overrides: Partial<TestMeeting> = {}): TestMeeting {
    return this.createMeeting({
      type: 'board',
      title: `Board Meeting ${this.getUniqueId()}`,
      duration: 120,
      agenda: [
        this.createAgendaItem({ title: 'Call to Order', duration: 5 }),
        this.createAgendaItem({ title: 'Financial Review', duration: 30 }),
        this.createAgendaItem({ title: 'Strategic Discussion', duration: 45 }),
        this.createAgendaItem({ title: 'Resolutions', duration: 30 }),
        this.createAgendaItem({ title: 'Adjournment', duration: 10 }),
      ],
      ...overrides,
    })
  }

  static createVirtualMeeting(overrides: Partial<TestMeeting> = {}): TestMeeting {
    return this.createMeeting({
      isVirtual: true,
      meetingLink: `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`,
      location: undefined,
      ...overrides,
    })
  }

  static createUpcomingMeeting(overrides: Partial<TestMeeting> = {}): TestMeeting {
    return this.createMeeting({
      date: this.getRandomDate(this.pickRandom([1, 2, 3])),
      status: 'scheduled',
      ...overrides,
    })
  }

  static createPastMeeting(overrides: Partial<TestMeeting> = {}): TestMeeting {
    return this.createMeeting({
      date: this.getRandomDate(-this.pickRandom([7, 14, 21, 30])),
      status: 'completed',
      ...overrides,
    })
  }

  // Helper Factories
  static createAgendaItem(overrides: Partial<TestAgendaItem> = {}): TestAgendaItem {
    const id = this.getUniqueId()
    return {
      id,
      title: `Agenda Item ${id}`,
      description: `Description for agenda item ${id}`,
      duration: this.pickRandom([5, 10, 15, 20, 30, 45, 60]),
      type: this.pickRandom(['presentation', 'discussion', 'vote', 'report']),
      ...overrides,
    }
  }

  static createAnnotation(overrides: Partial<TestAnnotation> = {}): TestAnnotation {
    const id = this.getUniqueId()
    const types = ['highlight', 'comment', 'note', 'shape'] as const
    
    return {
      id,
      type: this.pickRandom(types),
      text: `Annotation text ${id}`,
      page: 1,
      position: { x: 100, y: 100, width: 200, height: 20 },
      color: this.pickRandom(['#ffff00', '#ff0000', '#00ff00', '#0000ff']),
      ...overrides,
    }
  }

  static createComment(overrides: Partial<TestComment> = {}): TestComment {
    const id = this.getUniqueId()
    return {
      id,
      text: `Test comment ${id}`,
      createdBy: overrides.createdBy || this.getRandomEmail(),
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createNotification(overrides: Partial<TestNotification> = {}): TestNotification {
    const id = this.getUniqueId()
    const types = [
      'meeting.created',
      'meeting.updated',
      'vault.shared',
      'asset.uploaded',
      'comment.added',
      'organization.invited'
    ]
    
    return {
      id,
      type: this.pickRandom(types),
      title: `Test Notification ${id}`,
      message: `This is a test notification message ${id}`,
      recipientId: overrides.recipientId || this.getUniqueId(),
      priority: this.pickRandom(['low', 'medium', 'high']),
      read: false,
      channels: ['in-app', 'email'],
      ...overrides,
    }
  }

  static createBoardChatMessage(overrides: Partial<TestBoardChatMessage> = {}): TestBoardChatMessage {
    const id = this.getUniqueId()
    return {
      id,
      content: `Test chat message ${id}`,
      senderId: overrides.senderId || this.getUniqueId(),
      channelId: overrides.channelId || this.getUniqueId(),
      type: 'text',
      ...overrides,
    }
  }

  // Batch Creation Helpers
  static createUserBatch(count: number, template: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.createUser(template))
  }

  static createAssetBatch(count: number, template: Partial<TestAsset> = {}): TestAsset[] {
    return Array.from({ length: count }, () => this.createAsset(template))
  }

  static createMeetingBatch(count: number, template: Partial<TestMeeting> = {}): TestMeeting[] {
    return Array.from({ length: count }, () => this.createMeeting(template))
  }

  static createVaultBatch(count: number, template: Partial<TestVault> = {}): TestVault[] {
    return Array.from({ length: count }, () => this.createVault(template))
  }

  // Complex Scenario Builders
  static createCompleteOrganizationScenario(): {
    organization: TestOrganization
    users: TestUser[]
    vaults: TestVault[]
    assets: TestAsset[]
    meetings: TestMeeting[]
  } {
    const organization = this.createOrganization()
    const users = this.createUserBatch(5, { organizationId: organization.id })
    const vaults = this.createVaultBatch(3, { organizationId: organization.id! })
    const assets = this.createAssetBatch(10, { organizationId: organization.id! })
    const meetings = this.createMeetingBatch(4, { organizationId: organization.id! })

    return {
      organization,
      users,
      vaults,
      assets,
      meetings,
    }
  }

  static createCollaborationScenario(): {
    organization: TestOrganization
    users: TestUser[]
    asset: TestAsset
    annotations: TestAnnotation[]
    comments: TestComment[]
    chatMessages: TestBoardChatMessage[]
  } {
    const organization = this.createOrganization()
    const users = this.createUserBatch(3, { organizationId: organization.id })
    const asset = this.createAsset({ organizationId: organization.id! })
    const annotations = Array.from({ length: 5 }, (_, i) => 
      this.createAnnotation({ 
        createdBy: users[i % users.length].id,
        page: Math.floor(i / 2) + 1 
      })
    )
    const comments = Array.from({ length: 8 }, (_, i) => 
      this.createComment({ createdBy: users[i % users.length].id })
    )
    const chatMessages = Array.from({ length: 10 }, (_, i) => 
      this.createBoardChatMessage({ senderId: users[i % users.length].id })
    )

    return {
      organization,
      users,
      asset,
      annotations,
      comments,
      chatMessages,
    }
  }

  static createMeetingScenario(): {
    organization: TestOrganization
    users: TestUser[]
    meetings: TestMeeting[]
    boardMeeting: TestMeeting
    virtualMeeting: TestMeeting
    emergencyMeeting: TestMeeting
  } {
    const organization = this.createOrganization()
    const users = this.createUserBatch(4, { organizationId: organization.id })
    const meetings = this.createMeetingBatch(6, { organizationId: organization.id! })
    const boardMeeting = this.createBoardMeeting({ organizationId: organization.id! })
    const virtualMeeting = this.createVirtualMeeting({ organizationId: organization.id! })
    const emergencyMeeting = this.createMeeting({
      organizationId: organization.id!,
      type: 'emergency',
      title: 'Emergency Board Meeting',
      date: this.getRandomDate(1), // Tomorrow
    })

    return {
      organization,
      users,
      meetings,
      boardMeeting,
      virtualMeeting,
      emergencyMeeting,
    }
  }

  // Utility Methods
  static createTestDatabase(): {
    organizations: TestOrganization[]
    users: TestUser[]
    vaults: TestVault[]
    assets: TestAsset[]
    meetings: TestMeeting[]
    notifications: TestNotification[]
  } {
    const organizations = Array.from({ length: 3 }, () => this.createOrganization())
    const users: TestUser[] = []
    const vaults: TestVault[] = []
    const assets: TestAsset[] = []
    const meetings: TestMeeting[] = []
    const notifications: TestNotification[] = []

    // Create users, vaults, assets, and meetings for each organization
    organizations.forEach(org => {
      const orgUsers = this.createUserBatch(this.pickRandom([3, 4, 5]), { organizationId: org.id })
      const orgVaults = this.createVaultBatch(this.pickRandom([2, 3, 4]), { organizationId: org.id! })
      const orgAssets = this.createAssetBatch(this.pickRandom([5, 8, 12]), { organizationId: org.id! })
      const orgMeetings = this.createMeetingBatch(this.pickRandom([3, 4, 6]), { organizationId: org.id! })
      
      users.push(...orgUsers)
      vaults.push(...orgVaults)
      assets.push(...orgAssets)
      meetings.push(...orgMeetings)

      // Create notifications for users
      orgUsers.forEach(user => {
        const userNotifications = Array.from({ length: this.pickRandom([2, 3, 5]) }, () =>
          this.createNotification({ recipientId: user.id! })
        )
        notifications.push(...userNotifications)
      })
    })

    return {
      organizations,
      users,
      vaults,
      assets,
      meetings,
      notifications,
    }
  }

  // Cleanup Helpers
  static generateCleanupIds(data: any[]): string[] {
    return data.map(item => item.id).filter(Boolean)
  }

  static createTestSummary(testName: string, data: Record<string, any[]>): {
    testName: string
    timestamp: string
    summary: Record<string, number>
    ids: Record<string, string[]>
  } {
    const summary: Record<string, number> = {}
    const ids: Record<string, string[]> = {}

    Object.entries(data).forEach(([key, items]) => {
      summary[key] = items.length
      ids[key] = this.generateCleanupIds(items)
    })

    return {
      testName,
      timestamp: new Date().toISOString(),
      summary,
      ids,
    }
  }
}

// Export convenience functions
export const {
  createUser,
  createAdminUser,
  createDirectorUser,
  createViewerUser,
  createOrganization,
  createOrganizationWithMembers,
  createVault,
  createActiveVault,
  createDraftVault,
  createAsset,
  createPdfAsset,
  createAssetWithAnnotations,
  createMeeting,
  createBoardMeeting,
  createVirtualMeeting,
  createUpcomingMeeting,
  createPastMeeting,
  createAgendaItem,
  createAnnotation,
  createComment,
  createNotification,
  createBoardChatMessage,
  createCompleteOrganizationScenario,
  createCollaborationScenario,
  createMeetingScenario,
  createTestDatabase,
} = TestDataFactory