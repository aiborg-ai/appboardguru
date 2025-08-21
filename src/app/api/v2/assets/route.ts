import { NextRequest, NextResponse } from 'next/server';
import { AssetsController } from '../../../../lib/api/controllers/assets.controller';

const controller = new AssetsController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'search':
      return controller.searchAssets(request);
    default:
      return controller.getAssets(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'upload':
      return controller.uploadAsset(request);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: upload' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}