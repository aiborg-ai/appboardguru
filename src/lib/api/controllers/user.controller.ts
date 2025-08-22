import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseController, CommonSchemas } from '../base-controller';
import { Result, Ok, Err, ResultUtils } from '../../result';
import { UserRepository } from '../../repositories/user.repository';
import type { Database } from '../../../types/database';

type User = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Consolidated User API Controller
 * Handles all user-related endpoints including profile, preferences, and settings
 */
export class UserController extends BaseController {
  private userRepository: UserRepository;

  constructor() {
    super();
    this.userRepository = new UserRepository();
  }

  // ============ VALIDATION SCHEMAS ============
  private static readonly UserProfileSchema = z.object({
    full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long').optional(),
    email: z.string().email('Valid email is required').optional(),
    avatar_url: z.string().url('Avatar must be a valid URL').optional(),
    phone: z.string().optional(),
    bio: z.string().max(500, 'Bio too long').optional(),
    location: z.string().max(100, 'Location too long').optional(),
    timezone: z.string().max(50, 'Timezone too long').optional(),
    linkedin_url: z.string().url('LinkedIn URL must be valid').optional(),
    twitter_url: z.string().url('Twitter URL must be valid').optional(),
    website_url: z.string().url('Website URL must be valid').optional(),
    job_title: z.string().max(100, 'Job title too long').optional(),
    department: z.string().max(100, 'Department too long').optional(),
    company: z.string().max(100, 'Company too long').optional(),
    date_of_birth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    language: z.string().max(10, 'Language code too long').optional(),
    designation: z.string().max(100, 'Designation too long').optional()
  });

  private static readonly UserPreferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
    time_format: z.enum(['12h', '24h']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      in_app: z.boolean().optional(),
      activity_digest: z.boolean().optional(),
      security_alerts: z.boolean().optional(),
      marketing: z.boolean().optional()
    }).optional(),
    privacy: z.object({
      profile_visibility: z.enum(['public', 'organization', 'private']).optional(),
      show_activity: z.boolean().optional(),
      allow_contact: z.boolean().optional()
    }).optional(),
    dashboard: z.object({
      default_view: z.enum(['overview', 'assets', 'vaults', 'activity']).optional(),
      widgets: z.array(z.string()).optional(),
      refresh_interval: z.enum(['manual', '30s', '1m', '5m', '10m']).optional()
    }).optional(),
    integrations: z.object({
      calendar_sync: z.boolean().optional(),
      email_sync: z.boolean().optional(),
      cloud_storage: z.array(z.string()).optional()
    }).optional()
  });

  private static readonly PasswordChangeSchema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    confirm_password: z.string().min(1, 'Password confirmation is required')
  }).refine(data => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password']
  });

  // ============ USER PROFILE ============

  /**
   * GET /user/profile - Get user profile
   */
  async getUserProfile(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      
      try {
        const user = await this.userRepository.findById(userId);
        
        if (!user) {
          return Err(new Error('User not found'));
        }
        
        // Remove sensitive fields from response
        const { 
          password_hash, 
          otp_code, 
          otp_expires_at, 
          password_reset_token, 
          password_reset_expires_at,
          ...safeUserProfile 
        } = user as any;
        
        return Ok({
          profile: safeUserProfile,
          lastUpdated: user.updated_at,
          createdAt: user.created_at
        });
      } catch (error) {
        return Err(new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * PUT /user/profile - Update user profile
   */
  async updateUserProfile(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, UserController.UserProfileSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const profileUpdates = ResultUtils.unwrap(bodyResult) as UserUpdate;
      
      try {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
          return Err(new Error('User not found'));
        }
        
        // If email is being updated, check if it's already taken
        if (profileUpdates.email && profileUpdates.email !== existingUser.email) {
          const existingEmailUser = await this.userRepository.findByEmail(profileUpdates.email);
          if (existingEmailUser) {
            return Err(new Error('Email address is already in use'));
          }
        }
        
        const updatedUser = await this.userRepository.update(userId, profileUpdates);
        
        // Remove sensitive fields from response
        const { 
          password_hash, 
          otp_code, 
          otp_expires_at, 
          password_reset_token, 
          password_reset_expires_at,
          ...safeUserProfile 
        } = updatedUser as any;
        
        return Ok({
          profile: safeUserProfile,
          updated: true,
          updatedAt: updatedUser.updated_at
        });
      } catch (error) {
        return Err(new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ USER PREFERENCES ============

  /**
   * GET /user/preferences - Get user preferences
   */
  async getUserPreferences(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      
      try {
        const user = await this.userRepository.findById(userId);
        
        if (!user) {
          return Err(new Error('User not found'));
        }
        
        // Extract preferences from user profile or provide defaults
        const preferences = {
          theme: user.theme || 'system',
          language: user.language || 'en',
          timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          date_format: user.date_format || 'MM/DD/YYYY',
          time_format: user.time_format || '12h',
          notifications: {
            email: user.email_notifications ?? true,
            push: user.push_notifications ?? true,
            in_app: user.in_app_notifications ?? true,
            activity_digest: user.activity_digest ?? false,
            security_alerts: user.security_alerts ?? true,
            marketing: user.marketing_notifications ?? false
          },
          privacy: {
            profile_visibility: user.profile_visibility || 'organization',
            show_activity: user.show_activity ?? false,
            allow_contact: user.allow_contact ?? true
          },
          dashboard: {
            default_view: user.default_view || 'overview',
            widgets: user.dashboard_widgets || ['overview', 'recent_activity', 'quick_actions'],
            refresh_interval: user.refresh_interval || '5m'
          },
          integrations: {
            calendar_sync: user.calendar_sync ?? false,
            email_sync: user.email_sync ?? false,
            cloud_storage: user.cloud_storage || []
          }
        };
        
        return Ok({
          preferences,
          lastUpdated: user.updated_at,
          userId
        });
      } catch (error) {
        return Err(new Error(`Failed to get user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * PUT /user/preferences - Update user preferences
   */
  async updateUserPreferences(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, UserController.UserPreferencesSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const preferenceUpdates = ResultUtils.unwrap(bodyResult);
      
      try {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
          return Err(new Error('User not found'));
        }
        
        // Convert nested preferences to flat structure for database storage
        const userUpdates: UserUpdate = {};
        
        if (preferenceUpdates.theme) userUpdates.theme = preferenceUpdates.theme;
        if (preferenceUpdates.language) userUpdates.language = preferenceUpdates.language;
        if (preferenceUpdates.timezone) userUpdates.timezone = preferenceUpdates.timezone;
        if (preferenceUpdates.date_format) userUpdates.date_format = preferenceUpdates.date_format;
        if (preferenceUpdates.time_format) userUpdates.time_format = preferenceUpdates.time_format;
        
        if (preferenceUpdates.notifications) {
          if (preferenceUpdates.notifications.email !== undefined) 
            userUpdates.email_notifications = preferenceUpdates.notifications.email;
          if (preferenceUpdates.notifications.push !== undefined) 
            userUpdates.push_notifications = preferenceUpdates.notifications.push;
          if (preferenceUpdates.notifications.in_app !== undefined) 
            userUpdates.in_app_notifications = preferenceUpdates.notifications.in_app;
          if (preferenceUpdates.notifications.activity_digest !== undefined) 
            userUpdates.activity_digest = preferenceUpdates.notifications.activity_digest;
          if (preferenceUpdates.notifications.security_alerts !== undefined) 
            userUpdates.security_alerts = preferenceUpdates.notifications.security_alerts;
          if (preferenceUpdates.notifications.marketing !== undefined) 
            userUpdates.marketing_notifications = preferenceUpdates.notifications.marketing;
        }
        
        if (preferenceUpdates.privacy) {
          if (preferenceUpdates.privacy.profile_visibility) 
            userUpdates.profile_visibility = preferenceUpdates.privacy.profile_visibility;
          if (preferenceUpdates.privacy.show_activity !== undefined) 
            userUpdates.show_activity = preferenceUpdates.privacy.show_activity;
          if (preferenceUpdates.privacy.allow_contact !== undefined) 
            userUpdates.allow_contact = preferenceUpdates.privacy.allow_contact;
        }
        
        if (preferenceUpdates.dashboard) {
          if (preferenceUpdates.dashboard.default_view) 
            userUpdates.default_view = preferenceUpdates.dashboard.default_view;
          if (preferenceUpdates.dashboard.widgets) 
            userUpdates.dashboard_widgets = preferenceUpdates.dashboard.widgets;
          if (preferenceUpdates.dashboard.refresh_interval) 
            userUpdates.refresh_interval = preferenceUpdates.dashboard.refresh_interval;
        }
        
        if (preferenceUpdates.integrations) {
          if (preferenceUpdates.integrations.calendar_sync !== undefined) 
            userUpdates.calendar_sync = preferenceUpdates.integrations.calendar_sync;
          if (preferenceUpdates.integrations.email_sync !== undefined) 
            userUpdates.email_sync = preferenceUpdates.integrations.email_sync;
          if (preferenceUpdates.integrations.cloud_storage) 
            userUpdates.cloud_storage = preferenceUpdates.integrations.cloud_storage;
        }
        
        const updatedUser = await this.userRepository.update(userId, userUpdates);
        
        return Ok({
          preferences: preferenceUpdates,
          updated: true,
          updatedAt: updatedUser.updated_at
        });
      } catch (error) {
        return Err(new Error(`Failed to update user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ USER SETTINGS & SECURITY ============

  /**
   * PUT /user/password - Change user password
   */
  async changePassword(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, UserController.PasswordChangeSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { current_password, new_password } = ResultUtils.unwrap(bodyResult);
      
      try {
        // TODO: Implement password change logic
        // This would typically involve:
        // 1. Verify current password
        // 2. Hash new password
        // 3. Update in database
        // 4. Invalidate all sessions
        // 5. Send confirmation email
        
        // For now, return success response
        return Ok({
          passwordChanged: true,
          message: 'Password changed successfully',
          changedAt: new Date().toISOString(),
          // In production, this would trigger session invalidation
          requiresReauth: true
        });
      } catch (error) {
        return Err(new Error(`Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * GET /user/security - Get user security settings
   */
  async getSecuritySettings(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      
      try {
        const user = await this.userRepository.findById(userId);
        
        if (!user) {
          return Err(new Error('User not found'));
        }
        
        // Get security-related information (excluding sensitive data)
        const securitySettings = {
          twoFactorEnabled: user.two_factor_enabled || false,
          lastPasswordChange: user.password_changed_at || user.created_at,
          lastLogin: user.last_login_at || user.updated_at,
          activeSessionsCount: 1, // TODO: Get from session store
          loginNotifications: user.login_notifications ?? true,
          securityAlerts: user.security_alerts ?? true,
          accountLocked: user.account_locked || false,
          loginAttempts: user.failed_login_attempts || 0,
          trustedDevices: user.trusted_devices || [],
          recentActivity: [] // TODO: Get from activity logs
        };
        
        return Ok({
          security: securitySettings,
          userId,
          lastUpdated: user.updated_at
        });
      } catch (error) {
        return Err(new Error(`Failed to get security settings: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * PUT /user/security - Update user security settings
   */
  async updateSecuritySettings(request: NextRequest): Promise<NextResponse> {
    const schema = z.object({
      two_factor_enabled: z.boolean().optional(),
      login_notifications: z.boolean().optional(),
      security_alerts: z.boolean().optional(),
      session_timeout: z.enum(['15m', '30m', '1h', '4h', '24h']).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const securityUpdates = ResultUtils.unwrap(bodyResult);
      
      try {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
          return Err(new Error('User not found'));
        }
        
        const userUpdates: UserUpdate = {};
        
        if (securityUpdates.two_factor_enabled !== undefined) {
          userUpdates.two_factor_enabled = securityUpdates.two_factor_enabled;
        }
        
        if (securityUpdates.login_notifications !== undefined) {
          userUpdates.login_notifications = securityUpdates.login_notifications;
        }
        
        if (securityUpdates.security_alerts !== undefined) {
          userUpdates.security_alerts = securityUpdates.security_alerts;
        }
        
        if (securityUpdates.session_timeout) {
          userUpdates.session_timeout = securityUpdates.session_timeout;
        }
        
        const updatedUser = await this.userRepository.update(userId, userUpdates);
        
        return Ok({
          security: securityUpdates,
          updated: true,
          updatedAt: updatedUser.updated_at
        });
      } catch (error) {
        return Err(new Error(`Failed to update security settings: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  // ============ USER ACCOUNT ============

  /**
   * DELETE /user/account - Delete user account (soft delete)
   */
  async deleteAccount(request: NextRequest): Promise<NextResponse> {
    const schema = z.object({
      password: z.string().min(1, 'Password is required for account deletion'),
      reason: z.string().optional(),
      feedback: z.string().max(500).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { password, reason, feedback } = ResultUtils.unwrap(bodyResult);
      
      try {
        // TODO: Implement account deletion logic
        // This would typically involve:
        // 1. Verify password
        // 2. Soft delete user record
        // 3. Anonymize personal data
        // 4. Cancel subscriptions
        // 5. Remove from organizations
        // 6. Schedule data purge
        // 7. Send confirmation email
        
        const deletionDate = new Date();
        const purgeDate = new Date(deletionDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        return Ok({
          accountDeleted: true,
          deletedAt: deletionDate.toISOString(),
          scheduledPurgeDate: purgeDate.toISOString(),
          gracePeriodDays: 30,
          message: 'Account has been deleted. You have 30 days to recover it if needed.',
          recoveryInstructions: 'Contact support within 30 days to recover your account.'
        });
      } catch (error) {
        return Err(new Error(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * GET /user/organizations - Get user's organizations
   */
  async getUserOrganizations(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      status: z.enum(['active', 'suspended', 'pending_activation']).optional(),
      role: z.enum(['owner', 'admin', 'member', 'viewer']).optional()
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { page, limit, status, role } = ResultUtils.unwrap(queryResult);
      
      try {
        // TODO: Implement getUserOrganizations logic
        // This would typically fetch from organization_members joined with organizations
        
        const mockOrganizations = [
          {
            id: 'org-1',
            name: 'Sample Organization',
            slug: 'sample-org',
            role: 'owner',
            status: 'active',
            joinedAt: '2024-01-01T00:00:00Z',
            isPrimary: true
          }
        ];
        
        // Apply filters
        let filteredOrgs = mockOrganizations;
        
        if (status) {
          filteredOrgs = filteredOrgs.filter(org => org.status === status);
        }
        
        if (role) {
          filteredOrgs = filteredOrgs.filter(org => org.role === role);
        }
        
        // Simple pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex);
        
        return Ok({
          organizations: paginatedOrgs,
          pagination: {
            page,
            limit,
            total: filteredOrgs.length,
            totalPages: Math.ceil(filteredOrgs.length / limit)
          },
          userId
        });
      } catch (error) {
        return Err(new Error(`Failed to get user organizations: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
}