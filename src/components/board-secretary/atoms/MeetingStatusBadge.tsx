/**
 * Meeting Status Badge Atom Component
 * Displays the status of a board meeting with appropriate styling
 */

import React from 'react'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'

interface MeetingStatusBadgeProps {
  status: MeetingStatus
  className?: string
}

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    variant: 'secondary' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
  },
  in_progress: {
    label: 'In Progress',
    variant: 'secondary' as const,
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
  },
  completed: {
    label: 'Completed',
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive' as const,
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
  },
  postponed: {
    label: 'Postponed',
    variant: 'secondary' as const,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
  }
}

export const MeetingStatusBadge: React.FC<MeetingStatusBadgeProps> = ({
  status,
  className
}) => {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

export default MeetingStatusBadge