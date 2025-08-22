/**
 * API Route Validation Examples
 * Demonstrates how to use validation middleware with meeting resolutions and actionables
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MeetingIdSchema } from '../types/branded'
import { 
  CreateResolutionSchema,
  UpdateResolutionSchema,
  ListResolutionsQuerySchema,
  CastVoteSchema,
  InitiateVotingSchema,
  ResolutionIdSchema
} from './meeting-resolution.validation'
import {
  CreateActionableSchema,
  UpdateActionableSchema,
  ListActionablesQuerySchema,
  CreateActionableUpdateSchema,
  DelegateActionableSchema,
  ActionableIdSchema
} from './meeting-actionable.validation'
import {
  createApiValidationMiddleware,
  BusinessRules,
  CommonValidationPatterns,
  ValidateApiRoute,
  createValidationContext
} from './middleware'

// ==== Resolution API Route Examples ====

/**
 * Example: Create Resolution API Route
 * POST /api/meetings/[meetingId]/resolutions
 */
export const createResolutionValidation = createApiValidationMiddleware({
  body: CreateResolutionSchema,
  params: z.object({
    meetingId: MeetingIdSchema
  }),
  context: async (req: NextRequest) => {
    // Extract user context from session/auth
    const userId = req.headers.get('x-user-id') // Example header
    const orgId = req.headers.get('x-organization-id')
    const userRole = req.headers.get('x-user-role')
    
    return createValidationContext(
      userId || undefined,
      orgId || undefined,
      userRole || undefined,
      '/api/meetings/resolutions'
    )
  },
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    BusinessRules.organizationMembershipCheck(),
    BusinessRules.resolutionTypeCompatibility()
  ]
})

/**
 * Example: Vote on Resolution API Route  
 * POST /api/resolutions/[resolutionId]/vote
 */
export const castVoteValidation = createApiValidationMiddleware({
  body: CastVoteSchema,
  params: z.object({
    resolutionId: ResolutionIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    BusinessRules.organizationMembershipCheck(),
    {
      name: 'voting_deadline_check',
      validate: async (data: any, context) => {
        // This would check if voting is still open
        // Implementation would query database for resolution voting deadline
        return { valid: true }
      }
    },
    {
      name: 'duplicate_vote_check',
      validate: async (data: any, context) => {
        // This would check if user has already voted
        // Implementation would query database for existing votes
        return { valid: true }
      }
    }
  ]
})

/**
 * Example: List Resolutions API Route
 * GET /api/meetings/[meetingId]/resolutions
 */
export const listResolutionsValidation = createApiValidationMiddleware({
  query: ListResolutionsQuerySchema,
  params: z.object({
    meetingId: MeetingIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    BusinessRules.organizationMembershipCheck()
  ]
})

// ==== Actionable API Route Examples ====

/**
 * Example: Create Actionable API Route
 * POST /api/meetings/[meetingId]/actionables
 */
export const createActionableValidation = createApiValidationMiddleware({
  body: CreateActionableSchema,
  params: z.object({
    meetingId: MeetingIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    BusinessRules.organizationMembershipCheck(),
    BusinessRules.actionableDueDateValidation(),
    BusinessRules.actionableDependencyValidation(),
    {
      name: 'assignee_membership_check',
      validate: async (data: any, context) => {
        // Check if assignedTo user is member of organization
        const { assignedTo } = data.body || {}
        if (assignedTo && context?.organizationId) {
          // Implementation would verify org membership
          return { valid: true }
        }
        return { valid: false, message: 'Assignee must be organization member' }
      }
    }
  ]
})

/**
 * Example: Update Actionable Progress API Route
 * POST /api/actionables/[actionableId]/updates
 */
export const createActionableUpdateValidation = createApiValidationMiddleware({
  body: CreateActionableUpdateSchema,
  params: z.object({
    actionableId: ActionableIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    {
      name: 'update_authorization_check',
      validate: async (data: any, context) => {
        // Check if user can update this actionable (assignee, admin, or delegator)
        const actionableId = data.params?.actionableId
        const userId = context?.userId
        
        if (actionableId && userId) {
          // Implementation would check database for permissions
          return { valid: true }
        }
        return { valid: false, message: 'Not authorized to update this actionable' }
      }
    },
    {
      name: 'completion_validation',
      validate: async (data: any, context) => {
        const { updateType, newStatus, newProgress } = data.body || {}
        
        if (updateType === 'completion') {
          if (newStatus !== 'completed' || newProgress !== 100) {
            return {
              valid: false,
              message: 'Completion updates must set status to completed and progress to 100%'
            }
          }
        }
        return { valid: true }
      }
    }
  ]
})

/**
 * Example: Delegate Actionable API Route
 * POST /api/actionables/[actionableId]/delegate
 */
export const delegateActionableValidation = createApiValidationMiddleware({
  body: DelegateActionableSchema,
  params: z.object({
    actionableId: ActionableIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['admin', 'owner']), // Only admins can delegate
    {
      name: 'delegation_authorization_check',
      validate: async (data: any, context) => {
        // Check if user is current assignee or has admin rights
        const actionableId = data.params?.actionableId
        const userId = context?.userId
        
        if (actionableId && userId) {
          // Implementation would check if user is assignee or admin
          return { valid: true }
        }
        return { valid: false, message: 'Not authorized to delegate this actionable' }
      }
    },
    {
      name: 'new_assignee_validation',
      validate: async (data: any, context) => {
        const { newAssignee } = data.body || {}
        const currentUserId = context?.userId
        
        if (newAssignee === currentUserId) {
          return {
            valid: false,
            message: 'Cannot delegate actionable to yourself'
          }
        }
        
        // Check if new assignee is organization member
        if (newAssignee && context?.organizationId) {
          // Implementation would verify org membership
          return { valid: true }
        }
        return { valid: false, message: 'New assignee must be organization member' }
      }
    }
  ]
})

// ==== Decorator-based Route Examples ====

/**
 * Example using the ValidateApiRoute decorator
 */
export class ResolutionAPIRoutes {
  @ValidateApiRoute({
    body: CreateResolutionSchema,
    businessRules: CommonValidationPatterns.validateFinancialResolution()
  })
  static async createFinancialResolution(
    request: NextRequest,
    context: { params: { meetingId: string } }
  ) {
    const { body } = (request as any).validatedData
    const validationContext = (request as any).validationContext
    
    // Implementation here...
    // body is now typed and validated
    
    return NextResponse.json({
      success: true,
      data: {
        id: 'new-resolution-id',
        ...body
      }
    })
  }

  @ValidateApiRoute({
    query: ListResolutionsQuerySchema,
    businessRules: [BusinessRules.organizationMembershipCheck()]
  })
  static async listResolutions(
    request: NextRequest,
    context: { params: { meetingId: string } }
  ) {
    const { query } = (request as any).validatedData
    
    // Implementation here...
    // query is now typed and validated
    
    return NextResponse.json({
      success: true,
      data: {
        resolutions: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize
      }
    })
  }
}

/**
 * Example using middleware directly
 */
export async function createResolutionHandler(
  request: NextRequest,
  context: { params: { meetingId: string } }
) {
  const validationResult = await createResolutionValidation(request, context)
  
  if (!validationResult.isValid) {
    return validationResult.response
  }
  
  const { body } = validationResult.validatedData!
  
  // Implementation here with validated data
  try {
    // Business logic to create resolution
    const newResolution = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: newResolution
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create resolution',
      code: 'CREATION_ERROR'
    }, { status: 500 })
  }
}

// ==== Bulk Operations Examples ====

export const bulkUpdateActionablesValidation = createApiValidationMiddleware({
  body: z.object({
    actionableIds: z.array(ActionableIdSchema)
      .min(1, 'At least one actionable ID required')
      .max(50, 'Maximum 50 actionables can be updated at once'),
    updates: UpdateActionableSchema,
    reason: z.string()
      .min(1, 'Reason for bulk update required')
      .max(500, 'Reason must be 500 characters or less')
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['admin', 'owner']), // Only admins can bulk update
    {
      name: 'bulk_update_authorization',
      validate: async (data: any, context) => {
        const { actionableIds } = data.body || {}
        const userId = context?.userId
        
        // Check if user has permission to update all specified actionables
        if (actionableIds && userId) {
          // Implementation would verify permissions for each actionable
          return { valid: true }
        }
        return { valid: false, message: 'Not authorized for bulk updates' }
      }
    }
  ]
})

// ==== Advanced Validation Patterns ====

/**
 * Conditional validation based on resolution type
 */
export const createFinancialResolutionValidation = createApiValidationMiddleware({
  body: CreateResolutionSchema.refine(
    (data) => {
      if (data.resolutionType === 'financial') {
        return data.requiresBoardApproval === true
      }
      return true
    },
    {
      message: 'Financial resolutions must require board approval',
      path: ['requiresBoardApproval']
    }
  ),
  businessRules: [
    BusinessRules.userPermissionCheck(['admin', 'owner']),
    BusinessRules.resolutionQuorumCheck(0.67) // 2/3 majority for financial
  ]
})

/**
 * Multi-step validation with dependency checking
 */
export const createComplexActionableValidation = createApiValidationMiddleware({
  body: CreateActionableSchema,
  businessRules: [
    BusinessRules.actionableDueDateValidation(),
    {
      name: 'dependency_chain_validation',
      validate: async (data: any, context) => {
        const { dependsOnActionableIds } = data.body || {}
        
        if (dependsOnActionableIds?.length > 0) {
          // Check that all dependencies exist and are not circular
          // Implementation would query database for dependency chain
          return { valid: true }
        }
        return { valid: true }
      }
    },
    {
      name: 'workload_validation',
      validate: async (data: any, context) => {
        const { assignedTo, estimatedEffortHours } = data.body || {}
        
        if (assignedTo && estimatedEffortHours) {
          // Check if assignee has capacity for this workload
          // Implementation would check current workload
          return { valid: true }
        }
        return { valid: true }
      }
    }
  ]
})

export default {
  // Resolution validations
  createResolutionValidation,
  castVoteValidation,
  listResolutionsValidation,
  
  // Actionable validations  
  createActionableValidation,
  createActionableUpdateValidation,
  delegateActionableValidation,
  bulkUpdateActionablesValidation,
  
  // Advanced patterns
  createFinancialResolutionValidation,
  createComplexActionableValidation,
  
  // Route handlers
  createResolutionHandler,
  ResolutionAPIRoutes
}