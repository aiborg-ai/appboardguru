// Agent System API Routes

import { NextRequest, NextResponse } from 'next/server';
import { AgentCoordinator, WorkflowTemplates } from '@/lib/agents/coordinator';
import { AgentRegistry } from '@/lib/agents/registry';
import { AgentFactory } from '@/lib/agents/factory';

// Initialize the agent system
const coordinator = AgentCoordinator.getInstance();
const registry = AgentRegistry.getInstance();

// Initialize agents on server start
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await coordinator.initialize();
    initialized = true;
  }
}

export async function GET(request: NextRequest) {
  await ensureInitialized();
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const agentId = searchParams.get('agentId');
  
  try {
    switch (action) {
      case 'status':
        if (agentId) {
          const status = coordinator.getAgentStatus(agentId as any);
          return NextResponse.json({ agentId, status });
        } else {
          const statuses = coordinator.getAllAgentStatuses();
          return NextResponse.json(Array.from(statuses.entries()).map(([id, status]) => ({
            agentId: id,
            status
          })));
        }
      
      case 'metrics':
        if (agentId) {
          const metrics = coordinator.getAgentMetrics(agentId as any);
          return NextResponse.json({ agentId, metrics });
        } else {
          const allMetrics = coordinator.getAllAgentMetrics();
          return NextResponse.json(Array.from(allMetrics.entries()).map(([id, metrics]) => ({
            agentId: id,
            metrics
          })));
        }
      
      case 'tasks':
        const tasks = coordinator.getTaskQueue(agentId as any);
        return NextResponse.json({ tasks });
      
      case 'workflows':
        const workflows = coordinator.getActiveWorkflows();
        return NextResponse.json({ workflows });
      
      case 'agents':
        const configs = registry.getAllConfigs();
        return NextResponse.json({ 
          agents: configs.map(config => ({
            id: config.id,
            name: config.name,
            category: config.category,
            owner: config.owner,
            responsibilities: config.responsibilities,
            status: coordinator.getAgentStatus(config.id)
          }))
        });
      
      case 'history':
        const limit = parseInt(searchParams.get('limit') || '100');
        const history = registry.getMessageHistory(limit);
        return NextResponse.json({ history });
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Valid actions: status, metrics, tasks, workflows, agents, history' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureInitialized();
  
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'task':
        const { description, priority, targetAgent, metadata } = body;
        
        if (!description) {
          return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
        }
        
        const taskId = await coordinator.submitTask({
          description,
          priority,
          targetAgent,
          metadata
        });
        
        return NextResponse.json({ 
          success: true, 
          taskId,
          message: `Task submitted: ${taskId}` 
        });
      
      case 'workflow':
        const { type, parameter } = body;
        
        let workflowRequest;
        switch (type) {
          case 'feature':
            workflowRequest = WorkflowTemplates.featureDevelopment(parameter);
            break;
          case 'bugfix':
            workflowRequest = WorkflowTemplates.bugFix(parameter);
            break;
          case 'performance':
            workflowRequest = WorkflowTemplates.performanceOptimization(parameter);
            break;
          default:
            if (body.workflow) {
              workflowRequest = body.workflow;
            } else {
              return NextResponse.json({ 
                error: 'Invalid workflow type or missing workflow definition' 
              }, { status: 400 });
            }
        }
        
        const workflowId = await coordinator.createWorkflow(workflowRequest);
        
        return NextResponse.json({ 
          success: true, 
          workflowId,
          message: `Workflow created: ${workflowId}` 
        });
      
      case 'command':
        const { command } = body;
        
        if (!command) {
          return NextResponse.json({ error: 'Command is required' }, { status: 400 });
        }
        
        const result = await coordinator.executeCommand(command);
        
        return NextResponse.json({ 
          success: true, 
          result 
        });
      
      case 'handoff':
        const { from, to, task, context, priority } = body;
        
        if (!from || !to || !task) {
          return NextResponse.json({ 
            error: 'Handoff requires from, to, and task parameters' 
          }, { status: 400 });
        }
        
        coordinator.createHandoff({
          from,
          to,
          task,
          context: context || {},
          priority: priority || 'medium',
          timestamp: new Date()
        });
        
        return NextResponse.json({ 
          success: true, 
          message: `Handoff created from ${from} to ${to}` 
        });
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Valid actions: task, workflow, command, handoff' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}