/**
 * Risk Dashboard Service
 * Provides risk data aggregation and analysis for the risk dashboard
 */

import { riskAssessmentEngine } from '../compliance/iso27001/risk-assessment'
import { enhancedAuditLogger } from '../audit/enhanced-audit-logger'
import type { RiskFactor, RiskMetric, ComplianceItem, TrendDataPoint } from '../../types/risk-types'

export interface RiskDashboardData {
  riskFactors: RiskFactor[]
  metrics: RiskMetric[]
  complianceItems: ComplianceItem[]
  trendData: TrendDataPoint[]
  lastUpdated: Date
}

export interface RiskAssessmentSummary {
  totalRisks: number
  risksByLevel: {
    critical: number
    high: number
    medium: number
    low: number
  }
  overallRiskScore: number
  complianceScore: number
  topRisks: Array<{
    id: string
    name: string
    score: number
    level: string
    category: string
  }>
}

class RiskDashboardService {
  /**
   * Get comprehensive risk dashboard data
   */
  async getDashboardData(organizationId: string): Promise<RiskDashboardData> {
    try {
      // Log dashboard access
      await enhancedAuditLogger.logEvent({
        organizationId,
        userId: 'system',
        eventType: 'dashboard',
        eventCategory: 'risk_management',
        action: 'view_dashboard',
        outcome: 'success',
        severity: 'low',
        resourceType: 'risk_dashboard',
        resourceId: organizationId,
        eventDescription: 'Risk dashboard data requested',
        businessContext: 'Risk monitoring and assessment',
        complianceTags: ['ISO27001'],
        details: {
          dataRequested: ['risk_factors', 'metrics', 'compliance', 'trends']
        }
      })

      // Fetch risk factors from the assessment engine
      const riskFactors = await this.getRiskFactors(organizationId)
      
      // Calculate metrics
      const metrics = await this.calculateRiskMetrics(riskFactors)
      
      // Get compliance status
      const complianceItems = await this.getComplianceStatus(organizationId)
      
      // Generate trend data (last 30 days)
      const trendData = await this.getRiskTrendData(organizationId, 30)

      return {
        riskFactors,
        metrics,
        complianceItems,
        trendData,
        lastUpdated: new Date()
      }

    } catch (error) {
      await enhancedAuditLogger.logEvent({
        organizationId,
        userId: 'system',
        eventType: 'error',
        eventCategory: 'risk_management',
        action: 'get_dashboard_data',
        outcome: 'failure',
        severity: 'medium',
        resourceType: 'risk_dashboard',
        resourceId: organizationId,
        eventDescription: 'Failed to retrieve risk dashboard data',
        businessContext: 'Risk monitoring and assessment',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Get risk factors for an organization
   */
  private async getRiskFactors(organizationId: string): Promise<RiskFactor[]> {
    // In a real implementation, this would fetch from the database
    // For now, return mock data that would come from the risk assessment engine
    
    const mockRiskFactors: RiskFactor[] = [
      {
        id: '1',
        name: 'Cybersecurity Threats',
        category: 'cyber',
        level: 'high',
        score: 8.2,
        trend: 'up',
        description: 'Increasing ransomware and phishing attacks targeting board communications',
        impact: 9,
        likelihood: 7,
        lastAssessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        owner: 'CISO',
        mitigation: 'Enhanced email security, MFA implementation, security awareness training',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Regulatory Compliance',
        category: 'compliance',
        level: 'medium',
        score: 6.5,
        trend: 'stable',
        description: 'New SOX requirements and evolving ESG disclosure mandates',
        impact: 8,
        likelihood: 6,
        lastAssessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        owner: 'Chief Compliance Officer',
        mitigation: 'Regular compliance audits, policy updates, staff training'
      },
      {
        id: '3',
        name: 'Market Volatility',
        category: 'financial',
        level: 'high',
        score: 7.8,
        trend: 'up',
        description: 'Economic uncertainty affecting investment portfolio and cash flow',
        impact: 8,
        likelihood: 8,
        lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        owner: 'CFO',
        mitigation: 'Portfolio diversification, stress testing, liquidity management'
      },
      {
        id: '4',
        name: 'Key Person Risk',
        category: 'operational',
        level: 'medium',
        score: 5.5,
        trend: 'down',
        description: 'Dependence on key executives and board members',
        impact: 7,
        likelihood: 5,
        lastAssessed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        owner: 'Board Chair',
        mitigation: 'Succession planning, knowledge transfer, insurance coverage'
      },
      {
        id: '5',
        name: 'Technology Infrastructure',
        category: 'technology',
        level: 'medium',
        score: 6.0,
        trend: 'stable',
        description: 'Aging systems and digital transformation challenges',
        impact: 6,
        likelihood: 7,
        lastAssessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        owner: 'CTO',
        mitigation: 'System modernization, cloud migration, disaster recovery planning'
      },
      {
        id: '6',
        name: 'ESG Reputation',
        category: 'strategic',
        level: 'low',
        score: 3.8,
        trend: 'down',
        description: 'Environmental and social governance expectations from stakeholders',
        impact: 5,
        likelihood: 6,
        lastAssessed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        owner: 'Chief Sustainability Officer',
        mitigation: 'ESG reporting improvements, stakeholder engagement, sustainability initiatives'
      }
    ]

    return mockRiskFactors
  }

  /**
   * Calculate risk metrics from risk factors
   */
  private async calculateRiskMetrics(riskFactors: RiskFactor[]): Promise<RiskMetric[]> {
    const totalRisks = riskFactors.length
    const highRisks = riskFactors.filter(r => r.level === 'high' || r.level === 'critical').length
    const avgRiskScore = riskFactors.reduce((sum, r) => sum + r.score, 0) / totalRisks
    
    // Calculate compliance score (would come from compliance system in reality)
    const complianceScore = 94
    
    // Calculate mitigation progress (would come from action tracking system)
    const mitigationProgress = 78

    return [
      {
        label: 'Overall Risk Score',
        value: avgRiskScore.toFixed(1),
        change: 0.3,
        icon: 'AlertTriangle',
        color: 'text-orange-600',
        description: 'Composite risk assessment'
      },
      {
        label: 'High Risk Factors',
        value: highRisks,
        change: 1,
        icon: 'AlertCircle',
        color: 'text-red-600',
        description: 'Risks requiring immediate attention'
      },
      {
        label: 'Compliance Score',
        value: `${complianceScore}%`,
        change: -2,
        icon: 'Shield',
        color: 'text-green-600',
        description: 'Regulatory compliance percentage'
      },
      {
        label: 'Mitigation Progress',
        value: `${mitigationProgress}%`,
        change: 5,
        icon: 'Target',
        color: 'text-blue-600',
        description: 'Risk mitigation completion rate'
      }
    ]
  }

  /**
   * Get compliance status for various regulations
   */
  private async getComplianceStatus(organizationId: string): Promise<ComplianceItem[]> {
    // Mock compliance data - would come from compliance tracking system
    return [
      {
        id: '1',
        regulation: 'SOX 404',
        status: 'compliant',
        score: 96,
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        issues: 0
      },
      {
        id: '2',
        regulation: 'GDPR',
        status: 'compliant',
        score: 92,
        nextReview: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        issues: 2
      },
      {
        id: '3',
        regulation: 'ESG Disclosure',
        status: 'at_risk',
        score: 78,
        nextReview: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        issues: 5
      },
      {
        id: '4',
        regulation: 'Cyber Security Framework',
        status: 'compliant',
        score: 89,
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        issues: 1
      }
    ]
  }

  /**
   * Get risk trend data for specified number of days
   */
  private async getRiskTrendData(organizationId: string, days: number): Promise<TrendDataPoint[]> {
    // Generate mock trend data - would come from historical risk assessments
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      
      return {
        date: date.toISOString().split('T')[0],
        overallRisk: 6.3 + Math.sin(i * 0.2) * 0.5 + Math.random() * 0.3 - 0.15,
        criticalRisks: Math.floor(Math.random() * 3) + (i > 20 ? 1 : 0),
        highRisks: Math.floor(Math.random() * 4) + 1,
        mediumRisks: Math.floor(Math.random() * 6) + 3,
        lowRisks: Math.floor(Math.random() * 4) + 2
      }
    })
  }

  /**
   * Get risk assessment summary
   */
  async getRiskAssessmentSummary(organizationId: string): Promise<RiskAssessmentSummary> {
    const riskFactors = await this.getRiskFactors(organizationId)
    
    const risksByLevel = {
      critical: riskFactors.filter(r => r.level === 'critical').length,
      high: riskFactors.filter(r => r.level === 'high').length,
      medium: riskFactors.filter(r => r.level === 'medium').length,
      low: riskFactors.filter(r => r.level === 'low').length
    }

    const overallRiskScore = riskFactors.reduce((sum, r) => sum + r.score, 0) / riskFactors.length
    
    const topRisks = riskFactors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        name: r.name,
        score: r.score,
        level: r.level,
        category: r.category
      }))

    return {
      totalRisks: riskFactors.length,
      risksByLevel,
      overallRiskScore,
      complianceScore: 94, // Would come from compliance system
      topRisks
    }
  }

  /**
   * Trigger a new risk assessment
   */
  async triggerRiskAssessment(organizationId: string, userId: string): Promise<void> {
    try {
      await enhancedAuditLogger.logEvent({
        organizationId,
        userId,
        eventType: 'security',
        eventCategory: 'risk_management',
        action: 'trigger_assessment',
        outcome: 'success',
        severity: 'medium',
        resourceType: 'risk_assessment',
        resourceId: organizationId,
        eventDescription: 'Manual risk assessment triggered from dashboard',
        businessContext: 'Risk monitoring and assessment',
        complianceTags: ['ISO27001']
      })

      // This would trigger the actual risk assessment process
      // await riskAssessmentEngine.conductComprehensiveAssessment(organizationId, 'organization', 'ISO 27005:2022')
      
    } catch (error) {
      await enhancedAuditLogger.logEvent({
        organizationId,
        userId,
        eventType: 'error',
        eventCategory: 'risk_management',
        action: 'trigger_assessment',
        outcome: 'failure',
        severity: 'high',
        resourceType: 'risk_assessment',
        resourceId: organizationId,
        eventDescription: 'Failed to trigger risk assessment',
        businessContext: 'Risk monitoring and assessment',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }
}

// Export singleton instance
export const riskDashboardService = new RiskDashboardService()

// Export convenience functions
export async function getRiskDashboardData(organizationId: string): Promise<RiskDashboardData> {
  return riskDashboardService.getDashboardData(organizationId)
}

export async function getRiskSummary(organizationId: string): Promise<RiskAssessmentSummary> {
  return riskDashboardService.getRiskAssessmentSummary(organizationId)
}

export async function runRiskAssessment(organizationId: string, userId: string): Promise<void> {
  return riskDashboardService.triggerRiskAssessment(organizationId, userId)
}