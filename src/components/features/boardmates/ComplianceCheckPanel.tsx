/**
 * Compliance Check Panel - Enterprise Regulatory Compliance
 * Real-time compliance validation for board member additions
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  FileText,
  Globe,
  Lock,
  Search,
  Eye,
  Award,
  AlertOctagon,
  Zap,
  TrendingUp,
  Scale,
  Gavel,
  Building,
  UserCheck,
  ShieldAlert,
  Download,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { advancedComplianceService } from '@/lib/services/advanced-compliance.service'
import type { 
  EnhancedBoardMate, 
  ComplianceCheckResult, 
  ComplianceViolation,
  BackgroundCheckResult
} from '@/types/boardmates'
import type { OrganizationId } from '@/types/branded'

interface ComplianceCheckPanelProps {
  member: EnhancedBoardMate | null
  organizationId: OrganizationId
  currentBoard: EnhancedBoardMate[]
  onComplianceResult: (result: ComplianceCheckResult) => void
  className?: string
  autoCheck?: boolean
}

interface ComplianceStatus {
  overall: 'compliant' | 'non_compliant' | 'warning' | 'checking' | 'unknown'
  score: number
  frameworks: FrameworkStatus[]
  backgroundChecks: BackgroundCheckStatus[]
  violations: ComplianceViolation[]
  lastChecked?: Date
}

interface FrameworkStatus {
  name: string
  status: 'compliant' | 'violation' | 'warning' | 'pending'
  version: string
  jurisdiction: string
  requirementsMet: number
  totalRequirements: number
  criticalViolations: number
}

interface BackgroundCheckStatus {
  type: string
  status: 'passed' | 'failed' | 'pending' | 'review_required'
  confidence: number
  findings: number
  redFlags: number
  lastChecked: Date
}

export default function ComplianceCheckPanel({
  member,
  organizationId,
  currentBoard,
  onComplianceResult,
  className,
  autoCheck = true
}: ComplianceCheckPanelProps) {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>({
    overall: 'unknown',
    score: 0,
    frameworks: [],
    backgroundChecks: [],
    violations: []
  })
  const [isChecking, setIsChecking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Perform compliance check
  const performComplianceCheck = useCallback(async () => {
    if (!member) return

    setIsChecking(true)
    setError(null)

    try {
      // Run comprehensive compliance check
      const [complianceResult, backgroundResults] = await Promise.all([
        advancedComplianceService.performComplianceCheck(member, organizationId, currentBoard),
        advancedComplianceService.performBackgroundChecks(member)
      ])

      // Update compliance status
      const status: ComplianceStatus = {
        overall: determineOverallStatus(complianceResult, backgroundResults),
        score: calculateOverallScore(complianceResult, backgroundResults),
        frameworks: await getFrameworkStatuses(complianceResult),
        backgroundChecks: mapBackgroundChecks(backgroundResults),
        violations: [],
        lastChecked: new Date()
      }

      setComplianceStatus(status)
      onComplianceResult(complianceResult)

    } catch (err) {
      console.error('Compliance check failed:', err)
      setError('Failed to perform compliance check')
    } finally {
      setIsChecking(false)
    }
  }, [member, organizationId, currentBoard, onComplianceResult])

  // Auto-check when member changes
  useEffect(() => {
    if (autoCheck && member) {
      performComplianceCheck()
    }
  }, [autoCheck, member, performComplianceCheck])

  // Determine overall status color and icon
  const getStatusConfig = (status: ComplianceStatus['overall']) => {
    switch (status) {
      case 'compliant':
        return {
          color: 'text-green-600 bg-green-100 border-green-200',
          icon: CheckCircle2,
          label: 'Compliant'
        }
      case 'warning':
        return {
          color: 'text-yellow-600 bg-yellow-100 border-yellow-200',
          icon: AlertTriangle,
          label: 'Warnings'
        }
      case 'non_compliant':
        return {
          color: 'text-red-600 bg-red-100 border-red-200',
          icon: XCircle,
          label: 'Non-Compliant'
        }
      case 'checking':
        return {
          color: 'text-blue-600 bg-blue-100 border-blue-200',
          icon: Clock,
          label: 'Checking...'
        }
      default:
        return {
          color: 'text-gray-600 bg-gray-100 border-gray-200',
          icon: Shield,
          label: 'Unknown'
        }
    }
  }

  const statusConfig = getStatusConfig(isChecking ? 'checking' : complianceStatus.overall)
  const StatusIcon = statusConfig.icon

  if (!member) {
    return (
      <Card className={cn('border border-gray-200', className)}>
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a member to view compliance status</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Main Status Card */}
      <Card className={cn('border-2', statusConfig.color)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', statusConfig.color)}>
                <StatusIcon className={cn('w-5 h-5', isChecking && 'animate-pulse')} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Compliance Status</h3>
                <p className="text-sm opacity-75">{member.full_name}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {isChecking ? '--' : `${Math.round(complianceStatus.score)}%`}
              </div>
              <div className="text-xs opacity-75">Compliance Score</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChecking && complianceStatus.lastChecked && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Last checked: {complianceStatus.lastChecked.toLocaleString()}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={performComplianceCheck}
                className="text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Recheck
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <Progress 
            value={isChecking ? 50 : complianceStatus.score} 
            className={cn('h-3', isChecking && 'animate-pulse')}
          />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{showDetails ? 'Hide' : 'Show'} Details</span>
            </Button>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                Report
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Audit Trail
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Compliance Information */}
      <AnimatePresence>
        {showDetails && !isChecking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Regulatory Frameworks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <span>Regulatory Frameworks</span>
                  <Badge variant="secondary">{complianceStatus.frameworks.length} Checked</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceStatus.frameworks.map((framework, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          framework.status === 'compliant' ? 'bg-green-100 text-green-600' :
                          framework.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        )}>
                          {framework.status === 'compliant' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : framework.status === 'warning' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{framework.name}</div>
                          <div className="text-xs text-gray-600">
                            {framework.jurisdiction} • v{framework.version}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {framework.requirementsMet}/{framework.totalRequirements}
                        </div>
                        <div className="text-xs text-gray-600">Requirements Met</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Background Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <span>Background Verification</span>
                  <Badge variant="secondary">{complianceStatus.backgroundChecks.length} Checks</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {complianceStatus.backgroundChecks.map((check, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium capitalize">
                          {check.type.replace('_', ' ')} Check
                        </div>
                        <Badge 
                          variant={check.status === 'passed' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {check.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Confidence</span>
                          <span className="font-medium">{check.confidence}%</span>
                        </div>
                        <Progress value={check.confidence} className="h-1.5" />
                        {check.redFlags > 0 && (
                          <div className="flex items-center text-xs text-red-600">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            {check.redFlags} red flag{check.redFlags !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Violations & Warnings */}
            {complianceStatus.violations.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Compliance Issues</span>
                    <Badge variant="destructive">{complianceStatus.violations.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceStatus.violations.map((violation, index) => (
                      <div key={index} className="p-3 bg-white border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-red-800 mb-1">
                              {violation.violation_type.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-red-700 mb-2">
                              {violation.description}
                            </div>
                            <div className="text-xs text-red-600">
                              Framework: {violation.framework}
                            </div>
                          </div>
                          <Badge 
                            variant="destructive" 
                            className={cn(
                              'text-xs',
                              violation.severity === 'critical' && 'bg-red-600',
                              violation.severity === 'high' && 'bg-orange-600',
                              violation.severity === 'medium' && 'bg-yellow-600'
                            )}
                          >
                            {violation.severity}
                          </Badge>
                        </div>
                        {violation.suggested_actions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-red-800 mb-1">Suggested Actions:</div>
                            <ul className="text-xs text-red-700 space-y-1">
                              {violation.suggested_actions.map((action, actionIndex) => (
                                <li key={actionIndex} className="flex items-center">
                                  <div className="w-1 h-1 bg-red-600 rounded-full mr-2"></div>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Need help with compliance issues?
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Documentation
                    </Button>
                    <Button variant="outline" size="sm">
                      <Award className="w-3 h-3 mr-1" />
                      Expert Consultation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Helper functions
function determineOverallStatus(
  complianceResult: ComplianceCheckResult,
  backgroundResults: BackgroundCheckResult[]
): ComplianceStatus['overall'] {
  if (!complianceResult.passed) return 'non_compliant'
  
  const hasWarnings = complianceResult.violations.some(v => v.includes('warning'))
  const hasBackgroundIssues = backgroundResults.some(r => r.status === 'review_required' || r.details.red_flags.length > 0)
  
  if (hasWarnings || hasBackgroundIssues) return 'warning'
  return 'compliant'
}

function calculateOverallScore(
  complianceResult: ComplianceCheckResult,
  backgroundResults: BackgroundCheckResult[]
): number {
  const complianceScore = 100 - complianceResult.risk_score
  const backgroundScore = backgroundResults.reduce((avg, result) => avg + result.details.confidence_score, 0) / backgroundResults.length
  
  return Math.round((complianceScore + backgroundScore) / 2)
}

async function getFrameworkStatuses(complianceResult: ComplianceCheckResult): Promise<FrameworkStatus[]> {
  // Mock implementation - would parse actual compliance results
  return [
    {
      name: 'SOX 2002',
      status: complianceResult.passed ? 'compliant' : 'violation',
      version: '2002',
      jurisdiction: 'US',
      requirementsMet: 12,
      totalRequirements: 12,
      criticalViolations: 0
    },
    {
      name: 'SEC Rules',
      status: 'compliant',
      version: '2023',
      jurisdiction: 'US',
      requirementsMet: 8,
      totalRequirements: 8,
      criticalViolations: 0
    }
  ]
}

function mapBackgroundChecks(backgroundResults: BackgroundCheckResult[]): BackgroundCheckStatus[] {
  return backgroundResults.map(result => ({
    type: result.check_type,
    status: result.status,
    confidence: result.details.confidence_score,
    findings: result.details.findings.length,
    redFlags: result.details.red_flags.length,
    lastChecked: result.performed_at
  }))
}