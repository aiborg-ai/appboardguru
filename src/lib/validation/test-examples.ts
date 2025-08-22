/**
 * Test Examples for Validation Schemas
 * Demonstrates usage and validates schemas work correctly
 */

import {
  CreateResolutionSchema,
  UpdateResolutionSchema,
  CastVoteSchema,
  CreateActionableSchema,
  UpdateActionableSchema,
  CreateActionableUpdateSchema,
  type CreateResolutionRequest,
  type CreateActionableRequest
} from './index'

// ==== Resolution Test Data ====

export const validResolutionData: CreateResolutionRequest = {
  meetingId: '12345678-1234-4123-8123-123456789012',
  title: 'Approve Annual Budget',
  description: 'Resolution to approve the annual budget for fiscal year 2024',
  resolutionText: 'RESOLVED, that the annual budget for fiscal year 2024 in the amount of $1,000,000 is hereby approved.',
  resolutionType: 'financial',
  category: 'budget',
  priorityLevel: 1,
  secondedBy: '87654321-4321-4321-8321-210987654321',
  effectiveDate: '2024-01-01T00:00:00.000Z',
  implementationDeadline: '2024-12-31T23:59:59.000Z',
  requiresBoardApproval: true,
  requiresShareholderApproval: false,
  legalReviewRequired: true,
  supportingDocuments: [
    'doc12345-1234-4123-8123-123456789012',
    'doc23456-2345-4234-8234-234567890123'
  ],
  relatedResolutions: []
}

export const invalidResolutionData = {
  meetingId: 'invalid-uuid',
  title: '', // Too short
  resolutionText: 'Too short',
  resolutionType: 'invalid-type', // Invalid enum
  priorityLevel: 6, // Out of range
  effectiveDate: '2020-01-01T00:00:00.000Z', // In the past
  supportingDocuments: new Array(15).fill('doc-id') // Too many
}

// ==== Actionable Test Data ====

export const validActionableData: CreateActionableRequest = {
  meetingId: '12345678-1234-4123-8123-123456789012',
  resolutionId: '12345678-1234-4123-8123-123456789012',
  assignedTo: '87654321-4321-4321-8321-210987654321',
  title: 'Implement Budget Tracking System',
  description: 'Develop and deploy a new budget tracking system to monitor expenses against the approved budget.',
  detailedRequirements: `
    Requirements:
    1. Create database schema for budget tracking
    2. Develop web interface for expense entry
    3. Implement reporting dashboard
    4. Set up automated alerts for budget overruns
    5. Create user documentation and training materials
  `,
  category: 'implementation',
  priority: 'high',
  estimatedEffortHours: 80,
  dueDate: '2024-03-31T17:00:00.000Z',
  reminderIntervals: [168, 24, 1], // 1 week, 1 day, 1 hour before
  dependsOnActionableIds: [],
  requiresApproval: true,
  deliverableType: 'Software System',
  successMetrics: 'System deployed, user training completed, 90% user adoption within 30 days',
  stakeholdersToNotify: [
    'stake123-1234-4123-8123-123456789012',
    'stake456-4567-4567-8567-456789012345'
  ],
  communicationRequired: true,
  escalationPath: [
    'mgr12345-1234-4123-8123-123456789012',
    'dir67890-6789-4789-8789-678901234567',
    'ceo11111-1111-4111-8111-111111111111'
  ]
}

export const invalidActionableData = {
  meetingId: 'invalid-uuid',
  assignedTo: 'invalid-uuid',
  title: '', // Too short
  description: '', // Too short
  category: 'invalid-category', // Invalid enum
  priority: 'super-critical', // Invalid enum
  dueDate: '2020-01-01T00:00:00.000Z', // In the past
  reminderIntervals: [1000], // Too large
  dependsOnActionableIds: new Array(15).fill('dep-id'), // Too many
  escalationPath: [] // Empty - should have at least one
}

// ==== Test Functions ====

export function testResolutionValidation() {
  console.log('Testing Resolution Validation...')
  
  // Test valid data
  const validResult = CreateResolutionSchema.safeParse(validResolutionData)
  console.log('Valid resolution data:', validResult.success ? '✅ PASS' : '❌ FAIL')
  if (!validResult.success) {
    console.log('Validation errors:', validResult.error.issues)
  }
  
  // Test invalid data
  const invalidResult = CreateResolutionSchema.safeParse(invalidResolutionData)
  console.log('Invalid resolution data:', !invalidResult.success ? '✅ PASS (correctly rejected)' : '❌ FAIL (should be rejected)')
  if (!invalidResult.success) {
    console.log('Expected validation errors:', invalidResult.error.issues.length, 'issues found')
  }
  
  // Test vote validation
  const validVote = {
    resolutionId: '12345678-1234-4123-8123-123456789012',
    voteChoice: 'for',
    voteWeight: 1,
    votingMethod: 'electronic',
    voteRationale: 'This budget is well-planned and necessary for our growth.',
    voteConfidence: 5
  }
  
  const voteResult = CastVoteSchema.safeParse(validVote)
  console.log('Valid vote data:', voteResult.success ? '✅ PASS' : '❌ FAIL')
  
  console.log('Resolution validation tests completed.\n')
}

export function testActionableValidation() {
  console.log('Testing Actionable Validation...')
  
  // Test valid data
  const validResult = CreateActionableSchema.safeParse(validActionableData)
  console.log('Valid actionable data:', validResult.success ? '✅ PASS' : '❌ FAIL')
  if (!validResult.success) {
    console.log('Validation errors:', validResult.error.issues)
  }
  
  // Test invalid data
  const invalidResult = CreateActionableSchema.safeParse(invalidActionableData)
  console.log('Invalid actionable data:', !invalidResult.success ? '✅ PASS (correctly rejected)' : '❌ FAIL (should be rejected)')
  if (!invalidResult.success) {
    console.log('Expected validation errors:', invalidResult.error.issues.length, 'issues found')
  }
  
  // Test progress update validation
  const validUpdate = {
    actionableId: '12345678-1234-4123-8123-123456789012',
    updateType: 'progress',
    newStatus: 'in_progress',
    newProgress: 25,
    updateNotes: 'Completed database schema design and started implementation.',
    challengesFaced: 'Some complexity in handling budget categories.',
    nextSteps: 'Continue with web interface development.',
    hoursWorked: 20,
    timePeriodStart: '2024-01-01T09:00:00.000Z',
    timePeriodEnd: '2024-01-05T17:00:00.000Z',
    supportingFiles: ['file123-1234-4123-8123-123456789012']
  }
  
  const updateResult = CreateActionableUpdateSchema.safeParse(validUpdate)
  console.log('Valid update data:', updateResult.success ? '✅ PASS' : '❌ FAIL')
  if (!updateResult.success) {
    console.log('Update validation errors:', updateResult.error.issues)
  }
  
  console.log('Actionable validation tests completed.\n')
}

export function testBusinessRules() {
  console.log('Testing Business Rules...')
  
  // Test financial resolution without board approval
  const financialWithoutApproval = {
    ...validResolutionData,
    resolutionType: 'financial',
    requiresBoardApproval: false
  }
  
  const financialResult = CreateResolutionSchema.safeParse(financialWithoutApproval)
  console.log('Financial resolution without board approval should pass schema validation:', financialResult.success ? '✅ PASS' : '❌ FAIL')
  console.log('(Business rule validation would catch this in middleware)')
  
  // Test actionable with due date too soon for priority
  const urgentActionableWithShortDeadline = {
    ...validActionableData,
    priority: 'critical',
    dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
  }
  
  const urgentResult = CreateActionableSchema.safeParse(urgentActionableWithShortDeadline)
  console.log('Critical actionable with 30-min deadline should pass schema validation:', urgentResult.success ? '✅ PASS' : '❌ FAIL')
  console.log('(Business rule validation would catch this in middleware)')
  
  // Test circular dependency
  const circularDependency = {
    ...validActionableData,
    dependsOnActionableIds: ['dep12345-1234-4123-8123-123456789012'],
    // In a real scenario, the dependent actionable would also depend on this one
  }
  
  const circularResult = CreateActionableSchema.safeParse(circularDependency)
  console.log('Actionable with potential circular dependency passes schema:', circularResult.success ? '✅ PASS' : '❌ FAIL')
  console.log('(Business rule validation would check for actual circular dependencies)')
  
  console.log('Business rules tests completed.\n')
}

export function runAllTests() {
  console.log('🧪 Running Validation Schema Tests\n')
  console.log('=' * 50)
  
  testResolutionValidation()
  testActionableValidation()
  testBusinessRules()
  
  console.log('=' * 50)
  console.log('All validation tests completed! ✅')
}

// Export test data for use in other test files
export const testData = {
  validResolutionData,
  invalidResolutionData,
  validActionableData,
  invalidActionableData
}

export default {
  testResolutionValidation,
  testActionableValidation,
  testBusinessRules,
  runAllTests,
  testData
}