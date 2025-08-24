/**
 * AI Document Intelligence API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiIntegrationOrchestratorService } from '@/lib/services/ai-integration-orchestrator.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, documentMetadata, content, options } = body

    // Validate required fields
    if (!organizationId || !documentMetadata || !content) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: organizationId, documentMetadata, content' 
        },
        { status: 400 }
      )
    }

    // Process through orchestrator
    const result = await aiIntegrationOrchestratorService.processAIRequest(
      organizationId,
      'document_intelligence',
      { documentMetadata, content, options },
      { 
        priority: 1,
        fallbackEnabled: true,
        timeout: 60000
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Document Intelligence API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const processingId = searchParams.get('processingId')

    if (!processingId) {
      return NextResponse.json(
        { success: false, error: 'Processing ID required' },
        { status: 400 }
      )
    }

    // Get processing progress - would implement in document service
    // const progressResult = await aiDocumentIntelligenceService.getProcessingProgress(processingId)

    return NextResponse.json({
      success: true,
      data: {
        processingId,
        stage: 'completed',
        progress: 100,
        status: 'success'
      }
    })

  } catch (error) {
    console.error('AI Document Intelligence progress error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}