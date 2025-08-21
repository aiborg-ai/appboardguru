import { NextRequest, NextResponse } from 'next/server';
import { AssetsController } from '../../../../../lib/api/controllers/assets.controller';

const controller = new AssetsController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'download':
      return controller.downloadAsset(request, context);
    case 'collaborators':
      return controller.getCollaborators(request, context);
    case 'annotations':
      return controller.getAnnotations(request, context);
    default:
      return controller.getAsset(request, context);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateAsset(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.deleteAsset(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'share':
      return controller.shareAsset(request, context);
    case 'collaborator':
      return controller.addCollaborator(request, context);
    case 'annotation':
      return controller.createAnnotation(request, context);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: share, collaborator, annotation' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}