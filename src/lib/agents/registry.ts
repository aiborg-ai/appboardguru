// Agent Registry and Factory

import { AgentId, AgentConfig, BaseAgent, AgentTask, AgentStatus, AgentHandoff, AgentMessage, AgentWorkflow } from './types';
import { EventEmitter } from 'events';

export class AgentRegistry extends EventEmitter {
  private static instance: AgentRegistry;
  private agents: Map<AgentId, BaseAgent> = new Map();
  private configs: Map<AgentId, AgentConfig> = new Map();
  private messages: AgentMessage[] = [];
  private workflows: Map<string, AgentWorkflow> = new Map();

  private constructor() {
    super();
    this.initializeAgentConfigs();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private initializeAgentConfigs() {
    // Core Infrastructure Agents
    this.registerConfig({
      id: 'DBA-01',
      name: 'Database Architect',
      category: 'infrastructure',
      owner: 'All Supabase operations and database architecture',
      responsibilities: [
        'Database schema design and migrations',
        'RLS policies and security rules',
        'Database performance optimization',
        'Backup and recovery strategies',
        'Connection pooling and query optimization'
      ],
      forbidden: ['Direct UI code', 'Business logic implementation'],
      handoffTo: ['REPO-02'],
      capabilities: [],
      permissions: {
        read: ['database'],
        write: ['database-schema'],
        delete: ['migrations'],
        execute: ['sql']
      },
      maxConcurrentTasks: 3,
      timeout: 300000 // 5 minutes
    });

    this.registerConfig({
      id: 'REPO-02',
      name: 'Repository Guardian',
      category: 'infrastructure',
      owner: 'Repository pattern implementation',
      responsibilities: [
        'Repository classes and methods',
        'Result pattern implementation',
        'Transaction coordination',
        'Query builders and data access',
        'Repository testing'
      ],
      forbidden: ['Direct database access', 'Service logic'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['repositories'],
        delete: [],
        execute: ['queries']
      },
      maxConcurrentTasks: 5,
      timeout: 180000
    });

    this.registerConfig({
      id: 'API-03',
      name: 'API Conductor',
      category: 'infrastructure',
      owner: 'All API routes and controllers',
      responsibilities: [
        'REST endpoint creation and maintenance',
        'Request/response handling',
        'API documentation (OpenAPI)',
        'Rate limiting and throttling',
        'API versioning strategy'
      ],
      forbidden: ['Business logic', 'Database queries'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['api-routes'],
        delete: [],
        execute: ['endpoints']
      },
      maxConcurrentTasks: 10,
      timeout: 120000
    });

    this.registerConfig({
      id: 'TYPE-04',
      name: 'Type Guardian',
      category: 'infrastructure',
      owner: 'TypeScript types and interfaces',
      responsibilities: [
        'Type definitions and branded types',
        'Interface contracts',
        'Type safety enforcement',
        'Zod schemas and validation',
        'Type generation from database'
      ],
      forbidden: ['Implementation code', 'UI components'],
      handoffTo: ['DBA-01', 'REPO-02', 'API-03', 'BIZ-03', 'UI-08'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['types'],
        delete: [],
        execute: ['validation']
      },
      maxConcurrentTasks: 5,
      timeout: 60000
    });

    this.registerConfig({
      id: 'INFRA-05',
      name: 'Infrastructure Orchestrator',
      category: 'infrastructure',
      owner: 'DevOps, deployment, and infrastructure',
      responsibilities: [
        'Docker configurations',
        'CI/CD pipelines',
        'Environment variables',
        'Build optimization',
        'Performance monitoring setup'
      ],
      forbidden: ['Application code', 'Business logic'],
      handoffTo: ['PERF-17'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['config'],
        delete: [],
        execute: ['deploy']
      },
      maxConcurrentTasks: 2,
      timeout: 600000
    });

    // Business Logic Agents
    this.registerConfig({
      id: 'BIZ-03',
      name: 'Business Logic Master',
      category: 'business-logic',
      owner: 'Service layer',
      responsibilities: [
        'Service implementation',
        'Business rule enforcement',
        'Workflow orchestration',
        'Event bus management',
        'Service factory patterns'
      ],
      forbidden: ['Direct database access', 'UI components'],
      handoffTo: ['REPO-02', 'API-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['services'],
        delete: [],
        execute: ['business']
      },
      maxConcurrentTasks: 8,
      timeout: 240000
    });

    this.registerConfig({
      id: 'STATE-07',
      name: 'State Manager',
      category: 'business-logic',
      owner: 'Zustand stores and client state',
      responsibilities: [
        'Store creation and management',
        'State synchronization',
        'Persistence strategies',
        'Store middleware',
        'State debugging tools'
      ],
      forbidden: ['Server-side logic', 'Database operations'],
      handoffTo: ['UI-08'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['stores'],
        delete: [],
        execute: ['state']
      },
      maxConcurrentTasks: 5,
      timeout: 120000
    });

    this.registerConfig({
      id: 'DOMAIN-08',
      name: 'Domain Expert',
      category: 'business-logic',
      owner: 'Domain entities and value objects',
      responsibilities: [
        'DDD entity modeling',
        'Value object implementation',
        'Domain events',
        'Aggregate roots',
        'Domain validation rules'
      ],
      forbidden: ['UI code', 'Infrastructure concerns'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['domains'],
        delete: [],
        execute: ['domain-logic']
      },
      maxConcurrentTasks: 4,
      timeout: 180000
    });

    this.registerConfig({
      id: 'INTEG-09',
      name: 'Integration Specialist',
      category: 'business-logic',
      owner: 'Third-party integrations and external APIs',
      responsibilities: [
        'OAuth implementations',
        'External API clients',
        'Webhook handlers',
        'Integration error handling',
        'API key management'
      ],
      forbidden: ['Core business logic', 'UI components'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['integrations'],
        delete: [],
        execute: ['external-apis']
      },
      maxConcurrentTasks: 6,
      timeout: 300000
    });

    // Frontend Agents
    this.registerConfig({
      id: 'UI-08',
      name: 'UI Component Architect',
      category: 'frontend',
      owner: 'React components',
      responsibilities: [
        'Component creation (atoms/molecules/organisms)',
        'Component optimization (React.memo, useMemo)',
        'Component documentation',
        'Storybook stories',
        'Component testing'
      ],
      forbidden: ['Business logic', 'API calls'],
      handoffTo: ['STYLE-11', 'HOOK-12'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['components'],
        delete: [],
        execute: ['render']
      },
      maxConcurrentTasks: 8,
      timeout: 120000
    });

    this.registerConfig({
      id: 'STYLE-11',
      name: 'Style Master',
      category: 'frontend',
      owner: 'Styling and design system',
      responsibilities: [
        'Tailwind configurations',
        'CSS modules',
        'Theme management',
        'Design tokens',
        'Responsive design'
      ],
      forbidden: ['Component logic', 'Business rules'],
      handoffTo: ['UI-08'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['styles'],
        delete: [],
        execute: ['styling']
      },
      maxConcurrentTasks: 5,
      timeout: 60000
    });

    this.registerConfig({
      id: 'HOOK-12',
      name: 'Hook Craftsman',
      category: 'frontend',
      owner: 'Custom React hooks',
      responsibilities: [
        'Custom hook creation',
        'Hook composition',
        'Side effect management',
        'Hook testing',
        'Performance optimization'
      ],
      forbidden: ['Component rendering', 'Styling'],
      handoffTo: ['UI-08'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['hooks'],
        delete: [],
        execute: ['hooks']
      },
      maxConcurrentTasks: 5,
      timeout: 120000
    });

    this.registerConfig({
      id: 'PAGE-13',
      name: 'Page Architect',
      category: 'frontend',
      owner: 'Next.js pages and routing',
      responsibilities: [
        'Page components',
        'Route configuration',
        'Layout management',
        'Metadata and SEO',
        'Page-level data fetching'
      ],
      forbidden: ['API implementation', 'Business logic'],
      handoffTo: ['UI-08', 'API-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['pages'],
        delete: [],
        execute: ['routing']
      },
      maxConcurrentTasks: 4,
      timeout: 180000
    });

    // Quality & Security Agents
    this.registerConfig({
      id: 'TEST-14',
      name: 'Test Commander',
      category: 'quality-security',
      owner: 'All testing strategies and implementation',
      responsibilities: [
        'Unit test creation',
        'Integration testing',
        'E2E test scenarios',
        'Test coverage monitoring',
        'Mock data management'
      ],
      forbidden: ['Production code changes'],
      handoffTo: ['QUALITY-16'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['tests'],
        delete: [],
        execute: ['test-run']
      },
      maxConcurrentTasks: 10,
      timeout: 600000
    });

    this.registerConfig({
      id: 'SEC-15',
      name: 'Security Sentinel',
      category: 'quality-security',
      owner: 'Security implementation and auditing',
      responsibilities: [
        'Authentication flows',
        'Authorization rules',
        'Encryption implementation',
        'Security headers',
        'Vulnerability scanning'
      ],
      forbidden: ['Feature development', 'UI design'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['security'],
        delete: [],
        execute: ['audit']
      },
      maxConcurrentTasks: 3,
      timeout: 300000
    });

    this.registerConfig({
      id: 'QUALITY-16',
      name: 'Code Quality Inspector',
      category: 'quality-security',
      owner: 'Code quality and standards',
      responsibilities: [
        'ESLint configuration',
        'Prettier setup',
        'Code review standards',
        'Technical debt tracking',
        'Refactoring strategies'
      ],
      forbidden: ['Feature implementation'],
      handoffTo: ['TEST-14'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['config'],
        delete: [],
        execute: ['lint']
      },
      maxConcurrentTasks: 5,
      timeout: 120000
    });

    // Specialized Feature Agents
    this.registerConfig({
      id: 'PERF-17',
      name: 'Performance Engineer',
      category: 'specialized',
      owner: 'Performance optimization',
      responsibilities: [
        'Bundle size optimization',
        'Lazy loading strategies',
        'Caching implementation',
        'Database query optimization',
        'Monitoring setup'
      ],
      forbidden: ['Feature development'],
      handoffTo: ['INFRA-05', 'DBA-01', 'UI-08'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['optimization'],
        delete: [],
        execute: ['profiling']
      },
      maxConcurrentTasks: 3,
      timeout: 300000
    });

    this.registerConfig({
      id: 'RT-18',
      name: 'Real-time Specialist',
      category: 'specialized',
      owner: 'WebSocket and real-time features',
      responsibilities: [
        'WebSocket implementation',
        'Real-time synchronization',
        'Presence systems',
        'Live collaboration features',
        'Event streaming'
      ],
      forbidden: ['REST APIs', 'Static content'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['websocket'],
        delete: [],
        execute: ['realtime']
      },
      maxConcurrentTasks: 5,
      timeout: 240000
    });

    this.registerConfig({
      id: 'AI-19',
      name: 'AI Integration Expert',
      category: 'specialized',
      owner: 'AI/ML features and 10-Agent system',
      responsibilities: [
        'AI agent implementation',
        'ML model integration',
        'NLP processing',
        'Prompt engineering',
        'AI service coordination'
      ],
      forbidden: ['Core infrastructure'],
      handoffTo: ['BIZ-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['ai-services'],
        delete: [],
        execute: ['ai-models']
      },
      maxConcurrentTasks: 4,
      timeout: 360000
    });

    this.registerConfig({
      id: 'DOC-20',
      name: 'Documentation Librarian',
      category: 'specialized',
      owner: 'All documentation and knowledge management',
      responsibilities: [
        'README maintenance',
        'API documentation',
        'Code comments',
        'Architecture decisions',
        'User guides'
      ],
      forbidden: ['Code implementation'],
      handoffTo: ['TYPE-04', 'API-03'],
      capabilities: [],
      permissions: {
        read: ['all'],
        write: ['documentation'],
        delete: [],
        execute: ['generate-docs']
      },
      maxConcurrentTasks: 5,
      timeout: 180000
    });
  }

  registerConfig(config: AgentConfig) {
    this.configs.set(config.id, config);
  }

  registerAgent(agent: BaseAgent) {
    const agentId = agent.getId();
    this.agents.set(agentId, agent);
    this.emit('agent:registered', agentId);
  }

  getAgent(id: AgentId): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getConfig(id: AgentId): AgentConfig | undefined {
    return this.configs.get(id);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getAllConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  getAgentStatus(id: AgentId): AgentStatus | undefined {
    const agent = this.getAgent(id);
    return agent?.getStatus();
  }

  getAllStatuses(): Map<AgentId, AgentStatus> {
    const statuses = new Map<AgentId, AgentStatus>();
    this.agents.forEach((agent, id) => {
      statuses.set(id, agent.getStatus());
    });
    return statuses;
  }

  sendMessage(message: AgentMessage) {
    this.messages.push(message);
    this.emit('message', message);
    
    if (message.to !== 'all') {
      const agent = this.getAgent(message.to as AgentId);
      if (agent) {
        this.emit(`message:${message.to}`, message);
      }
    }
  }

  createHandoff(handoff: AgentHandoff) {
    const fromAgent = this.getAgent(handoff.from);
    const toAgent = this.getAgent(handoff.to);
    
    if (!fromAgent || !toAgent) {
      throw new Error(`Invalid handoff: agent not found`);
    }

    const message: AgentMessage = {
      id: `handoff-${Date.now()}`,
      from: handoff.from,
      to: handoff.to,
      type: 'handoff',
      content: handoff,
      timestamp: new Date()
    };

    this.sendMessage(message);
    this.emit('handoff', handoff);
  }

  createWorkflow(workflow: AgentWorkflow): string {
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:created', workflow);
    return workflow.id;
  }

  getWorkflow(id: string): AgentWorkflow | undefined {
    return this.workflows.get(id);
  }

  updateWorkflowStatus(id: string, status: AgentWorkflow['status']) {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.status = status;
      if (status === 'completed') {
        workflow.completedAt = new Date();
      }
      this.emit('workflow:updated', workflow);
    }
  }

  getMessageHistory(limit: number = 100): AgentMessage[] {
    return this.messages.slice(-limit);
  }

  clearMessageHistory() {
    this.messages = [];
  }
}