'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { VotingPanelProps } from '../types'
import { VotingControls } from '../molecules'
import { VoteIndicator, StatusBadge, QuorumMeter } from '../atoms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Vote, 
  Clock, 
  Users, 
  Calendar, 
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

/**
 * VotingPanel - Organism component for comprehensive voting management
 * 
 * Features:
 * - Complete voting session management
 * - Real-time voting results display
 * - Quorum tracking and visualization
 * - Voting history and participation metrics
 * - Accessible voting interface
 * - Live updates during voting sessions
 */
export const VotingPanel: React.FC<VotingPanelProps> = ({
  resolution,
  votingState,
  userVoting,
  actions,
  realTime = false,
  size = 'md',
  className,
  'data-testid': testId,
  ...props
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0)
  
  // Timer for active voting sessions
  useEffect(() => {
    if (!votingState.isActive || !votingState.startedAt) return
    
    const startTime = new Date(votingState.startedAt).getTime()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setTimeElapsed(elapsed)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [votingState.isActive, votingState.startedAt])
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const totalVotes = votingState.results.for + votingState.results.against + votingState.results.abstain
  const participationRate = votingState.totalEligible > 0 
    ? Math.round((votingState.votedCount / votingState.totalEligible) * 100)
    : 0
  
  const hasQuorum = votingState.votedCount >= Math.ceil(votingState.totalEligible * 0.5) // Simple 50% quorum
  
  const sizeConfig = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }
  
  const renderResolutionInfo = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className={cn('text-gray-900 mb-2', sizeConfig[size])}>
              {resolution.title}
            </CardTitle>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {resolution.description}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Proposed by {resolution.proposedBy}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(resolution.proposedAt)}</span>
              </div>
            </div>
          </div>
          
          <StatusBadge 
            status={votingState.isActive ? 'proposed' : 'tabled'} 
            size="sm" 
          />
        </div>
      </CardHeader>
      
      {resolution.resolutionText && (
        <CardContent className="pt-0">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resolution Text:</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {resolution.resolutionText}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
  
  const renderVotingStatus = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Voting Status</span>
          {realTime && (
            <Badge className="bg-green-100 text-green-700 text-xs ml-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voting session info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-semibold text-gray-900">{votingState.totalEligible}</div>
            <div className="text-gray-600">Eligible Voters</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="font-semibold text-blue-900">{votingState.votedCount}</div>
            <div className="text-blue-700">Votes Cast</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="font-semibold text-green-900">{participationRate}%</div>
            <div className="text-green-700">Participation</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="font-semibold text-purple-900">
              {votingState.isActive ? formatTime(timeElapsed) : '—'}
            </div>
            <div className="text-purple-700">Duration</div>
          </div>
        </div>
        
        {/* Quorum meter */}
        <QuorumMeter
          current={votingState.votedCount}
          required={Math.ceil(votingState.totalEligible * 0.5)}
          total={votingState.totalEligible}
          size={size}
          showDetails
          animated
        />
        
        {/* Quorum status */}
        <div className={cn(
          'flex items-center space-x-2 p-3 rounded-lg',
          hasQuorum ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        )}>
          {hasQuorum ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span className="font-medium">
            {hasQuorum ? 'Quorum achieved' : 'Quorum pending'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderVotingResults = () => {
    if (totalVotes === 0) return null
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Vote className="h-5 w-5" />
            <span>Current Results</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <VoteIndicator
              count={votingState.results.for}
              total={totalVotes}
              voteType="for"
              size={size}
              showPercentage
            />
            <VoteIndicator
              count={votingState.results.against}
              total={totalVotes}
              voteType="against"
              size={size}
              showPercentage
            />
            <VoteIndicator
              count={votingState.results.abstain}
              total={totalVotes}
              voteType="abstain"
              size={size}
              showPercentage
            />
          </div>
          
          {/* Detailed breakdown */}
          <div className="grid grid-cols-3 gap-4 text-sm text-center">
            <div>
              <div className="font-semibold text-green-700">
                {votingState.results.for} votes
              </div>
              <div className="text-gray-500">
                {totalVotes > 0 ? Math.round((votingState.results.for / totalVotes) * 100) : 0}%
              </div>
            </div>
            <div>
              <div className="font-semibold text-red-700">
                {votingState.results.against} votes
              </div>
              <div className="text-gray-500">
                {totalVotes > 0 ? Math.round((votingState.results.against / totalVotes) * 100) : 0}%
              </div>
            </div>
            <div>
              <div className="font-semibold text-yellow-700">
                {votingState.results.abstain} votes
              </div>
              <div className="text-gray-500">
                {totalVotes > 0 ? Math.round((votingState.results.abstain / totalVotes) * 100) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const renderVotingControls = () => (
    <VotingControls
      resolutionId={resolution.id}
      isActive={votingState.isActive}
      method={votingState.method}
      userVote={userVoting.voteChoice}
      canVote={userVoting.canVote}
      onVote={actions.onCastVote}
      onStartVoting={actions.onStartVoting}
      onEndVoting={actions.onConcludeVoting}
      canManage={true} // This would be determined by permissions
      compact={size === 'sm'}
    />
  )
  
  return (
    <div
      className={cn('space-y-6', className)}
      data-testid={testId || 'voting-panel'}
      {...props}
    >
      {renderResolutionInfo()}
      
      {votingState.isActive && renderVotingStatus()}
      
      {renderVotingResults()}
      
      {renderVotingControls()}
    </div>
  )
}

VotingPanel.displayName = 'VotingPanel'