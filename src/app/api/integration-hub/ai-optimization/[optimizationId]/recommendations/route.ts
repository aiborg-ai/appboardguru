/**
 * AI Optimization Recommendations API
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIProcessOptimizationService } from '@/lib/services/ai-process-optimization.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let aiOptimizationService: AIProcessOptimizationService;

function getAIOptimizationService(): AIProcessOptimizationService {
  if (!aiOptimizationService) {
    const hub = new IntegrationHubService();
    aiOptimizationService = new AIProcessOptimizationService(hub);
  }
  return aiOptimizationService;
}

/**
 * GET /api/integration-hub/ai-optimization/[optimizationId]/recommendations
 * Get optimization recommendations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { optimizationId: string } }
) {
  try {
    const { optimizationId } = params;
    
    const aiOpt = getAIOptimizationService();
    
    // Check if optimization exists
    const optimization = aiOpt.getOptimization(optimizationId);
    if (!optimization) {
      return NextResponse.json(
        { success: false, error: 'Optimization not found' },
        { status: 404 }
      );
    }

    // Get recommendations
    const recommendations = await aiOpt.getOptimizationRecommendations(optimizationId);
    
    return NextResponse.json({
      success: true,
      data: {
        optimizationId,
        status: optimization.status,
        processId: optimization.processId,
        processType: optimization.processType,
        recommendations,
        predictedImpact: optimization.predictedImpact,
      },
    });
  } catch (error) {
    console.error('Error getting optimization recommendations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/ai-optimization/[optimizationId]/recommendations
 * Implement a specific recommendation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { optimizationId: string } }
) {
  try {
    const { optimizationId } = params;
    const body = await request.json();
    const { recommendationId, implementationOptions = {} } = body;
    
    if (!recommendationId) {
      return NextResponse.json(
        { success: false, error: 'Recommendation ID is required' },
        { status: 400 }
      );
    }

    const aiOpt = getAIOptimizationService();
    
    // Check if optimization exists
    const optimization = aiOpt.getOptimization(optimizationId);
    if (!optimization) {
      return NextResponse.json(
        { success: false, error: 'Optimization not found' },
        { status: 404 }
      );
    }

    // Implement recommendation
    await aiOpt.implementRecommendation(optimizationId, recommendationId);
    
    return NextResponse.json({
      success: true,
      data: {
        optimizationId,
        recommendationId,
        status: 'implementing',
        message: 'Recommendation implementation started',
        implementedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error implementing recommendation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to implement recommendation' },
      { status: 500 }
    );
  }
}