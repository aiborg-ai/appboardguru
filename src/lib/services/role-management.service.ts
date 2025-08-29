/**
 * Role Management Service
 * Agent: BIZ-03 (Business Logic Master)
 * Purpose: Business logic for role assignment, validation, and management
 */

import { RolePermissionsRepository, UserRole, BugReport } from '../repositories/role-permissions.repository';
import { UserRepository } from '../repositories/user.repository';
import { Result } from '../repositories/result';
import { supabaseAdmin } from '../supabase-admin';
import { EventEmitter } from 'events';

export interface RoleAssignment {
  userId: string;
  newRole: UserRole;
  reason?: string;
}

export interface RoleValidation {
  canChange: boolean;
  reason?: string;
  requiresApproval?: boolean;
  approvalLevel?: UserRole;
}

export interface RoleDistribution {
  role: UserRole;
  count: number;
  percentage: number;
}

export interface PermissionContext {
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
}

export class RoleManagementService extends EventEmitter {
  private rolePermissionsRepo: RolePermissionsRepository;
  private userRepo: UserRepository;
  private permissionCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Role hierarchy for validation
  private readonly roleHierarchy: Record<UserRole, number> = {
    admin: 5,
    superuser: 4,
    user: 3,
    viewer: 2,
    reviewer: 1,
    pending: 0
  };

  constructor() {
    super();
    this.rolePermissionsRepo = new RolePermissionsRepository();
    this.userRepo = new UserRepository();
    this.startCacheCleanup();
  }

  /**
   * Assign a role to a user with validation
   */
  async assignRole(
    userId: string,
    role: UserRole,
    assignedBy: string,
    reason?: string
  ): Promise<Result<void>> {
    try {
      // Validate the role change
      const validation = await this.canUserModifyRole(assignedBy, userId, role);
      
      if (!validation.canChange) {
        return {
          success: false,
          error: new Error(validation.reason || 'Role change not permitted')
        };
      }

      // Check if approval is required
      if (validation.requiresApproval) {
        // In a real implementation, this would create an approval request
        this.emit('approval:required', {
          userId,
          newRole: role,
          requestedBy: assignedBy,
          approvalLevel: validation.approvalLevel
        });

        return {
          success: false,
          error: new Error('Role change requires approval from ' + validation.approvalLevel)
        };
      }

      // Update the role
      const result = await this.rolePermissionsRepo.updateUserRole(
        userId,
        role,
        assignedBy,
        reason
      );

      if (result.success) {
        // Clear permission cache for this user
        this.clearUserCache(userId);

        // Emit role change event
        this.emit('role:changed', {
          userId,
          newRole: role,
          changedBy: assignedBy,
          reason
        });

        // Send notification to user
        await this.notifyRoleChange(userId, role, assignedBy, reason);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Check if a user has a specific permission with caching
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    context?: PermissionContext
  ): Promise<boolean> {
    const cacheKey = `${userId}:${action}:${resource}:${JSON.stringify(context || {})}`;
    
    // Check cache
    const cached = this.permissionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Get effective permissions
    const permissionsResult = await this.rolePermissionsRepo.getUserEffectivePermissions(
      userId,
      context?.organizationId
    );

    if (!permissionsResult.success) {
      return false;
    }

    const permissions = permissionsResult.data.effective_permissions;
    const permissionKey = `${resource}.${action}`;
    const hasPermission = permissions[permissionKey]?.allowed === true;

    // Cache the result
    this.permissionCache.set(cacheKey, {
      data: hasPermission,
      expires: Date.now() + this.CACHE_TTL
    });

    return hasPermission;
  }

  /**
   * Create a reviewer account with special setup
   */
  async createReviewerAccount(
    email: string,
    fullName: string,
    testEnvAccess: boolean = false,
    organizationId?: string
  ): Promise<Result<any>> {
    try {
      // Create the reviewer user
      const userResult = await this.userRepo.createReviewer(email, fullName, testEnvAccess);
      
      if (!userResult.success) {
        return userResult;
      }

      const user = userResult.data;

      // Grant reviewer-specific permissions
      if (organizationId) {
        await this.rolePermissionsRepo.grantCustomPermission(
          user.id,
          organizationId,
          {
            'bugs.report': { allowed: true },
            'screen.record': { allowed: true },
            'test_data.create': { allowed: true, environment: 'staging' },
            'performance.view_metrics': { allowed: true },
            'issues.flag': { allowed: true },
            'staging.access': { allowed: testEnvAccess },
            'tracker.integrate': { allowed: true }
          },
          user.id,
          'Reviewer account setup'
        );
      }

      // Set up initial bug tracking dashboard access
      await this.setupReviewerDashboard(user.id);

      this.emit('reviewer:created', {
        userId: user.id,
        email,
        testEnvAccess
      });

      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create reviewer account')
      };
    }
  }

  /**
   * Track a bug report from a reviewer
   */
  async trackBugReport(reviewerId: string, report: Omit<BugReport, 'id' | 'reporter_id' | 'created_at' | 'updated_at'>): Promise<Result<BugReport>> {
    // Verify user is a reviewer
    const isReviewer = await this.checkPermission(reviewerId, 'report', 'bugs');
    
    if (!isReviewer) {
      return {
        success: false,
        error: new Error('User does not have bug reporting permissions')
      };
    }

    const bugReport = await this.rolePermissionsRepo.createBugReport({
      ...report,
      reporter_id: reviewerId
    });

    if (bugReport.success) {
      this.emit('bug:reported', bugReport.data);
    }

    return bugReport;
  }

  /**
   * Validate if a user can modify another user's role
   */
  async canUserModifyRole(
    actorId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<RoleValidation> {
    try {
      // Get actor's role
      const actorData = await this.userRepo.findById(actorId);
      if (!actorData) {
        return { canChange: false, reason: 'Actor not found' };
      }
      const actorRole = actorData.role as UserRole;

      // Get target's current role
      const targetData = await this.userRepo.findById(targetUserId);
      if (!targetData) {
        return { canChange: false, reason: 'Target user not found' };
      }
      const currentRole = targetData.role as UserRole;

      // Check hierarchy
      const actorLevel = this.roleHierarchy[actorRole];
      const currentLevel = this.roleHierarchy[currentRole];
      const newLevel = this.roleHierarchy[newRole];

      // Can't modify users at same or higher level
      if (currentLevel >= actorLevel && actorId !== targetUserId) {
        return { 
          canChange: false, 
          reason: 'Cannot modify role of user at same or higher level' 
        };
      }

      // Can't promote to same or higher level than self
      if (newLevel >= actorLevel && actorId !== targetUserId) {
        return { 
          canChange: false, 
          reason: 'Cannot promote user to same or higher level than yourself' 
        };
      }

      // Special cases requiring approval
      if (newRole === 'admin' && actorRole !== 'admin') {
        return {
          canChange: false,
          requiresApproval: true,
          approvalLevel: 'admin',
          reason: 'Admin role requires admin approval'
        };
      }

      if (newRole === 'superuser' && !['admin', 'superuser'].includes(actorRole)) {
        return {
          canChange: false,
          requiresApproval: true,
          approvalLevel: 'admin',
          reason: 'SuperUser role requires admin approval'
        };
      }

      return { canChange: true };
    } catch (error) {
      return { 
        canChange: false, 
        reason: 'Error validating role change' 
      };
    }
  }

  /**
   * Bulk assign roles to multiple users
   */
  async bulkAssignRoles(
    assignments: RoleAssignment[],
    assignedBy: string
  ): Promise<Result<{ succeeded: string[]; failed: Array<{ userId: string; error: string }> }>> {
    const succeeded: string[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const assignment of assignments) {
      const result = await this.assignRole(
        assignment.userId,
        assignment.newRole,
        assignedBy,
        assignment.reason
      );

      if (result.success) {
        succeeded.push(assignment.userId);
      } else {
        failed.push({
          userId: assignment.userId,
          error: result.error?.message || 'Unknown error'
        });
      }
    }

    return {
      success: true,
      data: { succeeded, failed }
    };
  }

  /**
   * Get role distribution for analytics
   */
  async getRoleDistribution(organizationId?: string): Promise<Result<RoleDistribution[]>> {
    try {
      const query = organizationId
        ? supabaseAdmin
            .from('users')
            .select('role, organization_members!inner(organization_id)')
            .eq('organization_members.organization_id', organizationId)
            .eq('status', 'approved')
        : supabaseAdmin
            .from('users')
            .select('role')
            .eq('status', 'approved');

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: new Error('Failed to get role distribution')
        };
      }

      // Count roles
      const roleCounts = data?.reduce((acc, user) => {
        const role = user.role as UserRole;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<UserRole, number>) || {};

      const total = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);

      // Create distribution
      const distribution: RoleDistribution[] = Object.entries(roleCounts).map(([role, count]) => ({
        role: role as UserRole,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));

      // Sort by hierarchy
      distribution.sort((a, b) => 
        this.roleHierarchy[b.role] - this.roleHierarchy[a.role]
      );

      return { success: true, data: distribution };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Get effective permissions for a user
   */
  async getEffectivePermissions(userId: string, organizationId?: string) {
    return this.rolePermissionsRepo.getUserEffectivePermissions(userId, organizationId);
  }

  /**
   * Validate a role change based on business rules
   */
  async validateRoleChange(
    fromRole: UserRole,
    toRole: UserRole,
    actorRole: UserRole
  ): Promise<RoleValidation> {
    const actorLevel = this.roleHierarchy[actorRole];
    const fromLevel = this.roleHierarchy[fromRole];
    const toLevel = this.roleHierarchy[toRole];

    // Check if it's a promotion, demotion, or lateral move
    const changeType = toLevel > fromLevel ? 'promotion' : 
                      toLevel < fromLevel ? 'demotion' : 'lateral';

    // Validate based on change type
    switch (changeType) {
      case 'promotion':
        if (toLevel > actorLevel) {
          return {
            canChange: false,
            reason: 'Cannot promote above your own level'
          };
        }
        break;
      case 'demotion':
        if (fromLevel >= actorLevel) {
          return {
            canChange: false,
            reason: 'Cannot demote users at or above your level'
          };
        }
        break;
    }

    return { canChange: true };
  }

  /**
   * Helper: Clear user's permission cache
   */
  private clearUserCache(userId: string) {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Helper: Clean up expired cache entries
   */
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.permissionCache.entries()) {
        if (value.expires < now) {
          this.permissionCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Helper: Set up reviewer dashboard access
   */
  private async setupReviewerDashboard(userId: string) {
    // This would set up dashboard preferences, widgets, etc.
    // For now, we'll just log the event
    this.emit('dashboard:setup', {
      userId,
      type: 'reviewer',
      widgets: ['bug-tracker', 'performance-metrics', 'test-data-manager']
    });
  }

  /**
   * Helper: Notify user of role change
   */
  private async notifyRoleChange(
    userId: string,
    newRole: UserRole,
    changedBy: string,
    reason?: string
  ) {
    // This would integrate with the notification service
    // For now, we'll emit an event
    this.emit('notification:send', {
      userId,
      type: 'role_change',
      title: 'Your role has been updated',
      message: `Your role has been changed to ${newRole}${reason ? `. Reason: ${reason}` : ''}`,
      changedBy
    });
  }
}