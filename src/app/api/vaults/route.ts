/**
 * Vaults API Endpoint
 * Delegates to VaultsController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { VaultsController } from '@/lib/api/controllers/vaults.controller';

const vaultsController = new VaultsController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return vaultsController.getVaults(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return vaultsController.createVault(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return vaultsController.handleOptions();
}