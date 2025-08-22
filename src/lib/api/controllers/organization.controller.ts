import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseController, CommonSchemas } from '../base-controller';
import { Result, Ok, Err, ResultUtils } from '../../result';
import { 
  createOrganization, 
  getOrganization, 
  updateOrganization, 
  deleteOrganization, 
  listUserOrganizations,
  checkOrganizationSlugAvailability,
  getOrganizationMembers,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type OrganizationSize
} from '../../services/organization';

/**
 * Consolidated Organization API Controller
 * Handles all organization-related endpoints in a single controller
 */
export class OrganizationController extends BaseController {

  // ============ VALIDATION SCHEMAS ============
  private static readonly CreateOrganizationSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
    slug: z.string()
      .min(2, 'Slug must be at least 2 characters')
      .max(50, 'Slug must be at most 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    description: z.string().max(500, 'Description must be at most 500 characters').optional(),
    logo_url: z.string().url('Logo URL must be a valid URL').optional(),
    website: z.string().url('Website must be a valid URL').optional(),
    industry: z.string().optional(),
    organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
    settings: z.record(z.string(), z.any()).optional(),
    compliance_settings: z.record(z.string(), z.any()).optional(),
    billing_settings: z.record(z.string(), z.any()).optional()
  });

  private static readonly UpdateOrganizationSchema = OrganizationController.CreateOrganizationSchema
    .partial()
    .omit({ slug: true });

  private static readonly ListOrganizationsQuerySchema = z.object({
    ...CommonSchemas.pagination.shape,
    ...CommonSchemas.search.shape,
    status: z.enum(['active', 'inactive']).optional(),
    organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
    industry: z.string().optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    sort_by: z.enum(['name', 'created_at', 'updated_at', 'status']).optional().default('name'),
    sort_order: z.enum(['asc', 'desc']).optional().default('asc')
  });

  // ============ ORGANIZATION CRUD ============

  /**
   * GET /organizations - List user's organizations
   */
  async listOrganizations(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, OrganizationController.ListOrganizationsQuerySchema);

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const { page, limit, q: search } = ResultUtils.unwrap(queryResult);
      
      const result = await listUserOrganizations(userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to list organizations'));
      }
      
      // Apply client-side filtering and pagination if needed
      let organizations = result.organizations || [];
      
      if (search) {
        const searchLower = search.toLowerCase();
        organizations = organizations.filter(org => 
          org.name.toLowerCase().includes(searchLower) ||
          org.description?.toLowerCase().includes(searchLower) ||
          org.slug.toLowerCase().includes(searchLower)
        );
      }
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrganizations = organizations.slice(startIndex, endIndex);
      
      return Ok({
        organizations: paginatedOrganizations,
        total: organizations.length,
        page,
        limit,
        totalPages: Math.ceil(organizations.length / limit)
      });
    });
  }

  /**
   * POST /organizations - Create a new organization
   */
  async createOrganization(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, OrganizationController.CreateOrganizationSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const userId = ResultUtils.unwrap(userIdResult);
      const orgData = ResultUtils.unwrap(bodyResult) as CreateOrganizationData;
      
      // Check if slug is available
      const slugCheck = await checkOrganizationSlugAvailability(orgData.slug);
      if (!slugCheck.success) {
        return Err(new Error(slugCheck.error || 'Failed to check slug availability'));
      }
      
      if (!slugCheck.available) {
        return Err(new Error('Organization slug is already taken'));
      }
      
      const result = await createOrganization(orgData, userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to create organization'));
      }
      
      return Ok(result.organization);
    });
  }

  /**
   * GET /organizations/[id] - Get a specific organization
   */
  async getOrganization(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      
      const result = await getOrganization(id, userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to get organization'));
      }
      
      return Ok(result.organization);
    });
  }

  /**
   * PUT /organizations/[id] - Update an organization
   */
  async updateOrganization(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, OrganizationController.UpdateOrganizationSchema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      const updateData = ResultUtils.unwrap(bodyResult) as UpdateOrganizationData;
      
      const result = await updateOrganization(id, updateData, userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to update organization'));
      }
      
      return Ok(result.organization);
    });
  }

  /**
   * DELETE /organizations/[id] - Delete an organization
   */
  async deleteOrganization(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      
      // Check if immediate deletion is requested
      const url = new URL(request.url);
      const immediate = url.searchParams.get('immediate') === 'true';
      
      const result = await deleteOrganization(id, userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to delete organization'));
      }
      
      return Ok({
        deleted: true,
        organizationId: id,
        deletedAt: new Date().toISOString(),
        immediate: immediate,
        message: immediate ? 'Organization deleted immediately' : 'Organization scheduled for deletion in 30 days'
      });
    });
  }

  // ============ ORGANIZATION UTILITIES ============

  /**
   * GET /organizations/check-slug - Check if organization slug is available
   */
  async checkSlugAvailability(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      slug: z.string().min(1, 'Slug is required')
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const { slug } = ResultUtils.unwrap(queryResult);
      
      const result = await checkOrganizationSlugAvailability(slug);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to check slug availability'));
      }
      
      return Ok({
        slug,
        available: result.available,
        suggested: result.available ? undefined : `${slug}-${Date.now().toString(36)}`
      });
    });
  }

  /**
   * GET /organizations/[id]/members - Get organization members
   */
  async getMembers(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
      status: z.enum(['active', 'suspended', 'pending_activation']).optional(),
      sort_by: z.enum(['joined_at', 'role', 'name', 'email']).optional().default('joined_at'),
      sort_order: z.enum(['asc', 'desc']).optional().default('desc')
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      const { page, limit, role, status } = ResultUtils.unwrap(queryResult);
      
      const result = await getOrganizationMembers(id, userId);
      
      if (!result.success) {
        return Err(new Error(result.error || 'Failed to get organization members'));
      }
      
      let members = result.members || [];
      
      // Apply filters
      if (role) {
        members = members.filter(member => member.role === role);
      }
      
      if (status) {
        members = members.filter(member => member.status === status);
      }
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMembers = members.slice(startIndex, endIndex);
      
      return Ok({
        members: paginatedMembers,
        total: members.length,
        page,
        limit,
        totalPages: Math.ceil(members.length / limit),
        organizationId: id
      });
    });
  }

  /**
   * POST /organizations/[id]/members - Add member to organization
   */
  async addMember(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const schema = z.object({
      email: z.string().email('Valid email is required'),
      role: z.enum(['admin', 'member', 'viewer']).default('member'),
      custom_permissions: z.record(z.string(), z.any()).optional(),
      send_invitation: z.boolean().default(true)
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      const { email, role, custom_permissions, send_invitation } = ResultUtils.unwrap(bodyResult);
      
      // TODO: Implement member addition logic
      // This would typically involve:
      // 1. Check if user has permission to add members
      // 2. Check if target user exists
      // 3. Create invitation or direct membership
      // 4. Send invitation email if requested
      
      const newMember = {
        id: `member-${Date.now()}`,
        organization_id: id,
        user_id: `user-for-${email}`, // Would be resolved from email
        email,
        role,
        custom_permissions: custom_permissions || {},
        invited_by: userId,
        status: 'pending_activation' as const,
        is_primary: false,
        receive_notifications: true,
        suspicious_activity_count: 0,
        access_count: 0,
        joined_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        invitation_sent: send_invitation,
        created_at: new Date().toISOString()
      };
      
      return Ok(newMember);
    });
  }

  /**
   * PUT /organizations/[id]/members/[memberId] - Update member role/permissions
   */
  async updateMember(request: NextRequest, context: { params: { id: string; memberId: string } }): Promise<NextResponse> {
    const schema = z.object({
      role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
      custom_permissions: z.record(z.string(), z.any()).optional(),
      status: z.enum(['active', 'suspended']).optional(),
      receive_notifications: z.boolean().optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id, memberId } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      const updates = ResultUtils.unwrap(bodyResult);
      
      // TODO: Implement member update logic
      // This would typically involve:
      // 1. Check if user has permission to update members
      // 2. Validate role change permissions
      // 3. Update member record
      // 4. Log the change for audit
      
      return Ok({
        id: memberId,
        organizationId: id,
        ...updates,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      });
    });
  }

  /**
   * DELETE /organizations/[id]/members/[memberId] - Remove member from organization
   */
  async removeMember(request: NextRequest, context: { params: { id: string; memberId: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id, memberId } = this.getPathParams(context);
      const userId = ResultUtils.unwrap(userIdResult);
      
      // TODO: Implement member removal logic
      // This would typically involve:
      // 1. Check if user has permission to remove members
      // 2. Prevent removing the last owner
      // 3. Remove member record
      // 4. Revoke access permissions
      // 5. Log the change for audit
      
      return Ok({
        removed: true,
        memberId,
        organizationId: id,
        removedBy: userId,
        removedAt: new Date().toISOString()
      });
    });
  }
}