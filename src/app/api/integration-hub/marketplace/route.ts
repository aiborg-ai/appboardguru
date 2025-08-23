/**
 * API Marketplace API
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
 * GET /api/integration-hub/marketplace
 * Search and browse marketplace extensions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const pricing = searchParams.get('pricing') || undefined;
    const rating = searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : undefined;
    const publisher = searchParams.get('publisher') || undefined;
    const featured = searchParams.get('featured') === 'true';
    const trending = searchParams.get('trending') === 'true';
    
    const marketplace = getMarketplaceService();
    
    let extensions;
    
    if (featured) {
      extensions = await marketplace.getFeaturedExtensions();
    } else if (trending) {
      extensions = await marketplace.getTrendingExtensions();
    } else {
      // Search with filters
      extensions = await marketplace.searchExtensions(query, {
        category,
        pricing,
        rating,
        publisher,
      });
    }
    
    // Get categories for UI
    const categories = marketplace.getCategories();
    const curation = marketplace.getCuration();

    return NextResponse.json({
      success: true,
      data: {
        extensions,
        categories,
        curation,
        filters: {
          query,
          category,
          pricing,
          rating,
          publisher,
        },
      },
    });
  } catch (error) {
    console.error('Error searching marketplace:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search marketplace' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/marketplace
 * Publish new extension to marketplace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { developerId, extension } = body;
    
    if (!developerId) {
      return NextResponse.json(
        { success: false, error: 'Developer ID is required' },
        { status: 400 }
      );
    }
    
    const marketplace = getMarketplaceService();
    
    const extensionId = await marketplace.publishExtension(developerId, extension);
    
    return NextResponse.json({
      success: true,
      data: { extensionId },
    });
  } catch (error) {
    console.error('Error publishing extension:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish extension' },
      { status: 500 }
    );
  }
}