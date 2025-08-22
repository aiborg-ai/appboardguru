/**
 * Smart Sharing Service
 * Implements intelligent sharing rules during upload process
 */

import { BaseService } from './base.service'
import { Result, Ok, Err } from '../result'
import { SmartSharingRule, UploadedAsset } from '@/types/collaboration'
import { UserId, OrganizationId, VaultId } from '@/types/branded'
import { FileUploadItem } from '@/types/upload'

interface SmartSharingContext {
  asset: UploadedAsset
  uploader: {
    id: UserId
    name: string
    role: string
  }
  organizationId: OrganizationId
  vaultId?: VaultId
  uploadTime: Date
  fileMetadata: {
    category: string
    fileType: string
    keywords: string[]
    size: number
  }
}

interface SmartSharingRecommendation {
  ruleId: string
  ruleName: string
  confidence: number // 0-100
  suggestedUsers: Array<{
    userId: UserId
    userName: string
    reason: string
    permission: 'view' | 'download' | 'edit'
  }>
  autoShare: boolean
  message?: string
}

interface SmartSharingAnalytics {
  totalRulesEvaluated: number
  rulesMatched: number
  usersSharedWith: number
  averageConfidence: number
  processingTime: number
  recommendations: SmartSharingRecommendation[]
}

export class SmartSharingService extends BaseService {
  private rules: SmartSharingRule[] = []
  private analyticsData: SmartSharingAnalytics[] = []

  constructor() {
    super()
    this.loadDefaultRules()
  }

  /**
   * Evaluate smart sharing rules for an uploaded asset
   */
  async evaluateSmartSharing(context: SmartSharingContext): Promise<Result<SmartSharingAnalytics>> {
    const startTime = Date.now()
    
    try {
      const recommendations: SmartSharingRecommendation[] = []
      let totalRulesEvaluated = 0
      let rulesMatched = 0

      for (const rule of this.rules.filter(r => r.enabled)) {
        totalRulesEvaluated++
        const matchResult = this.evaluateRule(rule, context)
        
        if (matchResult.matches) {
          rulesMatched++
          const recommendation = await this.generateRecommendation(rule, context, matchResult.confidence)
          recommendations.push(recommendation)
        }
      }

      const analytics: SmartSharingAnalytics = {
        totalRulesEvaluated,
        rulesMatched,
        usersSharedWith: recommendations.reduce((sum, r) => sum + r.suggestedUsers.length, 0),
        averageConfidence: recommendations.length > 0 
          ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length 
          : 0,
        processingTime: Date.now() - startTime,
        recommendations
      }

      // Store analytics for insights
      this.analyticsData.push(analytics)
      
      return Ok(analytics)
    } catch (error) {
      return Err(error as Error)
    }
  }

  /**
   * Apply automatic sharing based on recommendations
   */
  async applyAutoSharing(
    assetId: string, 
    recommendations: SmartSharingRecommendation[]
  ): Promise<Result<{ shared: number; notifications: number }>> {
    try {
      let totalShared = 0
      let totalNotifications = 0

      const autoShareRecommendations = recommendations.filter(r => r.autoShare)

      for (const recommendation of autoShareRecommendations) {
        // Apply sharing for each recommended user
        for (const user of recommendation.suggestedUsers) {
          const shareResult = await this.shareAssetWithUser(
            assetId,
            user.userId,
            user.permission,
            `Automatically shared based on rule: ${recommendation.ruleName}`
          )

          if (shareResult.success) {
            totalShared++
            
            // Send notification if confidence is high
            if (recommendation.confidence > 80) {
              await this.sendSharingNotification(
                user.userId,
                assetId,
                recommendation.message || `Asset automatically shared with you`
              )
              totalNotifications++
            }
          }
        }
      }

      return Ok({ shared: totalShared, notifications: totalNotifications })
    } catch (error) {
      return Err(error as Error)
    }
  }

  /**
   * Get smart sharing insights and analytics
   */
  getSmartSharingInsights(): Result<{
    totalEvaluations: number
    averageRulesMatched: number
    averageProcessingTime: number
    topPerformingRules: Array<{
      ruleId: string
      ruleName: string
      matchCount: number
      averageConfidence: number
    }>
    categoryAnalytics: Array<{
      category: string
      shareCount: number
      averageConfidence: number
    }>
  }> {
    try {
      const totalEvaluations = this.analyticsData.length
      
      if (totalEvaluations === 0) {
        return Ok({
          totalEvaluations: 0,
          averageRulesMatched: 0,
          averageProcessingTime: 0,
          topPerformingRules: [],
          categoryAnalytics: []
        })
      }

      const averageRulesMatched = this.analyticsData.reduce((sum, a) => sum + a.rulesMatched, 0) / totalEvaluations
      const averageProcessingTime = this.analyticsData.reduce((sum, a) => sum + a.processingTime, 0) / totalEvaluations

      // Analyze rule performance
      const rulePerformance = new Map<string, { matchCount: number; confidenceSum: number }>()
      
      this.analyticsData.forEach(analytics => {
        analytics.recommendations.forEach(rec => {
          const existing = rulePerformance.get(rec.ruleId) || { matchCount: 0, confidenceSum: 0 }
          existing.matchCount++
          existing.confidenceSum += rec.confidence
          rulePerformance.set(rec.ruleId, existing)
        })
      })

      const topPerformingRules = Array.from(rulePerformance.entries())
        .map(([ruleId, stats]) => ({
          ruleId,
          ruleName: this.rules.find(r => r.id === ruleId)?.name || 'Unknown',
          matchCount: stats.matchCount,
          averageConfidence: stats.confidenceSum / stats.matchCount
        }))
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 5)

      return Ok({
        totalEvaluations,
        averageRulesMatched,
        averageProcessingTime,
        topPerformingRules,
        categoryAnalytics: [] // TODO: Implement category analytics
      })
    } catch (error) {
      return Err(error as Error)
    }
  }

  /**
   * Add or update a smart sharing rule
   */
  async addSmartSharingRule(rule: Omit<SmartSharingRule, 'id'>): Promise<Result<SmartSharingRule>> {
    try {
      const newRule: SmartSharingRule = {
        ...rule,
        id: this.generateRuleId()
      }

      this.rules.push(newRule)
      
      // TODO: Persist to database via repository
      
      return Ok(newRule)
    } catch (error) {
      return Err(error as Error)
    }
  }

  /**
   * Get all smart sharing rules
   */
  getSmartSharingRules(): SmartSharingRule[] {
    return [...this.rules]
  }

  /**
   * Enable or disable a smart sharing rule
   */
  async toggleSmartSharingRule(ruleId: string, enabled: boolean): Promise<Result<SmartSharingRule>> {
    try {
      const rule = this.rules.find(r => r.id === ruleId)
      if (!rule) {
        return Err(new Error(`Rule not found: ${ruleId}`))
      }

      rule.enabled = enabled
      
      // TODO: Persist to database via repository
      
      return Ok(rule)
    } catch (error) {
      return Err(error as Error)
    }
  }

  // Private helper methods

  private evaluateRule(rule: SmartSharingRule, context: SmartSharingContext): {
    matches: boolean
    confidence: number
  } {
    let score = 0
    let maxScore = 0

    // Evaluate category condition
    if (rule.condition.category) {
      maxScore += 30
      if (rule.condition.category.includes(context.fileMetadata.category)) {
        score += 30
      }
    }

    // Evaluate file type condition
    if (rule.condition.fileType) {
      maxScore += 25
      if (rule.condition.fileType.includes(context.fileMetadata.fileType)) {
        score += 25
      }
    }

    // Evaluate keywords condition
    if (rule.condition.keywords) {
      maxScore += 25
      const matchingKeywords = rule.condition.keywords.filter(keyword =>
        context.fileMetadata.keywords.some(k => 
          k.toLowerCase().includes(keyword.toLowerCase())
        )
      )
      score += (matchingKeywords.length / rule.condition.keywords.length) * 25
    }

    // Evaluate uploader condition
    if (rule.condition.uploader) {
      maxScore += 20
      if (rule.condition.uploader.includes(context.uploader.id)) {
        score += 20
      }
    }

    // Evaluate size condition
    if (rule.condition.size) {
      maxScore += 10
      const { min, max } = rule.condition.size
      const size = context.fileMetadata.size
      
      if ((!min || size >= min) && (!max || size <= max)) {
        score += 10
      }
    }

    const confidence = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    const matches = confidence >= 50 // Threshold for rule matching

    return { matches, confidence }
  }

  private async generateRecommendation(
    rule: SmartSharingRule,
    context: SmartSharingContext,
    confidence: number
  ): Promise<SmartSharingRecommendation> {
    // TODO: Get actual user data from repository
    const suggestedUsers = rule.action.shareWith.map(userId => ({
      userId,
      userName: `User ${userId}`, // TODO: Get real names
      reason: this.generateSharingReason(rule, context),
      permission: rule.action.permission
    }))

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      confidence,
      suggestedUsers,
      autoShare: rule.action.notify && confidence > 70, // Auto-share if notify enabled and high confidence
      message: rule.action.message
    }
  }

  private generateSharingReason(rule: SmartSharingRule, context: SmartSharingContext): string {
    const reasons = []

    if (rule.condition.category?.includes(context.fileMetadata.category)) {
      reasons.push(`matches category: ${context.fileMetadata.category}`)
    }

    if (rule.condition.fileType?.includes(context.fileMetadata.fileType)) {
      reasons.push(`file type: ${context.fileMetadata.fileType}`)
    }

    if (rule.condition.keywords?.some(k => 
      context.fileMetadata.keywords.some(ck => ck.toLowerCase().includes(k.toLowerCase()))
    )) {
      reasons.push('relevant keywords')
    }

    return reasons.join(', ') || 'organizational policy'
  }

  private async shareAssetWithUser(
    assetId: string,
    userId: UserId,
    permission: 'view' | 'download' | 'edit',
    message: string
  ): Promise<Result<void>> {
    try {
      // TODO: Implement actual sharing via asset service/repository
      console.log(`Sharing asset ${assetId} with user ${userId} (${permission}): ${message}`)
      return Ok(undefined)
    } catch (error) {
      return Err(error as Error)
    }
  }

  private async sendSharingNotification(
    userId: UserId,
    assetId: string,
    message: string
  ): Promise<Result<void>> {
    try {
      // TODO: Implement notification via notification service
      console.log(`Notification to ${userId}: ${message} (Asset: ${assetId})`)
      return Ok(undefined)
    } catch (error) {
      return Err(error as Error)
    }
  }

  private loadDefaultRules(): void {
    // Load some default smart sharing rules
    this.rules = [
      {
        id: 'financial-reports',
        name: 'Financial Reports Auto-Share',
        condition: {
          category: ['financial', 'reports'],
          fileType: ['pdf', 'xlsx', 'csv'],
          keywords: ['financial', 'budget', 'revenue', 'quarterly']
        },
        action: {
          shareWith: [], // TODO: Add default users based on organization
          permission: 'view',
          notify: true,
          message: 'New financial report has been shared with you'
        },
        enabled: true
      },
      {
        id: 'meeting-minutes',
        name: 'Meeting Minutes Distribution',
        condition: {
          category: ['meetings'],
          fileType: ['pdf', 'docx'],
          keywords: ['minutes', 'meeting', 'board']
        },
        action: {
          shareWith: [], // TODO: Add board members
          permission: 'view',
          notify: true,
          message: 'Meeting minutes have been shared'
        },
        enabled: true
      },
      {
        id: 'compliance-documents',
        name: 'Compliance Document Sharing',
        condition: {
          category: ['compliance', 'legal'],
          keywords: ['compliance', 'audit', 'regulatory']
        },
        action: {
          shareWith: [], // TODO: Add compliance team
          permission: 'view',
          notify: true,
          message: 'New compliance document available'
        },
        enabled: true
      }
    ]
  }

  private generateRuleId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export default SmartSharingService