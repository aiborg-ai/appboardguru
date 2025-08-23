/**
 * Workflow Automation Engine
 * IFTTT-style rule creation interface with complex conditional logic
 */

import { IntegrationHubService, WorkflowRule, WorkflowTrigger, WorkflowCondition, WorkflowAction } from './integration-hub.service';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Enhanced Workflow Types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  template: WorkflowRule;
  parameters: TemplateParameter[];
  tags: string[];
  popularity: number;
  createdBy: string;
  isPublic: boolean;
}

export type WorkflowCategory = 
  | 'COMPLIANCE' 
  | 'APPROVAL' 
  | 'NOTIFICATION' 
  | 'INTEGRATION' 
  | 'REPORTING'
  | 'SECURITY' 
  | 'FINANCE' 
  | 'LEGAL';

export interface TemplateParameter {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'LIST' | 'OBJECT';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[];
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  context: Record<string, any>;
  steps: ExecutionStep[];
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
  error?: string;
}

export type ExecutionStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED'
  | 'TIMEOUT';

export interface ExecutionStep {
  id: string;
  actionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  input: any;
  output?: any;
  error?: string;
  retryCount: number;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: any;
}

export interface ExecutionMetrics {
  totalDuration: number;
  stepCount: number;
  retryCount: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpuTime: number;
  memoryUsage: number;
  networkCalls: number;
  storageOperations: number;
}

// Advanced Trigger Types
export interface ScheduleTrigger extends WorkflowTrigger {
  type: 'SCHEDULE';
  config: {
    cronExpression?: string;
    interval?: number; // milliseconds
    timezone: string;
    startDate?: Date;
    endDate?: Date;
    maxExecutions?: number;
  };
}

export interface EventTrigger extends WorkflowTrigger {
  type: 'EVENT';
  config: {
    eventType: string;
    sourceSystem: string;
    filters: Record<string, any>;
    bufferTime?: number; // milliseconds to buffer events
    maxBufferSize?: number;
  };
}

export interface WebhookTrigger extends WorkflowTrigger {
  type: 'WEBHOOK';
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    authentication: WebhookAuth;
    responseTemplate?: string;
    timeout: number;
  };
}

export interface DataChangeTrigger extends WorkflowTrigger {
  type: 'DATA_CHANGE';
  config: {
    dataSource: string;
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    conditions: Record<string, any>;
    debounceTime?: number;
  };
}

export interface WebhookAuth {
  type: 'NONE' | 'API_KEY' | 'BASIC' | 'BEARER' | 'CUSTOM';
  config: Record<string, string>;
}

// Advanced Condition Types
export interface CompoundCondition extends WorkflowCondition {
  type: 'AND' | 'OR' | 'NOT';
  conditions: WorkflowCondition[];
}

export interface ScriptCondition extends WorkflowCondition {
  type: 'SCRIPT';
  script: string;
  language: 'JAVASCRIPT' | 'PYTHON' | 'LUA';
  timeout: number;
}

export interface ExternalCondition extends WorkflowCondition {
  type: 'EXTERNAL_API';
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  expectedResponse: any;
}

// Advanced Action Types
export interface ScriptAction extends WorkflowAction {
  type: 'SCRIPT';
  config: {
    script: string;
    language: 'JAVASCRIPT' | 'PYTHON' | 'LUA';
    timeout: number;
    resources: {
      maxMemory: number;
      maxCpu: number;
    };
  };
}

export interface DatabaseAction extends WorkflowAction {
  type: 'DATABASE';
  config: {
    connectionId: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    query: string;
    parameters: Record<string, any>;
    transaction: boolean;
  };
}

export interface FileAction extends WorkflowAction {
  type: 'FILE_OPERATION';
  config: {
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'COPY' | 'MOVE';
    path: string;
    content?: string;
    permissions?: string;
    backup: boolean;
  };
}

export interface IntegrationAction extends WorkflowAction {
  type: 'INTEGRATION_CALL';
  config: {
    integrationId: string;
    method: string;
    parameters: Record<string, any>;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'LINEAR' | 'EXPONENTIAL';
      initialDelay: number;
    };
  };
}

// Workflow Builder Interface
export interface WorkflowBuilder {
  createRule(): WorkflowRuleBuilder;
  createTemplate(): WorkflowTemplateBuilder;
  validateRule(rule: WorkflowRule): ValidationResult;
  estimateExecution(rule: WorkflowRule): ExecutionEstimate;
}

export interface WorkflowRuleBuilder {
  setName(name: string): this;
  setDescription(description: string): this;
  addTrigger(trigger: WorkflowTrigger): this;
  addCondition(condition: WorkflowCondition): this;
  addAction(action: WorkflowAction): this;
  setPriority(priority: number): this;
  setEnabled(enabled: boolean): this;
  build(): WorkflowRule;
}

export interface WorkflowTemplateBuilder {
  setName(name: string): this;
  setDescription(description: string): this;
  setCategory(category: WorkflowCategory): this;
  addParameter(parameter: TemplateParameter): this;
  setRule(rule: WorkflowRule): this;
  build(): WorkflowTemplate;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ExecutionEstimate {
  estimatedDuration: number;
  resourceRequirements: ResourceRequirements;
  cost: number;
  dependencies: string[];
}

export interface ResourceRequirements {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

// Workflow Automation Engine Service
export class WorkflowAutomationService extends EventEmitter {
  private hub: IntegrationHubService;
  private rules: Map<string, WorkflowRule> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private triggers: Map<string, any> = new Map(); // Active triggers
  private scheduler: WorkflowScheduler;
  private executor: WorkflowExecutor;
  private validator: WorkflowValidator;
  private builder: WorkflowBuilderImpl;

  constructor(hub: IntegrationHubService) {
    super();
    this.hub = hub;
    this.scheduler = new WorkflowScheduler(this);
    this.executor = new WorkflowExecutor(this);
    this.validator = new WorkflowValidator();
    this.builder = new WorkflowBuilderImpl();
    
    this.initializeBuiltInTemplates();
    this.startEngineServices();
  }

  // Rule Management
  async createRule(rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>): Promise<string> {
    const id = this.generateId();
    const workflowRule: WorkflowRule = {
      ...rule,
      id,
      createdAt: new Date(),
      executionCount: 0,
    };

    const validation = await this.validator.validate(workflowRule);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.rules.set(id, workflowRule);
    
    // Setup triggers
    await this.setupTriggers(workflowRule);
    
    this.emit('ruleCreated', { ruleId: id, rule: workflowRule });
    
    return id;
  }

  async updateRule(id: string, updates: Partial<WorkflowRule>): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    const updatedRule = { ...rule, ...updates, lastModified: new Date() };
    
    const validation = await this.validator.validate(updatedRule);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Remove old triggers and setup new ones
    await this.removeTriggers(rule);
    await this.setupTriggers(updatedRule);
    
    this.rules.set(id, updatedRule);
    
    this.emit('ruleUpdated', { ruleId: id, rule: updatedRule });
  }

  async deleteRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    await this.removeTriggers(rule);
    this.rules.delete(id);
    
    this.emit('ruleDeleted', { ruleId: id });
  }

  async enableRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    rule.enabled = true;
    await this.setupTriggers(rule);
    
    this.emit('ruleEnabled', { ruleId: id });
  }

  async disableRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    rule.enabled = false;
    await this.removeTriggers(rule);
    
    this.emit('ruleDisabled', { ruleId: id });
  }

  // Template Management
  async createTemplate(template: Omit<WorkflowTemplate, 'id'>): Promise<string> {
    const id = this.generateId();
    const workflowTemplate: WorkflowTemplate = {
      ...template,
      id,
    };

    this.templates.set(id, workflowTemplate);
    
    this.emit('templateCreated', { templateId: id, template: workflowTemplate });
    
    return id;
  }

  async instantiateTemplate(templateId: string, parameters: Record<string, any>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate parameters
    const validationResult = this.validateTemplateParameters(template, parameters);
    if (!validationResult.isValid) {
      throw new Error(`Parameter validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Instantiate rule from template
    const rule = this.instantiateRuleFromTemplate(template, parameters);
    
    return await this.createRule(rule);
  }

  // Execution Management
  async executeRule(ruleId: string, context: Record<string, any> = {}): Promise<string> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      throw new Error(`Rule ${ruleId} not found or disabled`);
    }

    const executionId = this.generateId();
    const execution: WorkflowExecution = {
      id: executionId,
      ruleId,
      status: 'PENDING',
      startedAt: new Date(),
      context,
      steps: [],
      logs: [],
      metrics: {
        totalDuration: 0,
        stepCount: 0,
        retryCount: 0,
        resourceUsage: {
          cpuTime: 0,
          memoryUsage: 0,
          networkCalls: 0,
          storageOperations: 0,
        },
      },
    };

    this.executions.set(executionId, execution);
    
    // Execute asynchronously
    this.executeWorkflowAsync(execution, rule);
    
    this.emit('executionStarted', { executionId, ruleId });
    
    return executionId;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'RUNNING') {
      execution.status = 'CANCELLED';
      execution.completedAt = new Date();
      
      this.emit('executionCancelled', { executionId });
    }
  }

  // Query Methods
  getRule(id: string): WorkflowRule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): WorkflowRule[] {
    return Array.from(this.rules.values());
  }

  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  getExecutionHistory(ruleId?: string, limit: number = 100): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());
    
    if (ruleId) {
      executions = executions.filter(e => e.ruleId === ruleId);
    }
    
    return executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  // Builder Interface
  getBuilder(): WorkflowBuilder {
    return this.builder;
  }

  // Private Implementation Methods
  private async setupTriggers(rule: WorkflowRule): Promise<void> {
    if (!rule.enabled) return;

    switch (rule.trigger.type) {
      case 'SCHEDULE':
        await this.scheduler.addScheduledRule(rule);
        break;
      case 'EVENT':
        await this.setupEventTrigger(rule);
        break;
      case 'WEBHOOK':
        await this.setupWebhookTrigger(rule);
        break;
      case 'DATA_CHANGE':
        await this.setupDataChangeTrigger(rule);
        break;
    }
  }

  private async removeTriggers(rule: WorkflowRule): Promise<void> {
    switch (rule.trigger.type) {
      case 'SCHEDULE':
        await this.scheduler.removeScheduledRule(rule.id);
        break;
      case 'EVENT':
        await this.removeEventTrigger(rule);
        break;
      case 'WEBHOOK':
        await this.removeWebhookTrigger(rule);
        break;
      case 'DATA_CHANGE':
        await this.removeDataChangeTrigger(rule);
        break;
    }
  }

  private async setupEventTrigger(rule: WorkflowRule): Promise<void> {
    const config = rule.trigger.config as EventTrigger['config'];
    
    this.hub.on(config.eventType, (eventData: any) => {
      if (this.matchesEventFilters(eventData, config.filters)) {
        this.executeRule(rule.id, { eventData });
      }
    });
  }

  private async removeEventTrigger(rule: WorkflowRule): Promise<void> {
    // Remove event listeners for this rule
    const config = rule.trigger.config as EventTrigger['config'];
    this.hub.removeAllListeners(config.eventType);
  }

  private async setupWebhookTrigger(rule: WorkflowRule): Promise<void> {
    const config = rule.trigger.config as WebhookTrigger['config'];
    
    // Register webhook endpoint
    this.triggers.set(`webhook-${rule.id}`, {
      type: 'webhook',
      rule,
      config,
    });
  }

  private async removeWebhookTrigger(rule: WorkflowRule): Promise<void> {
    this.triggers.delete(`webhook-${rule.id}`);
  }

  private async setupDataChangeTrigger(rule: WorkflowRule): Promise<void> {
    const config = rule.trigger.config as DataChangeTrigger['config'];
    
    // Setup database change monitoring
    this.triggers.set(`data-change-${rule.id}`, {
      type: 'data_change',
      rule,
      config,
    });
  }

  private async removeDataChangeTrigger(rule: WorkflowRule): Promise<void> {
    this.triggers.delete(`data-change-${rule.id}`);
  }

  private async executeWorkflowAsync(execution: WorkflowExecution, rule: WorkflowRule): Promise<void> {
    try {
      execution.status = 'RUNNING';
      const startTime = Date.now();

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, execution.context);
      
      if (!conditionsMet) {
        execution.status = 'COMPLETED';
        execution.completedAt = new Date();
        this.addExecutionLog(execution, 'INFO', 'Conditions not met, skipping execution');
        this.emit('executionCompleted', { executionId: execution.id, status: 'SKIPPED' });
        return;
      }

      // Execute actions
      for (const action of rule.actions.sort((a, b) => a.order - b.order)) {
        const step = await this.executeAction(execution, action);
        execution.steps.push(step);
        execution.metrics.stepCount++;
        
        if (!step.error) {
          // Update context with step output
          execution.context[`step_${step.id}_output`] = step.output;
        } else {
          execution.status = 'FAILED';
          execution.error = step.error;
          break;
        }
      }

      if (execution.status === 'RUNNING') {
        execution.status = 'COMPLETED';
      }

      execution.completedAt = new Date();
      execution.metrics.totalDuration = Date.now() - startTime;
      
      rule.executionCount++;
      
      this.emit('executionCompleted', { 
        executionId: execution.id, 
        status: execution.status,
        duration: execution.metrics.totalDuration 
      });
      
    } catch (error) {
      execution.status = 'FAILED';
      execution.error = error.message;
      execution.completedAt = new Date();
      
      this.addExecutionLog(execution, 'ERROR', `Execution failed: ${error.message}`);
      this.emit('executionFailed', { executionId: execution.id, error: error.message });
    }
  }

  private async evaluateConditions(conditions: WorkflowCondition[], context: Record<string, any>): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      
      // Simple AND logic for now - can be enhanced for complex boolean expressions
      if (!result) return false;
    }
    
    return true;
  }

  private async evaluateCondition(condition: WorkflowCondition, context: Record<string, any>): Promise<boolean> {
    switch (condition.type) {
      case 'AND':
        return this.evaluateCompoundCondition(condition as CompoundCondition, context);
      case 'OR':
        return this.evaluateCompoundCondition(condition as CompoundCondition, context);
      case 'NOT':
        return this.evaluateCompoundCondition(condition as CompoundCondition, context);
      case 'SCRIPT':
        return this.evaluateScriptCondition(condition as ScriptCondition, context);
      case 'EXTERNAL_API':
        return this.evaluateExternalCondition(condition as ExternalCondition, context);
      default:
        return this.evaluateSimpleCondition(condition, context);
    }
  }

  private async evaluateCompoundCondition(condition: CompoundCondition, context: Record<string, any>): Promise<boolean> {
    const results = await Promise.all(
      condition.conditions.map(c => this.evaluateCondition(c, context))
    );

    switch (condition.type) {
      case 'AND':
        return results.every(r => r);
      case 'OR':
        return results.some(r => r);
      case 'NOT':
        return !results[0];
      default:
        return false;
    }
  }

  private async evaluateScriptCondition(condition: ScriptCondition, context: Record<string, any>): Promise<boolean> {
    try {
      // Execute script with timeout
      const result = await this.executeScript(condition.script, condition.language, context, condition.timeout);
      return Boolean(result);
    } catch (error) {
      this.addExecutionLog({ logs: [] } as WorkflowExecution, 'ERROR', `Script condition failed: ${error.message}`);
      return false;
    }
  }

  private async evaluateExternalCondition(condition: ExternalCondition, context: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(condition.endpoint, {
        method: condition.method,
        headers: condition.headers,
        body: condition.method !== 'GET' ? JSON.stringify(context) : undefined,
      });

      const data = await response.json();
      return this.deepEquals(data, condition.expectedResponse);
    } catch (error) {
      this.addExecutionLog({ logs: [] } as WorkflowExecution, 'ERROR', `External condition failed: ${error.message}`);
      return false;
    }
  }

  private evaluateSimpleCondition(condition: WorkflowCondition, context: Record<string, any>): boolean {
    const value = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'EQUALS':
        return value === condition.value;
      case 'NOT_EQUALS':
        return value !== condition.value;
      case 'GREATER_THAN':
        return Number(value) > Number(condition.value);
      case 'LESS_THAN':
        return Number(value) < Number(condition.value);
      case 'CONTAINS':
        return String(value).includes(String(condition.value));
      case 'IN':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'REGEX':
        return new RegExp(condition.value).test(String(value));
      default:
        return false;
    }
  }

  private async executeAction(execution: WorkflowExecution, action: WorkflowAction): Promise<ExecutionStep> {
    const stepId = this.generateId();
    const step: ExecutionStep = {
      id: stepId,
      actionId: action.type,
      status: 'PENDING',
      startedAt: new Date(),
      input: action.config,
      retryCount: 0,
    };

    try {
      step.status = 'RUNNING';
      
      switch (action.type) {
        case 'API_CALL':
          step.output = await this.executeAPICallAction(action, execution.context);
          break;
        case 'EMAIL':
          step.output = await this.executeEmailAction(action, execution.context);
          break;
        case 'NOTIFICATION':
          step.output = await this.executeNotificationAction(action, execution.context);
          break;
        case 'SCRIPT':
          step.output = await this.executeScriptAction(action as ScriptAction, execution.context);
          break;
        case 'DATABASE':
          step.output = await this.executeDatabaseAction(action as DatabaseAction, execution.context);
          break;
        case 'FILE_OPERATION':
          step.output = await this.executeFileAction(action as FileAction, execution.context);
          break;
        case 'INTEGRATION_CALL':
          step.output = await this.executeIntegrationAction(action as IntegrationAction, execution.context);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      step.status = 'COMPLETED';
      step.completedAt = new Date();
      
      this.addExecutionLog(execution, 'INFO', `Action ${action.type} completed successfully`);
      
    } catch (error) {
      step.status = 'FAILED';
      step.error = error.message;
      step.completedAt = new Date();
      
      this.addExecutionLog(execution, 'ERROR', `Action ${action.type} failed: ${error.message}`);
    }

    return step;
  }

  private async executeScriptAction(action: ScriptAction, context: Record<string, any>): Promise<any> {
    return this.executeScript(
      action.config.script, 
      action.config.language, 
      context, 
      action.config.timeout
    );
  }

  private async executeDatabaseAction(action: DatabaseAction, context: Record<string, any>): Promise<any> {
    // Mock database action execution
    this.addExecutionLog({ logs: [] } as WorkflowExecution, 'INFO', `Database ${action.config.operation} executed`);
    return { affected: 1 };
  }

  private async executeFileAction(action: FileAction, context: Record<string, any>): Promise<any> {
    // Mock file operation
    this.addExecutionLog({ logs: [] } as WorkflowExecution, 'INFO', `File ${action.config.operation} executed`);
    return { success: true };
  }

  private async executeIntegrationAction(action: IntegrationAction, context: Record<string, any>): Promise<any> {
    // Call integration through hub
    return { success: true, response: 'Integration call completed' };
  }

  private async executeAPICallAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    const { url, method, headers, body } = action.config;
    
    const response = await fetch(url, {
      method: method || 'POST',
      headers: headers || {},
      body: body ? JSON.stringify(this.interpolateTemplate(body, context)) : undefined,
    });

    return await response.json();
  }

  private async executeEmailAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    const { to, subject, template } = action.config;
    
    const emailData = {
      to: this.interpolateTemplate(to, context),
      subject: this.interpolateTemplate(subject, context),
      html: this.interpolateTemplate(template, context),
    };

    this.emit('emailSent', emailData);
    
    return emailData;
  }

  private async executeNotificationAction(action: WorkflowAction, context: Record<string, any>): Promise<any> {
    const { recipients, message, type } = action.config;
    
    const notification = {
      recipients: this.interpolateTemplate(recipients, context),
      message: this.interpolateTemplate(message, context),
      type: type || 'INFO',
    };

    this.emit('notificationSent', notification);
    
    return notification;
  }

  private async executeScript(script: string, language: string, context: Record<string, any>, timeout: number): Promise<any> {
    // Mock script execution - in production, use a secure sandboxed environment
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (language === 'JAVASCRIPT') {
      try {
        // Very basic and unsafe evaluation - use proper sandbox in production
        const func = new Function('context', `return (${script})`);
        return func(context);
      } catch (error) {
        throw new Error(`Script execution failed: ${error.message}`);
      }
    }
    
    return true;
  }

  private matchesEventFilters(eventData: any, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (this.getNestedValue(eventData, key) !== value) {
        return false;
      }
    }
    return true;
  }

  private validateTemplateParameters(template: WorkflowTemplate, parameters: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const param of template.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push({
          field: param.name,
          message: `Required parameter '${param.name}' is missing`,
          code: 'MISSING_REQUIRED_PARAMETER',
        });
      }
      
      if (param.name in parameters) {
        const value = parameters[param.name];
        const isValidType = this.validateParameterType(value, param.type);
        
        if (!isValidType) {
          errors.push({
            field: param.name,
            message: `Parameter '${param.name}' must be of type ${param.type}`,
            code: 'INVALID_PARAMETER_TYPE',
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validateParameterType(value: any, type: string): boolean {
    switch (type) {
      case 'STRING':
        return typeof value === 'string';
      case 'NUMBER':
        return typeof value === 'number';
      case 'BOOLEAN':
        return typeof value === 'boolean';
      case 'DATE':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'LIST':
        return Array.isArray(value);
      case 'OBJECT':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }

  private instantiateRuleFromTemplate(template: WorkflowTemplate, parameters: Record<string, any>): Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'> {
    // Deep clone template rule and substitute parameters
    const rule = JSON.parse(JSON.stringify(template.template));
    
    // Replace parameter placeholders throughout the rule
    this.substituteParameters(rule, parameters);
    
    return rule;
  }

  private substituteParameters(obj: any, parameters: Record<string, any>): void {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, parameters);
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.substituteParameters(item, parameters));
      return;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.substituteParameters(value, parameters);
      }
    }
    
    return obj;
  }

  private addExecutionLog(execution: WorkflowExecution, level: ExecutionLog['level'], message: string, data?: any): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data,
    });
  }

  private initializeBuiltInTemplates(): void {
    // Initialize common workflow templates
    const approvalTemplate: WorkflowTemplate = {
      id: 'approval-workflow',
      name: 'Document Approval Workflow',
      description: 'Standard approval workflow for documents',
      category: 'APPROVAL',
      template: {
        id: '',
        name: '{{documentType}} Approval',
        description: 'Approval workflow for {{documentType}}',
        trigger: {
          type: 'EVENT',
          config: {
            eventType: 'document.created',
            sourceSystem: 'document-management',
            filters: { type: '{{documentType}}' },
          },
        },
        conditions: [
          {
            type: 'AND',
            field: 'document.requiresApproval',
            operator: 'EQUALS',
            value: true,
          },
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              to: '{{approverEmail}}',
              subject: 'Approval Required: {{document.name}}',
              template: 'Please review and approve the attached document.',
            },
            order: 1,
          },
        ],
        enabled: true,
        priority: 5,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        executionCount: 0,
      },
      parameters: [
        {
          name: 'documentType',
          type: 'STRING',
          required: true,
          description: 'Type of document requiring approval',
        },
        {
          name: 'approverEmail',
          type: 'STRING',
          required: true,
          description: 'Email address of the approver',
        },
      ],
      tags: ['approval', 'document', 'workflow'],
      popularity: 100,
      createdBy: 'system',
      isPublic: true,
    };
    
    this.templates.set(approvalTemplate.id, approvalTemplate);
  }

  private startEngineServices(): void {
    this.scheduler.start();
    
    // Start execution cleanup (remove old executions)
    setInterval(() => {
      this.cleanupOldExecutions();
    }, 3600000); // Every hour
  }

  private cleanupOldExecutions(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // Keep executions for 30 days
    
    for (const [id, execution] of this.executions.entries()) {
      if (execution.startedAt < cutoff) {
        this.executions.delete(id);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  private interpolateTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      return this.getNestedValue(context, key)?.toString() || match;
    });
  }

  private deepEquals(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private generateId(): string {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting Classes
class WorkflowScheduler {
  private service: WorkflowAutomationService;
  private scheduledJobs: Map<string, any> = new Map();

  constructor(service: WorkflowAutomationService) {
    this.service = service;
  }

  start(): void {
    // Start scheduler
  }

  async addScheduledRule(rule: WorkflowRule): Promise<void> {
    const config = rule.trigger.config as ScheduleTrigger['config'];
    
    if (config.cronExpression) {
      // Setup cron job
      const job = this.createCronJob(config.cronExpression, () => {
        this.service.executeRule(rule.id);
      });
      
      this.scheduledJobs.set(rule.id, job);
    } else if (config.interval) {
      // Setup interval job
      const job = setInterval(() => {
        this.service.executeRule(rule.id);
      }, config.interval);
      
      this.scheduledJobs.set(rule.id, job);
    }
  }

  async removeScheduledRule(ruleId: string): Promise<void> {
    const job = this.scheduledJobs.get(ruleId);
    if (job) {
      if (typeof job === 'number') {
        clearInterval(job);
      } else {
        // Stop cron job
        job.stop?.();
      }
      
      this.scheduledJobs.delete(ruleId);
    }
  }

  private createCronJob(expression: string, callback: () => void): any {
    // Mock cron job - use actual cron library in production
    return {
      stop: () => {},
    };
  }
}

class WorkflowExecutor {
  private service: WorkflowAutomationService;

  constructor(service: WorkflowAutomationService) {
    this.service = service;
  }
}

class WorkflowValidator {
  async validate(rule: WorkflowRule): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Rule name is required',
        code: 'MISSING_NAME',
      });
    }

    if (!rule.trigger) {
      errors.push({
        field: 'trigger',
        message: 'Rule trigger is required',
        code: 'MISSING_TRIGGER',
      });
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push({
        field: 'actions',
        message: 'At least one action is required',
        code: 'MISSING_ACTIONS',
      });
    }

    // Performance warnings
    if (rule.actions && rule.actions.length > 10) {
      warnings.push({
        field: 'actions',
        message: 'Large number of actions may impact performance',
        suggestion: 'Consider breaking into multiple rules',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

class WorkflowBuilderImpl implements WorkflowBuilder {
  createRule(): WorkflowRuleBuilder {
    return new WorkflowRuleBuilderImpl();
  }

  createTemplate(): WorkflowTemplateBuilder {
    return new WorkflowTemplateBuilderImpl();
  }

  validateRule(rule: WorkflowRule): ValidationResult {
    const validator = new WorkflowValidator();
    return validator.validate(rule);
  }

  estimateExecution(rule: WorkflowRule): ExecutionEstimate {
    return {
      estimatedDuration: rule.actions.length * 1000, // 1 second per action
      resourceRequirements: {
        cpu: 0.1,
        memory: 50, // MB
        storage: 10, // MB
        network: 1, // MB
      },
      cost: 0.01, // USD
      dependencies: [],
    };
  }
}

class WorkflowRuleBuilderImpl implements WorkflowRuleBuilder {
  private rule: Partial<WorkflowRule> = {
    conditions: [],
    actions: [],
    enabled: true,
    priority: 5,
  };

  setName(name: string): this {
    this.rule.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.rule.description = description;
    return this;
  }

  addTrigger(trigger: WorkflowTrigger): this {
    this.rule.trigger = trigger;
    return this;
  }

  addCondition(condition: WorkflowCondition): this {
    if (!this.rule.conditions) this.rule.conditions = [];
    this.rule.conditions.push(condition);
    return this;
  }

  addAction(action: WorkflowAction): this {
    if (!this.rule.actions) this.rule.actions = [];
    this.rule.actions.push(action);
    return this;
  }

  setPriority(priority: number): this {
    this.rule.priority = priority;
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.rule.enabled = enabled;
    return this;
  }

  build(): WorkflowRule {
    if (!this.rule.name || !this.rule.trigger || !this.rule.actions?.length) {
      throw new Error('Rule must have name, trigger, and at least one action');
    }

    return {
      ...this.rule,
      id: '',
      createdBy: 'builder',
      createdAt: new Date(),
      lastModified: new Date(),
      executionCount: 0,
    } as WorkflowRule;
  }
}

class WorkflowTemplateBuilderImpl implements WorkflowTemplateBuilder {
  private template: Partial<WorkflowTemplate> = {
    parameters: [],
    tags: [],
    popularity: 0,
    isPublic: false,
  };

  setName(name: string): this {
    this.template.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.template.description = description;
    return this;
  }

  setCategory(category: WorkflowCategory): this {
    this.template.category = category;
    return this;
  }

  addParameter(parameter: TemplateParameter): this {
    if (!this.template.parameters) this.template.parameters = [];
    this.template.parameters.push(parameter);
    return this;
  }

  setRule(rule: WorkflowRule): this {
    this.template.template = rule;
    return this;
  }

  build(): WorkflowTemplate {
    if (!this.template.name || !this.template.template) {
      throw new Error('Template must have name and rule template');
    }

    return {
      ...this.template,
      id: '',
      createdBy: 'builder',
    } as WorkflowTemplate;
  }
}

export default WorkflowAutomationService;