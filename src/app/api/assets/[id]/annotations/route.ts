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
 * GET /api/assets/[id]/annotations
 * Retrieve all annotations for an asset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const controller = await createAnnotationController()
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
  const controller = await createAnnotationController()
  const assetId = (await params).id
  return controller.createAnnotation(request, assetId)
}