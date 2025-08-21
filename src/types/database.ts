// ============================================================================
// BRANDED TYPES FOR TYPE SAFETY
// ============================================================================

declare const __brand: unique symbol;

type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type VaultId = Brand<string, 'VaultId'>;
export type BoardId = Brand<string, 'BoardId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type TemplateId = Brand<string, 'TemplateId'>;
export type EventId = Brand<string, 'EventId'>;

// ============================================================================
// CORE INTERFACE DEFINITIONS
// ============================================================================

export interface OrganizationSettings {
  readonly theme?: 'light' | 'dark' | 'auto';
  readonly timezone?: string;
  readonly language?: string;
  readonly notifications?: {
    readonly email: boolean;
    readonly push: boolean;
    readonly inApp: boolean;
  };
  readonly features?: {
    readonly voiceChat: boolean;
    readonly boardmates: boolean;
    readonly calendar: boolean;
    readonly compliance: boolean;
  };
}

export interface ComplianceSettings {
  readonly dataRetentionDays?: number;
  readonly requireTwoFactor?: boolean;
  readonly allowedIpRanges?: readonly string[];
  readonly auditLevel?: 'basic' | 'detailed' | 'comprehensive';
  readonly encryptionLevel?: 'standard' | 'enhanced';
  readonly accessLogging?: boolean;
  readonly complianceStandards?: readonly ('SOX' | 'GDPR' | 'HIPAA' | 'ISO27001')[];
}

export interface BillingSettings {
  readonly plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  readonly subscriptionId?: string;
  readonly billingCycle?: 'monthly' | 'yearly';
  readonly paymentMethod?: {
    readonly type: 'credit_card' | 'bank_transfer' | 'invoice';
    readonly lastFour?: string;
    readonly expiryMonth?: number;
    readonly expiryYear?: number;
  };
  readonly limits?: {
    readonly maxUsers: number;
    readonly maxStorage: number;
    readonly maxAssets: number;
  };
}

export interface CustomPermissions {
  readonly canCreateBoards?: boolean;
  readonly canManageAssets?: boolean;
  readonly canAccessReports?: boolean;
  readonly canManageUsers?: boolean;
  readonly canViewAuditLogs?: boolean;
  readonly customRoles?: readonly string[];
}

export interface AssetMetadata {
  readonly fileSize?: number;
  readonly dimensions?: {
    readonly width: number;
    readonly height: number;
  };
  readonly duration?: number;
  readonly format?: string;
  readonly encoding?: string;
  readonly checksum?: string;
  readonly tags?: readonly string[];
  readonly customFields?: Record<string, unknown>;
}

export interface ActivityDetails {
  readonly action: string;
  readonly resource?: string;
  readonly resourceId?: string;
  readonly changes?: Record<string, unknown>;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
  readonly category?: 'auth' | 'data' | 'security' | 'system' | 'user';
}

export interface GeolocationInfo {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy?: number;
  readonly city?: string;
  readonly region?: string;
  readonly country?: string;
  readonly timezone?: string;
}

export interface RequestHeaders {
  readonly userAgent?: string;
  readonly referer?: string;
  readonly acceptLanguage?: string;
  readonly xForwardedFor?: string;
  readonly xRealIp?: string;
  readonly authorization?: string;
}

export interface ContentPosition {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly page?: number;
  readonly layer?: number;
}

export interface BoardSettings {
  readonly isPublic?: boolean;
  readonly allowComments?: boolean;
  readonly requireApproval?: boolean;
  readonly maxMembers?: number;
  readonly permissions?: {
    readonly view: readonly string[];
    readonly edit: readonly string[];
    readonly admin: readonly string[];
  };
}

export interface VaultSettings {
  readonly encryptionEnabled?: boolean;
  readonly accessLevel?: 'private' | 'organization' | 'public';
  readonly autoArchive?: boolean;
  readonly retentionDays?: number;
  readonly allowDownloads?: boolean;
  readonly watermarkEnabled?: boolean;
}

export interface MemberSettings {
  readonly notifications?: {
    readonly email: boolean;
    readonly push: boolean;
    readonly mentions: boolean;
  };
  readonly privacy?: {
    readonly showActivity: boolean;
    readonly showPresence: boolean;
  };
}

export interface EmailTemplateData {
  readonly subject: string;
  readonly body: string;
  readonly variables?: Record<string, string>;
  readonly styling?: {
    readonly theme: 'light' | 'dark';
    readonly brandColors?: {
      readonly primary: string;
      readonly secondary: string;
    };
  };
}

export interface NotificationResponseData {
  readonly action?: string;
  readonly acknowledged?: boolean;
  readonly responseTime?: number;
  readonly deviceInfo?: {
    readonly platform: string;
    readonly version: string;
  };
}

export interface EventMetadata {
  readonly category?: string;
  readonly priority?: 'low' | 'medium' | 'high' | 'urgent';
  readonly attendees?: readonly string[];
  readonly resources?: readonly string[];
  readonly location?: string;
  readonly isVirtual?: boolean;
  readonly meetingLink?: string;
}

export interface RecurrenceRule {
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  readonly interval?: number;
  readonly endDate?: string;
  readonly occurrences?: number;
  readonly daysOfWeek?: readonly number[];
  readonly dayOfMonth?: number;
  readonly exceptions?: readonly string[];
}

export interface EquityCompensation {
  readonly stockOptions?: number;
  readonly vestingSchedule?: {
    readonly totalShares: number;
    readonly vestedShares: number;
    readonly vestingStart: string;
    readonly cliffMonths: number;
    readonly vestingMonths: number;
  };
  readonly equityPercentage?: number;
}

export interface MemberSkills {
  readonly technical?: readonly string[];
  readonly soft?: readonly string[];
  readonly certifications?: readonly {
    readonly name: string;
    readonly issuer: string;
    readonly dateObtained: string;
    readonly expiryDate?: string;
  }[];
  readonly languages?: readonly {
    readonly language: string;
    readonly proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  }[];
}

export interface PatternData {
  readonly pattern: string;
  readonly confidence: number;
  readonly frequency: number;
  readonly timeRange?: {
    readonly start: string;
    readonly end: string;
  };
}

export interface AnalyticsConditions {
  readonly filters?: Record<string, unknown>;
  readonly dateRange?: {
    readonly start: string;
    readonly end: string;
  };
  readonly groupBy?: readonly string[];
  readonly threshold?: number;
}

export interface AnalyticsOutcomes {
  readonly metrics: Record<string, number>;
  readonly trends: Record<string, 'up' | 'down' | 'stable'>;
  readonly recommendations?: readonly string[];
  readonly insights?: readonly string[];
}

export interface PercentileData {
  readonly percentile: number;
  readonly value: number;
  readonly rank?: number;
  readonly totalCount?: number;
}

export interface ConfidenceInterval {
  readonly lower: number;
  readonly upper: number;
  readonly confidence: number;
}

export interface PredictionData {
  readonly prediction: number;
  readonly confidence: number;
  readonly factors?: Record<string, number>;
  readonly timeHorizon?: string;
  readonly methodology?: string;
}

export interface MLConfiguration {
  readonly algorithm?: string;
  readonly parameters?: Record<string, unknown>;
  readonly trainingData?: {
    readonly size: number;
    readonly features: readonly string[];
  };
  readonly hyperparameters?: Record<string, unknown>;
}

export interface AnomalyData {
  readonly baseline: Record<string, number>;
  readonly anomalous: Record<string, number>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly deviation: number;
}

export interface ModelParameters {
  readonly version?: string;
  readonly algorithm?: string;
  readonly hyperparameters?: Record<string, unknown>;
  readonly performance?: {
    readonly accuracy?: number;
    readonly precision?: number;
    readonly recall?: number;
    readonly f1Score?: number;
  };
}

export interface ExternalReferences {
  readonly apiEndpoints?: readonly string[];
  readonly documentIds?: readonly string[];
  readonly relatedEntities?: Record<string, string>;
  readonly externalIds?: Record<string, string>;
}

export interface WorkflowSteps {
  readonly steps: readonly {
    readonly id: string;
    readonly name: string;
    readonly type: 'manual' | 'automated' | 'conditional';
    readonly conditions?: Record<string, unknown>;
    readonly actions?: readonly string[];
    readonly order: number;
  }[];
  readonly parallel?: boolean;
  readonly failureStrategy?: 'stop' | 'continue' | 'retry';
}

export interface ReminderSchedule {
  readonly reminders: readonly {
    readonly offset: number;
    readonly unit: 'minutes' | 'hours' | 'days' | 'weeks';
    readonly message?: string;
    readonly channels?: readonly ('email' | 'push' | 'sms')[];
  }[];
  readonly timezone?: string;
}

export interface EscalationRules {
  readonly levels: readonly {
    readonly level: number;
    readonly delay: number;
    readonly assignees?: readonly string[];
    readonly actions?: readonly string[];
  }[];
  readonly maxLevel?: number;
  readonly autoEscalate?: boolean;
}

export interface MeetingSettings {
  readonly allowRecording?: boolean;
  readonly requirePasscode?: boolean;
  readonly waitingRoom?: boolean;
  readonly autoRecord?: boolean;
  readonly muteOnEntry?: boolean;
  readonly allowScreenShare?: boolean;
  readonly maxParticipants?: number;
  readonly recordingSettings?: {
    readonly autoStart: boolean;
    readonly cloudStorage: boolean;
    readonly localStorage: boolean;
  };
}

export interface CommitteeSettings {
  readonly meetingQuorum?: number;
  readonly votingRules?: {
    readonly majorityRequired: number;
    readonly allowAbstention: boolean;
    readonly requireUnanimous: boolean;
  };
  readonly reportingRequirements?: {
    readonly frequency: 'monthly' | 'quarterly' | 'annually';
    readonly recipients: readonly string[];
  };
  readonly decisionAuthority?: {
    readonly budgetLimit?: number;
    readonly requiresBoardApproval?: boolean;
  };
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'pending' | 'director' | 'admin' | 'viewer'
          status: 'pending' | 'approved' | 'rejected'
          company: string | null
          position: string | null
          designation: string | null
          linkedin_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          approved_by: string | null
          approved_at: string | null
          password_set: boolean | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'pending' | 'director' | 'admin' | 'viewer'
          status?: 'pending' | 'approved' | 'rejected'
          company?: string | null
          position?: string | null
          designation?: string | null
          linkedin_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
          password_set?: boolean | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'pending' | 'director' | 'admin' | 'viewer'
          status?: 'pending' | 'approved' | 'rejected'
          company?: string | null
          position?: string | null
          designation?: string | null
          linkedin_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
          password_set?: boolean | null
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website: string | null
          industry: string | null
          organization_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          created_by: string
          created_at: string
          updated_at: string
          is_active: boolean
          deleted_at: string | null
          deletion_scheduled_for: string | null
          settings: OrganizationSettings
          compliance_settings: ComplianceSettings
          billing_settings: BillingSettings
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          organization_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          created_by: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          settings?: OrganizationSettings
          compliance_settings?: ComplianceSettings
          billing_settings?: BillingSettings
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          organization_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          created_by?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          settings?: OrganizationSettings
          compliance_settings?: ComplianceSettings
          billing_settings?: BillingSettings
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          custom_permissions: CustomPermissions
          invited_by: string | null
          approved_by: string | null
          joined_at: string
          last_accessed: string
          access_count: number
          status: 'active' | 'suspended' | 'pending_activation'
          is_primary: boolean
          receive_notifications: boolean
          invitation_accepted_ip: string | null
          last_login_ip: string | null
          suspicious_activity_count: number
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          custom_permissions?: CustomPermissions
          invited_by?: string | null
          approved_by?: string | null
          joined_at?: string
          last_accessed?: string
          access_count?: number
          status?: 'active' | 'suspended' | 'pending_activation'
          is_primary?: boolean
          receive_notifications?: boolean
          invitation_accepted_ip?: string | null
          last_login_ip?: string | null
          suspicious_activity_count?: number
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          custom_permissions?: CustomPermissions
          invited_by?: string | null
          approved_by?: string | null
          joined_at?: string
          last_accessed?: string
          access_count?: number
          status?: 'active' | 'suspended' | 'pending_activation'
          is_primary?: boolean
          receive_notifications?: boolean
          invitation_accepted_ip?: string | null
          last_login_ip?: string | null
          suspicious_activity_count?: number
        }
      }
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invitation_token: string
          email_verification_code: string
          created_at: string
          token_expires_at: string
          accepted_at: string | null
          invited_by: string
          accepted_by: string | null
          personal_message: string | null
          status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
          attempt_count: number
          max_attempts: number
          created_ip: string | null
          accepted_ip: string | null
          device_fingerprint: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invitation_token?: string
          email_verification_code?: string
          created_at?: string
          token_expires_at?: string
          accepted_at?: string | null
          invited_by: string
          accepted_by?: string | null
          personal_message?: string | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
          attempt_count?: number
          max_attempts?: number
          created_ip?: string | null
          accepted_ip?: string | null
          device_fingerprint?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invitation_token?: string
          email_verification_code?: string
          created_at?: string
          token_expires_at?: string
          accepted_at?: string | null
          invited_by?: string
          accepted_by?: string | null
          personal_message?: string | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
          attempt_count?: number
          max_attempts?: number
          created_ip?: string | null
          accepted_ip?: string | null
          device_fingerprint?: string | null
        }
      }
      organization_features: {
        Row: {
          organization_id: string
          ai_summarization: boolean
          advanced_permissions: boolean
          sso_enabled: boolean
          audit_logs: boolean
          api_access: boolean
          white_label: boolean
          max_board_packs: number
          max_file_size_mb: number
          max_storage_gb: number
          current_board_packs: number
          current_storage_gb: number
          plan_type: 'free' | 'professional' | 'enterprise'
          subscription_ends_at: string | null
          updated_at: string
        }
        Insert: {
          organization_id: string
          ai_summarization?: boolean
          advanced_permissions?: boolean
          sso_enabled?: boolean
          audit_logs?: boolean
          api_access?: boolean
          white_label?: boolean
          max_board_packs?: number
          max_file_size_mb?: number
          max_storage_gb?: number
          current_board_packs?: number
          current_storage_gb?: number
          plan_type?: 'free' | 'professional' | 'enterprise'
          subscription_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          organization_id?: string
          ai_summarization?: boolean
          advanced_permissions?: boolean
          sso_enabled?: boolean
          audit_logs?: boolean
          api_access?: boolean
          white_label?: boolean
          max_board_packs?: number
          max_file_size_mb?: number
          max_storage_gb?: number
          current_board_packs?: number
          current_storage_gb?: number
          plan_type?: 'free' | 'professional' | 'enterprise'
          subscription_ends_at?: string | null
          updated_at?: string
        }
      }
      board_packs: {
        Row: {
          id: string
          title: string
          description: string | null
          file_path: string
          file_name: string
          file_size: number
          file_type: string
          uploaded_by: string
          status: 'processing' | 'ready' | 'failed'
          summary: string | null
          audio_summary_url: string | null
          created_at: string
          updated_at: string
          watermark_applied: boolean
          organization_id: string | null
          visibility: 'organization' | 'public' | 'private' | null
          tags: string[] | null
          metadata: AssetMetadata | null
          archived_at: string | null
          auto_archive_date: string | null
          category: 'board_pack' | 'meeting_notes' | 'agenda' | 'notes' | 'financial_report' | 'legal_document' | 'presentation' | 'other'
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_path: string
          file_name: string
          file_size: number
          file_type: string
          uploaded_by: string
          status?: 'processing' | 'ready' | 'failed'
          summary?: string | null
          audio_summary_url?: string | null
          created_at?: string
          updated_at?: string
          watermark_applied?: boolean
          organization_id?: string | null
          visibility?: 'organization' | 'public' | 'private' | null
          tags?: string[] | null
          metadata?: AssetMetadata | null
          archived_at?: string | null
          auto_archive_date?: string | null
          category?: 'board_pack' | 'meeting_notes' | 'agenda' | 'notes' | 'financial_report' | 'legal_document' | 'presentation' | 'other'
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_path?: string
          file_name?: string
          file_size?: number
          file_type?: string
          uploaded_by?: string
          status?: 'processing' | 'ready' | 'failed'
          summary?: string | null
          audio_summary_url?: string | null
          created_at?: string
          updated_at?: string
          watermark_applied?: boolean
          organization_id?: string | null
          visibility?: 'organization' | 'public' | 'private' | null
          tags?: string[] | null
          metadata?: AssetMetadata | null
          archived_at?: string | null
          auto_archive_date?: string | null
          category?: 'board_pack' | 'meeting_notes' | 'agenda' | 'notes' | 'financial_report' | 'legal_document' | 'presentation' | 'other'
        }
      }
      board_pack_permissions: {
        Row: {
          id: string
          board_pack_id: string
          organization_id: string
          granted_to_user_id: string | null
          granted_to_role: 'owner' | 'admin' | 'member' | 'viewer' | null
          can_view: boolean
          can_download: boolean
          can_comment: boolean
          can_share: boolean
          can_edit_metadata: boolean
          granted_by: string
          granted_at: string
          expires_at: string | null
          revoked_at: string | null
          revoked_by: string | null
          last_accessed: string | null
          access_count: number
        }
        Insert: {
          id?: string
          board_pack_id: string
          organization_id: string
          granted_to_user_id?: string | null
          granted_to_role?: 'owner' | 'admin' | 'member' | 'viewer' | null
          can_view?: boolean
          can_download?: boolean
          can_comment?: boolean
          can_share?: boolean
          can_edit_metadata?: boolean
          granted_by: string
          granted_at?: string
          expires_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          last_accessed?: string | null
          access_count?: number
        }
        Update: {
          id?: string
          board_pack_id?: string
          organization_id?: string
          granted_to_user_id?: string | null
          granted_to_role?: 'owner' | 'admin' | 'member' | 'viewer' | null
          can_view?: boolean
          can_download?: boolean
          can_comment?: boolean
          can_share?: boolean
          can_edit_metadata?: boolean
          granted_by?: string
          granted_at?: string
          expires_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          last_accessed?: string | null
          access_count?: number
        }
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          session_id: string | null
          event_type: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_event' | 'compliance' | 'user_action'
          event_category: string
          action: string
          resource_type: string
          resource_id: string | null
          event_description: string
          details: ActivityDetails | null
          metadata: AssetMetadata | null
          severity: 'low' | 'medium' | 'high' | 'critical'
          outcome: 'success' | 'failure' | 'error' | 'blocked'
          risk_score: number | null
          ip_address: string | null
          user_agent: string | null
          device_fingerprint: string | null
          geolocation: GeolocationInfo | null
          http_method: string | null
          endpoint: string | null
          request_headers: RequestHeaders | null
          response_status: number | null
          response_time_ms: number | null
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          affected_rows: number | null
          created_at: string
          correlation_id: string | null
          parent_event_id: string | null
          retention_period: string | null
          compliance_tags: string[] | null
          legal_hold: boolean
          investigation_status: 'none' | 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          assigned_investigator: string | null
          investigation_notes: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          session_id?: string | null
          event_type: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_event' | 'compliance' | 'user_action'
          event_category: string
          action: string
          resource_type: string
          resource_id?: string | null
          event_description: string
          details?: ActivityDetails | null
          metadata?: AssetMetadata | null
          severity?: 'low' | 'medium' | 'high' | 'critical'
          outcome: 'success' | 'failure' | 'error' | 'blocked'
          risk_score?: number | null
          ip_address?: string | null
          user_agent?: string | null
          device_fingerprint?: string | null
          geolocation?: GeolocationInfo | null
          http_method?: string | null
          endpoint?: string | null
          request_headers?: RequestHeaders | null
          response_status?: number | null
          response_time_ms?: number | null
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          affected_rows?: number | null
          created_at?: string
          correlation_id?: string | null
          parent_event_id?: string | null
          retention_period?: string | null
          compliance_tags?: string[] | null
          legal_hold?: boolean
          investigation_status?: 'none' | 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          assigned_investigator?: string | null
          investigation_notes?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          session_id?: string | null
          event_type?: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_event' | 'compliance' | 'user_action'
          event_category?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          event_description?: string
          details?: ActivityDetails | null
          metadata?: AssetMetadata | null
          severity?: 'low' | 'medium' | 'high' | 'critical'
          outcome?: 'success' | 'failure' | 'error' | 'blocked'
          risk_score?: number | null
          ip_address?: string | null
          user_agent?: string | null
          device_fingerprint?: string | null
          geolocation?: GeolocationInfo | null
          http_method?: string | null
          endpoint?: string | null
          request_headers?: RequestHeaders | null
          response_status?: number | null
          response_time_ms?: number | null
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          affected_rows?: number | null
          created_at?: string
          correlation_id?: string | null
          parent_event_id?: string | null
          retention_period?: string | null
          compliance_tags?: string[] | null
          legal_hold?: boolean
          investigation_status?: 'none' | 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          assigned_investigator?: string | null
          investigation_notes?: string | null
          resolved_at?: string | null
        }
      }
      registration_requests: {
        Row: {
          id: string
          email: string
          full_name: string
          company: string | null
          position: string | null
          message: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          company?: string | null
          position?: string | null
          message?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          company?: string | null
          position?: string | null
          message?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
      otp_codes: {
        Row: {
          id: string
          email: string
          otp_code: string
          purpose: 'first_login' | 'password_reset'
          expires_at: string
          used: boolean
          used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          otp_code: string
          purpose?: 'first_login' | 'password_reset'
          expires_at: string
          used?: boolean
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          otp_code?: string
          purpose?: 'first_login' | 'password_reset'
          expires_at?: string
          used?: boolean
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      asset_annotations: {
        Row: {
          id: string
          asset_id: string
          vault_id: string | null
          organization_id: string
          created_by: string
          created_at: string
          updated_at: string
          annotation_type: 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'
          content: Record<string, unknown>
          page_number: number
          position: ContentPosition
          selected_text: string | null
          comment_text: string | null
          color: string
          opacity: number
          is_private: boolean
          is_resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          is_anchored: boolean
          anchor_text: string | null
          metadata: EventMetadata
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          vault_id?: string | null
          organization_id: string
          created_by: string
          created_at?: string
          updated_at?: string
          annotation_type: 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'
          content: Record<string, unknown>
          page_number: number
          position: ContentPosition
          selected_text?: string | null
          comment_text?: string | null
          color?: string
          opacity?: number
          is_private?: boolean
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          is_anchored?: boolean
          anchor_text?: string | null
          metadata?: EventMetadata
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          vault_id?: string | null
          organization_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          annotation_type?: 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'
          content?: Record<string, unknown>
          page_number?: number
          position?: ContentPosition
          selected_text?: string | null
          comment_text?: string | null
          color?: string
          opacity?: number
          is_private?: boolean
          is_resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          is_anchored?: boolean
          anchor_text?: string | null
          metadata?: EventMetadata
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      annotation_replies: {
        Row: {
          id: string
          annotation_id: string
          parent_reply_id: string | null
          reply_text: string
          created_by: string
          created_at: string
          updated_at: string
          is_edited: boolean
          edited_at: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          annotation_id: string
          parent_reply_id?: string | null
          reply_text: string
          created_by: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string
          parent_reply_id?: string | null
          reply_text?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      annotation_reactions: {
        Row: {
          id: string
          annotation_id: string | null
          reply_id: string | null
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          annotation_id?: string | null
          reply_id?: string | null
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          annotation_id?: string | null
          reply_id?: string | null
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
      annotation_mentions: {
        Row: {
          id: string
          annotation_id: string | null
          reply_id: string | null
          mentioned_user_id: string
          mentioned_by: string
          created_at: string
          is_read: boolean
          read_at: string | null
        }
        Insert: {
          id?: string
          annotation_id?: string | null
          reply_id?: string | null
          mentioned_user_id: string
          mentioned_by: string
          created_at?: string
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string | null
          reply_id?: string | null
          mentioned_user_id?: string
          mentioned_by?: string
          created_at?: string
          is_read?: boolean
          read_at?: string | null
        }
      }
      user_annotation_preferences: {
        Row: {
          user_id: string
          default_color: string
          default_opacity: number
          show_all_annotations: boolean
          show_own_only: boolean
          auto_save_annotations: boolean
          notify_on_mentions: boolean
          notify_on_replies: boolean
          notify_on_new_annotations: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          default_color?: string
          default_opacity?: number
          show_all_annotations?: boolean
          show_own_only?: boolean
          auto_save_annotations?: boolean
          notify_on_mentions?: boolean
          notify_on_replies?: boolean
          notify_on_new_annotations?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          default_color?: string
          default_opacity?: number
          show_all_annotations?: boolean
          show_own_only?: boolean
          auto_save_annotations?: boolean
          notify_on_mentions?: boolean
          notify_on_replies?: boolean
          notify_on_new_annotations?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          title: string
          description: string | null
          meeting_type: 'agm' | 'board' | 'committee' | 'other'
          status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
          visibility: 'public' | 'organization' | 'private'
          scheduled_start: string
          scheduled_end: string
          timezone: string
          location: string | null
          virtual_meeting_url: string | null
          is_recurring: boolean
          recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          recurrence_interval: number
          recurrence_end_date: string | null
          parent_meeting_id: string | null
          agenda_finalized: boolean
          invitations_sent: boolean
          documents_locked: boolean
          estimated_duration_minutes: number
          actual_start: string | null
          actual_end: string | null
          settings: MeetingSettings
          tags: string[]
          category: string | null
          created_at: string
          updated_at: string
          cancelled_at: string | null
          cancelled_reason: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          title: string
          description?: string | null
          meeting_type?: 'agm' | 'board' | 'committee' | 'other'
          status?: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
          visibility?: 'public' | 'organization' | 'private'
          scheduled_start: string
          scheduled_end: string
          timezone?: string
          location?: string | null
          virtual_meeting_url?: string | null
          is_recurring?: boolean
          recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          recurrence_interval?: number
          recurrence_end_date?: string | null
          parent_meeting_id?: string | null
          agenda_finalized?: boolean
          invitations_sent?: boolean
          documents_locked?: boolean
          estimated_duration_minutes?: number
          actual_start?: string | null
          actual_end?: string | null
          settings?: MemberSettings
          tags?: string[]
          category?: string | null
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          title?: string
          description?: string | null
          meeting_type?: 'agm' | 'board' | 'committee' | 'other'
          status?: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
          visibility?: 'public' | 'organization' | 'private'
          scheduled_start?: string
          scheduled_end?: string
          timezone?: string
          location?: string | null
          virtual_meeting_url?: string | null
          is_recurring?: boolean
          recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          recurrence_interval?: number
          recurrence_end_date?: string | null
          parent_meeting_id?: string | null
          agenda_finalized?: boolean
          invitations_sent?: boolean
          documents_locked?: boolean
          estimated_duration_minutes?: number
          actual_start?: string | null
          actual_end?: string | null
          settings?: MemberSettings
          tags?: string[]
          category?: string | null
          created_at?: string
          updated_at?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
      }
      meeting_agenda_items: {
        Row: {
          id: string
          meeting_id: string
          title: string
          description: string | null
          item_type: 'presentation' | 'discussion' | 'decision' | 'information' | 'break'
          order_index: number
          estimated_duration_minutes: number
          presenter_user_id: string | null
          responsible_user_id: string | null
          content: string | null
          objectives: string[]
          is_confidential: boolean
          requires_decision: boolean
          decision_text: string | null
          decision_made: boolean
          actual_start: string | null
          actual_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          title: string
          description?: string | null
          item_type?: 'presentation' | 'discussion' | 'decision' | 'information' | 'break'
          order_index?: number
          estimated_duration_minutes?: number
          presenter_user_id?: string | null
          responsible_user_id?: string | null
          content?: string | null
          objectives?: string[]
          is_confidential?: boolean
          requires_decision?: boolean
          decision_text?: string | null
          decision_made?: boolean
          actual_start?: string | null
          actual_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          title?: string
          description?: string | null
          item_type?: 'presentation' | 'discussion' | 'decision' | 'information' | 'break'
          order_index?: number
          estimated_duration_minutes?: number
          presenter_user_id?: string | null
          responsible_user_id?: string | null
          content?: string | null
          objectives?: string[]
          is_confidential?: boolean
          requires_decision?: boolean
          decision_text?: string | null
          decision_made?: boolean
          actual_start?: string | null
          actual_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meeting_invitees: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          invited_by: string
          attendee_role: 'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'
          is_required: boolean
          is_organizer: boolean
          rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response'
          rsvp_timestamp: string | null
          rsvp_notes: string | null
          attendance_status: 'not_attended' | 'attended' | 'partially_attended' | 'late' | 'left_early'
          checked_in_at: string | null
          checked_out_at: string | null
          attendance_notes: string | null
          can_invite_others: boolean
          can_modify_agenda: boolean
          can_upload_documents: boolean
          speaking_time_minutes: number
          invitation_sent: boolean
          invitation_sent_at: string | null
          reminder_count: number
          last_reminder_sent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          user_id: string
          invited_by: string
          attendee_role?: 'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'
          is_required?: boolean
          is_organizer?: boolean
          rsvp_status?: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response'
          rsvp_timestamp?: string | null
          rsvp_notes?: string | null
          attendance_status?: 'not_attended' | 'attended' | 'partially_attended' | 'late' | 'left_early'
          checked_in_at?: string | null
          checked_out_at?: string | null
          attendance_notes?: string | null
          can_invite_others?: boolean
          can_modify_agenda?: boolean
          can_upload_documents?: boolean
          speaking_time_minutes?: number
          invitation_sent?: boolean
          invitation_sent_at?: string | null
          reminder_count?: number
          last_reminder_sent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          user_id?: string
          invited_by?: string
          attendee_role?: 'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'
          is_required?: boolean
          is_organizer?: boolean
          rsvp_status?: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response'
          rsvp_timestamp?: string | null
          rsvp_notes?: string | null
          attendance_status?: 'not_attended' | 'attended' | 'partially_attended' | 'late' | 'left_early'
          checked_in_at?: string | null
          checked_out_at?: string | null
          attendance_notes?: string | null
          can_invite_others?: boolean
          can_modify_agenda?: boolean
          can_upload_documents?: boolean
          speaking_time_minutes?: number
          invitation_sent?: boolean
          invitation_sent_at?: string | null
          reminder_count?: number
          last_reminder_sent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meeting_documents: {
        Row: {
          id: string
          meeting_id: string
          agenda_item_id: string | null
          uploaded_by: string
          title: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          mime_type: string
          category: 'agenda' | 'supporting' | 'presentation' | 'report' | 'minutes' | 'action_items' | 'reference'
          is_confidential: boolean
          visibility: Array<'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'>
          download_count: number
          version_number: number
          is_latest_version: boolean
          previous_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          agenda_item_id?: string | null
          uploaded_by: string
          title: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          mime_type: string
          category?: 'agenda' | 'supporting' | 'presentation' | 'report' | 'minutes' | 'action_items' | 'reference'
          is_confidential?: boolean
          visibility?: Array<'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'>
          download_count?: number
          version_number?: number
          is_latest_version?: boolean
          previous_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          agenda_item_id?: string | null
          uploaded_by?: string
          title?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          mime_type?: string
          category?: 'agenda' | 'supporting' | 'presentation' | 'report' | 'minutes' | 'action_items' | 'reference'
          is_confidential?: boolean
          visibility?: Array<'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'>
          download_count?: number
          version_number?: number
          is_latest_version?: boolean
          previous_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meeting_notifications: {
        Row: {
          id: string
          meeting_id: string
          recipient_user_id: string
          notification_type: 'invitation' | 'reminder' | 'agenda_update' | 'document_added' | 'meeting_cancelled' | 'meeting_rescheduled' | 'rsvp_reminder' | 'pre_meeting_task'
          channel: 'email' | 'push' | 'sms' | 'in_app'
          status: 'pending' | 'sent' | 'failed' | 'cancelled'
          subject: string
          content: string
          template_name: string | null
          template_data: EmailTemplateData
          scheduled_send_at: string
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          response_data: NotificationResponseData
          error_message: string | null
          retry_count: number
          max_retries: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          recipient_user_id: string
          notification_type: 'invitation' | 'reminder' | 'agenda_update' | 'document_added' | 'meeting_cancelled' | 'meeting_rescheduled' | 'rsvp_reminder' | 'pre_meeting_task'
          channel?: 'email' | 'push' | 'sms' | 'in_app'
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          subject: string
          content: string
          template_name?: string | null
          template_data?: EmailTemplateData
          scheduled_send_at: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          response_data?: NotificationResponseData
          error_message?: string | null
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          recipient_user_id?: string
          notification_type?: 'invitation' | 'reminder' | 'agenda_update' | 'document_added' | 'meeting_cancelled' | 'meeting_rescheduled' | 'rsvp_reminder' | 'pre_meeting_task'
          channel?: 'email' | 'push' | 'sms' | 'in_app'
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          subject?: string
          content?: string
          template_name?: string | null
          template_data?: EmailTemplateData
          scheduled_send_at?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          response_data?: NotificationResponseData
          error_message?: string | null
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
      }
      meeting_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          meeting_type: 'agm' | 'board' | 'committee' | 'other'
          template_data: EmailTemplateData
          default_duration_minutes: number
          default_settings: Record<string, unknown>
          organization_id: string | null
          created_by: string
          is_public: boolean
          is_system_template: boolean
          usage_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          meeting_type: 'agm' | 'board' | 'committee' | 'other'
          template_data: EmailTemplateData
          default_duration_minutes?: number
          default_settings?: Record<string, unknown>
          organization_id?: string | null
          created_by: string
          is_public?: boolean
          is_system_template?: boolean
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          meeting_type?: 'agm' | 'board' | 'committee' | 'other'
          template_data?: EmailTemplateData
          default_duration_minutes?: number
          default_settings?: Record<string, unknown>
          organization_id?: string | null
          created_by?: string
          is_public?: boolean
          is_system_template?: boolean
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meeting_attendance_log: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          duration_minutes: number | null
          attendance_method: string
          connection_quality: string | null
          spoke_duration_minutes: number
          questions_asked: number
          votes_cast: number
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          user_id: string
          joined_at: string
          left_at?: string | null
          attendance_method?: string
          connection_quality?: string | null
          spoke_duration_minutes?: number
          questions_asked?: number
          votes_cast?: number
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
          attendance_method?: string
          connection_quality?: string | null
          spoke_duration_minutes?: number
          questions_asked?: number
          votes_cast?: number
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          created_at?: string
        }
      }
      dropdown_option_categories: {
        Row: {
          id: string
          name: string
          label: string
          description: string | null
          is_active: boolean
          is_system: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          label: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          label?: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      dropdown_options: {
        Row: {
          id: string
          category_id: string
          value: string
          label: string
          description: string | null
          is_active: boolean
          is_system: boolean
          sort_order: number
          metadata: EventMetadata
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          value: string
          label: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          metadata?: EventMetadata
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          value?: string
          label?: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          metadata?: EventMetadata
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          meeting_id: string | null
          user_id: string
          organization_id: string | null
          title: string
          description: string | null
          start_datetime: string
          end_datetime: string
          timezone: string
          all_day: boolean
          event_type: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday'
          status: 'confirmed' | 'tentative' | 'cancelled'
          visibility: 'public' | 'organization' | 'private'
          color: string
          category: string | null
          tags: string[]
          location: string | null
          virtual_meeting_url: string | null
          is_recurring: boolean
          recurrence_rule: RecurrenceRule | null
          parent_event_id: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          meeting_id?: string | null
          user_id: string
          organization_id?: string | null
          title: string
          description?: string | null
          start_datetime: string
          end_datetime: string
          timezone?: string
          all_day?: boolean
          event_type?: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday'
          status?: 'confirmed' | 'tentative' | 'cancelled'
          visibility?: 'public' | 'organization' | 'private'
          color?: string
          category?: string | null
          tags?: string[]
          location?: string | null
          virtual_meeting_url?: string | null
          is_recurring?: boolean
          recurrence_rule?: RecurrenceRule | null
          parent_event_id?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          meeting_id?: string | null
          user_id?: string
          organization_id?: string | null
          title?: string
          description?: string | null
          start_datetime?: string
          end_datetime?: string
          timezone?: string
          all_day?: boolean
          event_type?: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday'
          status?: 'confirmed' | 'tentative' | 'cancelled'
          visibility?: 'public' | 'organization' | 'private'
          color?: string
          category?: string | null
          tags?: string[]
          location?: string | null
          virtual_meeting_url?: string | null
          is_recurring?: boolean
          recurrence_rule?: RecurrenceRule | null
          parent_event_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      calendar_views: {
        Row: {
          id: string
          user_id: string
          default_view: 'day' | 'week' | 'month' | 'year' | 'agenda'
          week_start_day: number
          time_format: '12h' | '24h'
          timezone: string
          show_weekends: boolean
          show_declined_events: boolean
          compact_view: boolean
          work_start_time: string
          work_end_time: string
          work_days: number[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          default_view?: 'day' | 'week' | 'month' | 'year' | 'agenda'
          week_start_day?: number
          time_format?: '12h' | '24h'
          timezone?: string
          show_weekends?: boolean
          show_declined_events?: boolean
          compact_view?: boolean
          work_start_time?: string
          work_end_time?: string
          work_days?: number[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          default_view?: 'day' | 'week' | 'month' | 'year' | 'agenda'
          week_start_day?: number
          time_format?: '12h' | '24h'
          timezone?: string
          show_weekends?: boolean
          show_declined_events?: boolean
          compact_view?: boolean
          work_start_time?: string
          work_end_time?: string
          work_days?: number[]
          created_at?: string
          updated_at?: string
        }
      }
      calendar_reminders: {
        Row: {
          id: string
          event_id: string
          user_id: string
          reminder_type: 'email' | 'push' | 'in_app' | 'sms'
          minutes_before: number
          is_sent: boolean
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          reminder_type: 'email' | 'push' | 'in_app' | 'sms'
          minutes_before: number
          is_sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          reminder_type?: 'email' | 'push' | 'in_app' | 'sms'
          minutes_before?: number
          is_sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
      }
      calendar_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string
          email: string
          role: 'organizer' | 'presenter' | 'participant' | 'optional'
          rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative'
          rsvp_responded_at: string | null
          rsvp_note: string | null
          can_edit: boolean
          can_invite_others: boolean
          invited_at: string
          invited_by: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          email: string
          role?: 'organizer' | 'presenter' | 'participant' | 'optional'
          rsvp_status?: 'pending' | 'accepted' | 'declined' | 'tentative'
          rsvp_responded_at?: string | null
          rsvp_note?: string | null
          can_edit?: boolean
          can_invite_others?: boolean
          invited_at?: string
          invited_by?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          email?: string
          role?: 'organizer' | 'presenter' | 'participant' | 'optional'
          rsvp_status?: 'pending' | 'accepted' | 'declined' | 'tentative'
          rsvp_responded_at?: string | null
          rsvp_note?: string | null
          can_edit?: boolean
          can_invite_others?: boolean
          invited_at?: string
          invited_by?: string | null
        }
      }
      calendar_subscriptions: {
        Row: {
          id: string
          subscriber_id: string
          calendar_owner_id: string
          organization_id: string | null
          name: string
          description: string | null
          subscription_type: 'user' | 'organization' | 'external'
          permission_level: 'read' | 'write' | 'admin'
          is_visible: boolean
          color: string
          status: 'active' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          calendar_owner_id: string
          organization_id?: string | null
          name: string
          description?: string | null
          subscription_type?: 'user' | 'organization' | 'external'
          permission_level?: 'read' | 'write' | 'admin'
          is_visible?: boolean
          color?: string
          status?: 'active' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          calendar_owner_id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          subscription_type?: 'user' | 'organization' | 'external'
          permission_level?: 'read' | 'write' | 'admin'
          is_visible?: boolean
          color?: string
          status?: 'active' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      calendar_availability: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          timezone: string
          availability_type: 'available' | 'busy' | 'tentative'
          effective_from: string | null
          effective_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          timezone?: string
          availability_type?: 'available' | 'busy' | 'tentative'
          effective_from?: string | null
          effective_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          timezone?: string
          availability_type?: 'available' | 'busy' | 'tentative'
          effective_from?: string | null
          effective_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          name: string
          description: string | null
          board_type: 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board'
          organization_id: string
          parent_board_id: string | null
          status: 'active' | 'inactive' | 'dissolved'
          established_date: string | null
          dissolution_date: string | null
          meeting_frequency: string | null
          next_meeting_date: string | null
          meeting_location: string | null
          created_by: string
          created_at: string
          updated_at: string
          settings: BoardSettings
          tags: string[]
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          board_type?: 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board'
          organization_id: string
          parent_board_id?: string | null
          status?: 'active' | 'inactive' | 'dissolved'
          established_date?: string | null
          dissolution_date?: string | null
          meeting_frequency?: string | null
          next_meeting_date?: string | null
          meeting_location?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          settings?: MemberSettings
          tags?: string[]
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          board_type?: 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board'
          organization_id?: string
          parent_board_id?: string | null
          status?: 'active' | 'inactive' | 'dissolved'
          established_date?: string | null
          dissolution_date?: string | null
          meeting_frequency?: string | null
          next_meeting_date?: string | null
          meeting_location?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          settings?: MemberSettings
          tags?: string[]
        }
      }
      committees: {
        Row: {
          id: string
          name: string
          description: string | null
          committee_type: 'audit' | 'compensation' | 'governance' | 'risk' | 'nomination' | 'strategy' | 'technology' | 'investment' | 'ethics' | 'executive' | 'other'
          organization_id: string
          board_id: string
          status: 'active' | 'inactive' | 'dissolved' | 'temporary'
          established_date: string | null
          dissolution_date: string | null
          is_permanent: boolean
          charter_document_url: string | null
          responsibilities: string[]
          authority_level: string | null
          meeting_frequency: string | null
          next_meeting_date: string | null
          meeting_location: string | null
          created_by: string
          created_at: string
          updated_at: string
          settings: CommitteeSettings
          tags: string[]
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          committee_type?: 'audit' | 'compensation' | 'governance' | 'risk' | 'nomination' | 'strategy' | 'technology' | 'investment' | 'ethics' | 'executive' | 'other'
          organization_id: string
          board_id: string
          status?: 'active' | 'inactive' | 'dissolved' | 'temporary'
          established_date?: string | null
          dissolution_date?: string | null
          is_permanent?: boolean
          charter_document_url?: string | null
          responsibilities?: string[]
          authority_level?: string | null
          meeting_frequency?: string | null
          next_meeting_date?: string | null
          meeting_location?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          settings?: MemberSettings
          tags?: string[]
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          committee_type?: 'audit' | 'compensation' | 'governance' | 'risk' | 'nomination' | 'strategy' | 'technology' | 'investment' | 'ethics' | 'executive' | 'other'
          organization_id?: string
          board_id?: string
          status?: 'active' | 'inactive' | 'dissolved' | 'temporary'
          established_date?: string | null
          dissolution_date?: string | null
          is_permanent?: boolean
          charter_document_url?: string | null
          responsibilities?: string[]
          authority_level?: string | null
          meeting_frequency?: string | null
          next_meeting_date?: string | null
          meeting_location?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          settings?: MemberSettings
          tags?: string[]
        }
      }
      board_members: {
        Row: {
          id: string
          board_id: string
          user_id: string
          organization_id: string
          role: 'chairman' | 'vice_chairman' | 'ceo' | 'cfo' | 'cto' | 'independent_director' | 'executive_director' | 'non_executive_director' | 'board_member' | 'board_observer'
          status: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member: boolean
          appointed_date: string
          appointed_by: string | null
          term_start_date: string | null
          term_end_date: string | null
          term_length_months: number | null
          resigned_date: string | null
          termination_date: string | null
          termination_reason: string | null
          annual_compensation: number | null
          compensation_currency: string | null
          equity_compensation: EquityCompensation | null
          meetings_attended: number
          meetings_total: number
          attendance_rate: number | null
          expertise_areas: string[]
          skills: MemberSkills | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          organization_id: string
          role?: 'chairman' | 'vice_chairman' | 'ceo' | 'cfo' | 'cto' | 'independent_director' | 'executive_director' | 'non_executive_director' | 'board_member' | 'board_observer'
          status?: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member?: boolean
          appointed_date?: string
          appointed_by?: string | null
          term_start_date?: string | null
          term_end_date?: string | null
          term_length_months?: number | null
          resigned_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          annual_compensation?: number | null
          compensation_currency?: string | null
          equity_compensation?: EquityCompensation | null
          meetings_attended?: number
          meetings_total?: number
          expertise_areas?: string[]
          skills?: MemberSkills | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          organization_id?: string
          role?: 'chairman' | 'vice_chairman' | 'ceo' | 'cfo' | 'cto' | 'independent_director' | 'executive_director' | 'non_executive_director' | 'board_member' | 'board_observer'
          status?: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member?: boolean
          appointed_date?: string
          appointed_by?: string | null
          term_start_date?: string | null
          term_end_date?: string | null
          term_length_months?: number | null
          resigned_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          annual_compensation?: number | null
          compensation_currency?: string | null
          equity_compensation?: EquityCompensation | null
          meetings_attended?: number
          meetings_total?: number
          expertise_areas?: string[]
          skills?: MemberSkills | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      committee_members: {
        Row: {
          id: string
          committee_id: string
          user_id: string
          board_id: string
          organization_id: string
          role: 'chair' | 'vice_chair' | 'member' | 'secretary' | 'advisor' | 'observer'
          status: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member: boolean
          appointed_date: string
          appointed_by: string | null
          term_start_date: string | null
          term_end_date: string | null
          resigned_date: string | null
          termination_date: string | null
          termination_reason: string | null
          meetings_attended: number
          meetings_total: number
          attendance_rate: number | null
          relevant_expertise: string[]
          contributions: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          committee_id: string
          user_id: string
          board_id: string
          organization_id: string
          role?: 'chair' | 'vice_chair' | 'member' | 'secretary' | 'advisor' | 'observer'
          status?: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member?: boolean
          appointed_date?: string
          appointed_by?: string | null
          term_start_date?: string | null
          term_end_date?: string | null
          resigned_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          meetings_attended?: number
          meetings_total?: number
          relevant_expertise?: string[]
          contributions?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          committee_id?: string
          user_id?: string
          board_id?: string
          organization_id?: string
          role?: 'chair' | 'vice_chair' | 'member' | 'secretary' | 'advisor' | 'observer'
          status?: 'active' | 'inactive' | 'resigned' | 'terminated'
          is_voting_member?: boolean
          appointed_date?: string
          appointed_by?: string | null
          term_start_date?: string | null
          term_end_date?: string | null
          resigned_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          meetings_attended?: number
          meetings_total?: number
          relevant_expertise?: string[]
          contributions?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          type: 'system' | 'meeting' | 'chat' | 'asset' | 'vault' | 'user' | 'security' | 'reminder'
          category: string
          title: string
          message: string
          priority: 'low' | 'medium' | 'high' | 'critical'
          status: 'unread' | 'read' | 'archived' | 'dismissed'
          action_url: string | null
          action_text: string | null
          icon: string | null
          color: string | null
          resource_type: string | null
          resource_id: string | null
          sender_id: string | null
          metadata: AssetMetadata | null
          scheduled_for: string | null
          delivered_at: string | null
          read_at: string | null
          archived_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          workflow_id: string | null
          compliance_type: string | null
          deadline_type: 'soft' | 'hard' | 'regulatory' | null
          requires_acknowledgment: boolean | null
          acknowledged_at: string | null
          acknowledgment_method: 'click' | 'digital_signature' | 'email_reply' | null
          escalation_level: number | null
          compliance_evidence_url: string | null
          regulatory_reference: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          type: 'system' | 'meeting' | 'chat' | 'asset' | 'vault' | 'user' | 'security' | 'reminder'
          category: string
          title: string
          message: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'unread' | 'read' | 'archived' | 'dismissed'
          action_url?: string | null
          action_text?: string | null
          icon?: string | null
          color?: string | null
          resource_type?: string | null
          resource_id?: string | null
          sender_id?: string | null
          metadata?: AssetMetadata | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          archived_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          workflow_id?: string | null
          compliance_type?: string | null
          deadline_type?: 'soft' | 'hard' | 'regulatory' | null
          requires_acknowledgment?: boolean | null
          acknowledged_at?: string | null
          acknowledgment_method?: 'click' | 'digital_signature' | 'email_reply' | null
          escalation_level?: number | null
          compliance_evidence_url?: string | null
          regulatory_reference?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          type?: 'system' | 'meeting' | 'chat' | 'asset' | 'vault' | 'user' | 'security' | 'reminder'
          category?: string
          title?: string
          message?: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'unread' | 'read' | 'archived' | 'dismissed'
          action_url?: string | null
          action_text?: string | null
          icon?: string | null
          color?: string | null
          resource_type?: string | null
          resource_id?: string | null
          sender_id?: string | null
          metadata?: AssetMetadata | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          archived_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          workflow_id?: string | null
          compliance_type?: string | null
          deadline_type?: 'soft' | 'hard' | 'regulatory' | null
          requires_acknowledgment?: boolean | null
          acknowledged_at?: string | null
          acknowledgment_method?: 'click' | 'digital_signature' | 'email_reply' | null
          escalation_level?: number | null
          compliance_evidence_url?: string | null
          regulatory_reference?: string | null
        }
      }
      notification_patterns: {
        Row: {
          id: string
          pattern_id: string
          pattern_type: string
          organization_id: string | null
          user_id: string | null
          pattern_data: PatternData
          confidence_score: number
          frequency_detected: number
          last_detected_at: string | null
          conditions: AnalyticsConditions | null
          outcomes: AnalyticsOutcomes | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pattern_id: string
          pattern_type: string
          organization_id?: string | null
          user_id?: string | null
          pattern_data: PatternData
          confidence_score?: number
          frequency_detected?: number
          last_detected_at?: string | null
          conditions?: AnalyticsConditions | null
          outcomes?: AnalyticsOutcomes | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pattern_id?: string
          pattern_type?: string
          organization_id?: string | null
          user_id?: string | null
          pattern_data?: PatternData
          confidence_score?: number
          frequency_detected?: number
          last_detected_at?: string | null
          conditions?: AnalyticsConditions | null
          outcomes?: AnalyticsOutcomes | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_behavior_metrics: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          action_type: string
          timestamp: string
          context: Record<string, unknown>
          response_time_ms: number | null
          engagement_score: number | null
          session_id: string | null
          metadata: AssetMetadata | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          action_type: string
          timestamp?: string
          context: Record<string, unknown>
          response_time_ms?: number | null
          engagement_score?: number | null
          session_id?: string | null
          metadata?: AssetMetadata | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          action_type?: string
          timestamp?: string
          context?: Record<string, unknown>
          response_time_ms?: number | null
          engagement_score?: number | null
          session_id?: string | null
          metadata?: AssetMetadata | null
          created_at?: string
        }
      }
      board_benchmarks: {
        Row: {
          id: string
          metric_type: string
          industry: string
          organization_size: string
          region: string
          percentile_data: PercentileData
          sample_size: number
          data_source: string
          confidence_interval: ConfidenceInterval | null
          effective_date: string
          expires_date: string | null
          is_active: boolean
          metadata: AssetMetadata | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          metric_type: string
          industry: string
          organization_size: string
          region?: string
          percentile_data: PercentileData
          sample_size: number
          data_source: string
          confidence_interval?: ConfidenceInterval | null
          effective_date: string
          expires_date?: string | null
          is_active?: boolean
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          metric_type?: string
          industry?: string
          organization_size?: string
          region?: string
          percentile_data?: PercentileData
          sample_size?: number
          data_source?: string
          confidence_interval?: ConfidenceInterval | null
          effective_date?: string
          expires_date?: string | null
          is_active?: boolean
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
      }
      predicted_notifications: {
        Row: {
          id: string
          prediction_id: string
          user_id: string
          organization_id: string | null
          pattern_id: string | null
          predicted_type: string
          predicted_time: string
          confidence_score: number
          priority_score: number
          prediction_data: PredictionData
          model_version: string
          actual_sent_at: string | null
          actual_outcome: string | null
          actual_response_time_ms: number | null
          prediction_accuracy: number | null
          feedback_score: number | null
          is_sent: boolean
          is_successful: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prediction_id: string
          user_id: string
          organization_id?: string | null
          pattern_id?: string | null
          predicted_type: string
          predicted_time: string
          confidence_score: number
          priority_score?: number
          prediction_data: PredictionData
          model_version: string
          actual_sent_at?: string | null
          actual_outcome?: string | null
          actual_response_time_ms?: number | null
          prediction_accuracy?: number | null
          feedback_score?: number | null
          is_sent?: boolean
          is_successful?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prediction_id?: string
          user_id?: string
          organization_id?: string | null
          pattern_id?: string | null
          predicted_type?: string
          predicted_time?: string
          confidence_score?: number
          priority_score?: number
          prediction_data?: PredictionData
          model_version?: string
          actual_sent_at?: string | null
          actual_outcome?: string | null
          actual_response_time_ms?: number | null
          prediction_accuracy?: number | null
          feedback_score?: number | null
          is_sent?: boolean
          is_successful?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      intelligence_sources: {
        Row: {
          id: string
          source_name: string
          source_type: string
          api_endpoint: string | null
          api_key_encrypted: string | null
          update_frequency_hours: number
          last_updated_at: string | null
          next_update_at: string | null
          is_active: boolean
          rate_limit_per_hour: number
          current_usage_count: number
          configuration: MLConfiguration | null
          metadata: AssetMetadata | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_name: string
          source_type: string
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          update_frequency_hours?: number
          last_updated_at?: string | null
          next_update_at?: string | null
          is_active?: boolean
          rate_limit_per_hour?: number
          current_usage_count?: number
          configuration?: MLConfiguration | null
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_name?: string
          source_type?: string
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          update_frequency_hours?: number
          last_updated_at?: string | null
          next_update_at?: string | null
          is_active?: boolean
          rate_limit_per_hour?: number
          current_usage_count?: number
          configuration?: MLConfiguration | null
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
      }
      anomaly_detections: {
        Row: {
          id: string
          anomaly_id: string
          organization_id: string | null
          user_id: string | null
          anomaly_type: string
          severity: string
          anomaly_score: number
          detection_method: string
          baseline_data: Record<string, number>
          anomalous_data: Record<string, number>
          affected_metrics: readonly string[] | null
          recommended_actions: readonly string[] | null
          investigation_status: string
          investigated_by: string | null
          investigated_at: string | null
          resolution_notes: string | null
          is_resolved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anomaly_id: string
          organization_id?: string | null
          user_id?: string | null
          anomaly_type: string
          severity?: string
          anomaly_score: number
          detection_method: string
          baseline_data: Record<string, number>
          anomalous_data: Record<string, number>
          affected_metrics?: readonly string[] | null
          recommended_actions?: readonly string[] | null
          investigation_status?: string
          investigated_by?: string | null
          investigated_at?: string | null
          resolution_notes?: string | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anomaly_id?: string
          organization_id?: string | null
          user_id?: string | null
          anomaly_type?: string
          severity?: string
          anomaly_score?: number
          detection_method?: string
          baseline_data?: Record<string, number>
          anomalous_data?: Record<string, number>
          affected_metrics?: readonly string[] | null
          recommended_actions?: readonly string[] | null
          investigation_status?: string
          investigated_by?: string | null
          investigated_at?: string | null
          resolution_notes?: string | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      prediction_accuracy_logs: {
        Row: {
          id: string
          model_name: string
          model_version: string
          evaluation_date: string
          metric_name: string
          metric_value: number
          sample_size: number
          test_set_description: string | null
          model_parameters: ModelParameters | null
          performance_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          model_name: string
          model_version: string
          evaluation_date: string
          metric_name: string
          metric_value: number
          sample_size: number
          test_set_description?: string | null
          model_parameters?: ModelParameters | null
          performance_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          model_name?: string
          model_version?: string
          evaluation_date?: string
          metric_name?: string
          metric_value?: number
          sample_size?: number
          test_set_description?: string | null
          model_parameters?: ModelParameters | null
          performance_notes?: string | null
          created_at?: string
        }
      }
      intelligence_insights: {
        Row: {
          id: string
          insight_id: string
          source_id: string | null
          insight_type: string
          title: string
          content: string
          relevance_score: number
          impact_level: string
          affected_organizations: string[] | null
          tags: string[] | null
          external_references: ExternalReferences | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          insight_id: string
          source_id?: string | null
          insight_type: string
          title: string
          content: string
          relevance_score?: number
          impact_level?: string
          affected_organizations?: string[] | null
          tags?: string[] | null
          external_references?: ExternalReferences | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          insight_id?: string
          source_id?: string | null
          insight_type?: string
          title?: string
          content?: string
          relevance_score?: number
          impact_level?: string
          affected_organizations?: string[] | null
          tags?: string[] | null
          external_references?: ExternalReferences | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      compliance_templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          regulation_type: string
          category: string
          frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
          priority: 'low' | 'medium' | 'high' | 'critical'
          workflow_steps: WorkflowSteps
          requirements: string[] | null
          required_roles: string[] | null
          reminder_schedule: ReminderSchedule | null
          escalation_rules: EscalationRules | null
          is_active: boolean
          is_system_template: boolean
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          regulation_type: string
          category?: string
          frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          workflow_steps?: WorkflowSteps
          requirements?: string[] | null
          required_roles?: string[] | null
          reminder_schedule?: ReminderSchedule | null
          escalation_rules?: EscalationRules | null
          is_active?: boolean
          is_system_template?: boolean
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          regulation_type?: string
          category?: string
          frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          workflow_steps?: WorkflowSteps
          requirements?: string[] | null
          required_roles?: string[] | null
          reminder_schedule?: ReminderSchedule | null
          escalation_rules?: EscalationRules | null
          is_active?: boolean
          is_system_template?: boolean
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      compliance_calendar: {
        Row: {
          id: string
          organization_id: string
          template_id: string | null
          title: string
          description: string | null
          regulation_type: string
          category: string
          due_date: string
          start_date: string | null
          business_days_notice: number | null
          is_recurring: boolean
          recurrence_pattern: Record<string, unknown> | null
          next_occurrence: string | null
          priority: 'low' | 'medium' | 'high' | 'critical'
          is_mandatory: boolean
          regulatory_authority: string | null
          status: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'postponed'
          completion_date: string | null
          postponed_until: string | null
          tags: string[] | null
          external_reference: string | null
          metadata: AssetMetadata | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          template_id?: string | null
          title: string
          description?: string | null
          regulation_type: string
          category?: string
          due_date: string
          start_date?: string | null
          business_days_notice?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Record<string, unknown> | null
          next_occurrence?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical'
          is_mandatory?: boolean
          regulatory_authority?: string | null
          status?: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'postponed'
          completion_date?: string | null
          postponed_until?: string | null
          tags?: string[] | null
          external_reference?: string | null
          metadata?: AssetMetadata | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          template_id?: string | null
          title?: string
          description?: string | null
          regulation_type?: string
          category?: string
          due_date?: string
          start_date?: string | null
          business_days_notice?: number | null
          is_recurring?: boolean
          recurrence_pattern?: Record<string, unknown> | null
          next_occurrence?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical'
          is_mandatory?: boolean
          regulatory_authority?: string | null
          status?: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'postponed'
          completion_date?: string | null
          postponed_until?: string | null
          tags?: string[] | null
          external_reference?: string | null
          metadata?: AssetMetadata | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      notification_workflows: {
        Row: {
          id: string
          organization_id: string
          template_id: string | null
          calendar_entry_id: string | null
          name: string
          description: string | null
          workflow_type: string
          steps: Record<string, unknown>
          current_step: number
          total_steps: number
          status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'on_hold'
          progress_percentage: number | null
          started_at: string | null
          completed_at: string | null
          due_date: string | null
          estimated_completion_date: string | null
          assigned_to: string | null
          assigned_role: string | null
          escalated_to: string | null
          escalation_level: number | null
          auto_advance_steps: boolean | null
          require_all_participants: boolean | null
          allow_parallel_execution: boolean | null
          send_reminders: boolean | null
          reminder_frequency_hours: number | null
          compliance_notes: string | null
          risk_level: 'low' | 'medium' | 'high' | 'critical' | null
          metadata: AssetMetadata | null
          tags: string[] | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          template_id?: string | null
          calendar_entry_id?: string | null
          name: string
          description?: string | null
          workflow_type?: string
          steps?: Record<string, unknown>
          current_step?: number
          total_steps?: number
          status?: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'on_hold'
          progress_percentage?: number | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          assigned_to?: string | null
          assigned_role?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          auto_advance_steps?: boolean | null
          require_all_participants?: boolean | null
          allow_parallel_execution?: boolean | null
          send_reminders?: boolean | null
          reminder_frequency_hours?: number | null
          compliance_notes?: string | null
          risk_level?: 'low' | 'medium' | 'high' | 'critical' | null
          metadata?: AssetMetadata | null
          tags?: string[] | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          template_id?: string | null
          calendar_entry_id?: string | null
          name?: string
          description?: string | null
          workflow_type?: string
          steps?: Record<string, unknown>
          current_step?: number
          total_steps?: number
          status?: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'on_hold'
          progress_percentage?: number | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          estimated_completion_date?: string | null
          assigned_to?: string | null
          assigned_role?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          auto_advance_steps?: boolean | null
          require_all_participants?: boolean | null
          allow_parallel_execution?: boolean | null
          send_reminders?: boolean | null
          reminder_frequency_hours?: number | null
          compliance_notes?: string | null
          risk_level?: 'low' | 'medium' | 'high' | 'critical' | null
          metadata?: AssetMetadata | null
          tags?: string[] | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      compliance_participants: {
        Row: {
          id: string
          workflow_id: string
          user_id: string | null
          participant_type: 'assignee' | 'approver' | 'reviewer' | 'observer' | 'escalation_contact'
          role_in_workflow: string | null
          step_number: number | null
          is_required: boolean | null
          can_delegate: boolean | null
          status: 'assigned' | 'in_progress' | 'completed' | 'declined' | 'escalated' | 'delegated' | 'removed'
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          declined_at: string | null
          completion_notes: string | null
          completion_evidence_url: string | null
          requires_evidence: boolean | null
          delegated_to: string | null
          delegated_at: string | null
          delegation_reason: string | null
          last_notified_at: string | null
          notification_count: number | null
          metadata: AssetMetadata | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id?: string | null
          participant_type?: 'assignee' | 'approver' | 'reviewer' | 'observer' | 'escalation_contact'
          role_in_workflow?: string | null
          step_number?: number | null
          is_required?: boolean | null
          can_delegate?: boolean | null
          status?: 'assigned' | 'in_progress' | 'completed' | 'declined' | 'escalated' | 'delegated' | 'removed'
          assigned_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          declined_at?: string | null
          completion_notes?: string | null
          completion_evidence_url?: string | null
          requires_evidence?: boolean | null
          delegated_to?: string | null
          delegated_at?: string | null
          delegation_reason?: string | null
          last_notified_at?: string | null
          notification_count?: number | null
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string | null
          participant_type?: 'assignee' | 'approver' | 'reviewer' | 'observer' | 'escalation_contact'
          role_in_workflow?: string | null
          step_number?: number | null
          is_required?: boolean | null
          can_delegate?: boolean | null
          status?: 'assigned' | 'in_progress' | 'completed' | 'declined' | 'escalated' | 'delegated' | 'removed'
          assigned_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          declined_at?: string | null
          completion_notes?: string | null
          completion_evidence_url?: string | null
          requires_evidence?: boolean | null
          delegated_to?: string | null
          delegated_at?: string | null
          delegation_reason?: string | null
          last_notified_at?: string | null
          notification_count?: number | null
          metadata?: AssetMetadata | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_audit_log: {
        Row: {
          id: string
          organization_id: string | null
          event_type: string
          event_category: string
          action: string
          workflow_id: string | null
          notification_id: string | null
          template_id: string | null
          calendar_entry_id: string | null
          actor_user_id: string | null
          target_user_id: string | null
          event_description: string
          event_data: Record<string, unknown> | null
          previous_state: Record<string, unknown> | null
          new_state: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          request_id: string | null
          retention_required_until: string | null
          is_legally_significant: boolean | null
          regulatory_context: string | null
          processing_time_ms: number | null
          outcome: 'success' | 'failure' | 'warning' | 'partial_success' | 'timeout' | 'cancelled'
          error_message: string | null
          error_code: string | null
          event_timestamp: string
          search_vector: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          event_type: string
          event_category?: string
          action: string
          workflow_id?: string | null
          notification_id?: string | null
          template_id?: string | null
          calendar_entry_id?: string | null
          actor_user_id?: string | null
          target_user_id?: string | null
          event_description: string
          event_data?: Record<string, unknown> | null
          previous_state?: Record<string, unknown> | null
          new_state?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          request_id?: string | null
          retention_required_until?: string | null
          is_legally_significant?: boolean | null
          regulatory_context?: string | null
          processing_time_ms?: number | null
          outcome?: 'success' | 'failure' | 'warning' | 'partial_success' | 'timeout' | 'cancelled'
          error_message?: string | null
          error_code?: string | null
          event_timestamp?: string
          search_vector?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          event_type?: string
          event_category?: string
          action?: string
          workflow_id?: string | null
          notification_id?: string | null
          template_id?: string | null
          calendar_entry_id?: string | null
          actor_user_id?: string | null
          target_user_id?: string | null
          event_description?: string
          event_data?: Record<string, unknown> | null
          previous_state?: Record<string, unknown> | null
          new_state?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          request_id?: string | null
          retention_required_until?: string | null
          is_legally_significant?: boolean | null
          regulatory_context?: string | null
          processing_time_ms?: number | null
          outcome?: 'success' | 'failure' | 'warning' | 'partial_success' | 'timeout' | 'cancelled'
          error_message?: string | null
          error_code?: string | null
          event_timestamp?: string
          search_vector?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'pending' | 'director' | 'admin' | 'viewer'
      user_status: 'pending' | 'approved' | 'rejected'
      pack_status: 'processing' | 'ready' | 'failed'
      organization_role: 'owner' | 'admin' | 'member' | 'viewer'
      membership_status: 'active' | 'suspended' | 'pending_activation'
      invitation_status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
      organization_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
      audit_event_type: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_event' | 'compliance' | 'user_action'
      audit_severity: 'low' | 'medium' | 'high' | 'critical'
      audit_outcome: 'success' | 'failure' | 'error' | 'blocked' | 'warning' | 'partial_success' | 'timeout' | 'cancelled'
      plan_type: 'free' | 'professional' | 'enterprise'
      otp_purpose: 'first_login' | 'password_reset'
      meeting_type: 'agm' | 'board' | 'committee' | 'other'
      meeting_status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
      meeting_visibility: 'public' | 'organization' | 'private'
      recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
      agenda_item_type: 'presentation' | 'discussion' | 'decision' | 'information' | 'break'
      attendee_role: 'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator'
      rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response'
      attendance_status: 'not_attended' | 'attended' | 'partially_attended' | 'late' | 'left_early'
      document_category: 'agenda' | 'supporting' | 'presentation' | 'report' | 'minutes' | 'action_items' | 'reference'
      notification_type: 'invitation' | 'reminder' | 'agenda_update' | 'document_added' | 'meeting_cancelled' | 'meeting_rescheduled' | 'rsvp_reminder' | 'pre_meeting_task'
      notification_status: 'pending' | 'sent' | 'failed' | 'cancelled'
      notification_channel: 'email' | 'push' | 'sms' | 'in_app'
      chat_conversation_type: 'direct' | 'group' | 'vault_group'
      chat_message_type: 'text' | 'file' | 'image' | 'system' | 'reply' | 'forward'
      chat_participant_role: 'admin' | 'moderator' | 'member'
      chat_participant_status: 'active' | 'muted' | 'left' | 'removed'
      chat_delivery_status: 'sent' | 'delivered' | 'read' | 'failed'
      calendar_event_type: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday'
      calendar_event_status: 'confirmed' | 'tentative' | 'cancelled'
      calendar_view_type: 'day' | 'week' | 'month' | 'year' | 'agenda'
      calendar_reminder_type: 'email' | 'push' | 'in_app' | 'sms'
      calendar_attendee_role: 'organizer' | 'presenter' | 'participant' | 'optional'
      calendar_rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative'
      calendar_subscription_type: 'user' | 'organization' | 'external'
      calendar_permission_level: 'read' | 'write' | 'admin'
      calendar_subscription_status: 'active' | 'paused' | 'cancelled'
      calendar_availability_type: 'available' | 'busy' | 'tentative'
      notification_type_general: 'system' | 'meeting' | 'chat' | 'asset' | 'vault' | 'user' | 'security' | 'reminder'
      notification_priority: 'low' | 'medium' | 'high' | 'critical'
      notification_status_general: 'unread' | 'read' | 'archived' | 'dismissed'
      compliance_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'
      compliance_status: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'postponed'
      workflow_status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'on_hold'
      participant_type: 'assignee' | 'approver' | 'reviewer' | 'observer' | 'escalation_contact'
      participant_status: 'assigned' | 'in_progress' | 'completed' | 'declined' | 'escalated' | 'delegated' | 'removed'
      deadline_type: 'soft' | 'hard' | 'regulatory'
      acknowledgment_method: 'click' | 'digital_signature' | 'email_reply'
      risk_level: 'low' | 'medium' | 'high' | 'critical'
    }
  }
}

// ============================================================================
// CONVENIENCE TYPE EXPORTS FOR OTHER AGENTS
// ============================================================================

// Database table row types for direct access
export type DatabaseUser = Database['public']['Tables']['users']['Row'];
export type DatabaseOrganization = Database['public']['Tables']['organizations']['Row'];
export type DatabaseBoard = Database['public']['Tables']['boards']['Row'];
export type DatabaseMeeting = Database['public']['Tables']['meetings']['Row'];
export type DatabaseCommittee = Database['public']['Tables']['committees']['Row'];

// Database insert types for form handling
export type DatabaseUserInsert = Database['public']['Tables']['users']['Insert'];
export type DatabaseOrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type DatabaseBoardInsert = Database['public']['Tables']['boards']['Insert'];

// Database update types for editing
export type DatabaseUserUpdate = Database['public']['Tables']['users']['Update'];
export type DatabaseOrganizationUpdate = Database['public']['Tables']['organizations']['Update'];
export type DatabaseBoardUpdate = Database['public']['Tables']['boards']['Update'];

// Placeholder types for missing tables (assets and vaults not yet in schema)
export type DatabaseAsset = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  updated_at: string;
};

export type DatabaseVault = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type DatabaseAssetInsert = Omit<DatabaseAsset, 'created_at' | 'updated_at'>;
export type DatabaseVaultInsert = Omit<DatabaseVault, 'created_at' | 'updated_at'>;
export type DatabaseAssetUpdate = Partial<Omit<DatabaseAsset, 'id' | 'created_at' | 'updated_at'>>;
export type DatabaseVaultUpdate = Partial<Omit<DatabaseVault, 'id' | 'created_at' | 'updated_at'>>;

// Utility types for common patterns
export type DatabaseTableName = keyof Database['public']['Tables'];
export type DatabaseRow<T extends DatabaseTableName> = Database['public']['Tables'][T]['Row'];
export type DatabaseInsert<T extends DatabaseTableName> = Database['public']['Tables'][T]['Insert'];
export type DatabaseUpdate<T extends DatabaseTableName> = Database['public']['Tables'][T]['Update'];

// Common status enums
export type UserRole = 'pending' | 'director' | 'admin' | 'viewer';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'suspended' | 'pending_activation';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';
export type MeetingType = 'agm' | 'board' | 'committee' | 'other';
export type MeetingStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type Visibility = 'public' | 'organization' | 'private';
export type BoardType = 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board';
export type BoardStatus = 'active' | 'inactive' | 'dissolved';
export type CommitteeType = 'audit' | 'compensation' | 'governance' | 'risk' | 'nomination' | 'strategy' | 'technology' | 'investment' | 'ethics' | 'executive' | 'other';
export type CommitteeStatus = 'active' | 'inactive' | 'dissolved' | 'temporary';

// Type guards for runtime type checking
export const isUserRole = (value: string): value is UserRole => 
  ['pending', 'director', 'admin', 'viewer'].includes(value);

export const isUserStatus = (value: string): value is UserStatus => 
  ['pending', 'approved', 'rejected'].includes(value);

export const isMemberRole = (value: string): value is MemberRole => 
  ['owner', 'admin', 'member', 'viewer'].includes(value);

export const isMeetingType = (value: string): value is MeetingType => 
  ['agm', 'board', 'committee', 'other'].includes(value);

export const isVisibility = (value: string): value is Visibility => 
  ['public', 'organization', 'private'].includes(value);

// Helper functions for type-safe operations
export const createBrandedId = <T extends string>(id: string, _brand: T): Brand<string, T> => 
  id as Brand<string, T>;

export const extractId = <T extends string>(brandedId: Brand<string, T>): string => 
  brandedId as string;
