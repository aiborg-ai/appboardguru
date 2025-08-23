/**
 * Workflow Execution API
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowAutomationService } from '@/lib/services/workflow-automation.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let workflowService: WorkflowAutomationService;

function getWorkflowService(): WorkflowAutomationService {
  if (!workflowService) {
    const hub = new IntegrationHubService();
    workflowService = new WorkflowAutomationService(hub);
  }
  return workflowService;
}

/**
 * POST /api/integration-hub/workflows/[ruleId]/execute
 * Execute workflow rule manually
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const { ruleId } = params;
    const body = await request.json();
    const { context = {}, async = true } = body;
    
    const workflow = getWorkflowService();
    
    // Check if rule exists
    const rule = workflow.getRule(ruleId);
    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Workflow rule not found' },
        { status: 404 }
      );
    }

    if (!rule.enabled) {
      return NextResponse.json(
        { success: false, error: 'Workflow rule is disabled' },
        { status: 400 }
      );
    }

    // Execute workflow
    const executionId = await workflow.executeRule(ruleId, context);
    
    if (async) {
      // Return execution ID for async processing
      return NextResponse.json({
        success: true,
        data: { 
          executionId,
          status: 'started',
          message: 'Workflow execution started'
        },
      });
    } else {
      // Wait for completion (with timeout)
      const execution = workflow.getExecution(executionId);
      if (execution) {
        // Poll for completion (simplified - in production use WebSockets)
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        while (execution.status === 'PENDING' || execution.status === 'RUNNING') {
          if (attempts >= maxAttempts) {
            return NextResponse.json({
              success: true,
              data: {
                executionId,
                status: 'timeout',
                message: 'Workflow execution timed out, but continues in background'
              },
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        return NextResponse.json({
          success: true,
          data: {
            executionId,
            status: execution.status,
            result: execution,
          },
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: { executionId },
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integration-hub/workflows/[ruleId]/execute
 * Get execution history for workflow rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const { ruleId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const workflow = getWorkflowService();
    
    // Check if rule exists
    const rule = workflow.getRule(ruleId);
    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Workflow rule not found' },
        { status: 404 }
      );
    }

    // Get execution history
    const executions = workflow.getExecutionHistory(ruleId, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        ruleId,
        ruleName: rule.name,
        executions,
        totalExecutions: rule.executionCount,
      },
    });
  } catch (error) {
    console.error('Error getting execution history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get execution history' },
      { status: 500 }
    );
  }
}