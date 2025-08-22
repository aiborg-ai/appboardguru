/**
 * BoardMates Component Types
 * Type definitions for BoardMates pages and components
 */

import { ReactNode, MouseEventHandler, ChangeEventHandler } from 'react'
import type { VaultStatus } from './entities/vault.types'

// Core BoardMates Types
export type BoardMembershipStatus = 'active' | 'inactive' | 'resigned' | 'terminated'
export type BoardType = 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board'
export type BoardStatus = 'active' | 'inactive' | 'dissolved'

export type BoardRole = 
  | 'chairman' 
  | 'vice_chairman' 
  | 'ceo' 
  | 'cfo' 
  | 'cto' 
  | 'independent_director' 
  | 'executive_director' 
  | 'non_executive_director' 
  | 'board_member' 
  | 'board_observer'

export type CommitteeType = 
  | 'audit' 
  | 'compensation' 
  | 'governance' 
  | 'risk' 
  | 'nomination' 
  | 'strategy' 
  | 'technology' 
  | 'investment' 
  | 'ethics' 
  | 'executive' 
  | 'other'

export type CommitteeRole = 'chair' | 'vice_chair' | 'member' | 'secretary' | 'advisor' | 'observer'
export type CommitteeStatus = 'active' | 'inactive' | 'dissolved' | 'temporary'

export type VaultRole = 'owner' | 'admin' | 'moderator' | 'contributor' | 'viewer'
// VaultStatus is defined in entities/vault.types.ts - import from there
export type VaultMemberStatus = 'active' | 'suspended' | 'pending' | 'left'

export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type OrganizationStatus = 'active' | 'suspended' | 'pending_activation'

// BoardMembership Interface
export interface BoardMembership {
  board_id: string
  board_name: string
  board_type: BoardType
  board_status: BoardStatus
  member_role: BoardRole
  member_status: BoardMembershipStatus
  appointed_date: string
  term_start_date?: string
  term_end_date?: string
  is_voting_member: boolean
  attendance_rate?: number
}

// CommitteeMembership Interface
export interface CommitteeMembership {
  committee_id: string
  committee_name: string
  committee_type: CommitteeType
  committee_status: CommitteeStatus
  board_name: string
  member_role: CommitteeRole
  member_status: BoardMembershipStatus
  appointed_date: string
  term_start_date?: string
  term_end_date?: string
  is_voting_member: boolean
  attendance_rate?: number
}

// VaultMembership Interface
export interface VaultMembership {
  vault_id: string
  vault_name: string
  vault_status: VaultStatus
  member_role: VaultRole
  member_status: VaultMemberStatus
  joined_at: string
  last_accessed_at?: string
  access_count: number
}

// Core BoardMate Profile
export interface BoardMateProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  designation?: string
  linkedin_url?: string
  bio?: string
  company?: string
  position?: string
  user_status: UserStatus
  organization_name: string
  organization_logo?: string
  org_role: OrganizationRole
  org_status: OrganizationStatus
  org_joined_at: string
  org_last_accessed?: string
  board_memberships: BoardMembership[]
  committee_memberships: CommitteeMembership[]
  vault_memberships: VaultMembership[]
}

// Component Props
export interface BoardMateCardProps {
  boardmate: BoardMateProfile
  onEdit?: (boardmate: BoardMateProfile) => void
  onMessage?: (boardmate: BoardMateProfile) => void
  onManageAssociations?: (boardmate: BoardMateProfile) => void
  className?: string
  viewMode?: 'grid' | 'list'
}

export interface BoardMatesPageProps {
  initialBoardmates?: BoardMateProfile[]
  organizationId?: string
}

// Filter and Search Types
export interface BoardMateFilters {
  search: string
  status: string
  role: string
  boardType?: string
  committee?: string
}

export interface BoardMateSearchProps {
  filters: BoardMateFilters
  onFiltersChange: (filters: Partial<BoardMateFilters>) => void
  onClearFilters: () => void
  className?: string
}

// Association Management Types
export interface AssociationUpdate {
  type: 'board' | 'committee' | 'vault'
  id: string
  action: 'add' | 'remove' | 'update_role'
  role?: string
  current_role?: string
}

export interface Board {
  id: string
  name: string
  board_type: BoardType
  status: BoardStatus
  description?: string
  created_at?: string
}

export interface Committee {
  id: string
  name: string
  committee_type: CommitteeType
  board_id: string
  board_name: string
  status: CommitteeStatus
  description?: string
  created_at?: string
}

export interface Vault {
  id: string
  name: string
  status: VaultStatus
  description?: string
  meeting_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  member_count?: number
  asset_count?: number
  created_at?: string
}

export interface AssociationManagerProps {
  boardmate: BoardMateProfile
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: AssociationUpdate[]) => Promise<void>
}

// Role Configuration Types
export interface RoleConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export interface RoleOption {
  value: string
  label: string
}

// Status Configuration
export interface StatusConfig {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

// Event Handlers
export interface BoardMateEventHandlers {
  onEdit: (boardmate: BoardMateProfile) => void
  onMessage: (boardmate: BoardMateProfile) => void
  onManageAssociations: (boardmate: BoardMateProfile) => void
  onDelete?: (boardmate: BoardMateProfile) => void
  onActivate?: (boardmate: BoardMateProfile) => void
  onSuspend?: (boardmate: BoardMateProfile) => void
}

// Statistics Types
export interface BoardMateStats {
  total: number
  active: number
  pending: number
  executive: number
  directors: number
}

export interface BoardMateStatsProps {
  stats: BoardMateStats
  onStatClick?: (type: keyof BoardMateStats) => void
  className?: string
}

// Data Loading Types
export interface BoardMateLoadingState {
  boardmates: boolean
  associations: boolean
  stats: boolean
}

export interface BoardMateError {
  message: string
  type: 'load' | 'save' | 'delete' | 'association'
}

// Form Types
export interface BoardMateFormData {
  full_name: string
  email: string
  designation?: string
  linkedin_url?: string
  bio?: string
  company?: string
  position?: string
}

export interface BoardMateFormProps {
  initialData?: Partial<BoardMateFormData>
  onSubmit: (data: BoardMateFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string
}

// Invitation Types
export interface VaultInvitation {
  id: string
  permission_level: VaultRole
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  vault: {
    id: string
    name: string
    organization: {
      id: string
      name: string
    }
  }
  expires_at: string
  created_at: string
}

export interface InvitationProps {
  invitation: VaultInvitation
  onAccept: (id: string) => Promise<boolean>
  onReject: (id: string) => Promise<boolean>
  className?: string
}

// Bulk Actions
export interface BulkAction {
  id: string
  label: string
  icon: ReactNode
  action: (selectedIds: string[]) => Promise<void>
  destructive?: boolean
  disabled?: boolean
}

export interface BulkActionsProps {
  selectedIds: string[]
  actions: BulkAction[]
  onClearSelection: () => void
  className?: string
}

// Export/Import Types
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  fields: string[]
  filters?: BoardMateFilters
}

export interface ImportResult {
  success: number
  errors: Array<{
    row: number
    error: string
  }>
}

// Pagination Types
export interface BoardMatesPagination {
  page: number
  pageSize: number
  total: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedBoardMates {
  boardmates: BoardMateProfile[]
  pagination: BoardMatesPagination
}

// Sort Types
export type SortField = 'name' | 'email' | 'role' | 'status' | 'joined_at' | 'last_accessed'
export type SortOrder = 'asc' | 'desc'

export interface SortOptions {
  field: SortField
  order: SortOrder
}

// API Response Types
export interface BoardMatesApiResponse {
  boardmates: BoardMateProfile[]
  total: number
  page: number
  pageSize: number
}

export interface AssociationApiResponse {
  boards: Board[]
  committees: Committee[]
  vaults: Vault[]
}

export interface UpdateAssociationApiRequest {
  organization_id: string
  updates: AssociationUpdate[]
}

// Premium AI Enhancement Types
export interface AIRecommendationScore {
  overall: number
  skillMatch: number
  culturalFit: number
  diversityContribution: number
  riskMitigation: number
  confidence: number
}

export interface EnhancedBoardMate extends BoardMateProfile {
  ai_score?: AIRecommendationScore
  expertise_profile?: ExpertiseProfile
  network_position?: NetworkPosition
  compliance_status?: ComplianceStatus
  performance_metrics?: PerformanceMetrics
  risk_assessment?: RiskAssessment
}

export interface ExpertiseProfile {
  skills: Skill[]
  industries: string[]
  certifications: Certification[]
  experience_years: number
  board_experience_years: number
  specializations: string[]
  languages: string[]
  education: Education[]
  achievements: Achievement[]
}

export interface Skill {
  id: string
  name: string
  category: 'technical' | 'business' | 'leadership' | 'domain' | 'compliance'
  level: number // 1-10
  verified: boolean
  endorsements: number
  last_validated: string
  certifying_body?: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  issue_date: string
  expiry_date?: string
  credential_id?: string
  verification_url?: string
  status: 'active' | 'expired' | 'pending'
}

export interface Education {
  institution: string
  degree: string
  field_of_study: string
  graduation_year: number
  honors?: string
  gpa?: number
}

export interface Achievement {
  title: string
  description: string
  date: string
  category: 'award' | 'publication' | 'patent' | 'speaking' | 'other'
  verification_url?: string
}

export interface NetworkPosition {
  centrality_score: number
  influence_score: number
  collaboration_count: number
  mentor_relationships: number
  advisory_roles: number
  network_reach: number
}

export interface ComplianceStatus {
  independence_qualified: boolean
  conflict_checks_passed: boolean
  background_verified: boolean
  regulatory_clearances: string[]
  pending_reviews: string[]
  last_compliance_check: string
  compliance_score: number
}

export interface PerformanceMetrics {
  meeting_attendance_rate: number
  contribution_score: number
  decision_influence: number
  collaboration_rating: number
  innovation_index: number
  leadership_effectiveness: number
  stakeholder_feedback: number
}

export interface RiskAssessment {
  overall_risk_score: number
  conflict_risk: number
  reputation_risk: number
  operational_risk: number
  regulatory_risk: number
  mitigation_strategies: string[]
  risk_factors: RiskFactor[]
}

export interface RiskFactor {
  type: 'conflict' | 'reputation' | 'compliance' | 'performance' | 'availability'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  likelihood: number
  impact: number
  mitigation?: string
}

// Team Intelligence Types
export interface TeamIntelligence {
  composition_score: number
  diversity_index: number
  expertise_coverage: number
  collaboration_potential: number
  decision_efficiency: number
  innovation_capacity: number
  risk_tolerance: number
  predicted_performance: PredictedPerformance
}

export interface PredictedPerformance {
  decision_quality: number
  decision_speed: number
  consensus_likelihood: number
  innovation_potential: number
  risk_management: number
  stakeholder_satisfaction: number
}

// Voice Command Types
export interface VoiceCommand {
  command: string
  confidence: number
  intent: 'add_member' | 'remove_member' | 'search_member' | 'analyze_team' | 'get_recommendations'
  parameters: VoiceParameters
  context: VoiceContext
}

export interface VoiceParameters {
  member_name?: string
  skills_required?: string[]
  role_type?: BoardRole
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  constraints?: string[]
  criteria?: string[]
}

export interface VoiceContext {
  vault_id: string
  organization_id: string
  current_members: string[]
  meeting_type?: string
  user_id: string
}

// Real-time Collaboration Types
export interface UserPresence {
  user_id: string
  full_name: string
  avatar_url?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  current_action: 'viewing' | 'editing' | 'analyzing' | 'idle'
  last_seen: string
  cursor_position?: CursorPosition
}

export interface CursorPosition {
  x: number
  y: number
  element_id?: string
  selection?: Selection
}

export interface Selection {
  member_id: string
  action_type: 'selecting' | 'editing' | 'analyzing'
  timestamp: string
}

// Analytics Dashboard Types
export interface AnalyticsDashboard {
  team_composition: TeamCompositionAnalytics
  performance_trends: PerformanceTrends
  risk_monitoring: RiskMonitoring
  compliance_tracking: ComplianceTracking
  predictive_insights: PredictiveInsights
}

export interface TeamCompositionAnalytics {
  diversity_metrics: DiversityMetrics
  skill_distribution: SkillDistribution
  experience_matrix: ExperienceMatrix
  network_analysis: NetworkAnalysis
}

export interface DiversityMetrics {
  gender_balance: number
  age_distribution: AgeDistribution
  ethnic_diversity: number
  geographic_spread: number
  educational_diversity: number
  industry_background: IndustryDistribution
}

export interface AgeDistribution {
  under_40: number
  '40-50': number
  '50-60': number
  over_60: number
  average_age: number
}

export interface IndustryDistribution {
  [industry: string]: number
}

export interface SkillDistribution {
  technical: number
  business: number
  leadership: number
  compliance: number
  domain_specific: number
  gaps: string[]
  overlaps: string[]
}

export interface ExperienceMatrix {
  board_experience: ExperienceLevel[]
  industry_experience: ExperienceLevel[]
  functional_experience: ExperienceLevel[]
}

export interface ExperienceLevel {
  category: string
  junior: number
  mid: number
  senior: number
  expert: number
}

export interface NetworkAnalysis {
  internal_connections: number
  external_network_value: number
  influence_paths: InfluencePath[]
  collaboration_clusters: CollaborationCluster[]
}

export interface InfluencePath {
  from_member: string
  to_member: string
  influence_score: number
  relationship_type: string
}

export interface CollaborationCluster {
  members: string[]
  cohesion_score: number
  performance_score: number
}

// Advanced Search Types
export interface AdvancedSearchCriteria {
  basic_filters: BoardMateFilters
  expertise_filters: ExpertiseFilters
  performance_filters: PerformanceFilters
  network_filters: NetworkFilters
  ai_criteria: AICriteria
}

export interface ExpertiseFilters {
  required_skills?: string[]
  skill_levels?: { [skill: string]: number }
  industries?: string[]
  certifications?: string[]
  experience_range?: { min: number; max: number }
  languages?: string[]
}

export interface PerformanceFilters {
  min_attendance_rate?: number
  min_contribution_score?: number
  min_collaboration_rating?: number
  performance_trends?: 'improving' | 'stable' | 'declining'
}

export interface NetworkFilters {
  min_centrality_score?: number
  min_influence_score?: number
  connection_types?: string[]
  network_reach?: number
}

export interface AICriteria {
  team_chemistry_optimization?: boolean
  diversity_enhancement?: boolean
  skill_gap_filling?: boolean
  risk_mitigation?: boolean
  performance_prediction?: boolean
}

// Scenario Planning Types
export interface BoardScenario {
  id: string
  name: string
  description: string
  members: EnhancedBoardMate[]
  predicted_metrics: TeamIntelligence
  created_by: string
  created_at: string
  tags: string[]
  status: 'draft' | 'active' | 'archived'
}

export interface ScenarioComparison {
  scenarios: BoardScenario[]
  comparison_metrics: ComparisonMetrics
  recommendations: ScenarioRecommendation[]
}

export interface ComparisonMetrics {
  [scenario_id: string]: {
    strengths: string[]
    weaknesses: string[]
    risks: string[]
    opportunities: string[]
    overall_score: number
  }
}

export interface ScenarioRecommendation {
  scenario_id: string
  recommendation_type: 'optimal' | 'balanced' | 'risk_averse' | 'innovative'
  rationale: string
  confidence: number
}

// Blockchain Audit Types
export interface BlockchainAuditEntry {
  transaction_hash: string
  block_number: number
  timestamp: string
  action_type: 'member_added' | 'member_removed' | 'role_changed' | 'access_granted' | 'access_revoked'
  member_id: string
  performed_by: string
  details: AuditDetails
  verification_status: 'verified' | 'pending' | 'failed'
}

export interface AuditDetails {
  old_value?: any
  new_value?: any
  reason?: string
  approval_required?: boolean
  approver_id?: string
  compliance_check?: ComplianceCheckResult
}

export interface ComplianceCheckResult {
  passed: boolean
  checks_performed: string[]
  violations?: string[]
  risk_score: number
}