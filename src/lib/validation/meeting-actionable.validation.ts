/**
 * Meeting Actionable Validation Schemas
 * Comprehensive Zod validation for meeting actionables with business rules
 */

import { z } from 'zod'
import { 
  UserIdSchema, 
  MeetingIdSchema, 
  OrganizationIdSchema,
  BrandedIdSchema,
  MeetingActionableIdSchema,
  ActionableUpdateIdSchema
} from '../types/branded'
import { TimestampSchema } from '../types/validation'
import { ResolutionIdSchema } from './meeting-resolution.validation'

// ==== Branded Types for Actionable Domain ====

export type ActionableId = z.infer<typeof ActionableIdSchema>
export type ActionableUpdateId = z.infer<typeof ActionableUpdateIdSchemaLocal>

export const ActionableIdSchema = MeetingActionableIdSchema
export const ActionableUpdateIdSchemaLocal = ActionableUpdateIdSchema

// ==== Core Enum Schemas ====

export const ActionablePrioritySchema = z.enum([
  'critical',
  'high',
  'medium', 
  'low'
], {
  errorMap: () => ({ message: 'Invalid priority. Must be one of: critical, high, medium, low' })
})

export const ActionableStatusSchema = z.enum([
  'assigned',
  'in_progress',
  'blocked',
  'under_review',
  'completed',
  'cancelled',
  'overdue'
], {
  errorMap: () => ({ message: 'Invalid status. Must be one of: assigned, in_progress, blocked, under_review, completed, cancelled, overdue' })
})

export const ActionableCategorySchema = z.enum([
  'follow_up',
  'research',
  'implementation',
  'compliance',
  'reporting',
  'communication',
  'approval',
  'review',
  'other'
], {
  errorMap: () => ({ message: 'Invalid category. Must be one of: follow_up, research, implementation, compliance, reporting, communication, approval, review, other' })
})

export const ActionableUpdateTypeSchema = z.enum([
  'progress',
  'status_change',
  'deadline_extension',
  'delegation',
  'completion'
], {
  errorMap: () => ({ message: 'Invalid update type. Must be one of: progress, status_change, deadline_extension, delegation, completion' })
})

export const EscalationLevelSchema = z.number()
  .int()
  .min(1, 'Escalation level must be at least 1')
  .max(5, 'Escalation level must be at most 5')
  .default(1)

// ==== Business Rule Validation Schemas ====

export const ActionableNumberSchema = z.string()
  .regex(/^A\d{4}-\d{3}$/, 'Actionable number must follow format A2024-001')
  .optional()

export const ProgressPercentageSchema = z.number()
  .min(0, 'Progress percentage cannot be negative')
  .max(100, 'Progress percentage cannot exceed 100')
  .refine(
    (value) => Number.isInteger(value) || value % 0.1 === 0,
    'Progress percentage must be a whole number or have at most one decimal place'
  )

export const EffortHoursSchema = z.number()
  .positive('Effort hours must be positive')
  .max(1000, 'Effort hours cannot exceed 1000 hours')
  .refine(
    (value) => value % 0.25 === 0,
    'Effort hours must be in 15-minute increments (0.25)'
  )

export const ReminderIntervalSchema = z.array(
  z.number()
    .positive('Reminder interval must be positive')
    .max(720, 'Reminder interval cannot exceed 720 hours (30 days)')
)
.max(5, 'Maximum 5 reminder intervals allowed')
.refine(
  (intervals) => {
    const sorted = [...intervals].sort((a, b) => b - a)
    return JSON.stringify(sorted) === JSON.stringify(intervals)
  },
  'Reminder intervals must be in descending order'
)

// ==== Custom Validation Helpers ====

export const validateDueDate = (dueDate: string, priority: string) => {
  const due = new Date(dueDate)
  const now = new Date()
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Different urgency requirements by priority
  const minLeadTimes = {
    critical: 1,    // 1 hour minimum
    high: 24,       // 1 day minimum
    medium: 72,     // 3 days minimum
    low: 168        // 1 week minimum
  }
  
  const maxLeadTimes = {
    critical: 168,  // 1 week maximum
    high: 720,      // 30 days maximum
    medium: 2160,   // 90 days maximum
    low: 4320       // 180 days maximum
  }
  
  const minLeadTime = minLeadTimes[priority as keyof typeof minLeadTimes] || 24
  const maxLeadTime = maxLeadTimes[priority as keyof typeof maxLeadTimes] || 720
  
  if (diffHours < minLeadTime) {
    return {
      valid: false,
      message: `${priority} priority actionables need at least ${minLeadTime} hours lead time`
    }
  }
  
  if (diffHours > maxLeadTime) {
    return {
      valid: false,
      message: `${priority} priority actionables should not exceed ${maxLeadTime} hours (consider breaking into smaller tasks)`
    }
  }
  
  return { valid: true }
}

export const validateDependencies = (
  dependsOnIds: string[],
  blocksIds: string[],
  currentActionableId?: string
) => {
  // Check for circular dependencies
  if (currentActionableId && dependsOnIds.includes(currentActionableId)) {
    return {
      valid: false,
      message: 'Actionable cannot depend on itself'
    }
  }
  
  if (currentActionableId && blocksIds.includes(currentActionableId)) {
    return {
      valid: false,
      message: 'Actionable cannot block itself'
    }
  }
  
  // Check for direct circular dependency
  const intersection = dependsOnIds.filter(id => blocksIds.includes(id))
  if (intersection.length > 0) {
    return {
      valid: false,
      message: `Circular dependency detected: actionable cannot both depend on and block the same items (${intersection.join(', ')})`
    }
  }
  
  // Limit dependency chain length
  if (dependsOnIds.length > 10) {
    return {
      valid: false,
      message: 'Actionable cannot depend on more than 10 other actionables'
    }
  }
  
  if (blocksIds.length > 20) {
    return {
      valid: false,
      message: 'Actionable cannot block more than 20 other actionables'
    }
  }
  
  return { valid: true }
}

export const validateProgressConsistency = (
  status: string,
  progressPercentage: number
) => {
  const statusProgressRules = {
    assigned: { min: 0, max: 0 },
    in_progress: { min: 1, max: 99 },
    blocked: { min: 0, max: 100 },
    under_review: { min: 90, max: 100 },
    completed: { min: 100, max: 100 },
    cancelled: { min: 0, max: 100 },
    overdue: { min: 0, max: 99 }
  }
  
  const rules = statusProgressRules[status as keyof typeof statusProgressRules]
  if (!rules) {
    return { valid: false, message: 'Invalid status' }
  }
  
  if (progressPercentage < rules.min || progressPercentage > rules.max) {
    return {
      valid: false,
      message: `Progress for ${status} status must be between ${rules.min}% and ${rules.max}%`
    }
  }
  
  return { valid: true }
}

export const validateEscalationPath = (
  escalationPath: string[],
  assignedTo: string,
  organizationId?: string
) => {
  if (escalationPath.includes(assignedTo)) {
    return {
      valid: false,
      message: 'Assigned user cannot be in their own escalation path'
    }
  }
  
  if (escalationPath.length === 0) {
    return {
      valid: false,
      message: 'At least one escalation contact is required'
    }
  }
  
  if (escalationPath.length > 5) {
    return {
      valid: false,
      message: 'Escalation path cannot exceed 5 levels'
    }
  }
  
  // Check for duplicates
  const uniqueUsers = new Set(escalationPath)
  if (uniqueUsers.size !== escalationPath.length) {
    return {
      valid: false,
      message: 'Escalation path cannot contain duplicate users'
    }
  }
  
  return { valid: true }
}

// ==== Actionable Creation Schema ====

export const CreateActionableSchema = z.object({
  meetingId: MeetingIdSchema,
  agendaItemId: z.string().uuid().optional(),
  resolutionId: ResolutionIdSchema.optional(),
  assignedTo: UserIdSchema,
  title: z.string()
    .min(1, 'Actionable title is required')
    .max(200, 'Actionable title must be 200 characters or less')
    .trim(),
  description: z.string()
    .min(1, 'Actionable description is required')
    .max(1000, 'Description must be 1000 characters or less')
    .trim(),
  detailedRequirements: z.string()
    .max(5000, 'Detailed requirements must be 5000 characters or less')
    .trim()
    .optional(),
  category: ActionableCategorySchema.default('other'),
  priority: ActionablePrioritySchema.default('medium'),
  estimatedEffortHours: EffortHoursSchema.optional(),
  dueDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Due date must be in the future'
    ),
  reminderIntervals: ReminderIntervalSchema.default([24, 1]), // 24 hours and 1 hour before
  dependsOnActionableIds: z.array(ActionableIdSchema)
    .max(10, 'Maximum 10 dependencies allowed')
    .default([]),
  requiresApproval: z.boolean().default(false),
  deliverableType: z.string()
    .max(100, 'Deliverable type must be 100 characters or less')
    .trim()
    .optional(),
  successMetrics: z.string()
    .max(1000, 'Success metrics must be 1000 characters or less')
    .trim()
    .optional(),
  stakeholdersToNotify: z.array(UserIdSchema)
    .max(20, 'Maximum 20 stakeholders can be notified')
    .default([]),
  communicationRequired: z.boolean().default(false),
  escalationPath: z.array(UserIdSchema)
    .min(1, 'At least one escalation contact is required')
    .max(5, 'Maximum 5 escalation levels allowed')
})
.refine(
  (data) => validateDueDate(data.dueDate, data.priority).valid,
  {
    message: 'Due date validation failed',
    path: ['dueDate']
  }
)
.refine(
  (data) => validateDependencies(data.dependsOnActionableIds, [], undefined).valid,
  {
    message: 'Dependency validation failed',
    path: ['dependsOnActionableIds']
  }
)
.refine(
  (data) => validateEscalationPath(data.escalationPath, data.assignedTo).valid,
  {
    message: 'Escalation path validation failed',
    path: ['escalationPath']
  }
)

// ==== Actionable Update Schema ====

export const UpdateActionableSchema = z.object({
  title: z.string()
    .min(1, 'Actionable title is required')
    .max(200, 'Actionable title must be 200 characters or less')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'Actionable description is required')
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  detailedRequirements: z.string()
    .max(5000, 'Detailed requirements must be 5000 characters or less')
    .trim()
    .optional(),
  priority: ActionablePrioritySchema.optional(),
  dueDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Due date must be in the future'
    )
    .optional(),
  status: ActionableStatusSchema.optional(),
  progressPercentage: ProgressPercentageSchema.optional(),
  completionNotes: z.string()
    .max(2000, 'Completion notes must be 2000 characters or less')
    .trim()
    .optional(),
  actualEffortHours: EffortHoursSchema.optional(),
  deliverableLocation: z.string()
    .url('Deliverable location must be a valid URL')
    .or(z.string().regex(/^\//, 'Deliverable location must be a valid path starting with /'))
    .optional(),
  actualResults: z.string()
    .max(2000, 'Actual results must be 2000 characters or less')
    .trim()
    .optional(),
  escalationReason: z.string()
    .max(500, 'Escalation reason must be 500 characters or less')
    .trim()
    .optional(),
  version: z.number().int().nonnegative().optional()
})
.refine(
  (data) => {
    if (data.status && data.progressPercentage !== undefined) {
      return validateProgressConsistency(data.status, data.progressPercentage).valid
    }
    return true
  },
  {
    message: 'Progress percentage not consistent with status',
    path: ['progressPercentage']
  }
)

// ==== Progress Update Schema ====

export const CreateActionableUpdateSchema = z.object({
  actionableId: ActionableIdSchema,
  updateType: ActionableUpdateTypeSchema,
  newStatus: ActionableStatusSchema.optional(),
  newProgress: ProgressPercentageSchema.optional(),
  updateNotes: z.string()
    .max(1000, 'Update notes must be 1000 characters or less')
    .trim()
    .optional(),
  challengesFaced: z.string()
    .max(1000, 'Challenges faced must be 1000 characters or less')
    .trim()
    .optional(),
  nextSteps: z.string()
    .max(1000, 'Next steps must be 1000 characters or less')
    .trim()
    .optional(),
  supportNeeded: z.string()
    .max(500, 'Support needed must be 500 characters or less')
    .trim()
    .optional(),
  hoursWorked: EffortHoursSchema.optional(),
  timePeriodStart: z.string()
    .datetime()
    .optional(),
  timePeriodEnd: z.string()
    .datetime()
    .optional(),
  supportingFiles: z.array(z.string().uuid())
    .max(10, 'Maximum 10 supporting files allowed')
    .default([])
})
.refine(
  (data) => {
    if (data.timePeriodStart && data.timePeriodEnd) {
      return new Date(data.timePeriodEnd) > new Date(data.timePeriodStart)
    }
    return true
  },
  {
    message: 'Time period end must be after start',
    path: ['timePeriodEnd']
  }
)
.refine(
  (data) => {
    if (data.updateType === 'completion' && !data.newStatus) {
      return false
    }
    if (data.updateType === 'completion' && data.newStatus !== 'completed') {
      return false
    }
    return true
  },
  {
    message: 'Completion updates must set status to completed',
    path: ['newStatus']
  }
)
.refine(
  (data) => {
    if (data.updateType === 'status_change' && !data.newStatus) {
      return false
    }
    return true
  },
  {
    message: 'Status change updates must specify new status',
    path: ['newStatus']
  }
)

// ==== Delegation Schema ====

export const DelegateActionableSchema = z.object({
  actionableId: ActionableIdSchema,
  newAssignee: UserIdSchema,
  delegationReason: z.string()
    .min(1, 'Delegation reason is required')
    .max(500, 'Delegation reason must be 500 characters or less')
    .trim(),
  retainOversight: z.boolean().default(true),
  transferDeadline: z.boolean().default(false),
  newDueDate: z.string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'New due date must be in the future'
    )
    .optional(),
  delegationInstructions: z.string()
    .max(1000, 'Delegation instructions must be 1000 characters or less')
    .trim()
    .optional()
})
.refine(
  (data) => {
    if (data.transferDeadline && !data.newDueDate) {
      return false
    }
    return true
  },
  {
    message: 'New due date required when transferring deadline',
    path: ['newDueDate']
  }
)

// ==== Complete Actionable Schema ====

export const ActionableSchema = z.object({
  id: ActionableIdSchema,
  meetingId: MeetingIdSchema,
  agendaItemId: z.string().uuid().optional(),
  resolutionId: ResolutionIdSchema.optional(),
  assignedTo: UserIdSchema,
  assignedBy: UserIdSchema,
  delegatedFrom: UserIdSchema.optional(),
  actionNumber: ActionableNumberSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  detailedRequirements: z.string().max(5000).optional(),
  category: ActionableCategorySchema,
  priority: ActionablePrioritySchema,
  estimatedEffortHours: EffortHoursSchema.optional(),
  actualEffortHours: EffortHoursSchema.optional(),
  dueDate: z.string().datetime(),
  reminderIntervals: ReminderIntervalSchema,
  lastReminderSent: z.string().datetime().optional(),
  status: ActionableStatusSchema,
  progressPercentage: ProgressPercentageSchema,
  completionNotes: z.string().max(2000).optional(),
  dependsOnActionableIds: z.array(ActionableIdSchema),
  blocksActionableIds: z.array(ActionableIdSchema),
  requiresApproval: z.boolean(),
  approvedBy: UserIdSchema.optional(),
  approvedAt: z.string().datetime().optional(),
  approvalNotes: z.string().max(1000).optional(),
  deliverableType: z.string().max(100).optional(),
  deliverableLocation: z.string().optional(),
  successMetrics: z.string().max(1000).optional(),
  actualResults: z.string().max(2000).optional(),
  stakeholdersToNotify: z.array(UserIdSchema),
  communicationRequired: z.boolean(),
  communicationTemplate: z.string().max(500).optional(),
  escalationLevel: EscalationLevelSchema,
  escalationPath: z.array(UserIdSchema).min(1).max(5),
  escalatedAt: z.string().datetime().optional(),
  escalatedTo: UserIdSchema.optional(),
  escalationReason: z.string().max(500).optional(),
  assignedAt: TimestampSchema,
  startedAt: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  cancelledAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  version: z.number().int().nonnegative().default(0)
})

// ==== Actionable Update Schema ====

export const ActionableUpdateSchema = z.object({
  id: ActionableUpdateIdSchemaLocal,
  actionableId: ActionableIdSchema,
  updatedBy: UserIdSchema,
  updateType: ActionableUpdateTypeSchema,
  previousStatus: ActionableStatusSchema.optional(),
  newStatus: ActionableStatusSchema.optional(),
  previousProgress: ProgressPercentageSchema.optional(),
  newProgress: ProgressPercentageSchema.optional(),
  updateNotes: z.string().max(1000).optional(),
  challengesFaced: z.string().max(1000).optional(),
  nextSteps: z.string().max(1000).optional(),
  supportNeeded: z.string().max(500).optional(),
  hoursWorked: EffortHoursSchema.optional(),
  timePeriodStart: z.string().datetime().optional(),
  timePeriodEnd: z.string().datetime().optional(),
  supportingFiles: z.array(z.string().uuid()),
  createdAt: TimestampSchema
})

// ==== API Request/Response Schemas ====

export const CreateActionableRequestSchema = CreateActionableSchema

export const CreateActionableResponseSchema = z.object({
  success: z.boolean(),
  data: ActionableSchema.optional(),
  error: z.string().optional(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string()
  })).optional()
})

export const UpdateActionableRequestSchema = z.object({
  id: ActionableIdSchema,
  updates: UpdateActionableSchema
})

export const ListActionablesQuerySchema = z.object({
  meetingId: MeetingIdSchema.optional(),
  assignedTo: UserIdSchema.optional(),
  assignedBy: UserIdSchema.optional(),
  status: ActionableStatusSchema.optional(),
  priority: ActionablePrioritySchema.optional(),
  category: ActionableCategorySchema.optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  overdueOnly: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  searchTerm: z.string().max(100).optional(),
  includeCompleted: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'due_date', 'priority', 'progress_percentage', 'title']).default('due_date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const ActionableListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    actionables: z.array(ActionableSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
    overdueCoun: z.number().int().nonnegative(),
    completedToday: z.number().int().nonnegative()
  }).optional(),
  error: z.string().optional()
})

// ==== Status Transition Validation ====

export const ActionableStatusTransitionSchema = z.object({
  from: ActionableStatusSchema,
  to: ActionableStatusSchema,
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional()
})
.refine(
  (data) => {
    const validTransitions: Record<string, string[]> = {
      'assigned': ['in_progress', 'cancelled'],
      'in_progress': ['blocked', 'under_review', 'completed', 'cancelled'],
      'blocked': ['in_progress', 'cancelled'], 
      'under_review': ['in_progress', 'completed', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [], // Final state
      'overdue': ['in_progress', 'completed', 'cancelled'] // System-set status
    }
    
    return validTransitions[data.from]?.includes(data.to) ?? false
  },
  {
    message: 'Invalid status transition',
    path: ['to']
  }
)

// ==== Bulk Operations Schema ====

export const BulkUpdateActionablesSchema = z.object({
  actionableIds: z.array(ActionableIdSchema)
    .min(1, 'At least one actionable ID is required')
    .max(50, 'Maximum 50 actionables can be updated at once'),
  updates: UpdateActionableSchema,
  reason: z.string()
    .min(1, 'Reason for bulk update is required')
    .max(500, 'Reason must be 500 characters or less')
})

export const BulkReassignActionablesSchema = z.object({
  actionableIds: z.array(ActionableIdSchema)
    .min(1, 'At least one actionable ID is required')
    .max(20, 'Maximum 20 actionables can be reassigned at once'),
  newAssignee: UserIdSchema,
  reason: z.string()
    .min(1, 'Reason for reassignment is required')
    .max(500, 'Reason must be 500 characters or less'),
  transferDeadlines: z.boolean().default(false),
  retainEscalationPath: z.boolean().default(true)
})

// ==== Analytics Schema ====

export const ActionableAnalyticsSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  groupBy: z.enum(['assignee', 'priority', 'category', 'status']).optional(),
  includeCompleted: z.boolean().default(true),
  includeOverdue: z.boolean().default(true)
})

// ==== Export all schemas ====

export const ActionableValidationSchemas = {
  // Core schemas
  ActionablePrioritySchema,
  ActionableStatusSchema,
  ActionableCategorySchema,
  ActionableUpdateTypeSchema,
  EscalationLevelSchema,
  ActionableNumberSchema,
  ProgressPercentageSchema,
  EffortHoursSchema,
  ReminderIntervalSchema,
  
  // Entity schemas
  CreateActionableSchema,
  UpdateActionableSchema,
  ActionableSchema,
  ActionableUpdateSchema,
  
  // Action schemas
  CreateActionableUpdateSchema,
  DelegateActionableSchema,
  ActionableStatusTransitionSchema,
  
  // API schemas
  CreateActionableRequestSchema,
  CreateActionableResponseSchema,
  UpdateActionableRequestSchema,
  ListActionablesQuerySchema,
  ActionableListResponseSchema,
  
  // Utility schemas
  BulkUpdateActionablesSchema,
  BulkReassignActionablesSchema,
  ActionableAnalyticsSchema
} as const

// ==== Type exports ====

export type CreateActionableRequest = z.infer<typeof CreateActionableSchema>
export type UpdateActionableRequest = z.infer<typeof UpdateActionableSchema>
export type CreateActionableUpdateRequest = z.infer<typeof CreateActionableUpdateSchema>
export type DelegateActionableRequest = z.infer<typeof DelegateActionableSchema>
export type ActionableStatusTransition = z.infer<typeof ActionableStatusTransitionSchema>
export type ListActionablesQuery = z.infer<typeof ListActionablesQuerySchema>
export type Actionable = z.infer<typeof ActionableSchema>
export type ActionableUpdate = z.infer<typeof ActionableUpdateSchema>