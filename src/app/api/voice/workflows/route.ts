/**
 * Voice Workflow Automation API Endpoint
 * Handles voice-triggered workflows and approval processes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  SupabaseClient,
  VoiceWorkflowTrigger,
  WorkflowTriggerCondition,
  WorkflowAction,
  TriggerWorkflowRequest,
  WorkflowTriggerResponse,
  WorkflowUsageStats,
  WorkflowExecution,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowDeleteRequest,
  WorkflowListRequest,
  WorkflowGetRequest,
  ActionExecuteRequest,
  ExecutionHistoryRequest,
  ExecutionConfirmRequest,
  ExecutionCancelRequest,
  ActionResult
} from '@/types/voice';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory workflow execution cache
const activeWorkflows = new Map<string, WorkflowExecution>();
const executionHistory = new Map<string, WorkflowExecution[]>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('Voice Workflows API called with action:', action);

    switch (action) {
      case 'trigger_workflow':
        return await triggerWorkflow(params as TriggerWorkflowRequest);
      
      case 'create_workflow':
        return await createWorkflow(params);
      
      case 'update_workflow':
        return await updateWorkflow(params);
      
      case 'delete_workflow':
        return await deleteWorkflow(params);
      
      case 'get_workflows':
        return await getWorkflows(params);
      
      case 'get_workflow':
        return await getWorkflow(params);
      
      case 'execute_action':
        return await executeAction(params);
      
      case 'get_execution_history':
        return await getExecutionHistory(params);
      
      case 'confirm_workflow':
        return await confirmWorkflowExecution(params);
      
      case 'cancel_workflow':
        return await cancelWorkflowExecution(params);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Voice workflows API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function triggerWorkflow(params: TriggerWorkflowRequest): Promise<NextResponse> {
  try {
    const { phrase, context, parameters = {}, confidence = 0.8 } = params;
    const userId = 'default-user'; // TODO: Get from authenticated session
    const organizationId = 'default-org'; // TODO: Get from user's organization

    console.log('Triggering workflow with phrase:', phrase);

    // Get all active workflows for the organization
    const { data: workflows, error } = await supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const matchedWorkflows: VoiceWorkflowTrigger[] = [];
    const triggeredActions: WorkflowAction[] = [];

    // Check each workflow for matches
    for (const workflowData of workflows || []) {
      const workflow = workflowData as VoiceWorkflowTrigger;
      const isMatch = await checkWorkflowMatch(
        phrase, 
        workflow.trigger, 
        context, 
        userId, 
        confidence
      );

      if (isMatch.matches && isMatch.confidence >= workflow.trigger.confidence) {
        matchedWorkflows.push(workflow);
        
        // Check if user has permission to trigger this workflow
        if (hasPermissionToTrigger(userId, workflow.permissions)) {
          // Add workflow actions to be executed
          triggeredActions.push(...workflow.actions);
          
          // Update usage stats
          await updateWorkflowUsage(workflow.id);
          
          console.log(`Workflow triggered: ${workflow.name} (confidence: ${isMatch.confidence})`);
        } else {
          console.log(`Permission denied for workflow: ${workflow.name}`);
        }
      }
    }

    // Determine if confirmation is required
    const requiresConfirmation = matchedWorkflows.some(w => w.permissions.requiresApproval) ||
                                triggeredActions.some(a => a.timeout && a.timeout > 0);

    let executionId: string | null = null;

    if (matchedWorkflows.length > 0) {
      // Create execution record
      executionId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const execution = {
        id: executionId,
        userId,
        organizationId,
        triggerPhrase: phrase,
        matchedWorkflows: matchedWorkflows.map(w => w.id),
        actions: triggeredActions,
        status: requiresConfirmation ? 'pending_confirmation' : 'executing',
        createdAt: new Date().toISOString(),
        context,
        parameters
      };

      activeWorkflows.set(executionId, execution as any);

      // Store in database for persistence
      await supabase
        .from('workflow_executions')
        .insert({
          id: executionId,
          user_id: userId,
          organization_id: organizationId,
          trigger_phrase: phrase,
          matched_workflows: matchedWorkflows.map(w => w.id),
          actions: triggeredActions,
          status: execution.status,
          created_at: execution.createdAt,
          context,
          parameters
        });

      // If no confirmation required, execute immediately
      if (!requiresConfirmation) {
        await executeWorkflowActions(executionId, triggeredActions, parameters);
      }
    }

    const response: WorkflowTriggerResponse = {
      success: true,
      triggered: matchedWorkflows.length > 0,
      workflows: matchedWorkflows,
      actions: triggeredActions,
      confirmationRequired: requiresConfirmation
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Trigger workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger workflow' },
      { status: 500 }
    );
  }
}

async function createWorkflow(params: WorkflowCreateRequest): Promise<NextResponse> {
  try {
    const {
      name,
      description,
      trigger,
      actions,
      permissions = {},
      enabled = true
    } = params;
    
    const userId = params.userId || 'default-user';
    const organizationId = params.organizationId || 'default-org';

    const workflowId = `vw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const workflow: VoiceWorkflowTrigger = {
      id: workflowId,
      organizationId,
      name,
      description,
      trigger: {
        phrases: Array.isArray(trigger.phrases) ? trigger.phrases : [trigger.phrases],
        context: trigger.context || [],
        roles: trigger.roles || [],
        confidence: trigger.confidence || 0.8,
        requireExactMatch: trigger.requireExactMatch || false,
        caseSensitive: trigger.caseSensitive || false
      },
      actions: actions.map((action: any) => ({
        type: action.type,
        target: action.target,
        parameters: action.parameters || {},
        condition: action.condition,
        timeout: action.timeout,
        retryCount: action.retryCount || 0,
        fallbackAction: action.fallbackAction
      })),
      enabled,
      permissions: {
        canTrigger: permissions.canTrigger || [userId],
        canModify: permissions.canModify || [userId],
        canView: permissions.canView || [userId],
        requiresApproval: permissions.requiresApproval || false,
        approvers: permissions.approvers || []
      },
      usage: {
        totalTriggers: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
      createdBy: userId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Store in database
    const { error } = await supabase
      .from('voice_workflow_triggers')
      .insert({
        id: workflowId,
        organization_id: organizationId,
        name,
        description,
        trigger: workflow.trigger,
        actions: workflow.actions,
        enabled,
        permissions: workflow.permissions,
        usage: workflow.usage,
        created_by: userId,
        created_at: workflow.createdAt,
        last_modified: workflow.lastModified
      });

    if (error) {
      throw error;
    }

    console.log('Workflow created:', workflowId);

    return NextResponse.json({
      success: true,
      workflow
    });

  } catch (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}

async function updateWorkflow(params: WorkflowUpdateRequest): Promise<NextResponse> {
  try {
    const { workflowId, updates } = params;
    const userId = params.userId || 'default-user';

    // Check permissions
    const { data: workflow } = await supabase
      .from('voice_workflow_triggers')
      .select('permissions')
      .eq('id', workflowId)
      .single();

    if (!workflow || !workflow.permissions.canModify.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('voice_workflow_triggers')
      .update({
        ...updates,
        last_modified: new Date().toISOString()
      })
      .eq('id', workflowId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

async function deleteWorkflow(params: WorkflowDeleteRequest): Promise<NextResponse> {
  try {
    const { workflowId } = params;
    const userId = params.userId || 'default-user';

    // Check permissions
    const { data: workflow } = await supabase
      .from('voice_workflow_triggers')
      .select('permissions, created_by')
      .eq('id', workflowId)
      .single();

    if (!workflow || 
        (!workflow.permissions.canModify.includes(userId) && workflow.created_by !== userId)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Soft delete by disabling
    const { error } = await supabase
      .from('voice_workflow_triggers')
      .update({ 
        enabled: false, 
        last_modified: new Date().toISOString() 
      })
      .eq('id', workflowId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}

async function getWorkflows(params: WorkflowListRequest): Promise<NextResponse> {
  try {
    const { organizationId, enabled, limit = 50, offset = 0 } = params;
    const userId = params.userId || 'default-user';

    let query = supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (enabled !== undefined) {
      query = query.eq('enabled', enabled);
    }

    const { data: workflows, error } = await query;

    if (error) {
      throw error;
    }

    // Filter workflows user has permission to view
    const viewableWorkflows = (workflows || []).filter((workflow: VoiceWorkflowTrigger) =>
      workflow.permissions.canView.includes(userId) || 
      workflow.createdBy === userId
    );

    return NextResponse.json({
      success: true,
      workflows: viewableWorkflows,
      totalCount: viewableWorkflows.length
    });

  } catch (error) {
    console.error('Get workflows error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve workflows' },
      { status: 500 }
    );
  }
}

async function getWorkflow(params: WorkflowGetRequest): Promise<NextResponse> {
  try {
    const { workflowId } = params;
    const userId = params.userId || 'default-user';

    const { data: workflow, error } = await supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      throw error;
    }

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check view permission
    if (!workflow.permissions.canView.includes(userId) && workflow.created_by !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow
    });

  } catch (error) {
    console.error('Get workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve workflow' },
      { status: 500 }
    );
  }
}

async function executeAction(params: ActionExecuteRequest): Promise<NextResponse> {
  try {
    const { executionId, actionIndex } = params;

    const execution = activeWorkflows.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    const action = execution.actions[actionIndex];
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action not found' },
        { status: 404 }
      );
    }

    const result = await executeWorkflowAction(action, execution.parameters || {});

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Execute action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}

async function getExecutionHistory(params: ExecutionHistoryRequest): Promise<NextResponse> {
  try {
    const { organizationId, userId, limit = 50, offset = 0 } = params;

    let query = supabase
      .from('workflow_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: executions, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      executions: executions || [],
      totalCount: (executions || []).length
    });

  } catch (error) {
    console.error('Get execution history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve execution history' },
      { status: 500 }
    );
  }
}

async function confirmWorkflowExecution(params: ExecutionConfirmRequest): Promise<NextResponse> {
  try {
    const { executionId } = params;
    const userId = params.userId || 'default-user';

    const execution = activeWorkflows.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    if (execution.status !== 'pending_confirmation') {
      return NextResponse.json(
        { success: false, error: 'Execution not pending confirmation' },
        { status: 400 }
      );
    }

    // Update status and execute
    execution.status = 'executing';
    execution.confirmedBy = userId;
    execution.confirmedAt = new Date().toISOString();

    await executeWorkflowActions(executionId, execution.actions, execution.parameters || {});

    // Update database
    await supabase
      .from('workflow_executions')
      .update({
        status: 'executing',
        confirmed_by: userId,
        confirmed_at: execution.confirmedAt
      })
      .eq('id', executionId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Confirm workflow execution error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm workflow execution' },
      { status: 500 }
    );
  }
}

async function cancelWorkflowExecution(params: ExecutionCancelRequest): Promise<NextResponse> {
  try {
    const { executionId } = params;
    const userId = params.userId || 'default-user';

    const execution = activeWorkflows.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update status
    execution.status = 'cancelled';
    execution.cancelledBy = userId;
    execution.cancelledAt = new Date().toISOString();

    // Update database
    await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        cancelled_by: userId,
        cancelled_at: execution.cancelledAt
      })
      .eq('id', executionId);

    // Remove from active workflows
    activeWorkflows.delete(executionId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Cancel workflow execution error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel workflow execution' },
      { status: 500 }
    );
  }
}

// Helper functions

async function checkWorkflowMatch(
  phrase: string,
  trigger: WorkflowTriggerCondition,
  context?: string,
  userId?: string,
  inputConfidence: number = 0.8
): Promise<{ matches: boolean; confidence: number }> {
  const lowerPhrase = phrase.toLowerCase();
  
  for (const triggerPhrase of trigger.phrases) {
    const lowerTriggerPhrase = trigger.caseSensitive ? triggerPhrase : triggerPhrase.toLowerCase();
    
    let matches = false;
    let confidence = 0;
    
    if (trigger.requireExactMatch) {
      matches = lowerPhrase === lowerTriggerPhrase;
      confidence = matches ? 1.0 : 0;
    } else {
      // Fuzzy matching
      if (lowerPhrase.includes(lowerTriggerPhrase) || lowerTriggerPhrase.includes(lowerPhrase)) {
        matches = true;
        confidence = calculateSimilarity(lowerPhrase, lowerTriggerPhrase);
      }
    }
    
    if (matches) {
      // Check context requirements
      if (trigger.context && trigger.context.length > 0 && context) {
        const contextMatch = trigger.context.some(ctx => 
          context.toLowerCase().includes(ctx.toLowerCase())
        );
        if (!contextMatch) {
          continue;
        }
      }
      
      // Check role requirements
      if (trigger.roles && trigger.roles.length > 0 && userId) {
        const userRole = await getUserRole(userId);
        if (!trigger.roles.includes(userRole)) {
          continue;
        }
      }
      
      return { matches: true, confidence: Math.min(confidence, inputConfidence) };
    }
  }
  
  return { matches: false, confidence: 0 };
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    if (matrix[0]) {
      matrix[0][j] = j;
    }
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        const prevValue = matrix[i - 1]?.[j - 1] ?? 0;
        const row = matrix[i];
        if (row) {
          row[j] = prevValue;
        }
      } else {
        const diag = matrix[i - 1]?.[j - 1] ?? 0;
        const left = matrix[i]?.[j - 1] ?? 0;
        const up = matrix[i - 1]?.[j] ?? 0;
        if (matrix[i]) {
          matrix[i]![j] = Math.min(
            diag + 1,
            left + 1,
            up + 1
          );
        }
      }
    }
  }
  
  return matrix[str2.length]?.[str1.length] ?? 0;
}

function hasPermissionToTrigger(userId: string, permissions: { canTrigger: string[] }): boolean {
  return permissions.canTrigger.includes(userId) || 
         permissions.canTrigger.includes('*'); // Allow all
}

async function getUserRole(userId: string): Promise<string> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    return user?.role || 'user';
  } catch {
    return 'user';
  }
}

async function updateWorkflowUsage(workflowId: string): Promise<void> {
  try {
    // Get current usage stats
    const { data: workflow } = await supabase
      .from('voice_workflow_triggers')
      .select('usage')
      .eq('id', workflowId)
      .single();
    
    if (workflow) {
      const usage = workflow.usage || {
        totalTriggers: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      };
      
      usage.totalTriggers += 1;
      
      await supabase
        .from('voice_workflow_triggers')
        .update({ 
          usage,
          last_modified: new Date().toISOString()
        })
        .eq('id', workflowId);
    }
  } catch (error) {
    console.error('Failed to update workflow usage:', error);
  }
}

async function executeWorkflowActions(
  executionId: string,
  actions: WorkflowAction[],
  parameters: Record<string, unknown>
): Promise<void> {
  const execution = activeWorkflows.get(executionId);
  if (!execution) return;
  
  const startTime = Date.now();
  const results = [];
  
  try {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      if (!action) continue;
      
      // Check condition if specified
      if (action.condition && !evaluateCondition(action.condition, parameters)) {
        continue;
      }
      
      const result = await executeWorkflowAction(action, parameters);
      results.push({ actionIndex: i, result, success: result.success });
      
      if (!result.success && action.retryCount && action.retryCount > 0) {
        // Implement retry logic
        for (let retry = 0; retry < action.retryCount; retry++) {
          const retryResult = await executeWorkflowAction(action, parameters);
          if (retryResult.success) {
            results[results.length - 1] = { actionIndex: i, result: retryResult, success: true };
            break;
          }
        }
      }
      
      // If action failed and has fallback, execute fallback
      if (!result.success && action.fallbackAction) {
        await executeWorkflowAction(action.fallbackAction, parameters);
      }
    }
    
    const executionTime = Date.now() - startTime;
    const successful = results.every(r => r.success);
    
    execution.status = successful ? 'completed' : 'failed';
    execution.completedAt = new Date().toISOString();
    execution.executionTime = executionTime;
    execution.results = results;
    
    // Update database
    await supabase
      .from('workflow_executions')
      .update({
        status: execution.status,
        completed_at: execution.completedAt,
        execution_time: executionTime,
        results
      })
      .eq('id', executionId);
    
    // Update workflow usage stats
    for (const workflowId of execution.matchedWorkflows) {
      await updateWorkflowExecutionStats(workflowId, successful, executionTime);
    }
    
    console.log(`Workflow execution ${executionId} ${execution.status} in ${executionTime}ms`);
    
  } catch (error) {
    console.error('Workflow execution error:', error);
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: execution.error
      })
      .eq('id', executionId);
  } finally {
    // Clean up active workflow after some time
    setTimeout(() => {
      activeWorkflows.delete(executionId);
    }, 300000); // 5 minutes
  }
}

async function executeWorkflowAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  console.log('Executing workflow action:', action.type, action.target);
  
  try {
    switch (action.type) {
      case 'approval':
        return await executeApprovalAction(action, parameters);
      
      case 'notification':
        return await executeNotificationAction(action, parameters);
      
      case 'document_action':
        return await executeDocumentAction(action, parameters);
      
      case 'meeting_action':
        return await executeMeetingAction(action, parameters);
      
      case 'api_call':
        return await executeApiCall(action, parameters);
      
      case 'navigation':
        return await executeNavigationAction(action, parameters);
      
      default:
        return { success: false, error: `Unsupported action type: ${action.type}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Action execution failed' 
    };
  }
}

async function executeApprovalAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Trigger approval workflow
  const { target, parameters: actionParams } = action;
  
  // This would integrate with the existing approval system
  console.log('Triggering approval for:', target, actionParams);
  
  return { success: true, message: 'Approval triggered', target };
}

async function executeNotificationAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Send notification
  const { target, parameters: actionParams } = action;
  
  // This would send notifications via the notification system
  console.log('Sending notification to:', target, actionParams);
  
  return { success: true, message: 'Notification sent', target };
}

async function executeDocumentAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Perform document action
  const { target, parameters: actionParams } = action;
  
  console.log('Executing document action on:', target, actionParams);
  
  return { success: true, message: 'Document action executed', target };
}

async function executeMeetingAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Perform meeting action
  const { target, parameters: actionParams } = action;
  
  console.log('Executing meeting action:', target, actionParams);
  
  return { success: true, message: 'Meeting action executed', target };
}

async function executeApiCall(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Make API call
  const { target, parameters: actionParams } = action;
  
  try {
    const response = await fetch(target, {
      method: (actionParams as any).method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(actionParams as any).headers
      },
      body: JSON.stringify({ ...(actionParams as any).body, ...parameters })
    });
    
    const result = await response.json();
    
    return { 
      success: response.ok, 
      data: result,
      status: response.status
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'API call failed' 
    };
  }
}

async function executeNavigationAction(action: WorkflowAction, parameters: Record<string, unknown>): Promise<ActionResult> {
  // Trigger navigation (this would be handled client-side)
  const { target, parameters: actionParams } = action;
  
  console.log('Navigation action:', target, actionParams);
  
  return { 
    success: true, 
    message: 'Navigation triggered',
    navigationTarget: target,
    parameters: actionParams
  };
}

function evaluateCondition(condition: { field: string; operator: string; value: unknown }, parameters: Record<string, unknown>): boolean {
  const { field, operator, value } = condition;
  const fieldValue = parameters[field];
  
  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    default:
      return false;
  }
}

async function updateWorkflowExecutionStats(
  workflowId: string, 
  successful: boolean, 
  executionTime: number
): Promise<void> {
  try {
    const { data: workflow } = await supabase
      .from('voice_workflow_triggers')
      .select('usage')
      .eq('id', workflowId)
      .single();
    
    if (workflow) {
      const usage = workflow.usage || {
        totalTriggers: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      };
      
      if (successful) {
        usage.successfulExecutions += 1;
      } else {
        usage.failedExecutions += 1;
      }
      
      // Update average execution time
      const totalExecutions = usage.successfulExecutions + usage.failedExecutions;
      usage.averageExecutionTime = 
        (usage.averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
      
      await supabase
        .from('voice_workflow_triggers')
        .update({ usage })
        .eq('id', workflowId);
    }
  } catch (error) {
    console.error('Failed to update execution stats:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      activeWorkflows: activeWorkflows.size,
      services: {
        database: true,
        execution: true
      }
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid GET action' },
    { status: 400 }
  );
}