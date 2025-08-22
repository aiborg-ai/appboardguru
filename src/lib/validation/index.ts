/**
 * Validation Index
 * Central export point for all validation schemas and utilities
 */

// Core validation exports from types
export * from '../types/validation'

// Meeting Resolution Validation
export * from './meeting-resolution.validation'

// Meeting Actionable Validation
export * from './meeting-actionable.validation'

// Validation Middleware
export * from './middleware'

// API Examples (for reference)
export { default as ValidationExamples } from './api-examples'

// ==== Convenience Re-exports ====

// Resolution schemas
export {
  ResolutionValidationSchemas,
  CreateResolutionSchema,
  UpdateResolutionSchema,
  CastVoteSchema,
  InitiateVotingSchema,
  ResolutionSchema,
  VoteSchema,
  type CreateResolutionRequest,
  type UpdateResolutionRequest,
  type CastVoteRequest,
  type Resolution,
  type Vote
} from './meeting-resolution.validation'

// Actionable schemas
export {
  ActionableValidationSchemas,
  CreateActionableSchema,
  UpdateActionableSchema,
  CreateActionableUpdateSchema,
  DelegateActionableSchema,
  ActionableSchema,
  ActionableUpdateSchema,
  type CreateActionableRequest,
  type UpdateActionableRequest,
  type CreateActionableUpdateRequest,
  type DelegateActionableRequest,
  type Actionable,
  type ActionableUpdate
} from './meeting-actionable.validation'

// Middleware utilities
export {
  createApiValidationMiddleware,
  BusinessRules,
  CommonValidationPatterns,
  ValidateApiRoute,
  createValidationContext,
  formatZodError,
  type ApiValidationConfig,
  type BusinessRuleValidator,
  type ValidationContext,
  type ValidationError
} from './middleware'

// ==== Validation Schema Registry ====

import { ResolutionValidationSchemas } from './meeting-resolution.validation'
import { ActionableValidationSchemas } from './meeting-actionable.validation'

/**
 * Complete validation schema registry for meeting domain
 */
export const MeetingValidationSchemas = {
  ...ResolutionValidationSchemas,
  ...ActionableValidationSchemas
} as const

/**
 * Common validation patterns for meetings
 */
export const MeetingValidationPatterns = {
  // Resolution patterns
  createBasicResolution: [
    'ResolutionTypeSchema',
    'CreateResolutionSchema'
  ],
  
  createFinancialResolution: [
    'ResolutionTypeSchema',
    'CreateResolutionSchema',
    'QuorumRequirementSchema'
  ],
  
  initiateVoting: [
    'InitiateVotingSchema',
    'VotingDeadlineSchema'
  ],
  
  // Actionable patterns
  createBasicActionable: [
    'ActionablePrioritySchema',
    'CreateActionableSchema'
  ],
  
  createCriticalActionable: [
    'ActionablePrioritySchema',
    'CreateActionableSchema',
    'EscalationLevelSchema'
  ],
  
  trackProgress: [
    'CreateActionableUpdateSchema',
    'ProgressPercentageSchema'
  ],
  
  // Combined patterns
  resolutionWithActionables: [
    'CreateResolutionSchema',
    'CreateActionableSchema'
  ]
} as const

/**
 * Validation schema names for type-safe access
 */
export type ValidationSchemaName = keyof typeof MeetingValidationSchemas

/**
 * Helper to get validation schema by name
 */
export function getValidationSchema<T extends ValidationSchemaName>(
  name: T
): typeof MeetingValidationSchemas[T] {
  return MeetingValidationSchemas[name]
}

/**
 * Validate data against named schema
 */
export function validateWithNamedSchema<T extends ValidationSchemaName>(
  schemaName: T,
  data: unknown
) {
  const schema = getValidationSchema(schemaName)
  return schema.safeParse(data)
}

export default {
  MeetingValidationSchemas,
  MeetingValidationPatterns,
  getValidationSchema,
  validateWithNamedSchema
}