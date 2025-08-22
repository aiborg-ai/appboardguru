// ============================================================================
// MEETING DETAILS - BRANDED TYPES & INTERFACES
// Enhanced types for comprehensive meeting detail view
// ============================================================================

import { 
  UserId, 
  OrganizationId, 
  AssetId, 
  VaultId 
} from './database';

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type MeetingId = string & { readonly __brand: 'MeetingId' };
export type AgendaItemId = string & { readonly __brand: 'AgendaItemId' };
export type ParticipantId = string & { readonly __brand: 'ParticipantId' };
export type MinuteId = string & { readonly __brand: 'MinuteId' };
export type VenueId = string & { readonly __brand: 'VenueId' };

// ============================================================================
// MEETING CORE TYPES
// ============================================================================

export type MeetingStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'postponed';

export type MeetingType = 
  | 'agm' 
  | 'board' 
  | 'committee' 
  | 'emergency' 
  | 'special' 
  | 'other';

export type MeetingConfidentiality = 
  | 'public' 
  | 'confidential' 
  | 'restricted' 
  | 'board_only';

export interface MeetingDetailsFull {
  readonly id: MeetingId;
  readonly organizationId: OrganizationId;
  readonly title: string;
  readonly description: string;
  readonly meetingType: MeetingType;
  readonly status: MeetingStatus;
  readonly confidentiality: MeetingConfidentiality;
  
  // Schedule
  readonly scheduledStart: string;
  readonly scheduledEnd: string;
  readonly actualStart?: string;
  readonly actualEnd?: string;
  readonly timezone: string;
  
  // Location
  readonly venue?: VenueDetails;
  readonly virtualMeetingUrl?: string;
  readonly isHybrid: boolean;
  
  // Organizer
  readonly organizerId: UserId;
  readonly chairpersonId?: UserId;
  readonly secretaryId?: UserId;
  
  // Settings
  readonly isRecorded: boolean;
  readonly allowsAnonymousVoting: boolean;
  readonly requiresQuorum: boolean;
  readonly quorumThreshold: number;
  
  // Metadata
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastModifiedBy: UserId;
}

// ============================================================================
// PARTICIPANT TYPES
// ============================================================================

export type ParticipantRole = 
  | 'chairperson' 
  | 'secretary' 
  | 'director' 
  | 'member' 
  | 'observer' 
  | 'advisor' 
  | 'guest';

export type AttendanceStatus = 
  | 'pending' 
  | 'accepted' 
  | 'declined' 
  | 'tentative' 
  | 'no_response';

export type ParticipantPresence = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'left_early' 
  | 'virtual';

export interface MeetingParticipant {
  readonly id: ParticipantId;
  readonly userId: UserId;
  readonly meetingId: MeetingId;
  readonly role: ParticipantRole;
  readonly attendanceStatus: AttendanceStatus;
  readonly presence?: ParticipantPresence;
  readonly checkInTime?: string;
  readonly checkOutTime?: string;
  readonly isVotingEligible: boolean;
  readonly hasConflictOfInterest: boolean;
  readonly conflictDescription?: string;
  readonly delegateUserId?: UserId;
  readonly notificationPreferences: NotificationSettings;
  readonly invitedAt: string;
  readonly respondedAt?: string;
}

export interface ParticipantWithUser extends MeetingParticipant {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatarUrl?: string;
    readonly title?: string;
    readonly organization?: string;
  };
}

// ============================================================================
// AGENDA TYPES
// ============================================================================

export type AgendaItemType = 
  | 'presentation' 
  | 'discussion' 
  | 'motion' 
  | 'report' 
  | 'break' 
  | 'other';

export type AgendaItemStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped' 
  | 'deferred';

export interface AgendaItem {
  readonly id: AgendaItemId;
  readonly meetingId: MeetingId;
  readonly orderIndex: number;
  readonly title: string;
  readonly description?: string;
  readonly type: AgendaItemType;
  readonly status: AgendaItemStatus;
  readonly presenterId?: UserId;
  readonly estimatedDurationMinutes: number;
  readonly actualDurationMinutes?: number;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly attachments: readonly AssetId[];
  readonly discussionThreadId?: string;
  readonly hasMotion: boolean;
  readonly motionText?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentCategory = 
  | 'pre_read' 
  | 'reference' 
  | 'presentation' 
  | 'minutes' 
  | 'resolution' 
  | 'financial' 
  | 'legal' 
  | 'other';

export interface MeetingDocument {
  readonly id: AssetId;
  readonly meetingId: MeetingId;
  readonly agendaItemId?: AgendaItemId;
  readonly category: DocumentCategory;
  readonly title: string;
  readonly description?: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly version: number;
  readonly isConfidential: boolean;
  readonly requiresSignature: boolean;
  readonly downloadUrl: string;
  readonly previewUrl?: string;
  readonly thumbnailUrl?: string;
  readonly uploadedBy: UserId;
  readonly uploadedAt: string;
  readonly lastModifiedAt: string;
}

// ============================================================================
// MINUTES TYPES
// ============================================================================

export type MinuteStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'published';

export interface MeetingMinute {
  readonly id: MinuteId;
  readonly meetingId: MeetingId;
  readonly status: MinuteStatus;
  readonly content: string;
  readonly version: number;
  readonly template: string;
  readonly attendanceList: readonly ParticipantId[];
  readonly keyDecisions: readonly string[];
  readonly actionItems: readonly string[];
  readonly nextMeetingDate?: string;
  readonly approvedBy?: UserId;
  readonly approvedAt?: string;
  readonly publishedAt?: string;
  readonly createdBy: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// VENUE TYPES
// ============================================================================

export interface VenueDetails {
  readonly id: VenueId;
  readonly name: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly capacity: number;
  readonly facilities: readonly string[];
  readonly parkingAvailable: boolean;
  readonly accessibilityFeatures: readonly string[];
  readonly contactPhone?: string;
  readonly contactEmail?: string;
  readonly directions?: string;
  readonly mapUrl?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface MeetingAnalytics {
  readonly meetingId: MeetingId;
  readonly duration: {
    readonly scheduled: number;
    readonly actual: number;
    readonly efficiency: number;
  };
  readonly participation: {
    readonly totalInvited: number;
    readonly totalAttended: number;
    readonly attendanceRate: number;
    readonly averageSpeakingTime: number;
    readonly participationScore: number;
  };
  readonly engagement: {
    readonly questionsAsked: number;
    readonly documentsViewed: number;
    readonly commentsPosted: number;
    readonly sentimentScore: number;
  };
  readonly decisions: {
    readonly totalResolutions: number;
    readonly resolutionsPassed: number;
    readonly averageVotingTime: number;
    readonly consensusScore: number;
  };
  readonly productivity: {
    readonly agendaItemsCompleted: number;
    readonly actionItemsCreated: number;
    readonly followUpTasks: number;
    readonly productivityScore: number;
  };
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationSettings {
  readonly emailReminders: boolean;
  readonly smsReminders: boolean;
  readonly pushNotifications: boolean;
  readonly documentUpdates: boolean;
  readonly agendaChanges: boolean;
  readonly reminderTiming: readonly number[]; // minutes before meeting
}

// ============================================================================
// REAL-TIME UPDATE TYPES
// ============================================================================

export type MeetingUpdateType = 
  | 'participant_joined' 
  | 'participant_left' 
  | 'agenda_item_started' 
  | 'agenda_item_completed' 
  | 'document_shared' 
  | 'vote_started' 
  | 'vote_completed' 
  | 'meeting_status_changed';

export interface MeetingUpdate {
  readonly type: MeetingUpdateType;
  readonly meetingId: MeetingId;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
  readonly userId?: UserId;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetMeetingDetailsRequest {
  readonly meetingId: MeetingId;
  readonly includeParticipants?: boolean;
  readonly includeDocuments?: boolean;
  readonly includeMinutes?: boolean;
  readonly includeAnalytics?: boolean;
}

export interface MeetingDetailsResponse {
  readonly meeting: MeetingDetailsFull;
  readonly participants?: readonly ParticipantWithUser[];
  readonly agendaItems?: readonly AgendaItem[];
  readonly documents?: readonly MeetingDocument[];
  readonly minutes?: MeetingMinute;
  readonly analytics?: MeetingAnalytics;
  readonly venue?: VenueDetails;
}

// ============================================================================
// BRANDED TYPE HELPERS
// ============================================================================

export const createMeetingId = (id: string): MeetingId => id as MeetingId;
export const createAgendaItemId = (id: string): AgendaItemId => id as AgendaItemId;
export const createParticipantId = (id: string): ParticipantId => id as ParticipantId;
export const createMinuteId = (id: string): MinuteId => id as MinuteId;
export const createVenueId = (id: string): VenueId => id as VenueId;