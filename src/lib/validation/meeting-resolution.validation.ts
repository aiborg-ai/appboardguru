/**
 * Meeting Resolution Validation Schemas
 * Comprehensive Zod validation for meeting resolutions with business rules
 */

import { z } from 'zod'
import { 
  UserIdSchema, 
  MeetingIdSchema, 
  OrganizationIdSchema,
  BrandedIdSchema,
  MeetingResolutionIdSchema,
  ResolutionVoteIdSchema
} from '../types/branded'
import { TimestampSchema } from '../types/validation'

// ==== Branded Types for Resolution Domain ====

export type ResolutionId = z.infer<typeof ResolutionIdSchema>
export type VoteId = z.infer<typeof VoteIdSchema>

export const ResolutionIdSchema = MeetingResolutionIdSchema
export const VoteIdSchema = ResolutionVoteIdSchema

// ==== Core Enum Schemas ====

export const ResolutionTypeSchema = z.enum([
  'motion',
  'amendment', 
  'policy',
  'directive',
  'appointment',
  'financial',
  'strategic',
  'other'
], {
  errorMap: () => ({ message: 'Invalid resolution type. Must be one of: motion, amendment, policy, directive, appointment, financial, strategic, other' })
})

export const ResolutionStatusSchema = z.enum([
  'proposed',
  'passed', 
  'rejected',
  'tabled',
  'withdrawn',
  'amended'
], {
  errorMap: () => ({ message: 'Invalid resolution status. Must be one of: proposed, passed, rejected, tabled, withdrawn, amended' })
})

export const VotingMethodSchema = z.enum([
  'voice',
  'show_of_hands',
  'secret_ballot', 
  'electronic',
  'unanimous_consent',
  'roll_call'
], {
  errorMap: () => ({ message: 'Invalid voting method. Must be one of: voice, show_of_hands, secret_ballot, electronic, unanimous_consent, roll_call' })
})

export const VoteChoiceSchema = z.enum([
  'for',
  'against', 
  'abstain',
  'absent'
], {
  errorMap: () => ({ message: 'Invalid vote choice. Must be one of: for, against, abstain, absent' })
})

export const PriorityLevelSchema = z.number()
  .int()
  .min(1, 'Priority level must be at least 1')
  .max(5, 'Priority level must be at most 5')
  .default(3)

export const VoteConfidenceSchema = z.number()
  .int()
  .min(1, 'Vote confidence must be at least 1')
  .max(5, 'Vote confidence must be at most 5')
  .optional()

// ==== Business Rule Validation Schemas ====

export const ResolutionNumberSchema = z.string()
  .regex(/^R\d{4}-\d{3}$/, 'Resolution number must follow format R2024-001')
  .optional()

export const QuorumRequirementSchema = z.object({
  minimumMembers: z.number().int().positive('Minimum members must be positive'),
  requiredPercentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  specialMajorityRequired: z.boolean().default(false)
})

export const VotingDeadlineSchema = z.string()
  .datetime()
  .refine(
    (date) => new Date(date) > new Date(),
    'Voting deadline must be in the future'
  )
  .optional()

// ==== Custom Validation Helpers ====

export const validateResolutionType = (type: string, requiresBoardApproval: boolean = false) => {
  const financialTypes = ['financial', 'appointment']
  const strategicTypes = ['strategic', 'policy']
  
  if (financialTypes.includes(type) && !requiresBoardApproval) {
    return {
      valid: false,
      message: `Resolution type '${type}' requires board approval`
    }
  }
  
  if (strategicTypes.includes(type) && !requiresBoardApproval) {
    return {
      valid: false,
      message: `Resolution type '${type}' typically requires board approval`
    }
  }
  
  return { valid: true }
}

export const validateVotingMethod = (method: string, resolutionType: string) => {
  const confidentialTypes = ['appointment', 'financial']
  const formalTypes = ['policy', 'strategic', 'amendment']
  
  if (confidentialTypes.includes(resolutionType) && method === 'voice') {
    return {
      valid: false,
      message: `${resolutionType} resolutions should use secret ballot or electronic voting`
    }
  }
  
  if (formalTypes.includes(resolutionType) && method === 'voice') {
    return {
      valid: false, 
      message: `${resolutionType} resolutions require formal voting method`
    }
  }
  
  return { valid: true }
}

export const validateQuorum = (
  votesFor: number,
  votesAgainst: number, 
  votesAbstain: number,
  totalEligibleVoters: number,
  resolutionType: string
) => {
  const totalVotes = votesFor + votesAgainst + votesAbstain
  const participationRate = totalEligibleVoters > 0 ? (totalVotes / totalEligibleVoters) : 0
  
  // Different quorum requirements by type
  const quorumRequirements = {
    financial: 0.67, // 2/3 majority
    strategic: 0.67,
    policy: 0.60,
    appointment: 0.67,
    amendment: 0.75, // 3/4 majority
    motion: 0.50,
    directive: 0.60,
    other: 0.50
  }
  
  const requiredQuorum = quorumRequirements[resolutionType as keyof typeof quorumRequirements] || 0.50
  
  if (participationRate < requiredQuorum) {
    return {
      valid: false,
      message: `Insufficient participation. ${resolutionType} resolutions require ${(requiredQuorum * 100).toFixed(0)}% participation`,
      required: requiredQuorum,
      actual: participationRate
    }
  }
  
  return { valid: true, participationRate, requiredQuorum }
}

// ==== Resolution Creation Schema ====

export const CreateResolutionSchema = z.object({
  meetingId: MeetingIdSchema,
  agendaItemId: z.string().uuid().optional(),
  title: z.string()
    .min(1, 'Resolution title is required')
    .max(200, 'Resolution title must be 200 characters or less')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  resolutionText: z.string()
    .min(1, 'Resolution text is required')
    .max(5000, 'Resolution text must be 5000 characters or less')
    .trim(),
  resolutionType: ResolutionTypeSchema,
  category: z.string()
    .max(100, 'Category must be 100 characters or less')
    .trim()
    .optional(),
  priorityLevel: PriorityLevelSchema,
  secondedBy: UserIdSchema.optional(),
  effectiveDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      'Effective date cannot be in the past'
    )
    .optional(),
  expiryDate: z.string()
    .datetime()
    .optional(),
  implementationDeadline: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Implementation deadline must be in the future'
    )
    .optional(),
  requiresBoardApproval: z.boolean().default(false),
  requiresShareholderApproval: z.boolean().default(false),
  legalReviewRequired: z.boolean().default(false),
  supportingDocuments: z.array(z.string().uuid())
    .max(10, 'Maximum 10 supporting documents allowed')
    .default([]),
  relatedResolutions: z.array(ResolutionIdSchema)
    .max(5, 'Maximum 5 related resolutions allowed')
    .default([]),
  supersedesResolutionId: ResolutionIdSchema.optional()
})
.refine(
  (data) => !data.expiryDate || !data.effectiveDate || new Date(data.expiryDate) > new Date(data.effectiveDate),
  {
    message: 'Expiry date must be after effective date',
    path: ['expiryDate']
  }
)
.refine(
  (data) => !data.implementationDeadline || !data.effectiveDate || new Date(data.implementationDeadline) >= new Date(data.effectiveDate),
  {
    message: 'Implementation deadline must be on or after effective date',
    path: ['implementationDeadline']
  }
)
.refine(
  (data) => validateResolutionType(data.resolutionType, data.requiresBoardApproval).valid,
  {
    message: 'Resolution type validation failed',
    path: ['resolutionType']
  }
)

// ==== Resolution Update Schema ====

export const UpdateResolutionSchema = z.object({
  title: z.string()
    .min(1, 'Resolution title is required')
    .max(200, 'Resolution title must be 200 characters or less')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  resolutionText: z.string()
    .min(1, 'Resolution text is required')
    .max(5000, 'Resolution text must be 5000 characters or less')
    .trim()
    .optional(),
  status: ResolutionStatusSchema.optional(),
  votingMethod: VotingMethodSchema.optional(),
  effectiveDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      'Effective date cannot be in the past'
    )
    .optional(),
  expiryDate: z.string()
    .datetime()
    .optional(),
  implementationDeadline: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Implementation deadline must be in the future'
    )
    .optional(),
  implementationNotes: z.string()
    .max(2000, 'Implementation notes must be 2000 characters or less')
    .trim()
    .optional(),
  complianceImpact: z.string()
    .max(1000, 'Compliance impact must be 1000 characters or less')
    .trim()
    .optional(),
  version: z.number().int().nonnegative().optional()
})

// ==== Vote Casting Schema ====

export const CastVoteSchema = z.object({
  resolutionId: ResolutionIdSchema,
  voteChoice: VoteChoiceSchema,
  voteWeight: z.number()
    .positive('Vote weight must be positive')
    .max(10, 'Vote weight cannot exceed 10')
    .default(1),
  votingMethod: VotingMethodSchema,
  voteRationale: z.string()
    .max(500, 'Vote rationale must be 500 characters or less')
    .trim()
    .optional(),
  voteConfidence: VoteConfidenceSchema
})

// ==== Voting Request Schema ====

export const InitiateVotingSchema = z.object({
  resolutionId: ResolutionIdSchema,
  votingMethod: VotingMethodSchema,
  votingDeadline: VotingDeadlineSchema,
  eligibleVoters: z.array(UserIdSchema)
    .min(1, 'At least one eligible voter is required')
    .max(1000, 'Maximum 1000 eligible voters allowed'),
  quorumRequirement: QuorumRequirementSchema.optional(),
  allowAbstain: z.boolean().default(true),
  allowVoteChange: z.boolean().default(false),
  isSecretBallot: z.boolean().default(false),
  notificationSettings: z.object({
    sendReminders: z.boolean().default(true),
    reminderIntervals: z.array(z.number().positive())
      .max(5, 'Maximum 5 reminder intervals')
      .default([24, 12, 1]), // hours before deadline
    customMessage: z.string().max(500).optional()
  }).optional()
})
.refine(
  (data) => validateVotingMethod(data.votingMethod, 'motion').valid,
  {
    message: 'Invalid voting method for this resolution type',
    path: ['votingMethod']
  }
)

// ==== Resolution Amendment Schema ====

export const ProposeAmendmentSchema = z.object({
  resolutionId: ResolutionIdSchema,
  amendmentText: z.string()
    .min(1, 'Amendment text is required')
    .max(2000, 'Amendment text must be 2000 characters or less')
    .trim(),
  amendmentRationale: z.string()
    .min(1, 'Amendment rationale is required')
    .max(1000, 'Amendment rationale must be 1000 characters or less')
    .trim(),
  amendmentType: z.enum(['addition', 'deletion', 'modification', 'substitution']),
  affectedSection: z.string()
    .max(100, 'Affected section must be 100 characters or less')
    .trim()
    .optional(),
  proposedChanges: z.object({
    originalText: z.string().optional(),
    proposedText: z.string().optional(),
    insertionPoint: z.number().int().nonnegative().optional()
  })
})

// ==== Complete Resolution Schema ====

export const ResolutionSchema = z.object({
  id: ResolutionIdSchema,
  meetingId: MeetingIdSchema,
  agendaItemId: z.string().uuid().optional(),
  resolutionNumber: ResolutionNumberSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  resolutionText: z.string().min(1).max(5000),
  resolutionType: ResolutionTypeSchema,
  category: z.string().max(100).optional(),
  priorityLevel: PriorityLevelSchema,
  proposedBy: UserIdSchema,
  secondedBy: UserIdSchema.optional(),
  status: ResolutionStatusSchema,
  votingMethod: VotingMethodSchema.optional(),
  votesFor: z.number().int().nonnegative(),
  votesAgainst: z.number().int().nonnegative(),
  votesAbstain: z.number().int().nonnegative(),
  totalEligibleVoters: z.number().int().nonnegative(),
  effectiveDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  implementationDeadline: z.string().datetime().optional(),
  implementationNotes: z.string().max(2000).optional(),
  requiresBoardApproval: z.boolean(),
  requiresShareholderApproval: z.boolean(),
  legalReviewRequired: z.boolean(),
  complianceImpact: z.string().max(1000).optional(),
  supportingDocuments: z.array(z.string().uuid()),
  relatedResolutions: z.array(ResolutionIdSchema),
  supersedesResolutionId: ResolutionIdSchema.optional(),
  discussionDurationMinutes: z.number().int().nonnegative(),
  amendmentsProposed: z.number().int().nonnegative(),
  wasAmended: z.boolean(),
  proposedAt: TimestampSchema,
  votedAt: TimestampSchema.optional(),
  effectiveAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  version: z.number().int().nonnegative().default(0)
})

// ==== Vote Schema ====

export const VoteSchema = z.object({
  id: VoteIdSchema,
  resolutionId: ResolutionIdSchema,
  voterUserId: UserIdSchema,
  voteChoice: VoteChoiceSchema,
  voteWeight: z.number().positive().max(10),
  votingMethod: VotingMethodSchema,
  voteOrder: z.number().int().positive().optional(),
  voteRationale: z.string().max(500).optional(),
  voteConfidence: VoteConfidenceSchema,
  votedAt: TimestampSchema
})

// ==== API Request/Response Schemas ====

export const CreateResolutionRequestSchema = CreateResolutionSchema

export const CreateResolutionResponseSchema = z.object({
  success: z.boolean(),
  data: ResolutionSchema.optional(),
  error: z.string().optional(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string()
  })).optional()
})

export const UpdateResolutionRequestSchema = z.object({
  id: ResolutionIdSchema,
  updates: UpdateResolutionSchema
})

export const ListResolutionsQuerySchema = z.object({
  meetingId: MeetingIdSchema.optional(),
  status: ResolutionStatusSchema.optional(),
  resolutionType: ResolutionTypeSchema.optional(),
  proposedBy: UserIdSchema.optional(),
  effectiveDateFrom: z.string().datetime().optional(),
  effectiveDateTo: z.string().datetime().optional(),
  implementationDueSoon: z.boolean().optional(),
  searchTerm: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'title', 'priority_level', 'effective_date']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const ResolutionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    resolutions: z.array(ResolutionSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  }).optional(),
  error: z.string().optional()
})

// ==== Status Transition Validation ====

export const ResolutionStatusTransitionSchema = z.object({
  from: ResolutionStatusSchema,
  to: ResolutionStatusSchema,
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional()
})
.refine(
  (data) => {
    const validTransitions: Record<string, string[]> = {
      'proposed': ['passed', 'rejected', 'tabled', 'withdrawn', 'amended'],
      'tabled': ['proposed', 'withdrawn'],
      'amended': ['proposed', 'withdrawn'],
      'passed': [], // Final state
      'rejected': [], // Final state
      'withdrawn': [] // Final state
    }
    
    return validTransitions[data.from]?.includes(data.to) ?? false
  },
  {
    message: 'Invalid status transition',
    path: ['to']
  }
)

// ==== Transformation Schemas ====

export const ResolutionTransformSchema = z.object({
  includeVotes: z.boolean().default(false),
  includeAmendments: z.boolean().default(false),
  includeAuditTrail: z.boolean().default(false),
  maskSensitiveData: z.boolean().default(false)
})

// ==== Batch Operations Schema ====

export const BatchUpdateResolutionsSchema = z.object({
  resolutionIds: z.array(ResolutionIdSchema)
    .min(1, 'At least one resolution ID is required')
    .max(50, 'Maximum 50 resolutions can be updated at once'),
  updates: UpdateResolutionSchema,
  reason: z.string()
    .min(1, 'Reason for batch update is required')
    .max(500, 'Reason must be 500 characters or less')
})

// ==== Export all schemas ====

export const ResolutionValidationSchemas = {
  // Core schemas
  ResolutionTypeSchema,
  ResolutionStatusSchema,
  VotingMethodSchema,
  VoteChoiceSchema,
  PriorityLevelSchema,
  ResolutionNumberSchema,
  
  // Business rule schemas
  QuorumRequirementSchema,
  VotingDeadlineSchema,
  
  // Entity schemas
  CreateResolutionSchema,
  UpdateResolutionSchema,
  ResolutionSchema,
  VoteSchema,
  
  // Action schemas
  CastVoteSchema,
  InitiateVotingSchema,
  ProposeAmendmentSchema,
  ResolutionStatusTransitionSchema,
  
  // API schemas
  CreateResolutionRequestSchema,
  CreateResolutionResponseSchema,
  UpdateResolutionRequestSchema,
  ListResolutionsQuerySchema,
  ResolutionListResponseSchema,
  
  // Utility schemas
  ResolutionTransformSchema,
  BatchUpdateResolutionsSchema
} as const

// ==== Type exports ====

export type CreateResolutionRequest = z.infer<typeof CreateResolutionSchema>
export type UpdateResolutionRequest = z.infer<typeof UpdateResolutionSchema>
export type CastVoteRequest = z.infer<typeof CastVoteSchema>
export type InitiateVotingRequest = z.infer<typeof InitiateVotingSchema>
export type ResolutionStatusTransition = z.infer<typeof ResolutionStatusTransitionSchema>
export type ListResolutionsQuery = z.infer<typeof ListResolutionsQuerySchema>
export type Resolution = z.infer<typeof ResolutionSchema>
export type Vote = z.infer<typeof VoteSchema>