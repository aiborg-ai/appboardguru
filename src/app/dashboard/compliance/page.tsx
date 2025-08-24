'use client'

/**
 * Compliance Tracker Page
 * 
 * Comprehensive regulatory compliance monitoring and tracking system.
 * Provides real-time compliance status, audit trails, regulatory updates,
 * and automated compliance workflows for enterprise governance.
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  Users,
  Activity,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Scale,
  Lock,
  Globe,
  Building,
  Briefcase
} from 'lucide-react'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Hooks
import { useOrganizationStore } from '@/lib/stores/organization-store'
import { useAuthStore } from '@/lib/stores/auth-store'

// Types
interface ComplianceOverview {
  overall_score: number
  total_requirements: number
  compliant: number
  at_risk: number
  non_compliant: number
  overdue_actions: number
  upcoming_deadlines: number
  last_audit_date: string
  next_audit_date: string
}

interface ComplianceFramework {
  id: string
  name: string
  category: 'financial' | 'data_privacy' | 'industry' | 'environmental' | 'governance'
  status: 'compliant' | 'at_risk' | 'non_compliant' | 'not_applicable'
  score: number
  requirements_total: number
  requirements_met: number
  last_assessment: string
  next_review: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  responsible_party: string
  icon: React.ComponentType<{ className?: string }>
}

interface ComplianceAction {
  id: string
  title: string
  framework: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  due_date: string
  assigned_to: string
  description: string
  progress: number
  estimated_effort: string
}

interface RegulatoryUpdate {
  id: string
  title: string
  regulation: string
  category: string
  effective_date: string
  impact_level: 'low' | 'medium' | 'high'
  status: 'monitoring' | 'analyzing' | 'implementing' | 'compliant'
  description: string
}

interface AuditTrail {
  id: string
  action: string
  user: string
  timestamp: string
  framework: string
  details: string
  impact: 'low' | 'medium' | 'high'
}

const COMPLIANCE_COLORS = {
  compliant: '#22C55E',
  at_risk: '#F59E0B',
  non_compliant: '#EF4444',
  not_applicable: '#6B7280'
}

const STATUS_COLORS = {
  pending: 'text-gray-600 bg-gray-50',
  in_progress: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  overdue: 'text-red-600 bg-red-50'
}

export default function ComplianceTrackerPage() {
  const router = useRouter()
  const { currentOrganization, loading: orgLoading } = useOrganizationStore()
  const { user } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<ComplianceOverview | null>(null)
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([])
  const [actions, setActions] = useState<ComplianceAction[]>([])
  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([])
  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([])
  const [timePeriod, setTimePeriod] = useState<'30d' | '90d' | '6m' | '1y'>('90d')
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'frameworks' | 'actions' | 'updates' | 'audit'>('overview')

  // Mock compliance frameworks data
  const mockFrameworks: ComplianceFramework[] = [
    {
      id: 'sox-404',
      name: 'Sarbanes-Oxley Act (SOX) 404',
      category: 'financial',
      status: 'compliant',
      score: 96,
      requirements_total: 45,
      requirements_met: 43,
      last_assessment: '2024-07-15',
      next_review: '2024-10-15',
      risk_level: 'low',
      responsible_party: 'CFO',
      icon: Scale
    },
    {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      category: 'data_privacy',
      status: 'at_risk',
      score: 78,
      requirements_total: 32,
      requirements_met: 25,
      last_assessment: '2024-08-01',
      next_review: '2024-11-01',
      risk_level: 'medium',
      responsible_party: 'Data Protection Officer',
      icon: Lock
    },
    {
      id: 'iso-27001',
      name: 'ISO 27001 Information Security',
      category: 'governance',
      status: 'compliant',
      score: 89,
      requirements_total: 114,
      requirements_met: 102,
      last_assessment: '2024-06-30',
      next_review: '2025-06-30',
      risk_level: 'low',
      responsible_party: 'CISO',
      icon: Shield
    },
    {
      id: 'environmental',
      name: 'Environmental Regulations',
      category: 'environmental',
      status: 'compliant',
      score: 92,
      requirements_total: 28,
      requirements_met: 26,
      last_assessment: '2024-05-15',
      next_review: '2024-11-15',
      risk_level: 'low',
      responsible_party: 'Chief Sustainability Officer',
      icon: Globe
    },
    {
      id: 'industry-specific',
      name: 'Industry-Specific Standards',
      category: 'industry',
      status: 'at_risk',
      score: 72,
      requirements_total: 22,
      requirements_met: 16,
      last_assessment: '2024-07-30',
      next_review: '2024-10-30',
      risk_level: 'medium',
      responsible_party: 'Chief Compliance Officer',
      icon: Building
    }
  ]

  // Mock compliance actions
  const mockActions: ComplianceAction[] = [
    {
      id: '1',
      title: 'Update Data Processing Records',
      framework: 'GDPR',
      priority: 'high',
      status: 'overdue',
      due_date: '2024-08-15',
      assigned_to: 'Data Protection Officer',
      description: 'Update data processing records to comply with GDPR Article 30',
      progress: 65,
      estimated_effort: '8 hours'
    },
    {
      id: '2',
      title: 'SOX Control Testing Q3',
      framework: 'SOX 404',
      priority: 'medium',
      status: 'in_progress',
      due_date: '2024-09-30',
      assigned_to: 'Internal Audit Team',
      description: 'Quarterly testing of internal controls over financial reporting',
      progress: 45,
      estimated_effort: '40 hours'
    },
    {
      id: '3',
      title: 'Security Awareness Training',
      framework: 'ISO 27001',
      priority: 'medium',
      status: 'pending',
      due_date: '2024-10-01',
      assigned_to: 'HR Department',
      description: 'Annual security awareness training for all employees',
      progress: 0,
      estimated_effort: '16 hours'
    },
    {
      id: '4',
      title: 'Environmental Impact Assessment',
      framework: 'Environmental Regulations',
      priority: 'low',
      status: 'completed',
      due_date: '2024-08-01',
      assigned_to: 'Environmental Consultant',
      description: 'Annual environmental impact assessment and reporting',
      progress: 100,
      estimated_effort: '24 hours'
    }
  ]

  // Mock regulatory updates
  const mockUpdates: RegulatoryUpdate[] = [
    {
      id: '1',
      title: 'EU Corporate Sustainability Reporting Directive (CSRD)',
      regulation: 'EU CSRD',
      category: 'Environmental',
      effective_date: '2025-01-01',
      impact_level: 'high',
      status: 'analyzing',
      description: 'New requirements for sustainability reporting affecting large companies'
    },
    {
      id: '2',
      title: 'Updated Cybersecurity Framework Guidelines',
      regulation: 'NIST Cybersecurity Framework',
      category: 'Information Security',
      effective_date: '2024-12-01',
      impact_level: 'medium',
      status: 'implementing',
      description: 'Enhanced guidelines for cybersecurity risk management'
    },
    {
      id: '3',
      title: 'Financial Reporting Disclosure Updates',
      regulation: 'SEC Rules',
      category: 'Financial',
      effective_date: '2024-10-01',
      impact_level: 'medium',
      status: 'monitoring',
      description: 'New disclosure requirements for financial reporting'
    }
  ]

  // Mock audit trail
  const mockAuditTrail: AuditTrail[] = [
    {
      id: '1',
      action: 'Compliance assessment completed',
      user: 'Chief Compliance Officer',
      timestamp: '2024-08-23T10:30:00Z',
      framework: 'GDPR',
      details: 'Quarterly GDPR compliance assessment completed with 78% score',
      impact: 'medium'
    },
    {
      id: '2',
      action: 'Action item created',
      user: 'System Administrator',
      timestamp: '2024-08-23T09:15:00Z',
      framework: 'SOX 404',
      details: 'Created action item for Q3 control testing',
      impact: 'low'
    },
    {
      id: '3',
      action: 'Framework status updated',
      user: 'CISO',
      timestamp: '2024-08-22T16:45:00Z',
      framework: 'ISO 27001',
      details: 'Updated ISO 27001 status to compliant after security audit',
      impact: 'high'
    }
  ]

  // Compliance trend data
  const complianceTrendData = [
    { month: 'Jan', overall: 85, sox: 94, gdpr: 72, iso: 87, environmental: 90 },
    { month: 'Feb', overall: 87, sox: 95, gdpr: 75, iso: 88, environmental: 91 },
    { month: 'Mar', overall: 86, sox: 96, gdpr: 74, iso: 89, environmental: 92 },
    { month: 'Apr', overall: 88, sox: 96, gdpr: 76, iso: 89, environmental: 92 },
    { month: 'May', overall: 89, sox: 96, gdpr: 77, iso: 89, environmental: 92 },
    { month: 'Jun', overall: 87, sox: 96, gdpr: 78, iso: 89, environmental: 92 }
  ]

  // Load compliance data
  useEffect(() => {
    if (currentOrganization && user) {
      loadComplianceData()
    }
  }, [currentOrganization, user, timePeriod])

  const loadComplianceData = async (force = false) => {
    if (!currentOrganization) return

    if (force) setRefreshing(true)
    setLoading(!force)
    setError(null)

    try {
      // Mock API call - in real implementation, this would fetch from /api/compliance/overview
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockOverview: ComplianceOverview = {
        overall_score: 87,
        total_requirements: 241,
        compliant: 212,
        at_risk: 22,
        non_compliant: 7,
        overdue_actions: 3,
        upcoming_deadlines: 8,
        last_audit_date: '2024-06-15',
        next_audit_date: '2024-12-15'
      }

      setOverview(mockOverview)
      setFrameworks(mockFrameworks)
      setActions(mockActions)
      setUpdates(mockUpdates)
      setAuditTrail(mockAuditTrail)
      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      console.error('Error loading compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadComplianceData(true)
  }

  const handleExport = async () => {
    if (!currentOrganization) return

    try {
      // Mock export functionality
      console.log('Exporting compliance report...')
    } catch (err) {
      console.error('Error exporting report:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200'
      case 'at_risk': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'non_compliant': return 'text-red-600 bg-red-50 border-red-200'
      case 'not_applicable': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Check if user has access to view compliance data
  const canViewComplianceData = currentOrganization?.user_role === 'owner' || 
                                currentOrganization?.user_role === 'admin'

  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to view compliance tracking data.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!canViewComplianceData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              Compliance tracking data is only available to organization owners and administrators.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compliance Tracker</h1>
            <p className="text-gray-600 mt-1">
              Regulatory compliance monitoring and management for {currentOrganization.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Compliance Overview */}
            {loading ? (
              <Skeleton className="h-48" />
            ) : overview ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Compliance Overview
                  </CardTitle>
                  <CardDescription>
                    Overall regulatory compliance status and key metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">
                            {overview.overall_score}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Strong Compliance Position</h3>
                        <p className="text-gray-600">
                          {overview.compliant} of {overview.total_requirements} requirements met
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {Math.round((overview.compliant / overview.total_requirements) * 100)}% compliance rate
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Next Audit</p>
                      <p className="text-lg font-semibold">
                        {new Date(overview.next_audit_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overview && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-600">Compliant</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{overview.compliant}</p>
                      <p className="text-sm text-gray-500">requirements</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-medium text-gray-600">At Risk</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{overview.at_risk}</p>
                      <p className="text-sm text-gray-500">requirements</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-gray-600">Non-Compliant</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{overview.non_compliant}</p>
                      <p className="text-sm text-gray-500">requirements</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-gray-600">Overdue Actions</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{overview.overdue_actions}</p>
                      <p className="text-sm text-gray-500">actions</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Compliance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Trends</CardTitle>
                <CardDescription>
                  Compliance score evolution across frameworks over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="overall" stroke="#3B82F6" strokeWidth={3} name="Overall" />
                      <Line type="monotone" dataKey="sox" stroke="#22C55E" strokeWidth={2} name="SOX 404" />
                      <Line type="monotone" dataKey="gdpr" stroke="#F59E0B" strokeWidth={2} name="GDPR" />
                      <Line type="monotone" dataKey="iso" stroke="#8B5CF6" strokeWidth={2} name="ISO 27001" />
                      <Line type="monotone" dataKey="environmental" stroke="#10B981" strokeWidth={2} name="Environmental" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frameworks" className="space-y-6">
            {/* Compliance Frameworks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockFrameworks.map((framework) => (
                <Card key={framework.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <framework.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{framework.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{framework.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(framework.status)}
                      >
                        {framework.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Compliance Score</span>
                          <span className="font-medium">{framework.score}%</span>
                        </div>
                        <Progress value={framework.score} className="h-3" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requirements Met</span>
                          <div className="font-semibold">
                            {framework.requirements_met}/{framework.requirements_total}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Risk Level</span>
                          <div className={`font-semibold ${
                            framework.risk_level === 'low' ? 'text-green-600' :
                            framework.risk_level === 'medium' ? 'text-amber-600' :
                            framework.risk_level === 'high' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {framework.risk_level.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-500">Responsible Party</span>
                          <span className="font-medium">{framework.responsible_party}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Next Review</span>
                          <span className="font-medium">
                            {new Date(framework.next_review).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            {/* Compliance Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Actions</CardTitle>
                <CardDescription>
                  Active compliance tasks and remediation actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActions.map((action) => (
                    <div key={action.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{action.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={getPriorityColor(action.priority)}
                            >
                              {action.priority.toUpperCase()}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={STATUS_COLORS[action.status as keyof typeof STATUS_COLORS]}
                            >
                              {action.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Framework</span>
                              <div className="font-semibold">{action.framework}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Progress</span>
                              <div className="font-semibold">{action.progress}%</div>
                              <Progress value={action.progress} className="h-1 mt-1" />
                            </div>
                            <div>
                              <span className="text-gray-500">Due Date</span>
                              <div className="font-semibold">
                                {new Date(action.due_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Assigned To</span>
                              <div className="font-semibold">{action.assigned_to}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Effort</span>
                              <div className="font-semibold">{action.estimated_effort}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="space-y-6">
            {/* Regulatory Updates */}
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Updates</CardTitle>
                <CardDescription>
                  Recent and upcoming regulatory changes requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockUpdates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{update.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={getImpactColor(update.impact_level)}
                            >
                              {update.impact_level.toUpperCase()} IMPACT
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-blue-600 bg-blue-50"
                            >
                              {update.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{update.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Regulation</span>
                              <div className="font-semibold">{update.regulation}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Category</span>
                              <div className="font-semibold">{update.category}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Effective Date</span>
                              <div className="font-semibold">
                                {new Date(update.effective_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            {/* Audit Trail */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Recent compliance-related activities and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAuditTrail.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`p-1 rounded-full ${getImpactColor(entry.impact)}`}>
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{entry.action}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{entry.details}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>User: {entry.user}</span>
                          <span>Framework: {entry.framework}</span>
                          <span className={`px-2 py-1 rounded ${getImpactColor(entry.impact)}`}>
                            {entry.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}