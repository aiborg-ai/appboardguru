/**
 * Voice Collaboration Types
 * Comprehensive type definitions for immersive voice collaboration spaces
 */

// === Core Voice Collaboration Types ===

export interface VoiceCollaborationSession {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  hostUserId: string;
  participants: VoiceParticipant[];
  status: 'scheduled' | 'active' | 'paused' | 'ended';
  spatialAudioConfig: SpatialAudioConfig;
  collaborationType: 'meeting' | 'document_review' | 'workflow' | 'brainstorm' | 'training';
  permissions: SessionPermissions;
  metadata: SessionMetadata;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // seconds
}

export interface VoiceParticipant {
  id: string;
  userId: string;
  displayName: string;
  role: 'host' | 'moderator' | 'participant' | 'observer';
  spatialPosition: SpatialPosition;
  audioSettings: ParticipantAudioSettings;
  connectionStatus: 'connecting' | 'connected' | 'speaking' | 'muted' | 'disconnected';
  joinedAt: string;
  lastActivity?: string;
  permissions: ParticipantPermissions;
  biometricProfile?: string; // Reference to voice biometric profile
  voiceStats: VoiceParticipantStats;
}

export interface SpatialPosition {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (back to front)
  z: number; // -1 to 1 (down to up)
  orientation: number; // 0-360 degrees
  zone?: 'center' | 'presentation' | 'discussion' | 'breakout' | 'sidebar';
}

export interface ParticipantAudioSettings {
  volume: number; // 0-100
  isMuted: boolean;
  isDeafened: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  spatialAudioEnabled: boolean;
  voiceActivation: boolean;
  voiceThreshold: number; // dB level for voice activation
}

export interface ParticipantPermissions {
  canSpeak: boolean;
  canScreenShare: boolean;
  canAnnotate: boolean;
  canModerate: boolean;
  canInviteOthers: boolean;
  canTriggerWorkflow: boolean;
  canAccessRecordings: boolean;
}

export interface VoiceParticipantStats {
  totalSpeakingTime: number; // seconds
  averageVolume: number;
  wordCount: number;
  interruptionCount: number;
  emotionalTone: EmotionalTone[];
  engagementScore: number; // 0-100
  attentionScore: number; // 0-100
}

export interface EmotionalTone {
  timestamp: string;
  emotion: 'neutral' | 'engaged' | 'excited' | 'frustrated' | 'confused' | 'confident';
  intensity: number; // 0-100
  confidence: number; // 0-100
}

// === Spatial Audio Configuration ===

export interface SpatialAudioConfig {
  enabled: boolean;
  roomSize: 'intimate' | 'small' | 'medium' | 'large' | 'auditorium';
  ambientSounds: AmbientSoundConfig;
  acoustics: RoomAcoustics;
  mixing: AudioMixingSettings;
  fallbackMode: '2d' | 'stereo' | 'mono';
}

export interface AmbientSoundConfig {
  enabled: boolean;
  soundscape: 'office' | 'meeting_room' | 'library' | 'outdoor' | 'none';
  volume: number; // 0-100
  spatializedAmbient: boolean;
}

export interface RoomAcoustics {
  reverberation: number; // 0-100
  absorption: number; // 0-100
  reflection: number; // 0-100
  distanceAttenuation: boolean;
  dopplerEffect: boolean;
}

export interface AudioMixingSettings {
  maxSimultaneousSpeakers: number; // 2-8
  priorityMode: 'first_speak' | 'loudest' | 'role_based' | 'spatial_proximity';
  duckingEnabled: boolean; // Lower volume of others when speaking
  crossfadeTime: number; // milliseconds
  compressionEnabled: boolean;
}

// === Voice Annotations ===

export interface VoiceAnnotation {
  id: string;
  sessionId: string;
  documentId?: string;
  authorId: string;
  authorName: string;
  type: 'point' | 'area' | 'page' | 'document';
  content: VoiceAnnotationContent;
  position?: AnnotationPosition;
  timestamp: string;
  duration: number; // seconds
  status: 'active' | 'resolved' | 'archived';
  thread: VoiceAnnotationReply[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: AnnotationMetadata;
}

export interface VoiceAnnotationContent {
  audioUrl: string;
  transcript: string;
  transcriptConfidence: number;
  summary?: string;
  action?: VoiceAction;
  emotion?: EmotionalTone;
  keywords: string[];
}

export interface AnnotationPosition {
  page?: number;
  x: number; // 0-1 relative to page/area
  y: number; // 0-1 relative to page/area
  width?: number; // 0-1 for area annotations
  height?: number; // 0-1 for area annotations
  zoom?: number;
}

export interface VoiceAnnotationReply {
  id: string;
  authorId: string;
  authorName: string;
  content: VoiceAnnotationContent;
  timestamp: string;
  parentId?: string; // For nested replies
}

export interface AnnotationMetadata {
  documentTitle?: string;
  pageTitle?: string;
  contextBefore?: string;
  contextAfter?: string;
  relatedAnnotations: string[];
  workflowTriggered?: string;
}

// === Voice Actions and Workflow Automation ===

export interface VoiceAction {
  type: 'approval' | 'rejection' | 'question' | 'suggestion' | 'workflow_trigger' | 'navigation';
  target?: string;
  parameters?: Record<string, unknown>;
  confidence: number;
  requiresConfirmation: boolean;
  fallbackText?: string;
}

export interface VoiceWorkflowTrigger {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  trigger: WorkflowTriggerCondition;
  actions: WorkflowAction[];
  enabled: boolean;
  permissions: WorkflowPermissions;
  usage: WorkflowUsageStats;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

export interface WorkflowTriggerCondition {
  phrases: string[]; // Voice trigger phrases
  context?: string[]; // Required context (e.g., 'document', 'meeting')
  roles?: string[]; // User roles that can trigger
  confidence: number; // Minimum confidence required
  requireExactMatch: boolean;
  caseSensitive: boolean;
}

export interface WorkflowAction {
  type: 'approval' | 'notification' | 'document_action' | 'meeting_action' | 'api_call' | 'navigation';
  target: string;
  parameters: Record<string, unknown>;
  condition?: WorkflowCondition;
  timeout?: number; // seconds
  retryCount?: number;
  fallbackAction?: WorkflowAction;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: any;
}

export interface WorkflowPermissions {
  canTrigger: string[]; // User roles or IDs
  canModify: string[];
  canView: string[];
  requiresApproval: boolean;
  approvers?: string[];
}

export interface WorkflowUsageStats {
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastTriggered?: string;
  popularTriggerPhrase?: string;
}

// === Screen Sharing and Controls ===

export interface VoiceScreenShare {
  id: string;
  sessionId: string;
  presenterId: string;
  presenterName: string;
  type: 'full_screen' | 'application' | 'browser_tab' | 'document';
  status: 'starting' | 'active' | 'paused' | 'stopped';
  voiceControls: VoiceControlSettings;
  annotations: ScreenAnnotation[];
  startedAt: string;
  endedAt?: string;
  metadata: ScreenShareMetadata;
}

export interface VoiceControlSettings {
  enabled: boolean;
  commands: VoiceCommand[];
  confirmationRequired: boolean;
  accessLevel: 'view_only' | 'interact' | 'control';
  allowedParticipants?: string[];
}

export interface VoiceCommand {
  phrase: string;
  action: 'next_page' | 'previous_page' | 'zoom_in' | 'zoom_out' | 'scroll_up' | 'scroll_down' | 
          'highlight' | 'annotate' | 'pause' | 'resume' | 'stop_sharing';
  parameters?: Record<string, unknown>;
  enabled: boolean;
  requiresConfirmation: boolean;
}

export interface ScreenAnnotation {
  id: string;
  authorId: string;
  authorName: string;
  type: 'pointer' | 'highlight' | 'voice_note' | 'drawing';
  position: { x: number; y: number };
  content?: VoiceAnnotationContent;
  timestamp: string;
  duration?: number;
  style?: AnnotationStyle;
}

export interface AnnotationStyle {
  color: string;
  opacity: number;
  thickness: number;
  shape?: 'circle' | 'rectangle' | 'arrow' | 'freehand';
}

export interface ScreenShareMetadata {
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  audioIncluded: boolean;
}

// === Real-time Communication ===

export interface WebRTCConnection {
  id: string;
  sessionId: string;
  participantId: string;
  peerConnection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  audioTrack?: MediaStreamTrack;
  dataChannel?: RTCDataChannel;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  statistics: ConnectionStatistics;
}

export interface ConnectionStatistics {
  audioLevel: number;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  roundTripTime: number; // milliseconds
  jitter: number;
  qualityScore: number; // 0-100
}

export interface AudioProcessingSettings {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  highpassFilter: boolean;
  spatialProcessing: boolean;
  voiceEnhancement: boolean;
  backgroundNoiseReduction: number; // 0-100
}

// === Session Management ===

export interface SessionMetadata {
  recordingEnabled: boolean;
  recordingUrl?: string;
  transcriptEnabled: boolean;
  transcriptUrl?: string;
  summaryEnabled: boolean;
  summaryUrl?: string;
  relatedDocuments: string[];
  tags: string[];
  purpose: string;
  expectedDuration?: number; // minutes
  actualDuration?: number; // minutes
}

export interface SessionPermissions {
  isPublic: boolean;
  allowRecording: boolean;
  allowTranscription: boolean;
  allowScreenSharing: boolean;
  allowAnnotations: boolean;
  allowVoiceCommands: boolean;
  maxParticipants: number;
  requireApproval: boolean;
}

export interface SessionInvitation {
  id: string;
  sessionId: string;
  inviterId: string;
  inviteeId: string;
  inviteeEmail?: string;
  message?: string;
  permissions: ParticipantPermissions;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
}

// === Voice Thread Management ===

export interface VoiceThread {
  id: string;
  documentId: string;
  sectionId?: string;
  title: string;
  description?: string;
  participants: string[];
  messages: VoiceThreadMessage[];
  status: 'open' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  metadata: VoiceThreadMetadata;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface VoiceThreadMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  content: VoiceAnnotationContent;
  timestamp: string;
  replyToId?: string;
  reactions: MessageReaction[];
  attachments?: MessageAttachment[];
  editHistory?: VoiceMessageEdit[];
}

export interface MessageReaction {
  userId: string;
  userName: string;
  emoji: string;
  timestamp: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'audio' | 'document' | 'image' | 'link';
  url: string;
  size?: number;
  duration?: number; // for audio attachments
}

export interface VoiceMessageEdit {
  timestamp: string;
  oldContent: string;
  newContent: string;
  reason?: string;
}

export interface VoiceThreadMetadata {
  documentSection?: string;
  relatedThreads: string[];
  workflowStatus?: string;
  assignedTo?: string[];
  dueDate?: string;
  estimatedTime?: number; // minutes
  actualTime?: number; // minutes
}

// === Analytics and Insights ===

export interface VoiceCollaborationAnalytics {
  sessionId: string;
  organizationId: string;
  participantStats: ParticipantAnalytics[];
  conversationFlow: ConversationSegment[];
  emotionalJourney: EmotionalJourney;
  engagementMetrics: EngagementMetrics;
  productivityScore: ProductivityScore;
  recommendations: CollaborationRecommendation[];
  generatedAt: string;
}

export interface ParticipantAnalytics {
  userId: string;
  speakingTime: number; // seconds
  wordCount: number;
  averageWordsPerMinute: number;
  silencePeriods: number;
  interruptionCount: number;
  questionsAsked: number;
  ideasContributed: number;
  emotionalRange: EmotionalTone[];
  engagementLevel: 'low' | 'medium' | 'high';
  influenceScore: number; // 0-100
}

export interface ConversationSegment {
  startTime: number; // seconds from session start
  endTime: number;
  dominantSpeaker: string;
  topic?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  energyLevel: 'low' | 'medium' | 'high';
  participationCount: number;
}

export interface EmotionalJourney {
  overall: EmotionalTone;
  timeline: { timestamp: number; emotion: string; intensity: number }[];
  peaks: { timestamp: number; emotion: string; trigger?: string }[];
  patterns: string[];
}

export interface EngagementMetrics {
  overallEngagement: number; // 0-100
  peakEngagementTime: number; // seconds from start
  lowEngagementPeriods: { start: number; end: number; reason?: string }[];
  interactionDensity: number; // interactions per minute
  collaborationScore: number; // 0-100
}

export interface ProductivityScore {
  score: number; // 0-100
  factors: {
    decisionsMade: number;
    actionItemsCreated: number;
    questionsResolved: number;
    consensusReached: number;
    timeOnTopic: number; // 0-100 percentage
    participationBalance: number; // 0-100
  };
  timeAllocation: { topic: string; percentage: number }[];
}

export interface CollaborationRecommendation {
  type: 'engagement' | 'participation' | 'efficiency' | 'technical';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // 0-100
  implementationEffort: 'low' | 'medium' | 'high';
}

// === API Request/Response Types ===

export interface CreateVoiceSessionRequest {
  name: string;
  description?: string;
  collaborationType: VoiceCollaborationSession['collaborationType'];
  permissions: SessionPermissions;
  spatialAudioConfig: SpatialAudioConfig;
  invitations?: Omit<SessionInvitation, 'id' | 'sessionId' | 'status' | 'sentAt'>[];
  scheduledFor?: string;
  expectedDuration?: number;
}

export interface JoinVoiceSessionRequest {
  sessionId: string;
  invitationId?: string;
  audioSettings?: Partial<ParticipantAudioSettings>;
  spatialPosition?: Partial<SpatialPosition>;
}

export interface VoiceSessionResponse {
  success: boolean;
  session?: VoiceCollaborationSession;
  participant?: VoiceParticipant;
  webrtcConfig?: WebRTCConfiguration;
  error?: string;
  recommendations?: string[];
}

export interface CreateVoiceAnnotationRequest {
  audioData: string; // base64 encoded
  sessionId?: string;
  documentId?: string;
  position?: AnnotationPosition;
  type: VoiceAnnotation['type'];
  priority?: VoiceAnnotation['priority'];
  tags?: string[];
}

export interface VoiceAnnotationResponse {
  success: boolean;
  annotation?: VoiceAnnotation;
  transcript?: string;
  confidence?: number;
  actions?: VoiceAction[];
  error?: string;
}

export interface TriggerWorkflowRequest {
  phrase: string;
  context?: string;
  parameters?: Record<string, unknown>;
  confidence?: number;
}

export interface WorkflowTriggerResponse {
  success: boolean;
  triggered: boolean;
  workflows: VoiceWorkflowTrigger[];
  actions: WorkflowAction[];
  confirmationRequired?: boolean;
  error?: string;
}

export interface WebRTCConfiguration {
  iceServers: RTCIceServer[];
  audioConstraints: MediaTrackConstraints;
  spatialAudioEnabled: boolean;
  processingSettings: AudioProcessingSettings;
  maxBitrate: number;
  codecPreferences: string[];
}

// === Event Types for Real-time Updates ===

export interface VoiceCollaborationEvent {
  type: VoiceEventType;
  sessionId: string;
  participantId?: string;
  timestamp: string;
  data: any;
}

export type VoiceEventType = 
  | 'participant_joined'
  | 'participant_left'
  | 'participant_muted'
  | 'participant_unmuted'
  | 'spatial_position_changed'
  | 'screen_share_started'
  | 'screen_share_stopped'
  | 'annotation_created'
  | 'annotation_updated'
  | 'workflow_triggered'
  | 'voice_command_executed'
  | 'session_started'
  | 'session_ended'
  | 'session_paused'
  | 'session_resumed'
  | 'recording_started'
  | 'recording_stopped'
  | 'transcription_updated';

// === Utility Types ===

export interface VoiceCollaborationConfig {
  maxSessionDuration: number; // minutes
  maxParticipants: number;
  recordingRetentionDays: number;
  transcriptionEnabled: boolean;
  spatialAudioEnabled: boolean;
  voiceCommandsEnabled: boolean;
  workflowAutomationEnabled: boolean;
  biometricAuthEnabled: boolean;
  encryptionRequired: boolean;
}

export interface DeviceCapabilities {
  hasAudio: boolean;
  hasVideo: boolean;
  hasScreenShare: boolean;
  supportsSpatialAudio: boolean;
  supportsEchoCancellation: boolean;
  supportsNoiseSupression: boolean;
  maxSampleRate: number;
  preferredCodecs: string[];
}

// Export commonly used types with shorter names
export type {
  VoiceCollaborationSession as VoiceSession,
  VoiceParticipant as Participant,
  VoiceAnnotation as Annotation,
  VoiceWorkflowTrigger as WorkflowTrigger,
  VoiceCollaborationAnalytics as SessionAnalytics
};