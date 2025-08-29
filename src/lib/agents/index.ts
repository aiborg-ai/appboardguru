// Agent System Main Entry Point

export * from './types';
export * from './registry';
export * from './factory';
export * from './coordinator';
export { AgentCLI } from './cli';

// Quick start function
export async function initializeAgentSystem() {
  const { AgentCoordinator } = await import('./coordinator');
  const coordinator = AgentCoordinator.getInstance();
  await coordinator.initialize();
  return coordinator;
}

// Helper function to submit a task
export async function submitAgentTask(description: string, targetAgent?: string) {
  const { AgentCoordinator } = await import('./coordinator');
  const coordinator = AgentCoordinator.getInstance();
  return coordinator.submitTask({
    description,
    targetAgent: targetAgent as any
  });
}

// Helper function to create a workflow
export async function createAgentWorkflow(type: 'feature' | 'bugfix' | 'performance', parameter: string) {
  const { AgentCoordinator, WorkflowTemplates } = await import('./coordinator');
  const coordinator = AgentCoordinator.getInstance();
  
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
  }
  
  return coordinator.createWorkflow(workflowRequest);
}

// Helper function to get agent status
export async function getAgentStatus(agentId?: string) {
  const { AgentCoordinator } = await import('./coordinator');
  const coordinator = AgentCoordinator.getInstance();
  
  if (agentId) {
    return coordinator.getAgentStatus(agentId as any);
  } else {
    return coordinator.getAllAgentStatuses();
  }
}

// Helper function to get agent metrics
export async function getAgentMetrics(agentId?: string) {
  const { AgentCoordinator } = await import('./coordinator');
  const coordinator = AgentCoordinator.getInstance();
  
  if (agentId) {
    return coordinator.getAgentMetrics(agentId as any);
  } else {
    return coordinator.getAllAgentMetrics();
  }
}