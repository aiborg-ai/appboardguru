/**
 * AI Process Optimization API
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
 * GET /api/integration-hub/ai-optimization
 * Get all process optimizations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const processType = searchParams.get('processType');
    
    const aiOpt = getAIOptimizationService();
    let optimizations = aiOpt.getAllOptimizations();
    
    // Apply filters
    if (status) {
      optimizations = optimizations.filter(opt => opt.status === status);
    }
    
    if (processType) {
      optimizations = optimizations.filter(opt => opt.processType === processType);
    }

    return NextResponse.json({
      success: true,
      data: optimizations,
    });
  } catch (error) {
    console.error('Error getting process optimizations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get process optimizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/ai-optimization
 * Start AI analysis of a process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processId, processType } = body;
    
    if (!processId || !processType) {
      return NextResponse.json(
        { success: false, error: 'Process ID and process type are required' },
        { status: 400 }
      );
    }

    const aiOpt = getAIOptimizationService();
    
    const optimizationId = await aiOpt.analyzeProcess(processId, processType);
    
    return NextResponse.json({
      success: true,
      data: { 
        optimizationId,
        status: 'analyzing',
        processId,
        processType,
      },
    });
  } catch (error) {
    console.error('Error starting process analysis:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start process analysis' },
      { status: 500 }
    );
  }
}