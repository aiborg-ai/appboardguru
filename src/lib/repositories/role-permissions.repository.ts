/**
 * Role Permissions Repository
 * Agent: REPO-02 (Repository Guardian)
 * Purpose: Data access layer for role permissions and user role management
 */

import { BaseRepository } from './base.repository';
import { Result } from './result';
import { RepositoryError } from './document-errors';
import type { Database } from '../../types/database';

// Type definitions
export type UserRole = 'admin' | 'superuser' | 'user' | 'viewer' | 'reviewer' | 'pending';

export interface RolePermission {
  id: string;
  role_name: UserRole;
  permission_key: string;
  permission_value: Record<string, any>;
  description?: string;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCustomPermission {
  id: string;
  user_id: string;
  organization_id: string;
  permission_overrides: Record<string, any>;
  granted_by?: string;
  reason?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleChangeHistory {
  id: string;
  user_id: string;
  organization_id?: string;
  old_role?: UserRole;
  new_role: UserRole;
  changed_by: string;
  change_type: 'promotion' | 'demotion' | 'lateral' | 'initial';
  reason?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface BugReport {
  id: string;
  reporter_id: string;
  organization_id?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  category: 'ui' | 'functionality' | 'performance' | 'security' | 'data' | 'other';
  screenshot_url?: string;
  page_url?: string;
  browser_info?: Record<string, any>;
  device_info?: Record<string, any>;
  reproduction_steps?: string[];
  assigned_to?: string;
  resolved_by?: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EffectivePermissions {
  role: UserRole;
  base_permissions: Record<string, any>;
  custom_permissions?: Record<string, any>;
  effective_permissions: Record<string, any>;
  expires_at?: string;
}

export class RolePermissionsRepository extends BaseRepository {
  constructor() {
    super('role_permissions');
  }

  /**
   * Get all permissions for a specific role
   */
  async getRolePermissions(role: UserRole): Promise<Result<RolePermission[]>> {
    try {
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role_name', role)
        .order('permission_key');

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            `Failed to get permissions for role ${role}`,
            'QUERY_ERROR',
            { role, error: error.message }
          )
        };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting role permissions',
          'INTERNAL_ERROR',
          { role, error }
        )
      };
    }
  }

  /**
   * Get a specific permission for a role
   */
  async getRolePermission(role: UserRole, permissionKey: string): Promise<Result<RolePermission | null>> {
    try {
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role_name', role)
        .eq('permission_key', permissionKey)
        .single();

      if (error && error.code !== 'PGRST116') {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to get role permission',
            'QUERY_ERROR',
            { role, permissionKey, error: error.message }
          )
        };
      }

      return { success: true, data: data || null };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting role permission',
          'INTERNAL_ERROR',
          { role, permissionKey, error }
        )
      };
    }
  }

  /**
   * Get user's effective permissions (base + custom)
   */
  async getUserEffectivePermissions(
    userId: string, 
    organizationId?: string
  ): Promise<Result<EffectivePermissions>> {
    try {
      // Get user's role
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: new RepositoryError(
            'User not found',
            'NOT_FOUND',
            { userId }
          )
        };
      }

      const userRole = user.role as UserRole;

      // Get base permissions for role
      const basePermissionsResult = await this.getRolePermissions(userRole);
      if (!basePermissionsResult.success) {
        return basePermissionsResult as Result<EffectivePermissions>;
      }

      const basePermissions = basePermissionsResult.data.reduce((acc, perm) => {
        acc[perm.permission_key] = perm.permission_value;
        return acc;
      }, {} as Record<string, any>);

      // Get custom permissions if organization specified
      let customPermissions: Record<string, any> = {};
      let expiresAt: string | undefined;

      if (organizationId) {
        const { data: customPerms } = await this.supabase
          .from('user_custom_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .single();

        if (customPerms) {
          // Check if not expired
          if (!customPerms.expires_at || new Date(customPerms.expires_at) > new Date()) {
            customPermissions = customPerms.permission_overrides as Record<string, any>;
            expiresAt = customPerms.expires_at;
          }
        }
      }

      // Merge permissions (custom overrides base)
      const effectivePermissions = { ...basePermissions, ...customPermissions };

      return {
        success: true,
        data: {
          role: userRole,
          base_permissions: basePermissions,
          custom_permissions: Object.keys(customPermissions).length > 0 ? customPermissions : undefined,
          effective_permissions: effectivePermissions,
          expires_at: expiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Failed to get effective permissions',
          'INTERNAL_ERROR',
          { userId, organizationId, error }
        )
      };
    }
  }

  /**
   * Check if user has a specific permission
   */
  async checkPermission(
    userId: string,
    permissionKey: string,
    organizationId?: string
  ): Promise<Result<boolean>> {
    try {
      const permissionsResult = await this.getUserEffectivePermissions(userId, organizationId);
      
      if (!permissionsResult.success) {
        return permissionsResult as Result<boolean>;
      }

      const permission = permissionsResult.data.effective_permissions[permissionKey];
      const hasPermission = permission?.allowed === true;

      return { success: true, data: hasPermission };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Failed to check permission',
          'INTERNAL_ERROR',
          { userId, permissionKey, error }
        )
      };
    }
  }

  /**
   * Update user's role with audit trail
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole,
    changedBy: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<Result<void>> {
    return this.executeTransaction(async (tx) => {
      // Get current role
      const { data: user, error: getUserError } = await tx
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        throw new RepositoryError(
          'User not found',
          'NOT_FOUND',
          { userId }
        );
      }

      const oldRole = user.role as UserRole;

      // Update user role
      const { error: updateError } = await tx
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw new RepositoryError(
          'Failed to update user role',
          'UPDATE_ERROR',
          { userId, newRole, error: updateError.message }
        );
      }

      // Log role change
      const changeType = this.determineChangeType(oldRole, newRole);
      
      const { error: historyError } = await tx
        .from('role_change_history')
        .insert({
          user_id: userId,
          old_role: oldRole,
          new_role: newRole,
          changed_by: changedBy,
          change_type: changeType,
          reason,
          metadata,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        throw new RepositoryError(
          'Failed to log role change',
          'INSERT_ERROR',
          { error: historyError.message }
        );
      }

      return { success: true, data: undefined };
    });
  }

  /**
   * Grant custom permissions to a user
   */
  async grantCustomPermission(
    userId: string,
    organizationId: string,
    permissions: Record<string, any>,
    grantedBy: string,
    reason?: string,
    expiresAt?: string
  ): Promise<Result<UserCustomPermission>> {
    try {
      // Check if custom permissions already exist
      const { data: existing } = await this.supabase
        .from('user_custom_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      let result;

      if (existing) {
        // Update existing permissions
        const mergedPermissions = { ...existing.permission_overrides, ...permissions };
        
        const { data, error } = await this.supabase
          .from('user_custom_permissions')
          .update({
            permission_overrides: mergedPermissions,
            granted_by: grantedBy,
            reason: reason || existing.reason,
            expires_at: expiresAt || existing.expires_at,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        result = { data, error };
      } else {
        // Create new custom permissions
        const { data, error } = await this.supabase
          .from('user_custom_permissions')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            permission_overrides: permissions,
            granted_by: grantedBy,
            reason,
            expires_at: expiresAt,
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        result = { data, error };
      }

      if (result.error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to grant custom permission',
            'OPERATION_ERROR',
            { error: result.error.message }
          )
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error granting custom permission',
          'INTERNAL_ERROR',
          { userId, organizationId, error }
        )
      };
    }
  }

  /**
   * Revoke custom permissions
   */
  async revokeCustomPermission(userId: string, organizationId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('user_custom_permissions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to revoke custom permission',
            'UPDATE_ERROR',
            { error: error.message }
          )
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error revoking custom permission',
          'INTERNAL_ERROR',
          { userId, organizationId, error }
        )
      };
    }
  }

  /**
   * Get all users with reviewer role
   */
  async getReviewerUsers(organizationId?: string): Promise<Result<any[]>> {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .or('role.eq.reviewer,is_reviewer.eq.true');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to get reviewer users',
            'QUERY_ERROR',
            { error: error.message }
          )
        };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting reviewer users',
          'INTERNAL_ERROR',
          { error }
        )
      };
    }
  }

  /**
   * Create a bug report (for reviewers)
   */
  async createBugReport(report: Omit<BugReport, 'id' | 'created_at' | 'updated_at'>): Promise<Result<BugReport>> {
    try {
      const { data, error } = await this.supabase
        .from('bug_reports')
        .insert({
          ...report,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to create bug report',
            'INSERT_ERROR',
            { error: error.message }
          )
        };
      }

      // Update reviewer's bug report count
      if (report.reporter_id) {
        await this.supabase
          .from('users')
          .update({
            bug_reports_count: this.supabase.raw('bug_reports_count + 1'),
            last_review_activity: new Date().toISOString()
          })
          .eq('id', report.reporter_id);
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error creating bug report',
          'INTERNAL_ERROR',
          { error }
        )
      };
    }
  }

  /**
   * Get role change history for a user
   */
  async getRoleChangeHistory(
    userId: string,
    limit: number = 10
  ): Promise<Result<RoleChangeHistory[]>> {
    try {
      const { data, error } = await this.supabase
        .from('role_change_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to get role change history',
            'QUERY_ERROR',
            { error: error.message }
          )
        };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting role change history',
          'INTERNAL_ERROR',
          { userId, error }
        )
      };
    }
  }

  /**
   * Helper: Determine change type based on role hierarchy
   */
  private determineChangeType(oldRole: UserRole | null, newRole: UserRole): 'promotion' | 'demotion' | 'lateral' | 'initial' {
    if (!oldRole) return 'initial';

    const hierarchy: Record<UserRole, number> = {
      admin: 5,
      superuser: 4,
      user: 3,
      viewer: 2,
      reviewer: 1,
      pending: 0
    };

    const oldLevel = hierarchy[oldRole] || 0;
    const newLevel = hierarchy[newRole] || 0;

    if (newLevel > oldLevel) return 'promotion';
    if (newLevel < oldLevel) return 'demotion';
    return 'lateral';
  }
}