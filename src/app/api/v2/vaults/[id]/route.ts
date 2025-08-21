import { NextRequest, NextResponse } from 'next/server';
import { VaultsController } from '../../../../../lib/api/controllers/vaults.controller';

const controller = new VaultsController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'assets':
      return controller.getVaultAssets(request, context);
    case 'invitations':
      return controller.getVaultInvitations(request, context);
    case 'analytics':
      return controller.getVaultAnalytics(request, context);
    default:
      return controller.getVault(request, context);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateVault(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.deleteVault(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'asset':
      return controller.addAssetToVault(request, context);
    case 'invite':
      return controller.inviteToVault(request, context);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: asset, invite' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}