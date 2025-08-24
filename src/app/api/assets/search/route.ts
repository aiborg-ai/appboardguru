/**
 * Asset Search API Endpoint
 * Delegates to AssetsController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { AssetsController } from '@/lib/api/controllers/assets.controller';

const assetsController = new AssetsController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return assetsController.searchAssets(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return assetsController.handleOptions();
}