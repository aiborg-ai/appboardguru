/**
 * Board Governance Property Test Generators
 * Domain-specific generators for board governance entities and business rules
 */

import { PropertyGenerator, SeededRandom, Invariant } from './property-test-framework'
import { Result, Ok, Err } from '../../lib/result'
import type { AppError } from '../../lib/result/types'

// Domain-specific types for governance testing
export interface GovernanceUser {
  id: string
  email: string
  role: 'board_member' | 'executive' | 'admin' | 'member' | 'observer'
  permissions: string[]
  organizationId: string
  isActive: boolean
  joinedAt: Date
  lastActiveAt: Date
}

export interface GovernanceOrganization {
  id: string
  name: string
  type: 'public' | 'private' | 'nonprofit' | 'government'
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  boardSize: number
  quorumRequirement: number
  memberCount: number
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'enterprise'
}

export interface GovernanceAsset {
  id: string
  name: string
  type: 'document' | 'image' | 'video' | 'archive'
  category: 'governance' | 'financial' | 'legal' | 'strategic' | 'operational'
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
  size: number
  organizationId: string
  uploadedBy: string
  permissions: AssetPermissions
  vaultIds: string[]
}

export interface AssetPermissions {
  owner: string
  viewers: string[]
  editors: string[]
  commenters: string[]
  isPublic: boolean
}

export interface GovernanceMeeting {
  id: string
  title: string
  type: 'board' | 'committee' | 'special' | 'annual' | 'emergency'
  organizationId: string
  scheduledAt: Date
  duration: number
  attendees: MeetingAttendee[]
  quorumMet: boolean
  hasMinutes: boolean
  resolutionsCount: number
  actionItemsCount: number
}

export interface MeetingAttendee {
  userId: string
  status: 'invited' | 'accepted' | 'declined' | 'attended' | 'absent'
  role: 'chair' | 'secretary' | 'member' | 'observer'
  joinedAt?: Date
  leftAt?: Date
}

export interface GovernanceVault {
  id: string
  name: string
  organizationId: string
  isPrivate: boolean
  memberCount: number
  assetCount: number
  totalSize: number
  encryptionEnabled: boolean
  retentionDays?: number
  accessLevel: 'open' | 'restricted' | 'secure'
}

// Generators for governance entities

export const UserGenerator: PropertyGenerator<GovernanceUser> = {
  name: 'GovernanceUser',
  generate: (rng: SeededRandom, size: number): GovernanceUser => {
    const roles: GovernanceUser['role'][] = ['board_member', 'executive', 'admin', 'member', 'observer']
    const role = rng.element(roles)
    const permissions = generatePermissions(rng, role, size)
    
    return {
      id: `user_${rng.string(8)}`,
      email: `${rng.string(8)}@example.com`,
      role,
      permissions,
      organizationId: `org_${rng.string(6)}`,
      isActive: rng.boolean(),
      joinedAt: new Date(Date.now() - rng.integer(0, 365 * 24 * 60 * 60 * 1000)),
      lastActiveAt: new Date(Date.now() - rng.integer(0, 30 * 24 * 60 * 60 * 1000))
    }
  },
  shrink: (user: GovernanceUser): GovernanceUser[] => {
    const shrunk: GovernanceUser[] = []
    
    // Reduce permissions
    if (user.permissions.length > 1) {
      shrunk.push({ ...user, permissions: user.permissions.slice(0, -1) })
    }
    if (user.permissions.length > 0) {
      shrunk.push({ ...user, permissions: [] })
    }
    
    // Change to less privileged role
    if (user.role !== 'observer') {
      shrunk.push({ ...user, role: 'observer' })
    }
    
    return shrunk
  },
  isValid: (user: GovernanceUser): boolean => {
    return !!(user.id && user.email && user.organizationId && 
             user.email.includes('@') && 
             user.joinedAt <= new Date() &&
             user.lastActiveAt >= user.joinedAt)
  }
}

export const OrganizationGenerator: PropertyGenerator<GovernanceOrganization> = {
  name: 'GovernanceOrganization',
  generate: (rng: SeededRandom, size: number): GovernanceOrganization => {
    const types: GovernanceOrganization['type'][] = ['public', 'private', 'nonprofit', 'government']
    const sizes: GovernanceOrganization['size'][] = ['startup', 'small', 'medium', 'large', 'enterprise']
    const complianceLevels: GovernanceOrganization['complianceLevel'][] = ['basic', 'standard', 'enhanced', 'enterprise']
    
    const boardSize = Math.max(3, rng.integer(3, Math.min(15, size + 2)))
    const memberCount = Math.max(boardSize, rng.integer(boardSize, size * 10 + 5))
    
    return {
      id: `org_${rng.string(8)}`,
      name: `Organization ${rng.string(6)}`,
      type: rng.element(types),
      size: rng.element(sizes),
      boardSize,
      quorumRequirement: Math.max(2, Math.floor(boardSize * 0.5) + 1),
      memberCount,
      complianceLevel: rng.element(complianceLevels)
    }
  },
  shrink: (org: GovernanceOrganization): GovernanceOrganization[] => {
    const shrunk: GovernanceOrganization[] = []
    
    // Reduce board size
    if (org.boardSize > 3) {
      const newBoardSize = Math.max(3, org.boardSize - 1)
      shrunk.push({
        ...org,
        boardSize: newBoardSize,
        quorumRequirement: Math.max(2, Math.floor(newBoardSize * 0.5) + 1),
        memberCount: Math.max(newBoardSize, org.memberCount)
      })
    }
    
    // Reduce member count
    if (org.memberCount > org.boardSize) {
      shrunk.push({ ...org, memberCount: Math.max(org.boardSize, org.memberCount - 1) })
    }
    
    return shrunk
  },
  isValid: (org: GovernanceOrganization): boolean => {
    return !!(org.id && org.name && 
             org.boardSize >= 3 && 
             org.memberCount >= org.boardSize &&
             org.quorumRequirement >= 2 && 
             org.quorumRequirement <= org.boardSize)
  }
}

export const AssetGenerator: PropertyGenerator<GovernanceAsset> = {
  name: 'GovernanceAsset',
  generate: (rng: SeededRandom, size: number): GovernanceAsset => {
    const types: GovernanceAsset['type'][] = ['document', 'image', 'video', 'archive']
    const categories: GovernanceAsset['category'][] = ['governance', 'financial', 'legal', 'strategic', 'operational']
    const confidentialityLevels: GovernanceAsset['confidentialityLevel'][] = ['public', 'internal', 'confidential', 'restricted']
    
    const type = rng.element(types)
    const fileSize = generateRealisticFileSize(rng, type, size)
    const vaultCount = rng.integer(1, Math.max(1, size))
    
    return {
      id: `asset_${rng.string(8)}`,
      name: `Document ${rng.string(6)}.${getFileExtension(type)}`,
      type,
      category: rng.element(categories),
      confidentialityLevel: rng.element(confidentialityLevels),
      size: fileSize,
      organizationId: `org_${rng.string(6)}`,
      uploadedBy: `user_${rng.string(6)}`,
      permissions: generateAssetPermissions(rng, size),
      vaultIds: Array.from({ length: vaultCount }, () => `vault_${rng.string(6)}`)
    }
  },
  shrink: (asset: GovernanceAsset): GovernanceAsset[] => {
    const shrunk: GovernanceAsset[] = []
    
    // Reduce file size
    if (asset.size > 1024) {
      shrunk.push({ ...asset, size: Math.max(1024, Math.floor(asset.size / 2)) })
    }
    
    // Reduce vault count
    if (asset.vaultIds.length > 1) {
      shrunk.push({ ...asset, vaultIds: asset.vaultIds.slice(0, -1) })
    }
    
    // Reduce permissions
    if (asset.permissions.viewers.length > 0) {
      shrunk.push({
        ...asset,
        permissions: { ...asset.permissions, viewers: asset.permissions.viewers.slice(0, -1) }
      })
    }
    
    return shrunk
  },
  isValid: (asset: GovernanceAsset): boolean => {
    return !!(asset.id && asset.name && asset.organizationId && asset.uploadedBy &&
             asset.size > 0 && asset.vaultIds.length > 0 &&
             asset.permissions.owner)
  }
}

export const MeetingGenerator: PropertyGenerator<GovernanceMeeting> = {
  name: 'GovernanceMeeting',
  generate: (rng: SeededRandom, size: number): GovernanceMeeting => {
    const types: GovernanceMeeting['type'][] = ['board', 'committee', 'special', 'annual', 'emergency']
    const type = rng.element(types)
    
    const attendeeCount = Math.max(3, rng.integer(3, size + 5))
    const attendees = Array.from({ length: attendeeCount }, () => generateAttendee(rng))
    const attendedCount = attendees.filter(a => a.status === 'attended').length
    const quorumMet = attendedCount >= Math.max(2, Math.floor(attendeeCount * 0.5) + 1)
    
    return {
      id: `meeting_${rng.string(8)}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Meeting ${rng.string(4)}`,
      type,
      organizationId: `org_${rng.string(6)}`,
      scheduledAt: new Date(Date.now() + rng.integer(-30, 30) * 24 * 60 * 60 * 1000),
      duration: rng.integer(30, 180), // 30 minutes to 3 hours
      attendees,
      quorumMet,
      hasMinutes: rng.boolean(),
      resolutionsCount: rng.integer(0, Math.max(5, size)),
      actionItemsCount: rng.integer(0, Math.max(10, size * 2))
    }
  },
  shrink: (meeting: GovernanceMeeting): GovernanceMeeting[] => {
    const shrunk: GovernanceMeeting[] = []
    
    // Reduce attendees
    if (meeting.attendees.length > 3) {
      const newAttendees = meeting.attendees.slice(0, -1)
      const attendedCount = newAttendees.filter(a => a.status === 'attended').length
      const quorumMet = attendedCount >= Math.max(2, Math.floor(newAttendees.length * 0.5) + 1)
      
      shrunk.push({
        ...meeting,
        attendees: newAttendees,
        quorumMet
      })
    }
    
    // Reduce duration
    if (meeting.duration > 30) {
      shrunk.push({ ...meeting, duration: Math.max(30, meeting.duration - 15) })
    }
    
    // Reduce resolutions and action items
    if (meeting.resolutionsCount > 0) {
      shrunk.push({ ...meeting, resolutionsCount: meeting.resolutionsCount - 1 })
    }
    if (meeting.actionItemsCount > 0) {
      shrunk.push({ ...meeting, actionItemsCount: meeting.actionItemsCount - 1 })
    }
    
    return shrunk
  },
  isValid: (meeting: GovernanceMeeting): boolean => {
    return !!(meeting.id && meeting.title && meeting.organizationId &&
             meeting.attendees.length >= 3 && meeting.duration >= 30 &&
             meeting.resolutionsCount >= 0 && meeting.actionItemsCount >= 0)
  }
}

export const VaultGenerator: PropertyGenerator<GovernanceVault> = {
  name: 'GovernanceVault',
  generate: (rng: SeededRandom, size: number): GovernanceVault => {
    const accessLevels: GovernanceVault['accessLevel'][] = ['open', 'restricted', 'secure']
    const memberCount = rng.integer(1, Math.max(1, size + 2))
    const assetCount = rng.integer(0, size * 10)
    const averageAssetSize = 1024 * 1024 // 1MB average
    
    return {
      id: `vault_${rng.string(8)}`,
      name: `Vault ${rng.string(6)}`,
      organizationId: `org_${rng.string(6)}`,
      isPrivate: rng.boolean(),
      memberCount,
      assetCount,
      totalSize: assetCount * averageAssetSize * rng.float(0.1, 2.0),
      encryptionEnabled: rng.boolean(),
      retentionDays: rng.boolean() ? rng.integer(30, 365 * 7) : undefined,
      accessLevel: rng.element(accessLevels)
    }
  },
  shrink: (vault: GovernanceVault): GovernanceVault[] => {
    const shrunk: GovernanceVault[] = []
    
    // Reduce member count
    if (vault.memberCount > 1) {
      shrunk.push({ ...vault, memberCount: vault.memberCount - 1 })
    }
    
    // Reduce asset count
    if (vault.assetCount > 0) {
      const newAssetCount = vault.assetCount - 1
      shrunk.push({
        ...vault,
        assetCount: newAssetCount,
        totalSize: newAssetCount === 0 ? 0 : vault.totalSize * (newAssetCount / vault.assetCount)
      })
    }
    
    return shrunk
  },
  isValid: (vault: GovernanceVault): boolean => {
    return !!(vault.id && vault.name && vault.organizationId &&
             vault.memberCount >= 1 && vault.assetCount >= 0 &&
             vault.totalSize >= 0 && (vault.assetCount === 0 || vault.totalSize > 0))
  }
}

// Business Rule Invariants for Governance Domain

export const GovernanceInvariants = {
  // User invariants
  UserRolePermissions: {
    name: 'User permissions match role',
    description: 'User permissions should be consistent with their role level',
    category: 'business-rule' as const,
    critical: true,
    check: (input: GovernanceUser): Result<boolean, AppError> => {
      const expectedPermissions = getExpectedPermissions(input.role)
      const hasRequiredPermissions = expectedPermissions.every(perm => 
        input.permissions.includes(perm)
      )
      
      return Ok(hasRequiredPermissions)
    }
  },

  ActiveUserRequirements: {
    name: 'Active users must have recent activity',
    description: 'Active users should have logged in within the last 90 days',
    category: 'business-rule' as const,
    critical: false,
    check: (input: GovernanceUser): Result<boolean, AppError> => {
      if (!input.isActive) return Ok(true)
      
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      return Ok(input.lastActiveAt > ninetyDaysAgo)
    }
  },

  // Organization invariants
  QuorumRequirements: {
    name: 'Quorum requirement is valid',
    description: 'Quorum should be at least half of board members plus one',
    category: 'business-rule' as const,
    critical: true,
    check: (input: GovernanceOrganization): Result<boolean, AppError> => {
      const minimumQuorum = Math.floor(input.boardSize / 2) + 1
      const maximumQuorum = input.boardSize
      
      return Ok(input.quorumRequirement >= minimumQuorum && 
                input.quorumRequirement <= maximumQuorum)
    }
  },

  BoardSizeRequirements: {
    name: 'Board size meets governance requirements',
    description: 'Board must have at least 3 members and member count must be at least board size',
    category: 'business-rule' as const,
    critical: true,
    check: (input: GovernanceOrganization): Result<boolean, AppError> => {
      return Ok(input.boardSize >= 3 && input.memberCount >= input.boardSize)
    }
  },

  // Meeting invariants
  MeetingQuorumValidation: {
    name: 'Meeting quorum validation',
    description: 'Quorum status should match actual attendance',
    category: 'business-rule' as const,
    critical: true,
    check: (input: GovernanceMeeting): Result<boolean, AppError> => {
      const attendedCount = input.attendees.filter(a => a.status === 'attended').length
      const requiredQuorum = Math.floor(input.attendees.length / 2) + 1
      const expectedQuorumMet = attendedCount >= requiredQuorum
      
      return Ok(input.quorumMet === expectedQuorumMet)
    }
  },

  MeetingDurationReasonableness: {
    name: 'Meeting duration is reasonable',
    description: 'Meeting duration should be between 30 minutes and 8 hours',
    category: 'business-rule' as const,
    critical: false,
    check: (input: GovernanceMeeting): Result<boolean, AppError> => {
      return Ok(input.duration >= 30 && input.duration <= 480)
    }
  },

  // Asset invariants
  AssetPermissionConsistency: {
    name: 'Asset permission consistency',
    description: 'Asset owner should have all permissions and not be in other permission lists',
    category: 'business-rule' as const,
    critical: true,
    check: (input: GovernanceAsset): Result<boolean, AppError> => {
      const permissions = input.permissions
      const ownerInOtherLists = permissions.viewers.includes(permissions.owner) ||
                               permissions.editors.includes(permissions.owner) ||
                               permissions.commenters.includes(permissions.owner)
      
      return Ok(!ownerInOtherLists && permissions.owner.length > 0)
    }
  },

  AssetSizeReasonableness: {
    name: 'Asset size is reasonable',
    description: 'Asset size should be within reasonable limits for its type',
    category: 'business-rule' as const,
    critical: false,
    check: (input: GovernanceAsset): Result<boolean, AppError> => {
      const maxSizes = {
        document: 50 * 1024 * 1024, // 50MB
        image: 20 * 1024 * 1024,    // 20MB
        video: 2 * 1024 * 1024 * 1024, // 2GB
        archive: 500 * 1024 * 1024   // 500MB
      }
      
      const maxSize = maxSizes[input.type] || 100 * 1024 * 1024
      return Ok(input.size > 0 && input.size <= maxSize)
    }
  },

  // Vault invariants
  VaultCapacityConsistency: {
    name: 'Vault capacity consistency',
    description: 'Vault total size should be reasonable for asset count',
    category: 'data-integrity' as const,
    critical: false,
    check: (input: GovernanceVault): Result<boolean, AppError> => {
      if (input.assetCount === 0) {
        return Ok(input.totalSize === 0)
      }
      
      const averageSize = input.totalSize / input.assetCount
      const reasonableMin = 1024 // 1KB
      const reasonableMax = 1024 * 1024 * 1024 // 1GB
      
      return Ok(averageSize >= reasonableMin && averageSize <= reasonableMax)
    }
  }
}

// Helper functions

function generatePermissions(rng: SeededRandom, role: GovernanceUser['role'], size: number): string[] {
  const basePermissions = getExpectedPermissions(role)
  const additionalPermissions = ['export_data', 'bulk_operations', 'advanced_search', 'api_access']
  
  // Add some additional permissions based on size
  const extraCount = Math.min(additionalPermissions.length, Math.floor(size / 2))
  const extraPermissions = []
  
  for (let i = 0; i < extraCount; i++) {
    if (rng.boolean()) {
      const perm = rng.element(additionalPermissions)
      if (!extraPermissions.includes(perm)) {
        extraPermissions.push(perm)
      }
    }
  }
  
  return [...basePermissions, ...extraPermissions]
}

function getExpectedPermissions(role: GovernanceUser['role']): string[] {
  const permissions: Record<GovernanceUser['role'], string[]> = {
    'board_member': ['read_governance', 'vote', 'view_financials', 'access_board_materials'],
    'executive': ['read_all', 'write_reports', 'manage_operations', 'view_analytics'],
    'admin': ['manage_users', 'manage_system', 'full_access', 'audit_logs'],
    'member': ['read_basic', 'comment', 'participate'],
    'observer': ['read_public']
  }
  return permissions[role] || []
}

function generateAssetPermissions(rng: SeededRandom, size: number): AssetPermissions {
  const viewerCount = rng.integer(0, Math.max(1, size))
  const editorCount = rng.integer(0, Math.max(1, Math.floor(size / 2)))
  const commenterCount = rng.integer(0, Math.max(1, size))
  
  return {
    owner: `user_${rng.string(6)}`,
    viewers: Array.from({ length: viewerCount }, () => `user_${rng.string(6)}`),
    editors: Array.from({ length: editorCount }, () => `user_${rng.string(6)}`),
    commenters: Array.from({ length: commenterCount }, () => `user_${rng.string(6)}`),
    isPublic: rng.boolean()
  }
}

function generateAttendee(rng: SeededRandom): MeetingAttendee {
  const statuses: MeetingAttendee['status'][] = ['invited', 'accepted', 'declined', 'attended', 'absent']
  const roles: MeetingAttendee['role'][] = ['chair', 'secretary', 'member', 'observer']
  
  const status = rng.element(statuses)
  const hasJoined = status === 'attended'
  
  return {
    userId: `user_${rng.string(6)}`,
    status,
    role: rng.element(roles),
    joinedAt: hasJoined ? new Date(Date.now() - rng.integer(0, 180 * 60 * 1000)) : undefined,
    leftAt: hasJoined && rng.boolean() ? new Date(Date.now() - rng.integer(0, 60 * 60 * 1000)) : undefined
  }
}

function generateRealisticFileSize(rng: SeededRandom, type: GovernanceAsset['type'], size: number): number {
  const baseSizes = {
    document: [50_000, 5_000_000], // 50KB - 5MB
    image: [100_000, 10_000_000],  // 100KB - 10MB
    video: [10_000_000, 100_000_000], // 10MB - 100MB
    archive: [1_000_000, 50_000_000]  // 1MB - 50MB
  }
  
  const [min, max] = baseSizes[type] || baseSizes.document
  const sizeMultiplier = 1 + (size / 10) // Increase max size based on test size
  
  return rng.integer(min, Math.floor(max * sizeMultiplier))
}

function getFileExtension(type: GovernanceAsset['type']): string {
  const extensions = {
    document: 'pdf',
    image: 'png',
    video: 'mp4',
    archive: 'zip'
  }
  return extensions[type] || 'txt'
}