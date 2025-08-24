'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  Check,
  X,
  Minus,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Timer,
  Vote,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Share2,
  History
} from 'lucide-react';

interface VoteOption {
  id: string;
  label: string;
  description?: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  type: 'simple' | 'special' | 'unanimous';
  status: 'draft' | 'voting' | 'passed' | 'failed' | 'withdrawn';
  votingStarted?: Date;
  votingEnds?: Date;
  requiredMajority: number;
  totalEligibleVoters: number;
  anonymousVoting: boolean;
  allowProxy: boolean;
  votes: { [participantId: string]: Vote };
  history: VoteHistoryEntry[];
}

interface Vote {
  option: 'for' | 'against' | 'abstain';
  timestamp: Date;
  confidence?: number; // 1-5 scale
  proxy?: boolean;
  proxyGrantor?: string;
}

interface VoteHistoryEntry {
  timestamp: Date;
  action: 'started' | 'vote_cast' | 'vote_changed' | 'ended';
  participant?: string;
  details?: any;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  votingPower: number;
  hasVoted: boolean;
  proxyHolder?: string;
  proxyGrantees?: string[];
}

interface TabletVotingInterfaceProps {
  resolution: Resolution;
  participants: Participant[];
  currentUserId: string;
  canManage: boolean;
  onVote: (resolutionId: string, vote: Omit<Vote, 'timestamp'>) => void;
  onManageVoting: (resolutionId: string, action: string, data?: any) => void;
  className?: string;
}

const VOTE_OPTIONS: VoteOption[] = [
  {
    id: 'for',
    label: 'For',
    description: 'Vote in favor of the resolution',
    color: 'rgb(34, 197, 94)', // green-500
    icon: Check
  },
  {
    id: 'against',
    label: 'Against', 
    description: 'Vote against the resolution',
    color: 'rgb(239, 68, 68)', // red-500
    icon: X
  },
  {
    id: 'abstain',
    label: 'Abstain',
    description: 'Abstain from voting',
    color: 'rgb(156, 163, 175)', // gray-400
    icon: Minus
  }
];

export const TabletVotingInterface: React.FC<TabletVotingInterfaceProps> = ({
  resolution,
  participants,
  currentUserId,
  canManage,
  onVote,
  onManageVoting,
  className
}) => {
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [activeView, setActiveView] = useState<'voting' | 'results' | 'history'>('voting');
  const [animateResults, setAnimateResults] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate vote statistics
  const voteStats = React.useMemo(() => {
    const votes = Object.values(resolution.votes);
    const totalVotes = votes.length;
    const totalEligible = resolution.totalEligibleVoters;
    
    const forVotes = votes.filter(v => v.option === 'for').length;
    const againstVotes = votes.filter(v => v.option === 'against').length;
    const abstainVotes = votes.filter(v => v.option === 'abstain').length;
    
    const forPercentage = totalEligible > 0 ? (forVotes / totalEligible) * 100 : 0;
    const againstPercentage = totalEligible > 0 ? (againstVotes / totalEligible) * 100 : 0;
    const abstainPercentage = totalEligible > 0 ? (abstainVotes / totalEligible) * 100 : 0;
    const notVotedPercentage = totalEligible > 0 ? ((totalEligible - totalVotes) / totalEligible) * 100 : 0;
    
    const passed = forPercentage >= resolution.requiredMajority;
    const turnoutPercentage = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;
    
    return {
      totalVotes,
      totalEligible,
      forVotes,
      againstVotes,
      abstainVotes,
      notVoted: totalEligible - totalVotes,
      forPercentage,
      againstPercentage,
      abstainPercentage,
      notVotedPercentage,
      turnoutPercentage,
      passed,
      requiredMajority: resolution.requiredMajority
    };
  }, [resolution.votes, resolution.totalEligibleVoters, resolution.requiredMajority]);

  // Timer effect
  useEffect(() => {
    if (resolution.status === 'voting' && resolution.votingEnds) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const end = new Date(resolution.votingEnds!).getTime();
        const remaining = Math.max(0, Math.floor((end - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          onManageVoting(resolution.id, 'end_voting');
        }
      };
      
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resolution.status, resolution.votingEnds, resolution.id, onManageVoting]);

  // Animation effect for results
  useEffect(() => {
    if (showResults) {
      setTimeout(() => setAnimateResults(true), 100);
    } else {
      setAnimateResults(false);
    }
  }, [showResults]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleVoteSubmission = useCallback((option: 'for' | 'against' | 'abstain') => {
    if (resolution.status !== 'voting') return;
    
    const vote: Omit<Vote, 'timestamp'> = {
      option,
      confidence,
      proxy: false
    };
    
    onVote(resolution.id, vote);
    setSelectedVote(option);
  }, [resolution.id, resolution.status, confidence, onVote]);

  const handleConfidenceChange = useCallback((value: number[]) => {
    setConfidence(value[0]);
  }, []);

  // Current user's vote
  const currentUserVote = resolution.votes[currentUserId];
  const hasVoted = !!currentUserVote;

  // Voting interface
  const votingInterface = (
    <div className="space-y-6">
      {/* Resolution Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{resolution.title}</CardTitle>
            <Badge variant={
              resolution.status === 'voting' ? 'default' : 
              resolution.status === 'passed' ? 'secondary' : 
              resolution.status === 'failed' ? 'destructive' : 'outline'
            }>
              {resolution.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{resolution.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Type</div>
              <div className="font-medium capitalize">{resolution.type}</div>
            </div>
            <div>
              <div className="text-gray-500">Required Majority</div>
              <div className="font-medium">{resolution.requiredMajority}%</div>
            </div>
            <div>
              <div className="text-gray-500">Eligible Voters</div>
              <div className="font-medium">{resolution.totalEligibleVoters}</div>
            </div>
            <div>
              <div className="text-gray-500">Voting Method</div>
              <div className="font-medium">
                {resolution.anonymousVoting ? 'Anonymous' : 'Public'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timer */}
      {resolution.status === 'voting' && timeRemaining > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-3">
              <Timer className="h-6 w-6 text-blue-600" />
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-blue-600">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-blue-600">Time remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Buttons */}
      {resolution.status === 'voting' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Vote className="h-5 w-5" />
              <span>Cast Your Vote</span>
            </CardTitle>
            {hasVoted && (
              <div className="text-sm text-green-600 flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>You voted: {currentUserVote.option.toUpperCase()}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {VOTE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedVote === option.id || currentUserVote?.option === option.id;
                
                return (
                  <Button
                    key={option.id}
                    variant={isSelected ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "h-24 flex-col space-y-2 transition-all duration-300 transform hover:scale-105",
                      isSelected && "ring-4 ring-opacity-50",
                      option.id === 'for' && isSelected && "ring-green-300",
                      option.id === 'against' && isSelected && "ring-red-300",
                      option.id === 'abstain' && isSelected && "ring-gray-300"
                    )}
                    style={{
                      backgroundColor: isSelected ? option.color : undefined,
                      borderColor: option.color
                    }}
                    onClick={() => handleVoteSubmission(option.id as any)}
                    disabled={hasVoted && !canManage}
                  >
                    <Icon className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-xs opacity-80">{option.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Confidence Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Confidence Level</label>
                <span className="text-sm text-gray-500">{confidence}/5</span>
              </div>
              <div className="px-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 px-3">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Results Preview */}
      {resolution.status === 'voting' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live Results</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(!showResults)}
              >
                {showResults ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showResults ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showResults && (
            <CardContent>
              <div className="space-y-4">
                {/* Turnout */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Voter Turnout</span>
                    <span>{voteStats.totalVotes}/{voteStats.totalEligible} ({voteStats.turnoutPercentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={voteStats.turnoutPercentage} className="h-2" />
                </div>

                {/* Vote Breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {VOTE_OPTIONS.map((option) => {
                    const stats = option.id === 'for' ? voteStats.forVotes :
                                 option.id === 'against' ? voteStats.againstVotes : voteStats.abstainVotes;
                    const percentage = option.id === 'for' ? voteStats.forPercentage :
                                      option.id === 'against' ? voteStats.againstPercentage : voteStats.abstainPercentage;
                    
                    return (
                      <div key={option.id} className="text-center">
                        <div 
                          className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg transition-all duration-500"
                          style={{ 
                            backgroundColor: option.color,
                            transform: animateResults ? 'scale(1.1)' : 'scale(1)'
                          }}
                        >
                          {stats}
                        </div>
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>

                {/* Required Majority Indicator */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Required to Pass:</span>
                    <span className="font-semibold">{resolution.requiredMajority}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>Current Support:</span>
                    <span className={cn(
                      "font-semibold",
                      voteStats.passed ? "text-green-600" : "text-red-600"
                    )}>
                      {voteStats.forPercentage.toFixed(1)}%
                    </span>
                  </div>
                  {voteStats.passed ? (
                    <div className="text-green-600 text-sm font-medium mt-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Currently passing
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm font-medium mt-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Currently failing
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );

  // Results view
  const resultsView = (
    <div className="space-y-6">
      {/* Final Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Final Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="text-center py-6">
              <div className={cn(
                "text-4xl font-bold mb-2",
                voteStats.passed ? "text-green-600" : "text-red-600"
              )}>
                {voteStats.passed ? "PASSED" : "FAILED"}
              </div>
              <div className="text-lg text-gray-600">
                {voteStats.forPercentage.toFixed(1)}% in favor (Required: {resolution.requiredMajority}%)
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{voteStats.forVotes}</div>
                <div className="text-sm text-green-600">For ({voteStats.forPercentage.toFixed(1)}%)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{voteStats.againstVotes}</div>
                <div className="text-sm text-red-600">Against ({voteStats.againstPercentage.toFixed(1)}%)</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{voteStats.abstainVotes}</div>
                <div className="text-sm text-gray-600">Abstain ({voteStats.abstainPercentage.toFixed(1)}%)</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{voteStats.notVoted}</div>
                <div className="text-sm text-yellow-600">No Vote ({voteStats.notVotedPercentage.toFixed(1)}%)</div>
              </div>
            </div>

            {/* Visual Chart */}
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <canvas ref={canvasRef} width="400" height="200" className="max-w-full max-h-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // History view
  const historyView = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Voting History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resolution.history.map((entry, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {entry.action.replace('_', ' ').toUpperCase()}
                  </div>
                  {entry.participant && (
                    <div className="text-xs text-gray-600">by {entry.participant}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {entry.timestamp.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={cn("h-full", className)}>
      {/* Header Controls */}
      {canManage && resolution.status === 'draft' && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b">
          <div className="text-sm text-blue-700">
            Ready to start voting on this resolution?
          </div>
          <Button onClick={() => onManageVoting(resolution.id, 'start_voting')}>
            Start Voting
          </Button>
        </div>
      )}

      {canManage && resolution.status === 'voting' && (
        <div className="flex items-center justify-between p-4 bg-yellow-50 border-b">
          <div className="text-sm text-yellow-700">
            Voting is active. You can end voting at any time.
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onManageVoting(resolution.id, 'extend_voting')}>
              Extend Time
            </Button>
            <Button variant="destructive" onClick={() => onManageVoting(resolution.id, 'end_voting')}>
              End Voting
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="h-full">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="voting" className="mt-4">
              {votingInterface}
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              {resultsView}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {historyView}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default TabletVotingInterface;