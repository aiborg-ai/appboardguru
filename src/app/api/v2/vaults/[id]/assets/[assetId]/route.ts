import { NextRequest, NextResponse } from 'next/server';
import { VaultsController } from '../../../../../../../lib/api/controllers/vaults.controller';

const controller = new VaultsController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string; assetId: string } }
): Promise<NextResponse> {
  return controller.getVaultAsset(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string; assetId: string } }
): Promise<NextResponse> {
  return controller.updateVaultAsset(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string; assetId: string } }
): Promise<NextResponse> {
  return controller.removeAssetFromVault(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}