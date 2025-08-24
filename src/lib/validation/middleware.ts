/**
 * Validation Middleware for Meeting Resolutions and Actionables
 * Next.js API route validation with enhanced error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { validateWithSchema, createValidationMiddleware, ValidationMiddlewareConfig } from '../types/validation'
import { AppError, AppErrorFactory } from '../repositories/result'

// ==== Enhanced Validation Context ====

export interface ValidationContext {
  userId?: string
  organizationId?: string
  userRole?: string
  requestId?: string
  endpoint?: string
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
  warnings?: string[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  received?: any
  expected?: any
  path?: string[]
}

// ==== Custom Error Formatters ====

export function formatZodError(error: ZodError, context?: ValidationContext): ValidationError[] {
  return error.issues.map(issue => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
    received: issue.received,
    expected: getExpectedValue(issue),
    path: issue.path.map(String)
  }))
}

function getExpectedValue(issue: any): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return `type: ${issue.expected}`
    case 'invalid_enum_value':
      return `one of: ${issue.options?.join(', ')}`
    case 'too_small':
      return issue.type === 'string' 
        ? `minimum ${issue.minimum} characters` 
        : `minimum value: ${issue.minimum}`
    case 'too_big':
      return issue.type === 'string'
        ? `maximum ${issue.maximum} characters`
        : `maximum value: ${issue.maximum}`
    case 'invalid_string':
      return issue.validation ? `valid ${issue.validation}` : undefined
    default:
      return undefined
  }
}

// ==== Next.js API Validation Middleware ====

export interface ApiValidationConfig<TBody = any, TQuery = any, TParams = any> {
  body?: ZodSchema<TBody>
  query?: ZodSchema<TQuery>
  params?: ZodSchema<TParams>
  response?: ZodSchema<any>
  context?: (req: NextRequest) => Promise<ValidationContext> | ValidationContext
  onError?: (errors: ValidationError[], context?: ValidationContext) => NextResponse
  skipAuth?: boolean
  businessRules?: BusinessRuleValidator[]
}

export interface BusinessRuleValidator {
  name: string
  validate: (data: any, context?: ValidationContext) => Promise<{ valid: boolean; message?: string; code?: string }>
}

export function createApiValidationMiddleware<TBody = any, TQuery = any, TParams = any>(
  config: ApiValidationConfig<TBody, TQuery, TParams>
) {
  return async function validateRequest(
    request: NextRequest,
    context?: { params?: any }
  ): Promise<{
    isValid: boolean
    response?: NextResponse
    validatedData?: {
      body?: TBody
      query?: TQuery
      params?: TParams
    }
    validationContext?: ValidationContext
  }> {
    try {
      // Get validation context
      const validationContext = config.context 
        ? await config.context(request)
        : { requestId: crypto.randomUUID() }

      const errors: ValidationError[] = []
      const validatedData: any = {}

      // Validate request body
      if (config.body) {
        try {
          const body = await request.json()
          const bodyResult = config.body.safeParse(body)
          
          if (!bodyResult.success) {
            errors.push(...formatZodError(bodyResult.error, validationContext))
          } else {
            validatedData.body = bodyResult.data
          }
        } catch (error) {
          errors.push({
            field: 'body',
            message: 'Invalid JSON in request body',
            code: 'invalid_json'
          })
        }
      }

      // Validate query parameters
      if (config.query) {
        const url = new URL(request.url)
        const queryParams = Object.fromEntries(url.searchParams.entries())
        const queryResult = config.query.safeParse(queryParams)
        
        if (!queryResult.success) {
          errors.push(...formatZodError(queryResult.error, validationContext))
        } else {
          validatedData.query = queryResult.data
        }
      }

      // Validate route parameters
      if (config.params && context?.params) {
        const paramsResult = config.params.safeParse(context.params)
        
        if (!paramsResult.success) {
          errors.push(...formatZodError(paramsResult.error, validationContext))
        } else {
          validatedData.params = paramsResult.data
        }
      }

      // Run business rule validations
      if (config.businessRules && errors.length === 0) {
        for (const rule of config.businessRules) {
          try {
            const ruleResult = await rule.validate(validatedData, validationContext)
            if (!ruleResult.valid) {
              errors.push({
                field: 'business_rules',
                message: ruleResult.message || `Business rule '${rule.name}' failed`,
                code: ruleResult.code || 'business_rule_violation'
              })
            }
          } catch (error) {
            errors.push({
              field: 'business_rules',
              message: `Business rule '${rule.name}' execution failed`,
              code: 'business_rule_error'
            })
          }
        }
      }

      // Handle validation errors
      if (errors.length > 0) {
        const errorResponse = config.onError 
          ? config.onError(errors, validationContext)
          : createDefaultErrorResponse(errors, validationContext)

        return {
          isValid: false,
          response: errorResponse,
          validationContext
        }
      }

      return {
        isValid: true,
        validatedData,
        validationContext
      }
    } catch (error) {
      console.error('Validation middleware error:', error)
      
      return {
        isValid: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Internal validation error',
            code: 'VALIDATION_MIDDLEWARE_ERROR',
            requestId: crypto.randomUUID()
          },
          { status: 500 }
        )
      }
    }
  }
}

function createDefaultErrorResponse(
  errors: ValidationError[],
  context?: ValidationContext
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      validationErrors: errors,
      code: 'VALIDATION_ERROR',
      requestId: context?.requestId,
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  )
}

// ==== Response Validation Middleware ====

export function validateResponse<T>(
  data: unknown,
  schema: ZodSchema<T>,
  context?: ValidationContext
): { isValid: boolean; data?: T; errors?: ValidationError[] } {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    return {
      isValid: false,
      errors: formatZodError(result.error, context)
    }
  }
  
  return {
    isValid: true,
    data: result.data
  }
}

// ==== Business Rules Library ====

export const BusinessRules = {
  // Resolution Business Rules
  resolutionQuorumCheck: (requiredQuorum: number = 0.5): BusinessRuleValidator => ({
    name: 'resolution_quorum_check',
    validate: async (data: any, context?: ValidationContext) => {
      if (data.body?.votingMethod && data.body?.eligibleVoters) {
        const voterCount = data.body.eligibleVoters.length
        // This would typically check against meeting member count
        // For now, just ensure minimum viable voting group
        if (voterCount < 3) {
          return {
            valid: false,
            message: 'Insufficient eligible voters for valid resolution voting',
            code: 'insufficient_quorum'
          }
        }
      }
      return { valid: true }
    }
  }),

  resolutionTypeCompatibility: (): BusinessRuleValidator => ({
    name: 'resolution_type_compatibility',
    validate: async (data: any, context?: ValidationContext) => {
      const { resolutionType, votingMethod, requiresBoardApproval } = data.body || {}
      
      if (resolutionType && votingMethod) {
        const sensitiveTypes = ['financial', 'appointment', 'strategic']
        const informalMethods = ['voice', 'show_of_hands']
        
        if (sensitiveTypes.includes(resolutionType) && informalMethods.includes(votingMethod)) {
          return {
            valid: false,
            message: `Resolution type '${resolutionType}' requires formal voting method`,
            code: 'incompatible_voting_method'
          }
        }
        
        if (resolutionType === 'financial' && !requiresBoardApproval) {
          return {
            valid: false,
            message: 'Financial resolutions require board approval',
            code: 'missing_board_approval'
          }
        }
      }
      
      return { valid: true }
    }
  }),

  // Actionable Business Rules
  actionableDueDateValidation: (): BusinessRuleValidator => ({
    name: 'actionable_due_date_validation',
    validate: async (data: any, context?: ValidationContext) => {
      const { dueDate, priority } = data.body || {}
      
      if (dueDate && priority) {
        const due = new Date(dueDate)
        const now = new Date()
        const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        const minLeadTimes = {
          critical: 1,
          high: 24,
          medium: 72,
          low: 168
        }
        
        const minTime = minLeadTimes[priority as keyof typeof minLeadTimes] || 24
        
        if (hoursUntilDue < minTime) {
          return {
            valid: false,
            message: `${priority} priority actionables require at least ${minTime} hours lead time`,
            code: 'insufficient_lead_time'
          }
        }
      }
      
      return { valid: true }
    }
  }),

  actionableDependencyValidation: (): BusinessRuleValidator => ({
    name: 'actionable_dependency_validation',
    validate: async (data: any, context?: ValidationContext) => {
      const { dependsOnActionableIds, blocksActionableIds } = data.body || {}
      
      if (dependsOnActionableIds && blocksActionableIds) {
        // Check for circular dependencies
        const intersection = dependsOnActionableIds.filter((id: string) => 
          blocksActionableIds.includes(id)
        )
        
        if (intersection.length > 0) {
          return {
            valid: false,
            message: 'Circular dependency detected: actionable cannot both depend on and block the same items',
            code: 'circular_dependency'
          }
        }
      }
      
      return { valid: true }
    }
  }),

  userPermissionCheck: (requiredRole: string[] = ['member']): BusinessRuleValidator => ({
    name: 'user_permission_check',
    validate: async (data: any, context?: ValidationContext) => {
      if (!context?.userRole) {
        return {
          valid: false,
          message: 'User role not available for permission check',
          code: 'missing_user_context'
        }
      }
      
      if (!requiredRole.includes(context.userRole)) {
        return {
          valid: false,
          message: `Insufficient permissions. Required: ${requiredRole.join(' or ')}`,
          code: 'insufficient_permissions'
        }
      }
      
      return { valid: true }
    }
  }),

  organizationMembershipCheck: (): BusinessRuleValidator => ({
    name: 'organization_membership_check',
    validate: async (data: any, context?: ValidationContext) => {
      if (!context?.organizationId || !context?.userId) {
        return {
          valid: false,
          message: 'Organization context not available',
          code: 'missing_organization_context'
        }
      }
      
      // This would typically check database for membership
      // For now, just ensure context is present
      return { valid: true }
    }
  })
}

// ==== Validation Decorators ====

export function ValidateApiRoute<TBody = any, TQuery = any, TParams = any>(
  config: ApiValidationConfig<TBody, TQuery, TParams>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const middleware = createApiValidationMiddleware(config)
    
    descriptor.value = async function (
      request: NextRequest,
      context?: { params?: any }
    ) {
      const validationResult = await middleware(request, context)
      
      if (!validationResult.isValid) {
        return validationResult.response
      }
      
      // Attach validated data to request for use in handler
      ;(request as any).validatedData = validationResult.validatedData
      ;(request as any).validationContext = validationResult.validationContext
      
      return originalMethod.call(this, request, context)
    }
  }
}

// ==== Utility Functions ====

export function createValidationContext(
  userId?: string,
  organizationId?: string,
  userRole?: string,
  endpoint?: string
): ValidationContext {
  return {
    userId,
    organizationId,
    userRole,
    requestId: crypto.randomUUID(),
    endpoint
  }
}

export function combineValidationRules(
  ...rules: BusinessRuleValidator[]
): BusinessRuleValidator[] {
  return rules
}

export function createConditionalRule(
  condition: (data: any, context?: ValidationContext) => boolean,
  rule: BusinessRuleValidator
): BusinessRuleValidator {
  return {
    name: `conditional_${rule.name}`,
    validate: async (data: any, context?: ValidationContext) => {
      if (condition(data, context)) {
        return rule.validate(data, context)
      }
      return { valid: true }
    }
  }
}

// ==== Common Validation Patterns ====

export const CommonValidationPatterns = {
  requireAuth: (skipRoles?: string[]) => createConditionalRule(
    (data, context) => !skipRoles?.includes(context?.userRole || ''),
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner'])
  ),

  requireOrgMembership: () => BusinessRules.organizationMembershipCheck(),

  validateFinancialResolution: () => combineValidationRules(
    BusinessRules.resolutionTypeCompatibility(),
    BusinessRules.resolutionQuorumCheck(0.67), // 2/3 majority for financial
    BusinessRules.userPermissionCheck(['admin', 'owner'])
  ),

  validateCriticalActionable: () => combineValidationRules(
    BusinessRules.actionableDueDateValidation(),
    BusinessRules.actionableDependencyValidation(),
    BusinessRules.userPermissionCheck(['admin', 'owner'])
  )
}

export default {
  createApiValidationMiddleware,
  validateResponse,
  BusinessRules,
  CommonValidationPatterns,
  ValidateApiRoute,
  createValidationContext,
  formatZodError
}