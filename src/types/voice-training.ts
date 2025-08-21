/**
 * Voice Training System Types
 * Advanced voice model training and personalization
 */

// === Core Training Types ===

export interface VoiceTrainingSystem {
  userId: string;
  organizationId: string;
  trainingProfiles: VoiceTrainingProfile[];
  activeModel: string;
  trainingHistory: TrainingSession[];
  adaptationEngine: AdaptationEngine;
  performanceMetrics: TrainingPerformanceMetrics;
  personalizationSettings: TrainingPersonalizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ModelAccuracyMetrics {
  accuracy?: number;
  overall?: number;
  precision: number;
  recall: number;
  f1Score: number;
  responseTime?: number;
  confidence: number;
  errorRate: number;
  testSampleSize?: number;
  lastEvaluated?: string;
}

export interface AdaptationEvent {
  id: string;
  type?: string;
  timestamp: string;
  adaptationType?: AdaptationType;
  trigger: string;
  beforeMetrics?: ModelMetrics;
  afterMetrics?: ModelMetrics;
  improvement?: number;
  confidence?: number;
  rollbackAvailable?: boolean;
  adaptationDetails?: any;
}

export interface VoiceTrainingProfile {
  id: string;
  userId: string;
  profileName: string;
  modelType: ModelType;
  trainingData: TrainingDataset;
  modelWeights: string; // Encrypted model weights
  accuracyMetrics: ModelAccuracyMetrics;
  adaptationHistory: AdaptationEvent[];
  isActive: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  lastUsed: string;
}

export type ModelType = 
  | 'speech_recognition' 
  | 'speaker_identification' 
  | 'emotion_detection' 
  | 'intent_classification'
  | 'accent_adaptation'
  | 'noise_suppression'
  | 'command_recognition'
  | 'multilingual';

export interface TrainingDataset {
  audioSamples: AudioSample[];
  transcriptions: TranscriptionPair[];
  contextualData: ContextualTrainingData[];
  augmentedData: DataAugmentation[];
  qualityScore: number;
  diversity: DataDiversityMetrics;
  size: DatasetSize;
}

export interface AudioSample {
  id: string;
  audioData: string; // Base64 encoded or file reference
  duration: number; // seconds
  sampleRate: number;
  channels: number;
  quality: AudioQuality;
  recording: RecordingMetadata;
  labels: SampleLabel[];
  features: ExtractedFeatures;
  validationStatus: ValidationStatus;
}

export interface AudioQuality {
  signalToNoise: number;
  clarity: number;
  backgroundNoise: number;
  compression: number;
  overallScore: number; // 1-5
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'noise' | 'distortion' | 'clipping' | 'low_volume' | 'echo';
  severity: 'low' | 'medium' | 'high';
  description: string;
  fixable: boolean;
  fixSuggestion?: string;
}

export interface RecordingMetadata {
  timestamp: string;
  device: string;
  environment: string;
  speakerDistance: number; // cm
  backgroundContext: string;
  emotionalState: string;
  speakingStyle: SpeakingStyle;
}

export interface SpeakingStyle {
  formality: 'casual' | 'business' | 'formal';
  pace: 'slow' | 'normal' | 'fast';
  volume: 'quiet' | 'normal' | 'loud';
  clarity: 'unclear' | 'clear' | 'very_clear';
  accent: string;
  dialect: string;
}

export interface SampleLabel {
  type: 'transcription' | 'emotion' | 'intent' | 'speaker' | 'language' | 'accent';
  value: string;
  confidence: number;
  verified: boolean;
  annotatorId?: string;
}

export interface ExtractedFeatures {
  mfccCoefficients: number[];
  spectralFeatures: SpectralFeatures;
  prosodyFeatures: ProsodyFeatures;
  linguisticFeatures: LinguisticFeatures;
  embeddings: VoiceEmbedding;
}

export interface SpectralFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralBandwidth: number;
  spectralContrast: number[];
  chromaFeatures: number[];
  tonnetz: number[];
}

export interface ProsodyFeatures {
  fundamentalFrequency: number[];
  pitch: PitchFeatures;
  rhythm: RhythmFeatures;
  stress: StressFeatures;
  intonation: IntonationPattern[];
}

export interface PitchFeatures {
  mean: number;
  std: number;
  min: number;
  max: number;
  range: number;
  contour: number[];
}

export interface RhythmFeatures {
  tempo: number;
  rhythmVariability: number;
  syllableRate: number;
  pauseDuration: number[];
  rhythmPattern: number[];
}

export interface StressFeatures {
  stressPattern: number[];
  primaryStress: number[];
  secondaryStress: number[];
  unstressed: number[];
}

export interface IntonationPattern {
  type: 'rising' | 'falling' | 'level' | 'rise-fall' | 'fall-rise';
  strength: number;
  duration: number;
  context: string;
}

export interface LinguisticFeatures {
  phonemes: PhonemeAnalysis[];
  words: WordAnalysis[];
  phrases: PhraseAnalysis[];
  semantics: SemanticFeatures;
}

export interface PhonemeAnalysis {
  phoneme: string;
  duration: number;
  accuracy: number;
  clarity: number;
  articulationScore: number;
}

export interface WordAnalysis {
  word: string;
  pronunciation: string;
  accuracy: number;
  recognitionConfidence: number;
  stressPattern: string;
}

export interface PhraseAnalysis {
  phrase: string;
  syntacticStructure: string;
  semanticMeaning: string;
  pragmaticContext: string;
  fluency: number;
}

export interface SemanticFeatures {
  entities: Entity[];
  intents: Intent[];
  sentiments: Sentiment[];
  topics: Topic[];
  concepts: Concept[];
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
  span: [number, number];
}

export interface Intent {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
}

export interface Sentiment {
  polarity: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intensity: number;
}

export interface Topic {
  topic: string;
  relevance: number;
  keywords: string[];
}

export interface Concept {
  concept: string;
  abstractionLevel: number;
  relations: ConceptRelation[];
}

export interface ConceptRelation {
  relation: string;
  target: string;
  strength: number;
}

export interface VoiceEmbedding {
  vector: number[];
  dimensions: number;
  modelVersion: string;
  extractionMethod: string;
  similarity?: EmbeddingSimilarity[];
}

export interface EmbeddingSimilarity {
  targetSample: string;
  similarity: number;
  distance: number;
  method: 'cosine' | 'euclidean' | 'manhattan';
}

export interface ValidationStatus {
  validated: boolean;
  validator: 'human' | 'automatic' | 'hybrid';
  validationScore: number;
  issues: ValidationIssue[];
  approvedAt?: string;
  approvedBy?: string;
}

export interface ValidationIssue {
  type: 'quality' | 'labeling' | 'content' | 'privacy';
  severity: 'low' | 'medium' | 'high';
  description: string;
  resolved: boolean;
  resolution?: string;
}

// === Training Session Types ===

export interface TrainingSession {
  id: string;
  userId: string;
  profileId: string;
  sessionType: TrainingSessionType;
  configuration: TrainingConfiguration;
  progress: TrainingProgress;
  results: TrainingResults;
  metrics: SessionMetrics;
  feedback: TrainingFeedback[];
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export type TrainingSessionType = 
  | 'initial_enrollment' 
  | 'adaptation_training' 
  | 'accuracy_improvement'
  | 'accent_training'
  | 'noise_adaptation'
  | 'command_expansion'
  | 'multilingual_training'
  | 'personalization';

export interface TrainingConfiguration {
  modelType: ModelType;
  trainingAlgorithm: TrainingAlgorithm;
  hyperparameters: Hyperparameters;
  dataAugmentation: AugmentationSettings;
  validationSplit: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  objectives: TrainingObjective[];
}

export type TrainingAlgorithm = 
  | 'supervised_learning'
  | 'transfer_learning'
  | 'few_shot_learning'
  | 'meta_learning'
  | 'active_learning'
  | 'continual_learning'
  | 'federated_learning';

export interface Hyperparameters {
  [key: string]: number | string | boolean | number[];
}

export interface AugmentationSettings {
  enabled: boolean;
  techniques: AugmentationTechnique[];
  intensity: number; // 0-1
  preserveOriginal: boolean;
}

export interface AugmentationTechnique {
  type: 'noise_injection' | 'speed_change' | 'pitch_shift' | 'time_stretch' | 'reverb' | 'filtering';
  parameters: Record<string, number>;
  probability: number;
}

export interface TrainingObjective {
  metric: string;
  targetValue: number;
  weight: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  completionPercentage: number;
  currentLoss: number;
  validationAccuracy: number;
  bestValidationAccuracy: number;
  epochMetrics: EpochMetric[];
  estimatedTimeRemaining: number; // seconds
  convergenceStatus: ConvergenceStatus;
}

export interface EpochMetric {
  epoch: number;
  trainingLoss: number;
  validationLoss: number;
  trainingAccuracy: number;
  validationAccuracy: number;
  learningRate: number;
  timestamp: string;
}

export interface ConvergenceStatus {
  converged: boolean;
  plateauDetected: boolean;
  overFittingRisk: 'low' | 'medium' | 'high';
  earlyStoppingTriggered: boolean;
  stagnationCounter: number;
}

export interface TrainingResults {
  finalAccuracy: number;
  validationAccuracy: number;
  testAccuracy: number;
  modelSize: number; // bytes
  inferenceSpeed: number; // ms
  memoryUsage: number; // MB
  improvementOverBaseline: number; // percentage
  confusionMatrix: ConfusionMatrix;
  classificationReport: ClassificationReport;
  errorAnalysis: ErrorAnalysis;
}

export interface ConfusionMatrix {
  classes: string[];
  matrix: number[][];
  normalizedMatrix: number[][];
  totalSamples: number;
}

export interface ClassificationReport {
  classes: Record<string, ClassMetrics>;
  macroAverage: ClassMetrics;
  microAverage: ClassMetrics;
  weightedAverage: ClassMetrics;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ErrorAnalysis {
  commonErrors: ErrorPattern[];
  errorCategories: ErrorCategoryAnalysis[];
  difficultyAnalysis: DifficultyAnalysis;
  recommendations: ErrorReduction[];
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  examples: string[];
  potentialCauses: string[];
  suggestedFixes: string[];
}

export interface ErrorCategoryAnalysis {
  category: string;
  errorRate: number;
  impact: 'low' | 'medium' | 'high';
  examples: string[];
  improvementStrategies: string[];
}

export interface DifficultyAnalysis {
  easySamples: number; // accuracy > 90%
  mediumSamples: number; // accuracy 70-90%
  hardSamples: number; // accuracy < 70%
  difficultyFactors: DifficultyFactor[];
}

export interface DifficultyFactor {
  factor: string;
  impact: number; // 0-1
  description: string;
  mitigation: string[];
}

export interface ErrorReduction {
  strategy: string;
  expectedImprovement: number; // percentage
  implementationEffort: 'low' | 'medium' | 'high';
  priority: number;
  description: string;
}

export interface SessionMetrics {
  dataQuality: DataQualityMetrics;
  trainingEfficiency: TrainingEfficiencyMetrics;
  resourceUsage: ResourceUsageMetrics;
  userExperience: UserExperienceMetrics;
}

export interface DataQualityMetrics {
  averageQuality: number;
  qualityDistribution: QualityDistribution;
  diversityScore: number;
  coverageScore: number;
  balanceScore: number;
  annotationAccuracy: number;
}

export interface QualityDistribution {
  excellent: number; // percentage
  good: number;
  fair: number;
  poor: number;
}

export interface TrainingEfficiencyMetrics {
  convergenceRate: number;
  trainingSpeed: number; // samples/second
  memoryEfficiency: number;
  computationalEfficiency: number;
  dataUtilization: number;
}

export interface ResourceUsageMetrics {
  cpuUtilization: number[];
  memoryUsage: number[];
  gpuUtilization?: number[];
  networkBandwidth: number[];
  storageUsed: number; // MB
  energyConsumption?: number; // kWh
}

export interface UserExperienceMetrics {
  taskCompletionTime: number;
  userSatisfaction: number;
  difficultyRating: number;
  frustrationLevel: number;
  engagementScore: number;
  dropoutRate: number;
}

export interface TrainingFeedback {
  type: 'user' | 'system' | 'expert';
  rating: number; // 1-5
  comment: string;
  category: 'accuracy' | 'speed' | 'usability' | 'reliability' | 'feature';
  timestamp: string;
  helpful: boolean;
  actionTaken?: string;
}

export type SessionStatus = 
  | 'pending'
  | 'initializing' 
  | 'training' 
  | 'validating'
  | 'completed' 
  | 'failed' 
  | 'cancelled'
  | 'paused';

// === Adaptation Engine Types ===

export interface AdaptationEngine {
  userId: string;
  adaptationStrategy: AdaptationStrategy;
  continuousLearning: ContinuousLearningConfig;
  personalizedAdaptation: PersonalizedAdaptation;
  contextualAdaptation: ContextualAdaptation;
  performanceMonitoring: PerformanceMonitoring;
  adaptationHistory: AdaptationEvent[];
}

export interface AdaptationStrategy {
  type: 'reactive' | 'proactive' | 'hybrid';
  triggerConditions: AdaptationTrigger[];
  adaptationMethods: AdaptationMethod[];
  learningRate: number;
  forgettingRate: number;
  stabilityThreshold: number;
}

export interface AdaptationTrigger {
  condition: string;
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'change';
  metric: string;
  windowSize: number; // samples or time
  priority: number;
}

export interface AdaptationMethod {
  method: 'incremental_update' | 'model_fine_tuning' | 'ensemble_update' | 'parameter_adjustment';
  parameters: Record<string, any>;
  applicability: string[];
  effectiveness: number; // 0-1
}

export interface ContinuousLearningConfig {
  enabled: boolean;
  learningMode: 'online' | 'batch' | 'mini_batch';
  updateFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  retentionPolicy: RetentionPolicy;
  catastrophicForgettingPrevention: ForgettingPrevention;
}

export interface RetentionPolicy {
  maxSamples: number;
  retentionCriteria: RetentionCriterion[];
  archivalStrategy: 'compress' | 'summarize' | 'selective_delete';
}

export interface RetentionCriterion {
  criterion: 'recency' | 'importance' | 'uniqueness' | 'difficulty' | 'user_preference';
  weight: number;
  threshold: number;
}

export interface ForgettingPrevention {
  technique: 'elastic_weight_consolidation' | 'rehearsal' | 'gradient_episodic_memory' | 'progressive_neural_networks';
  parameters: Record<string, any>;
  effectiveness: number;
}

export interface PersonalizedAdaptation {
  userProfile: UserAdaptationProfile;
  learningStyle: LearningStyleProfile;
  adaptationPreferences: AdaptationPreferences;
  personalizedStrategies: PersonalizedStrategy[];
}

export interface UserAdaptationProfile {
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  preferredFeedbackType: 'immediate' | 'delayed' | 'summary';
  learningPatterns: LearningPattern[];
  strengthsAndWeaknesses: SkillAssessment[];
}

export interface LearningPattern {
  pattern: string;
  frequency: number;
  effectiveness: number;
  context: string[];
}

export interface SkillAssessment {
  skill: string;
  currentLevel: number; // 1-5
  improvementRate: number;
  difficultyAreas: string[];
  strengths: string[];
}

export interface LearningStyleProfile {
  visualLearner: number; // 0-1
  auditoryLearner: number;
  kinestheticLearner: number;
  readingWritingLearner: number;
  preferredPace: 'slow' | 'medium' | 'fast';
  attentionSpan: number; // minutes
}

export interface AdaptationPreferences {
  automaticAdaptation: boolean;
  adaptationNotifications: boolean;
  explainableAdaptation: boolean;
  adaptationFrequency: 'minimal' | 'moderate' | 'frequent';
  privacyLevel: 'high' | 'medium' | 'low';
}

export interface PersonalizedStrategy {
  strategy: string;
  applicableContexts: string[];
  effectiveness: number;
  userSatisfaction: number;
  implementationDetails: Record<string, any>;
}

export interface ContextualAdaptation {
  contextDetection: ContextDetection;
  contextualModels: ContextualModel[];
  adaptationRules: ContextualRule[];
  environmentAdaptation: EnvironmentAdaptation;
}

export interface ContextDetection {
  detectors: ContextDetector[];
  confidence: number;
  currentContext: DetectedContext;
  contextHistory: ContextHistory[];
}

export interface ContextDetector {
  type: 'acoustic' | 'semantic' | 'temporal' | 'behavioral' | 'environmental';
  features: string[];
  accuracy: number;
  processingTime: number; // ms
}

export interface DetectedContext {
  primaryContext: string;
  confidence: number;
  subContexts: SubContext[];
  environmentalFactors: EnvironmentalFactor[];
  timestamp: string;
}

export interface SubContext {
  context: string;
  relevance: number;
  confidence: number;
}

export interface EnvironmentalFactor {
  factor: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  significance: number;
}

export interface ContextualModel {
  context: string;
  model: string; // Model identifier
  accuracy: number;
  applicability: number;
  lastUpdated: string;
  usageCount: number;
}

export interface ContextualRule {
  rule: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  active: boolean;
}

export interface RuleCondition {
  parameter: string;
  operator: string;
  value: any;
  weight: number;
}

export interface RuleAction {
  action: string;
  parameters: Record<string, any>;
  executionOrder: number;
}

export interface EnvironmentAdaptation {
  noiseAdaptation: NoiseAdaptation;
  acousticAdaptation: AcousticAdaptation;
  deviceAdaptation: DeviceAdaptation;
  locationAdaptation: LocationAdaptation;
}

export interface NoiseAdaptation {
  noiseProfile: NoiseProfile;
  suppressionLevel: number;
  adaptationStrength: number;
  noiseTypes: NoiseType[];
}

export interface NoiseProfile {
  backgroundNoise: number;
  speechToNoise: number;
  noiseSpectrum: number[];
  dominantFrequencies: number[];
}

export interface NoiseType {
  type: string;
  frequency: number[];
  intensity: number;
  suppressionStrategy: string;
}

export interface AcousticAdaptation {
  roomAcoustics: RoomAcoustics;
  reverberation: ReverberationProfile;
  echoSuppression: EchoSuppression;
}

export interface RoomAcoustics {
  roomSize: 'small' | 'medium' | 'large';
  surfaceMaterials: string[];
  acousticTreatment: boolean;
  reflectionCharacteristics: ReflectionProfile[];
}

export interface ReflectionProfile {
  surface: string;
  reflectivity: number;
  frequency_response: number[];
}

export interface ReverberationProfile {
  rt60: number; // Reverberation time
  earlyReflections: number;
  diffuseField: number;
  clarityIndex: number;
}

export interface EchoSuppression {
  echoCancellation: boolean;
  suppressionLevel: number;
  adaptiveCancellation: boolean;
  effectivenessScore: number;
}

export interface DeviceAdaptation {
  microphoneProfile: MicrophoneProfile;
  speakerProfile: SpeakerProfile;
  deviceCapabilities: DeviceCapabilities;
  optimizationSettings: OptimizationSettings;
}

export interface MicrophoneProfile {
  type: string;
  frequency_response: number[];
  sensitivity: number;
  directionalPattern: string;
  noiseCancellation: boolean;
}

export interface SpeakerProfile {
  type: string;
  frequency_response: number[];
  power: number;
  distortionLevel: number;
  spatialCharacteristics: SpatialCharacteristics;
}

export interface SpatialCharacteristics {
  stereo: boolean;
  spatialAudio: boolean;
  directionality: string;
  positioning: string;
}

export interface DeviceCapabilities {
  processingPower: number;
  memoryAvailable: number;
  networkBandwidth: number;
  realTimeCapabilities: boolean;
  offlineCapabilities: boolean;
}

export interface OptimizationSettings {
  processingMode: 'performance' | 'quality' | 'balanced';
  batteryOptimization: boolean;
  networkOptimization: boolean;
  latencyOptimization: boolean;
}

export interface LocationAdaptation {
  geographicAdaptation: GeographicAdaptation;
  culturalAdaptation: CulturalAdaptation;
  languageVariation: LanguageVariation;
}

export interface GeographicAdaptation {
  region: string;
  timezone: string;
  localDialects: string[];
  pronunciationVariations: PronunciationVariation[];
}

export interface PronunciationVariation {
  word: string;
  standardPronunciation: string;
  localPronunciation: string;
  frequency: number;
  confidence: number;
}

export interface CulturalAdaptation {
  culturalContext: string;
  communicationStyle: string;
  formalityLevel: string;
  culturalNorms: CulturalNorm[];
}

export interface CulturalNorm {
  norm: string;
  description: string;
  impact: string;
  adaptation: string;
}

export interface LanguageVariation {
  primaryLanguage: string;
  dialects: string[];
  codeSwItching: CodeSwItchingPattern[];
  multilingual: boolean;
}

export interface CodeSwItchingPattern {
  languages: string[];
  frequency: number;
  contexts: string[];
  triggers: string[];
}

export interface ContextHistory {
  context: string;
  timestamp: string;
  duration: number;
  adaptationsMade: string[];
}

// === Performance Monitoring ===

export interface PerformanceMonitoring {
  realTimeMetrics: RealTimeMetrics;
  historicalTrends: HistoricalTrend[];
  anomalyDetection: AnomalyDetection;
  performanceAlerts: PerformanceAlert[];
  benchmarking: BenchmarkingResults;
}

export interface RealTimeMetrics {
  accuracy: number;
  responseTime: number;
  confidence: number;
  errorRate: number;
  throughput: number;
  resourceUtilization: number;
  userSatisfaction: number;
  timestamp: string;
}

export interface HistoricalTrend {
  metric: string;
  values: TrendDataPoint[];
  trend: 'improving' | 'stable' | 'declining';
  seasonality: SeasonalityPattern[];
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  confidence: number;
  context?: string;
}

export interface SeasonalityPattern {
  pattern: string;
  period: number; // hours, days, weeks
  strength: number;
  description: string;
}

export interface AnomalyDetection {
  enabled: boolean;
  algorithms: AnomalyAlgorithm[];
  detectedAnomalies: Anomaly[];
  sensitivity: number;
  falsePositiveRate: number;
}

export interface AnomalyAlgorithm {
  algorithm: string;
  parameters: Record<string, any>;
  accuracy: number;
  falsePositiveRate: number;
  detectionLatency: number;
}

export interface Anomaly {
  id: string;
  type: 'performance' | 'accuracy' | 'behavioral' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  impact: string;
  resolved: boolean;
  resolutionAction?: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold' | 'trend' | 'anomaly' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggerCondition: string;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
  actionRequired: boolean;
  suggestedActions: string[];
}

export interface BenchmarkingResults {
  benchmarks: Benchmark[];
  comparisons: BenchmarkComparison[];
  rankings: BenchmarkRanking[];
  improvements: ImprovementOpportunity[];
}

export interface Benchmark {
  name: string;
  category: string;
  metric: string;
  value: number;
  standardValue: number;
  industryBest: number;
  percentile: number;
  lastUpdated: string;
}

export interface BenchmarkComparison {
  benchmark: string;
  current: number;
  previous: number;
  improvement: number; // percentage
  trend: 'improving' | 'stable' | 'declining';
  significance: 'low' | 'medium' | 'high';
}

export interface BenchmarkRanking {
  metric: string;
  rank: number;
  totalParticipants: number;
  percentile: number;
  category: string;
}

export interface ImprovementOpportunity {
  area: string;
  currentPerformance: number;
  potentialImprovement: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  strategy: string;
  expectedTimeframe: string;
}

// === Model Adaptation ===

export interface ModelAdaptation {
  id: string;
  type: AdaptationType;
  trigger: string;
  timestamp: string;
  beforeMetrics: ModelMetrics;
  afterMetrics: ModelMetrics;
  improvement: number; // percentage
  adaptationDetails: AdaptationDetails;
  userFeedback?: AdaptationFeedback;
  rollbackAvailable: boolean;
}

export type AdaptationType = 
  | 'accuracy_improvement'
  | 'personalization'
  | 'context_adaptation'
  | 'noise_adaptation'
  | 'speed_optimization'
  | 'feature_expansion';

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  responseTime: number;
  confidence: number;
  errorRate: number;
}

export interface AdaptationDetails {
  method: string;
  parameters: Record<string, any>;
  dataUsed: number; // samples
  trainingTime: number; // seconds
  computationalCost: number;
  confidence: number;
}

export interface AdaptationFeedback {
  userSatisfaction: number;
  perceivedImprovement: number;
  issues: string[];
  suggestions: string[];
  timestamp: string;
}

// === Additional Supporting Types ===

export interface TrainingPersonalizationSettings {
  autoAdaptation: boolean;
  feedbackIncorporation: FeedbackIncorporationSettings;
  privacySettings: TrainingPrivacySettings;
  userPreferences: UserTrainingPreferences;
  qualityThresholds: QualityThresholds;
}

export interface FeedbackIncorporationSettings {
  immediate: boolean;
  batch: boolean;
  weightingStrategy: 'equal' | 'recency' | 'confidence' | 'expertise';
  feedbackTypes: FeedbackType[];
}

export interface FeedbackType {
  type: string;
  weight: number;
  processing: 'automatic' | 'manual' | 'hybrid';
  validation: boolean;
}

export interface TrainingPrivacySettings {
  dataRetention: number; // days
  anonymization: boolean;
  localProcessing: boolean;
  dataSharing: 'none' | 'anonymous' | 'aggregated' | 'full';
  consentLevel: 'minimal' | 'standard' | 'comprehensive';
}

export interface UserTrainingPreferences {
  sessionDuration: number; // minutes
  sessionFrequency: 'daily' | 'weekly' | 'on_demand';
  difficultyProgression: 'gradual' | 'adaptive' | 'aggressive';
  focusAreas: string[];
  motivationStyle: 'gamified' | 'progress_tracking' | 'minimal';
}

export interface QualityThresholds {
  minAccuracy: number;
  minConfidence: number;
  maxErrorRate: number;
  minSampleQuality: number;
  dataQualityStandards: DataQualityStandard[];
}

export interface DataQualityStandard {
  aspect: string;
  threshold: number;
  measurement: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrainingPerformanceMetrics {
  overallProgress: OverallProgress;
  skillProgression: SkillProgression[];
  adaptationEffectiveness: AdaptationEffectiveness;
  userEngagement: UserEngagementMetrics;
  systemPerformance: SystemPerformance;
}

export interface OverallProgress {
  completionRate: number;
  improvementRate: number;
  timeToMastery: number; // hours
  difficultyMastered: string[];
  remainingChallenges: string[];
}

export interface SkillProgression {
  skill: string;
  initialLevel: number;
  currentLevel: number;
  targetLevel: number;
  progressRate: number;
  plateauRisk: number;
  interventionNeeded: boolean;
}

export interface AdaptationEffectiveness {
  successRate: number;
  userSatisfactionWithAdaptations: number;
  timeToAdaptation: number; // hours
  adaptationStability: number;
  rollbackRate: number;
}

export interface UserEngagementMetrics {
  sessionCompletionRate: number;
  averageSessionDuration: number;
  motivationLevel: number;
  frustrationLevel: number;
  satisfactionTrend: TrendDataPoint[];
}

export interface SystemPerformance {
  trainingSpeed: number; // samples/hour
  resourceEfficiency: number;
  modelQuality: number;
  scalabilityScore: number;
  reliabilityScore: number;
}

// === Data Types ===

export interface TranscriptionPair {
  audioId: string;
  text: string;
  confidence: number;
  alignments: WordAlignment[];
  speakerId?: string;
  language: string;
  verified: boolean;
}

export interface WordAlignment {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
  phonemes?: PhonemeAlignment[];
}

export interface PhonemeAlignment {
  phoneme: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface ContextualTrainingData {
  context: string;
  samples: string[]; // Audio sample IDs
  weight: number;
  importance: number;
  metadata: Record<string, any>;
}

export interface DataAugmentation {
  originalSampleId: string;
  augmentedSampleId: string;
  technique: string;
  parameters: Record<string, any>;
  qualityImpact: number;
}

export interface DataDiversityMetrics {
  speakerDiversity: number;
  acousticDiversity: number;
  linguisticDiversity: number;
  contextualDiversity: number;
  overallDiversityScore: number;
}

export interface DatasetSize {
  totalSamples: number;
  totalDuration: number; // hours
  totalSpeakers: number;
  storageSize: number; // MB
  processingComplexity: 'low' | 'medium' | 'high';
}

// === API Types ===

export interface TrainingRequest {
  userId: string;
  organizationId: string;
  sessionType: TrainingSessionType;
  configuration?: Partial<TrainingConfiguration>;
  data?: AudioSample[];
  objectives?: TrainingObjective[];
}

export interface TrainingResponse {
  success: boolean;
  sessionId: string;
  status: SessionStatus;
  progress?: TrainingProgress;
  error?: string;
  estimatedCompletion?: string;
}

export interface AdaptationRequest {
  userId: string;
  adaptationType: AdaptationType;
  trigger: string;
  data?: any;
  parameters?: Record<string, any>;
}

export interface AdaptationResponse {
  success: boolean;
  adaptationId: string;
  improvement: number;
  metrics: ModelMetrics;
  details: AdaptationDetails;
  rollbackToken?: string;
}

// Export commonly used types
export type {
  VoiceTrainingSystem as TrainingSystem,
  TrainingSession as Session,
  AdaptationEngine as Adaptation,
  VoiceTrainingProfile as Profile
};