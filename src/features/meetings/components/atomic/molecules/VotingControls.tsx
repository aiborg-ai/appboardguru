'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { VotingControlsProps } from '../types'
import { StatusBadge, QuorumMeter } from '../atoms'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Vote, 
  Check, 
  X, 
  Minus, 
  Play, 
  Square, 
  Users,
  Timer,
  AlertCircle
} from 'lucide-react'

/**
 * VotingControls - Molecular component for managing resolution voting
 * 
 * Features:
 * - Complete voting interface with method selection
 * - Real-time vote casting with visual feedback
 * - Voting session management (start/end)
 * - User vote status tracking
 * - Accessible voting buttons with clear labels
 */
export const VotingControls: React.FC<VotingControlsProps> = ({
  resolutionId,
  isActive,
  method,
  userVote,
  canVote = true,
  onVote,
  onStartVoting,
  onEndVoting,
  canManage = false,
  compact = false,
  className,
  'data-testid': testId,
  ...props
}) => {
  const [selectedMethod, setSelectedMethod] = useState<typeof method>('voice')
  const [isVoting, setIsVoting] = useState(false)
  
  const votingMethods = {
    voice: 'Voice Vote',
    show_of_hands: 'Show of Hands',
    secret_ballot: 'Secret Ballot',
    electronic: 'Electronic',
    unanimous_consent: 'Unanimous Consent',
    roll_call: 'Roll Call'
  }
  
  const voteChoices = [
    { value: 'for', label: 'For', icon: Check, color: 'bg-green-600 hover:bg-green-700' },
    { value: 'against', label: 'Against', icon: X, color: 'bg-red-600 hover:bg-red-700' },
    { value: 'abstain', label: 'Abstain', icon: Minus, color: 'bg-yellow-600 hover:bg-yellow-700' }
  ] as const
  
  const handleVoteClick = async (choice: 'for' | 'against' | 'abstain') => {
    if (!canVote || !onVote || userVote) return
    
    setIsVoting(true)
    try {
      await onVote(choice)
    } catch (error) {
      console.error('Failed to cast vote:', error)
    } finally {
      setIsVoting(false)
    }
  }
  
  const handleStartVoting = async () => {
    if (!canManage || !onStartVoting || !selectedMethod) return
    
    try {
      await onStartVoting(selectedMethod)
    } catch (error) {
      console.error('Failed to start voting:', error)
    }
  }
  
  const handleEndVoting = async () => {
    if (!canManage || !onEndVoting) return
    
    try {
      await onEndVoting()
    } catch (error) {
      console.error('Failed to end voting:', error)
    }
  }
  
  // Voting not started - show method selection for managers
  if (!isActive && canManage) {
    return (
      <div
        className={cn('p-4 border rounded-lg bg-gray-50', className)}
        data-testid={testId || 'voting-controls-setup'}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Vote className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Start Voting</h3>
          </div>
          <StatusBadge status="proposed" size="sm" />
        </div>
        
        {!compact && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voting Method
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select voting method"
            >
              {Object.entries(votingMethods).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <Button
          onClick={handleStartVoting}
          className="w-full"
          disabled={!selectedMethod}
          aria-label={`Start voting using ${selectedMethod ? votingMethods[selectedMethod] : 'selected method'}`}
        >
          <Play className="h-4 w-4 mr-2" />
          Start Voting
        </Button>
      </div>
    )
  }
  
  // Voting not started - show waiting state for non-managers
  if (!isActive) {
    return (
      <div
        className={cn('p-4 border rounded-lg bg-gray-50 text-center', className)}
        data-testid={testId || 'voting-controls-waiting'}
        {...props}
      >
        <Timer className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600">Voting has not started for this resolution</p>
      </div>
    )
  }
  
  // Voting active - show voting interface
  return (
    <div
      className={cn('p-4 border rounded-lg bg-blue-50 border-blue-200', className)}
      data-testid={testId || 'voting-controls-active'}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Vote className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Cast Your Vote</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-700">
            {method && votingMethods[method]}
          </Badge>
          <StatusBadge status="proposed" size="sm" />
        </div>
      </div>
      
      {/* User voting status */}
      {userVote ? (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">
              You voted: <span className="capitalize">{userVote}</span>
            </span>
          </div>
        </div>
      ) : canVote ? (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Select your vote for this resolution:
          </p>
          <div className={cn(
            'grid gap-2',
            compact ? 'grid-cols-1' : 'grid-cols-3'
          )}>
            {voteChoices.map(({ value, label, icon: Icon, color }) => (
              <Button
                key={value}
                onClick={() => handleVoteClick(value)}
                disabled={isVoting || !!userVote}
                className={cn(
                  'text-white',
                  color,
                  compact && 'justify-start'
                )}
                aria-label={`Vote ${label.toLowerCase()} on this resolution`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">
              You are not eligible to vote on this resolution
            </span>
          </div>
        </div>
      )}
      
      {/* Management controls */}
      {canManage && (
        <div className="pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Voting Session</span>
            </div>
            <Button
              onClick={handleEndVoting}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              aria-label="End voting session"
            >
              <Square className="h-4 w-4 mr-1" />
              End Voting
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

VotingControls.displayName = 'VotingControls'