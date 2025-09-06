/**
 * Organization Repository Interface
 * Port for organization persistence operations
 */

import { Result } from '../../../01-shared/types/core.types';
import { Organization, OrganizationType, OrganizationStatus, MemberRole, BillingPlan } from '../../../domain/entities/organization.entity';
import type { OrganizationId, UserId } from '../../../types/core';

export interface OrganizationFilters {
  type?: OrganizationType | OrganizationType[];
  status?: OrganizationStatus | OrganizationStatus[];
  billingPlan?: BillingPlan | BillingPlan[];
  createdBy?: UserId;
  hasFeature?: string[];
  industry?: string;
  country?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface OrganizationListOptions {
  filters?: OrganizationFilters;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeMembers?: boolean;
  includeBilling?: boolean;
  includeCompliance?: boolean;
}

export interface OrganizationStatistics {
  totalOrganizations: number;
  byType: Record<OrganizationType, number>;
  byStatus: Record<OrganizationStatus, number>;
  byPlan: Record<BillingPlan, number>;
  totalMembers: number;
  totalRevenue: number;
  averageMembersPerOrg: number;
  churnRate: number;
  growthRate: number;
}

export interface MemberStatistics {
  organizationId: OrganizationId;
  totalMembers: number;
  byRole: Record<MemberRole, number>;
  activeMembers: number;
  inactiveMembers: number;
  averageActivityLevel: number;
  lastMonthGrowth: number;
}

/**
 * Organization Repository Interface
 */
export interface IOrganizationRepository {
  /**
   * Create a new organization
   */
  create(organization: Organization): Promise<Result<Organization>>;

  /**
   * Update an existing organization
   */
  update(organization: Organization): Promise<Result<Organization>>;

  /**
   * Find organization by ID
   */
  findById(id: OrganizationId): Promise<Result<Organization>>;

  /**
   * Find organization by email
   */
  findByEmail(email: string): Promise<Result<Organization>>;

  /**
   * Find organization by tax ID
   */
  findByTaxId(taxId: string): Promise<Result<Organization>>;

  /**
   * Find organizations by member
   */
  findByMember(userId: UserId, role?: MemberRole): Promise<Result<Organization[]>>;

  /**
   * Find organizations by owner
   */
  findByOwner(userId: UserId): Promise<Result<Organization[]>>;

  /**
   * Search organizations
   */
  search(query: string, options?: OrganizationListOptions): Promise<Result<Organization[]>>;

  /**
   * List organizations with filters
   */
  list(options: OrganizationListOptions): Promise<Result<{ organizations: Organization[]; total: number }>>;

  /**
   * Delete an organization (soft delete)
   */
  delete(id: OrganizationId): Promise<Result<void>>;

  /**
   * Permanently delete an organization
   */
  permanentDelete(id: OrganizationId): Promise<Result<void>>;

  /**
   * Add member to organization
   */
  addMember(
    organizationId: OrganizationId,
    member: {
      userId: UserId;
      role: MemberRole;
      permissions?: string[];
      department?: string;
      title?: string;
    }
  ): Promise<Result<void>>;

  /**
   * Remove member from organization
   */
  removeMember(organizationId: OrganizationId, userId: UserId): Promise<Result<void>>;

  /**
   * Update member role
   */
  updateMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    newRole: MemberRole
  ): Promise<Result<void>>;

  /**
   * Update member permissions
   */
  updateMemberPermissions(
    organizationId: OrganizationId,
    userId: UserId,
    permissions: string[]
  ): Promise<Result<void>>;

  /**
   * Get organization statistics
   */
  getStatistics(filters?: OrganizationFilters): Promise<Result<OrganizationStatistics>>;

  /**
   * Get member statistics for an organization
   */
  getMemberStatistics(organizationId: OrganizationId): Promise<Result<MemberStatistics>>;

  /**
   * Update billing information
   */
  updateBilling(
    organizationId: OrganizationId,
    billing: {
      plan?: BillingPlan;
      seats?: number;
      paymentMethod?: string;
    }
  ): Promise<Result<void>>;

  /**
   * Update compliance information
   */
  updateCompliance(
    organizationId: OrganizationId,
    compliance: {
      regulations?: string[];
      certifications?: string[];
      auditingEnabled?: boolean;
    }
  ): Promise<Result<void>>;

  /**
   * Check if user is member of organization
   */
  isMember(organizationId: OrganizationId, userId: UserId): Promise<Result<boolean>>;

  /**
   * Check if user has permission in organization
   */
  hasPermission(
    organizationId: OrganizationId,
    userId: UserId,
    permission: string
  ): Promise<Result<boolean>>;

  /**
   * Get organizations approaching seat limit
   */
  findApproachingSeatLimit(threshold: number): Promise<Result<Organization[]>>;

  /**
   * Get organizations with expiring trials
   */
  findExpiringTrials(daysAhead: number): Promise<Result<Organization[]>>;

  /**
   * Archive inactive organizations
   */
  archiveInactive(inactiveDays: number): Promise<Result<number>>;
}