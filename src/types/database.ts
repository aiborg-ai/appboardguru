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
          settings: any
          compliance_settings: any
          billing_settings: any
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
          settings?: any
          compliance_settings?: any
          billing_settings?: any
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
          settings?: any
          compliance_settings?: any
          billing_settings?: any
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          custom_permissions: any
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
          custom_permissions?: any
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
          custom_permissions?: any
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
          metadata: any | null
          archived_at: string | null
          auto_archive_date: string | null
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
          metadata?: any | null
          archived_at?: string | null
          auto_archive_date?: string | null
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
          metadata?: any | null
          archived_at?: string | null
          auto_archive_date?: string | null
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
          details: any | null
          metadata: any | null
          severity: 'low' | 'medium' | 'high' | 'critical'
          outcome: 'success' | 'failure' | 'error' | 'blocked'
          risk_score: number | null
          ip_address: string | null
          user_agent: string | null
          device_fingerprint: string | null
          geolocation: any | null
          http_method: string | null
          endpoint: string | null
          request_headers: any | null
          response_status: number | null
          response_time_ms: number | null
          old_values: any | null
          new_values: any | null
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
          details?: any | null
          metadata?: any | null
          severity?: 'low' | 'medium' | 'high' | 'critical'
          outcome: 'success' | 'failure' | 'error' | 'blocked'
          risk_score?: number | null
          ip_address?: string | null
          user_agent?: string | null
          device_fingerprint?: string | null
          geolocation?: any | null
          http_method?: string | null
          endpoint?: string | null
          request_headers?: any | null
          response_status?: number | null
          response_time_ms?: number | null
          old_values?: any | null
          new_values?: any | null
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
          details?: any | null
          metadata?: any | null
          severity?: 'low' | 'medium' | 'high' | 'critical'
          outcome?: 'success' | 'failure' | 'error' | 'blocked'
          risk_score?: number | null
          ip_address?: string | null
          user_agent?: string | null
          device_fingerprint?: string | null
          geolocation?: any | null
          http_method?: string | null
          endpoint?: string | null
          request_headers?: any | null
          response_status?: number | null
          response_time_ms?: number | null
          old_values?: any | null
          new_values?: any | null
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
      audit_outcome: 'success' | 'failure' | 'error' | 'blocked'
      plan_type: 'free' | 'professional' | 'enterprise'
      otp_purpose: 'first_login' | 'password_reset'
    }
  }
}