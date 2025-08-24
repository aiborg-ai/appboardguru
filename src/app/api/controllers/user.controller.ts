/**
 * User Controller
 * Consolidated controller for all user management and user-related features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates user-related API routes into a single controller:
 * - User profile management and preferences
 * - User authentication and security settings
 * - User activity tracking and analytics
 * - User onboarding and role management
 * - User permissions and access control
 * - User notifications and communication preferences
 * - User directory and search functionality
 * - User performance and engagement metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UserRepository } from '@/lib/repositories/user.repository'
import { UserService } from '@/lib/services/user.service'
import { SecurityService } from '@/lib/services/security.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// User Types
export interface UserProfile {
  id: string
  email: string
  personalInfo: {
    firstName?: string
    lastName?: string
    displayName?: string
    title?: string
    department?: string
    phoneNumber?: string
    location?: string
    timezone: string
    language: string
    avatar?: string
    bio?: string
  }
  workInfo: {
    startDate?: string
    employeeId?: string
    manager?: string
    directReports: string[]
    skills: string[]
    certifications: Array<{
      name: string
      issuer: string
      dateEarned: string
      expirationDate?: string
      credentialId?: string
    }>
    experience: Array<{
      title: string
      company: string
      startDate: string
      endDate?: string
      description?: string
    }>
  }
  preferences: {
    notifications: {
      email: boolean
      inApp: boolean
      sms: boolean
      frequency: 'immediate' | 'daily' | 'weekly'
      categories: {
        meetings: boolean
        documents: boolean
        compliance: boolean
        mentions: boolean
        deadlines: boolean
      }
    }
    privacy: {
      profileVisibility: 'public' | 'organization' | 'private'
      allowDirectMessages: boolean
      showOnlineStatus: boolean
      allowCalendarSharing: boolean
    }
    interface: {
      theme: 'light' | 'dark' | 'auto'
      density: 'comfortable' | 'compact'
      defaultView: 'dashboard' | 'vaults' | 'meetings' | 'tasks'
      enableKeyboardShortcuts: boolean
      showTooltips: boolean
    }
  }
  organizations: Array<{
    organizationId: string
    role: 'owner' | 'admin' | 'member' | 'guest'
    joinedAt: string
    status: 'active' | 'invited' | 'suspended'
    permissions: string[]
  }>
  security: {
    mfaEnabled: boolean
    mfaMethods: Array<{
      type: 'totp' | 'sms' | 'email' | 'hardware'
      verified: boolean
      primary: boolean
    }>
    sessions: Array<{
      id: string
      device: string
      location: string
      lastActive: string
      current: boolean
    }>
    passwordLastChanged?: string
    loginAttempts: number
    lastLoginAt?: string
    accountLocked: boolean
    lockoutExpires?: string
  }
  activity: {
    lastActiveAt: string
    totalLogins: number
    documentsCreated: number
    meetingsAttended: number
    tasksCompleted: number
    collaborationScore: number // 1-100
    engagementLevel: 'low' | 'medium' | 'high'
  }
  status: 'active' | 'inactive' | 'suspended' | 'deactivated'
  metadata: {
    createdAt: string
    updatedAt: string
    lastProfileUpdate?: string
    onboardingCompleted: boolean
    termsAcceptedAt?: string
    privacyPolicyAcceptedAt?: string
  }
}

interface UserInvitation {
  id?: string
  email: string
  organizationId: string
  invitedBy: string
  role: 'admin' | 'member' | 'guest'
  permissions: string[]
  personalMessage?: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  invitationToken: string
  metadata: {
    sentAt: string
    remindersSent: number
    lastReminderAt?: string
  }
}

interface UserDirectory {
  users: Array<{
    id: string
    displayName: string
    email?: string
    title?: string
    department?: string
    avatar?: string
    status: 'online' | 'offline' | 'away' | 'busy'
    lastActiveAt: string
    skills?: string[]
    location?: string
  }>
  totalCount: number
  filters: {
    departments: string[]
    skills: string[]
    locations: string[]
    roles: string[]
  }
}

interface UserAnalytics {
  userId: string
  period: {
    startDate: string
    endDate: string
  }
  engagement: {
    loginFrequency: number
    sessionDuration: number // average minutes
    pageViews: number
    featuresUsed: string[]
    documentsInteraction: {
      created: number
      viewed: number
      shared: number
      commented: number
    }
    meetingsParticipation: {
      organized: number
      attended: number
      averageAttendance: number // percentage
    }
  }
  productivity: {
    tasksCompleted: number
    deadlinesMet: number // percentage
    collaborationEvents: number
    knowledgeSharing: number
    helpRequests: number
    helpProvided: number
  }
  compliance: {
    trainingCompleted: number
    certificationStatus: 'current' | 'expiring' | 'expired'
    policyAcknowledgments: number
    riskAssessments: number
  }
  feedback: {
    ratingsGiven: number
    ratingsReceived: number
    averageRating: number // 1-5
    testimonials: number
  }
}

interface UserSecurityAudit {
  userId: string
  auditPeriod: {
    startDate: string
    endDate: string
  }
  loginActivity: Array<{
    timestamp: string
    ipAddress: string
    location: string
    device: string
    success: boolean
    riskScore: number // 1-100
  }>
  permissionChanges: Array<{
    timestamp: string
    changedBy: string
    oldPermissions: string[]
    newPermissions: string[]
    reason?: string
  }>
  securityEvents: Array<{
    timestamp: string
    eventType: 'password_change' | 'mfa_setup' | 'suspicious_activity' | 'policy_violation'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    resolved: boolean
  }>
  recommendations: Array<{
    type: 'security' | 'compliance' | 'best_practice'
    priority: 'low' | 'medium' | 'high'
    description: string
    actionRequired: boolean
  }>
}

// Validation Schemas
const userProfileSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().max(50, 'First name too long').optional(),
    lastName: z.string().max(50, 'Last name too long').optional(),
    displayName: z.string().max(100, 'Display name too long').optional(),
    title: z.string().max(100, 'Title too long').optional(),
    department: z.string().max(100, 'Department too long').optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    location: z.string().max(100, 'Location too long').optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    language: z.string().min(2, 'Language is required'),
    avatar: z.string().url('Invalid avatar URL').optional(),
    bio: z.string().max(500, 'Bio too long').optional()
  }),
  workInfo: z.object({
    startDate: z.string().datetime().optional(),
    employeeId: z.string().max(50, 'Employee ID too long').optional(),
    manager: z.string().optional(),
    skills: z.array(z.string()).max(20, 'Too many skills').default([]),
    certifications: z.array(z.object({
      name: z.string(),
      issuer: z.string(),
      dateEarned: z.string().datetime(),
      expirationDate: z.string().datetime().optional(),
      credentialId: z.string().optional()
    })).default([]),
    experience: z.array(z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
      description: z.string().max(500, 'Description too long').optional()
    })).default([])
  }),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean(),
      inApp: z.boolean(),
      sms: z.boolean(),
      frequency: z.enum(['immediate', 'daily', 'weekly']),
      categories: z.object({
        meetings: z.boolean(),
        documents: z.boolean(),
        compliance: z.boolean(),
        mentions: z.boolean(),
        deadlines: z.boolean()
      })
    }),
    privacy: z.object({
      profileVisibility: z.enum(['public', 'organization', 'private']),
      allowDirectMessages: z.boolean(),
      showOnlineStatus: z.boolean(),
      allowCalendarSharing: z.boolean()
    }),
    interface: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      density: z.enum(['comfortable', 'compact']),
      defaultView: z.enum(['dashboard', 'vaults', 'meetings', 'tasks']),
      enableKeyboardShortcuts: z.boolean(),
      showTooltips: z.boolean()
    })
  })
})

const userInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  role: z.enum(['admin', 'member', 'guest']),
  permissions: z.array(z.string()).default([]),
  personalMessage: z.string().max(500, 'Message too long').optional(),
  expiresAt: z.string().datetime().optional()
})

const bulkInvitationSchema = z.object({
  invitations: z.array(userInvitationSchema).min(1).max(50),
  organizationId: z.string().min(1, 'Organization ID is required')
})

const userSecuritySettingsSchema = z.object({
  mfaEnabled: z.boolean(),
  mfaMethods: z.array(z.object({
    type: z.enum(['totp', 'sms', 'email', 'hardware']),
    primary: z.boolean()
  })),
  passwordRequirements: z.object({
    requirePasswordChange: z.boolean(),
    passwordExpiryDays: z.number().min(30).max(365).optional()
  }).optional()
})

export class UserController {
  private userService: UserService
  private securityService: SecurityService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.userService = new UserService(this.repositoryFactory)
    this.securityService = new SecurityService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/users/profile
   * Get current user's profile
   */
  async getCurrentUserProfile(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const profileResult = await this.userService.getUserProfile({
        userId: createUserId(user.id)
      })

      if (!profileResult.success) {
        return NextResponse.json(
          { success: false, error: profileResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: profileResult.data
      })

    } catch (error) {
      logError('User profile retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Profile retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/users/profile
   * Update current user's profile
   */
  async updateUserProfile(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, userProfileSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      const profileResult = await this.userService.updateUserProfile({
        userId: createUserId(user.id),
        updateData
      })

      if (!profileResult.success) {
        return NextResponse.json(
          { success: false, error: profileResult.error },
          { status: 500 }
        )
      }

      // Log profile update
      await logActivity({
        userId: user.id,
        action: 'profile_updated',
        details: {
          fieldsUpdated: Object.keys(updateData)
        }
      })

      return NextResponse.json({
        success: true,
        data: profileResult.data
      })

    } catch (error) {
      logError('User profile update failed', error)
      return NextResponse.json(
        { success: false, error: 'Profile update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/users/directory
   * Get user directory with search and filtering
   */
  async getUserDirectory(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const search = url.searchParams.get('search')
      const department = url.searchParams.get('department')
      const skills = url.searchParams.getAll('skills')
      const location = url.searchParams.get('location')
      const role = url.searchParams.get('role')
      const status = url.searchParams.get('status')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const directoryResult = await this.userService.getUserDirectory({
        requestingUserId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        search,
        filters: {
          department,
          skills,
          location,
          role,
          status
        },
        limit,
        offset
      })

      if (!directoryResult.success) {
        return NextResponse.json(
          { success: false, error: directoryResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: directoryResult.data
      })

    } catch (error) {
      logError('User directory retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Directory retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/users/[id]
   * Get a specific user's profile
   */
  async getUserProfile(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const profileResult = await this.userService.getUserProfile({
        userId: createUserId(userId),
        requestingUserId: createUserId(user.id)
      })

      if (!profileResult.success) {
        return NextResponse.json(
          { success: false, error: profileResult.error },
          { status: profileResult.error === 'User not found' ? 404 : 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: profileResult.data
      })

    } catch (error) {
      logError('User profile retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Profile retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/users/invitations
   * Send user invitation
   */
  async sendInvitation(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, userInvitationSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const invitationData = validation.data

      const invitationResult = await this.userService.sendInvitation({
        ...invitationData,
        organizationId: createOrganizationId(invitationData.organizationId),
        invitedBy: createUserId(user.id),
        expiresAt: invitationData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
        status: 'pending'
      })

      if (!invitationResult.success) {
        return NextResponse.json(
          { success: false, error: invitationResult.error },
          { status: 500 }
        )
      }

      // Send invitation email
      await this.notificationService.sendUserInvitation({
        invitation: invitationResult.data,
        inviterName: user.user_metadata?.name || user.email!,
        organizationName: invitationResult.data.organizationName
      })

      // Log invitation sent
      await logActivity({
        userId: user.id,
        action: 'user_invitation_sent',
        details: {
          invitationId: invitationResult.data.id,
          recipientEmail: invitationData.email,
          role: invitationData.role,
          organizationId: invitationData.organizationId
        }
      })

      return NextResponse.json({
        success: true,
        data: invitationResult.data
      }, { status: 201 })

    } catch (error) {
      logError('User invitation failed', error)
      return NextResponse.json(
        { success: false, error: 'Invitation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/users/invitations/bulk
   * Send bulk user invitations
   */
  async sendBulkInvitations(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, bulkInvitationSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { invitations, organizationId } = validation.data

      const bulkResult = await this.userService.sendBulkInvitations({
        invitations: invitations.map(inv => ({
          ...inv,
          organizationId: createOrganizationId(organizationId),
          invitedBy: createUserId(user.id),
          expiresAt: inv.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }))
      })

      if (!bulkResult.success) {
        return NextResponse.json(
          { success: false, error: bulkResult.error },
          { status: 500 }
        )
      }

      // Send invitation emails for successful invitations
      for (const invitation of bulkResult.data.successful) {
        await this.notificationService.sendUserInvitation({
          invitation,
          inviterName: user.user_metadata?.name || user.email!,
          organizationName: invitation.organizationName
        })
      }

      // Log bulk invitations
      await logActivity({
        userId: user.id,
        action: 'bulk_user_invitations_sent',
        details: {
          organizationId,
          totalInvitations: invitations.length,
          successful: bulkResult.data.successful.length,
          failed: bulkResult.data.failed.length
        }
      })

      return NextResponse.json({
        success: true,
        data: bulkResult.data
      })

    } catch (error) {
      logError('Bulk user invitations failed', error)
      return NextResponse.json(
        { success: false, error: 'Bulk invitations failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/users/invitations/[token]/respond
   * Respond to user invitation
   */
  async respondToInvitation(request: NextRequest, invitationToken: string): Promise<NextResponse> {
    try {
      const { action, userData } = await request.json()

      if (!['accept', 'decline'].includes(action)) {
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be accept or decline' },
          { status: 400 }
        )
      }

      const responseResult = await this.userService.respondToInvitation({
        invitationToken,
        action,
        userData
      })

      if (!responseResult.success) {
        return NextResponse.json(
          { success: false, error: responseResult.error },
          { status: responseResult.error === 'Invitation not found' ? 404 : 500 }
        )
      }

      // Log invitation response
      await logActivity({
        userId: responseResult.data.userId,
        action: `invitation_${action}ed`,
        details: {
          invitationId: responseResult.data.invitationId,
          organizationId: responseResult.data.organizationId
        }
      })

      return NextResponse.json({
        success: true,
        data: responseResult.data
      })

    } catch (error) {
      logError('Invitation response failed', error)
      return NextResponse.json(
        { success: false, error: 'Invitation response failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/users/activity
   * Get user activity analytics
   */
  async getUserActivity(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const userId = url.searchParams.get('userId') || user.id
      const timeRange = url.searchParams.get('timeRange') || '30d'
      const organizationId = url.searchParams.get('organizationId')

      const activityResult = await this.analyticsService.getUserAnalytics({
        userId: createUserId(userId),
        requestingUserId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        timeRange
      })

      if (!activityResult.success) {
        return NextResponse.json(
          { success: false, error: activityResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: activityResult.data
      })

    } catch (error) {
      logError('User activity retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Activity retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/users/security
   * Update user security settings
   */
  async updateSecuritySettings(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, userSecuritySettingsSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const securityData = validation.data

      const securityResult = await this.securityService.updateUserSecurity({
        userId: createUserId(user.id),
        securitySettings: securityData
      })

      if (!securityResult.success) {
        return NextResponse.json(
          { success: false, error: securityResult.error },
          { status: 500 }
        )
      }

      // Log security settings change
      await logActivity({
        userId: user.id,
        action: 'security_settings_updated',
        details: {
          mfaEnabled: securityData.mfaEnabled,
          settingsChanged: Object.keys(securityData)
        }
      })

      return NextResponse.json({
        success: true,
        data: securityResult.data
      })

    } catch (error) {
      logError('Security settings update failed', error)
      return NextResponse.json(
        { success: false, error: 'Security update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/users/security/audit
   * Get user security audit information
   */
  async getUserSecurityAudit(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const userId = url.searchParams.get('userId') || user.id
      const timeRange = url.searchParams.get('timeRange') || '90d'

      const auditResult = await this.securityService.getUserSecurityAudit({
        userId: createUserId(userId),
        requestingUserId: createUserId(user.id),
        timeRange
      })

      if (!auditResult.success) {
        return NextResponse.json(
          { success: false, error: auditResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: auditResult.data
      })

    } catch (error) {
      logError('Security audit retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Security audit retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/users/[id]/deactivate
   * Deactivate a user account
   */
  async deactivateUser(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { reason } = await request.json()

      const deactivationResult = await this.userService.deactivateUser({
        userId: createUserId(userId),
        deactivatedBy: createUserId(user.id),
        reason
      })

      if (!deactivationResult.success) {
        return NextResponse.json(
          { success: false, error: deactivationResult.error },
          { status: 500 }
        )
      }

      // Log user deactivation
      await logActivity({
        userId: user.id,
        action: 'user_deactivated',
        details: {
          deactivatedUserId: userId,
          reason
        }
      })

      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully'
      })

    } catch (error) {
      logError('User deactivation failed', error)
      return NextResponse.json(
        { success: false, error: 'User deactivation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/users/[id]/reactivate
   * Reactivate a user account
   */
  async reactivateUser(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const reactivationResult = await this.userService.reactivateUser({
        userId: createUserId(userId),
        reactivatedBy: createUserId(user.id)
      })

      if (!reactivationResult.success) {
        return NextResponse.json(
          { success: false, error: reactivationResult.error },
          { status: 500 }
        )
      }

      // Log user reactivation
      await logActivity({
        userId: user.id,
        action: 'user_reactivated',
        details: {
          reactivatedUserId: userId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'User reactivated successfully'
      })

    } catch (error) {
      logError('User reactivation failed', error)
      return NextResponse.json(
        { success: false, error: 'User reactivation failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const userController = new UserController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 200, // 200 requests per minute for read operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname === '/api/users/profile') {
    return await userController.getCurrentUserProfile(request)
  } else if (pathname.includes('/directory')) {
    return await userController.getUserDirectory(request)
  } else if (pathname.includes('/activity')) {
    return await userController.getUserActivity(request)
  } else if (pathname.includes('/security/audit')) {
    return await userController.getUserSecurityAudit(request)
  } else if (pathname.includes('/users/')) {
    const userId = pathname.split('/users/')[1]?.split('/')[0]
    if (userId) {
      return await userController.getUserProfile(request, userId)
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 60, // 60 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const userId = pathname.split('/users/')[1]?.split('/')[0]

  if (pathname.includes('/invitations/bulk')) {
    return await userController.sendBulkInvitations(request)
  } else if (pathname.includes('/invitations')) {
    return await userController.sendInvitation(request)
  } else if (pathname.includes('/deactivate') && userId) {
    return await userController.deactivateUser(request, userId)
  } else if (pathname.includes('/reactivate') && userId) {
    return await userController.reactivateUser(request, userId)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 60,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname === '/api/users/profile') {
    return await userController.updateUserProfile(request)
  } else if (pathname.includes('/security')) {
    return await userController.updateSecuritySettings(request)
  } else if (pathname.includes('/invitations/') && pathname.includes('/respond')) {
    const invitationToken = pathname.split('/invitations/')[1]?.split('/respond')[0]
    if (invitationToken) {
      return await userController.respondToInvitation(request, invitationToken)
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}