/**
 * Document Annotations API Endpoint
 * Delegates to DocumentController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentController } from '@/lib/api/controllers/document.controller';

const documentController = new DocumentController();

export async function GET(
  request: NextRequest,
  context: { params: { assetId: string } }
): Promise<NextResponse> {
  return documentController.getAnnotations(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { assetId: string } }
): Promise<NextResponse> {
  return documentController.createAnnotation(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return documentController.handleOptions();
}