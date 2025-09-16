/**
 * Prompt Template Management System
 * Manages reusable, versioned prompt templates for investment analysis
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';

export type TemplateId = string & { __brand: 'TemplateId' };
export type TemplateCategory = 
  | 'analysis' 
  | 'comparison' 
  | 'summary' 
  | 'extraction' 
  | 'validation' 
  | 'report'
  | 'board_pack'
  | 'peer_analysis'
  | 'thesis_review';

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
  examples?: any[];
}

export interface PromptTemplate {
  id: TemplateId;
  name: string;
  description: string;
  category: TemplateCategory;
  version: string;
  
  // Template content
  systemPrompt?: string;
  userPrompt: string;
  assistantPrompt?: string; // For few-shot examples
  
  // Variables that can be replaced in the template
  variables: PromptVariable[];
  
  // Configuration
  config: {
    model?: 'gpt-4' | 'claude-3' | 'any';
    temperature?: number;
    maxTokens?: number;
    requireCitations?: boolean;
    outputFormat?: 'text' | 'json' | 'markdown' | 'table';
  };
  
  // Examples
  examples?: Array<{
    input: Record<string, any>;
    expectedOutput: string;
  }>;
  
  // Metadata
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  successRate?: number;
  averageConfidence?: number;
  
  // A/B testing
  isActive: boolean;
  testingVariant?: string;
  performanceMetrics?: {
    avgProcessingTime: number;
    avgTokensUsed: number;
    avgCost: number;
  };
}

export interface TemplateExecution {
  id: string;
  templateId: TemplateId;
  userId: string;
  
  // Input and output
  variables: Record<string, any>;
  generatedPrompt: string;
  response?: string;
  
  // Metrics
  executedAt: Date;
  processingTime?: number;
  tokensUsed?: number;
  cost?: number;
  confidence?: number;
  
  // Feedback
  wasHelpful?: boolean;
  feedback?: string;
  error?: string;
}

export class PromptTemplateManager {
  private templates: Map<TemplateId, PromptTemplate>;
  private executionHistory: TemplateExecution[];
  private templateVariants: Map<string, TemplateId[]>; // For A/B testing

  constructor() {
    this.templates = new Map();
    this.executionHistory = [];
    this.templateVariants = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize with default investment analysis templates
   */
  private initializeDefaultTemplates(): void {
    // Document Analysis Template
    this.createTemplate({
      name: 'Investment Trust Annual Report Analysis',
      description: 'Comprehensive analysis of investment trust annual reports',
      category: 'analysis',
      version: '1.0.0',
      systemPrompt: `You are an expert investment analyst specializing in investment trusts. 
Analyze documents thoroughly and provide insights based solely on the provided information. 
Always cite specific page numbers for any claims or data points.`,
      userPrompt: `Analyze the annual report for {{trustName}} and provide:

1. KEY PERFORMANCE METRICS:
   - NAV total return
   - Share price total return
   - Discount/premium evolution
   - Dividend coverage

2. PORTFOLIO CHANGES:
   - Major new investments
   - Significant disposals
   - Sector allocation shifts
   - Geographic exposure changes

3. STRATEGIC DEVELOPMENTS:
   - Management commentary highlights
   - Investment strategy updates
   - Risk factors mentioned

4. GOVERNANCE:
   - Board changes
   - Fee modifications
   - Policy updates

5. CONCERNS OR RED FLAGS:
   - Any mentioned challenges
   - Risk warnings
   - Negative developments

Focus on: {{focusAreas}}
Time period: {{period}}

Remember to cite [Page X] for all data points.`,
      variables: [
        {
          name: 'trustName',
          description: 'Name of the investment trust',
          type: 'string',
          required: true,
        },
        {
          name: 'focusAreas',
          description: 'Specific areas to focus on',
          type: 'array',
          required: false,
          defaultValue: ['performance', 'portfolio', 'governance'],
        },
        {
          name: 'period',
          description: 'Reporting period',
          type: 'string',
          required: true,
        },
      ],
      config: {
        model: 'claude-3',
        temperature: 0.1,
        maxTokens: 3000,
        requireCitations: true,
        outputFormat: 'markdown',
      },
      tags: ['annual-report', 'analysis', 'investment-trust'],
      author: 'system',
      isActive: true,
    });

    // Peer Comparison Template
    this.createTemplate({
      name: 'Investment Trust Peer Comparison',
      description: 'Compare multiple investment trusts across key metrics',
      category: 'peer_analysis',
      version: '1.0.0',
      systemPrompt: 'You are an investment analyst comparing peer investment trusts.',
      userPrompt: `Compare the following investment trusts: {{trustNames}}

Create a detailed comparison table including:
1. Performance metrics (1Y, 3Y, 5Y returns)
2. Discount/Premium levels
3. Ongoing charges
4. Dividend yield and coverage
5. Gearing levels
6. Top holdings overlap
7. Geographic exposure
8. Key differentiators

Comparison period: {{period}}
Output format: Markdown table with analysis

Highlight:
- Best performer in each category
- Key advantages of each trust
- Potential concerns for each`,
      variables: [
        {
          name: 'trustNames',
          description: 'List of trust names to compare',
          type: 'array',
          required: true,
          validation: {
            min: 2,
            max: 10,
          },
        },
        {
          name: 'period',
          description: 'Comparison period',
          type: 'string',
          required: true,
        },
      ],
      config: {
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 4000,
        outputFormat: 'markdown',
      },
      tags: ['comparison', 'peer-analysis', 'benchmarking'],
      author: 'system',
      isActive: true,
    });

    // Thesis Monitoring Template
    this.createTemplate({
      name: 'Investment Thesis Quarterly Review',
      description: 'Review investment thesis against recent developments',
      category: 'thesis_review',
      version: '1.0.0',
      userPrompt: `Review the investment thesis for {{trustName}} based on recent developments.

Original Investment Thesis:
{{originalThesis}}

Key Metrics to Monitor:
{{keyMetrics}}

Recent Developments (Last Quarter):
{{recentDevelopments}}

Questions to Answer:
1. Has the investment case changed materially?
2. Are the original assumptions still valid?
3. Have any sell triggers been approached?
4. What are the key risks emerging?
5. Should the position be increased/maintained/reduced?

Provide a clear recommendation with rationale.`,
      variables: [
        {
          name: 'trustName',
          description: 'Name of the investment trust',
          type: 'string',
          required: true,
        },
        {
          name: 'originalThesis',
          description: 'Original investment thesis',
          type: 'string',
          required: true,
        },
        {
          name: 'keyMetrics',
          description: 'Key metrics being monitored',
          type: 'object',
          required: true,
        },
        {
          name: 'recentDevelopments',
          description: 'Recent developments to consider',
          type: 'array',
          required: true,
        },
      ],
      config: {
        temperature: 0.3,
        maxTokens: 2000,
        outputFormat: 'markdown',
      },
      tags: ['thesis', 'review', 'monitoring'],
      author: 'system',
      isActive: true,
    });

    // Board Pack Summarization Template
    this.createTemplate({
      name: 'Board Pack Executive Summary',
      description: 'Summarize 200+ page board pack into key decisions',
      category: 'board_pack',
      version: '1.0.0',
      systemPrompt: `You are preparing an executive summary for board directors. 
Focus on decisions required, key changes, and critical information only.`,
      userPrompt: `Summarize this board pack into a 2-page executive brief:

REQUIRED OUTPUT:
1. DECISIONS REQUIRED (with page references):
   - List each decision needed
   - Recommendation provided
   - Deadline for decision

2. KEY METRICS DASHBOARD:
   {{metricsToTrack}}

3. MATERIAL CHANGES since last meeting:
   - Performance changes >{{materialityThreshold}}%
   - Strategy updates
   - Risk profile changes

4. ITEMS REQUIRING ATTENTION:
   - Red flags
   - Compliance issues
   - Upcoming deadlines

5. CONTRADICTIONS OR INCONSISTENCIES:
   - With previous board decisions
   - Between different sections

Maximum length: {{maxWords}} words
Urgency level for each item: High/Medium/Low`,
      variables: [
        {
          name: 'metricsToTrack',
          description: 'Specific metrics to include in dashboard',
          type: 'array',
          required: true,
          defaultValue: ['NAV', 'Discount', 'Performance', 'Costs'],
        },
        {
          name: 'materialityThreshold',
          description: 'Threshold for material changes (%)',
          type: 'number',
          required: false,
          defaultValue: 5,
        },
        {
          name: 'maxWords',
          description: 'Maximum words for summary',
          type: 'number',
          required: false,
          defaultValue: 800,
        },
      ],
      config: {
        model: 'claude-3',
        temperature: 0.1,
        maxTokens: 2000,
        requireCitations: true,
        outputFormat: 'markdown',
      },
      tags: ['board', 'summary', 'executive'],
      author: 'system',
      isActive: true,
    });
  }

  /**
   * Create a new template
   */
  createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Result<TemplateId> {
    try {
      // Validate template
      const validation = this.validateTemplate(template);
      if (!validation.success) {
        return validation;
      }

      const templateId = this.generateTemplateId();
      const newTemplate: PromptTemplate = {
        ...template,
        id: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      this.templates.set(templateId, newTemplate);

      // Track variants for A/B testing
      if (template.testingVariant) {
        const variants = this.templateVariants.get(template.testingVariant) || [];
        variants.push(templateId);
        this.templateVariants.set(template.testingVariant, variants);
      }

      return ResultUtils.ok(templateId);
    } catch (error) {
      return ResultUtils.fail(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a template with variables
   */
  async executeTemplate(
    templateId: TemplateId,
    variables: Record<string, any>,
    userId: string
  ): Promise<Result<string>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return ResultUtils.fail('Template not found');
      }

      if (!template.isActive) {
        return ResultUtils.fail('Template is not active');
      }

      // Validate variables
      const validation = this.validateVariables(template, variables);
      if (!validation.success) {
        return validation;
      }

      // Generate prompt by replacing variables
      const generatedPrompt = this.generatePrompt(template, variables);

      // Track execution
      const execution: TemplateExecution = {
        id: this.generateExecutionId(),
        templateId,
        userId,
        variables,
        generatedPrompt,
        executedAt: new Date(),
      };

      this.executionHistory.push(execution);

      // Update template usage
      template.usageCount++;
      template.updatedAt = new Date();

      return ResultUtils.ok(generatedPrompt);
    } catch (error) {
      return ResultUtils.fail(`Failed to execute template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template by category
   */
  getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.category === category && t.isActive);
  }

  /**
   * Get template recommendations based on context
   */
  recommendTemplates(context: {
    documentType?: string;
    analysisType?: string;
    userHistory?: string[];
  }): PromptTemplate[] {
    const templates = Array.from(this.templates.values()).filter(t => t.isActive);
    
    // Score templates based on context
    const scored = templates.map(template => {
      let score = 0;
      
      // Check tags match
      if (context.documentType && template.tags.includes(context.documentType)) {
        score += 3;
      }
      
      if (context.analysisType && template.tags.includes(context.analysisType)) {
        score += 2;
      }
      
      // Boost frequently used templates
      if (template.usageCount > 10) {
        score += 1;
      }
      
      // Boost high success rate templates
      if (template.successRate && template.successRate > 0.8) {
        score += 2;
      }
      
      return { template, score };
    });
    
    // Sort by score and return top 5
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.template);
  }

  /**
   * Update template performance metrics
   */
  updateTemplateMetrics(
    executionId: string,
    metrics: {
      processingTime: number;
      tokensUsed: number;
      cost: number;
      confidence: number;
      wasHelpful: boolean;
    }
  ): Result<void> {
    const execution = this.executionHistory.find(e => e.id === executionId);
    if (!execution) {
      return ResultUtils.fail('Execution not found');
    }

    // Update execution
    execution.processingTime = metrics.processingTime;
    execution.tokensUsed = metrics.tokensUsed;
    execution.cost = metrics.cost;
    execution.confidence = metrics.confidence;
    execution.wasHelpful = metrics.wasHelpful;

    // Update template metrics
    const template = this.templates.get(execution.templateId);
    if (template) {
      // Update success rate
      const relevantExecutions = this.executionHistory.filter(
        e => e.templateId === execution.templateId && e.wasHelpful !== undefined
      );
      const successCount = relevantExecutions.filter(e => e.wasHelpful).length;
      template.successRate = successCount / relevantExecutions.length;

      // Update average confidence
      const confidences = relevantExecutions
        .filter(e => e.confidence !== undefined)
        .map(e => e.confidence!);
      if (confidences.length > 0) {
        template.averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      }

      // Update performance metrics
      if (!template.performanceMetrics) {
        template.performanceMetrics = {
          avgProcessingTime: 0,
          avgTokensUsed: 0,
          avgCost: 0,
        };
      }

      const recentExecutions = this.executionHistory
        .filter(e => e.templateId === execution.templateId)
        .slice(-20); // Last 20 executions

      template.performanceMetrics.avgProcessingTime = 
        recentExecutions.reduce((sum, e) => sum + (e.processingTime || 0), 0) / recentExecutions.length;
      template.performanceMetrics.avgTokensUsed = 
        recentExecutions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0) / recentExecutions.length;
      template.performanceMetrics.avgCost = 
        recentExecutions.reduce((sum, e) => sum + (e.cost || 0), 0) / recentExecutions.length;
    }

    return ResultUtils.ok();
  }

  /**
   * A/B test templates
   */
  selectTemplateVariant(variantGroup: string): TemplateId | null {
    const variants = this.templateVariants.get(variantGroup);
    if (!variants || variants.length === 0) {
      return null;
    }

    // Simple random selection for now
    // In production, would use more sophisticated selection (e.g., Thompson sampling)
    const index = Math.floor(Math.random() * variants.length);
    return variants[index];
  }

  /**
   * Clone template for modification
   */
  cloneTemplate(templateId: TemplateId, modifications: Partial<PromptTemplate>): Result<TemplateId> {
    const original = this.templates.get(templateId);
    if (!original) {
      return ResultUtils.fail('Template not found');
    }

    const cloned = {
      ...original,
      ...modifications,
      name: modifications.name || `${original.name} (Copy)`,
      version: this.incrementVersion(original.version),
      usageCount: 0,
      successRate: undefined,
      averageConfidence: undefined,
    };

    return this.createTemplate(cloned);
  }

  // Private helper methods

  private validateTemplate(template: Partial<PromptTemplate>): Result<void> {
    if (!template.name || template.name.trim().length === 0) {
      return ResultUtils.fail('Template name is required');
    }

    if (!template.userPrompt || template.userPrompt.trim().length === 0) {
      return ResultUtils.fail('User prompt is required');
    }

    if (!template.category) {
      return ResultUtils.fail('Category is required');
    }

    // Validate variables in prompt
    const variablePattern = /\{\{(\w+)\}\}/g;
    const promptVariables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template.userPrompt)) !== null) {
      promptVariables.add(match[1]);
    }

    // Check all prompt variables are defined
    for (const varName of promptVariables) {
      if (!template.variables?.find(v => v.name === varName)) {
        return ResultUtils.fail(`Variable '${varName}' used in prompt but not defined`);
      }
    }

    return ResultUtils.ok();
  }

  private validateVariables(template: PromptTemplate, variables: Record<string, any>): Result<void> {
    for (const varDef of template.variables) {
      const value = variables[varDef.name];

      // Check required variables
      if (varDef.required && (value === undefined || value === null)) {
        return ResultUtils.fail(`Required variable '${varDef.name}' is missing`);
      }

      // Skip validation if not required and not provided
      if (!varDef.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (varDef.type === 'number' && typeof value !== 'number') {
        return ResultUtils.fail(`Variable '${varDef.name}' must be a number`);
      }

      if (varDef.type === 'array' && !Array.isArray(value)) {
        return ResultUtils.fail(`Variable '${varDef.name}' must be an array`);
      }

      // Additional validation
      if (varDef.validation) {
        if (varDef.validation.min !== undefined && value < varDef.validation.min) {
          return ResultUtils.fail(`Variable '${varDef.name}' must be at least ${varDef.validation.min}`);
        }

        if (varDef.validation.max !== undefined && value > varDef.validation.max) {
          return ResultUtils.fail(`Variable '${varDef.name}' must be at most ${varDef.validation.max}`);
        }

        if (varDef.validation.enum && !varDef.validation.enum.includes(value)) {
          return ResultUtils.fail(`Variable '${varDef.name}' must be one of: ${varDef.validation.enum.join(', ')}`);
        }

        if (varDef.validation.pattern) {
          const regex = new RegExp(varDef.validation.pattern);
          if (!regex.test(value)) {
            return ResultUtils.fail(`Variable '${varDef.name}' does not match required pattern`);
          }
        }
      }
    }

    return ResultUtils.ok();
  }

  private generatePrompt(template: PromptTemplate, variables: Record<string, any>): string {
    let prompt = template.userPrompt;

    // Replace variables with defaults if not provided
    for (const varDef of template.variables) {
      const value = variables[varDef.name] ?? varDef.defaultValue;
      
      if (value !== undefined) {
        const placeholder = `{{${varDef.name}}}`;
        const replacement = Array.isArray(value) ? value.join(', ') : String(value);
        prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement);
      }
    }

    return prompt;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private generateTemplateId(): TemplateId {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as TemplateId;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}