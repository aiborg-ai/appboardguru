import { NextRequest, NextResponse } from 'next/server'
import { AnnotationController } from '@/lib/api/controllers/annotation.controller'
import { AnnotationService } from '@/lib/services/annotation.service'
import { AnnotationRepository } from '@/lib/repositories/annotation.repository'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Create controller instance with dependency injection
async function createAnnotationController(): Promise<AnnotationController> {
  const supabase = await createSupabaseServerClient()
  const annotationRepository = new AnnotationRepository(supabase)
  const annotationService = new AnnotationService(annotationRepository)
  return new AnnotationController(annotationService)
}

/**
 * GET /api/assets/[id]/annotations/[annotationId]
 * Get a specific annotation with replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  const controller = await createAnnotationController()
  const { id: assetId, annotationId } = await params
  return controller.getAnnotation(request, assetId, annotationId)
}

/**
 * PATCH /api/assets/[id]/annotations/[annotationId]
 * Update an annotation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  const controller = await createAnnotationController()
  const { id: assetId, annotationId } = await params
  return controller.updateAnnotation(request, assetId, annotationId)
}

/**
 * DELETE /api/assets/[id]/annotations/[annotationId]
 * Delete an annotation (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  const controller = await createAnnotationController()
  const { id: assetId, annotationId } = await params
  return controller.deleteAnnotation(request, assetId, annotationId)
}