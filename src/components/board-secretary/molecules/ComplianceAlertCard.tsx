/**
 * Compliance Alert Card Molecule Component
 * Displays compliance alerts with severity indicators and action buttons
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { ComplianceAlertBadge, type ComplianceAlertSeverity } from '../atoms/ComplianceAlertBadge'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Calendar, 
  ExternalLink,
  Eye,
  EyeOff,
  MoreHorizontal,
  Clock,
  Building,
  FileText,
  AlertTriangle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ComplianceAlertType = 'upcoming_deadline' | 'overdue' | 'regulatory_change' | 'frequency_violation' | 'director_qualification'

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
  compliance_requirement?: {
    requirement_name: string
    regulatory_body?: string
    next_due_date?: string
    responsible_party?: string
  }
}

interface ComplianceAlertCardProps {
  alert: ComplianceAlert
  onMarkAsRead?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  onViewRequirement?: (requirementId: string) => void
  onTakeAction?: (alertId: string) => void
  className?: string
  compact?: boolean
}

const alertTypeConfig = {
  upcoming_deadline: {
    label: 'Upcoming Deadline',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  regulatory_change: {
    label: 'Regulatory Change',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  frequency_violation: {
    label: 'Frequency Violation',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  director_qualification: {
    label: 'Director Qualification',
    icon: Building,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
}

export const ComplianceAlertCard: React.FC<ComplianceAlertCardProps> = ({
  alert,
  onMarkAsRead,
  onDismiss,
  onViewRequirement,
  onTakeAction,
  className,
  compact = false
}) => {
  const typeConfig = alertTypeConfig[alert.alert_type]
  const Icon = typeConfig.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDaysUntilDue = () => {
    if (!alert.compliance_requirement?.next_due_date) return null
    
    const today = new Date()
    const dueDate = new Date(alert.compliance_requirement.next_due_date)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`
    } else {
      return null
    }
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      !alert.is_read && "border-l-4 border-l-blue-500 bg-blue-50/30",
      alert.severity === 'critical' && "border-l-4 border-l-red-500 bg-red-50/30",
      alert.is_dismissed && "opacity-60",
      className
    )}>
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-2 rounded-lg",
              typeConfig.bgColor
            )}>
              <Icon className={cn("h-4 w-4", typeConfig.color)} />
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-semibold",
                  compact ? "text-sm" : "text-base",
                  !alert.is_read && "font-bold"
                )}>
                  {alert.alert_title}
                </h3>
                {!alert.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {typeConfig.label}
                </Badge>
                <ComplianceAlertBadge severity={alert.severity} />
                {alert.auto_generated && (
                  <Badge variant="secondary" className="text-xs">
                    Auto
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!alert.is_read && onMarkAsRead && (
                <DropdownMenuItem onClick={() => onMarkAsRead(alert.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Mark as Read
                </DropdownMenuItem>
              )}
              {onViewRequirement && (
                <DropdownMenuItem onClick={() => onViewRequirement(alert.compliance_requirement_id)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Requirement
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!alert.is_dismissed && onDismiss && (
                <DropdownMenuItem onClick={() => onDismiss(alert.id)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Dismiss
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "space-y-2")}>
        <p className={cn(
          "text-muted-foreground",
          compact ? "text-xs line-clamp-2" : "text-sm"
        )}>
          {alert.alert_message}
        </p>
        
        {alert.compliance_requirement && !compact && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="font-medium text-sm">
              {alert.compliance_requirement.requirement_name}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {alert.compliance_requirement.regulatory_body && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span>{alert.compliance_requirement.regulatory_body}</span>
                </div>
              )}
              
              {alert.compliance_requirement.next_due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(alert.compliance_requirement.next_due_date)}</span>
                  {formatDaysUntilDue() && (
                    <span className="font-medium text-orange-600">
                      ({formatDaysUntilDue()})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(alert.alert_date)}</span>
          </div>
          
          {alert.action_required && onTakeAction && (
            <Button 
              size="sm" 
              variant={alert.severity === 'critical' ? 'destructive' : 'default'}
              onClick={() => onTakeAction(alert.id)}
            >
              Take Action
            </Button>
          )}
        </div>
        
        {alert.is_dismissed && alert.dismissed_at && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Dismissed on {formatDate(alert.dismissed_at)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ComplianceAlertCard