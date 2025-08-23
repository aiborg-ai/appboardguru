/**
 * Extension Installation API
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIMarketplaceService } from '@/lib/services/api-marketplace.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let marketplaceService: APIMarketplaceService;

function getMarketplaceService(): APIMarketplaceService {
  if (!marketplaceService) {
    const hub = new IntegrationHubService();
    marketplaceService = new APIMarketplaceService(hub);
  }
  return marketplaceService;
}

/**
 * POST /api/integration-hub/marketplace/extensions/[extensionId]/install
 * Install extension for organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { extensionId: string } }
) {
  try {
    const { extensionId } = params;
    const body = await request.json();
    const { userId, organizationId } = body;
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Organization ID are required' },
        { status: 400 }
      );
    }

    const marketplace = getMarketplaceService();
    
    // Check if extension exists
    const extension = marketplace.getExtension(extensionId);
    if (!extension) {
      return NextResponse.json(
        { success: false, error: 'Extension not found' },
        { status: 404 }
      );
    }

    // Install extension
    await marketplace.installExtension(extensionId, userId, organizationId);
    
    return NextResponse.json({
      success: true,
      data: {
        extensionId,
        extensionName: extension.name,
        organizationId,
        installedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error installing extension:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to install extension' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integration-hub/marketplace/extensions/[extensionId]/install
 * Uninstall extension from organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { extensionId: string } }
) {
  try {
    const { extensionId } = params;
    const body = await request.json();
    const { organizationId } = body;
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const marketplace = getMarketplaceService();
    
    // Uninstall extension
    await marketplace.uninstallExtension(extensionId, organizationId);
    
    return NextResponse.json({
      success: true,
      data: {
        extensionId,
        organizationId,
        uninstalledAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error uninstalling extension:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to uninstall extension' },
      { status: 500 }
    );
  }
}