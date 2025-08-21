import { NextRequest, NextResponse } from 'next/server';
import { VaultsController } from '../../../../lib/api/controllers/vaults.controller';

const controller = new VaultsController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getVaults(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createVault(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}