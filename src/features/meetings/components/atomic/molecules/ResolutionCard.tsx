'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ResolutionCardProps } from '../types'
import { StatusBadge, VoteIndicator, PriorityIndicator } from '../atoms'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Vote, 
  Timer, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  Scale, 
  FileCheck,
  AlertTriangle
} from 'lucide-react'

/**
 * ResolutionCard - Molecular component for displaying resolution information
 * 
 * Features:
 * - Comprehensive resolution display with all key information
 * - Interactive voting results visualization
 * - Status-based styling and compliance indicators
 * - Compact and full view modes
 * - Accessible action buttons with proper ARIA labels
 */
export const ResolutionCard: React.FC<ResolutionCardProps> = ({
  id,
  resolutionNumber,
  title,
  description,
  status,
  type,
  priority,
  proposedAt,
  votingResults,
  compliance,
  actions,
  canManage = false,
  compact = false,
  className,
  'data-testid': testId,
  ...props
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const typeLabels = {
    motion: 'Motion',
    amendment: 'Amendment',
    policy: 'Policy',
    directive: 'Directive',
    appointment: 'Appointment',
    financial: 'Financial',
    strategic: 'Strategic',
    other: 'Other'
  }
  
  const handleAction = (action: string, callback?: () => void) => {
    if (callback) {
      callback()
    }
  }
  
  const renderVotingResults = () => {
    if (!votingResults) return null
    
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Voting Results</span>
          <span className="text-sm text-gray-500">
            {votingResults.participation}% participation
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <VoteIndicator
            count={Math.round((votingResults.forPercentage / 100) * 100)} // Simplified for display
            total={100}
            voteType="for"
            size="sm"
            showPercentage
          />
          <VoteIndicator
            count={Math.round((votingResults.againstPercentage / 100) * 100)}
            total={100}
            voteType="against"
            size="sm"
            showPercentage
          />
          <VoteIndicator
            count={Math.round((votingResults.abstainPercentage / 100) * 100)}
            total={100}
            voteType="abstain"
            size="sm"
            showPercentage
          />
        </div>
      </div>
    )
  }
  
  const renderComplianceIndicators = () => {
    if (!compliance || (!compliance.requiresBoardApproval && !compliance.requiresShareholderApproval && !compliance.legalReviewRequired)) {
      return null
    }
    
    return (
      <div className="flex items-center flex-wrap gap-2 mt-3">
        {compliance.requiresBoardApproval && (
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            <FileCheck className="h-3 w-3 mr-1" />
            Board Approval Required
          </Badge>
        )}
        {compliance.requiresShareholderApproval && (
          <Badge className="bg-purple-100 text-purple-700 text-xs">
            <Users className="h-3 w-3 mr-1" />
            Shareholder Approval
          </Badge>
        )}
        {compliance.legalReviewRequired && (
          <Badge className="bg-orange-100 text-orange-700 text-xs">
            <Scale className="h-3 w-3 mr-1" />
            Legal Review
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <Card 
      className={cn(
        'hover:shadow-md transition-shadow',
        compact && 'p-4',
        className
      )}
      data-testid={testId || `resolution-card-${id}`}
      {...props}
    >
      <CardContent className={cn('p-6', compact && 'p-4')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              {resolutionNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  {resolutionNumber}
                </Badge>
              )}
              <StatusBadge status={status} size="sm" />
              <Badge variant="outline" className="text-xs">
                {typeLabels[type]}
              </Badge>
              {priority <= 2 && (
                <PriorityIndicator 
                  priority={priority} 
                  size="sm" 
                  variant="badge"
                />
              )}
            </div>
            
            {/* Title and description */}
            <h3 className={cn(
              'font-semibold text-gray-900 mb-2',
              compact ? 'text-base' : 'text-lg'
            )}>
              {title}
            </h3>
            
            {!compact && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Metadata */}
            <div className={cn(
              'grid gap-4 text-sm',
              compact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'
            )}>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium">Proposed</p>
                  <p className="text-gray-500">{formatDate(proposedAt)}</p>
                </div>
              </div>
              
              {votingResults && (
                <div className="flex items-center space-x-2">
                  <Vote className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Participation</p>
                    <p className="text-gray-500">{votingResults.participation}%</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Voting results */}
            {!compact && renderVotingResults()}
            
            {/* Compliance indicators */}
            {!compact && renderComplianceIndicators()}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            {actions?.onView && (
              <Button 
                variant="outline" 
                size={compact ? "sm" : "sm"}
                onClick={() => handleAction('view', actions.onView)}
                aria-label={`View resolution ${title}`}
              >
                <Eye className="h-4 w-4 mr-1" />
                {!compact && 'View'}
              </Button>
            )}
            
            {canManage && actions?.onEdit && (
              <Button 
                variant="ghost" 
                size={compact ? "sm" : "sm"}
                onClick={() => handleAction('edit', actions.onEdit)}
                aria-label={`Edit resolution ${title}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {canManage && actions?.onDelete && (
              <Button 
                variant="ghost" 
                size={compact ? "sm" : "sm"}
                onClick={() => handleAction('delete', actions.onDelete)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Delete resolution ${title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

ResolutionCard.displayName = 'ResolutionCard'