/**
 * Offline Database Schema
 * Defines the local database structure for offline-first governance functionality
 */

export interface OfflineGovernanceSchema {
  meetings: Meeting
  documents: Document
  votes: Vote
  annotations: Annotation
  participants: Participant
  compliance_items: ComplianceItem
  sync_metadata: SyncMetadata
  audit_logs: AuditLog
}

export interface Meeting {
  id: string
  title: string
  description: string
  meeting_date: string
  start_time: string
  end_time: string
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  organization_id: string
  created_by: string
  agenda_items: AgendaItem[]
  participants: string[] // User IDs
  documents: string[] // Document IDs
  votes: string[] // Vote IDs
  meeting_notes: string
  action_items: ActionItem[]
  attendance: AttendanceRecord[]
  location: string
  is_virtual: boolean
  meeting_link?: string
  recording_url?: string
  transcript?: string
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  offline_changes: boolean
  encryption_key?: string
}

export interface AgendaItem {
  id: string
  title: string
  description: string
  presenter: string
  duration_minutes: number
  order_index: number
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  documents: string[]
  votes_required: boolean
  discussion_notes: string
  created_at: string
  updated_at: string
}

export interface ActionItem {
  id: string
  description: string
  assigned_to: string
  due_date: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  notes: string
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  user_id: string
  status: 'present' | 'absent' | 'excused' | 'late'
  joined_at?: string
  left_at?: string
  notes?: string
}

export interface Document {
  id: string
  title: string
  description: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  organization_id: string
  uploaded_by: string
  category: 'board_pack' | 'policy' | 'financial' | 'legal' | 'governance' | 'other'
  tags: string[]
  version: number
  status: 'draft' | 'review' | 'approved' | 'archived'
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  annotations: string[] // Annotation IDs
  download_count: number
  last_accessed: string
  access_permissions: AccessPermission[]
  watermark_applied: boolean
  offline_content?: string // Cached content for offline access
  content_hash: string
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  offline_changes: boolean
  encryption_key?: string
}

export interface AccessPermission {
  user_id: string
  permission: 'read' | 'comment' | 'edit' | 'admin'
  granted_by: string
  granted_at: string
  expires_at?: string
}

export interface Vote {
  id: string
  title: string
  description: string
  meeting_id: string
  agenda_item_id?: string
  organization_id: string
  vote_type: 'resolution' | 'motion' | 'election' | 'advisory' | 'emergency'
  voting_method: 'simple_majority' | 'super_majority' | 'unanimous' | 'plurality'
  required_threshold: number // Percentage required to pass
  status: 'draft' | 'open' | 'closed' | 'passed' | 'failed' | 'tied'
  start_time: string
  end_time: string
  deadline: string
  is_anonymous: boolean
  allow_abstention: boolean
  allow_proxy: boolean
  eligible_voters: string[] // User IDs
  cast_votes: CastVote[]
  proxy_assignments: ProxyAssignment[]
  results: VoteResults
  created_by: string
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  offline_changes: boolean
}

export interface CastVote {
  id: string
  voter_id: string
  vote_choice: 'for' | 'against' | 'abstain'
  is_proxy: boolean
  proxy_for?: string // User ID if voting as proxy
  cast_at: string
  encrypted_ballot?: string
  signature?: string
}

export interface ProxyAssignment {
  assignor_id: string
  assignee_id: string
  scope: 'all' | 'meeting' | 'specific_vote'
  meeting_id?: string
  vote_id?: string
  valid_from: string
  valid_until: string
  created_at: string
}

export interface VoteResults {
  total_eligible: number
  total_cast: number
  for_count: number
  against_count: number
  abstain_count: number
  proxy_count: number
  percentage_for: number
  percentage_against: number
  percentage_abstain: number
  quorum_met: boolean
  result: 'passed' | 'failed' | 'tied' | 'pending'
  calculated_at: string
}

export interface Annotation {
  id: string
  document_id: string
  user_id: string
  page_number: number
  x_coordinate: number
  y_coordinate: number
  width: number
  height: number
  annotation_type: 'highlight' | 'note' | 'comment' | 'signature' | 'stamp'
  content: string
  color: string
  is_private: boolean
  replies: AnnotationReply[]
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  offline_changes: boolean
}

export interface AnnotationReply {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Participant {
  id: string
  user_id: string
  organization_id: string
  role: 'board_member' | 'executive' | 'observer' | 'secretary' | 'legal_counsel' | 'guest'
  title: string
  department: string
  voting_rights: boolean
  proxy_allowed: boolean
  meeting_access_level: 'full' | 'restricted' | 'observer'
  document_access_level: 'full' | 'restricted' | 'none'
  last_active: string
  timezone: string
  preferences: ParticipantPreferences
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
}

export interface ParticipantPreferences {
  email_notifications: boolean
  push_notifications: boolean
  language: string
  theme: 'light' | 'dark' | 'auto'
  accessibility_options: {
    high_contrast: boolean
    large_text: boolean
    screen_reader: boolean
  }
  default_document_view: 'list' | 'grid' | 'timeline'
  auto_download_documents: boolean
}

export interface ComplianceItem {
  id: string
  title: string
  description: string
  category: 'regulatory' | 'internal_policy' | 'audit_requirement' | 'legal_obligation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived'
  assigned_to: string
  organization_id: string
  due_date: string
  completion_date?: string
  evidence_documents: string[] // Document IDs
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  automated_check: boolean
  last_check_date?: string
  next_check_date?: string
  compliance_framework: string
  regulatory_reference: string
  penalty_description: string
  mitigation_steps: string[]
  progress_notes: ComplianceNote[]
  created_at: string
  updated_at: string
  last_synced: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  offline_changes: boolean
}

export interface ComplianceNote {
  id: string
  content: string
  created_by: string
  created_at: string
  attachments: string[]
}

export interface SyncMetadata {
  id: string
  entity_type: keyof OfflineGovernanceSchema
  entity_id: string
  last_server_version: number
  last_local_version: number
  last_sync_timestamp: string
  sync_status: 'synced' | 'pending' | 'conflict' | 'failed'
  conflict_resolution_strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual'
  change_vector: string // For conflict resolution
  retry_count: number
  max_retries: number
  next_retry_at?: string
  error_message?: string
  client_metadata: Record<string, any>
  server_metadata: Record<string, any>
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: 'create' | 'read' | 'update' | 'delete' | 'sync'
  user_id: string
  organization_id: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  changes: Record<string, { from: any; to: any }>
  offline_action: boolean
  sync_timestamp?: string
  compliance_relevant: boolean
  risk_level: 'low' | 'medium' | 'high'
  encrypted_payload?: string
}