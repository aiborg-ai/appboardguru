'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { 
  FileText,
  Vote,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Scale,
  FileCheck,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MeetingResolution, 
  ResolutionStatus, 
  ResolutionType,
  VotingMethod,
  CreateResolutionRequest 
} from '@/types/meetings';
import { CreateResolutionModal } from './CreateResolutionModal';
import { ResolutionDetailsModal } from './ResolutionDetailsModal';

interface ResolutionsSectionProps {
  meetingId: string;
  resolutions: MeetingResolution[];
  canManage: boolean; // true for superusers and meeting organizers
  onCreateResolution: (data: CreateResolutionRequest) => Promise<void>;
  onUpdateResolution: (id: string, data: Partial<MeetingResolution>) => Promise<void>;
  onDeleteResolution: (id: string) => Promise<void>;
}

const RESOLUTION_STATUS_CONFIG = {
  proposed: { label: 'Proposed', color: 'bg-blue-100 text-blue-700', icon: FileText },
  passed: { label: 'Passed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  tabled: { label: 'Tabled', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700', icon: FileText },
  amended: { label: 'Amended', color: 'bg-purple-100 text-purple-700', icon: Edit }
};

const RESOLUTION_TYPE_LABELS = {
  motion: 'Motion',
  amendment: 'Amendment',
  policy: 'Policy',
  directive: 'Directive',
  appointment: 'Appointment',
  financial: 'Financial',
  strategic: 'Strategic',
  other: 'Other'
};

const VOTING_METHOD_LABELS = {
  voice: 'Voice Vote',
  show_of_hands: 'Show of Hands',
  secret_ballot: 'Secret Ballot',
  electronic: 'Electronic',
  unanimous_consent: 'Unanimous Consent',
  roll_call: 'Roll Call'
};

export function ResolutionsSection({
  meetingId,
  resolutions,
  canManage,
  onCreateResolution,
  onUpdateResolution,
  onDeleteResolution
}: ResolutionsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<MeetingResolution | null>(null);
  const [filterStatus, setFilterStatus] = useState<ResolutionStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ResolutionType | 'all'>('all');

  const filteredResolutions = resolutions.filter(resolution => {
    const matchesStatus = filterStatus === 'all' || resolution.status === filterStatus;
    const matchesType = filterType === 'all' || resolution.resolutionType === filterType;
    return matchesStatus && matchesType;
  });

  const resolutionStats = {
    total: resolutions.length,
    passed: resolutions.filter(r => r.status === 'passed').length,
    rejected: resolutions.filter(r => r.status === 'rejected').length,
    pending: resolutions.filter(r => r.status === 'proposed').length,
    implementation: resolutions.filter(r => 
      r.status === 'passed' && r.implementationDeadline && 
      new Date(r.implementationDeadline) > new Date()
    ).length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVotingResults = (resolution: MeetingResolution) => {
    const total = resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain;
    if (total === 0) return null;
    
    return {
      forPercentage: Math.round((resolution.votesFor / total) * 100),
      againstPercentage: Math.round((resolution.votesAgainst / total) * 100),
      abstainPercentage: Math.round((resolution.votesAbstain / total) * 100),
      participation: Math.round((total / resolution.totalEligibleVoters) * 100)
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Scale className="h-6 w-6" />
            <span>Resolutions</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Decisions and motions passed during the meeting
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Resolution</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{resolutionStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold">{resolutionStats.passed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{resolutionStats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{resolutionStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Implementation</p>
                <p className="text-2xl font-bold">{resolutionStats.implementation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ResolutionStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="proposed">Proposed</option>
              <option value="passed">Passed</option>
              <option value="rejected">Rejected</option>
              <option value="tabled">Tabled</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="amended">Amended</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ResolutionType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="motion">Motion</option>
              <option value="amendment">Amendment</option>
              <option value="policy">Policy</option>
              <option value="directive">Directive</option>
              <option value="appointment">Appointment</option>
              <option value="financial">Financial</option>
              <option value="strategic">Strategic</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Resolutions List */}
      <div className="space-y-4">
        {filteredResolutions.map((resolution) => {
          const statusConfig = RESOLUTION_STATUS_CONFIG[resolution.status];
          const StatusIcon = statusConfig.icon;
          const votingResults = getVotingResults(resolution);
          
          return (
            <Card key={resolution.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {resolution.resolutionNumber && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {resolution.resolutionNumber}
                        </Badge>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {resolution.title}
                      </h3>
                      <Badge className={cn("text-xs", statusConfig.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {RESOLUTION_TYPE_LABELS[resolution.resolutionType]}
                      </Badge>
                      {resolution.priorityLevel <= 2 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {resolution.description}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Proposed</p>
                          <p className="text-gray-500">{formatDate(resolution.proposedAt)}</p>
                        </div>
                      </div>
                      
                      {resolution.votedAt && (
                        <div className="flex items-center space-x-2">
                          <Vote className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Voted</p>
                            <p className="text-gray-500">{formatDate(resolution.votedAt)}</p>
                          </div>
                        </div>
                      )}
                      
                      {resolution.votingMethod && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Method</p>
                            <p className="text-gray-500">{VOTING_METHOD_LABELS[resolution.votingMethod]}</p>
                          </div>
                        </div>
                      )}
                      
                      {resolution.implementationDeadline && (
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Implementation</p>
                            <p className="text-gray-500">{formatDate(resolution.implementationDeadline)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Voting Results */}
                    {votingResults && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Voting Results</span>
                          <span className="text-sm text-gray-500">
                            {votingResults.participation}% participation
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-green-600 font-semibold">{votingResults.forPercentage}%</div>
                            <div className="text-gray-500">For ({resolution.votesFor})</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-600 font-semibold">{votingResults.againstPercentage}%</div>
                            <div className="text-gray-500">Against ({resolution.votesAgainst})</div>
                          </div>
                          <div className="text-center">
                            <div className="text-yellow-600 font-semibold">{votingResults.abstainPercentage}%</div>
                            <div className="text-gray-500">Abstain ({resolution.votesAbstain})</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Legal/Compliance Indicators */}
                    {(resolution.requiresBoardApproval || resolution.requiresShareholderApproval || resolution.legalReviewRequired) && (
                      <div className="flex items-center space-x-2 mt-4">
                        {resolution.requiresBoardApproval && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Board Approval Required
                          </Badge>
                        )}
                        {resolution.requiresShareholderApproval && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Shareholder Approval
                          </Badge>
                        )}
                        {resolution.legalReviewRequired && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            <Scale className="h-3 w-3 mr-1" />
                            Legal Review
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedResolution(resolution)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onDeleteResolution(resolution.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredResolutions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Scale className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No resolutions found
              </h3>
              <p className="text-gray-500 mb-4">
                {filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No resolutions have been recorded for this meeting yet'
                }
              </p>
              {canManage && filterStatus === 'all' && filterType === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resolution
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateResolutionModal
          meetingId={meetingId}
          onSubmit={onCreateResolution}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {selectedResolution && (
        <ResolutionDetailsModal
          resolution={selectedResolution}
          canManage={canManage}
          onUpdate={onUpdateResolution}
          onClose={() => setSelectedResolution(null)}
        />
      )}
    </div>
  );
}