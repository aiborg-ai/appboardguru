/**
 * Enhanced Test Data Generator
 * Intelligent test data generation for all entities with realistic patterns and relationships
 */

import { faker } from '@faker-js/faker'
import { Logger } from '../logging/logger'

const logger = Logger.getLogger('TestDataGenerator')

// Entity type definitions
export interface GeneratedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'admin' | 'board_member' | 'executive' | 'member' | 'guest'
  organizationId?: string
  profilePictureUrl?: string
  phone?: string
  title?: string
  department?: string
  linkedinUrl?: string
  expertise: string[]
  joinedAt: Date
  lastActiveAt: Date
  preferences: UserPreferences
  biometricProfile?: BiometricProfile
}

export interface GeneratedOrganization {
  id: string
  name: string
  slug: string
  description: string
  industry: string
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  type: 'public' | 'private' | 'nonprofit' | 'government'
  headquarters: string
  website?: string
  foundedAt: Date
  settings: OrganizationSettings
  complianceProfile: ComplianceProfile
  boardStructure: BoardStructure
}

export interface GeneratedAsset {
  id: string
  name: string
  description: string
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'spreadsheet' | 'presentation'
  category: 'governance' | 'financial' | 'legal' | 'strategic' | 'operational' | 'compliance'
  fileSize: number
  mimeType: string
  organizationId: string
  uploadedBy: string
  uploadedAt: Date
  lastModifiedAt: Date
  vaultIds: string[]
  tags: string[]
  permissions: AssetPermissions
  metadata: AssetMetadata
  versions: AssetVersion[]
}

export interface GeneratedVault {
  id: string
  name: string
  description: string
  organizationId: string
  createdBy: string
  createdAt: Date
  lastAccessedAt: Date
  settings: VaultSettings
  members: VaultMember[]
  assetCount: number
  totalSize: number
  accessPattern: AccessPattern
}

export interface GeneratedActivity {
  id: string
  userId: string
  organizationId: string
  type: ActivityType
  category: ActivityCategory
  description: string
  metadata: ActivityMetadata
  timestamp: Date
  ipAddress: string
  userAgent: string
  sessionId: string
  duration?: number
  context: ActivityContext
}

export interface GeneratedMeeting {
  id: string
  title: string
  description: string
  type: 'board' | 'committee' | 'special' | 'annual' | 'quarterly'
  organizationId: string
  scheduledAt: Date
  startTime: Date
  endTime: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  location: string
  meetingLink?: string
  agenda: AgendaItem[]
  attendees: MeetingAttendee[]
  resolutions: Resolution[]
  actionItems: ActionItem[]
  minutes?: string
  recordings: Recording[]
}

// Supporting interfaces
interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    frequency: 'immediate' | 'daily' | 'weekly'
  }
  privacy: {
    profileVisibility: 'public' | 'organization' | 'private'
    activitySharing: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
  }
}

interface BiometricProfile {
  voiceprintId?: string
  faceId?: string
  fingerprintId?: string
  behavioralPatterns: {
    typingPattern: number[]
    mouseMovements: number[]
    navigationPatterns: string[]
  }
}

interface OrganizationSettings {
  features: {
    aiChat: boolean
    voiceCommands: boolean
    biometricAuth: boolean
    advancedAnalytics: boolean
  }
  security: {
    mfaRequired: boolean
    sessionTimeout: number
    passwordPolicy: PasswordPolicy
  }
  governance: {
    approvalWorkflow: boolean
    auditTrail: boolean
    complianceTracking: boolean
  }
}

interface ComplianceProfile {
  frameworks: string[]
  certifications: string[]
  auditSchedule: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastAuditDate?: Date
  nextAuditDate?: Date
}

interface BoardStructure {
  chairperson: string
  viceChair?: string
  committees: Committee[]
  meetingFrequency: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  quorumRequirement: number
}

interface Committee {
  id: string
  name: string
  type: 'audit' | 'governance' | 'compensation' | 'risk' | 'strategic' | 'nominating'
  chairId: string
  memberIds: string[]
  charter: string
}

interface AssetPermissions {
  owner: string
  viewers: string[]
  editors: string[]
  commenters: string[]
  isPublic: boolean
  inheritFromVault: boolean
}

interface AssetMetadata {
  author?: string
  subject?: string
  keywords: string[]
  language: string
  pageCount?: number
  wordCount?: number
  lastPrintedAt?: Date
  customFields: Record<string, any>
}

interface AssetVersion {
  version: number
  uploadedBy: string
  uploadedAt: Date
  changeLog: string
  fileSize: number
  checksum: string
}

interface VaultSettings {
  isPrivate: boolean
  autoArchive: boolean
  retentionDays?: number
  encryptionEnabled: boolean
  versioningEnabled: boolean
  approvalRequired: boolean
}

interface VaultMember {
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  addedAt: Date
  addedBy: string
  permissions: string[]
}

interface AccessPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'rarely'
  peakHours: number[]
  mostActiveUsers: string[]
  averageSessionDuration: number
}

type ActivityType = 'login' | 'logout' | 'view' | 'edit' | 'create' | 'delete' | 'share' | 'comment' | 'download' | 'upload'
type ActivityCategory = 'authentication' | 'content' | 'collaboration' | 'governance' | 'security' | 'system'

interface ActivityMetadata {
  objectId?: string
  objectType?: string
  changes?: Record<string, any>
  collaborators?: string[]
  deviceInfo?: DeviceInfo
}

interface ActivityContext {
  feature: string
  location: string
  referrer?: string
  searchQuery?: string
  filters?: Record<string, any>
}

interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  screenResolution: string
}

interface AgendaItem {
  id: string
  title: string
  description: string
  presenter: string
  duration: number
  order: number
  attachments: string[]
  discussion?: string
  outcome?: string
}

interface MeetingAttendee {
  userId: string
  status: 'invited' | 'accepted' | 'declined' | 'attended' | 'absent'
  joinTime?: Date
  leaveTime?: Date
  role: 'chair' | 'presenter' | 'member' | 'observer'
}

interface Resolution {
  id: string
  title: string
  description: string
  proposedBy: string
  secondedBy?: string
  status: 'proposed' | 'under_discussion' | 'voting' | 'approved' | 'rejected' | 'deferred'
  votes: Vote[]
  approvedAt?: Date
}

interface Vote {
  userId: string
  vote: 'for' | 'against' | 'abstain'
  comment?: string
  timestamp: Date
}

interface ActionItem {
  id: string
  title: string
  description: string
  assignedTo: string
  dueDate: Date
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  completedAt?: Date
}

interface Recording {
  id: string
  type: 'video' | 'audio' | 'transcript'
  url: string
  size: number
  duration: number
  quality: 'low' | 'medium' | 'high' | 'hd'
}

interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
  preventReuse: number
}

// Generator configuration
export interface GeneratorConfig {
  seed?: number
  locale?: string
  relationships?: boolean
  includeTimestamps?: boolean
  realisticPatterns?: boolean
  complexityLevel?: 'simple' | 'moderate' | 'complex'
}

// Main generator class
export class EnhancedTestDataGenerator {
  private config: Required<GeneratorConfig>
  private organizations: GeneratedOrganization[] = []
  private users: GeneratedUser[] = []
  private vaults: GeneratedVault[] = []
  private assets: GeneratedAsset[] = []

  constructor(config: GeneratorConfig = {}) {
    this.config = {
      seed: Date.now(),
      locale: 'en',
      relationships: true,
      includeTimestamps: true,
      realisticPatterns: true,
      complexityLevel: 'moderate',
      ...config
    }

    // Set faker seed for reproducible results
    faker.seed(this.config.seed)
    faker.setLocale(this.config.locale)
  }

  /**
   * Generate a complete dataset with relationships
   */
  generateCompleteDataset(options: {
    organizations: number
    usersPerOrg: number
    vaultsPerOrg: number
    assetsPerVault: number
    meetingsPerOrg: number
    activitiesPerUser: number
  }): {
    organizations: GeneratedOrganization[]
    users: GeneratedUser[]
    vaults: GeneratedVault[]
    assets: GeneratedAsset[]
    meetings: GeneratedMeeting[]
    activities: GeneratedActivity[]
  } {
    const startTime = performance.now()

    // Generate organizations first
    const organizations = this.generateOrganizations(options.organizations)
    
    // Generate users for each organization
    const users: GeneratedUser[] = []
    organizations.forEach(org => {
      const orgUsers = this.generateUsers(options.usersPerOrg, org.id)
      users.push(...orgUsers)
    })

    // Generate vaults for each organization
    const vaults: GeneratedVault[] = []
    organizations.forEach(org => {
      const orgUsers = users.filter(u => u.organizationId === org.id)
      const orgVaults = this.generateVaults(options.vaultsPerOrg, org.id, orgUsers)
      vaults.push(...orgVaults)
    })

    // Generate assets for each vault
    const assets: GeneratedAsset[] = []
    vaults.forEach(vault => {
      const vaultUsers = users.filter(u => u.organizationId === vault.organizationId)
      const vaultAssets = this.generateAssets(options.assetsPerVault, vault, vaultUsers)
      assets.push(...vaultAssets)
    })

    // Generate meetings for each organization
    const meetings: GeneratedMeeting[] = []
    organizations.forEach(org => {
      const orgUsers = users.filter(u => u.organizationId === org.id)
      const orgMeetings = this.generateMeetings(options.meetingsPerOrg, org, orgUsers)
      meetings.push(...orgMeetings)
    })

    // Generate activities for each user
    const activities: GeneratedActivity[] = []
    users.forEach(user => {
      const userActivities = this.generateActivities(options.activitiesPerUser, user, assets, meetings)
      activities.push(...userActivities)
    })

    const generationTime = performance.now() - startTime
    logger.info('Generated complete dataset', {
      organizations: organizations.length,
      users: users.length,
      vaults: vaults.length,
      assets: assets.length,
      meetings: meetings.length,
      activities: activities.length,
      generationTimeMs: Math.round(generationTime)
    })

    return {
      organizations,
      users,
      vaults,
      assets,
      meetings,
      activities
    }
  }

  /**
   * Generate organizations
   */
  generateOrganizations(count: number): GeneratedOrganization[] {
    const organizations: GeneratedOrganization[] = []
    const industries = [
      'Technology', 'Healthcare', 'Financial Services', 'Manufacturing', 'Retail',
      'Energy', 'Real Estate', 'Transportation', 'Media', 'Consulting',
      'Education', 'Government', 'Non-Profit'
    ]

    for (let i = 0; i < count; i++) {
      const name = faker.company.name()
      const org: GeneratedOrganization = {
        id: faker.datatype.uuid(),
        name,
        slug: this.generateSlug(name),
        description: faker.company.catchPhrase(),
        industry: faker.helpers.arrayElement(industries),
        size: faker.helpers.arrayElement(['startup', 'small', 'medium', 'large', 'enterprise']),
        type: faker.helpers.arrayElement(['public', 'private', 'nonprofit', 'government']),
        headquarters: `${faker.address.city()}, ${faker.address.stateAbbr()}`,
        website: Math.random() > 0.3 ? faker.internet.url() : undefined,
        foundedAt: faker.date.between(new Date('1980-01-01'), new Date('2020-01-01')),
        settings: this.generateOrganizationSettings(),
        complianceProfile: this.generateComplianceProfile(),
        boardStructure: this.generateBoardStructure()
      }
      
      organizations.push(org)
    }

    this.organizations = organizations
    return organizations
  }

  /**
   * Generate users
   */
  generateUsers(count: number, organizationId?: string): GeneratedUser[] {
    const users: GeneratedUser[] = []
    const roles = ['admin', 'board_member', 'executive', 'member', 'guest'] as const
    const departments = ['Board', 'Executive', 'Finance', 'Legal', 'Operations', 'HR', 'IT', 'Marketing']
    const expertiseAreas = [
      'Corporate Governance', 'Financial Management', 'Risk Management', 'Compliance',
      'Strategic Planning', 'Legal Affairs', 'Technology', 'Operations', 'Marketing',
      'Human Resources', 'Audit', 'Investment Management'
    ]

    for (let i = 0; i < count; i++) {
      const firstName = faker.name.firstName()
      const lastName = faker.name.lastName()
      
      const user: GeneratedUser = {
        id: faker.datatype.uuid(),
        email: faker.internet.email(firstName, lastName).toLowerCase(),
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        role: faker.helpers.arrayElement(roles),
        organizationId,
        profilePictureUrl: Math.random() > 0.4 ? faker.image.avatar() : undefined,
        phone: Math.random() > 0.3 ? faker.phone.number() : undefined,
        title: faker.name.jobTitle(),
        department: faker.helpers.arrayElement(departments),
        linkedinUrl: Math.random() > 0.5 ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}` : undefined,
        expertise: faker.helpers.arrayElements(expertiseAreas, Math.floor(Math.random() * 3) + 1),
        joinedAt: faker.date.between(new Date('2020-01-01'), new Date()),
        lastActiveAt: faker.date.between(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        preferences: this.generateUserPreferences(),
        biometricProfile: Math.random() > 0.7 ? this.generateBiometricProfile() : undefined
      }
      
      users.push(user)
    }

    if (organizationId) {
      const orgUsers = this.users.filter(u => u.organizationId === organizationId)
      this.users = [...orgUsers, ...users]
    } else {
      this.users = [...this.users, ...users]
    }

    return users
  }

  /**
   * Generate vaults
   */
  generateVaults(count: number, organizationId: string, users: GeneratedUser[]): GeneratedVault[] {
    const vaults: GeneratedVault[] = []
    const vaultTypes = [
      'Board Documents', 'Financial Reports', 'Legal Documents', 'Strategic Plans',
      'Meeting Minutes', 'Compliance Records', 'Audit Reports', 'Policies',
      'Executive Communications', 'Committee Materials'
    ]

    for (let i = 0; i < count; i++) {
      const name = faker.helpers.arrayElement(vaultTypes)
      const creator = faker.helpers.arrayElement(users)
      
      const vault: GeneratedVault = {
        id: faker.datatype.uuid(),
        name: `${name} ${faker.date.recent().getFullYear()}`,
        description: faker.lorem.sentence(),
        organizationId,
        createdBy: creator.id,
        createdAt: faker.date.between(new Date('2022-01-01'), new Date()),
        lastAccessedAt: faker.date.between(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        settings: this.generateVaultSettings(),
        members: this.generateVaultMembers(users),
        assetCount: 0, // Will be updated when assets are generated
        totalSize: 0,  // Will be updated when assets are generated
        accessPattern: this.generateAccessPattern(users)
      }
      
      vaults.push(vault)
    }

    this.vaults = [...this.vaults, ...vaults]
    return vaults
  }

  /**
   * Generate assets
   */
  generateAssets(count: number, vault: GeneratedVault, users: GeneratedUser[]): GeneratedAsset[] {
    const assets: GeneratedAsset[] = []
    const assetTypes = ['document', 'image', 'video', 'audio', 'archive', 'spreadsheet', 'presentation'] as const
    const categories = ['governance', 'financial', 'legal', 'strategic', 'operational', 'compliance'] as const
    
    const mimeTypeMap = {
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      image: ['image/jpeg', 'image/png', 'image/gif'],
      video: ['video/mp4', 'video/avi', 'video/mov'],
      audio: ['audio/mp3', 'audio/wav', 'audio/m4a'],
      archive: ['application/zip', 'application/x-rar-compressed'],
      spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    }

    for (let i = 0; i < count; i++) {
      const type = faker.helpers.arrayElement(assetTypes)
      const uploader = faker.helpers.arrayElement(users)
      
      const asset: GeneratedAsset = {
        id: faker.datatype.uuid(),
        name: this.generateAssetName(type, vault.name),
        description: faker.lorem.sentence(),
        type,
        category: faker.helpers.arrayElement(categories),
        fileSize: this.generateRealisticFileSize(type),
        mimeType: faker.helpers.arrayElement(mimeTypeMap[type]),
        organizationId: vault.organizationId,
        uploadedBy: uploader.id,
        uploadedAt: faker.date.between(vault.createdAt, new Date()),
        lastModifiedAt: faker.date.between(vault.createdAt, new Date()),
        vaultIds: [vault.id],
        tags: this.generateTags(type, vault.name),
        permissions: this.generateAssetPermissions(uploader, users),
        metadata: this.generateAssetMetadata(type),
        versions: this.generateAssetVersions(uploader.id, type)
      }
      
      assets.push(asset)
      
      // Update vault statistics
      vault.assetCount++
      vault.totalSize += asset.fileSize
    }

    this.assets = [...this.assets, ...assets]
    return assets
  }

  /**
   * Generate meetings
   */
  generateMeetings(count: number, organization: GeneratedOrganization, users: GeneratedUser[]): GeneratedMeeting[] {
    const meetings: GeneratedMeeting[] = []
    const meetingTypes = ['board', 'committee', 'special', 'annual', 'quarterly'] as const
    const locations = [
      'Board Room', 'Conference Room A', 'Virtual Meeting', 'Executive Suite',
      'Main Office', 'Zoom', 'Microsoft Teams', 'Google Meet'
    ]

    for (let i = 0; i < count; i++) {
      const type = faker.helpers.arrayElement(meetingTypes)
      const scheduledAt = faker.date.between(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
      const duration = faker.helpers.arrayElement([60, 90, 120, 180]) // minutes
      const startTime = scheduledAt
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000)
      
      const meeting: GeneratedMeeting = {
        id: faker.datatype.uuid(),
        title: this.generateMeetingTitle(type, organization.name),
        description: faker.lorem.sentences(2),
        type,
        organizationId: organization.id,
        scheduledAt,
        startTime,
        endTime,
        status: this.generateMeetingStatus(scheduledAt),
        location: faker.helpers.arrayElement(locations),
        meetingLink: Math.random() > 0.4 ? faker.internet.url() : undefined,
        agenda: this.generateAgenda(type),
        attendees: this.generateMeetingAttendees(users),
        resolutions: this.generateResolutions(users),
        actionItems: this.generateActionItems(users),
        minutes: Math.random() > 0.3 ? faker.lorem.paragraphs(5) : undefined,
        recordings: Math.random() > 0.6 ? this.generateRecordings() : []
      }
      
      meetings.push(meeting)
    }

    return meetings
  }

  /**
   * Generate activities
   */
  generateActivities(count: number, user: GeneratedUser, assets: GeneratedAsset[], meetings: GeneratedMeeting[]): GeneratedActivity[] {
    const activities: GeneratedActivity[] = []
    const activityTypes: ActivityType[] = ['login', 'logout', 'view', 'edit', 'create', 'delete', 'share', 'comment', 'download', 'upload']
    const categories: ActivityCategory[] = ['authentication', 'content', 'collaboration', 'governance', 'security', 'system']

    // Generate realistic activity patterns
    const userAssets = assets.filter(a => a.organizationId === user.organizationId)
    const userMeetings = meetings.filter(m => m.organizationId === user.organizationId)

    for (let i = 0; i < count; i++) {
      const activityType = faker.helpers.arrayElement(activityTypes)
      const category = this.mapActivityTypeToCategory(activityType)
      
      const activity: GeneratedActivity = {
        id: faker.datatype.uuid(),
        userId: user.id,
        organizationId: user.organizationId!,
        type: activityType,
        category,
        description: this.generateActivityDescription(activityType, user, userAssets, userMeetings),
        metadata: this.generateActivityMetadata(activityType, userAssets, userMeetings),
        timestamp: this.generateRealisticTimestamp(user),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        sessionId: faker.datatype.uuid(),
        duration: this.generateActivityDuration(activityType),
        context: this.generateActivityContext(activityType)
      }
      
      activities.push(activity)
    }

    return activities
  }

  /**
   * Generate realistic patterns and relationships
   */
  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
  }

  private generateOrganizationSettings(): OrganizationSettings {
    return {
      features: {
        aiChat: Math.random() > 0.3,
        voiceCommands: Math.random() > 0.6,
        biometricAuth: Math.random() > 0.7,
        advancedAnalytics: Math.random() > 0.4
      },
      security: {
        mfaRequired: Math.random() > 0.2,
        sessionTimeout: faker.helpers.arrayElement([30, 60, 120, 240, 480]),
        passwordPolicy: {
          minLength: faker.helpers.arrayElement([8, 10, 12]),
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: Math.random() > 0.3,
          maxAge: faker.helpers.arrayElement([90, 180, 365]),
          preventReuse: faker.helpers.arrayElement([3, 5, 10])
        }
      },
      governance: {
        approvalWorkflow: Math.random() > 0.4,
        auditTrail: Math.random() > 0.2,
        complianceTracking: Math.random() > 0.3
      }
    }
  }

  private generateComplianceProfile(): ComplianceProfile {
    const frameworks = ['SOX', 'GDPR', 'HIPAA', 'PCI-DSS', 'ISO 27001', 'NIST', 'COBIT']
    const certifications = ['SOC 2', 'ISO 9001', 'ISO 27001', 'PCI DSS', 'HIPAA']
    
    return {
      frameworks: faker.helpers.arrayElements(frameworks, Math.floor(Math.random() * 3) + 1),
      certifications: faker.helpers.arrayElements(certifications, Math.floor(Math.random() * 2) + 1),
      auditSchedule: faker.helpers.arrayElement(['quarterly', 'biannual', 'annual']),
      riskLevel: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      lastAuditDate: Math.random() > 0.3 ? faker.date.between(new Date('2022-01-01'), new Date()) : undefined,
      nextAuditDate: faker.date.between(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
    }
  }

  private generateBoardStructure(): BoardStructure {
    return {
      chairperson: faker.datatype.uuid(),
      viceChair: Math.random() > 0.3 ? faker.datatype.uuid() : undefined,
      committees: this.generateCommittees(),
      meetingFrequency: faker.helpers.arrayElement(['monthly', 'quarterly', 'biannual', 'annual']),
      quorumRequirement: faker.helpers.arrayElement([3, 4, 5, 6, 7])
    }
  }

  private generateCommittees(): Committee[] {
    const committeTypes = ['audit', 'governance', 'compensation', 'risk', 'strategic', 'nominating'] as const
    const count = Math.floor(Math.random() * 4) + 2 // 2-5 committees
    
    return faker.helpers.arrayElements(committeTypes, count).map(type => ({
      id: faker.datatype.uuid(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Committee`,
      type,
      chairId: faker.datatype.uuid(),
      memberIds: Array.from({ length: Math.floor(Math.random() * 4) + 3 }, () => faker.datatype.uuid()),
      charter: faker.lorem.paragraph()
    }))
  }

  private generateUserPreferences(): UserPreferences {
    return {
      notifications: {
        email: Math.random() > 0.2,
        push: Math.random() > 0.4,
        sms: Math.random() > 0.7,
        frequency: faker.helpers.arrayElement(['immediate', 'daily', 'weekly'])
      },
      privacy: {
        profileVisibility: faker.helpers.arrayElement(['public', 'organization', 'private']),
        activitySharing: Math.random() > 0.3
      },
      ui: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'zh']),
        timezone: faker.helpers.arrayElement(['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'])
      }
    }
  }

  private generateBiometricProfile(): BiometricProfile {
    return {
      voiceprintId: Math.random() > 0.5 ? faker.datatype.uuid() : undefined,
      faceId: Math.random() > 0.4 ? faker.datatype.uuid() : undefined,
      fingerprintId: Math.random() > 0.6 ? faker.datatype.uuid() : undefined,
      behavioralPatterns: {
        typingPattern: Array.from({ length: 10 }, () => Math.random() * 1000),
        mouseMovements: Array.from({ length: 20 }, () => Math.random() * 1920),
        navigationPatterns: faker.helpers.arrayElements(['dashboard', 'vaults', 'meetings', 'settings'], 3)
      }
    }
  }

  private generateVaultSettings(): VaultSettings {
    return {
      isPrivate: Math.random() > 0.3,
      autoArchive: Math.random() > 0.6,
      retentionDays: Math.random() > 0.4 ? faker.helpers.arrayElement([90, 180, 365, 1095, 2555]) : undefined,
      encryptionEnabled: Math.random() > 0.2,
      versioningEnabled: Math.random() > 0.4,
      approvalRequired: Math.random() > 0.5
    }
  }

  private generateVaultMembers(users: GeneratedUser[]): VaultMember[] {
    const memberCount = Math.min(Math.floor(Math.random() * 8) + 2, users.length) // 2-10 members
    const selectedUsers = faker.helpers.arrayElements(users, memberCount)
    
    return selectedUsers.map((user, index) => ({
      userId: user.id,
      role: index === 0 ? 'owner' : faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
      addedAt: faker.date.between(new Date('2022-01-01'), new Date()),
      addedBy: index === 0 ? user.id : selectedUsers[0].id,
      permissions: this.generateMemberPermissions()
    }))
  }

  private generateMemberPermissions(): string[] {
    const allPermissions = ['read', 'write', 'delete', 'share', 'invite', 'manage']
    return faker.helpers.arrayElements(allPermissions, Math.floor(Math.random() * 4) + 2)
  }

  private generateAccessPattern(users: GeneratedUser[]): AccessPattern {
    return {
      frequency: faker.helpers.arrayElement(['daily', 'weekly', 'monthly', 'rarely']),
      peakHours: faker.helpers.arrayElements([9, 10, 11, 14, 15, 16], Math.floor(Math.random() * 3) + 1),
      mostActiveUsers: faker.helpers.arrayElements(users, Math.min(3, users.length)).map(u => u.id),
      averageSessionDuration: faker.helpers.arrayElement([300, 600, 900, 1800, 3600]) // seconds
    }
  }

  private generateAssetName(type: GeneratedAsset['type'], vaultName: string): string {
    const typeTemplates = {
      document: ['Board Meeting Minutes', 'Annual Report', 'Policy Document', 'Strategic Plan', 'Compliance Report'],
      spreadsheet: ['Financial Analysis', 'Budget Report', 'Audit Results', 'Performance Metrics'],
      presentation: ['Board Presentation', 'Strategic Overview', 'Quarterly Review', 'Committee Report'],
      image: ['Organization Chart', 'Facility Photo', 'Event Photo', 'Logo Variants'],
      video: ['Board Meeting Recording', 'Training Video', 'Company Overview'],
      audio: ['Meeting Recording', 'Conference Call', 'Interview'],
      archive: ['Historical Documents', 'Backup Files', 'Legacy Data']
    }

    const template = faker.helpers.arrayElement(typeTemplates[type])
    const date = faker.date.recent().toISOString().slice(0, 7) // YYYY-MM format
    
    return `${template} - ${date}`
  }

  private generateRealisticFileSize(type: GeneratedAsset['type']): number {
    const sizeRanges = {
      document: [50000, 5000000], // 50KB - 5MB
      image: [100000, 10000000],  // 100KB - 10MB
      video: [10000000, 1000000000], // 10MB - 1GB
      audio: [1000000, 100000000],   // 1MB - 100MB
      archive: [1000000, 500000000], // 1MB - 500MB
      spreadsheet: [20000, 2000000], // 20KB - 2MB
      presentation: [500000, 50000000] // 500KB - 50MB
    }

    const [min, max] = sizeRanges[type]
    return Math.floor(Math.random() * (max - min) + min)
  }

  private generateTags(type: GeneratedAsset['type'], vaultName: string): string[] {
    const commonTags = ['important', 'confidential', 'archived', 'draft', 'final']
    const typeSpecificTags = {
      document: ['board', 'governance', 'policy', 'legal', 'compliance'],
      spreadsheet: ['financial', 'budget', 'analysis', 'metrics'],
      presentation: ['board', 'quarterly', 'strategic', 'overview'],
      image: ['photo', 'chart', 'diagram', 'logo'],
      video: ['recording', 'training', 'meeting'],
      audio: ['recording', 'call', 'meeting'],
      archive: ['backup', 'historical', 'legacy']
    }

    const relevantTags = [...commonTags, ...typeSpecificTags[type]]
    return faker.helpers.arrayElements(relevantTags, Math.floor(Math.random() * 3) + 1)
  }

  private generateAssetPermissions(uploader: GeneratedUser, users: GeneratedUser[]): AssetPermissions {
    const orgUsers = users.filter(u => u.organizationId === uploader.organizationId)
    
    return {
      owner: uploader.id,
      viewers: faker.helpers.arrayElements(orgUsers, Math.floor(Math.random() * 5)).map(u => u.id),
      editors: faker.helpers.arrayElements(orgUsers, Math.floor(Math.random() * 2)).map(u => u.id),
      commenters: faker.helpers.arrayElements(orgUsers, Math.floor(Math.random() * 3)).map(u => u.id),
      isPublic: Math.random() > 0.8,
      inheritFromVault: Math.random() > 0.3
    }
  }

  private generateAssetMetadata(type: GeneratedAsset['type']): AssetMetadata {
    return {
      author: Math.random() > 0.3 ? faker.name.fullName() : undefined,
      subject: Math.random() > 0.4 ? faker.lorem.words(3) : undefined,
      keywords: faker.lorem.words(5).split(' '),
      language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
      pageCount: type === 'document' ? Math.floor(Math.random() * 50) + 1 : undefined,
      wordCount: type === 'document' ? Math.floor(Math.random() * 5000) + 100 : undefined,
      lastPrintedAt: Math.random() > 0.7 ? faker.date.recent() : undefined,
      customFields: {
        department: faker.helpers.arrayElement(['Board', 'Finance', 'Legal', 'Operations']),
        classification: faker.helpers.arrayElement(['Public', 'Internal', 'Confidential', 'Restricted'])
      }
    }
  }

  private generateAssetVersions(uploaderId: string, type: GeneratedAsset['type']): AssetVersion[] {
    const versionCount = Math.floor(Math.random() * 3) + 1 // 1-3 versions
    const versions: AssetVersion[] = []

    for (let i = 0; i < versionCount; i++) {
      versions.push({
        version: i + 1,
        uploadedBy: uploaderId,
        uploadedAt: faker.date.recent(),
        changeLog: faker.lorem.sentence(),
        fileSize: this.generateRealisticFileSize(type),
        checksum: faker.datatype.hexaDecimal(32)
      })
    }

    return versions
  }

  private generateMeetingTitle(type: GeneratedMeeting['type'], orgName: string): string {
    const titleTemplates = {
      board: [`${orgName} Board Meeting`, 'Quarterly Board Review', 'Strategic Planning Session'],
      committee: ['Audit Committee Meeting', 'Governance Committee Review', 'Risk Committee Session'],
      special: ['Special Board Meeting', 'Emergency Session', 'Ad Hoc Committee Meeting'],
      annual: [`${orgName} Annual Meeting`, 'Annual Shareholder Meeting', 'Annual Board Retreat'],
      quarterly: ['Q1 Board Review', 'Q2 Strategic Update', 'Q3 Performance Review', 'Q4 Planning Session']
    }

    return faker.helpers.arrayElement(titleTemplates[type])
  }

  private generateMeetingStatus(scheduledAt: Date): GeneratedMeeting['status'] {
    const now = new Date()
    
    if (scheduledAt > now) return 'scheduled'
    if (scheduledAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return 'completed'
    return faker.helpers.arrayElement(['in_progress', 'completed'])
  }

  private generateAgenda(type: GeneratedMeeting['type']): AgendaItem[] {
    const agendaTemplates = {
      board: [
        'Call to Order', 'Approval of Minutes', 'Financial Report', 'CEO Update',
        'Strategic Initiatives', 'Risk Management', 'New Business', 'Adjournment'
      ],
      committee: [
        'Committee Charter Review', 'Previous Action Items', 'Key Issues Discussion',
        'Recommendations to Board', 'Next Steps'
      ],
      special: [
        'Purpose of Meeting', 'Issue Discussion', 'Decision Required', 'Action Plan'
      ],
      annual: [
        'Annual Review', 'Financial Performance', 'Strategic Plan', 'Board Elections',
        'Committee Reports', 'Future Outlook'
      ],
      quarterly: [
        'Quarterly Results', 'Performance Metrics', 'Market Update', 'Strategic Progress',
        'Risk Assessment', 'Next Quarter Planning'
      ]
    }

    const templates = agendaTemplates[type]
    return templates.map((title, index) => ({
      id: faker.datatype.uuid(),
      title,
      description: faker.lorem.sentence(),
      presenter: faker.datatype.uuid(),
      duration: faker.helpers.arrayElement([15, 30, 45, 60]),
      order: index + 1,
      attachments: Math.random() > 0.6 ? [faker.datatype.uuid()] : [],
      discussion: Math.random() > 0.4 ? faker.lorem.paragraph() : undefined,
      outcome: Math.random() > 0.5 ? faker.lorem.sentence() : undefined
    }))
  }

  private generateMeetingAttendees(users: GeneratedUser[]): MeetingAttendee[] {
    const attendeeCount = Math.min(Math.floor(Math.random() * 8) + 3, users.length) // 3-10 attendees
    const selectedUsers = faker.helpers.arrayElements(users, attendeeCount)
    
    return selectedUsers.map((user, index) => ({
      userId: user.id,
      status: faker.helpers.arrayElement(['invited', 'accepted', 'declined', 'attended', 'absent']),
      joinTime: Math.random() > 0.3 ? faker.date.recent() : undefined,
      leaveTime: Math.random() > 0.2 ? faker.date.recent() : undefined,
      role: index === 0 ? 'chair' : faker.helpers.arrayElement(['presenter', 'member', 'observer'])
    }))
  }

  private generateResolutions(users: GeneratedUser[]): Resolution[] {
    const resolutionCount = Math.floor(Math.random() * 3) // 0-2 resolutions
    const resolutions: Resolution[] = []
    
    for (let i = 0; i < resolutionCount; i++) {
      const proposer = faker.helpers.arrayElement(users)
      const resolution: Resolution = {
        id: faker.datatype.uuid(),
        title: faker.lorem.words(5),
        description: faker.lorem.paragraph(),
        proposedBy: proposer.id,
        secondedBy: Math.random() > 0.2 ? faker.helpers.arrayElement(users).id : undefined,
        status: faker.helpers.arrayElement(['proposed', 'under_discussion', 'voting', 'approved', 'rejected', 'deferred']),
        votes: this.generateVotes(users),
        approvedAt: Math.random() > 0.4 ? faker.date.recent() : undefined
      }
      resolutions.push(resolution)
    }
    
    return resolutions
  }

  private generateVotes(users: GeneratedUser[]): Vote[] {
    const voterCount = Math.min(Math.floor(Math.random() * 5) + 3, users.length)
    const voters = faker.helpers.arrayElements(users, voterCount)
    
    return voters.map(user => ({
      userId: user.id,
      vote: faker.helpers.arrayElement(['for', 'against', 'abstain']),
      comment: Math.random() > 0.6 ? faker.lorem.sentence() : undefined,
      timestamp: faker.date.recent()
    }))
  }

  private generateActionItems(users: GeneratedUser[]): ActionItem[] {
    const itemCount = Math.floor(Math.random() * 5) + 1 // 1-5 action items
    const items: ActionItem[] = []
    
    for (let i = 0; i < itemCount; i++) {
      const item: ActionItem = {
        id: faker.datatype.uuid(),
        title: faker.lorem.words(4),
        description: faker.lorem.sentence(),
        assignedTo: faker.helpers.arrayElement(users).id,
        dueDate: faker.date.between(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'overdue']),
        priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
        createdAt: faker.date.recent(),
        completedAt: Math.random() > 0.6 ? faker.date.recent() : undefined
      }
      items.push(item)
    }
    
    return items
  }

  private generateRecordings(): Recording[] {
    const recordingCount = Math.floor(Math.random() * 3) + 1 // 1-3 recordings
    const recordings: Recording[] = []
    
    for (let i = 0; i < recordingCount; i++) {
      const type = faker.helpers.arrayElement(['video', 'audio', 'transcript'])
      const recording: Recording = {
        id: faker.datatype.uuid(),
        type,
        url: faker.internet.url(),
        size: type === 'video' ? Math.floor(Math.random() * 1000000000) : Math.floor(Math.random() * 100000000),
        duration: Math.floor(Math.random() * 7200) + 1800, // 30 minutes to 2 hours
        quality: faker.helpers.arrayElement(['low', 'medium', 'high', 'hd'])
      }
      recordings.push(recording)
    }
    
    return recordings
  }

  private mapActivityTypeToCategory(type: ActivityType): ActivityCategory {
    const mapping = {
      login: 'authentication',
      logout: 'authentication',
      view: 'content',
      edit: 'content',
      create: 'content',
      delete: 'content',
      share: 'collaboration',
      comment: 'collaboration',
      download: 'content',
      upload: 'content'
    }
    
    return mapping[type] || 'system'
  }

  private generateActivityDescription(
    type: ActivityType, 
    user: GeneratedUser, 
    assets: GeneratedAsset[], 
    meetings: GeneratedMeeting[]
  ): string {
    const templates = {
      login: `${user.displayName} logged in to the system`,
      logout: `${user.displayName} logged out of the system`,
      view: `${user.displayName} viewed ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      edit: `${user.displayName} edited ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      create: `${user.displayName} created a new document`,
      delete: `${user.displayName} deleted ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      share: `${user.displayName} shared ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      comment: `${user.displayName} commented on ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      download: `${user.displayName} downloaded ${faker.helpers.arrayElement(assets)?.name || 'a document'}`,
      upload: `${user.displayName} uploaded a new document`
    }
    
    return templates[type]
  }

  private generateActivityMetadata(
    type: ActivityType, 
    assets: GeneratedAsset[], 
    meetings: GeneratedMeeting[]
  ): ActivityMetadata {
    const metadata: ActivityMetadata = {
      deviceInfo: {
        type: faker.helpers.arrayElement(['desktop', 'mobile', 'tablet']),
        os: faker.helpers.arrayElement(['Windows', 'macOS', 'iOS', 'Android', 'Linux']),
        browser: faker.helpers.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        screenResolution: faker.helpers.arrayElement(['1920x1080', '1366x768', '414x896', '375x667'])
      }
    }

    if (['view', 'edit', 'delete', 'share', 'comment', 'download'].includes(type) && assets.length > 0) {
      const asset = faker.helpers.arrayElement(assets)
      metadata.objectId = asset.id
      metadata.objectType = 'asset'
    }

    if (type === 'edit') {
      metadata.changes = {
        fieldsModified: faker.helpers.arrayElements(['name', 'description', 'tags'], Math.floor(Math.random() * 3) + 1),
        changeCount: Math.floor(Math.random() * 10) + 1
      }
    }

    return metadata
  }

  private generateRealisticTimestamp(user: GeneratedUser): Date {
    // Generate activity during business hours with some variation
    const now = new Date()
    const daysBack = Math.floor(Math.random() * 30) // Last 30 days
    const activityDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    
    // Business hours: 8 AM to 6 PM with some variation
    const businessHour = Math.floor(Math.random() * 10) + 8 // 8-18
    const minute = Math.floor(Math.random() * 60)
    
    activityDate.setHours(businessHour, minute, 0, 0)
    
    return activityDate
  }

  private generateActivityDuration(type: ActivityType): number | undefined {
    const durations = {
      login: undefined,
      logout: undefined,
      view: Math.floor(Math.random() * 600) + 30, // 30 seconds to 10 minutes
      edit: Math.floor(Math.random() * 3600) + 300, // 5 minutes to 1 hour
      create: Math.floor(Math.random() * 1800) + 600, // 10 minutes to 30 minutes
      delete: Math.floor(Math.random() * 60) + 5, // 5 seconds to 1 minute
      share: Math.floor(Math.random() * 300) + 30, // 30 seconds to 5 minutes
      comment: Math.floor(Math.random() * 600) + 60, // 1 minute to 10 minutes
      download: Math.floor(Math.random() * 180) + 10, // 10 seconds to 3 minutes
      upload: Math.floor(Math.random() * 1200) + 120 // 2 minutes to 20 minutes
    }
    
    return durations[type]
  }

  private generateActivityContext(type: ActivityType): ActivityContext {
    const features = ['dashboard', 'vaults', 'meetings', 'assets', 'admin', 'profile']
    const locations = ['/dashboard', '/vaults', '/meetings', '/assets', '/admin', '/profile']
    
    return {
      feature: faker.helpers.arrayElement(features),
      location: faker.helpers.arrayElement(locations),
      referrer: Math.random() > 0.3 ? faker.internet.url() : undefined,
      searchQuery: Math.random() > 0.7 ? faker.lorem.words(2) : undefined,
      filters: Math.random() > 0.8 ? {
        category: faker.lorem.word(),
        dateRange: 'last_30_days'
      } : undefined
    }
  }
}

// Export singleton instance and factory function
export const testDataGenerator = new EnhancedTestDataGenerator()

export function createTestDataGenerator(config?: GeneratorConfig): EnhancedTestDataGenerator {
  return new EnhancedTestDataGenerator(config)
}

// Utility functions for common test scenarios
export function generateMockDataset(size: 'small' | 'medium' | 'large' = 'medium') {
  const configs = {
    small: {
      organizations: 2,
      usersPerOrg: 5,
      vaultsPerOrg: 3,
      assetsPerVault: 10,
      meetingsPerOrg: 5,
      activitiesPerUser: 50
    },
    medium: {
      organizations: 5,
      usersPerOrg: 10,
      vaultsPerOrg: 5,
      assetsPerVault: 20,
      meetingsPerOrg: 12,
      activitiesPerUser: 100
    },
    large: {
      organizations: 10,
      usersPerOrg: 20,
      vaultsPerOrg: 8,
      assetsPerVault: 50,
      meetingsPerOrg: 24,
      activitiesPerUser: 200
    }
  }

  return testDataGenerator.generateCompleteDataset(configs[size])
}

export function generateBoardGovernanceDataset() {
  const generator = createTestDataGenerator({
    seed: 12345,
    realisticPatterns: true,
    complexityLevel: 'complex'
  })

  return generator.generateCompleteDataset({
    organizations: 1,
    usersPerOrg: 15,
    vaultsPerOrg: 8,
    assetsPerVault: 30,
    meetingsPerOrg: 12,
    activitiesPerUser: 150
  })
}