/**
 * Compliance Alert Badge Atom Component
 * Displays the severity level of a compliance alert with appropriate styling
 */

import React from 'react'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react'

export type ComplianceAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

interface ComplianceAlertBadgeProps {
  severity: ComplianceAlertSeverity
  showIcon?: boolean
  className?: string
}

const severityConfig = {
  low: {
    label: 'Low',
    icon: Info,
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-600 border-gray-200'
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    variant: 'secondary' as const,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    variant: 'secondary' as const,
    className: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  critical: {
    label: 'Critical',
    icon: Zap,
    variant: 'destructive' as const,
    className: 'bg-red-50 text-red-700 border-red-200'
  }
}

export const ComplianceAlertBadge: React.FC<ComplianceAlertBadgeProps> = ({
  severity,
  showIcon = true,
  className
}) => {
  const config = severityConfig[severity]
  const Icon = config.icon
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

export default ComplianceAlertBadge