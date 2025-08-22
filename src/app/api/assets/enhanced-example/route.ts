/**
 * Enhanced Assets API Route Example
 * Demonstrates comprehensive error handling and logging integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Import our error handling system
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  withErrorHandler,
  ErrorResponse,
  ValidationErrorAggregator,
  retry,
  DEFAULT_RETRY_CONFIGS
} from '@/lib/errors'

// Import logging system
import { Logger, BusinessEventLogger } from '@/lib/logging/logger'
import { telemetry, PerformanceTracker } from '@/lib/logging/telemetry'

// Initialize loggers
const logger = Logger.getLogger('EnhancedAssetsAPI')
const businessLogger = new BusinessEventLogger()

// Validation schemas
const CreateAssetSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  category: z.string()
    .max(50, 'Category must be at most 50 characters')
    .optional(),
  tags: z.array(z.string().max(30, 'Tag must be at most 30 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  isPublic: z.boolean().default(false),
  organizationId: z.string().uuid('Organization ID must be valid UUID')
})

/**
 * POST /api/assets/enhanced-example - Create asset with comprehensive error handling
 */
export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Start performance tracking
  const startTime = Date.now()
  logger.startPerformanceTracking()

  // Extract correlation ID from headers or generate one
  const correlationId = request.headers.get('x-correlation-id') || 
                       request.headers.get('x-request-id') || 
                       `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  logger.withCorrelation(correlationId).info('Asset creation request received', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent')
  })

  return await telemetry.withSpan('create_asset', async (span) => {
    try {
      // Validate request body
      const body = await request.json()
      
      const validationErrors = new ValidationErrorAggregator()
      let validatedData: z.infer<typeof CreateAssetSchema>

      try {
        validatedData = CreateAssetSchema.parse(body)
        telemetry.addSpanTags(span, { validation: 'success' })
      } catch (error) {
        telemetry.addSpanTags(span, { validation: 'failed' })
        
        if (error instanceof z.ZodError) {
          // Convert Zod errors to our ValidationError format
          for (const issue of error.issues) {
            const field = issue.path.join('.')
            validationErrors.addField(field, issue.message, body[issue.path[0]])
          }
          
          logger.withCorrelation(correlationId).warn('Validation failed', {
            errors: error.issues,
            receivedData: body
          })

          validationErrors.throwIfErrors()
        }
        
        throw new ValidationError('Invalid request data', undefined, body, undefined, undefined, correlationId)
      }

      // Initialize Supabase client with retry logic
      const supabase = await retry(
        async () => {
          const cookieStore = await cookies()
          return createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                getAll() {
                  return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                  cookiesToSet.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, options)
                  })
                },
              },
            }
          )
        },
        DEFAULT_RETRY_CONFIGS.database,
        'supabase_client_initialization'
      )

      // Get and validate current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        logger.withCorrelation(correlationId).error('Authentication error', authError)
        throw new AuthenticationError('Authentication failed', 'supabase', undefined, { authError: authError.message }, authError, correlationId)
      }
      
      if (!user) {
        logger.withCorrelation(correlationId).warn('Unauthenticated request')
        throw new AuthenticationError('User not authenticated', 'supabase', undefined, undefined, undefined, correlationId)
      }

      logger.withUser(user.id).info('User authenticated', {
        userId: user.id,
        email: user.email
      })

      telemetry.addSpanTags(span, { 
        user_id: user.id,
        organization_id: validatedData.organizationId 
      })

      // Check user's permission to create assets in the organization
      const { data: membership, error: membershipError } = await PerformanceTracker.trackDatabaseOperation(
        'select',
        'organization_members',
        async () => supabase
          .from('organization_members')
          .select('role, status')
          .eq('organization_id', validatedData.organizationId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
      )

      if (membershipError) {
        if (membershipError.code === 'PGRST116') {
          logger.withUser(user.id, validatedData.organizationId).warn('User not member of organization', {
            organizationId: validatedData.organizationId
          })
          throw new AuthorizationError(
            'Access denied to organization',
            user.id,
            'organization',
            'create_asset',
            'member',
            undefined,
            { organizationId: validatedData.organizationId },
            correlationId
          )
        }
        
        logger.withUser(user.id).error('Database error checking membership', membershipError)
        throw new DatabaseError(
          'Failed to verify organization membership',
          'select',
          'organization_members',
          undefined,
          { organizationId: validatedData.organizationId, userId: user.id },
          membershipError,
          correlationId
        )
      }

      if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
        logger.withUser(user.id, validatedData.organizationId).warn('Insufficient permissions for asset creation', {
          userRole: membership?.role,
          requiredRoles: ['owner', 'admin', 'member']
        })
        throw new AuthorizationError(
          'Insufficient permissions to create assets',
          user.id,
          'asset',
          'create',
          'member',
          membership?.role,
          { organizationId: validatedData.organizationId },
          correlationId
        )
      }

      // Check for duplicate asset name in organization (business rule)
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id, title')
        .eq('organization_id', validatedData.organizationId)
        .eq('title', validatedData.title)
        .eq('is_deleted', false)
        .single()

      if (existingAsset) {
        logger.withUser(user.id, validatedData.organizationId).warn('Duplicate asset title', {
          existingAssetId: existingAsset.id,
          title: validatedData.title
        })
        throw new ValidationError(
          `An asset with the title "${validatedData.title}" already exists in this organization`,
          'title',
          validatedData.title,
          ['unique'],
          { existingAssetId: existingAsset.id },
          correlationId
        )
      }

      // Create the asset with database operation tracking
      const assetData = {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        tags: validatedData.tags || [],
        is_public: validatedData.isPublic,
        organization_id: validatedData.organizationId,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdAsset, error: createError } = await PerformanceTracker.trackDatabaseOperation(
        'insert',
        'assets',
        async () => supabase
          .from('assets')
          .insert(assetData)
          .select()
          .single()
      )

      if (createError) {
        logger.withUser(user.id, validatedData.organizationId).error('Failed to create asset', createError)
        
        if (createError.code === '23505') { // Unique constraint violation
          throw new ValidationError(
            'Asset with this name already exists',
            'title',
            validatedData.title,
            ['unique'],
            undefined,
            correlationId
          )
        }
        
        throw new DatabaseError(
          'Failed to create asset',
          'insert',
          'assets',
          createError.code,
          assetData,
          createError,
          correlationId
        )
      }

      if (!createdAsset) {
        throw new DatabaseError(
          'Asset creation succeeded but no data returned',
          'insert',
          'assets',
          undefined,
          assetData,
          undefined,
          correlationId
        )
      }

      // Log business event
      businessLogger.logUserAction(
        'asset_created',
        user.id,
        'asset',
        createdAsset.id,
        {
          title: createdAsset.title,
          category: createdAsset.category,
          organizationId: validatedData.organizationId,
          isPublic: createdAsset.is_public,
          correlationId
        }
      )

      // Record success metrics
      const duration = Date.now() - startTime
      telemetry.recordHistogram('asset_creation_duration_ms', duration, {
        organization_id: validatedData.organizationId,
        category: validatedData.category || 'uncategorized',
        status: 'success'
      })

      telemetry.recordCounter('assets_created_total', 1, {
        organization_id: validatedData.organizationId,
        category: validatedData.category || 'uncategorized'
      })

      telemetry.addSpanTags(span, { 
        asset_id: createdAsset.id,
        status: 'success' 
      })

      logger.withUser(user.id, validatedData.organizationId)
        .withCorrelation(correlationId)
        .info('Asset created successfully', {
          assetId: createdAsset.id,
          title: createdAsset.title,
          duration,
          organizationId: validatedData.organizationId
        })

      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          id: createdAsset.id,
          title: createdAsset.title,
          description: createdAsset.description,
          category: createdAsset.category,
          tags: createdAsset.tags,
          isPublic: createdAsset.is_public,
          organizationId: createdAsset.organization_id,
          ownerId: createdAsset.owner_id,
          createdAt: createdAsset.created_at,
          updatedAt: createdAsset.updated_at
        },
        message: 'Asset created successfully',
        correlationId,
        timestamp: new Date().toISOString()
      }, { 
        status: 201,
        headers: {
          'X-Correlation-ID': correlationId,
          'X-Response-Time': `${duration}ms`
        }
      })

    } catch (error) {
      // Error handling is managed by the withErrorHandler wrapper
      // But we can add additional context here
      const duration = Date.now() - startTime
      
      telemetry.recordHistogram('asset_creation_duration_ms', duration, {
        status: 'error',
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      })

      telemetry.recordCounter('asset_creation_errors_total', 1, {
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      })

      logger.withCorrelation(correlationId).error('Asset creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        errorType: error instanceof Error ? error.constructor.name : 'unknown'
      })

      // Re-throw to let the error handler manage the response
      throw error
    }
  })
})

/**
 * GET /api/assets/enhanced-example - List assets with comprehensive error handling
 */
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const correlationId = request.headers.get('x-correlation-id') || 
                       `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  logger.withCorrelation(correlationId).info('Assets list request received')

  return await telemetry.withSpan('list_assets', async (span) => {
    try {
      // Get query parameters
      const { searchParams } = new URL(request.url)
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
      const search = searchParams.get('search')
      const category = searchParams.get('category')
      const organizationId = searchParams.get('organizationId')

      if (organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
        throw new ValidationError('Invalid organization ID format', 'organizationId', organizationId, ['uuid'], undefined, correlationId)
      }

      telemetry.addSpanTags(span, {
        page,
        limit,
        has_search: !!search,
        has_category: !!category,
        organization_id: organizationId
      })

      // Initialize Supabase client
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            },
          },
        }
      )

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new AuthenticationError('User not authenticated', 'supabase', undefined, undefined, authError, correlationId)
      }

      logger.withUser(user.id).debug('Listing assets for user')

      // Build query with proper access control
      let query = supabase
        .from('assets')
        .select(`
          id, title, description, category, tags, is_public,
          organization_id, owner_id, created_at, updated_at,
          owner:users!assets_owner_id_fkey(id, email),
          organization:organizations!assets_organization_id_fkey(id, name, slug)
        `)
        .eq('is_deleted', false)

      // Add filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }
      
      if (category) {
        query = query.eq('category', category)
      }
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data: assets, error: queryError } = await PerformanceTracker.trackDatabaseOperation(
        'select',
        'assets',
        async () => query
      )

      if (queryError) {
        logger.withUser(user.id).error('Failed to fetch assets', queryError)
        throw new DatabaseError(
          'Failed to fetch assets',
          'select',
          'assets',
          queryError.code,
          { page, limit, search, category, organizationId },
          queryError,
          correlationId
        )
      }

      // Filter out assets user doesn't have access to
      const accessibleAssets = assets?.filter(asset => {
        return asset.is_public || asset.owner_id === user.id
        // TODO: Add organization membership check for private assets
      }) || []

      logger.withUser(user.id).info('Assets retrieved successfully', {
        totalAssets: assets?.length || 0,
        accessibleAssets: accessibleAssets.length,
        page,
        limit,
        hasSearch: !!search,
        hasCategory: !!category
      })

      return NextResponse.json({
        success: true,
        data: {
          assets: accessibleAssets,
          pagination: {
            page,
            limit,
            total: accessibleAssets.length,
            hasMore: accessibleAssets.length === limit
          }
        },
        correlationId,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'X-Correlation-ID': correlationId
        }
      })

    } catch (error) {
      logger.withCorrelation(correlationId).error('Assets list failed', error)
      throw error
    }
  })
})