/**
 * Transcription Status Indicator Atom Component
 * Shows the processing status of meeting transcriptions
 */

import React from 'react'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { Clock, Loader2, CheckCircle, XCircle, Play } from 'lucide-react'

export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'queued'

interface TranscriptionStatusIndicatorProps {
  status: TranscriptionStatus
  showIcon?: boolean
  animate?: boolean
  className?: string
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-600 border-gray-200'
  },
  queued: {
    label: 'Queued',
    icon: Play,
    variant: 'secondary' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    variant: 'secondary' as const,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    animate: true
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    variant: 'secondary' as const,
    className: 'bg-green-50 text-green-700 border-green-200'
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    variant: 'destructive' as const,
    className: 'bg-red-50 text-red-700 border-red-200'
  }
}

export const TranscriptionStatusIndicator: React.FC<TranscriptionStatusIndicatorProps> = ({
  status,
  showIcon = true,
  animate = true,
  className
}) => {
  const config = statusConfig[status]
  const Icon = config.icon
  const shouldAnimate = animate && config.animate
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "w-3 h-3 mr-1",
            shouldAnimate && "animate-spin"
          )} 
        />
      )}
      {config.label}
    </Badge>
  )
}

export default TranscriptionStatusIndicator