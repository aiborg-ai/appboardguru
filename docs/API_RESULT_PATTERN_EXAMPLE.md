# API Route Result Pattern Examples

## Converting API Routes to Use Result Pattern

Here are examples showing how to update API routes to use the Result pattern for consistent error handling.

## Example 1: Simple GET Route

### Before (Traditional Try/Catch)
```typescript
// src/app/api/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserService } from '@/lib/services/user.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const userService = new UserService(supabase)
    
    const user = await userService.getUserById(params.id)
    
    return Response.json({ success: true, data: user })
  } catch (error) {
    console.error('Error getting user:', error)
    
    if (error.message.includes('not found')) {
      return Response.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      )
    }
    
    return Response.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
```

### After (Result Pattern)
```typescript
// src/app/api/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserService } from '@/lib/services/user.service'
import { resultToAPIResponse, getHTTPStatusFromError } from '@/lib/repositories/result'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const userService = new UserService(supabase)
  
  const result = await userService.getUserById(params.id)
  
  const response = resultToAPIResponse(result)
  const status = result.success ? 200 : getHTTPStatusFromError(result.error)
  
  return Response.json(response, { status })
}
```

## Example 2: POST Route with Validation

### Before (Traditional Try/Catch)
```typescript
// src/app/api/vaults/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const vaultService = new VaultService(supabase)
    
    const data = await request.json()
    
    // Manual validation
    if (!data.name || !data.organizationId) {
      return Response.json(
        { success: false, error: 'Name and organization ID are required' },
        { status: 400 }
      )
    }
    
    const vault = await vaultService.createVault(data)
    
    return Response.json({ success: true, data: vault }, { status: 201 })
  } catch (error) {
    console.error('Error creating vault:', error)
    
    if (error.message.includes('permission')) {
      return Response.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    if (error.message.includes('validation')) {
      return Response.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### After (Result Pattern)
```typescript
// src/app/api/vaults/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const vaultService = new VaultService(supabase)
    
    const data = await request.json()
    const result = await vaultService.createVault(data)
    
    const response = resultToAPIResponse(result)
    const status = result.success ? 201 : getHTTPStatusFromError(result.error)
    
    return Response.json(response, { status })
  } catch (error) {
    // Handle JSON parsing errors
    return Response.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } },
      { status: 400 }
    )
  }
}
```

## Example 3: DELETE Route with Permission Checking

### After (Result Pattern)
```typescript
// src/app/api/vaults/[id]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const vaultService = new VaultService(supabase)
  
  const result = await vaultService.deleteVault(params.id)
  
  if (result.success) {
    return Response.json({ success: true }, { status: 204 })
  } else {
    const response = resultToAPIResponse(result)
    const status = getHTTPStatusFromError(result.error)
    return Response.json(response, { status })
  }
}
```

## Example 4: Complex Route with Multiple Operations

```typescript
// src/app/api/vaults/[id]/invite/route.ts
import { z } from 'zod'
import { validateAndWrap } from '@/lib/repositories/result'

const inviteSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  emails: z.array(z.string().email()).optional(),
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
  message: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawData = await request.json()
    
    // Validate input using Result pattern
    const validationResult = validateAndWrap(
      rawData,
      (data) => inviteSchema.parse(data),
      'Vault invitation data validation'
    )
    
    if (!validationResult.success) {
      const response = resultToAPIResponse(validationResult)
      return Response.json(response, { status: 400 })
    }
    
    const supabase = createServerSupabaseClient()
    const vaultService = new VaultService(supabase)
    
    const result = await vaultService.inviteUsers(params.id, validationResult.data)
    
    const response = resultToAPIResponse(result)
    const status = result.success ? 200 : getHTTPStatusFromError(result.error)
    
    return Response.json(response, { status })
  } catch (error) {
    return Response.json(
      { 
        success: false, 
        error: { 
          code: 'REQUEST_ERROR', 
          message: 'Failed to process request',
          details: error instanceof Error ? error.message : String(error)
        } 
      },
      { status: 400 }
    )
  }
}
```

## Example 5: GET Route with Pagination and Filtering

```typescript
// src/app/api/users/[id]/vaults/route.ts
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  organizationId: z.string().uuid().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Parse and validate query parameters
  const url = new URL(request.url)
  const queryParams = Object.fromEntries(url.searchParams)
  
  const validationResult = validateAndWrap(
    queryParams,
    (data) => querySchema.parse(data),
    'Query parameters validation'
  )
  
  if (!validationResult.success) {
    const response = resultToAPIResponse(validationResult)
    return Response.json(response, { status: 400 })
  }
  
  const supabase = createServerSupabaseClient()
  const vaultService = new VaultService(supabase)
  
  const result = await vaultService.getUserVaults(params.id, validationResult.data)
  
  const response = resultToAPIResponse(result)
  const status = result.success ? 200 : getHTTPStatusFromError(result.error)
  
  return Response.json(response, { status })
}
```

## Error Response Format

With the Result pattern, all API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input: Email is required",
    "details": {
      "field": "email",
      "originalData": { "name": "John" }
    }
  }
}
```

## Middleware for Result Pattern

You can create middleware to automatically handle Result pattern responses:

```typescript
// src/lib/middleware/result-handler.ts
import { NextRequest, NextResponse } from 'next/server'
import { Result, resultToAPIResponse, getHTTPStatusFromError } from '@/lib/repositories/result'

export function withResultHandler<T>(
  handler: (request: NextRequest, context?: any) => Promise<Result<T>>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      const result = await handler(request, context)
      
      const response = resultToAPIResponse(result)
      const status = result.success ? 200 : getHTTPStatusFromError(result.error)
      
      return NextResponse.json(response, { status })
    } catch (error) {
      // Handle unexpected errors
      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          } : undefined
        }
      }
      
      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}

// Usage
export const GET = withResultHandler(async (request, { params }) => {
  const supabase = createServerSupabaseClient()
  const userService = new UserService(supabase)
  
  return await userService.getUserById(params.id)
})
```

## Benefits of Result Pattern in API Routes

1. **Consistent Error Handling**: All errors follow the same format
2. **Type Safety**: Errors are handled at compile time
3. **Better HTTP Status Codes**: Automatic mapping from error types to HTTP status
4. **Reduced Boilerplate**: Less manual error handling code
5. **Better Debugging**: Rich error context and categorization
6. **Graceful Degradation**: Recovery strategies can provide fallback responses

This approach makes API routes more maintainable, predictable, and easier to debug.