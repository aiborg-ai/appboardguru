/**
 * Compliance Dashboard Organism Component
 * Comprehensive dashboard for monitoring compliance requirements and alerts
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ComplianceAlertCard, type ComplianceAlertType } from '../molecules/ComplianceAlertCard'
import { ComplianceAlertBadge, type ComplianceAlertSeverity } from '../atoms/ComplianceAlertBadge'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Search, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  FileText,
  Calendar,
  Zap,
  RefreshCw
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

interface ComplianceRequirement {
  id: string
  board_id: string
  requirement_name: string
  requirement_type: 'filing' | 'meeting' | 'reporting' | 'governance' | 'regulatory'
  description?: string
  regulatory_body?: string
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'one_time'
  next_due_date?: string
  days_notice_required: number
  responsible_party?: string
  is_mandatory: boolean
  penalty_description?: string
  reference_documents: any[]
  last_completed?: string
  completion_status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived'
  ai_monitored: boolean
  created_by: string
  created_at: string
  updated_at: string
}

interface ComplianceAlert {
  id: string
  compliance_requirement_id: string
  alert_type: ComplianceAlertType
  alert_title: string
  alert_message: string
  severity: ComplianceAlertSeverity
  target_audience: string[]
  alert_date: string
  is_read: boolean
  is_dismissed: boolean
  action_required: boolean
  auto_generated: boolean
  metadata: any
  read_by: string[]
  dismissed_by?: string
  dismissed_at?: string
  created_at: string
  compliance_requirement?: ComplianceRequirement
}

interface ComplianceDashboardProps {
  requirements: ComplianceRequirement[]
  alerts: ComplianceAlert[]
  loading?: boolean
  onCreateRequirement?: () => void
  onCheckCompliance?: () => void
  onMarkAlertRead?: (alertId: string) => void
  onDismissAlert?: (alertId: string) => void
  onViewRequirement?: (requirementId: string) => void
  onTakeAction?: (alertId: string) => void
  onUpdateRequirement?: (requirementId: string) => void
  className?: string
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  requirements,
  alerts,
  loading = false,
  onCreateRequirement,
  onCheckCompliance,
  onMarkAlertRead,
  onDismissAlert,
  onViewRequirement,
  onTakeAction,
  onUpdateRequirement,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (searchQuery && !alert.alert_title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && alert.alert_type !== typeFilter) {
        return false
      }
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false
      }
      return true
    })
  }, [alerts, searchQuery, typeFilter, severityFilter])

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      if (searchQuery && !req.requirement_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && req.requirement_type !== typeFilter) {
        return false
      }
      if (statusFilter !== 'all' && req.completion_status !== statusFilter) {
        return false
      }
      return true
    })
  }, [requirements, searchQuery, typeFilter, statusFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRequirements = requirements.length
    const activeRequirements = requirements.filter(req => req.completion_status !== 'waived').length
    const overdueRequirements = requirements.filter(req => 
      req.next_due_date && 
      new Date(req.next_due_date) < new Date() && 
      req.completion_status !== 'completed'
    ).length
    const upcomingDeadlines = requirements.filter(req => {
      if (!req.next_due_date) return false
      const dueDate = new Date(req.next_due_date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue >= 0 && daysUntilDue <= 30
    }).length

    const totalAlerts = alerts.length
    const unreadAlerts = alerts.filter(alert => !alert.is_read).length
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.is_dismissed).length
    const pendingActions = alerts.filter(alert => alert.action_required && !alert.is_dismissed).length

    const complianceRate = totalRequirements > 0 
      ? ((totalRequirements - overdueRequirements) / totalRequirements) * 100 
      : 100

    return {
      totalRequirements,
      activeRequirements,
      overdueRequirements,
      upcomingDeadlines,
      totalAlerts,
      unreadAlerts,
      criticalAlerts,
      pendingActions,
      complianceRate
    }
  }, [requirements, alerts])

  // Group alerts by severity
  const alertsBySeverity = useMemo(() => {
    return {
      all: filteredAlerts,
      critical: filteredAlerts.filter(alert => alert.severity === 'critical'),
      high: filteredAlerts.filter(alert => alert.severity === 'high'),
      medium: filteredAlerts.filter(alert => alert.severity === 'medium'),
      low: filteredAlerts.filter(alert => alert.severity === 'low')
    }
  }, [filteredAlerts])

  const RequirementCardSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardContent>
    </Card>
  )

  const RequirementCard: React.FC<{ requirement: ComplianceRequirement }> = ({ requirement }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const getDaysUntilDue = () => {
      if (!requirement.next_due_date) return null
      const dueDate = new Date(requirement.next_due_date)
      const today = new Date()
      const diffTime = dueDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    const daysUntilDue = getDaysUntilDue()
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0
    const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7

    return (
      <Card className={cn(
        "hover:shadow-md transition-all duration-200",
        isOverdue && "border-l-4 border-l-red-500",
        isUrgent && "border-l-4 border-l-orange-500"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate">
                  {requirement.requirement_name}
                </h3>
                {requirement.is_mandatory && (
                  <Badge variant="destructive" className="text-xs">
                    Mandatory
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {requirement.requirement_type.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge 
                  variant={requirement.completion_status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {requirement.completion_status.replace('_', ' ').toUpperCase()}
                </Badge>
                {requirement.ai_monitored && (
                  <Badge variant="outline" className="text-xs">
                    AI Monitored
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {requirement.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {requirement.description}
            </p>
          )}
          
          <div className="flex items-center gap-4">
            {requirement.regulatory_body && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building className="h-3 w-3" />
                <span>{requirement.regulatory_body}</span>
              </div>
            )}
            
            {requirement.next_due_date && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(requirement.next_due_date)}</span>
                {daysUntilDue !== null && (
                  <span className={cn(
                    "ml-1 font-medium",
                    isOverdue && "text-red-600",
                    isUrgent && "text-orange-600"
                  )}>
                    ({daysUntilDue < 0 
                      ? `${Math.abs(daysUntilDue)} days overdue` 
                      : daysUntilDue === 0 
                        ? 'Due today'
                        : `${daysUntilDue} days left`
                    })
                  </span>
                )}
              </div>
            )}
          </div>
          
          {requirement.frequency && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Frequency: {requirement.frequency.replace('_', ' ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor compliance requirements and alerts with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onCheckCompliance && (
            <Button variant="outline" onClick={onCheckCompliance}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Compliance
            </Button>
          )}
          {onCreateRequirement && (
            <Button onClick={onCreateRequirement}>
              <Plus className="mr-2 h-4 w-4" />
              New Requirement
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(stats.complianceRate)}%
                  </p>
                  <Progress value={stats.complianceRate} className="h-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">{stats.overdueRequirements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.upcomingDeadlines}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {stats.criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {stats.criticalAlerts} critical compliance alerts require immediate attention
                </p>
                <p className="text-sm text-red-600">
                  Review and address these alerts to maintain compliance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search compliance items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="filing">Filing</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
                <SelectItem value="governance">Governance</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            Alerts
            <Badge variant="destructive" className="ml-2">
              {stats.unreadAlerts}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            Requirements
            <Badge variant="secondary" className="ml-2">
              {filteredRequirements.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(alertsBySeverity).map(([severity, severityAlerts]) => (
                <TabsTrigger key={severity} value={severity} className="flex items-center gap-2">
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  <Badge variant="secondary" className="ml-2">
                    {severityAlerts.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(alertsBySeverity).map(([severity, severityAlerts]) => (
              <TabsContent key={severity} value={severity} className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <RequirementCardSkeleton key={index} />
                    ))}
                  </div>
                ) : severityAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {severityAlerts.map((alert) => (
                      <ComplianceAlertCard
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={onMarkAlertRead}
                        onDismiss={onDismissAlert}
                        onViewRequirement={onViewRequirement}
                        onTakeAction={onTakeAction}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                      <p className="text-muted-foreground">
                        {severity === 'all' ? "All clear! No compliance alerts at this time." : `No ${severity} severity alerts found.`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <RequirementCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredRequirements.length > 0 ? (
            <div className="space-y-4">
              {filteredRequirements.map((requirement) => (
                <RequirementCard key={requirement.id} requirement={requirement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requirements found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? "No requirements match your current filters."
                    : "Get started by creating your first compliance requirement."
                  }
                </p>
                {onCreateRequirement && (
                  <Button onClick={onCreateRequirement}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Requirement
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ComplianceDashboard