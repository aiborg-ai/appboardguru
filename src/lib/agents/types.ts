// Agent System Type Definitions

export type AgentId = 
  | 'DBA-01' | 'REPO-02' | 'API-03' | 'TYPE-04' | 'INFRA-05'
  | 'BIZ-03' | 'STATE-07' | 'DOMAIN-08' | 'INTEG-09'
  | 'UI-08' | 'STYLE-11' | 'HOOK-12' | 'PAGE-13'
  | 'TEST-14' | 'SEC-15' | 'QUALITY-16'
  | 'PERF-17' | 'RT-18' | 'AI-19' | 'DOC-20';

export type AgentCategory = 
  | 'infrastructure' 
  | 'business-logic' 
  | 'frontend' 
  | 'quality-security' 
  | 'specialized';

export type AgentStatus = 'active' | 'busy' | 'blocked' | 'idle' | 'error';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  requiredPermissions: string[];
}

export interface AgentPermissions {
  read: string[];
  write: string[];
  delete: string[];
  execute: string[];
}

export interface AgentHandoff {
  from: AgentId;
  to: AgentId;
  task: string;
  context: Record<string, any>;
  priority: TaskPriority;
  timestamp: Date;
}

export interface AgentTask {
  id: string;
  agentId: AgentId;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  dependencies?: string[];
  handoffs?: AgentHandoff[];
}

export interface AgentMetrics {
  responseTime: number; // ms
  resolutionTime: number; // ms
  qualityScore: number; // 0-100
  handoffEfficiency: number; // 0-100
  domainExpertise: number; // 0-100
  tasksCompleted: number;
  tasksFailed: number;
  averageTaskTime: number; // ms
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  category: AgentCategory;
  owner: string;
  responsibilities: string[];
  forbidden: string[];
  handoffTo: AgentId[];
  capabilities: AgentCapability[];
  permissions: AgentPermissions;
  maxConcurrentTasks: number;
  timeout: number; // ms
}

export interface AgentContext {
  currentTask?: AgentTask;
  taskQueue: AgentTask[];
  status: AgentStatus;
  metrics: AgentMetrics;
  lastActivity: Date;
  errors: Array<{
    timestamp: Date;
    error: string;
    task?: string;
  }>;
}

export interface AgentMessage {
  id: string;
  from: AgentId | 'system' | 'user';
  to: AgentId | 'all';
  type: 'task' | 'handoff' | 'status' | 'error' | 'result';
  content: any;
  timestamp: Date;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    agentId: AgentId;
    task: string;
    dependencies?: string[];
    timeout?: number;
  }>;
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected context: AgentContext;

  constructor(config: AgentConfig) {
    this.config = config;
    this.context = {
      taskQueue: [],
      status: 'idle',
      metrics: {
        responseTime: 0,
        resolutionTime: 0,
        qualityScore: 100,
        handoffEfficiency: 100,
        domainExpertise: 100,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageTaskTime: 0
      },
      lastActivity: new Date(),
      errors: []
    };
  }

  abstract execute(task: AgentTask): Promise<any>;
  abstract validate(task: AgentTask): boolean;
  abstract canHandoff(to: AgentId): boolean;
  
  getStatus(): AgentStatus {
    return this.context.status;
  }

  getMetrics(): AgentMetrics {
    return this.context.metrics;
  }

  getId(): AgentId {
    return this.config.id;
  }
}