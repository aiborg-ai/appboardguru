# Meeting Validation System

A comprehensive validation framework for meeting resolutions and actionables using Zod with advanced business rule validation, API middleware, and branded types.

## Features

- **Comprehensive Schema Validation**: Full Zod schemas for all meeting resolution and actionable operations
- **Business Rule Validation**: Custom validators for complex business logic
- **API Middleware Integration**: Ready-to-use middleware for Next.js API routes
- **Branded Type Support**: Type-safe IDs with runtime validation
- **Advanced Error Handling**: Detailed error messages with context
- **Batch Operations**: Support for bulk updates with validation
- **Status Transition Validation**: Ensures valid state changes
- **Dependency Validation**: Prevents circular dependencies in actionables

## Quick Start

```typescript
import {
  CreateResolutionSchema,
  CreateActionableSchema,
  createApiValidationMiddleware,
  BusinessRules
} from '@/lib/validation'

// Validate resolution creation
const validationResult = CreateResolutionSchema.safeParse(requestData)
if (!validationResult.success) {
  // Handle validation errors
  console.error(validationResult.error.issues)
}

// Use in API route
const validation = createApiValidationMiddleware({
  body: CreateResolutionSchema,
  businessRules: [BusinessRules.resolutionTypeCompatibility()]
})
```

## Validation Schemas

### Meeting Resolutions

#### Core Schemas
- `CreateResolutionSchema` - For creating new resolutions
- `UpdateResolutionSchema` - For updating existing resolutions  
- `CastVoteSchema` - For casting votes on resolutions
- `InitiateVotingSchema` - For starting voting process
- `ResolutionSchema` - Complete resolution entity
- `VoteSchema` - Vote entity

#### Enums
- `ResolutionTypeSchema` - motion, amendment, policy, directive, appointment, financial, strategic, other
- `ResolutionStatusSchema` - proposed, passed, rejected, tabled, withdrawn, amended
- `VotingMethodSchema` - voice, show_of_hands, secret_ballot, electronic, unanimous_consent, roll_call
- `VoteChoiceSchema` - for, against, abstain, absent

#### Business Rules
- Resolution type compatibility with voting methods
- Quorum requirements by resolution type
- Board approval requirements for financial resolutions
- Voting deadline validation

### Meeting Actionables

#### Core Schemas
- `CreateActionableSchema` - For creating new actionables
- `UpdateActionableSchema` - For updating existing actionables
- `CreateActionableUpdateSchema` - For progress updates
- `DelegateActionableSchema` - For delegation
- `ActionableSchema` - Complete actionable entity
- `ActionableUpdateSchema` - Update/progress entry

#### Enums
- `ActionablePrioritySchema` - critical, high, medium, low
- `ActionableStatusSchema` - assigned, in_progress, blocked, under_review, completed, cancelled, overdue
- `ActionableCategorySchema` - follow_up, research, implementation, compliance, reporting, communication, approval, review, other
- `ActionableUpdateTypeSchema` - progress, status_change, deadline_extension, delegation, completion

#### Business Rules
- Due date validation based on priority levels
- Progress percentage consistency with status
- Dependency chain validation (no circular dependencies)
- Escalation path validation
- Workload validation for assignees

## API Middleware Usage

### Basic Validation

```typescript
import { createApiValidationMiddleware } from '@/lib/validation'

export const createResolutionValidation = createApiValidationMiddleware({
  body: CreateResolutionSchema,
  params: z.object({
    meetingId: MeetingIdSchema
  }),
  businessRules: [
    BusinessRules.userPermissionCheck(['member', 'admin', 'owner']),
    BusinessRules.resolutionTypeCompatibility()
  ]
})

// In API route
export async function POST(request: NextRequest, context: { params: { meetingId: string } }) {
  const validationResult = await createResolutionValidation(request, context)
  
  if (!validationResult.isValid) {
    return validationResult.response // Returns formatted error response
  }
  
  const { body } = validationResult.validatedData!
  // body is now typed and validated
}
```

### Decorator-based Validation

```typescript
import { ValidateApiRoute } from '@/lib/validation'

export class ResolutionAPI {
  @ValidateApiRoute({
    body: CreateResolutionSchema,
    businessRules: [BusinessRules.resolutionTypeCompatibility()]
  })
  static async createResolution(request: NextRequest, context: any) {
    const { body } = (request as any).validatedData
    // Implementation here
  }
}
```

### Advanced Business Rules

```typescript
const customValidation = createApiValidationMiddleware({
  body: CreateResolutionSchema,
  businessRules: [
    {
      name: 'custom_financial_validation',
      validate: async (data: any, context?: ValidationContext) => {
        const { resolutionType, requiresBoardApproval } = data.body || {}
        
        if (resolutionType === 'financial' && !requiresBoardApproval) {
          return {
            valid: false,
            message: 'Financial resolutions require board approval',
            code: 'missing_board_approval'
          }
        }
        
        return { valid: true }
      }
    }
  ]
})
```

## Business Rules Library

### Pre-built Rules

#### Resolution Rules
- `resolutionTypeCompatibility()` - Validates voting method compatibility
- `resolutionQuorumCheck(requiredQuorum)` - Validates quorum requirements

#### Actionable Rules  
- `actionableDueDateValidation()` - Validates due dates based on priority
- `actionableDependencyValidation()` - Prevents circular dependencies

#### General Rules
- `userPermissionCheck(roles)` - Validates user permissions
- `organizationMembershipCheck()` - Validates organization membership

### Custom Rules

```typescript
const customRule: BusinessRuleValidator = {
  name: 'custom_validation',
  validate: async (data: any, context?: ValidationContext) => {
    // Your validation logic here
    return { 
      valid: true | false,
      message?: 'Error message',
      code?: 'error_code'
    }
  }
}
```

## Status Transitions

Both resolutions and actionables have validated status transitions:

### Resolution Status Transitions
- `proposed` → `passed`, `rejected`, `tabled`, `withdrawn`, `amended`
- `tabled` → `proposed`, `withdrawn`
- `amended` → `proposed`, `withdrawn`
- `passed`, `rejected`, `withdrawn` are final states

### Actionable Status Transitions
- `assigned` → `in_progress`, `cancelled`
- `in_progress` → `blocked`, `under_review`, `completed`, `cancelled`
- `blocked` → `in_progress`, `cancelled`
- `under_review` → `in_progress`, `completed`, `cancelled`
- `completed`, `cancelled` are final states
- `overdue` is system-set and can transition to `in_progress`, `completed`, `cancelled`

## Error Handling

The validation system provides detailed error information:

```typescript
{
  success: false,
  error: 'Validation failed',
  validationErrors: [
    {
      field: 'title',
      message: 'Resolution title is required',
      code: 'invalid_type',
      path: ['title'],
      received: undefined,
      expected: 'string'
    }
  ],
  code: 'VALIDATION_ERROR',
  requestId: 'uuid',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Branded Types

All IDs use branded types for type safety:

```typescript
import { ResolutionId, ActionableId } from '@/lib/validation'

// Type-safe ID creation
const resolutionId = createMeetingResolutionId('uuid-string')
if (resolutionId.success) {
  // resolutionId.data is of type ResolutionId
}

// Type guards
if (isMeetingResolutionId(someValue)) {
  // someValue is now typed as ResolutionId
}
```

## Common Patterns

### Financial Resolution Creation

```typescript
const createFinancialResolution = createApiValidationMiddleware({
  body: CreateResolutionSchema.refine(
    (data) => data.resolutionType === 'financial' ? data.requiresBoardApproval : true,
    'Financial resolutions must require board approval'
  ),
  businessRules: [
    BusinessRules.userPermissionCheck(['admin', 'owner']),
    BusinessRules.resolutionQuorumCheck(0.67) // 2/3 majority
  ]
})
```

### Critical Actionable Creation

```typescript
const createCriticalActionable = createApiValidationMiddleware({
  body: CreateActionableSchema.refine(
    (data) => data.priority === 'critical' ? data.escalationPath.length >= 2 : true,
    'Critical actionables require at least 2 escalation contacts'
  ),
  businessRules: [
    BusinessRules.actionableDueDateValidation(),
    BusinessRules.userPermissionCheck(['admin', 'owner'])
  ]
})
```

## Testing

```typescript
import { CreateResolutionSchema } from '@/lib/validation'

describe('Resolution Validation', () => {
  test('validates basic resolution creation', () => {
    const validData = {
      meetingId: 'valid-uuid',
      title: 'Test Resolution',
      resolutionText: 'Resolved that...',
      resolutionType: 'motion',
      priorityLevel: 3
    }
    
    const result = CreateResolutionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
  
  test('rejects invalid resolution type', () => {
    const invalidData = {
      // ... other valid fields
      resolutionType: 'invalid-type'
    }
    
    const result = CreateResolutionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].code).toBe('invalid_enum_value')
  })
})
```

## Integration with Repository Layer

```typescript
import { ValidateInput } from '@/lib/validation'

class ResolutionRepository {
  @ValidateInput(CreateResolutionSchema)
  async create(data: CreateResolutionRequest): Promise<Result<Resolution>> {
    // data is already validated by the decorator
    // Implementation here
  }
}
```

## Performance Considerations

- Validation schemas are compiled once and reused
- Business rules are executed in sequence and can be cached
- Use `safeParse` for performance-critical paths
- Consider using `parseAsync` for complex async validations

## Migration from Existing Code

1. Replace manual validation with schema validation
2. Add business rule validators for complex logic
3. Use middleware in API routes for consistent validation
4. Migrate to branded types for type safety
5. Update error handling to use structured validation errors

This validation system provides a robust foundation for ensuring data integrity and business rule compliance across the meeting management system.