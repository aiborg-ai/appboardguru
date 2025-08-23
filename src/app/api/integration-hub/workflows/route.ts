/**
 * Workflow Automation API
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
 * GET /api/integration-hub/workflows
 * Get all workflow rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const category = searchParams.get('category');
    
    const workflow = getWorkflowService();
    let rules = workflow.getAllRules();
    
    // Apply filters
    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      rules = rules.filter(rule => rule.enabled === isEnabled);
    }
    
    if (category) {
      rules = rules.filter(rule => rule.trigger.type === category);
    }

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Error getting workflow rules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get workflow rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/workflows
 * Create new workflow rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workflow = getWorkflowService();
    
    const ruleId = await workflow.createRule(body);
    
    return NextResponse.json({
      success: true,
      data: { ruleId },
    });
  } catch (error) {
    console.error('Error creating workflow rule:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create workflow rule' },
      { status: 500 }
    );
  }
}