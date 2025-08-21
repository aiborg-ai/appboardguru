// Voice Translation & Transcription Type Definitions
// Comprehensive type system for the voice translation and meeting transcription features

// === Core Translation Types ===

export interface VoiceTranslationSession {
  id: string;
  userId: string;
  organizationId: string;
  sessionName?: string;
  sourceLanguage: string;
  targetLanguages: string[];
  isActive: boolean;
  sessionType: 'realtime' | 'meeting' | 'presentation';
  participants: SessionParticipant[];
  settings: SessionSettings;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface SessionParticipant {
  id: string;
  name: string;
  email?: string;
  role?: 'speaker' | 'translator' | 'observer';
  preferredLanguage?: string;
  isActive?: boolean;
}

export interface SessionSettings {
  realTimeTranslation: boolean;
  autoDetectLanguage: boolean;
  confidenceThreshold: number; // 0-1
  includeAudio: boolean;
  speakerIdentification: boolean;
  customTerminology: boolean;
  qualityMode: 'speed' | 'balanced' | 'accuracy';
}

export interface VoiceTranslation {
  id: string;
  sessionId: string;
  userId: string;
  organizationId: string;
  originalText: string;
  originalLanguage: string;
  translations: Record<string, TranslationResult>;
  confidenceScores: Record<string, number>;
  speakerId?: string;
  timestampOffset: number; // milliseconds from session start
  audioData?: Uint8Array;
  isCorrected: boolean;
  corrections?: Record<string, string>;
  createdAt: string;
}

export interface TranslationResult {
  text: string;
  confidence: number;
  audioUrl?: string;
  formality?: 'formal' | 'informal' | 'neutral';
  alternatives?: string[];
  culturalNotes?: string[];
}

// === Meeting Transcription Types ===

export interface MeetingTranscription {
  id: string;
  meetingId?: string; // External meeting system reference
  sessionId?: string;
  organizationId: string;
  title: string;
  participants: TranscriptionParticipant[];
  transcriptData: TranscriptData;
  speakerMapping: Record<string, SpeakerProfile>;
  summary?: string;
  actionItems: ActionItem[];
  decisions: MeetingDecision[];
  nextMeetingDate?: string;
  status: 'in_progress' | 'completed' | 'archived';
  languageStats: Record<string, number>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TranscriptionParticipant {
  id: string;
  name: string;
  email?: string;
  role?: string;
  title?: string;
  primaryLanguage?: string;
  joinedAt?: string;
  leftAt?: string;
}

export interface TranscriptData {
  segments: TranscriptionSegment[];
  metadata: TranscriptMetadata;
  qualityMetrics: QualityMetrics;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  speaker?: SpeakerIdentification;
  confidence: number;
  language?: string;
  translations?: Record<string, string>;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
  keywords?: string[];
}

export interface SpeakerIdentification {
  id: string;
  name: string;
  voiceProfile?: string;
  confidence: number;
  characteristics?: VoiceCharacteristics;
}

export interface VoiceCharacteristics {
  pitch: number;
  tempo: number;
  accent?: string;
  voiceQuality: string;
}

export interface SpeakerProfile {
  audioFingerprint: string;
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  voicePatterns: VoicePatterns;
  speakingMetrics: SpeakingMetrics;
}

export interface VoicePatterns {
  fundamentalFrequency: number;
  formants: number[];
  speechRate: number;
  pausePatterns: number[];
  intonationCurve: number[];
}

export interface SpeakingMetrics {
  totalSpeakingTime: number; // milliseconds
  averageSegmentLength: number;
  interruptionCount: number;
  questionCount: number;
  statementCount: number;
}

export interface TranscriptMetadata {
  totalDuration: number;
  wordCount: number;
  speakerCount: number;
  languagesDetected: string[];
  averageConfidence: number;
  processingTime: number;
}

export interface QualityMetrics {
  overallAccuracy: number;
  speechClarity: number;
  backgroundNoise: number;
  crossTalk: number;
  technicalIssues: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  description?: string;
  assignedTo?: string;
  assignedToId?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category?: string;
  estimatedHours?: number;
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MeetingDecision {
  id: string;
  text: string;
  description?: string;
  context: string;
  rationale?: string;
  votingResults?: VotingResults;
  finalDecision: 'approved' | 'rejected' | 'deferred' | 'modified';
  implementationPlan?: string;
  reviewDate?: string;
  impact?: 'high' | 'medium' | 'low';
  stakeholders?: string[];
  createdAt: string;
}

export interface VotingResults {
  totalVotes: number;
  votes: Record<string, 'yes' | 'no' | 'abstain'>;
  requiredMajority: number;
  passed: boolean;
}

// === Language and Localization Types ===

export interface UserLanguagePreferences {
  id: string;
  userId: string;
  organizationId: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  accentProfile?: string;
  dialectRegion?: string;
  voicePatterns: Record<string, any>;
  terminologyDictionary: Record<string, any>;
  translationQualityPreference: 'speed' | 'balanced' | 'accuracy';
  autoTranslate: boolean;
  preferredTranslators: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  family: string;
  script: string;
  rtl: boolean;
  dialects: LanguageDialect[];
  commonInRegions: string[];
  difficultyLevel: 'easy' | 'medium' | 'hard';
  culturalContext: CulturalContext;
}

export interface LanguageDialect {
  code: string;
  name: string;
  region: string;
  speakers: number;
  variations: string[];
  characteristics: DialectCharacteristics;
}

export interface DialectCharacteristics {
  phonemeVariations: Record<string, string>;
  vocabularyDifferences: Record<string, string>;
  grammarNotes: string[];
  culturalNuances: string[];
}

export interface CulturalContext {
  formalityLevels: string[];
  businessEtiquette: string[];
  commonGreetings: Record<string, string>;
  tabooTopics: string[];
  communicationStyle: 'direct' | 'indirect' | 'contextual';
}

export interface CustomTerminology {
  id: string;
  userId?: string;
  organizationId: string;
  term: string;
  contextCategory: TerminologyCategory;
  translations: Record<string, TermTranslation>;
  pronunciationGuide?: string;
  usageFrequency: number;
  confidenceOverride?: number;
  isOrganizationWide: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TerminologyCategory = 
  | 'general' 
  | 'board_governance' 
  | 'financial' 
  | 'legal' 
  | 'technical' 
  | 'industry_specific'
  | 'medical'
  | 'academic'
  | 'marketing';

export interface TermTranslation {
  translation: string;
  formality: 'formal' | 'informal' | 'neutral';
  confidence: number;
  usage: string[];
  alternatives?: string[];
  culturalNotes?: string[];
}

// === Translation Metrics and Analytics ===

export interface TranslationMetrics {
  id: string;
  userId: string;
  organizationId: string;
  sessionId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  totalWords: number;
  totalPhrases: number;
  accuracyScore: number; // 0-1
  latencyMs: number;
  confidenceAvg: number;
  correctionsCount: number;
  userRating?: number; // 1-5
  feedbackNotes?: string;
  date: string;
  createdAt: string;
}

export interface VoiceLearningData {
  id: string;
  userId: string;
  organizationId: string;
  audioFingerprint: string;
  phonemePatterns: Record<string, number>;
  accentMarkers: Record<string, any>;
  speakingRatePatterns: Record<string, number>;
  vocabularyFrequency: Record<string, number>;
  errorPatterns: Record<string, ErrorPattern>;
  improvementSuggestions: string[];
  confidenceTrends: Record<string, number>;
  lastTrainingSession?: string;
  trainingIterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorPattern {
  type: 'phonetic' | 'grammatical' | 'vocabulary' | 'cultural';
  frequency: number;
  corrections: string[];
  context: string[];
  improvementPlan: string;
}

// === WebSocket and Real-time Types ===

export interface WebSocketTranslationSession {
  id: string;
  sessionId: string;
  connectionId: string;
  userId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastActivity: string;
  connectionQuality: ConnectionQuality;
  createdAt: string;
}

export interface ConnectionQuality {
  latency: number; // milliseconds
  packetLoss: number; // percentage
  bandwidth: number; // kbps
  stability: 'excellent' | 'good' | 'fair' | 'poor';
}

// === API Request/Response Types ===

export interface TranslateRequest {
  audio?: string; // Base64 encoded
  text?: string;
  sourceLanguage?: string;
  targetLanguages: string[];
  sessionId?: string;
  speakerId?: string;
  format?: AudioFormat;
  includeAudio?: boolean;
  qualityMode?: 'speed' | 'balanced' | 'accuracy';
  context?: string;
  timestamp?: number;
}

export type AudioFormat = 'wav' | 'mp3' | 'webm' | 'ogg' | 'flac';

export interface TranslateResponse {
  success: boolean;
  sessionId?: string;
  translations: Record<string, TranslationResult>;
  detectedLanguage?: string;
  speakerId?: string;
  timestamp: number;
  originalText: string;
  processingTime: number;
  qualityMetrics?: TranslationQualityMetrics;
  suggestions?: TranslationSuggestion[];
}

export interface TranslationQualityMetrics {
  overallConfidence: number;
  terminologyAccuracy: number;
  culturalAdaptation: number;
  formalityAlignment: number;
  contextRelevance: number;
}

export interface TranslationSuggestion {
  type: 'improvement' | 'alternative' | 'cultural' | 'terminology';
  message: string;
  confidence: number;
  applicableLanguages: string[];
}

// === Meeting Minutes Types ===

export interface MeetingMinutes {
  header: MinutesHeader;
  agenda: AgendaItem[];
  discussions: DiscussionTopic[];
  actionItems: ActionItem[];
  decisions: MeetingDecision[];
  nextMeeting?: NextMeetingInfo;
  appendices?: MinutesAppendix[];
  metadata: MinutesMetadata;
}

export interface MinutesHeader {
  title: string;
  date: string;
  time: string;
  location?: string;
  meetingType: string;
  attendees: AttendeeInfo[];
  chairperson?: string;
  secretary?: string;
  quorum?: QuorumInfo;
}

export interface AttendeeInfo {
  name: string;
  title?: string;
  organization?: string;
  status: 'present' | 'absent' | 'late' | 'early_departure';
  joinTime?: string;
  departTime?: string;
}

export interface QuorumInfo {
  required: number;
  present: number;
  achieved: boolean;
  timestamp: string;
}

export interface AgendaItem {
  id: string;
  order: number;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number; // minutes
  status: 'not_started' | 'in_progress' | 'completed' | 'deferred';
  documents?: string[];
}

export interface DiscussionTopic {
  id: string;
  agendaItemId?: string;
  topic: string;
  presenter?: string;
  keyPoints: string[];
  decisions: MeetingDecision[];
  actionItems: string[]; // ActionItem IDs
  duration: number; // minutes
  transcript?: TranscriptionSegment[];
}

export interface NextMeetingInfo {
  date: string;
  time?: string;
  location?: string;
  tentativeAgenda: string[];
  preparationItems: string[];
  responsibleParties: Record<string, string>;
}

export interface MinutesAppendix {
  id: string;
  title: string;
  type: 'document' | 'report' | 'presentation' | 'data';
  content?: string;
  fileUrl?: string;
  description?: string;
}

export interface MinutesMetadata {
  generatedAt: string;
  generatedBy: string;
  version: string;
  language: string;
  translationAvailable: string[];
  confidenceScore: number;
  processingTime: number;
  wordCount: number;
}

// === Export and Integration Types ===

export interface ExportOptions {
  format: 'json' | 'txt' | 'docx' | 'pdf' | 'html';
  includeTranscript: boolean;
  includeTranslations: boolean;
  includeAudio: boolean;
  includeMetadata: boolean;
  language?: string;
  template?: string;
  watermark?: string;
}

export interface IntegrationSettings {
  calendarSync: boolean;
  emailNotifications: boolean;
  slackIntegration?: SlackSettings;
  teamsIntegration?: TeamsSettings;
  zoomIntegration?: ZoomSettings;
  customWebhooks: WebhookConfig[];
}

export interface SlackSettings {
  workspaceId: string;
  channelId: string;
  notifyOnComplete: boolean;
  shareTranscript: boolean;
}

export interface TeamsSettings {
  tenantId: string;
  teamId: string;
  channelId: string;
  autoSummarize: boolean;
}

export interface ZoomSettings {
  apiKey: string;
  autoRecord: boolean;
  autoTranscribe: boolean;
  breakoutRooms: boolean;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  isActive: boolean;
}

export type WebhookEvent = 
  | 'translation_complete'
  | 'meeting_started'
  | 'meeting_ended'
  | 'transcription_complete'
  | 'action_item_created'
  | 'decision_made';

// === Error and Status Types ===

export interface VoiceTranslationError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
  suggestion?: string;
}

export interface ProcessingStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  currentStep?: string;
  error?: VoiceTranslationError;
}

// === Utility Types ===

export type SupportedLanguage = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' 
  | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'th' | 'vi'
  | 'id' | 'ms' | 'tl' | 'nl' | 'sv' | 'da' | 'no'
  | 'fi' | 'pl' | 'cs' | 'hu' | 'ro' | 'bg' | 'hr';

export type TranslationMode = 'live' | 'batch' | 'hybrid';

export type AudioQuality = 'low' | 'medium' | 'high' | 'lossless';

export type SpeakerRole = 'chairperson' | 'secretary' | 'director' | 'observer' | 'presenter' | 'guest';

// Re-export commonly used types
export type { 
  TranslationResult as Translation,
  VoiceTranslationSession as Session,
  TranscriptionSegment as Segment,
  MeetingTranscription as Transcription,
  UserLanguagePreferences as LanguagePrefs
};