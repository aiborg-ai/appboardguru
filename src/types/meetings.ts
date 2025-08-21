// ============================================================================
// MEETING RESOLUTIONS & ACTIONABLES TYPES
// TypeScript definitions for post-meeting tracking system
// ============================================================================

import { UserId } from './database';

// ============================================================================
// RESOLUTIONS TYPES
// ============================================================================

export type ResolutionType = 'motion' | 'amendment' | 'policy' | 'directive' | 'appointment' | 'financial' | 'strategic' | 'other';
export type ResolutionStatus = 'proposed' | 'passed' | 'rejected' | 'tabled' | 'withdrawn' | 'amended';
export type VotingMethod = 'voice' | 'show_of_hands' | 'secret_ballot' | 'electronic' | 'unanimous_consent' | 'roll_call';

export interface MeetingResolution {
  readonly id: string;
  readonly meetingId: string;
  readonly agendaItemId?: string;
  
  // Resolution Details
  readonly resolutionNumber?: string;
  readonly title: string;
  readonly description: string;
  readonly resolutionText: string;
  
  // Classification
  readonly resolutionType: ResolutionType;
  readonly category?: string;
  readonly priorityLevel: 1 | 2 | 3 | 4 | 5;
  
  // Proposer & Seconder
  readonly proposedBy: UserId;
  readonly secondedBy?: UserId;
  
  // Voting & Status
  readonly status: ResolutionStatus;
  readonly votingMethod?: VotingMethod;
  readonly votesFor: number;
  readonly votesAgainst: number;
  readonly votesAbstain: number;
  readonly totalEligibleVoters: number;
  
  // Implementation
  readonly effectiveDate?: string;
  readonly expiryDate?: string;
  readonly implementationDeadline?: string;
  readonly implementationNotes?: string;
  
  // Compliance & Legal
  readonly requiresBoardApproval: boolean;
  readonly requiresShareholderApproval: boolean;
  readonly legalReviewRequired: boolean;
  readonly complianceImpact?: string;
  
  // Attachments & References
  readonly supportingDocuments: readonly string[];
  readonly relatedResolutions: readonly string[];
  readonly supersedesResolutionId?: string;
  
  // Tracking
  readonly discussionDurationMinutes: number;
  readonly amendmentsProposed: number;
  readonly wasAmended: boolean;
  
  // Timestamps
  readonly proposedAt: string;
  readonly votedAt?: string;
  readonly effectiveAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateResolutionRequest {
  readonly meetingId: string;
  readonly agendaItemId?: string;
  readonly title: string;
  readonly description: string;
  readonly resolutionText: string;
  readonly resolutionType: ResolutionType;
  readonly category?: string;
  readonly priorityLevel?: 1 | 2 | 3 | 4 | 5;
  readonly secondedBy?: UserId;
  readonly effectiveDate?: string;
  readonly implementationDeadline?: string;
  readonly requiresBoardApproval?: boolean;
  readonly requiresShareholderApproval?: boolean;
  readonly legalReviewRequired?: boolean;
  readonly supportingDocuments?: readonly string[];
}

export interface UpdateResolutionRequest {
  readonly title?: string;
  readonly description?: string;
  readonly resolutionText?: string;
  readonly status?: ResolutionStatus;
  readonly votingMethod?: VotingMethod;
  readonly effectiveDate?: string;
  readonly implementationDeadline?: string;
  readonly implementationNotes?: string;
  readonly complianceImpact?: string;
}

// ============================================================================
// ACTIONABLES TYPES
// ============================================================================

export type ActionablePriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionableStatus = 'assigned' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled' | 'overdue';
export type ActionableCategory = 'follow_up' | 'research' | 'implementation' | 'compliance' | 'reporting' | 'communication' | 'approval' | 'review' | 'other';

export interface MeetingActionable {
  readonly id: string;
  readonly meetingId: string;
  readonly agendaItemId?: string;
  readonly resolutionId?: string;
  
  // Assignment Details
  readonly assignedTo: UserId;
  readonly assignedBy: UserId;
  readonly delegatedFrom?: UserId;
  
  // Actionable Details
  readonly actionNumber?: string;
  readonly title: string;
  readonly description: string;
  readonly detailedRequirements?: string;
  
  // Classification
  readonly category: ActionableCategory;
  readonly priority: ActionablePriority;
  readonly estimatedEffortHours?: number;
  readonly actualEffortHours?: number;
  
  // Timeline
  readonly dueDate: string;
  readonly reminderIntervals: readonly number[];
  readonly lastReminderSent?: string;
  
  // Status & Progress
  readonly status: ActionableStatus;
  readonly progressPercentage: number;
  readonly completionNotes?: string;
  
  // Dependencies
  readonly dependsOnActionableIds: readonly string[];
  readonly blocksActionableIds: readonly string[];
  
  // Approval Workflow
  readonly requiresApproval: boolean;
  readonly approvedBy?: UserId;
  readonly approvedAt?: string;
  readonly approvalNotes?: string;
  
  // Deliverables & Results
  readonly deliverableType?: string;
  readonly deliverableLocation?: string;
  readonly successMetrics?: string;
  readonly actualResults?: string;
  
  // Communication
  readonly stakeholdersToNotify: readonly UserId[];
  readonly communicationRequired: boolean;
  readonly communicationTemplate?: string;
  
  // Escalation
  readonly escalationLevel: 1 | 2 | 3 | 4 | 5;
  readonly escalationPath: readonly UserId[];
  readonly escalatedAt?: string;
  readonly escalatedTo?: UserId;
  readonly escalationReason?: string;
  
  // Timestamps
  readonly assignedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateActionableRequest {
  readonly meetingId: string;
  readonly agendaItemId?: string;
  readonly resolutionId?: string;
  readonly assignedTo: UserId;
  readonly title: string;
  readonly description: string;
  readonly detailedRequirements?: string;
  readonly category?: ActionableCategory;
  readonly priority?: ActionablePriority;
  readonly estimatedEffortHours?: number;
  readonly dueDate: string;
  readonly reminderIntervals?: readonly number[];
  readonly dependsOnActionableIds?: readonly string[];
  readonly requiresApproval?: boolean;
  readonly deliverableType?: string;
  readonly successMetrics?: string;
  readonly stakeholdersToNotify?: readonly UserId[];
  readonly communicationRequired?: boolean;
  readonly escalationPath?: readonly UserId[];
}

export interface UpdateActionableRequest {
  readonly title?: string;
  readonly description?: string;
  readonly detailedRequirements?: string;
  readonly priority?: ActionablePriority;
  readonly dueDate?: string;
  readonly status?: ActionableStatus;
  readonly progressPercentage?: number;
  readonly completionNotes?: string;
  readonly actualEffortHours?: number;
  readonly deliverableLocation?: string;
  readonly actualResults?: string;
  readonly escalationReason?: string;
}

// ============================================================================
// ACTIONABLE UPDATES TYPES
// ============================================================================

export interface ActionableUpdate {
  readonly id: string;
  readonly actionableId: string;
  readonly updatedBy: UserId;
  
  // Update Details
  readonly updateType: 'progress' | 'status_change' | 'deadline_extension' | 'delegation' | 'completion';
  readonly previousStatus?: ActionableStatus;
  readonly newStatus?: ActionableStatus;
  readonly previousProgress?: number;
  readonly newProgress?: number;
  
  // Content
  readonly updateNotes?: string;
  readonly challengesFaced?: string;
  readonly nextSteps?: string;
  readonly supportNeeded?: string;
  
  // Time Tracking
  readonly hoursWorked?: number;
  readonly timePeriodStart?: string;
  readonly timePeriodEnd?: string;
  
  // Attachments
  readonly supportingFiles: readonly string[];
  
  // Timestamps
  readonly createdAt: string;
}

export interface CreateActionableUpdateRequest {
  readonly actionableId: string;
  readonly updateType: 'progress' | 'status_change' | 'deadline_extension' | 'delegation' | 'completion';
  readonly newStatus?: ActionableStatus;
  readonly newProgress?: number;
  readonly updateNotes?: string;
  readonly challengesFaced?: string;
  readonly nextSteps?: string;
  readonly supportNeeded?: string;
  readonly hoursWorked?: number;
  readonly timePeriodStart?: string;
  readonly timePeriodEnd?: string;
  readonly supportingFiles?: readonly string[];
}

// ============================================================================
// RESOLUTION VOTING TYPES
// ============================================================================

export type VoteChoice = 'for' | 'against' | 'abstain' | 'absent';

export interface ResolutionVote {
  readonly id: string;
  readonly resolutionId: string;
  readonly voterUserId: UserId;
  
  // Vote Details
  readonly voteChoice: VoteChoice;
  readonly voteWeight: number;
  readonly votingMethod: VotingMethod;
  
  // Metadata
  readonly voteOrder?: number;
  readonly voteRationale?: string;
  readonly voteConfidence?: 1 | 2 | 3 | 4 | 5;
  
  // Timing
  readonly votedAt: string;
}

export interface CastVoteRequest {
  readonly resolutionId: string;
  readonly voteChoice: VoteChoice;
  readonly voteWeight?: number;
  readonly votingMethod: VotingMethod;
  readonly voteRationale?: string;
  readonly voteConfidence?: 1 | 2 | 3 | 4 | 5;
}

// ============================================================================
// COMBINED MEETING DETAILS WITH RESOLUTIONS & ACTIONABLES
// ============================================================================

export interface MeetingWithResolutionsAndActionables {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
  readonly scheduledStart: string;
  readonly scheduledEnd: string;
  readonly resolutions: readonly MeetingResolution[];
  readonly actionables: readonly MeetingActionable[];
  readonly resolutionsSummary: {
    readonly total: number;
    readonly passed: number;
    readonly rejected: number;
    readonly pending: number;
  };
  readonly actionablesSummary: {
    readonly total: number;
    readonly completed: number;
    readonly inProgress: number;
    readonly overdue: number;
    readonly assignedToCurrentUser: number;
  };
}

// ============================================================================
// DASHBOARD ANALYTICS TYPES
// ============================================================================

export interface ResolutionsAnalytics {
  readonly totalResolutions: number;
  readonly passedResolutions: number;
  readonly rejectedResolutions: number;
  readonly pendingImplementation: number;
  readonly averageVotingParticipation: number;
  readonly resolutionsByType: Record<ResolutionType, number>;
  readonly implementationCompliance: number;
}

export interface ActionablesAnalytics {
  readonly totalActionables: number;
  readonly completedActionables: number;
  readonly overdueActionables: number;
  readonly averageCompletionTime: number; // in days
  readonly completionRate: number; // percentage
  readonly actionablesByPriority: Record<ActionablePriority, number>;
  readonly actionablesByCategory: Record<ActionableCategory, number>;
  readonly userProductivity: Record<string, {
    readonly assigned: number;
    readonly completed: number;
    readonly completionRate: number;
  }>;
}

// ============================================================================
// FILTER AND SEARCH TYPES
// ============================================================================

export interface ResolutionFilters {
  readonly meetingId?: string;
  readonly status?: ResolutionStatus;
  readonly resolutionType?: ResolutionType;
  readonly proposedBy?: UserId;
  readonly effectiveDateFrom?: string;
  readonly effectiveDateTo?: string;
  readonly implementationDueSoon?: boolean; // due within 30 days
  readonly searchTerm?: string;
}

export interface ActionableFilters {
  readonly meetingId?: string;
  readonly assignedTo?: UserId;
  readonly assignedBy?: UserId;
  readonly status?: ActionableStatus;
  readonly priority?: ActionablePriority;
  readonly category?: ActionableCategory;
  readonly dueDateFrom?: string;
  readonly dueDateTo?: string;
  readonly overdueOnly?: boolean;
  readonly requiresApproval?: boolean;
  readonly searchTerm?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ResolutionsListResponse {
  readonly resolutions: readonly MeetingResolution[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly analytics: ResolutionsAnalytics;
}

export interface ActionablesListResponse {
  readonly actionables: readonly MeetingActionable[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly analytics: ActionablesAnalytics;
}

export interface ActionableWithUpdates extends MeetingActionable {
  readonly updates: readonly ActionableUpdate[];
  readonly dependentActionables: readonly MeetingActionable[];
  readonly blockingActionables: readonly MeetingActionable[];
}

export interface ResolutionWithVotes extends MeetingResolution {
  readonly votes: readonly ResolutionVote[];
  readonly votingParticipation: number; // percentage
  readonly votingResults: {
    readonly forPercentage: number;
    readonly againstPercentage: number;
    readonly abstainPercentage: number;
  };
}