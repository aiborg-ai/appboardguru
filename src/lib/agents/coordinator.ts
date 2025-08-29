// Agent Coordinator and Communication System

import { 
  AgentId, 
  AgentTask, 
  AgentHandoff, 
  AgentWorkflow, 
  TaskPriority, 
  TaskStatus,
  AgentMessage,
  AgentStatus
} from './types';
import { AgentRegistry } from './registry';
import { AgentFactory } from './factory';
import { EventEmitter } from 'events';

export interface TaskRequest {
  description: string;
  priority?: TaskPriority;
  targetAgent?: AgentId;
  metadata?: Record<string, any>;
}

export interface WorkflowRequest {
  name: string;
  description: string;
  steps: Array<{
    agentId: AgentId;
    task: string;
    dependencies?: string[];
  }>;
}

export class AgentCoordinator extends EventEmitter {
  private static instance: AgentCoordinator;
  private registry: AgentRegistry;
  private taskQueue: Map<AgentId, AgentTask[]> = new Map();
  private activeWorkflows: Map<string, AgentWorkflow> = new Map();
  private taskCounter: number = 0;

  private constructor() {
    super();
    this.registry = AgentRegistry.getInstance();
    this.initializeListeners();
  }

  static getInstance(): AgentCoordinator {
    if (!AgentCoordinator.instance) {
      AgentCoordinator.instance = new AgentCoordinator();
    }
    return AgentCoordinator.instance;
  }

  private initializeListeners() {
    this.registry.on('handoff', (handoff: AgentHandoff) => {
      this.handleHandoff(handoff);
    });

    this.registry.on('message', (message: AgentMessage) => {
      this.handleMessage(message);
    });

    this.registry.on('workflow:updated', (workflow: AgentWorkflow) => {
      this.handleWorkflowUpdate(workflow);
    });
  }

  async initialize() {
    // Create all agents
    AgentFactory.createAllAgents();
    
    // Start agent monitoring
    this.startMonitoring();
    
    console.log('Agent Coordinator initialized with 20 agents');
  }

  private startMonitoring() {
    setInterval(() => {
      this.processTaskQueues();
      this.checkAgentHealth();
    }, 5000); // Check every 5 seconds
  }

  private async processTaskQueues() {
    for (const [agentId, tasks] of this.taskQueue.entries()) {
      const agent = this.registry.getAgent(agentId);
      if (!agent) continue;

      const status = agent.getStatus();
      if (status === 'active' || status === 'idle') {
        const task = tasks.shift();
        if (task) {
          this.executeTask(agentId, task);
        }
      }
    }
  }

  private checkAgentHealth() {
    const agents = this.registry.getAllAgents();
    agents.forEach(agent => {
      const metrics = agent.getMetrics();
      const status = agent.getStatus();
      
      // Check for unhealthy agents
      if (status === 'error' || metrics.tasksFailed > metrics.tasksCompleted * 0.3) {
        this.emit('agent:unhealthy', {
          agentId: agent.getId(),
          status,
          metrics
        });
      }
    });
  }

  async submitTask(request: TaskRequest): Promise<string> {
    const taskId = `task-${++this.taskCounter}`;
    
    // Determine which agent should handle the task
    const agentId = request.targetAgent || this.selectBestAgent(request.description);
    
    if (!agentId) {
      throw new Error('No suitable agent found for task');
    }

    const task: AgentTask = {
      id: taskId,
      agentId,
      description: request.description,
      priority: request.priority || 'medium',
      status: 'pending',
      createdAt: new Date()
    };

    // Add to queue
    if (!this.taskQueue.has(agentId)) {
      this.taskQueue.set(agentId, []);
    }
    this.taskQueue.get(agentId)!.push(task);

    this.emit('task:submitted', task);
    
    // Try to execute immediately if agent is available
    const agent = this.registry.getAgent(agentId);
    if (agent && (agent.getStatus() === 'active' || agent.getStatus() === 'idle')) {
      this.executeTask(agentId, task);
    }

    return taskId;
  }

  private selectBestAgent(description: string): AgentId | null {
    const agents = this.registry.getAllAgents();
    
    for (const agent of agents) {
      if (agent.validate({ 
        id: 'temp',
        agentId: agent.getId(),
        description,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      })) {
        return agent.getId();
      }
    }
    
    return null;
  }

  private async executeTask(agentId: AgentId, task: AgentTask) {
    const agent = this.registry.getAgent(agentId);
    if (!agent) return;

    task.status = 'in-progress';
    task.startedAt = new Date();
    
    this.emit('task:started', task);

    try {
      const result = await agent.execute(task);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      
      this.emit('task:completed', task);
      
      // Check if result requires handoff
      if (result.handoff) {
        this.createHandoff({
          from: agentId,
          to: result.handoff.to,
          task: result.handoff.task,
          context: result.handoff.context || {},
          priority: task.priority,
          timestamp: new Date()
        });
      }
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('task:failed', task);
    }
  }

  createHandoff(handoff: AgentHandoff) {
    this.registry.createHandoff(handoff);
    
    // Create a new task for the target agent
    const task: AgentTask = {
      id: `task-${++this.taskCounter}`,
      agentId: handoff.to,
      description: handoff.task,
      priority: handoff.priority,
      status: 'pending',
      createdAt: new Date(),
      handoffs: [handoff]
    };
    
    if (!this.taskQueue.has(handoff.to)) {
      this.taskQueue.set(handoff.to, []);
    }
    this.taskQueue.get(handoff.to)!.push(task);
    
    this.emit('handoff:created', handoff);
  }

  private handleHandoff(handoff: AgentHandoff) {
    console.log(`Handoff from ${handoff.from} to ${handoff.to}: ${handoff.task}`);
  }

  private handleMessage(message: AgentMessage) {
    console.log(`Message from ${message.from} to ${message.to}: ${message.type}`);
  }

  private handleWorkflowUpdate(workflow: AgentWorkflow) {
    if (workflow.status === 'running' && workflow.currentStep < workflow.steps.length) {
      // Execute next step
      const step = workflow.steps[workflow.currentStep];
      this.submitTask({
        description: step.task,
        targetAgent: step.agentId,
        metadata: { workflowId: workflow.id }
      });
      
      workflow.currentStep++;
    } else if (workflow.status === 'completed') {
      this.activeWorkflows.delete(workflow.id);
      this.emit('workflow:completed', workflow);
    }
  }

  async createWorkflow(request: WorkflowRequest): Promise<string> {
    const workflowId = `workflow-${Date.now()}`;
    
    const workflow: AgentWorkflow = {
      id: workflowId,
      name: request.name,
      description: request.description,
      steps: request.steps,
      currentStep: 0,
      status: 'pending'
    };
    
    this.activeWorkflows.set(workflowId, workflow);
    this.registry.createWorkflow(workflow);
    
    // Start workflow
    workflow.status = 'running';
    workflow.startedAt = new Date();
    
    // Execute first step
    if (workflow.steps.length > 0) {
      const firstStep = workflow.steps[0];
      await this.submitTask({
        description: firstStep.task,
        targetAgent: firstStep.agentId,
        metadata: { workflowId }
      });
      workflow.currentStep = 1;
    }
    
    return workflowId;
  }

  getAgentStatus(agentId: AgentId): AgentStatus | undefined {
    return this.registry.getAgentStatus(agentId);
  }

  getAllAgentStatuses(): Map<AgentId, AgentStatus> {
    return this.registry.getAllStatuses();
  }

  getTaskQueue(agentId?: AgentId): AgentTask[] {
    if (agentId) {
      return this.taskQueue.get(agentId) || [];
    }
    
    const allTasks: AgentTask[] = [];
    this.taskQueue.forEach(tasks => allTasks.push(...tasks));
    return allTasks;
  }

  getWorkflow(workflowId: string): AgentWorkflow | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  getActiveWorkflows(): AgentWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  getAgentMetrics(agentId: AgentId) {
    const agent = this.registry.getAgent(agentId);
    return agent?.getMetrics();
  }

  getAllAgentMetrics() {
    const metrics = new Map();
    const agents = this.registry.getAllAgents();
    
    agents.forEach(agent => {
      metrics.set(agent.getId(), agent.getMetrics());
    });
    
    return metrics;
  }

  // Command parsing for CLI
  async executeCommand(command: string): Promise<any> {
    const parts = command.split(' ');
    const cmd = parts[0];
    
    switch (cmd) {
      case '@agent': {
        const agentId = parts[1] as AgentId;
        const taskDescription = parts.slice(2).join(' ').replace(/"/g, '');
        
        if (!agentId || !taskDescription) {
          throw new Error('Invalid command format. Use: @agent [AGENT-ID] "task description"');
        }
        
        return this.submitTask({
          description: taskDescription,
          targetAgent: agentId
        });
      }
      
      case 'status': {
        if (parts[1] === '--all') {
          return this.getAllAgentStatuses();
        }
        const agentId = parts[1] as AgentId;
        return this.getAgentStatus(agentId);
      }
      
      case 'workload': {
        const agentId = parts[1] as AgentId;
        return this.getTaskQueue(agentId);
      }
      
      case 'metrics': {
        const agentId = parts[1] as AgentId;
        return agentId ? this.getAgentMetrics(agentId) : this.getAllAgentMetrics();
      }
      
      case 'history': {
        const limit = parseInt(parts[2]) || 100;
        return this.registry.getMessageHistory(limit);
      }
      
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  }
}

// Workflow templates for common operations
export class WorkflowTemplates {
  static featureDevelopment(featureName: string): WorkflowRequest {
    return {
      name: `Feature Development: ${featureName}`,
      description: `Complete development workflow for ${featureName}`,
      steps: [
        { agentId: 'TYPE-04', task: `Define interfaces for ${featureName}` },
        { agentId: 'DBA-01', task: `Design database schema for ${featureName}` },
        { agentId: 'REPO-02', task: `Implement repository for ${featureName}` },
        { agentId: 'BIZ-03', task: `Create service layer for ${featureName}` },
        { agentId: 'API-03', task: `Expose API endpoints for ${featureName}` },
        { agentId: 'UI-08', task: `Build UI components for ${featureName}` },
        { agentId: 'PAGE-13', task: `Create pages for ${featureName}` },
        { agentId: 'TEST-14', task: `Write tests for ${featureName}` },
        { agentId: 'DOC-20', task: `Document ${featureName}` }
      ]
    };
  }

  static bugFix(bugDescription: string): WorkflowRequest {
    return {
      name: `Bug Fix: ${bugDescription}`,
      description: `Fix and verify bug: ${bugDescription}`,
      steps: [
        { agentId: 'TEST-14', task: `Identify and reproduce bug: ${bugDescription}` },
        { agentId: 'QUALITY-16', task: `Analyze root cause of ${bugDescription}` },
        { agentId: 'BIZ-03', task: `Fix bug in service layer if needed` },
        { agentId: 'UI-08', task: `Fix bug in UI if needed` },
        { agentId: 'TEST-14', task: `Verify bug fix and write regression tests` },
        { agentId: 'DOC-20', task: `Update documentation if needed` }
      ]
    };
  }

  static performanceOptimization(area: string): WorkflowRequest {
    return {
      name: `Performance Optimization: ${area}`,
      description: `Optimize performance in ${area}`,
      steps: [
        { agentId: 'PERF-17', task: `Identify performance bottlenecks in ${area}` },
        { agentId: 'DBA-01', task: `Optimize database queries if needed` },
        { agentId: 'UI-08', task: `Optimize React components if needed` },
        { agentId: 'PERF-17', task: `Validate performance improvements` },
        { agentId: 'TEST-14', task: `Ensure no regression in functionality` }
      ]
    };
  }
}