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
          metadata?: any | null
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
          metadata?: any | null
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
          content: any
          page_number: number
          position: any
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
          metadata: any
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
          content: any
          page_number: number
          position: any
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
          metadata?: any
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
          content?: any
          page_number?: number
          position?: any
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
          metadata?: any
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
          settings: any
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
          settings?: any
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
          settings?: any
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
          template_data: any
          scheduled_send_at: string
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          response_data: any
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
          template_data?: any
          scheduled_send_at: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          response_data?: any
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
          template_data?: any
          scheduled_send_at?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          response_data?: any
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
          template_data: any
          default_duration_minutes: number
          default_settings: any
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
          template_data: any
          default_duration_minutes?: number
          default_settings?: any
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
          template_data?: any
          default_duration_minutes?: number
          default_settings?: any
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
          metadata: any
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
          metadata?: any
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
          metadata?: any
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
          recurrence_rule: any | null
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
          recurrence_rule?: any | null
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
          recurrence_rule?: any | null
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
          settings: any
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
          settings?: any
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
          settings?: any
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
          settings: any
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
          settings?: any
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
          settings?: any
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
          equity_compensation: any | null
          meetings_attended: number
          meetings_total: number
          attendance_rate: number | null
          expertise_areas: string[]
          skills: any | null
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
          equity_compensation?: any | null
          meetings_attended?: number
          meetings_total?: number
          expertise_areas?: string[]
          skills?: any | null
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
          equity_compensation?: any | null
          meetings_attended?: number
          meetings_total?: number
          expertise_areas?: string[]
          skills?: any | null
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
          metadata: any | null
          scheduled_for: string | null
          delivered_at: string | null
          read_at: string | null
          archived_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
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
          metadata?: any | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          archived_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
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
          metadata?: any | null
          scheduled_for?: string | null
          delivered_at?: string | null
          read_at?: string | null
          archived_at?: string | null
          expires_at?: string | null
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
    }
  }
}
