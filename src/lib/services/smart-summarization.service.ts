/**
 * Smart Document Summarization Engine
 * Advanced AI-powered summarization with priority scoring and context awareness
 */

import { BaseService } from './base.service'
import { aiDocumentIntelligenceService } from './ai-document-intelligence.service'
import type {
  DocumentSummary,
  ActionItem,
  RiskFactor,
  DocumentMetadata,
  ProcessingProgress
} from '@/types/document-intelligence'
import type { Result } from '@/lib/repositories/result'
import { success, failure, wrapAsync } from '@/lib/repositories/result'

interface SummarizationRequest {
  documentId: string
  summaryTypes: Array<'executive' | 'detailed' | 'key-insights' | 'action-items' | 'risk-assessment'>
  options: {
    priorityScoring?: boolean
    maxLength?: 'short' | 'medium' | 'long'
    targetAudience?: 'board' | 'executives' | 'managers' | 'analysts'
    focusAreas?: string[]
    includeMetrics?: boolean
    customInstructions?: string
  }
}

interface SummarizationResult {
  summaries: DocumentSummary[]
  overallPriorityScore: number
  keyInsights: ExtractedInsight[]
  actionItems: ActionItem[]
  riskFactors: RiskFactor[]
  readingTimeEstimate: number
  complexity: ComplexityAnalysis
}

interface ExtractedInsight {
  id: string
  category: 'strategic' | 'financial' | 'operational' | 'risk' | 'opportunity'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  supportingEvidence: string[]
  source: { page?: number; section?: string }
}

interface ComplexityAnalysis {
  overall: number // 1-10 scale
  factors: {
    vocabularyComplexity: number
    sentenceComplexity: number
    conceptualComplexity: number
    technicalComplexity: number
  }
  readingLevel: string
  estimatedExpertiseRequired: 'basic' | 'intermediate' | 'advanced' | 'expert'
}

export class SmartSummarizationService extends BaseService {
  private progressCallbacks: Map<string, (progress: ProcessingProgress) => void> = new Map()

  // ========================================
  // MAIN SUMMARIZATION API
  // ========================================

  async generateSmartSummary(
    request: SummarizationRequest,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Result<SummarizationResult>> {
    return wrapAsync(async () => {
      const { documentId, summaryTypes, options } = request

      if (onProgress) {
        this.progressCallbacks.set(documentId, onProgress)
      }

      // Step 1: Document preprocessing and analysis
      this.updateProgress(documentId, 'analyzing', 10)
      const document = await this.getDocumentMetadata(documentId)
      const complexity = await this.analyzeDocumentComplexity(document)

      // Step 2: Generate multiple summaries concurrently
      this.updateProgress(documentId, 'summarizing', 30)
      const summaries = await this.generateMultipleSummaries(document, summaryTypes, options)

      // Step 3: Extract cross-cutting insights
      this.updateProgress(documentId, 'analyzing', 60)
      const insights = await this.extractCrossCuttingInsights(summaries, document)

      // Step 4: Consolidate action items and risks
      this.updateProgress(documentId, 'analyzing', 80)
      const consolidatedActionItems = this.consolidateActionItems(summaries)
      const consolidatedRiskFactors = this.consolidateRiskFactors(summaries)

      // Step 5: Calculate overall priority score
      const overallPriorityScore = options.priorityScoring 
        ? await this.calculateOverallPriority(summaries, insights, document)
        : 5

      // Step 6: Generate final result
      this.updateProgress(documentId, 'indexing', 100)
      
      const result: SummarizationResult = {
        summaries,
        overallPriorityScore,
        keyInsights: insights,
        actionItems: consolidatedActionItems,
        riskFactors: consolidatedRiskFactors,
        readingTimeEstimate: this.calculateReadingTime(summaries),
        complexity
      }

      this.progressCallbacks.delete(documentId)
      return result
    })
  }

  // ========================================
  // BOARD PACK SUMMARIZATION
  // ========================================

  async summarizeBoardPack(
    documentIds: string[],
    options: {
      generateExecutiveSummary: boolean
      prioritizeByUrgency: boolean
      includeRiskDashboard: boolean
      maxSummaryLength: number
    }
  ): Promise<Result<{
    executiveSummary?: string
    documentSummaries: DocumentSummary[]
    priorityRanking: Array<{ documentId: string; priority: number; rationale: string }>
    riskDashboard?: RiskDashboard
    keyDecisionPoints: DecisionPoint[]
    recommendedActions: RecommendedAction[]
  }>> {
    return wrapAsync(async () => {
      const documentSummaries: DocumentSummary[] = []
      const allRisks: RiskFactor[] = []
      const allActions: ActionItem[] = []

      // Process each document
      for (const documentId of documentIds) {
        const summaryResult = await this.generateSmartSummary({
          documentId,
          summaryTypes: ['executive', 'key-insights', 'risk-assessment'],
          options: {
            priorityScoring: options.prioritizeByUrgency,
            targetAudience: 'board',
            maxLength: 'medium'
          }
        })

        if (summaryResult.success) {
          documentSummaries.push(...summaryResult.data.summaries)
          allRisks.push(...summaryResult.data.riskFactors)
          allActions.push(...summaryResult.data.actionItems)
        }
      }

      // Generate priority ranking
      const priorityRanking = await this.rankDocumentsByPriority(documentSummaries)

      // Generate executive summary
      let executiveSummary: string | undefined
      if (options.generateExecutiveSummary) {
        executiveSummary = await this.generateBoardPackExecutiveSummary(
          documentSummaries,
          allRisks,
          allActions,
          options.maxSummaryLength
        )
      }

      // Generate risk dashboard
      let riskDashboard: RiskDashboard | undefined
      if (options.includeRiskDashboard) {
        riskDashboard = await this.generateRiskDashboard(allRisks)
      }

      // Extract key decision points
      const keyDecisionPoints = await this.extractKeyDecisionPoints(documentSummaries)

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(
        allActions,
        allRisks,
        keyDecisionPoints
      )

      return {
        executiveSummary,
        documentSummaries,
        priorityRanking,
        riskDashboard,
        keyDecisionPoints,
        recommendedActions
      }
    })
  }

  // ========================================
  // ADVANCED EXTRACTION METHODS
  // ========================================

  async extractKeyInsights(
    documentId: string,
    focusAreas?: string[]
  ): Promise<Result<ExtractedInsight[]>> {
    return wrapAsync(async () => {
      const document = await this.getDocumentMetadata(documentId)
      const content = await this.getDocumentContent(documentId)

      const extractionPrompt = this.buildInsightExtractionPrompt(
        document,
        content,
        focusAreas
      )

      const response = await aiDocumentIntelligenceService['openRouter'].chat({
        model: 'anthropic/claude-3-opus',
        messages: [
          {
            role: 'system',
            content: `You are an expert business analyst specializing in extracting strategic insights from business documents.
                     Focus on identifying insights that are actionable, strategic, and valuable for executive decision-making.
                     Prioritize insights by potential impact and urgency.`
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })

      const insights = this.parseInsightsResponse(response.choices[0].message.content)
      return insights
    })
  }

  async extractActionItems(
    summaryContent: string,
    documentMetadata?: DocumentMetadata
  ): Promise<ActionItem[]> {
    const actionPrompt = `
Analyze the following summary and extract specific, actionable items:

${summaryContent}

Extract action items that are:
1. Specific and measurable
2. Have clear ownership or responsible parties
3. Include deadlines or timeframes when mentioned
4. Are prioritized by urgency and importance

Format as JSON array with the following structure:
[
  {
    "description": "specific action description",
    "priority": "critical|high|medium|low",
    "dueDate": "ISO date or null",
    "assignedTo": "person/role or null",
    "source": {
      "page": number or null,
      "section": "section name or null",
      "quote": "relevant quote"
    }
  }
]
`

    try {
      const response = await aiDocumentIntelligenceService['openRouter'].chat({
        model: 'anthropic/claude-3-opus',
        messages: [{ role: 'user', content: actionPrompt }],
        max_tokens: 1500,
        temperature: 0.1
      })

      const actionItems = JSON.parse(response.choices[0].message.content)
      return actionItems.map((item: any, index: number) => ({
        id: `action_${Date.now()}_${index}`,
        description: item.description,
        priority: item.priority || 'medium',
        dueDate: item.dueDate,
        assignedTo: item.assignedTo,
        status: 'pending',
        source: item.source || {}
      }))
    } catch (error) {
      console.error('Error extracting action items:', error)
      return []
    }
  }

  async extractRiskFactors(
    summaryContent: string,
    documentMetadata?: DocumentMetadata
  ): Promise<RiskFactor[]> {
    const riskPrompt = `
Analyze the following summary and identify potential risk factors:

${summaryContent}

Extract risks that are:
1. Clearly articulated with potential impact
2. Categorized appropriately (financial, legal, operational, etc.)
3. Assessed for severity and likelihood
4. Include specific mitigation suggestions where possible

Format as JSON array with the following structure:
[
  {
    "category": "financial|legal|operational|compliance|strategic",
    "description": "clear risk description",
    "severity": "critical|high|medium|low",
    "likelihood": "very-likely|likely|possible|unlikely",
    "impact": "potential impact description",
    "mitigation": "suggested mitigation or null",
    "source": {
      "page": number or null,
      "section": "section name or null",
      "quote": "relevant quote"
    }
  }
]
`

    try {
      const response = await aiDocumentIntelligenceService['openRouter'].chat({
        model: 'anthropic/claude-3-opus',
        messages: [{ role: 'user', content: riskPrompt }],
        max_tokens: 1500,
        temperature: 0.1
      })

      const riskFactors = JSON.parse(response.choices[0].message.content)
      return riskFactors.map((risk: any, index: number) => ({
        id: `risk_${Date.now()}_${index}`,
        category: risk.category,
        description: risk.description,
        severity: risk.severity,
        likelihood: risk.likelihood,
        impact: risk.impact,
        mitigation: risk.mitigation,
        source: risk.source || {}
      }))
    } catch (error) {
      console.error('Error extracting risk factors:', error)
      return []
    }
  }

  // ========================================
  // PRIORITY SCORING ALGORITHMS
  // ========================================

  private async calculateOverallPriority(
    summaries: DocumentSummary[],
    insights: ExtractedInsight[],
    document: DocumentMetadata
  ): Promise<number> {
    let score = 5 // Base score

    // Document type weighting
    const typeWeights: Record<string, number> = {
      'financial-report': 9,
      'contract': 8,
      'legal-document': 8,
      'compliance-report': 7,
      'board-minutes': 7,
      'strategy-document': 6,
      'policy': 5,
      'memo': 4
    }

    score += (typeWeights[document.fileType] || 5) * 0.3

    // Urgency from action items
    const urgentActions = summaries
      .flatMap(s => s.actionItems)
      .filter(a => a.priority === 'critical' || a.priority === 'high')
    score += Math.min(urgentActions.length * 0.5, 2)

    // Risk severity
    const criticalRisks = summaries
      .flatMap(s => s.riskFactors)
      .filter(r => r.severity === 'critical')
    score += Math.min(criticalRisks.length * 0.8, 2)

    // Insight impact
    const highImpactInsights = insights.filter(i => i.impact === 'critical' || i.impact === 'high')
    score += Math.min(highImpactInsights.length * 0.3, 1.5)

    // Time sensitivity (if document has recent dates or deadlines)
    const timeScore = await this.calculateTimeSensitivity(summaries)
    score += timeScore

    return Math.min(Math.max(Math.round(score), 1), 10)
  }

  private async calculateTimeSensitivity(summaries: DocumentSummary[]): Promise<number> {
    const now = new Date()
    const allActions = summaries.flatMap(s => s.actionItems)
    
    let urgencyScore = 0
    
    for (const action of allActions) {
      if (action.dueDate) {
        const dueDate = new Date(action.dueDate)
        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysUntilDue <= 7) urgencyScore += 1.5
        else if (daysUntilDue <= 30) urgencyScore += 1
        else if (daysUntilDue <= 90) urgencyScore += 0.5
      }
    }
    
    return Math.min(urgencyScore, 3)
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private async generateMultipleSummaries(
    document: DocumentMetadata,
    summaryTypes: string[],
    options: any
  ): Promise<DocumentSummary[]> {
    const summaries: DocumentSummary[] = []

    for (const summaryType of summaryTypes) {
      const summaryResult = await aiDocumentIntelligenceService.generateSmartSummary(
        document.id,
        {
          summaryType: summaryType as any,
          priorityScoring: options.priorityScoring,
          maxLength: this.mapMaxLength(options.maxLength),
          customPrompt: this.buildCustomPrompt(summaryType, options),
          includeMetrics: options.includeMetrics
        }
      )

      if (summaryResult.success) {
        summaries.push(summaryResult.data)
      }
    }

    return summaries
  }

  private async extractCrossCuttingInsights(
    summaries: DocumentSummary[],
    document: DocumentMetadata
  ): Promise<ExtractedInsight[]> {
    // Combine all summary content
    const combinedContent = summaries.map(s => s.content).join('\n\n')
    
    // Extract insights that appear across multiple summaries
    const insightPrompt = `
Analyze the following summaries and identify key cross-cutting insights:

${combinedContent}

Focus on insights that:
1. Appear across multiple summary types
2. Have strategic importance
3. Require executive attention
4. Present opportunities or risks

Return as JSON array of insights with impact scoring.
`

    try {
      const response = await aiDocumentIntelligenceService['openRouter'].chat({
        model: 'anthropic/claude-3-opus',
        messages: [{ role: 'user', content: insightPrompt }],
        max_tokens: 1500,
        temperature: 0.1
      })

      return this.parseInsightsResponse(response.choices[0].message.content)
    } catch (error) {
      console.error('Error extracting cross-cutting insights:', error)
      return []
    }
  }

  private consolidateActionItems(summaries: DocumentSummary[]): ActionItem[] {
    const allActions = summaries.flatMap(s => s.actionItems)
    
    // Remove duplicates and merge similar actions
    const consolidated: ActionItem[] = []
    const seen = new Set<string>()
    
    for (const action of allActions) {
      const key = action.description.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        consolidated.push(action)
      }
    }
    
    // Sort by priority
    return consolidated.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private consolidateRiskFactors(summaries: DocumentSummary[]): RiskFactor[] {
    const allRisks = summaries.flatMap(s => s.riskFactors)
    
    // Similar consolidation logic as action items
    const consolidated: RiskFactor[] = []
    const seen = new Set<string>()
    
    for (const risk of allRisks) {
      const key = `${risk.category}-${risk.description.toLowerCase().trim()}`
      if (!seen.has(key)) {
        seen.add(key)
        consolidated.push(risk)
      }
    }
    
    // Sort by severity
    return consolidated.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  private calculateReadingTime(summaries: DocumentSummary[]): number {
    const totalWords = summaries.reduce((sum, s) => sum + s.metadata.wordCount, 0)
    return Math.ceil(totalWords / 200) // Assuming 200 words per minute reading speed
  }

  private async analyzeDocumentComplexity(document: DocumentMetadata): Promise<ComplexityAnalysis> {
    // This would be implemented with actual NLP analysis
    // For now, return a mock complexity analysis
    return {
      overall: document.complexity || 5,
      factors: {
        vocabularyComplexity: 6,
        sentenceComplexity: 5,
        conceptualComplexity: 7,
        technicalComplexity: 6
      },
      readingLevel: 'Advanced',
      estimatedExpertiseRequired: 'intermediate'
    }
  }

  private updateProgress(documentId: string, stage: ProcessingProgress['stage'], progress: number): void {
    const callback = this.progressCallbacks.get(documentId)
    if (callback) {
      callback({
        documentId,
        stage,
        progress,
        estimatedTimeRemaining: Math.max(0, (100 - progress) * 2) // 2 seconds per percent remaining
      })
    }
  }

  private parseInsightsResponse(content: string): ExtractedInsight[] {
    try {
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed.map((insight, index) => ({
        id: `insight_${Date.now()}_${index}`,
        category: insight.category || 'strategic',
        title: insight.title || 'Insight',
        description: insight.description || '',
        impact: insight.impact || 'medium',
        confidence: insight.confidence || 0.8,
        supportingEvidence: insight.supportingEvidence || [],
        source: insight.source || {}
      })) : []
    } catch {
      return []
    }
  }

  // Mock implementations for database operations
  private async getDocumentMetadata(documentId: string): Promise<DocumentMetadata> {
    return {
      id: documentId,
      filename: `document_${documentId}.pdf`,
      fileType: 'pdf',
      fileSize: 1024 * 1024,
      totalPages: 50,
      uploadedAt: new Date().toISOString(),
      processed: true,
      complexity: 6
    }
  }

  private async getDocumentContent(documentId: string): Promise<string> {
    return "Mock document content for processing..."
  }

  private buildInsightExtractionPrompt(
    document: DocumentMetadata,
    content: string,
    focusAreas?: string[]
  ): string {
    return `
Extract key strategic insights from this document:

Document: ${document.filename}
${focusAreas ? `Focus Areas: ${focusAreas.join(', ')}` : ''}

Content: ${content.substring(0, 4000)}...

Return insights as JSON array focusing on strategic, financial, operational, risk, and opportunity categories.
`
  }

  private buildCustomPrompt(summaryType: string, options: any): string {
    const audienceInstructions = {
      'board': 'Focus on strategic decisions, governance, and high-level oversight requirements.',
      'executives': 'Emphasize operational implications, resource requirements, and implementation considerations.',
      'managers': 'Highlight tactical execution steps, resource allocation, and team coordination needs.',
      'analysts': 'Provide detailed analysis, data interpretation, and technical insights.'
    }

    return `
Target Audience: ${options.targetAudience || 'board'}
${audienceInstructions[options.targetAudience] || audienceInstructions['board']}

${options.focusAreas ? `Key Focus Areas: ${options.focusAreas.join(', ')}` : ''}
${options.customInstructions || ''}
`
  }

  private mapMaxLength(maxLength?: string): number {
    switch (maxLength) {
      case 'short': return 500
      case 'medium': return 1000
      case 'long': return 2000
      default: return 1000
    }
  }

  // Additional mock methods would be implemented here...
  private async rankDocumentsByPriority(summaries: DocumentSummary[]): Promise<Array<{ documentId: string; priority: number; rationale: string }>> {
    return summaries.map(s => ({
      documentId: s.documentId,
      priority: s.priorityScore || 5,
      rationale: `Priority based on ${s.riskFactors.length} risk factors and ${s.actionItems.length} action items`
    }))
  }
}

// Supporting interfaces
interface RiskDashboard {
  totalRisks: number
  risksByCategory: Record<string, number>
  criticalRisks: RiskFactor[]
  riskTrends: Array<{ category: string; trend: 'up' | 'down' | 'stable' }>
}

interface DecisionPoint {
  id: string
  title: string
  description: string
  options: Array<{ title: string; pros: string[]; cons: string[] }>
  recommendation?: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

interface RecommendedAction {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: string
  expectedImpact: string
  dependencies: string[]
  risks: string[]
}

export const smartSummarizationService = new SmartSummarizationService()