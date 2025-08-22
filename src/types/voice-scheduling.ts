/**
 * Smart Voice Scheduling Types
 * AI-powered intelligent meeting scheduling with voice commands
 */

// === Core Scheduling Types ===

export interface SmartVoiceScheduler {
  userId: string;
  organizationId: string;
  aiSchedulingEngine: AISchedulingEngine;
  voiceCommands: VoiceSchedulingCommand[];
  schedulingHistory: SchedulingSession[];
  preferences: SchedulingPreferences;
  integrations: CalendarIntegration[];
  conflictResolution: ConflictResolutionEngine;
  intelligentSuggestions: IntelligentSuggestionEngine;
  createdAt: string;
  updatedAt: string;
}

export interface AISchedulingEngine {
  modelVersion: string;
  capabilities: SchedulingCapability[];
  learningAlgorithms: LearningAlgorithm[];
  contextualUnderstanding: ContextualUnderstanding;
  naturalLanguageProcessor: NLPProcessor;
  decisionMaking: DecisionMakingEngine;
  performanceMetrics: SchedulingPerformanceMetrics;
  adaptationSettings: AdaptationSettings;
}

export interface SchedulingCapability {
  capability: 'multi_participant_coordination' | 'timezone_conversion' | 'conflict_resolution' | 
             'preference_learning' | 'context_awareness' | 'natural_language_understanding' | 
             'calendar_integration' | 'resource_booking' | 'travel_time_calculation' | 
             'availability_prediction';
  enabled: boolean;
  confidenceLevel: number; // 0-1
  accuracy: number; // percentage
  lastUpdated: string;
  dependencies: string[];
}

export interface LearningAlgorithm {
  name: string;
  type: 'reinforcement_learning' | 'supervised_learning' | 'pattern_recognition' | 'preference_modeling';
  parameters: Record<string, unknown>;
  trainingData: TrainingDataset;
  performance: AlgorithmPerformance;
  isActive: boolean;
}

export interface AlgorithmPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number; // seconds
  inferenceTime: number; // milliseconds
  memoryUsage: number; // MB
  lastEvaluated: string;
}

export interface TrainingDataset {
  historicalSchedules: number;
  userPreferences: number;
  conflictResolutions: number;
  successfulMeetings: number;
  failedAttempts: number;
  totalDataPoints: number;
  qualityScore: number; // 0-1
  lastUpdated: string;
}

// === Natural Language Processing ===

export interface NLPProcessor {
  intentRecognition: IntentRecognition;
  entityExtraction: EntityExtraction;
  contextAnalysis: ContextAnalysis;
  ambiguityResolution: AmbiguityResolution;
  multiLanguageSupport: MultiLanguageSupport;
  conversationalFlow: ConversationalFlow;
}

export interface IntentRecognition {
  supportedIntents: SchedulingIntent[];
  accuracy: number; // percentage
  confidence: number; // 0-1
  fallbackStrategies: FallbackStrategy[];
}

export type SchedulingIntent = 
  | 'schedule_meeting'
  | 'reschedule_meeting'
  | 'cancel_meeting'
  | 'check_availability'
  | 'find_time_slot'
  | 'book_resource'
  | 'set_recurring_meeting'
  | 'add_participants'
  | 'change_duration'
  | 'suggest_alternatives'
  | 'block_calendar'
  | 'create_event_series';

export interface EntityExtraction {
  supportedEntities: SchedulingEntity[];
  extractionAccuracy: Record<string, number>;
  relationshipMapping: EntityRelationship[];
}

export interface SchedulingEntity {
  type: 'date' | 'time' | 'duration' | 'participant' | 'location' | 'meeting_type' | 
        'timezone' | 'recurrence' | 'priority' | 'resource' | 'agenda_item';
  patterns: string[];
  aliases: string[];
  validationRules: ValidationRule[];
  priority: number;
}

export interface ValidationRule {
  rule: string;
  description: string;
  errorMessage: string;
  severity: 'warning' | 'error';
}

export interface EntityRelationship {
  fromEntity: string;
  toEntity: string;
  relationship: 'requires' | 'conflicts_with' | 'modifies' | 'depends_on';
  strength: number; // 0-1
}

export interface ContextAnalysis {
  contextFactors: ContextFactor[];
  situationalAwareness: SituationalAwareness;
  historicalPatterns: HistoricalPattern[];
  environmentalContext: EnvironmentalContext;
}

export interface ContextFactor {
  factor: string;
  weight: number; // 0-1
  source: 'calendar' | 'user_behavior' | 'organizational' | 'external';
  confidence: number;
  lastUpdated: string;
}

export interface MeetingCadence {
  dailyMeetings: number;
  weeklyMeetings: number;
  monthlyMeetings: number;
  preferredDuration: number; // minutes
  preferredTimeSlots: string[];
  avoidedTimeSlots: string[];
}

export interface SituationalAwareness {
  currentTimeContext: TimeContext;
  workPattern: WorkPattern;
  meetingCadence: MeetingCadence;
  urgencyLevel: UrgencyLevel;
  organizationalEvents: OrganizationalEvent[];
}

export interface TimeContext {
  currentTime: string;
  timezone: string;
  businessHours: BusinessHours;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isHoliday: boolean;
  isWeekend: boolean;
}

export interface BusinessHours {
  start: string; // HH:MM format
  end: string;
  timezone: string;
  breakTimes: BreakTime[];
  lunchHours: TimePeriod;
}

export interface BreakTime {
  name: string;
  start: string;
  end: string;
  flexible: boolean;
}

export interface TimePeriod {
  start: string;
  end: string;
  duration: number; // minutes
}

export interface WorkPattern {
  preferredMeetingTimes: PreferredTime[];
  productivePeriods: ProductivePeriod[];
  focusBlocks: FocusBlock[];
  meetingFrequency: MeetingFrequency;
  workload: WorkloadMetrics;
}

export interface PreferredTime {
  dayOfWeek: string;
  timeSlot: TimePeriod;
  preference: 'strongly_preferred' | 'preferred' | 'neutral' | 'avoid' | 'strongly_avoid';
  reason: string;
  confidence: number;
}

export interface ProductivePeriod {
  start: string;
  end: string;
  productivityLevel: number; // 0-1
  taskTypes: string[];
  distractionTolerance: number; // 0-1
}

export interface FocusBlock {
  name: string;
  duration: number; // minutes
  frequency: 'daily' | 'weekly' | 'monthly';
  priority: 'high' | 'medium' | 'low';
  interruptible: boolean;
}

export interface MeetingFrequency {
  daily: number;
  weekly: number;
  monthly: number;
  averageDuration: number; // minutes
  peakDays: string[];
  peakHours: number[];
}

export interface WorkloadMetrics {
  currentLoad: number; // 0-1
  projectDeadlines: ProjectDeadline[];
  commitments: Commitment[];
  travelSchedule: TravelEvent[];
}

export interface ProjectDeadline {
  projectName: string;
  deadline: string;
  importance: number; // 0-1
  timeRequired: number; // hours
  flexibility: number; // 0-1
}

export interface Commitment {
  type: 'meeting' | 'deadline' | 'event' | 'travel' | 'personal';
  title: string;
  startTime: string;
  endTime: string;
  importance: number; // 0-1
  moveable: boolean;
}

export interface TravelEvent {
  destination: string;
  departureTime: string;
  returnTime: string;
  travelTime: TravelTime;
  purpose: string;
}

export interface TravelTime {
  to: number; // minutes
  from: number;
  bufferTime: number;
  uncertainty: number; // variance
}

export interface UrgencyLevel {
  currentUrgency: 'low' | 'medium' | 'high' | 'critical';
  factors: UrgencyFactor[];
  timeToDecision: number; // hours
  escalationThreshold: number;
}

export interface UrgencyFactor {
  factor: string;
  impact: number; // 0-1
  timeDecay: number; // how urgency changes over time
  mitigation: string[];
}

export interface OrganizationalEvent {
  eventName: string;
  startDate: string;
  endDate: string;
  impact: 'low' | 'medium' | 'high';
  affectedDepartments: string[];
  schedulingRestrictions: SchedulingRestriction[];
}

export interface SchedulingRestriction {
  type: 'no_meetings' | 'limited_meetings' | 'priority_meetings_only' | 'external_only';
  startTime: string;
  endTime: string;
  reason: string;
  exceptions: string[];
}

export interface HistoricalPattern {
  patternType: 'recurring_meeting' | 'seasonal_trend' | 'behavior_pattern' | 'preference_change';
  pattern: string;
  frequency: number;
  confidence: number;
  lastObserved: string;
  predictedNext: string;
  context: Record<string, unknown>;
}

export interface EnvironmentalContext {
  location: LocationContext;
  weather: WeatherContext;
  publicEvents: PublicEvent[];
  trafficPatterns: TrafficPattern[];
  facilityAvailability: FacilityAvailability[];
}

export interface LocationContext {
  primary: Location;
  alternatives: Location[];
  travelTimes: Record<string, number>;
  preferences: LocationPreference[];
}

export interface Location {
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  capacity: number;
  amenities: string[];
  bookingRequired: boolean;
  cost: number;
}

export interface LocationPreference {
  location: string;
  preference: number; // 0-1
  reasons: string[];
  constraints: LocationConstraint[];
}

export interface LocationConstraint {
  constraint: string;
  severity: 'soft' | 'hard';
  workaround: string;
}

export interface WeatherContext {
  currentConditions: WeatherCondition;
  forecast: WeatherForecast[];
  impact: WeatherImpact;
}

export interface WeatherCondition {
  temperature: number;
  conditions: string;
  precipitation: number;
  visibility: number;
  windSpeed: number;
}

export interface WeatherForecast {
  date: string;
  conditions: WeatherCondition;
  confidence: number;
}

export interface WeatherImpact {
  travelImpact: number; // 0-1
  meetingPreference: 'indoor' | 'outdoor' | 'flexible';
  adjustments: WeatherAdjustment[];
}

export interface WeatherAdjustment {
  condition: string;
  adjustment: string;
  timeBuffer: number; // minutes
}

export interface PublicEvent {
  eventName: string;
  date: string;
  location: string;
  expectedImpact: 'traffic' | 'parking' | 'noise' | 'accessibility';
  severity: number; // 0-1
}

export interface TrafficPattern {
  route: string;
  time: string;
  duration: number; // minutes
  reliability: number; // 0-1
  alternatives: AlternativeRoute[];
}

export interface AlternativeRoute {
  route: string;
  duration: number;
  reliability: number;
  cost: number;
}

export interface FacilityAvailability {
  facilityName: string;
  availability: TimeSlot[];
  capacity: number;
  resources: Resource[];
  bookingLead: number; // hours
}

export interface Resource {
  name: string;
  type: string;
  available: boolean;
  cost: number;
  bookingRequired: boolean;
}

// === Voice Commands ===

export interface VoiceSchedulingCommand {
  id: string;
  command: string;
  intent: SchedulingIntent;
  parameters: CommandParameter[];
  examples: string[];
  variations: string[];
  confidence: number; // 0-1
  usage: CommandUsage;
  context: CommandContext;
  feedback: CommandFeedback[];
}

export interface CommandParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  validation: ValidationRule[];
  alternatives: string[];
}

export interface CommandUsage {
  totalUses: number;
  successRate: number;
  averageConfidence: number;
  commonErrors: CommonError[];
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface CommonError {
  error: string;
  frequency: number;
  resolution: string;
  prevention: string[];
}

export interface CommandContext {
  applicableScenarios: string[];
  prerequisites: string[];
  followUpCommands: string[];
  relatedCommands: string[];
}

export interface CommandFeedback {
  userId: string;
  rating: number; // 1-5
  comment: string;
  suggestion: string;
  timestamp: string;
  helpful: boolean;
}

// === Scheduling Sessions ===

export interface SchedulingSession {
  id: string;
  userId: string;
  organizationId: string;
  sessionType: SchedulingSessionType;
  startTime: string;
  endTime?: string;
  status: SessionStatus;
  interactions: VoiceInteraction[];
  outcomes: SchedulingOutcome[];
  performance: SessionPerformance;
  feedback: SessionFeedback;
  context: SessionContext;
}

export type SchedulingSessionType = 
  | 'single_meeting'
  | 'meeting_series'
  | 'complex_coordination'
  | 'conflict_resolution'
  | 'availability_check'
  | 'bulk_scheduling';

export type SessionStatus = 
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending_confirmation'
  | 'partial_success';

export interface VoiceInteraction {
  id: string;
  timestamp: string;
  type: 'user_input' | 'system_response' | 'confirmation' | 'error' | 'suggestion';
  content: string;
  intent?: SchedulingIntent;
  entities: ExtractedEntity[];
  confidence: number;
  processingTime: number; // milliseconds
  context: InteractionContext;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  source: 'speech' | 'context' | 'inference';
  validated: boolean;
}

export interface InteractionContext {
  conversationTurn: number;
  previousIntent?: string;
  missingInformation: string[];
  clarificationNeeded: boolean;
  suggestedActions: string[];
}

export interface SchedulingOutcome {
  type: 'meeting_scheduled' | 'meeting_updated' | 'availability_found' | 'conflict_resolved' | 'booking_failed';
  success: boolean;
  meetingDetails?: MeetingDetails;
  alternatives?: AlternativeOption[];
  issues: SchedulingIssue[];
  confidence: number;
  timestamp: string;
}

export interface MeetingDetails {
  meetingId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: MeetingLocation;
  participants: Participant[];
  organizer: Participant;
  agenda: AgendaItem[];
  resources: BookedResource[];
  recurrence?: RecurrencePattern;
  reminders: Reminder[];
  accessInfo: AccessInfo;
}

export interface MeetingLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  name: string;
  address?: string;
  virtualLink?: string;
  dialIn?: DialInInfo;
  capacity: number;
  amenities: string[];
  accessibility: AccessibilityInfo;
}

export interface DialInInfo {
  phoneNumber: string;
  conferenceId: string;
  passcode?: string;
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  hearingLoop: boolean;
  signLanguage: boolean;
  specialRequirements: string[];
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'required' | 'optional' | 'informational';
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  timezone: string;
  preferences: ParticipantPreference[];
}

export interface ParticipantPreference {
  type: 'time' | 'location' | 'duration' | 'format';
  preference: string;
  priority: number; // 0-1
  flexibility: number; // 0-1
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter: string;
  duration: number; // minutes
  priority: 'high' | 'medium' | 'low';
  type: 'presentation' | 'discussion' | 'decision' | 'update';
  materials: Material[];
}

export interface Material {
  name: string;
  type: string;
  url: string;
  required: boolean;
}

export interface BookedResource {
  resourceId: string;
  name: string;
  type: string;
  quantity: number;
  cost: number;
  bookingReference: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  occurrences?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  exceptions: string[];
}

export interface Reminder {
  type: 'email' | 'notification' | 'sms';
  timing: number; // minutes before meeting
  recipient: string;
  customMessage?: string;
}

export interface AccessInfo {
  requiresAuth: boolean;
  password?: string;
  waitingRoom: boolean;
  recordingAllowed: boolean;
  sharingAllowed: boolean;
}

export interface AlternativeOption {
  optionId: string;
  type: 'time_alternative' | 'location_alternative' | 'format_alternative' | 'participant_alternative';
  details: MeetingDetails;
  score: number; // 0-1, how well it matches preferences
  tradeoffs: Tradeoff[];
  recommendation: string;
}

export interface Tradeoff {
  aspect: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: number; // 0-1
  description: string;
  mitigation?: string;
}

export interface SchedulingIssue {
  type: 'conflict' | 'unavailability' | 'resource_shortage' | 'preference_mismatch' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'blocking';
  description: string;
  affectedParticipants: string[];
  possibleSolutions: Solution[];
  autoResolved: boolean;
}

export interface Solution {
  solution: string;
  feasibility: number; // 0-1
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

// === Conflict Resolution ===

export interface ConflictResolutionEngine {
  strategies: ResolutionStrategy[];
  priorities: ConflictPriority[];
  automationRules: AutomationRule[];
  escalationPaths: EscalationPath[];
  successMetrics: ResolutionMetrics;
}

export interface ResolutionStrategy {
  name: string;
  type: 'time_shift' | 'participant_negotiation' | 'resource_reallocation' | 'format_change' | 'postponement';
  priority: number;
  conditions: StrategyCondition[];
  actions: ResolutionAction[];
  successRate: number;
  averageResolutionTime: number; // minutes
}

export interface StrategyCondition {
  condition: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  weight: number; // 0-1
}

export interface ResolutionAction {
  action: string;
  parameters: Record<string, unknown>;
  order: number;
  required: boolean;
  fallback?: string;
}

export interface ConflictPriority {
  factor: 'participant_seniority' | 'meeting_importance' | 'business_impact' | 'deadline_proximity' | 'resource_scarcity';
  weight: number; // 0-1
  calculation: PriorityCalculation;
}

export interface PriorityCalculation {
  method: 'weighted_sum' | 'hierarchical' | 'fuzzy_logic' | 'ml_model';
  parameters: Record<string, unknown>;
  confidence: number;
}

export interface AutomationRule {
  name: string;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  successRate: number;
  lastModified: string;
}

export interface RuleTrigger {
  event: 'conflict_detected' | 'participant_unavailable' | 'resource_conflict' | 'preference_violation';
  threshold?: number;
  timeWindow?: number; // minutes
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR' | 'NOT';
}

export interface RuleAction {
  type: 'reschedule' | 'notify' | 'suggest_alternative' | 'escalate' | 'wait_for_response';
  parameters: Record<string, unknown>;
  timeout?: number; // minutes
}

export interface EscalationPath {
  level: number;
  criteria: EscalationCriteria;
  assignee: string;
  timeout: number; // minutes
  actions: string[];
}

export interface EscalationCriteria {
  failedAttempts: number;
  timeSinceConflict: number; // minutes
  stakeholderLevel: 'team' | 'department' | 'executive';
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResolutionMetrics {
  totalConflicts: number;
  resolvedAutomatically: number;
  averageResolutionTime: number; // minutes
  successRate: number;
  escalationRate: number;
  participantSatisfaction: number; // 0-1
  costSavings: number;
}

// === Intelligent Suggestions ===

export interface IntelligentSuggestionEngine {
  suggestionTypes: SuggestionType[];
  learningModels: SuggestionModel[];
  contextualFilters: ContextualFilter[];
  personalization: SuggestionPersonalization;
  feedback: SuggestionFeedback[];
  performance: SuggestionPerformance;
}

export interface SuggestionType {
  type: 'optimal_time' | 'alternative_participants' | 'location_optimization' | 'duration_adjustment' | 
        'recurring_pattern' | 'preparation_reminder' | 'follow_up_scheduling' | 'resource_bundling';
  enabled: boolean;
  priority: number;
  accuracy: number;
  userAcceptanceRate: number;
}

export interface SuggestionModel {
  name: string;
  algorithm: 'collaborative_filtering' | 'content_based' | 'hybrid' | 'deep_learning' | 'rule_based';
  trainingData: ModelTrainingData;
  performance: ModelPerformance;
  lastRetrained: string;
  version: string;
}

export interface ModelTrainingData {
  historicalSchedules: number;
  userInteractions: number;
  feedbackSamples: number;
  contextualFeatures: number;
  dataQuality: number; // 0-1
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  userSatisfaction: number;
  adoptionRate: number;
}

export interface ContextualFilter {
  name: string;
  context: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  priority: number;
}

export interface FilterCondition {
  parameter: string;
  operator: string;
  value: any;
  weight: number;
}

export interface FilterAction {
  action: 'boost' | 'suppress' | 'modify' | 'exclude';
  intensity: number; // 0-1
  reason: string;
}

export interface SuggestionPersonalization {
  userProfile: UserProfile;
  learningRate: number;
  adaptationSpeed: number;
  preferences: SuggestionPreference[];
  behaviorPatterns: BehaviorPattern[];
}

export interface UserProfile {
  schedulingStyle: 'structured' | 'flexible' | 'spontaneous' | 'collaborative';
  riskTolerance: number; // 0-1
  planningHorizon: number; // days
  collaborationLevel: number; // 0-1
  automationPreference: number; // 0-1
}

export interface SuggestionPreference {
  category: string;
  preference: number; // 0-1
  confidence: number;
  lastUpdated: string;
  source: 'explicit' | 'implicit' | 'inferred';
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  strength: number; // 0-1
  context: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SuggestionFeedback {
  suggestionId: string;
  accepted: boolean;
  rating: number; // 1-5
  comment: string;
  modificationsRequested: string[];
  timestamp: string;
  context: FeedbackContext;
}

export interface FeedbackContext {
  situationType: string;
  timeConstraints: boolean;
  stakeholderCount: number;
  urgencyLevel: string;
  complexityLevel: string;
}

export interface SuggestionPerformance {
  overallAcceptanceRate: number;
  categoryPerformance: Record<string, number>;
  userSatisfactionScore: number;
  timeSaved: number; // minutes per week
  conflictsAvoided: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

// === Preferences and Settings ===

export interface NotificationPreference {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  timing: 'immediate' | '5min' | '15min' | '30min' | '1hour' | '1day';
  conditions: string[];
}

export interface AutomationSettings {
  autoScheduling: boolean;
  smartRescheduling: boolean;
  bufferTimeManagement: boolean;
  conflictResolution: 'manual' | 'auto' | 'smart';
  notificationPreferences: NotificationPreference[];
}

export interface PrivacySettings {
  shareAvailability: boolean;
  showMeetingDetails: boolean;
  allowDirectBooking: boolean;
  restrictedTimeSlots: string[];
  visibilityLevel: 'public' | 'organization' | 'private';
}

export interface SchedulingPreferences {
  generalPreferences: GeneralPreferences;
  timePreferences: TimePreferences;
  locationPreferences: LocationPreferences;
  participantPreferences: ParticipantPreferences;
  communicationPreferences: CommunicationPreferences;
  automationSettings: AutomationSettings;
  privacySettings: PrivacySettings;
}

export interface GeneralPreferences {
  defaultMeetingDuration: number; // minutes
  bufferTime: number; // minutes between meetings
  workingHours: BusinessHours;
  timeZone: string;
  meetingFrequencyLimits: FrequencyLimits;
  energyOptimization: boolean;
}

export interface FrequencyLimits {
  maxMeetingsPerDay: number;
  maxMeetingsPerWeek: number;
  maxConsecutiveMeetings: number;
  minBreakBetweenMeetings: number; // minutes
}

export interface TimePreferences {
  preferredMeetingTimes: PreferredTime[];
  avoidedTimes: AvoidedTime[];
  flexibilityLevel: number; // 0-1
  seasonalAdjustments: SeasonalAdjustment[];
  energyBasedScheduling: EnergyProfile;
}

export interface AvoidedTime {
  period: TimePeriod;
  reason: string;
  severity: 'soft_avoid' | 'hard_avoid' | 'never';
  exceptions: string[];
}

export interface SeasonalAdjustment {
  season: string;
  adjustments: Record<string, unknown>;
  effectiveDate: string;
  expirationDate: string;
}

export interface EnergyProfile {
  enabled: boolean;
  energyCurve: EnergyLevel[];
  meetingTypeWeights: Record<string, number>;
  recoveryTime: number; // minutes after high-energy meetings
}

export interface EnergyLevel {
  time: string;
  level: number; // 0-1
  suitableMeetingTypes: string[];
}

export interface LocationPreferences {
  preferredLocations: Location[];
  avoidedLocations: string[];
  maxTravelTime: number; // minutes
  transportationMethods: TransportationMethod[];
  locationFlexibility: number; // 0-1
}

export interface TransportationMethod {
  method: 'walking' | 'driving' | 'public_transport' | 'rideshare' | 'cycling';
  preference: number; // 0-1
  maxTime: number; // minutes
  cost: number;
}

export interface ParticipantPreferences {
  preferredCollaborators: PreferredCollaborator[];
  meetingSizePreferences: SizePreference[];
  roleBasedPreferences: RolePreference[];
  relationshipManagement: RelationshipManagement;
}

export interface PreferredCollaborator {
  participantId: string;
  name: string;
  preference: number; // 0-1
  bestMeetingTypes: string[];
  optimalGroupSize: number;
  workingRelationship: string;
}

export interface SizePreference {
  meetingType: string;
  minParticipants: number;
  maxParticipants: number;
  optimalSize: number;
  efficiency: number; // 0-1
}

export interface RolePreference {
  role: string;
  importance: number; // 0-1
  interactionStyle: string;
  decisionMaking: string;
  meetingFrequency: string;
}

export interface RelationshipManagement {
  networkMapping: boolean;
  conflictAwareness: boolean;
  influenceMapping: boolean;
  communicationStyles: Record<string, string>;
}

export interface CommunicationPreferences {
  notificationSettings: NotificationSettings;
  confirmationRequired: ConfirmationSettings;
  languagePreferences: LanguagePreferences;
  accessibilitySettings: AccessibilitySettings;
}

export interface NotificationSettings {
  channels: NotificationChannel[];
  timing: NotificationTiming[];
  content: NotificationContent;
  frequency: NotificationFrequency;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'slack' | 'teams';
  enabled: boolean;
  priority: number;
  conditions: string[];
}

export interface NotificationTiming {
  event: string;
  advance: number; // minutes
  reminders: number[];
  timezone: string;
}

export interface NotificationContent {
  includeAgenda: boolean;
  includeParticipants: boolean;
  includeLocation: boolean;
  includeDialIn: boolean;
  customization: boolean;
}

export interface NotificationFrequency {
  maxPerDay: number;
  batchSimilar: boolean;
  quietHours: TimePeriod;
  urgencyOverride: boolean;
}

export interface ConfirmationSettings {
  requireConfirmation: boolean;
  timeoutPeriod: number; // minutes
  escalationChain: string[];
  autoAcceptCriteria: AcceptanceCriteria[];
}

export interface AcceptanceCriteria {
  condition: string;
  value: any;
  confidence: number;
  override: boolean;
}

export interface LanguagePreferences {
  primaryLanguage: string;
  supportedLanguages: string[];
  translationAccuracy: number;
  culturalAdaptation: boolean;
}

export interface AccessibilitySettings {
  visualImpairments: VisualAccessibility;
  hearingImpairments: HearingAccessibility;
  cognitiveSupport: CognitiveAccessibility;
  motorLimitations: MotorAccessibility;
}

export interface VisualAccessibility {
  screenReader: boolean;
  highContrast: boolean;
  largeFonts: boolean;
  colorAdjustments: boolean;
}

export interface HearingAccessibility {
  hearingLoop: boolean;
  signLanguage: boolean;
  captioning: boolean;
  amplification: boolean;
}

export interface CognitiveAccessibility {
  simplifiedInterface: boolean;
  extraConfirmations: boolean;
  stepByStepGuidance: boolean;
  memoryAids: boolean;
}

export interface MotorAccessibility {
  voiceInput: boolean;
  largeButtons: boolean;
  gestureAlternatives: boolean;
  dwellClick: boolean;
}

// === Performance and Analytics ===

export interface SchedulingPerformanceMetrics {
  efficiency: EfficiencyMetrics;
  userSatisfaction: SatisfactionMetrics;
  systemPerformance: SystemPerformanceMetrics;
  learningProgress: LearningProgressMetrics;
  businessImpact: BusinessImpactMetrics;
}

export interface EfficiencyMetrics {
  averageSchedulingTime: number; // minutes
  firstAttemptSuccessRate: number; // percentage
  conflictResolutionRate: number;
  automationLevel: number; // 0-1
  timeToConfirmation: number; // minutes
  resourceUtilization: number; // percentage
}

export interface SatisfactionMetrics {
  overallSatisfaction: number; // 0-1
  easeOfUse: number;
  accuracyRating: number;
  timelinessRating: number;
  recommendationScore: number; // NPS style
  retentionRate: number;
}

export interface SystemPerformanceMetrics {
  responseTime: number; // milliseconds
  availability: number; // percentage
  accuracy: number; // percentage
  scalability: ScalabilityMetrics;
  reliability: ReliabilityMetrics;
}

export interface ScalabilityMetrics {
  maxConcurrentUsers: number;
  maxMeetingsPerHour: number;
  performanceDegradation: number; // percentage at peak load
  resourceConsumption: ResourceConsumption;
}

export interface ResourceConsumption {
  cpuUsage: number; // percentage
  memoryUsage: number; // GB
  networkBandwidth: number; // Mbps
  storageGrowth: number; // GB per month
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  errorRate: number; // percentage
  dataConsistency: number; // percentage
  backupSuccess: number; // percentage
  recoveryTime: number; // minutes
}

export interface LearningProgressMetrics {
  modelAccuracy: number; // percentage
  predictionReliability: number;
  adaptationSpeed: number; // days to learn new pattern
  knowledgeRetention: number; // percentage
  transferLearning: number; // ability to apply learning to new scenarios
}

export interface BusinessImpactMetrics {
  meetingEffectiveness: number; // 0-1
  timeSavings: number; // hours per week
  costReduction: number; // currency per month
  productivityImprovement: number; // percentage
  employeeSatisfaction: number; // 0-1
  workLifeBalance: number; // 0-1
}

// === Calendar Integration ===

export interface CalendarIntegration {
  provider: CalendarProvider;
  connectionStatus: ConnectionStatus;
  syncSettings: SyncSettings;
  capabilities: IntegrationCapabilities;
  performance: IntegrationPerformance;
  errorHandling: ErrorHandling;
}

export type CalendarProvider = 
  | 'google_calendar'
  | 'outlook'
  | 'apple_calendar'
  | 'exchange'
  | 'caldav'
  | 'zimbra'
  | 'lotus_notes';

export interface ConnectionStatus {
  connected: boolean;
  lastSync: string;
  health: 'healthy' | 'warning' | 'error';
  issues: ConnectionIssue[];
  authentication: AuthenticationStatus;
}

export interface ConnectionIssue {
  type: 'authentication' | 'permission' | 'network' | 'rate_limit' | 'data_conflict';
  severity: 'low' | 'medium' | 'high';
  message: string;
  resolution: string;
  autoFixable: boolean;
}

export interface AuthenticationStatus {
  type: 'oauth' | 'basic' | 'token' | 'certificate';
  expires: string;
  scopes: string[];
  needsRenewal: boolean;
}

export interface SyncSettings {
  direction: 'bidirectional' | 'read_only' | 'write_only';
  frequency: 'real_time' | 'every_minute' | 'every_5_minutes' | 'hourly';
  conflictResolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  dataTypes: DataType[];
  filters: SyncFilter[];
}

export interface DataType {
  type: 'events' | 'availability' | 'reminders' | 'attendees' | 'resources';
  enabled: boolean;
  priority: number;
  customMapping: boolean;
}

export interface SyncFilter {
  field: string;
  operator: string;
  value: any;
  action: 'include' | 'exclude' | 'transform';
}

export interface IntegrationCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  supportsRecurrence: boolean;
  supportsReminders: boolean;
  supportsAttachments: boolean;
  supportsVideoConferencing: boolean;
  maxEventDuration: number; // minutes
  maxAttendeesPerEvent: number;
}

export interface IntegrationPerformance {
  syncLatency: number; // milliseconds
  successRate: number; // percentage
  errorRate: number;
  throughput: number; // events per minute
  reliability: number; // 0-1
}

export interface ErrorHandling {
  retryPolicy: RetryPolicy;
  fallbackMethods: FallbackMethod[];
  errorNotification: ErrorNotificationSettings;
  recovery: RecoverySettings;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number; // milliseconds
  maxDelay: number;
  conditions: RetryCondition[];
}

export interface RetryCondition {
  errorType: string;
  retryable: boolean;
  customDelay?: number;
}

export interface FallbackMethod {
  method: string;
  conditions: string[];
  reliability: number;
  performance: number;
}

export interface ErrorNotificationSettings {
  enabled: boolean;
  channels: string[];
  severity: string[];
  frequency: string;
}

export interface RecoverySettings {
  autoRecovery: boolean;
  recoveryMethods: string[];
  dataValidation: boolean;
  backupRestoration: boolean;
}

// === Additional Supporting Types ===

export interface AdaptationSettings {
  learningRate: number; // 0-1
  adaptationFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  confidenceThreshold: number; // 0-1
  rollbackCapability: boolean;
  userFeedbackWeight: number; // 0-1
}

export interface AmbiguityResolution {
  strategies: AmbiguityStrategy[];
  contextClues: ContextClue[];
  clarificationPrompts: ClarificationPrompt[];
  fallbackBehavior: FallbackBehavior;
}

export interface AmbiguityStrategy {
  name: string;
  applicableScenarios: string[];
  accuracy: number; // 0-1
  confidence: number;
  processingTime: number; // milliseconds
}

export interface ContextClue {
  type: string;
  source: string;
  weight: number; // 0-1
  reliability: number;
}

export interface ClarificationPrompt {
  trigger: string;
  prompt: string;
  alternatives: string[];
  maxAttempts: number;
}

export interface FallbackBehavior {
  action: 'ask_for_clarification' | 'use_default' | 'suggest_alternatives' | 'escalate_to_human';
  timeout: number; // seconds
  failureHandling: string;
}

export interface FallbackStrategy {
  name: string;
  condition: string;
  action: string;
  priority: number;
  successRate: number;
}

export interface MultiLanguageSupport {
  supportedLanguages: SupportedLanguage[];
  translationService: TranslationService;
  languageDetection: LanguageDetection;
  crossLanguageUnderstanding: boolean;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  accuracy: number; // 0-1
  features: LanguageFeature[];
  culturalAdaptation: boolean;
}

export interface LanguageFeature {
  feature: string;
  supported: boolean;
  accuracy: number;
  limitations: string[];
}

export interface TranslationService {
  provider: string;
  accuracy: number;
  latency: number; // milliseconds
  cost: number;
  limitations: string[];
}

export interface LanguageDetection {
  accuracy: number; // 0-1
  confidence: number;
  fallbackLanguage: string;
  multilingualSupport: boolean;
}

export interface ConversationalFlow {
  states: ConversationState[];
  transitions: StateTransition[];
  context: ConversationContext;
  memory: ConversationMemory;
}

export interface ConversationState {
  name: string;
  description: string;
  expectedInputs: string[];
  possibleOutputs: string[];
  nextStates: string[];
  timeout: number; // seconds
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  conditions: TransitionCondition[];
  actions: TransitionAction[];
}

export interface TransitionCondition {
  type: string;
  value: any;
  operator: string;
  weight: number;
}

export interface TransitionAction {
  action: string;
  parameters: Record<string, unknown>;
  order: number;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  startTime: string;
  history: ConversationTurn[];
  variables: Record<string, unknown>;
}

export interface ConversationTurn {
  turnNumber: number;
  timestamp: string;
  userInput: string;
  systemResponse: string;
  intent: string;
  entities: ExtractedEntity[];
  confidence: number;
}

export interface ConversationMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  working: WorkingMemory;
}

export interface ShortTermMemory {
  capacity: number;
  retention: number; // minutes
  data: MemoryItem[];
}

export interface LongTermMemory {
  preferences: UserPreference[];
  patterns: BehaviorPattern[];
  relationships: RelationshipMemory[];
  history: HistoricalInteraction[];
}

export interface WorkingMemory {
  currentTask: Task;
  subgoals: Subgoal[];
  constraints: Constraint[];
  context: ContextualInformation;
}

export interface MemoryItem {
  id: string;
  type: string;
  content: any;
  importance: number; // 0-1
  timestamp: string;
  associations: string[];
}

export interface UserPreference {
  category: string;
  preference: any;
  confidence: number;
  source: string;
  lastUpdated: string;
}

export interface RelationshipMemory {
  personId: string;
  relationship: string;
  interactions: InteractionHistory[];
  preferences: PersonPreference[];
  context: RelationshipContext;
}

export interface InteractionHistory {
  date: string;
  type: string;
  outcome: string;
  satisfaction: number;
  notes: string;
}

export interface PersonPreference {
  type: string;
  preference: any;
  confidence: number;
  context: string;
}

export interface RelationshipContext {
  role: string;
  department: string;
  seniority: string;
  workingRelationship: string;
  communicationStyle: string;
}

export interface HistoricalInteraction {
  sessionId: string;
  date: string;
  duration: number;
  outcome: string;
  satisfaction: number;
  learningPoints: string[];
}

export interface Task {
  id: string;
  type: string;
  description: string;
  status: string;
  progress: number; // 0-1
  deadline?: string;
}

export interface Subgoal {
  id: string;
  description: string;
  completed: boolean;
  dependencies: string[];
  priority: number;
}

export interface Constraint {
  type: string;
  description: string;
  severity: 'soft' | 'hard';
  workaround?: string;
}

export interface ContextualInformation {
  environment: string;
  timeContext: string;
  socialContext: string;
  businessContext: string;
}

export interface DecisionMakingEngine {
  algorithms: DecisionAlgorithm[];
  criteria: DecisionCriteria[];
  weights: DecisionWeight[];
  confidence: DecisionConfidence;
  explainability: DecisionExplanation;
}

export interface DecisionAlgorithm {
  name: string;
  type: 'rule_based' | 'ml_model' | 'optimization' | 'heuristic';
  parameters: Record<string, unknown>;
  performance: AlgorithmPerformance;
  applicability: string[];
}

export interface DecisionCriteria {
  name: string;
  type: string;
  weight: number; // 0-1
  measurement: string;
  threshold?: number;
  optimization: 'minimize' | 'maximize' | 'target';
}

export interface DecisionWeight {
  criterion: string;
  weight: number;
  context: string;
  adaptable: boolean;
}

export interface DecisionConfidence {
  overall: number; // 0-1
  factors: ConfidenceFactor[];
  uncertainty: UncertaintyMeasure[];
  sensitivity: SensitivityAnalysis[];
}

export interface ConfidenceFactor {
  factor: string;
  contribution: number; // 0-1
  reliability: number;
  source: string;
}

export interface UncertaintyMeasure {
  source: string;
  level: number; // 0-1
  impact: string;
  mitigation: string;
}

export interface SensitivityAnalysis {
  parameter: string;
  sensitivity: number; // 0-1
  criticalValue: number;
  impact: string;
}

export interface DecisionExplanation {
  summary: string;
  keyFactors: KeyFactor[];
  alternatives: AlternativeExplanation[];
  reasoning: ReasoningStep[];
  confidence: number;
}

export interface KeyFactor {
  factor: string;
  importance: number; // 0-1
  value: any;
  impact: string;
}

export interface AlternativeExplanation {
  alternative: string;
  score: number;
  reasoning: string;
  tradeoffs: string[];
}

export interface ReasoningStep {
  step: number;
  description: string;
  inputs: any[];
  outputs: any[];
  confidence: number;
}

export interface ContextualUnderstanding {
  situationalAwareness: SituationalAwareness;
  environmentalContext: EnvironmentalContext;
  socialContext: SocialContext;
  businessContext: BusinessContext;
  temporalContext: TemporalContext;
}

export interface SocialContext {
  organizationalHierarchy: HierarchyInfo[];
  teamDynamics: TeamDynamic[];
  relationshipMap: RelationshipMap;
  communicationPatterns: CommunicationPattern[];
  culturalFactors: CulturalFactor[];
}

export interface HierarchyInfo {
  personId: string;
  level: number;
  department: string;
  reportingChain: string[];
  influence: number; // 0-1
}

export interface TeamDynamic {
  teamId: string;
  members: string[];
  dynamics: string;
  effectiveness: number; // 0-1
  conflictLevel: number; // 0-1
}

export interface RelationshipMap {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  clusters: RelationshipCluster[];
}

export interface RelationshipNode {
  personId: string;
  centrality: number; // 0-1
  influence: number;
  role: string;
}

export interface RelationshipEdge {
  from: string;
  to: string;
  strength: number; // 0-1
  type: string;
  frequency: number;
}

export interface RelationshipCluster {
  id: string;
  members: string[];
  type: string;
  cohesion: number; // 0-1
}

export interface CommunicationPattern {
  pattern: string;
  frequency: number;
  effectiveness: number; // 0-1
  participants: string[];
  context: string;
}

export interface CulturalFactor {
  factor: string;
  impact: number; // 0-1
  adaptation: string;
  sensitivity: number;
}

export interface BusinessContext {
  organizationalGoals: OrganizationalGoal[];
  currentProjects: ProjectContext[];
  businessCycle: BusinessCycle;
  marketConditions: MarketCondition[];
  strategicInitiatives: StrategicInitiative[];
}

export interface OrganizationalGoal {
  goal: string;
  priority: number; // 0-1
  deadline: string;
  owner: string;
  progress: number; // 0-1
}

export interface ProjectContext {
  projectId: string;
  name: string;
  status: string;
  deadline: string;
  stakeholders: string[];
  priority: number;
}

export interface BusinessCycle {
  phase: string;
  characteristics: string[];
  typical_activities: string[];
  duration: string;
  impact: string;
}

export interface MarketCondition {
  condition: string;
  impact: string;
  duration: string;
  adaptations: string[];
}

export interface StrategicInitiative {
  initiative: string;
  timeline: string;
  stakeholders: string[];
  impact: number; // 0-1
  resources: string[];
}

export interface TemporalContext {
  currentPhase: BusinessPhase;
  seasonality: SeasonalPattern[];
  deadlines: ImportantDeadline[];
  cyclicalEvents: CyclicalEvent[];
  timeHorizon: TimeHorizon;
}

export interface BusinessPhase {
  phase: string;
  duration: string;
  characteristics: string[];
  schedulingImplications: string[];
}

export interface SeasonalPattern {
  pattern: string;
  season: string;
  impact: string;
  adjustments: string[];
}

export interface ImportantDeadline {
  deadline: string;
  importance: number; // 0-1
  impact: string;
  preparation: string[];
}

export interface CyclicalEvent {
  event: string;
  frequency: string;
  duration: string;
  impact: string;
  preparation: number; // days
}

export interface TimeHorizon {
  short: number; // days
  medium: number;
  long: number;
  strategic: number;
}

// === API Request/Response Types ===

export interface VoiceSchedulingRequest {
  command: string;
  audioData?: string;
  context?: RequestContext;
  preferences?: Partial<SchedulingPreferences>;
  constraints?: SchedulingConstraint[];
}

export interface SchedulingConstraint {
  type: 'time' | 'date' | 'duration' | 'location' | 'participant';
  value: string | number;
  operator: 'equals' | 'not_equals' | 'before' | 'after' | 'during' | 'not_during';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequestContext {
  sessionId?: string;
  userId: string;
  organizationId: string;
  timeZone: string;
  language: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface VoiceSchedulingResponse {
  success: boolean;
  sessionId: string;
  intent: SchedulingIntent;
  confidence: number;
  response: string;
  actions: SchedulingAction[];
  suggestions: Suggestion[];
  clarifications: Clarification[];
  error?: string;
}

export interface SchedulingAction {
  action: string;
  type: 'create' | 'update' | 'delete' | 'query' | 'suggest';
  target: string;
  parameters: Record<string, unknown>;
  confidence: number;
  impact: ActionImpact;
}

export interface ActionImpact {
  participants: string[];
  timeSlots: TimeSlot[];
  resources: string[];
  estimated_effort: number; // minutes
  reversible: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  duration: number; // minutes
  timezone: string;
  availability: 'free' | 'busy' | 'tentative' | 'unknown';
}

export interface Suggestion {
  type: 'alternative_time' | 'alternative_participant' | 'alternative_location' | 'optimization';
  content: string;
  confidence: number;
  rationale: string;
  impact: SuggestionImpact;
}

export interface SuggestionImpact {
  beneficiaries: string[];
  trade_offs: string[];
  estimated_improvement: number; // percentage
  effort_required: 'low' | 'medium' | 'high';
}

export interface Clarification {
  question: string;
  type: 'missing_info' | 'ambiguity' | 'confirmation' | 'preference';
  options?: string[];
  default_value?: any;
  required: boolean;
  context: string;
}

export interface SessionFeedback {
  rating: number; // 1-5
  comment: string;
  aspects: FeedbackAspect[];
  suggestions: string[];
  timestamp: string;
}

export interface FeedbackAspect {
  aspect: 'accuracy' | 'speed' | 'ease_of_use' | 'helpfulness' | 'reliability';
  rating: number; // 1-5
  comment: string;
}

export interface SessionContext {
  organizationalContext: string;
  userRole: string;
  currentWorkload: number; // 0-1
  recentMeetings: RecentMeeting[];
  upcomingDeadlines: UpcomingDeadline[];
}

export interface RecentMeeting {
  meetingId: string;
  title: string;
  date: string;
  outcome: string;
  satisfaction: number; // 0-1
}

export interface UpcomingDeadline {
  deadline: string;
  description: string;
  importance: number; // 0-1
  preparation_required: number; // hours
}

export interface SessionPerformance {
  duration: number; // seconds
  interactions: number;
  successfulActions: number;
  errors: number;
  userSatisfaction: number; // 0-1
  efficiency: number; // 0-1
}

// Export commonly used types with shorter names
export type {
  SmartVoiceScheduler as VoiceScheduler,
  SchedulingSession as Session,
  VoiceSchedulingCommand as Command,
  MeetingDetails as Meeting,
  SchedulingPreferences as Preferences
};