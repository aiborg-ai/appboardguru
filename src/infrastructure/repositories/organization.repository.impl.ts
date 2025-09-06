/**
 * Organization Repository Implementation
 * Adapter for organization persistence using Supabase
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { 
  Organization, 
  OrganizationType, 
  OrganizationStatus,
  MemberRole,
  BillingPlan,
  OrganizationProps,
  OrganizationMember,
  OrganizationSettings,
  BillingInfo
} from '../../domain/entities/organization.entity';
import { 
  IOrganizationRepository,
  OrganizationFilters,
  OrganizationListOptions,
  OrganizationStatistics,
  MemberStatistics
} from '../../application/interfaces/repositories/organization.repository.interface';
import type { OrganizationId, UserId } from '../../types/core';

/**
 * Organization Repository Implementation
 */
export class OrganizationRepositoryImpl implements IOrganizationRepository {
  constructor(private readonly supabase: any) {}

  /**
   * Create a new organization
   */
  async create(organization: Organization): Promise<Result<Organization>> {
    try {
      const orgData = this.domainToDb(organization);
      
      // Start a transaction
      const { data, error } = await this.supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (error) {
        console.error('[OrganizationRepository] Create error:', error);
        return ResultUtils.fail(new Error(`Failed to create organization: ${error.message}`));
      }

      // Insert members
      if (organization.members.length > 0) {
        const memberData = organization.members.map(m => ({
          organization_id: organization.id,
          user_id: m.userId,
          role: m.role,
          permissions: m.permissions,
          department: m.department,
          title: m.title,
          joined_at: m.joinedAt,
          invited_by: m.invitedBy,
          is_active: m.isActive,
          last_active_at: m.lastActiveAt
        }));

        const { error: memberError } = await this.supabase
          .from('organization_members')
          .insert(memberData);

        if (memberError) {
          console.error('[OrganizationRepository] Member insert error:', memberError);
          // Rollback organization creation
          await this.supabase.from('organizations').delete().eq('id', organization.id);
          return ResultUtils.fail(new Error(`Failed to add members: ${memberError.message}`));
        }
      }

      // Insert billing info
      if (organization.billing) {
        const billingData = {
          organization_id: organization.id,
          plan: organization.billing.plan,
          status: organization.billing.status,
          trial_ends_at: organization.billing.trialEndsAt,
          current_period_start: organization.billing.currentPeriodStart,
          current_period_end: organization.billing.currentPeriodEnd,
          seats: organization.billing.seats,
          used_seats: organization.billing.usedSeats,
          storage_limit: organization.billing.storageLimit,
          used_storage: organization.billing.usedStorage,
          monthly_budget: organization.billing.monthlyBudget,
          billing_email: organization.billing.billingEmail,
          payment_method: organization.billing.paymentMethod,
          next_invoice_date: organization.billing.nextInvoiceDate,
          features: organization.billing.features
        };

        const { error: billingError } = await this.supabase
          .from('organization_billing')
          .insert(billingData);

        if (billingError) {
          console.error('[OrganizationRepository] Billing insert error:', billingError);
        }
      }

      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create organization')
      );
    }
  }

  /**
   * Update an existing organization
   */
  async update(organization: Organization): Promise<Result<Organization>> {
    try {
      const orgData = this.domainToDb(organization);
      
      const { error } = await this.supabase
        .from('organizations')
        .update(orgData)
        .eq('id', organization.id);

      if (error) {
        console.error('[OrganizationRepository] Update error:', error);
        return ResultUtils.fail(new Error(`Failed to update organization: ${error.message}`));
      }

      // Update members (delete and re-insert for simplicity)
      await this.supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organization.id);

      if (organization.members.length > 0) {
        const memberData = organization.members.map(m => ({
          organization_id: organization.id,
          user_id: m.userId,
          role: m.role,
          permissions: m.permissions,
          department: m.department,
          title: m.title,
          joined_at: m.joinedAt,
          invited_by: m.invitedBy,
          is_active: m.isActive,
          last_active_at: m.lastActiveAt
        }));

        const { error: memberError } = await this.supabase
          .from('organization_members')
          .insert(memberData);

        if (memberError) {
          console.error('[OrganizationRepository] Member update error:', memberError);
        }
      }

      // Update billing info
      if (organization.billing) {
        const billingData = {
          plan: organization.billing.plan,
          status: organization.billing.status,
          trial_ends_at: organization.billing.trialEndsAt,
          current_period_start: organization.billing.currentPeriodStart,
          current_period_end: organization.billing.currentPeriodEnd,
          seats: organization.billing.seats,
          used_seats: organization.billing.usedSeats,
          storage_limit: organization.billing.storageLimit,
          used_storage: organization.billing.usedStorage,
          monthly_budget: organization.billing.monthlyBudget,
          billing_email: organization.billing.billingEmail,
          payment_method: organization.billing.paymentMethod,
          next_invoice_date: organization.billing.nextInvoiceDate,
          features: organization.billing.features
        };

        const { error: billingError } = await this.supabase
          .from('organization_billing')
          .update(billingData)
          .eq('organization_id', organization.id);

        if (billingError) {
          // If no billing record exists, insert it
          const { error: insertError } = await this.supabase
            .from('organization_billing')
            .insert({ ...billingData, organization_id: organization.id });

          if (insertError) {
            console.error('[OrganizationRepository] Billing update error:', insertError);
          }
        }
      }

      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update organization')
      );
    }
  }

  /**
   * Find organization by ID
   */
  async findById(id: OrganizationId): Promise<Result<Organization>> {
    try {
      const { data: orgData, error } = await this.supabase
        .from('organizations')
        .select(`
          *,
          organization_members(
            user_id,
            role,
            permissions,
            department,
            title,
            joined_at,
            invited_by,
            is_active,
            last_active_at
          ),
          organization_billing(
            plan,
            status,
            trial_ends_at,
            current_period_start,
            current_period_end,
            seats,
            used_seats,
            storage_limit,
            used_storage,
            monthly_budget,
            billing_email,
            payment_method,
            next_invoice_date,
            features
          ),
          organization_compliance(
            industry,
            regulations,
            certifications,
            auditing_enabled,
            encryption_level,
            data_residency,
            compliance_officer,
            last_audit_date,
            next_audit_date
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Organization not found'));
        }
        console.error('[OrganizationRepository] Find error:', error);
        return ResultUtils.fail(new Error(`Failed to find organization: ${error.message}`));
      }

      const organization = this.dbToDomain(orgData);
      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organization')
      );
    }
  }

  /**
   * Find organization by email
   */
  async findByEmail(email: string): Promise<Result<Organization>> {
    try {
      const { data: orgData, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Organization not found'));
        }
        console.error('[OrganizationRepository] Find by email error:', error);
        return ResultUtils.fail(new Error(`Failed to find organization: ${error.message}`));
      }

      const organization = this.dbToDomain(orgData);
      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organization by email')
      );
    }
  }

  /**
   * Find organization by tax ID
   */
  async findByTaxId(taxId: string): Promise<Result<Organization>> {
    try {
      const { data: orgData, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('tax_id', taxId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Organization not found'));
        }
        console.error('[OrganizationRepository] Find by tax ID error:', error);
        return ResultUtils.fail(new Error(`Failed to find organization: ${error.message}`));
      }

      const organization = this.dbToDomain(orgData);
      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organization by tax ID')
      );
    }
  }

  /**
   * Find organizations by member
   */
  async findByMember(userId: UserId, role?: MemberRole): Promise<Result<Organization[]>> {
    try {
      let query = this.supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (role) {
        query = query.eq('role', role);
      }

      const { data: memberData, error: memberError } = await query;

      if (memberError) {
        console.error('[OrganizationRepository] Find member organizations error:', memberError);
        return ResultUtils.fail(new Error(`Failed to find organizations: ${memberError.message}`));
      }

      if (!memberData || memberData.length === 0) {
        return ResultUtils.ok([]);
      }

      const orgIds = memberData.map((m: any) => m.organization_id);

      const { data: orgData, error } = await this.supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (error) {
        console.error('[OrganizationRepository] Find organizations error:', error);
        return ResultUtils.fail(new Error(`Failed to find organizations: ${error.message}`));
      }

      const organizations = orgData.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(organizations);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organizations by member')
      );
    }
  }

  /**
   * Find organizations by owner
   */
  async findByOwner(userId: UserId): Promise<Result<Organization[]>> {
    return this.findByMember(userId, 'owner');
  }

  /**
   * Search organizations
   */
  async search(query: string, options?: OrganizationListOptions): Promise<Result<Organization[]>> {
    try {
      let dbQuery = this.supabase
        .from('organizations')
        .select('*')
        .or(`name.ilike.%${query}%,legal_name.ilike.%${query}%,description.ilike.%${query}%`);

      dbQuery = this.applyFilters(dbQuery, options?.filters);
      dbQuery = this.applySorting(dbQuery, options);
      dbQuery = this.applyPagination(dbQuery, options);

      const { data, error } = await dbQuery;

      if (error) {
        console.error('[OrganizationRepository] Search error:', error);
        return ResultUtils.fail(new Error(`Failed to search organizations: ${error.message}`));
      }

      const organizations = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(organizations);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search organizations')
      );
    }
  }

  /**
   * List organizations with filters
   */
  async list(options: OrganizationListOptions): Promise<Result<{ organizations: Organization[]; total: number }>> {
    try {
      let query = this.supabase
        .from('organizations')
        .select('*', { count: 'exact' });

      query = this.applyFilters(query, options.filters);
      query = this.applySorting(query, options);
      query = this.applyPagination(query, options);

      const { data, error, count } = await query;

      if (error) {
        console.error('[OrganizationRepository] List error:', error);
        return ResultUtils.fail(new Error(`Failed to list organizations: ${error.message}`));
      }

      const organizations = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok({ organizations, total: count || 0 });
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list organizations')
      );
    }
  }

  /**
   * Delete an organization (soft delete)
   */
  async delete(id: OrganizationId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('organizations')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('[OrganizationRepository] Delete error:', error);
        return ResultUtils.fail(new Error(`Failed to delete organization: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete organization')
      );
    }
  }

  /**
   * Permanently delete an organization
   */
  async permanentDelete(id: OrganizationId): Promise<Result<void>> {
    try {
      // Delete related data first
      await this.supabase.from('organization_members').delete().eq('organization_id', id);
      await this.supabase.from('organization_billing').delete().eq('organization_id', id);
      await this.supabase.from('organization_compliance').delete().eq('organization_id', id);

      const { error } = await this.supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[OrganizationRepository] Permanent delete error:', error);
        return ResultUtils.fail(new Error(`Failed to permanently delete organization: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to permanently delete organization')
      );
    }
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: OrganizationId,
    member: {
      userId: UserId;
      role: MemberRole;
      permissions?: string[];
      department?: string;
      title?: string;
    }
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: member.userId,
          role: member.role,
          permissions: member.permissions || [],
          department: member.department,
          title: member.title,
          joined_at: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        console.error('[OrganizationRepository] Add member error:', error);
        return ResultUtils.fail(new Error(`Failed to add member: ${error.message}`));
      }

      // Update used seats in billing
      await this.supabase.rpc('increment_used_seats', { org_id: organizationId });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to add member')
      );
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: OrganizationId, userId: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        console.error('[OrganizationRepository] Remove member error:', error);
        return ResultUtils.fail(new Error(`Failed to remove member: ${error.message}`));
      }

      // Update used seats in billing
      await this.supabase.rpc('decrement_used_seats', { org_id: organizationId });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to remove member')
      );
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    newRole: MemberRole
  ): Promise<Result<void>> {
    try {
      // Get role-based permissions
      const rolePermissions: Record<MemberRole, string[]> = {
        owner: ['*'],
        admin: ['manage_members', 'manage_boards', 'manage_settings', 'view_analytics'],
        board_member: ['view_boards', 'participate_meetings', 'view_documents'],
        executive: ['view_boards', 'view_analytics', 'manage_departments'],
        member: ['view_boards', 'view_documents'],
        guest: ['view_limited']
      };

      const { error } = await this.supabase
        .from('organization_members')
        .update({ 
          role: newRole,
          permissions: rolePermissions[newRole]
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        console.error('[OrganizationRepository] Update member role error:', error);
        return ResultUtils.fail(new Error(`Failed to update member role: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update member role')
      );
    }
  }

  /**
   * Update member permissions
   */
  async updateMemberPermissions(
    organizationId: OrganizationId,
    userId: UserId,
    permissions: string[]
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('organization_members')
        .update({ permissions })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        console.error('[OrganizationRepository] Update member permissions error:', error);
        return ResultUtils.fail(new Error(`Failed to update member permissions: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update member permissions')
      );
    }
  }

  /**
   * Get organization statistics
   */
  async getStatistics(filters?: OrganizationFilters): Promise<Result<OrganizationStatistics>> {
    try {
      let query = this.supabase.from('organizations').select('*', { count: 'exact' });
      
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[OrganizationRepository] Get statistics error:', error);
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const byType: Record<OrganizationType, number> = {
        corporation: 0,
        non_profit: 0,
        government: 0,
        educational: 0,
        partnership: 0,
        other: 0
      };

      const byStatus: Record<OrganizationStatus, number> = {
        active: 0,
        inactive: 0,
        suspended: 0,
        pending_verification: 0,
        archived: 0
      };

      const byPlan: Record<BillingPlan, number> = {
        free: 0,
        starter: 0,
        professional: 0,
        enterprise: 0,
        custom: 0
      };

      let totalMembers = 0;
      let totalRevenue = 0;

      data.forEach((org: any) => {
        byType[org.type as OrganizationType]++;
        byStatus[org.status as OrganizationStatus]++;
        // Would need to join with billing table for plan info
      });

      const statistics: OrganizationStatistics = {
        totalOrganizations: count || 0,
        byType,
        byStatus,
        byPlan,
        totalMembers,
        totalRevenue,
        averageMembersPerOrg: count > 0 ? totalMembers / count : 0,
        churnRate: 0, // Would need historical data
        growthRate: 0 // Would need historical data
      };

      return ResultUtils.ok(statistics);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get organization statistics')
      );
    }
  }

  /**
   * Get member statistics for an organization
   */
  async getMemberStatistics(organizationId: OrganizationId): Promise<Result<MemberStatistics>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[OrganizationRepository] Get member statistics error:', error);
        return ResultUtils.fail(new Error(`Failed to get member statistics: ${error.message}`));
      }

      const byRole: Record<MemberRole, number> = {
        owner: 0,
        admin: 0,
        board_member: 0,
        executive: 0,
        member: 0,
        guest: 0
      };

      let activeMembers = 0;
      let inactiveMembers = 0;

      data.forEach((member: any) => {
        byRole[member.role as MemberRole]++;
        if (member.is_active) {
          activeMembers++;
        } else {
          inactiveMembers++;
        }
      });

      const statistics: MemberStatistics = {
        organizationId,
        totalMembers: data.length,
        byRole,
        activeMembers,
        inactiveMembers,
        averageActivityLevel: 0, // Would need activity tracking
        lastMonthGrowth: 0 // Would need historical data
      };

      return ResultUtils.ok(statistics);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get member statistics')
      );
    }
  }

  /**
   * Update billing information
   */
  async updateBilling(
    organizationId: OrganizationId,
    billing: {
      plan?: BillingPlan;
      seats?: number;
      paymentMethod?: string;
    }
  ): Promise<Result<void>> {
    try {
      const updateData: any = {};
      if (billing.plan !== undefined) updateData.plan = billing.plan;
      if (billing.seats !== undefined) updateData.seats = billing.seats;
      if (billing.paymentMethod !== undefined) updateData.payment_method = billing.paymentMethod;

      const { error } = await this.supabase
        .from('organization_billing')
        .update(updateData)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[OrganizationRepository] Update billing error:', error);
        return ResultUtils.fail(new Error(`Failed to update billing: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update billing')
      );
    }
  }

  /**
   * Update compliance information
   */
  async updateCompliance(
    organizationId: OrganizationId,
    compliance: {
      regulations?: string[];
      certifications?: string[];
      auditingEnabled?: boolean;
    }
  ): Promise<Result<void>> {
    try {
      const updateData: any = {};
      if (compliance.regulations !== undefined) updateData.regulations = compliance.regulations;
      if (compliance.certifications !== undefined) updateData.certifications = compliance.certifications;
      if (compliance.auditingEnabled !== undefined) updateData.auditing_enabled = compliance.auditingEnabled;

      const { error } = await this.supabase
        .from('organization_compliance')
        .update(updateData)
        .eq('organization_id', organizationId);

      if (error) {
        // If no compliance record exists, insert it
        const { error: insertError } = await this.supabase
          .from('organization_compliance')
          .insert({ ...updateData, organization_id: organizationId });

        if (insertError) {
          console.error('[OrganizationRepository] Update compliance error:', insertError);
          return ResultUtils.fail(new Error(`Failed to update compliance: ${insertError.message}`));
        }
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update compliance')
      );
    }
  }

  /**
   * Check if user is member of organization
   */
  async isMember(organizationId: OrganizationId, userId: UserId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[OrganizationRepository] Check member error:', error);
        return ResultUtils.fail(new Error(`Failed to check membership: ${error.message}`));
      }

      return ResultUtils.ok(!!data);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check membership')
      );
    }
  }

  /**
   * Check if user has permission in organization
   */
  async hasPermission(
    organizationId: OrganizationId,
    userId: UserId,
    permission: string
  ): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('permissions')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.ok(false);
        }
        console.error('[OrganizationRepository] Check permission error:', error);
        return ResultUtils.fail(new Error(`Failed to check permission: ${error.message}`));
      }

      const hasPermission = data.permissions.includes('*') || data.permissions.includes(permission);
      return ResultUtils.ok(hasPermission);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check permission')
      );
    }
  }

  /**
   * Get organizations approaching seat limit
   */
  async findApproachingSeatLimit(threshold: number): Promise<Result<Organization[]>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_billing')
        .select('*, organizations(*)')
        .gte('used_seats', this.supabase.raw('seats - ?', [threshold]));

      if (error) {
        console.error('[OrganizationRepository] Find approaching seat limit error:', error);
        return ResultUtils.fail(new Error(`Failed to find organizations: ${error.message}`));
      }

      const organizations = data.map((d: any) => this.dbToDomain(d.organizations));
      return ResultUtils.ok(organizations);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organizations approaching seat limit')
      );
    }
  }

  /**
   * Get organizations with expiring trials
   */
  async findExpiringTrials(daysAhead: number): Promise<Result<Organization[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await this.supabase
        .from('organization_billing')
        .select('*, organizations(*)')
        .eq('status', 'trial')
        .lte('trial_ends_at', futureDate.toISOString())
        .gte('trial_ends_at', new Date().toISOString());

      if (error) {
        console.error('[OrganizationRepository] Find expiring trials error:', error);
        return ResultUtils.fail(new Error(`Failed to find organizations: ${error.message}`));
      }

      const organizations = data.map((d: any) => this.dbToDomain(d.organizations));
      return ResultUtils.ok(organizations);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find organizations with expiring trials')
      );
    }
  }

  /**
   * Archive inactive organizations
   */
  async archiveInactive(inactiveDays: number): Promise<Result<number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

      const { data, error } = await this.supabase
        .from('organizations')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .lt('updated_at', cutoffDate.toISOString())
        .eq('status', 'inactive')
        .select();

      if (error) {
        console.error('[OrganizationRepository] Archive inactive error:', error);
        return ResultUtils.fail(new Error(`Failed to archive organizations: ${error.message}`));
      }

      return ResultUtils.ok(data.length);
    } catch (error) {
      console.error('[OrganizationRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to archive inactive organizations')
      );
    }
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters?: OrganizationFilters): any {
    if (!filters) return query;

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type);
      } else {
        query = query.eq('type', filters.type);
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.country) {
      query = query.eq('address->country', filters.country);
    }

    if (filters.createdAfter) {
      query = query.gte('created_at', filters.createdAfter.toISOString());
    }

    if (filters.createdBefore) {
      query = query.lte('created_at', filters.createdBefore.toISOString());
    }

    return query;
  }

  /**
   * Apply sorting to query
   */
  private applySorting(query: any, options?: OrganizationListOptions): any {
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';

    const sortMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      memberCount: 'member_count'
    };

    const column = sortMap[sortBy] || 'created_at';
    return query.order(column, { ascending: sortOrder === 'asc' });
  }

  /**
   * Apply pagination to query
   */
  private applyPagination(query: any, options?: OrganizationListOptions): any {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    return query.range(offset, offset + limit - 1);
  }

  /**
   * Convert domain entity to database format
   */
  private domainToDb(organization: Organization): any {
    const props = organization.toPersistence();
    
    return {
      id: props.id,
      name: props.name,
      legal_name: props.legalName,
      type: props.type,
      status: props.status,
      description: props.description,
      website: props.website,
      email: props.email,
      phone: props.phone,
      address: props.address,
      tax_id: props.taxId,
      registration_number: props.registrationNumber,
      incorporation_date: props.incorporationDate,
      settings: props.settings,
      metadata: props.metadata,
      created_by: props.createdBy,
      created_at: props.createdAt,
      updated_at: props.updatedAt,
      verified_at: props.verifiedAt,
      archived_at: props.archivedAt
    };
  }

  /**
   * Convert database format to domain entity
   */
  private dbToDomain(data: any): Organization {
    const members: OrganizationMember[] = data.organization_members?.map((m: any) => ({
      userId: m.user_id,
      role: m.role,
      permissions: m.permissions || [],
      joinedAt: new Date(m.joined_at),
      invitedBy: m.invited_by,
      department: m.department,
      title: m.title,
      isActive: m.is_active,
      lastActiveAt: m.last_active_at ? new Date(m.last_active_at) : undefined
    })) || [];

    const billing: BillingInfo = data.organization_billing?.[0] ? {
      plan: data.organization_billing[0].plan,
      status: data.organization_billing[0].status,
      trialEndsAt: data.organization_billing[0].trial_ends_at ? new Date(data.organization_billing[0].trial_ends_at) : undefined,
      currentPeriodStart: new Date(data.organization_billing[0].current_period_start),
      currentPeriodEnd: new Date(data.organization_billing[0].current_period_end),
      seats: data.organization_billing[0].seats,
      usedSeats: data.organization_billing[0].used_seats,
      storageLimit: data.organization_billing[0].storage_limit,
      usedStorage: data.organization_billing[0].used_storage,
      monthlyBudget: data.organization_billing[0].monthly_budget,
      billingEmail: data.organization_billing[0].billing_email,
      paymentMethod: data.organization_billing[0].payment_method,
      nextInvoiceDate: data.organization_billing[0].next_invoice_date ? new Date(data.organization_billing[0].next_invoice_date) : undefined,
      features: data.organization_billing[0].features || []
    } : {
      plan: 'free',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      seats: 5,
      usedSeats: 0,
      storageLimit: 5,
      usedStorage: 0,
      features: []
    };

    const props: OrganizationProps = {
      id: data.id,
      name: data.name,
      legalName: data.legal_name,
      type: data.type,
      status: data.status,
      description: data.description,
      website: data.website,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.tax_id,
      registrationNumber: data.registration_number,
      incorporationDate: data.incorporation_date ? new Date(data.incorporation_date) : undefined,
      members,
      settings: data.settings || this.getDefaultSettings(),
      billing,
      compliance: data.organization_compliance?.[0],
      branding: data.branding,
      metadata: data.metadata,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
      archivedAt: data.archived_at ? new Date(data.archived_at) : undefined
    };

    return Organization.fromPersistence(props);
  }

  /**
   * Get default organization settings
   */
  private getDefaultSettings(): OrganizationSettings {
    return {
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      fiscalYearStart: 1,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartsOn: 0,
      defaultMeetingDuration: 60,
      requireTwoFactorAuth: false,
      allowGuestAccess: false,
      dataRetentionDays: 365,
      autoArchiveAfterDays: 730,
      notificationSettings: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'weekly'
      }
    };
  }
}