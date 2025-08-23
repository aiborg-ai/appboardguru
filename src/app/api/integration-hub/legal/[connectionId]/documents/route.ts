/**
 * Legal Document Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalIntegrationService } from '@/lib/services/legal-integration.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let legalService: LegalIntegrationService;

function getLegalService(): LegalIntegrationService {
  if (!legalService) {
    const hub = new IntegrationHubService();
    legalService = new LegalIntegrationService(hub);
  }
  return legalService;
}

/**
 * GET /api/integration-hub/legal/[connectionId]/documents
 * Get legal documents from connected system
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const legal = getLegalService();
    
    // Check if connection exists
    const connection = legal.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Legal connection not found' },
        { status: 404 }
      );
    }

    // Sync documents from legal system
    const documents = await legal.syncLegalDocuments(connectionId);
    
    // Apply pagination
    const paginatedDocuments = documents.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        documents: paginatedDocuments,
        pagination: {
          total: documents.length,
          limit,
          offset,
          hasMore: offset + limit < documents.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting legal documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get legal documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/legal/[connectionId]/documents
 * Create new document in legal system
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const body = await request.json();
    const { document, recipients } = body;
    
    const legal = getLegalService();
    
    // Check if connection exists
    const connection = legal.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Legal connection not found' },
        { status: 404 }
      );
    }

    // Create document in legal system
    const documentId = await legal.createDocument(connectionId, document, recipients);
    
    return NextResponse.json({
      success: true,
      data: { documentId },
    });
  } catch (error) {
    console.error('Error creating legal document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create legal document' },
      { status: 500 }
    );
  }
}