import { NextRequest, NextResponse } from 'next/server'
import { AnnotationController } from '@/lib/api/controllers/annotation.controller'
import { AnnotationService } from '@/lib/services/annotation.service'
import { AnnotationRepository } from '@/lib/repositories/annotation.repository'
import { createSupabaseApiClient } from '@/lib/supabase-api-auth'

// Create controller instance with dependency injection
async function createAnnotationController(request: NextRequest): Promise<AnnotationController> {
  const supabase = await createSupabaseApiClient(request)
  const annotationRepository = new AnnotationRepository(supabase)
  const annotationService = new AnnotationService(annotationRepository)
  return new AnnotationController(annotationService)
}

/**
 * GET /api/assets/[id]/annotations
 * Retrieve all annotations for an asset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const controller = await createAnnotationController(request)
  const assetId = (await params).id
  return controller.getAnnotations(request, assetId)
}

/**
 * POST /api/assets/[id]/annotations
 * Create a new annotation for an asset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const controller = await createAnnotationController(request)
  const assetId = (await params).id
  return controller.createAnnotation(request, assetId)
}