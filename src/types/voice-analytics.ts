/**
 * Voice Analytics Types
 * Comprehensive analytics and insights for voice usage patterns
 */

// === Core Analytics Types ===

export interface VoiceAnalyticsDashboard {
  userId: string;
  organizationId: string;
  timeRange: AnalyticsTimeRange;
  usageMetrics: VoiceUsageMetrics;
  effectivenessMetrics: EffectivenessMetrics;
  participationMetrics: ParticipationMetrics;
  commandAnalytics: CommandAnalytics;
  interactionPatterns: InteractionPattern[];
  performanceInsights: PerformanceInsight[];
  reportGeneration: ReportConfiguration;
  generatedAt: string;
}

export interface AnalyticsTimeRange {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  timezone: string;
}

// === Voice Usage Metrics ===

export interface VoiceUsageMetrics {
  totalUsageTime: number; // minutes
  sessionsCount: number;
  averageSessionDuration: number; // minutes
  dailyUsagePattern: DailyUsagePattern[];
  featureUsage: FeatureUsageBreakdown;
  peakUsageHours: number[];
  deviceUsageBreakdown: DeviceUsageStats[];
  qualityMetrics: VoiceQualityStats;
}

export interface DailyUsagePattern {
  date: string;
  totalMinutes: number;
  sessionsCount: number;
  peakHour: number;
  primaryFeatures: string[];
}

export interface FeatureUsageBreakdown {
  voiceCommands: FeatureUsageDetail;
  voiceTranscription: FeatureUsageDetail;
  voiceAuthentication: FeatureUsageDetail;
  voiceTranslation: FeatureUsageDetail;
  voiceAnnotations: FeatureUsageDetail;
  voiceScheduling: FeatureUsageDetail;
  voiceDocGeneration: FeatureUsageDetail;
}

export interface FeatureUsageDetail {
  totalUses: number;
  successRate: number; // percentage
  averageProcessingTime: number; // milliseconds
  userSatisfactionScore: number; // 1-5
  errorCount: number;
  popularityTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface DeviceUsageStats {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'smart_speaker' | 'headset';
  browser?: string;
  os?: string;
  usageCount: number;
  averageQuality: number; // 1-5
  successRate: number;
  preferenceScore: number;
}

export interface VoiceQualityStats {
  averageRecordingQuality: number; // 1-5
  signalToNoiseRatio: number;
  backgroundNoiseLevel: number;
  clarityScore: number;
  compressionImpact: number;
  environmentalFactors: EnvironmentalImpact[];
}

export interface EnvironmentalImpact {
  factor: 'background_noise' | 'echo' | 'interference' | 'distance' | 'room_acoustics';
  impact: 'low' | 'medium' | 'high';
  frequency: number;
  suggestions: string[];
}

// === Effectiveness Metrics ===

export interface EffectivenessMetrics {
  overallEffectiveness: number; // percentage
  taskCompletionRate: number;
  timeToCompletion: TaskTimingMetrics;
  accuracyMetrics: AccuracyMetrics;
  userSatisfaction: SatisfactionMetrics;
  productivityImpact: ProductivityMetrics;
  learningCurve: LearningCurveData;
}

export interface TaskTimingMetrics {
  voiceVsTraditional: ComparisonMetric;
  averageCommandTime: number; // milliseconds
  averageTranscriptionTime: number;
  averageAuthenticationTime: number;
  timeVarianceByComplexity: TimeComplexityMapping[];
}

export interface ComparisonMetric {
  voiceMethod: number;
  traditionalMethod: number;
  improvementPercentage: number;
  confidence: number;
}

export interface TimeComplexityMapping {
  complexity: 'simple' | 'medium' | 'complex';
  averageTime: number;
  standardDeviation: number;
  successRate: number;
}

export interface AccuracyMetrics {
  speechRecognitionAccuracy: number; // percentage
  commandRecognitionAccuracy: number;
  intentRecognitionAccuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  contextualAccuracy: number;
  errorCategories: ErrorCategoryStats[];
}

export interface ErrorCategoryStats {
  category: 'pronunciation' | 'background_noise' | 'accent' | 'technical' | 'context' | 'grammar';
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  resolutionRate: number;
  averageResolutionTime: number;
}

export interface SatisfactionMetrics {
  overallSatisfaction: number; // 1-5
  easeOfUse: number;
  reliability: number;
  featureSatisfaction: Record<string, number>;
  npsScore: number;
  churnRisk: 'low' | 'medium' | 'high';
  satisfactionTrend: TrendData[];
}

export interface TrendData {
  period: string;
  value: number;
  changeFromPrevious: number;
}

export interface ProductivityMetrics {
  tasksCompletedPerHour: number;
  multitaskingEfficiency: number;
  cognitiveLoadReduction: number; // percentage
  stressLevelImpact: number;
  workflowIntegrationScore: number;
  roiEstimate: ROICalculation;
}

export interface ROICalculation {
  timeSaved: number; // hours per month
  costSavings: number; // currency
  productivityGain: number; // percentage
  trainingCostOffset: number;
  netBenefit: number;
  paybackPeriod: number; // months
}

export interface LearningCurveData {
  onboardingTime: number; // days
  proficiencyMilestones: ProficiencyMilestone[];
  skillProgression: SkillProgression[];
  adaptationRate: number;
  plateauPoints: PlateauPoint[];
}

export interface ProficiencyMilestone {
  milestone: string;
  averageTimeToReach: number; // days
  successRate: number;
  requiredPracticeTime: number; // hours
}

export interface SkillProgression {
  skill: string;
  initialScore: number;
  currentScore: number;
  targetScore: number;
  progressionRate: number; // per week
  practiceRecommendations: string[];
}

export interface PlateauPoint {
  skill: string;
  plateauLevel: number;
  durationDays: number;
  breakThroughStrategies: string[];
}

// === Participation Metrics ===

export interface ParticipationMetrics {
  meetingParticipation: MeetingParticipationData;
  collaborationPatterns: CollaborationPattern[];
  speakingDynamics: SpeakingDynamics;
  engagementLevels: EngagementMetrics;
  boardDynamicsInsights: BoardDynamicsInsight[];
}

export interface MeetingParticipationData {
  averageSpeakingTime: number; // minutes
  participationRatio: number; // percentage of meeting time
  interruptionPatterns: InterruptionPattern[];
  questionFrequency: number;
  contributionTypes: ContributionType[];
  influenceMetrics: InfluenceMetrics;
}

export interface InterruptionPattern {
  type: 'constructive' | 'disruptive' | 'clarifying' | 'supportive';
  frequency: number;
  timing: 'early' | 'middle' | 'late';
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ContributionType {
  type: 'proposal' | 'question' | 'clarification' | 'support' | 'objection' | 'data_point';
  count: number;
  averageLength: number; // words
  receptionScore: number; // 1-5
}

export interface InfluenceMetrics {
  decisionInfluence: number; // percentage
  topicInitiation: number;
  discussionDirection: number;
  consensusBuilding: number;
  leadershipIndicators: LeadershipIndicator[];
}

export interface LeadershipIndicator {
  indicator: string;
  score: number;
  evidence: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface CollaborationPattern {
  pattern: 'facilitator' | 'contributor' | 'supporter' | 'challenger' | 'synthesizer';
  strength: number; // 1-5
  frequency: number;
  effectiveness: number;
  contextualFactors: string[];
}

export interface SpeakingDynamics {
  speechRate: SpeechRateAnalysis;
  volumePatterns: VolumePattern[];
  pauseAnalysis: PauseAnalysis;
  emotionalDynamics: EmotionalDynamics;
  rhetoricalPatterns: RhetoricalPattern[];
}

export interface SpeechRateAnalysis {
  averageWordsPerMinute: number;
  variability: number;
  adaptationToContext: number;
  optimalRateRange: [number, number];
  rateVsComprehension: ComprehensionCorrelation;
}

export interface ComprehensionCorrelation {
  correlation: number; // -1 to 1
  optimalRange: [number, number];
  contextFactors: string[];
}

export interface VolumePattern {
  context: string;
  averageVolume: number;
  variability: number;
  appropriateness: number; // 1-5
  adaptability: number;
}

export interface PauseAnalysis {
  strategicPauses: number;
  fillerWords: FillerWordAnalysis;
  thoughtPauses: number;
  emphasisPauses: number;
  pauseEffectiveness: number; // 1-5
}

export interface FillerWordAnalysis {
  totalCount: number;
  typesUsed: Record<string, number>;
  frequency: number; // per minute
  contextualAppropriate: number;
  reductionOpportunities: string[];
}

export interface EmotionalDynamics {
  emotionalRange: number;
  emotionalIntelligence: number;
  stressManagement: number;
  enthusaismLevels: EmotionLevel[];
  emotionalContagion: number;
}

export interface EmotionLevel {
  emotion: string;
  averageLevel: number;
  variability: number;
  contextualAppropriateness: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface RhetoricalPattern {
  pattern: 'storytelling' | 'data_driven' | 'emotional_appeal' | 'logical_progression' | 'comparative';
  frequency: number;
  effectiveness: number;
  audienceReception: number;
  contexts: string[];
}

export interface EngagementMetrics {
  overallEngagement: number; // 1-5
  attentionSpan: number; // minutes
  responsiveness: number;
  proactiveParticipation: number;
  qualityOfContributions: number;
  engagementTriggers: EngagementTrigger[];
}

export interface EngagementTrigger {
  trigger: string;
  impact: number;
  frequency: number;
  effectiveness: number;
  optimization: string[];
}

export interface BoardDynamicsInsight {
  insight: string;
  category: 'communication' | 'leadership' | 'collaboration' | 'decision_making' | 'culture';
  significance: 'low' | 'medium' | 'high';
  evidence: Evidence[];
  recommendations: string[];
  trend: TrendData[];
}

export interface Evidence {
  type: 'behavioral' | 'statistical' | 'linguistic' | 'temporal';
  description: string;
  confidence: number;
  dataPoints: string[];
}

// === Command Analytics ===

export interface CommandAnalytics {
  commandUsageStats: CommandUsageStats;
  popularCommands: PopularCommand[];
  commandSuccessRates: CommandSuccessRate[];
  learningPatterns: CommandLearningPattern[];
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface CommandUsageStats {
  totalCommands: number;
  uniqueCommands: number;
  averageCommandsPerSession: number;
  commandCategories: CommandCategoryStats[];
  complexityDistribution: ComplexityDistribution;
}

export interface CommandCategoryStats {
  category: 'navigation' | 'data_entry' | 'analysis' | 'communication' | 'utility' | 'custom';
  usage: number;
  successRate: number;
  averageTime: number;
  userSatisfaction: number;
}

export interface ComplexityDistribution {
  simple: number; // percentage
  medium: number;
  complex: number;
  averageComplexity: number;
}

export interface PopularCommand {
  command: string;
  usage: number;
  successRate: number;
  averageExecutionTime: number;
  userRating: number;
  variants: string[];
  contexts: string[];
}

export interface CommandSuccessRate {
  command: string;
  successRate: number;
  failureReasons: FailureReason[];
  improvementSuggestions: string[];
  userFeedback: UserFeedback[];
}

export interface FailureReason {
  reason: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  resolutionTime: number;
  preventable: boolean;
}

export interface UserFeedback {
  rating: number; // 1-5
  comment: string;
  suggestion: string;
  category: 'feature' | 'performance' | 'usability' | 'accuracy';
}

export interface CommandLearningPattern {
  user: string;
  commandMastery: CommandMastery[];
  learningSpeed: number;
  retentionRate: number;
  transferLearning: number; // ability to apply learned patterns to new commands
}

export interface CommandMastery {
  command: string;
  masteryLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  timeToMastery: number; // days
  practiceFrequency: number;
  errorReduction: number;
}

export interface OptimizationOpportunity {
  type: 'command_simplification' | 'workflow_optimization' | 'training_focus' | 'ui_improvement';
  description: string;
  potentialImpact: 'low' | 'medium' | 'high';
  implementationEffort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  priority: number;
}

// === Performance Insights ===

export interface PerformanceInsight {
  id: string;
  category: 'usage' | 'efficiency' | 'satisfaction' | 'technical' | 'behavioral';
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  dataSource: string[];
  metrics: InsightMetric[];
  trends: TrendData[];
  recommendations: Recommendation[];
  actionItems: ActionItem[];
  estimatedImpact: Impact;
  generatedAt: string;
}

export interface InsightMetric {
  name: string;
  value: number;
  unit: string;
  benchmark?: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

export interface Recommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedOutcome: string;
  implementationEffort: 'low' | 'medium' | 'high';
  successMetrics: string[];
  dependencies: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
}

export interface Impact {
  timeframe: 'immediate' | 'short_term' | 'long_term';
  scope: 'individual' | 'team' | 'organization';
  categories: ImpactCategory[];
  overallScore: number; // 1-5
}

export interface ImpactCategory {
  category: 'productivity' | 'satisfaction' | 'cost' | 'quality' | 'adoption';
  impact: number; // 1-5
  confidence: number; // percentage
  description: string;
}

// === Report Configuration ===

export interface ReportConfiguration {
  reportType: 'summary' | 'detailed' | 'executive' | 'technical';
  includeComparisons: boolean;
  includePredictions: boolean;
  includeRecommendations: boolean;
  customizations: ReportCustomization[];
  exportFormats: ExportFormat[];
  scheduledDelivery?: ScheduledDelivery;
}

export interface ReportCustomization {
  section: string;
  visible: boolean;
  priority: number;
  customizations: Record<string, any>;
}

export interface ExportFormat {
  format: 'pdf' | 'xlsx' | 'csv' | 'json' | 'html';
  template: string;
  includedSections: string[];
  styling?: StylingOptions;
}

export interface StylingOptions {
  theme: 'professional' | 'executive' | 'technical' | 'minimal';
  colors: string[];
  fonts: string[];
  logoUrl?: string;
  headerFooter: boolean;
}

export interface ScheduledDelivery {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day?: number; // for monthly/quarterly
  time: string; // HH:MM
  recipients: string[];
  format: ExportFormat;
  conditions: DeliveryCondition[];
}

export interface DeliveryCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'changed_by';
  value: number;
  action: 'send' | 'skip' | 'highlight';
}

// === Historical Data ===

export interface VoiceAnalyticsHistory {
  userId: string;
  organizationId: string;
  dataPoints: HistoricalDataPoint[];
  aggregationLevel: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retentionPeriod: number; // days
  compressionSettings: CompressionSettings;
}

export interface HistoricalDataPoint {
  timestamp: string;
  metrics: Record<string, number>;
  events: AnalyticsEvent[];
  context: ContextualData;
}

export interface AnalyticsEvent {
  type: string;
  description: string;
  impact: number;
  metadata: Record<string, any>;
}

export interface ContextualData {
  sessionId?: string;
  deviceInfo?: string;
  location?: string;
  meetingId?: string;
  participantCount?: number;
}

export interface CompressionSettings {
  enabled: boolean;
  algorithm: 'lossless' | 'lossy_low' | 'lossy_medium' | 'lossy_high';
  retainFullDetail: number; // days
  aggregateAfter: number; // days
}

// === Interaction Patterns ===

export interface InteractionPattern {
  id: string;
  pattern: 'sequential' | 'multi_modal' | 'context_switching' | 'error_recovery' | 'learning';
  frequency: number;
  effectiveness: number;
  userTypes: string[];
  contexts: string[];
  variations: PatternVariation[];
  optimization: PatternOptimization;
}

export interface PatternVariation {
  variation: string;
  frequency: number;
  effectiveness: number;
  conditions: string[];
}

export interface PatternOptimization {
  opportunities: string[];
  recommendations: string[];
  expectedImprovement: number; // percentage
  implementationComplexity: 'low' | 'medium' | 'high';
}

// === API Types ===

export interface VoiceAnalyticsRequest {
  userId?: string;
  organizationId: string;
  timeRange: AnalyticsTimeRange;
  metrics: string[];
  filters?: AnalyticsFilter[];
  aggregation?: AggregationOptions;
}

export interface AnalyticsFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export interface AggregationOptions {
  groupBy?: string[];
  functions: AggregationFunction[];
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface AggregationFunction {
  metric: string;
  function: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'percentile';
  parameters?: Record<string, any>;
}

export interface VoiceAnalyticsResponse {
  success: boolean;
  data: VoiceAnalyticsDashboard;
  metadata: ResponseMetadata;
  error?: string;
}

export interface ResponseMetadata {
  generatedAt: string;
  processingTime: number; // milliseconds
  dataPoints: number;
  cacheHit: boolean;
  version: string;
}