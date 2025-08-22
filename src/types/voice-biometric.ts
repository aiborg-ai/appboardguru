/**
 * Voice Biometric Security & Personalization Types
 * Comprehensive type definitions for voice authentication, biometric analysis, and personalization
 */

// === Core Voice Biometric Types ===

export interface VoiceBiometricProfile {
  id: string;
  userId: string;
  organizationId: string;
  profileName?: string;
  voiceprintTemplate: string; // Encrypted biometric template
  voiceCharacteristics: VoiceCharacteristics;
  enrollmentData: BiometricEnrollmentData;
  securitySettings: BiometricSecuritySettings;
  personalizationProfile: VoicePersonalizationProfile;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface VoiceCharacteristics {
  fundamentalFrequency: number; // Average pitch (Hz)
  formantFrequencies: number[]; // First 4 formants
  spectralCentroid: number;
  spectralRolloff: number;
  mfccCoefficients: number[]; // Mel-frequency cepstral coefficients
  pitchVariance: number;
  speechRate: number; // Words per minute
  pausePatterns: PausePattern[];
  voiceQualityMetrics: VoiceQualityMetrics;
  accentProfile?: AccentProfile;
}

export interface PausePattern {
  duration: number; // milliseconds
  frequency: number; // occurrences per minute
  context: 'sentence' | 'phrase' | 'thought' | 'hesitation';
}

export interface VoiceQualityMetrics {
  jitter: number; // Frequency variation
  shimmer: number; // Amplitude variation
  harmonicToNoiseRatio: number;
  breathiness: number;
  roughness: number;
  strain: number;
}

export interface AccentProfile {
  primaryAccent?: string;
  confidence: number;
  dialectMarkers: Record<string, number>;
  pronunciationVariations: Record<string, string>;
}

export interface BiometricEnrollmentData {
  enrollmentSessions: EnrollmentSession[];
  qualityScore: number; // 0-100
  templateVersion: string;
  enrollmentComplete: boolean;
  minSessionsRequired: number;
  backgroundNoiseProfile: number[];
  recordingQualityMetrics: RecordingQuality;
}

export interface EnrollmentSession {
  id: string;
  sessionNumber: number;
  recordingDuration: number; // seconds
  utterances: string[]; // What was spoken
  qualityScore: number;
  signalToNoiseRatio: number;
  recordedAt: string;
  deviceInfo?: DeviceInfo;
}

export interface RecordingQuality {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  avgAmplitude: number;
  backgroundNoise: number;
  clipping: boolean;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface DeviceInfo {
  deviceType: string;
  browser?: string;
  os?: string;
  microphone?: string;
  userAgent?: string;
}

export interface BiometricSecuritySettings {
  authenticationThreshold: number; // 0-100, higher = more strict
  verificationTimeout: number; // seconds
  maxAttempts: number;
  enableLivenessDetection: boolean;
  enableAntiSpoofing: boolean;
  requirePhraseMatching: boolean;
  fallbackAuthEnabled: boolean;
  adaptiveThreshold: boolean;
  securityLevel: 'standard' | 'high' | 'maximum';
}

// === Authentication and Verification ===

export interface VoiceAuthenticationRequest {
  audioData: string; // Base64 encoded
  authPhrase?: string;
  sessionId?: string;
  challengeType?: 'text_dependent' | 'text_independent' | 'text_prompted';
  livenessRequired?: boolean;
  format?: AudioFormat;
  context: AuthenticationContext;
}

export interface AuthenticationContext {
  purpose: 'login' | 'document_access' | 'sensitive_operation' | 'transaction_approval';
  resourceId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  additionalFactors?: string[];
  userLocation?: string;
  deviceTrust?: 'trusted' | 'untrusted' | 'unknown';
}

export interface VoiceAuthenticationResponse {
  success: boolean;
  confidence: number; // 0-100
  authenticationId: string;
  matchingScore: number;
  verificationTime: number; // milliseconds
  securityAssessment: SecurityAssessment;
  biometricQuality: BiometricQualityMetrics;
  recommendations?: SecurityRecommendation[];
  fallbackOptions?: FallbackOption[];
  errorDetails?: AuthenticationError;
}

export interface SecurityAssessment {
  overallRisk: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  spoofingDetection: AntiSpoofingResult;
  livenessScore: number;
  environmentalFactors: EnvironmentalFactors;
  behavioralFactors: BehavioralFactors;
}

export interface AntiSpoofingResult {
  isSpoofed: boolean;
  confidence: number;
  detectionMethods: string[];
  suspiciousPatterns: string[];
}

export interface EnvironmentalFactors {
  backgroundNoise: number;
  signalClarity: number;
  recordingDevice: string;
  transmissionQuality: number;
}

export interface BehavioralFactors {
  speakingRate: number;
  stressLevel: number;
  naturalness: number;
  hesitationPatterns: number;
}

export interface BiometricQualityMetrics {
  templateQuality: number;
  signalQuality: number;
  featureExtraction: number;
  matchingReliability: number;
}

export interface SecurityRecommendation {
  type: 'enrollment' | 'device' | 'environment' | 'behavior';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  action?: string;
}

export interface FallbackOption {
  method: 'password' | 'otp' | '2fa' | 'security_questions' | 'biometric_secondary';
  available: boolean;
  description: string;
  estimatedTime: number; // seconds
}

export interface AuthenticationError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAfter?: number; // seconds
}

// === Emotion Detection and Analysis ===

export interface EmotionAnalysisResult {
  emotionId: string;
  userId: string;
  sessionId?: string;
  detectedEmotions: DetectedEmotion[];
  dominantEmotion: EmotionType;
  emotionIntensity: number; // 0-100
  stressLevel: number; // 0-100
  urgencyLevel: number; // 0-100
  cognitiveLoad: number; // 0-100
  emotionalState: EmotionalState;
  voiceStressIndicators: VoiceStressIndicators;
  analysisTimestamp: string;
  analysisConfidence: number;
  escalationRecommended: boolean;
  contextualFactors: ContextualFactors;
}

export interface DetectedEmotion {
  type: EmotionType;
  confidence: number;
  intensity: number;
  duration: number; // seconds
  onsetTime: number; // seconds from start
}

export type EmotionType = 
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'fear' | 'surprise'
  | 'disgust' | 'contempt' | 'excitement' | 'frustration'
  | 'anxiety' | 'stress' | 'urgency' | 'concern' | 'confidence'
  | 'uncertainty' | 'impatience' | 'satisfaction' | 'disappointment';

export interface EmotionalState {
  arousal: number; // 0-100 (low to high energy)
  valence: number; // 0-100 (negative to positive)
  dominance: number; // 0-100 (submissive to dominant)
  stability: number; // 0-100 (unstable to stable)
}

export interface VoiceStressIndicators {
  microtremor: number;
  frequencyPerturbation: number;
  amplitudePerturbation: number;
  speechRate: number;
  articulation: number;
  voiceBreaks: number;
  breathingPattern: number;
}

export interface ContextualFactors {
  timeOfDay: string;
  dayOfWeek: string;
  meetingType?: string;
  topicSensitivity?: 'low' | 'medium' | 'high';
  participantCount?: number;
  historicalEmotionalBaseline?: EmotionalBaseline;
}

export interface EmotionalBaseline {
  userId: string;
  baselineEmotions: Record<EmotionType, number>;
  typicalStressRange: [number, number];
  normalSpeechPatterns: SpeechPatterns;
  calculatedFrom: string; // date range
  sampleSize: number;
}

export interface SpeechPatterns {
  averageRate: number;
  pauseFrequency: number;
  volumeVariation: number;
  pitchRange: number;
  articulation: number;
}

// === Personalization Features ===

export interface VoicePersonalizationProfile {
  userId: string;
  communicationStyle: CommunicationStyle;
  preferredInteractionModes: InteractionMode[];
  adaptiveSettings: AdaptiveSettings;
  voiceShortcuts: VoiceShortcut[];
  personalizedResponses: PersonalizedResponse[];
  learningHistory: LearningHistory;
  preferences: PersonalizationPreferences;
}

export interface CommunicationStyle {
  formality: 'casual' | 'professional' | 'formal';
  verbosity: 'concise' | 'balanced' | 'detailed';
  pace: 'slow' | 'normal' | 'fast';
  tone: 'serious' | 'neutral' | 'friendly' | 'enthusiastic';
  technicalLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  culturalAdaptation?: string;
}

export type InteractionMode = 
  | 'voice_only' | 'voice_with_visual' | 'multimodal'
  | 'command_focused' | 'conversational' | 'guided';

export interface AdaptiveSettings {
  autoAdjustVolume: boolean;
  autoAdjustSpeechRate: boolean;
  adaptToBackground: boolean;
  learningEnabled: boolean;
  suggestionLevel: 'minimal' | 'moderate' | 'aggressive';
  contextAwareness: boolean;
}

export interface VoiceShortcut {
  id: string;
  phrase: string;
  action: ShortcutAction;
  parameters?: Record<string, unknown>;
  context?: string[];
  frequency: number;
  lastUsed: string;
  isActive: boolean;
}

export interface ShortcutAction {
  type: 'navigation' | 'command' | 'query' | 'operation';
  target: string;
  method?: string;
  confirmation?: boolean;
}

export interface PersonalizedResponse {
  trigger: string;
  responseType: 'text' | 'audio' | 'action';
  content: string;
  confidence: number;
  frequency: number;
  context?: string[];
  learningSource: 'manual' | 'automatic' | 'ai_suggested';
}

export interface LearningHistory {
  totalInteractions: number;
  successfulAuthentications: number;
  averageAuthenticationTime: number;
  commonPhrases: Record<string, number>;
  errorPatterns: ErrorPattern[];
  improvementAreas: ImprovementArea[];
  adaptationHistory: AdaptationEvent[];
}

export interface ErrorPattern {
  type: 'recognition' | 'authentication' | 'command' | 'noise';
  pattern: string;
  frequency: number;
  context: string;
  lastOccurrence: string;
  resolved: boolean;
}

export interface ImprovementArea {
  area: 'pronunciation' | 'speed' | 'volume' | 'clarity' | 'background';
  currentScore: number;
  targetScore: number;
  suggestions: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface AdaptationEvent {
  timestamp: string;
  adaptationType: 'threshold' | 'response_style' | 'shortcut' | 'preference';
  oldValue: any;
  newValue: any;
  trigger: string;
  effectiveness?: number;
}

export interface PersonalizationPreferences {
  voiceFeedback: boolean;
  visualFeedback: boolean;
  hapticFeedback: boolean;
  confidenceDisplay: boolean;
  debugMode: boolean;
  privacyMode: boolean;
  dataSharing: 'none' | 'anonymous' | 'full';
  retentionPeriod: number; // days
}

// === Voice Logs and Audit ===

export interface VoiceAuthenticationLog {
  id: string;
  userId: string;
  organizationId: string;
  sessionId?: string;
  authenticationType: 'login' | 'verification' | 'continuous';
  success: boolean;
  confidence: number;
  duration: number; // milliseconds
  attempts: number;
  fallbackUsed?: string;
  riskLevel: string;
  deviceInfo: DeviceInfo;
  location?: GeolocationInfo;
  contextualInfo: ContextualInfo;
  securityFlags: SecurityFlag[];
  emotionalState?: EmotionType;
  stressLevel?: number;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface GeolocationInfo {
  country?: string;
  region?: string;
  city?: string;
  ip?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface ContextualInfo {
  purpose: string;
  resourceAccessed?: string;
  previousActivity?: string;
  sessionDuration?: number;
  timeFromLastAuth?: number;
}

export interface SecurityFlag {
  type: 'suspicious' | 'anomaly' | 'policy_violation' | 'threshold_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  automated: boolean;
  acknowledged: boolean;
}

// === API Request/Response Types ===

export interface BiometricEnrollmentRequest {
  audioData: string; // Base64 encoded
  sessionNumber: number;
  utterance: string;
  format: AudioFormat;
  deviceInfo?: DeviceInfo;
}

export interface BiometricEnrollmentResponse {
  success: boolean;
  sessionId: string;
  progress: number; // 0-100
  qualityScore: number;
  enrollmentComplete: boolean;
  nextSteps?: string[];
  recommendations?: string[];
  error?: string;
}

export interface VoiceVerificationRequest {
  audioData: string;
  challengePhrase?: string;
  context: AuthenticationContext;
  options?: VerificationOptions;
}

export interface VerificationOptions {
  includeEmotionAnalysis: boolean;
  includeStressAnalysis: boolean;
  adaptiveThreshold: boolean;
  realTimeProcessing: boolean;
  securityLevel: 'standard' | 'high' | 'maximum';
}

export interface EmotionAnalysisRequest {
  audioData: string;
  sessionId?: string;
  context?: string;
  analysisType: 'basic' | 'comprehensive' | 'fraud_detection';
}

export interface FraudDetectionResult {
  riskScore: number; // 0-100
  fraudIndicators: FraudIndicator[];
  recommendation: 'approve' | 'review' | 'deny';
  confidence: number;
  escalationRequired: boolean;
  additionalVerificationNeeded: boolean;
}

export interface FraudIndicator {
  type: 'voice_stress' | 'behavioral_anomaly' | 'pattern_deviation' | 'technical_anomaly';
  severity: number; // 0-100
  description: string;
  evidence: Record<string, unknown>;
  confidence: number;
}

// === Database Schema Types ===

export interface VoiceBiometricTemplate {
  id: string;
  userId: string;
  organizationId: string;
  templateData: string; // Encrypted biometric template
  templateVersion: string;
  securityHash: string;
  encryptionMethod: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface VoiceAuthSession {
  id: string;
  userId: string;
  organizationId: string;
  sessionToken: string;
  authenticationMethod: 'voice_primary' | 'voice_secondary' | 'voice_continuous';
  expiresAt: string;
  riskAssessment: string; // JSON
  deviceFingerprint: string;
  ipAddress: string;
  locationData?: string; // JSON
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface EmotionHistory {
  id: string;
  userId: string;
  organizationId: string;
  sessionId?: string;
  emotionData: string; // JSON of EmotionAnalysisResult
  analysisType: string;
  contextTags: string[];
  escalationTriggered: boolean;
  followUpRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface PersonalizationSettings {
  id: string;
  userId: string;
  organizationId: string;
  profileData: string; // JSON of VoicePersonalizationProfile
  privacySettings: string; // JSON
  learningEnabled: boolean;
  dataRetentionDays: number;
  lastUpdated: string;
  version: string;
}

// === Utility and Helper Types ===

export type AudioFormat = 'wav' | 'mp3' | 'webm' | 'ogg' | 'flac' | 'm4a';

export type BiometricQuality = 'poor' | 'fair' | 'good' | 'excellent';

export type AuthenticationResult = 'success' | 'failure' | 'inconclusive' | 'fraud_suspected';

export type EscalationType = 'emotional_distress' | 'fraud_suspected' | 'security_breach' | 'technical_issue';

export interface ProcessingStatus {
  stage: 'audio_processing' | 'feature_extraction' | 'biometric_matching' | 'emotion_analysis' | 'result_compilation';
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  currentOperation?: string;
}

// === Integration Types ===

export interface VoiceBiometricConfig {
  enrollmentRequired: boolean;
  minimumQualityThreshold: number;
  authenticationTimeout: number;
  fallbackEnabled: boolean;
  emotionAnalysisEnabled: boolean;
  fraudDetectionEnabled: boolean;
  personalizationEnabled: boolean;
  auditLogLevel: 'minimal' | 'standard' | 'comprehensive';
  retentionPolicyDays: number;
  encryptionLevel: 'standard' | 'enhanced';
}

export interface SystemCapabilities {
  voiceRecording: boolean;
  realtimeProcessing: boolean;
  offlineMode: boolean;
  cloudProcessing: boolean;
  hardwareAcceleration: boolean;
  multiLanguageSupport: boolean;
  emotionDetection: boolean;
  fraudDetection: boolean;
}

// Export commonly used types with shorter names
export type { 
  VoiceBiometricProfile as BiometricProfile,
  VoiceAuthenticationRequest as AuthRequest,
  VoiceAuthenticationResponse as AuthResponse,
  EmotionAnalysisResult as EmotionResult,
  VoicePersonalizationProfile as PersonalizationProfile,
  VoiceAuthenticationLog as AuthLog
};