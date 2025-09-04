/**
 * Asset Annotation Controller
 * API layer following the consolidated controller pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  AssetId, 
  AnnotationId, 
  UserId, 
  OrganizationId,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  AnnotationType 
} from '@/types/annotation-types'
import { IAnnotationService } from '@/lib/services/annotation.service'
import { createSupabaseApiClient } from '@/lib/supabase-api-auth'

// Validation schemas using Zod
const createAnnotationSchema = z.object({
  annotationType: z.enum(['highlight', 'area', 'textbox', 'drawing', 'stamp', 'voice']),
  annotationSubtype: z.string().optional(), // For preserving original document annotation types
  content: z.object({
    text: z.string().optional(),
    image: z.string().optional(),
    audioUrl: z.string().optional(),
    audioTranscription: z.string().optional(),
    audioDuration: z.number().optional(),
    audioFormat: z.string().optional()
  }).refine(data => data.text || data.image || data.audioUrl, {
    message: 'Either text, image, or audio content is required'
  }),
  pageNumber: z.number().int().positive(),
  position: z.object({
    pageNumber: z.number().int().positive(),
    rects: z.array(z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number().positive(),
      height: z.number().positive()
    })).min(1),
    boundingRect: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number().positive(),
      height: z.number().positive()
    })
  }),
  selectedText: z.string().max(5000).optional(),
  commentText: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  opacity: z.number().min(0).max(1).optional(),
  isPrivate: z.boolean().optional(),
  sharedWith: z.array(z.string().uuid()).optional(), // Array of user IDs to share with
  // Voice annotation specific fields
  audioData: z.string().optional(),
  audioFormat: z.string().optional(),
  transcribeAudio: z.boolean().optional(),
  voiceUrl: z.string().optional(),
  voiceTranscription: z.string().optional()
})

const updateAnnotationSchema = z.object({
  commentText: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  opacity: z.number().min(0).max(1).optional(),
  isPrivate: z.boolean().optional(),
  isResolved: z.boolean().optional()
})

const queryParametersSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  type: z.enum(['highlight', 'area', 'textbox', 'drawing', 'stamp', 'voice']).optional(),
  private: z.string().optional(),
  resolved: z.string().optional(),
  pageNumber: z.string().optional()
})

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    requestId?: string
    pagination?: {
      total: number
      limit: number
      offset: number
    }
  }
}

export class AnnotationController {
  constructor(private annotationService: IAnnotationService) {}

  /**
   * GET /api/assets/[id]/annotations
   * Retrieve all annotations for an asset
   */
  async getAnnotations(request: NextRequest, assetId: string): Promise<NextResponse<ApiResponse<any>>> {
    try {
      // Authenticate user (supports both cookie and header auth)
      const supabase = await createSupabaseApiClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' }, 
          { status: 401 }
        )
      }

      // Parse and validate query parameters
      const url = new URL(request.url)
      const queryParams = Object.fromEntries(url.searchParams.entries())
      const validation = queryParametersSchema.safeParse(queryParams)

      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid query parameters',
            details: validation.error.errors
          },
          { status: 400 }
        )
      }

      const { page, limit = '50', offset = '0', type, private: isPrivate, resolved, pageNumber } = validation.data

      // Build query criteria
      const criteria = {
        assetId: assetId as AssetId,
        ...(type && { annotationType: type as AnnotationType }),
        ...(isPrivate !== undefined && { isPrivate: isPrivate === 'true' }),
        ...(resolved !== undefined && { isResolved: resolved === 'true' }),
        ...(pageNumber && { pageNumber: parseInt(pageNumber) }),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }

      // Fetch annotations
      const result = await this.annotationService.getAnnotationsByAssetId(assetId as AssetId, criteria)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: 500 }
        )
      }

      // Get total count for pagination
      const countResult = await this.annotationService.countAnnotations(criteria)
      const total = countResult.success ? countResult.data : 0

      return NextResponse.json({
        success: true,
        data: {
          annotations: result.data,
          total: result.data.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      })

    } catch (error) {
      console.error('Error in getAnnotations:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/assets/[id]/annotations
   * Create a new annotation for an asset
   */
  async createAnnotation(request: NextRequest, assetId: string): Promise<NextResponse<ApiResponse<any>>> {
    try {
      // Authenticate user (supports both cookie and header auth)
      const supabase = await createSupabaseApiClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' }, 
          { status: 401 }
        )
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = createAnnotationSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request data',
            details: validation.error.errors
          },
          { status: 400 }
        )
      }

      // Get asset to verify access and get organization ID
      const { data: asset } = await supabase
        .from('assets')
        .select('id, organization_id, file_name')
        .eq('id', assetId)
        .single()

      if (!asset) {
        return NextResponse.json(
          { success: false, error: 'Asset not found or access denied' },
          { status: 404 }
        )
      }

      // Create annotation without vault validation for now
      const annotationData: CreateAnnotationRequest = validation.data
      const result = await this.annotationService.createAnnotation(
        annotationData,
        assetId as AssetId,
        user.id as UserId,
        asset.organization_id as OrganizationId
        // Vault validation removed until vault_assets table is properly setup
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { annotation: result.data },
        metadata: {
          timestamp: new Date().toISOString()
        }
      }, { status: 201 })

    } catch (error) {
      console.error('Error in createAnnotation:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/assets/[id]/annotations/[annotationId]
   * Get a specific annotation with replies
   */
  async getAnnotation(request: NextRequest, assetId: string, annotationId: string): Promise<NextResponse<ApiResponse<any>>> {
    try {
      // Authenticate user
      const supabase = await createSupabaseServerClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' }, 
          { status: 401 }
        )
      }

      // Fetch annotation
      const result = await this.annotationService.getAnnotationById(annotationId as AnnotationId)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: result.error.message === 'Annotation not found' ? 404 : 500 }
        )
      }

      // Verify annotation belongs to the asset
      if (result.data.assetId !== assetId) {
        return NextResponse.json(
          { success: false, error: 'Annotation not found for this asset' },
          { status: 404 }
        )
      }

      // Check user permissions
      const canAccess = await this.annotationService.canUserAccessAnnotation(
        annotationId as AnnotationId,
        user.id as UserId
      )

      if (!canAccess) {
        return NextResponse.json(
          { success: false, error: 'Permission denied' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { annotation: result.data },
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error in getAnnotation:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  /**
   * PATCH /api/assets/[id]/annotations/[annotationId]
   * Update an annotation
   */
  async updateAnnotation(request: NextRequest, assetId: string, annotationId: string): Promise<NextResponse<ApiResponse<any>>> {
    try {
      // Authenticate user
      const supabase = await createSupabaseServerClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' }, 
          { status: 401 }
        )
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = updateAnnotationSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request data',
            details: validation.error.errors
          },
          { status: 400 }
        )
      }

      // Update annotation
      const updateData: UpdateAnnotationRequest = validation.data
      const result = await this.annotationService.updateAnnotation(
        annotationId as AnnotationId,
        updateData,
        user.id as UserId
      )

      if (!result.success) {
        const statusCode = result.error.message.includes('Permission denied') ? 403 : 400
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: statusCode }
        )
      }

      return NextResponse.json({
        success: true,
        data: { annotation: result.data },
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error in updateAnnotation:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  /**
   * DELETE /api/assets/[id]/annotations/[annotationId]
   * Delete an annotation (soft delete)
   */
  async deleteAnnotation(request: NextRequest, assetId: string, annotationId: string): Promise<NextResponse<ApiResponse<any>>> {
    try {
      // Authenticate user
      const supabase = await createSupabaseServerClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' }, 
          { status: 401 }
        )
      }

      // Delete annotation
      const result = await this.annotationService.deleteAnnotation(
        annotationId as AnnotationId,
        user.id as UserId
      )

      if (!result.success) {
        const statusCode = result.error.message.includes('Permission denied') ? 403 : 400
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: statusCode }
        )
      }

      return NextResponse.json({
        success: true,
        data: {},
        metadata: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Error in deleteAnnotation:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}