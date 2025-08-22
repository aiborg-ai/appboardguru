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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentController = await getController()
  return documentController.shareAnnotation(request, { params })
}