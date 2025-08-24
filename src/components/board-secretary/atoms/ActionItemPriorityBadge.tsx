/**
 * Action Item Priority Badge Atom Component
 * Displays the priority level of an action item with appropriate styling
 */

import React from 'react'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react'

export type ActionItemPriority = 'low' | 'medium' | 'high' | 'urgent'

interface ActionItemPriorityBadgeProps {
  priority: ActionItemPriority
  showIcon?: boolean
  className?: string
}

const priorityConfig = {
  low: {
    label: 'Low',
    icon: ArrowDown,
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-600 border-gray-200'
  },
  medium: {
    label: 'Medium',
    icon: Minus,
    variant: 'secondary' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  high: {
    label: 'High',
    icon: ArrowUp,
    variant: 'secondary' as const,
    className: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    variant: 'destructive' as const,
    className: 'bg-red-50 text-red-700 border-red-200'
  }
}

export const ActionItemPriorityBadge: React.FC<ActionItemPriorityBadgeProps> = ({
  priority,
  showIcon = true,
  className
}) => {
  const config = priorityConfig[priority]
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

export default ActionItemPriorityBadge