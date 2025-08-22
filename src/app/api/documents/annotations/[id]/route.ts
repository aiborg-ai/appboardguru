import { NextRequest, NextResponse } from 'next/server'
import { createDocumentController } from '@/lib/controllers/document.controller'

// Initialize controller
let controller: any = null

async function getController() {
  if (!controller) {
    controller = await createDocumentController()
  }
  return controller
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentController = await getController()
  return documentController.updateAnnotation(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentController = await getController()
  return documentController.deleteAnnotation(request, { params })
}