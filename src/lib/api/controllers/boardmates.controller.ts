import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseController, CommonSchemas } from '../base-controller';
import { Result, Ok, Err, ResultUtils } from '../../result';
import { createServerRepositoryFactory } from '../../repositories';
import { isFailure } from '../../repositories/result';
import { createUserId } from '../../../types/branded';

/**
 * Consolidated Boardmates API Controller
 * Handles all boardmate-related endpoints in a single controller
 */
export class BoardmatesController extends BaseController {

  // ============ BOARDMATE MANAGEMENT ============
  async getBoardmates(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      ...CommonSchemas.search.shape,
      status: z.enum(['active', 'pending', 'inactive']).optional(),
      role: z.string().optional(),
      organization_id: z.string().optional()
    }));

    if (ResultUtils.isErr(queryResult)) {
      return this.errorResponse(ResultUtils.getError(queryResult)!);
    }
    
    const userIdResult = await this.getUserId(request);
    if (ResultUtils.isErr(userIdResult)) {
      return this.errorResponse(ResultUtils.getError(userIdResult)!);
    }
    
    const { page, limit, q, filter, sort, status, role, organization_id } = ResultUtils.unwrap(queryResult);
    
    // TODO: Implement database query with user permissions
    const mockBoardmates = [
      {
        id: 'boardmate-1',
        userId: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'Board Member',
        department: 'Strategy',
        organizationId: 'org-1',
        status: 'active',
        profile: {
          title: 'Senior VP of Strategy',
          bio: 'Experienced leader in strategic planning',
          avatar: '/avatars/john.jpg',
          expertise: ['Strategy', 'Finance', 'Operations']
        },
        permissions: {
          canViewDocuments: true,
          canEditDocuments: false,
          canInviteMembers: false,
          canManageVaults: false
        },
        activity: {
          lastLogin: new Date().toISOString(),
          documentsAccessed: 15,
          meetingsAttended: 8
        },
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    return this.paginatedResponse(mockBoardmates, 1, page, limit);
  }

  async getBoardmate(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      
      // TODO: Fetch boardmate with permission check
      const boardmate = {
        id,
        userId: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'Board Member',
        department: 'Strategy',
        organizationId: 'org-1',
        status: 'active',
        profile: {
          title: 'Senior VP of Strategy',
          bio: 'Experienced leader in strategic planning and business development',
          avatar: '/avatars/john.jpg',
          expertise: ['Strategy', 'Finance', 'Operations', 'M&A'],
          education: 'MBA Harvard Business School',
          experience: '15+ years in corporate strategy'
        },
        permissions: {
          canViewDocuments: true,
          canEditDocuments: false,
          canInviteMembers: false,
          canManageVaults: false,
          canAccessFinancials: true
        },
        activity: {
          lastLogin: new Date().toISOString(),
          documentsAccessed: 15,
          meetingsAttended: 8,
          commentsPosted: 12,
          votesParticipated: 5
        },
        preferences: {
          notifications: {
            email: true,
            push: false,
            frequency: 'daily'
          },
          privacy: {
            profileVisible: true,
            activityVisible: false
          }
        },
        associations: [
          {
            type: 'committee',
            id: 'committee-1',
            name: 'Strategic Planning Committee',
            role: 'Member'
          }
        ],
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return Ok(boardmate);
    });
  }

  async createBoardmate(request: NextRequest): Promise<NextResponse> {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
      role: z.string().min(1).max(50),
      department: z.string().max(50).optional(),
      organizationId: z.string(),
      profile: z.object({
        title: z.string().max(100).optional(),
        bio: z.string().max(500).optional(),
        expertise: z.array(z.string()).optional(),
        education: z.string().max(200).optional(),
        experience: z.string().max(300).optional()
      }).optional(),
      permissions: z.object({
        canViewDocuments: z.boolean().default(true),
        canEditDocuments: z.boolean().default(false),
        canInviteMembers: z.boolean().default(false),
        canManageVaults: z.boolean().default(false),
        canAccessFinancials: z.boolean().default(false)
      }).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const boardmateData = ResultUtils.unwrap(bodyResult);
      
      // TODO: Create boardmate in database and send invitation
      const newBoardmate = {
        id: 'new-boardmate-id',
        ...boardmateData,
        status: 'pending',
        activity: {
          lastLogin: null,
          documentsAccessed: 0,
          meetingsAttended: 0,
          commentsPosted: 0,
          votesParticipated: 0
        },
        preferences: {
          notifications: {
            email: true,
            push: false,
            frequency: 'daily'
          },
          privacy: {
            profileVisible: true,
            activityVisible: false
          }
        },
        invitedBy: ResultUtils.unwrap(userIdResult),
        invitedAt: new Date().toISOString(),
        joinedAt: null,
        updatedAt: new Date().toISOString()
      };
      
      return Ok(newBoardmate);
    });
  }

  async updateBoardmate(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      role: z.string().min(1).max(50).optional(),
      department: z.string().max(50).optional(),
      status: z.enum(['active', 'pending', 'inactive']).optional(),
      profile: z.object({
        title: z.string().max(100).optional(),
        bio: z.string().max(500).optional(),
        expertise: z.array(z.string()).optional(),
        education: z.string().max(200).optional(),
        experience: z.string().max(300).optional()
      }).optional(),
      permissions: z.object({
        canViewDocuments: z.boolean().optional(),
        canEditDocuments: z.boolean().optional(),
        canInviteMembers: z.boolean().optional(),
        canManageVaults: z.boolean().optional(),
        canAccessFinancials: z.boolean().optional()
      }).optional(),
      preferences: z.object({
        notifications: z.object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          frequency: z.enum(['immediate', 'daily', 'weekly']).optional()
        }).optional(),
        privacy: z.object({
          profileVisible: z.boolean().optional(),
          activityVisible: z.boolean().optional()
        }).optional()
      }).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id } = this.getPathParams(context);
      const updates = ResultUtils.unwrap(bodyResult);
      
      // TODO: Update boardmate in database with permission check
      return Ok({
        id,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    });
  }

  async deleteBoardmate(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      
      // TODO: Soft delete boardmate and handle cleanup
      return Ok({ 
        deleted: true, 
        id,
        deletedAt: new Date().toISOString()
      });
    });
  }

  // ============ BOARDMATE INVITATIONS ============
  async inviteBoardmate(request: NextRequest): Promise<NextResponse> {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
      role: z.string().min(1).max(50),
      organizationId: z.string(),
      message: z.string().max(500).optional(),
      expiresInDays: z.number().min(1).max(30).default(7),
      permissions: z.object({
        canViewDocuments: z.boolean().default(true),
        canEditDocuments: z.boolean().default(false),
        canInviteMembers: z.boolean().default(false),
        canManageVaults: z.boolean().default(false),
        canAccessFinancials: z.boolean().default(false)
      }).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const invitationData = ResultUtils.unwrap(bodyResult);
      
      // TODO: Create invitation and send email
      const invitation = {
        id: 'invitation-id',
        ...invitationData,
        invitedBy: ResultUtils.unwrap(userIdResult),
        status: 'pending',
        token: 'secure-invitation-token',
        expiresAt: new Date(Date.now() + invitationData.expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };
      
      return Ok(invitation);
    });
  }

  async getBoardmateInvitations(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      ...CommonSchemas.pagination.shape,
      status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
      organization_id: z.string().optional()
    }));

    if (ResultUtils.isErr(queryResult)) {
      return this.errorResponse(ResultUtils.getError(queryResult)!);
    }
    
    const userIdResult = await this.getUserId(request);
    if (ResultUtils.isErr(userIdResult)) {
      return this.errorResponse(ResultUtils.getError(userIdResult)!);
    }
    
    const { page, limit, status, organization_id } = ResultUtils.unwrap(queryResult);
    
    // TODO: Fetch invitations with filters
    const invitations = [
      {
        id: 'invitation-1',
        email: 'newmember@example.com',
        name: 'Jane Smith',
        role: 'Board Member',
        organizationId: 'org-1',
        invitedBy: ResultUtils.unwrap(userIdResult),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
    
    return this.paginatedResponse(
      invitations.filter(inv => !status || inv.status === status),
      1,
      page,
      limit
    );
  }

  // ============ BOARDMATE ASSOCIATIONS ============
  async getBoardmateAssociations(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      type: z.enum(['committee', 'workgroup', 'project']).optional()
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const { type } = ResultUtils.unwrap(queryResult);
      
      // TODO: Fetch associations from database
      const associations = [
        {
          id: 'assoc-1',
          boardmateId: id,
          type: 'committee',
          entityId: 'committee-1',
          entityName: 'Strategic Planning Committee',
          role: 'Member',
          permissions: ['view', 'contribute'],
          joinedAt: new Date().toISOString(),
          status: 'active'
        },
        {
          id: 'assoc-2',
          boardmateId: id,
          type: 'workgroup',
          entityId: 'workgroup-1',
          entityName: 'Digital Transformation Workgroup',
          role: 'Lead',
          permissions: ['view', 'contribute', 'manage'],
          joinedAt: new Date().toISOString(),
          status: 'active'
        }
      ];
      
      return Ok(associations.filter(assoc => !type || assoc.type === type));
    });
  }

  async createBoardmateAssociation(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const schema = z.object({
      type: z.enum(['committee', 'workgroup', 'project']),
      entityId: z.string(),
      entityName: z.string(),
      role: z.string().default('Member'),
      permissions: z.array(z.enum(['view', 'contribute', 'manage'])).default(['view'])
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id } = this.getPathParams(context);
      const associationData = ResultUtils.unwrap(bodyResult);
      
      // TODO: Create association in database
      const association = {
        id: 'new-association-id',
        boardmateId: id,
        ...associationData,
        joinedAt: new Date().toISOString(),
        status: 'active',
        createdBy: ResultUtils.unwrap(userIdResult)
      };
      
      return Ok(association);
    });
  }

  async updateBoardmateAssociation(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const schema = z.object({
      role: z.string().optional(),
      permissions: z.array(z.enum(['view', 'contribute', 'manage'])).optional(),
      status: z.enum(['active', 'inactive']).optional()
    });

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;
      
      const { id } = this.getPathParams(context);
      const updates = ResultUtils.unwrap(bodyResult);
      
      // TODO: Update association in database
      return Ok({
        boardmateId: id,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: ResultUtils.unwrap(userIdResult)
      });
    });
  }

  async deleteBoardmateAssociation(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      entityId: z.string(),
      type: z.enum(['committee', 'workgroup', 'project'])
    }));

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult;
      
      const userIdResult = await this.getUserId(request);
      if (ResultUtils.isErr(userIdResult)) return userIdResult;
      
      const { id } = this.getPathParams(context);
      const { entityId, type } = ResultUtils.unwrap(queryResult);
      
      // TODO: Delete association from database
      return Ok({ 
        deleted: true, 
        boardmateId: id,
        entityId,
        type,
        deletedAt: new Date().toISOString()
      });
    });
  }

  // ============ INVITATION VALIDATION AND ACCEPTANCE ============
  
  /**
   * Validate invitation token (GET /api/boardmates/invite)
   */
  async validateInvitation(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      token: z.string().min(10, 'Invalid token format')
    }));

    if (ResultUtils.isErr(queryResult)) {
      return this.errorResponse(ResultUtils.getError(queryResult)!);
    }

    const { token } = ResultUtils.unwrap(queryResult);

    return this.handleRequest(request, async () => {
      const repositories = await createServerRepositoryFactory();
      
      // Find invitation by token
      const invitationResult = await repositories.boardmates.findInvitationByToken(token);
      if (isFailure(invitationResult)) {
        return Err({
          code: 'INVITATION_ERROR',
          message: 'Failed to validate invitation',
          details: invitationResult.error
        });
      }

      const invitation = invitationResult.data;
      if (!invitation || invitation.status !== 'pending') {
        return Err({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      
      if (now > expiresAt) {
        // Mark invitation as expired
        await repositories.boardmates.updateInvitationStatus(
          invitation.id,
          'expired'
        );

        return Err({
          code: 'INVITATION_EXPIRED',
          message: 'Invitation has expired'
        });
      }

      return Ok({
        invitation: {
          id: invitation.id,
          token: invitation.invitation_token,
          expiresAt: invitation.expires_at,
          customMessage: invitation.custom_message,
          accessLevel: invitation.access_level,
          createdAt: invitation.created_at
        },
        boardMate: invitation.board_members ? {
          id: invitation.board_members.id,
          fullName: invitation.board_members.full_name,
          email: invitation.board_members.email,
          role: invitation.board_members.board_role,
          organizationName: invitation.board_members.organization_name
        } : null,
        organization: invitation.organizations ? {
          id: invitation.organizations.id,
          name: invitation.organizations.name,
          slug: invitation.organizations.slug
        } : null
      });
    });
  }

  /**
   * Accept invitation and create user account (POST /api/boardmates/invite)
   */
  async acceptInvitation(request: NextRequest): Promise<NextResponse> {
    const schema = z.object({
      token: z.string().min(10, 'Invalid token format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().min(1, 'First name is required').max(50),
      lastName: z.string().min(1, 'Last name is required').max(50)
    });

    return this.handleRequest(request, async () => {
      const bodyResult = await this.validateBody(request, schema);
      if (ResultUtils.isErr(bodyResult)) return bodyResult;

      const { token, password, firstName, lastName } = ResultUtils.unwrap(bodyResult);
      
      const repositories = await createServerRepositoryFactory();
      
      // Find and validate invitation
      const invitationResult = await repositories.boardmates.findInvitationByToken(token);
      if (isFailure(invitationResult)) {
        return Err({
          code: 'INVITATION_ERROR',
          message: 'Failed to validate invitation',
          details: invitationResult.error
        });
      }

      const invitation = invitationResult.data;
      if (!invitation || invitation.status !== 'pending') {
        return Err({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      
      if (now > expiresAt) {
        await repositories.boardmates.updateInvitationStatus(
          invitation.id,
          'expired'
        );

        return Err({
          code: 'INVITATION_EXPIRED',
          message: 'Invitation has expired'
        });
      }

      // Check if user already exists
      const existingUserResult = await repositories.boardmates.checkExistingUserByEmail(
        invitation.board_members?.email || ''
      );
      if (isFailure(existingUserResult)) {
        return Err({
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate user',
          details: existingUserResult.error
        });
      }

      if (existingUserResult.data) {
        return Err({
          code: 'USER_EXISTS',
          message: 'User already exists with this email address'
        });
      }

      // Create user account with Supabase Auth
      const authResult = await repositories.auth.createUserWithEmailAndPassword({
        email: invitation.board_members?.email || '',
        password: password,
        emailConfirm: true,
        userMetadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          invited_via_board_mate: true,
          board_member_id: invitation.board_member_id,
          organization_id: invitation.organization_id
        }
      });

      if (isFailure(authResult)) {
        return Err({
          code: 'USER_CREATION_ERROR',
          message: 'Failed to create user account',
          details: authResult.error
        });
      }

      const authUser = authResult.data;

      // Create user profile
      const profileResult = await repositories.boardmates.createUserFromInvitation(
        invitation,
        {
          authUserId: authUser.user.id,
          email: authUser.user.email || '',
          firstName: firstName.trim(),
          lastName: lastName.trim()
        }
      );

      if (isFailure(profileResult)) {
        // Cleanup auth user if profile creation fails
        await repositories.auth.deleteUser(authUser.user.id);
        return Err({
          code: 'PROFILE_CREATION_ERROR',
          message: 'Failed to create user profile',
          details: profileResult.error
        });
      }

      // Link user to board member record and add to organization
      const userIdResult = createUserId(authUser.user.id);
      if (userIdResult.success) {
        // Link user to board member record
        const linkResult = await repositories.boardmates.linkUserToBoardMember(
          userIdResult.data,
          invitation.board_member_id
        );
        
        if (isFailure(linkResult)) {
          console.error('Error linking user to board member:', linkResult.error);
          // Don't fail here - user is created, just not linked properly
        }

        // Add user to organization
        const orgResult = await repositories.boardmates.addUserToOrganization(
          userIdResult.data,
          invitation.organization_id,
          invitation.board_member_id,
          'member'
        );
        
        if (isFailure(orgResult)) {
          console.error('Error adding user to organization:', orgResult.error);
          // Don't fail here - user is created, just not added to org properly
        }

        // Mark invitation as accepted
        await repositories.boardmates.updateInvitationStatus(
          invitation.id,
          'accepted',
          userIdResult.data
        );
      }

      return Ok({
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          fullName: `${firstName.trim()} ${lastName.trim()}`
        },
        boardMember: {
          id: invitation.board_member_id
        },
        organization: {
          id: invitation.organization_id
        }
      });
    });
  }
}