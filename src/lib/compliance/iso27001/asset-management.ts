/**
 * ISO 27001 Information Asset Management
 * Comprehensive asset register and management system
 */

export interface InformationAssetBasic {
  id: string
  organizationId?: string
  name: string
  description: string
  type: 'data' | 'software' | 'physical' | 'service' | 'people' | 'intangible'
  category: string
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret'
  owner: string
  custodian?: string
  location: string
  format: 'electronic' | 'physical' | 'hybrid'
  confidentiality: number // 1-5 scale
  integrity: number
  availability: number
  assetValue: number
  dependencies: string[]
  threats: string[]
  vulnerabilities: string[]
  controls: string[]
  lastReviewDate?: Date
  nextReviewDate: Date
  retentionPeriod?: number
  disposalMethod?: string
  legalRequirements: string[]
  businessProcesses: string[]
  status: 'active' | 'inactive' | 'disposed'
  metadata?: Record<string, unknown>
}

export interface AssetInventoryReport {
  totalAssets: number
  assetsByType: Record<string, number>
  assetsByClassification: Record<string, number>
  assetsByStatus: Record<string, number>
  highValueAssets: InformationAssetBasic[]
  assetsRequiringReview: InformationAssetBasic[]
  assetsWithoutOwner: InformationAssetBasic[]
  complianceScore: number
  recommendations: string[]
}

export interface AssetRiskProfile {
  assetId: string
  assetName: string
  inherentRisk: number
  residualRisk: number
  threatCount: number
  vulnerabilityCount: number
  controlCount: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  criticalThreats: string[]
  criticalVulnerabilities: string[]
  recommendedControls: string[]
}

/**
 * Information Asset Management Controller
 */
export class AssetManagementController {
  /**
   * Create asset inventory report
   */
  generateAssetInventoryReport(assets: InformationAssetBasic[]): AssetInventoryReport {
    const totalAssets = assets.length
    
    // Group assets by type
    const assetsByType = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group assets by classification
    const assetsByClassification = assets.reduce((acc, asset) => {
      acc[asset.classification] = (acc[asset.classification] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group assets by status
    const assetsByStatus = assets.reduce((acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // High value assets (top 10% by value)
    const sortedByValue = [...assets].sort((a, b) => b.assetValue - a.assetValue)
    const highValueCount = Math.max(1, Math.ceil(assets.length * 0.1))
    const highValueAssets = sortedByValue.slice(0, highValueCount)

    // Assets requiring review (within 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const assetsRequiringReview = assets.filter(asset => 
      asset.nextReviewDate <= thirtyDaysFromNow
    )

    // Assets without proper ownership
    const assetsWithoutOwner = assets.filter(asset => 
      !asset.owner || asset.owner.trim() === ''
    )

    // Calculate compliance score
    const complianceScore = this.calculateAssetComplianceScore(assets)

    // Generate recommendations
    const recommendations = this.generateAssetRecommendations(
      assets,
      assetsRequiringReview,
      assetsWithoutOwner
    )

    return {
      totalAssets,
      assetsByType,
      assetsByClassification,
      assetsByStatus,
      highValueAssets,
      assetsRequiringReview,
      assetsWithoutOwner,
      complianceScore,
      recommendations
    }
  }

  /**
   * Assess asset risk profile
   */
  assessAssetRisk(asset: InformationAssetBasic): AssetRiskProfile {
    // Calculate inherent risk based on CIA values and asset value
    const inherentRisk = this.calculateInherentRisk(asset)
    
    // Calculate residual risk considering controls
    const controlEffectiveness = this.assessControlEffectiveness(asset.controls)
    const residualRisk = inherentRisk * (1 - controlEffectiveness / 100)

    // Determine risk level
    const riskLevel = this.determineRiskLevel(residualRisk)

    // Identify critical threats and vulnerabilities
    const criticalThreats = asset.threats.filter(threat => 
      this.isCriticalThreat(threat, asset)
    )

    const criticalVulnerabilities = asset.vulnerabilities.filter(vuln => 
      this.isCriticalVulnerability(vuln, asset)
    )

    // Recommend additional controls
    const recommendedControls = this.recommendControls(asset, criticalThreats, criticalVulnerabilities)

    return {
      assetId: asset.id,
      assetName: asset.name,
      inherentRisk,
      residualRisk,
      threatCount: asset.threats.length,
      vulnerabilityCount: asset.vulnerabilities.length,
      controlCount: asset.controls.length,
      riskLevel,
      criticalThreats,
      criticalVulnerabilities,
      recommendedControls
    }
  }

  /**
   * Classify asset based on CIA values
   */
  classifyAssetByCIA(confidentiality: number, integrity: number, availability: number): 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret' {
    const maxValue = Math.max(confidentiality, integrity, availability)
    
    if (maxValue >= 5) return 'top_secret'
    if (maxValue >= 4) return 'restricted'
    if (maxValue >= 3) return 'confidential'
    if (maxValue >= 2) return 'internal'
    return 'public'
  }

  /**
   * Calculate asset value based on various factors
   */
  calculateAssetValue(
    businessImpact: number,
    replacementCost: number,
    complianceCost: number,
    reputationalImpact: number
  ): number {
    // Weighted calculation of asset value
    const weights = {
      business: 0.4,
      replacement: 0.25,
      compliance: 0.2,
      reputation: 0.15
    }

    return (
      businessImpact * weights.business +
      replacementCost * weights.replacement +
      complianceCost * weights.compliance +
      reputationalImpact * weights.reputation
    )
  }

  /**
   * Generate asset disposal plan
   */
  generateDisposalPlan(asset: InformationAssetBasic): {
    method: string
    steps: string[]
    timeline: string
    compliance: string[]
    verification: string[]
  } {
    const classification = asset.classification
    const type = asset.type
    const format = asset.format

    let method = 'Standard disposal'
    let steps: string[] = []
    let timeline = '7 days'
    let compliance: string[] = []
    let verification: string[] = []

    // Determine disposal method based on classification
    if (['top_secret', 'restricted'].includes(classification)) {
      method = 'Secure destruction'
      timeline = '14 days'
      
      if (format === 'electronic' || format === 'hybrid') {
        steps = [
          'Remove all access permissions',
          'Create backup if legally required',
          'Use certified data destruction software',
          'Physically destroy storage media if applicable',
          'Obtain certificate of destruction',
          'Update asset register'
        ]
      } else {
        steps = [
          'Collect all physical media',
          'Use industrial shredding service',
          'Obtain certificate of destruction',
          'Update asset register'
        ]
      }

      compliance = ['ISO 27001', 'Data Protection Act']
      verification = [
        'Certificate of destruction',
        'Witness verification',
        'Asset register update confirmation'
      ]
    } else if (classification === 'confidential') {
      method = 'Controlled disposal'
      timeline = '10 days'
      
      steps = [
        'Remove access permissions',
        'Backup if required for compliance',
        'Secure overwriting (electronic) or shredding (physical)',
        'Document disposal process',
        'Update asset register'
      ]

      compliance = ['ISO 27001', 'GDPR (if applicable)']
      verification = [
        'Disposal documentation',
        'Asset register update'
      ]
    } else {
      method = 'Standard disposal'
      steps = [
        'Remove access permissions',
        'Standard deletion or disposal',
        'Update asset register'
      ]

      compliance = ['ISO 27001']
      verification = ['Asset register update']
    }

    return {
      method,
      steps,
      timeline,
      compliance,
      verification
    }
  }

  /**
   * Validate asset data completeness
   */
  validateAssetData(asset: InformationAssetBasic): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    completeness: number
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let completeness = 0
    const totalFields = 20 // Approximate number of important fields

    // Required fields validation
    if (!asset.name || asset.name.trim() === '') {
      errors.push('Asset name is required')
    } else {
      completeness += 1
    }

    if (!asset.description || asset.description.trim() === '') {
      errors.push('Asset description is required')
    } else {
      completeness += 1
    }

    if (!asset.owner || asset.owner.trim() === '') {
      errors.push('Asset owner is required')
    } else {
      completeness += 1
    }

    if (!asset.type) {
      errors.push('Asset type is required')
    } else {
      completeness += 1
    }

    if (!asset.classification) {
      errors.push('Asset classification is required')
    } else {
      completeness += 1
    }

    // CIA values validation
    if (asset.confidentiality < 1 || asset.confidentiality > 5) {
      errors.push('Confidentiality must be between 1 and 5')
    } else {
      completeness += 1
    }

    if (asset.integrity < 1 || asset.integrity > 5) {
      errors.push('Integrity must be between 1 and 5')
    } else {
      completeness += 1
    }

    if (asset.availability < 1 || asset.availability > 5) {
      errors.push('Availability must be between 1 and 5')
    } else {
      completeness += 1
    }

    // Optional but important fields
    if (asset.location && asset.location.trim() !== '') completeness += 1
    if (asset.custodian && asset.custodian.trim() !== '') completeness += 1
    if (asset.assetValue > 0) completeness += 1
    if (asset.dependencies && asset.dependencies.length > 0) completeness += 1
    if (asset.threats && asset.threats.length > 0) completeness += 1
    if (asset.vulnerabilities && asset.vulnerabilities.length > 0) completeness += 1
    if (asset.controls && asset.controls.length > 0) completeness += 1
    if (asset.legalRequirements && asset.legalRequirements.length > 0) completeness += 1
    if (asset.businessProcesses && asset.businessProcesses.length > 0) completeness += 1
    if (asset.retentionPeriod && asset.retentionPeriod > 0) completeness += 1
    if (asset.disposalMethod && asset.disposalMethod.trim() !== '') completeness += 1
    if (asset.nextReviewDate) completeness += 1

    // Warnings for missing recommended fields
    if (!asset.custodian) {
      warnings.push('Asset custodian should be specified')
    }

    if (!asset.controls || asset.controls.length === 0) {
      warnings.push('No security controls specified for this asset')
    }

    if (!asset.threats || asset.threats.length === 0) {
      warnings.push('No threats identified for this asset')
    }

    if (asset.assetValue <= 0) {
      warnings.push('Asset value should be specified')
    }

    const completenessPercentage = Math.round((completeness / totalFields) * 100)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: completenessPercentage
    }
  }

  // Private helper methods

  private calculateAssetComplianceScore(assets: InformationAssetBasic[]): number {
    if (assets.length === 0) return 100

    let totalScore = 0
    for (const asset of assets) {
      const validation = this.validateAssetData(asset)
      totalScore += validation.completeness
    }

    return Math.round(totalScore / assets.length)
  }

  private generateAssetRecommendations(
    assets: InformationAssetBasic[],
    reviewDue: InformationAssetBasic[],
    withoutOwner: InformationAssetBasic[]
  ): string[] {
    const recommendations: string[] = []

    if (reviewDue.length > 0) {
      recommendations.push(`${reviewDue.length} assets require review within 30 days`)
    }

    if (withoutOwner.length > 0) {
      recommendations.push(`${withoutOwner.length} assets lack proper ownership assignment`)
    }

    const highValueAssets = assets.filter(a => a.assetValue > 100000)
    const highValueWithoutControls = highValueAssets.filter(a => a.controls.length === 0)
    
    if (highValueWithoutControls.length > 0) {
      recommendations.push(`${highValueWithoutControls.length} high-value assets lack security controls`)
    }

    const confidentialAssets = assets.filter(a => 
      ['confidential', 'restricted', 'top_secret'].includes(a.classification)
    )
    const confidentialWithoutEncryption = confidentialAssets.filter(a => 
      !a.controls.some(c => c.toLowerCase().includes('encrypt'))
    )

    if (confidentialWithoutEncryption.length > 0) {
      recommendations.push(`${confidentialWithoutEncryption.length} confidential assets may require encryption controls`)
    }

    return recommendations
  }

  private calculateInherentRisk(asset: InformationAssetBasic): number {
    // Risk calculation based on CIA values and asset value
    const ciaWeight = (asset.confidentiality + asset.integrity + asset.availability) / 3
    const valueWeight = Math.min(5, Math.log10(asset.assetValue + 1))
    const threatWeight = Math.min(5, asset.threats.length)
    const vulnerabilityWeight = Math.min(5, asset.vulnerabilities.length)

    return Math.round(
      (ciaWeight * 0.3 + valueWeight * 0.25 + threatWeight * 0.25 + vulnerabilityWeight * 0.2) * 5
    )
  }

  private assessControlEffectiveness(controls: string[]): number {
    // Simplified control effectiveness assessment
    const baseEffectiveness = Math.min(90, controls.length * 15)
    return Math.max(10, baseEffectiveness)
  }

  private determineRiskLevel(risk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (risk >= 20) return 'critical'
    if (risk >= 15) return 'high'
    if (risk >= 8) return 'medium'
    return 'low'
  }

  private isCriticalThreat(threat: string, asset: InformationAssetBasic): boolean {
    const criticalThreats = ['malware', 'insider threat', 'data breach', 'ransomware']
    return criticalThreats.some(ct => threat.toLowerCase().includes(ct))
  }

  private isCriticalVulnerability(vulnerability: string, asset: InformationAssetBasic): boolean {
    const criticalVulns = ['unpatched', 'zero-day', 'critical', 'remote code execution']
    return criticalVulns.some(cv => vulnerability.toLowerCase().includes(cv))
  }

  private recommendControls(
    asset: InformationAssetBasic,
    threats: string[],
    vulnerabilities: string[]
  ): string[] {
    const recommendations: string[] = []

    // Based on asset classification
    if (['confidential', 'restricted', 'top_secret'].includes(asset.classification)) {
      if (!asset.controls.some(c => c.toLowerCase().includes('encrypt'))) {
        recommendations.push('Implement encryption at rest and in transit')
      }
      if (!asset.controls.some(c => c.toLowerCase().includes('access'))) {
        recommendations.push('Implement role-based access controls')
      }
    }

    // Based on asset type
    if (asset.type === 'data') {
      recommendations.push('Implement data loss prevention (DLP) controls')
      recommendations.push('Regular data backup and recovery testing')
    }

    if (asset.type === 'software') {
      recommendations.push('Regular security patching and updates')
      recommendations.push('Code review and vulnerability testing')
    }

    // Based on threats
    if (threats.some(t => t.toLowerCase().includes('malware'))) {
      recommendations.push('Deploy anti-malware protection')
    }

    if (threats.some(t => t.toLowerCase().includes('insider'))) {
      recommendations.push('Implement privileged access management')
      recommendations.push('User activity monitoring and logging')
    }

    // Based on vulnerabilities
    if (vulnerabilities.some(v => v.toLowerCase().includes('unpatched'))) {
      recommendations.push('Implement automated patch management')
    }

    return [...new Set(recommendations)] // Remove duplicates
  }
}

// Export singleton instance
export const assetManagementController = new AssetManagementController()

// Convenience functions
export function generateAssetInventory(assets: InformationAssetBasic[]): AssetInventoryReport {
  return assetManagementController.generateAssetInventoryReport(assets)
}

export function assessAssetRiskProfile(asset: InformationAssetBasic): AssetRiskProfile {
  return assetManagementController.assessAssetRisk(asset)
}

export function classifyAsset(confidentiality: number, integrity: number, availability: number): 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret' {
  return assetManagementController.classifyAssetByCIA(confidentiality, integrity, availability)
}

export function validateAsset(asset: InformationAssetBasic): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  completeness: number
} {
  return assetManagementController.validateAssetData(asset)
}

export function planAssetDisposal(asset: InformationAssetBasic): {
  method: string
  steps: string[]
  timeline: string
  compliance: string[]
  verification: string[]
} {
  return assetManagementController.generateDisposalPlan(asset)
}