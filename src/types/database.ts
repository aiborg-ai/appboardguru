export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          executed_at: string | null
          name: string
        }
        Insert: {
          executed_at?: string | null
          name: string
        }
        Update: {
          executed_at?: string | null
          name?: string
        }
        Relationships: []
      }
      ai_chat_exports: {
        Row: {
          export_type: string | null
          exported_at: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          export_type?: string | null
          exported_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          export_type?: string | null
          exported_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_exports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          id: string
          is_help_query: boolean | null
          is_web_search: boolean | null
          metadata: Json | null
          role: string
          session_id: string | null
          timestamp: string | null
          token_usage: Json | null
        }
        Insert: {
          content: string
          id?: string
          is_help_query?: boolean | null
          is_web_search?: boolean | null
          metadata?: Json | null
          role: string
          session_id?: string | null
          timestamp?: string | null
          token_usage?: Json | null
        }
        Update: {
          content?: string
          id?: string
          is_help_query?: boolean | null
          is_web_search?: boolean | null
          metadata?: Json | null
          role?: string
          session_id?: string | null
          timestamp?: string | null
          token_usage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_scope_references: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string | null
          metadata: Json | null
          reference_id: string | null
          reference_table: string | null
          scope_id: string
          scope_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          reference_id?: string | null
          reference_table?: string | null
          scope_id: string
          scope_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          reference_id?: string | null
          reference_table?: string | null
          scope_id?: string
          scope_type?: string
        }
        Relationships: []
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          scope_id: string | null
          scope_label: string | null
          scope_metadata: Json | null
          scope_type: string
          session_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          scope_id?: string | null
          scope_label?: string | null
          scope_metadata?: Json | null
          scope_type: string
          session_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          scope_id?: string | null
          scope_label?: string | null
          scope_metadata?: Json | null
          scope_type?: string
          session_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_user_settings: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          id: string
          local_llm_endpoint: string | null
          max_tokens: number | null
          preferred_model: string | null
          settings_json: Json | null
          temperature: number | null
          updated_at: string | null
          use_local_llm: boolean | null
          user_id: string | null
          web_search_enabled: boolean | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          local_llm_endpoint?: string | null
          max_tokens?: number | null
          preferred_model?: string | null
          settings_json?: Json | null
          temperature?: number | null
          updated_at?: string | null
          use_local_llm?: boolean | null
          user_id?: string | null
          web_search_enabled?: boolean | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          local_llm_endpoint?: string | null
          max_tokens?: number | null
          preferred_model?: string | null
          settings_json?: Json | null
          temperature?: number | null
          updated_at?: string | null
          use_local_llm?: boolean | null
          user_id?: string | null
          web_search_enabled?: boolean | null
        }
        Relationships: []
      }
      asset_activity_log: {
        Row: {
          activity_details: Json | null
          activity_type: string
          asset_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_details?: Json | null
          activity_type: string
          asset_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string
          asset_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_activity_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_comments: {
        Row: {
          asset_id: string | null
          comment_text: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          asset_id?: string | null
          comment_text: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          asset_id?: string | null
          comment_text?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "asset_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          folder_path: string
          id: string
          is_shared: boolean | null
          name: string
          owner_id: string | null
          parent_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_path: string
          id?: string
          is_shared?: boolean | null
          name: string
          owner_id?: string | null
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_path?: string
          id?: string
          is_shared?: boolean | null
          name?: string
          owner_id?: string | null
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_shared_links: {
        Row: {
          allow_download: boolean | null
          allow_preview: boolean | null
          asset_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          download_count: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          max_downloads: number | null
          password_hash: string | null
          require_email: boolean | null
          share_token: string
        }
        Insert: {
          allow_download?: boolean | null
          allow_preview?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_downloads?: number | null
          password_hash?: string | null
          require_email?: boolean | null
          share_token: string
        }
        Update: {
          allow_download?: boolean | null
          allow_preview?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_downloads?: number | null
          password_hash?: string | null
          require_email?: boolean | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_shared_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_shares: {
        Row: {
          accessed_at: string | null
          asset_id: string | null
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          permission_level: string | null
          share_message: string | null
          shared_by_user_id: string | null
          shared_with_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          accessed_at?: string | null
          asset_id?: string | null
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permission_level?: string | null
          share_message?: string | null
          shared_by_user_id?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accessed_at?: string | null
          asset_id?: string | null
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          permission_level?: string | null
          share_message?: string | null
          shared_by_user_id?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_shares_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          name: string
          usage_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          name: string
          usage_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_path: string | null
          id: string
          is_deleted: boolean | null
          is_processed: boolean | null
          last_accessed_at: string | null
          mime_type: string
          original_file_name: string
          owner_id: string | null
          preview_url: string | null
          processing_error: string | null
          processing_status: string | null
          storage_bucket: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_path?: string | null
          id?: string
          is_deleted?: boolean | null
          is_processed?: boolean | null
          last_accessed_at?: string | null
          mime_type: string
          original_file_name: string
          owner_id?: string | null
          preview_url?: string | null
          processing_error?: string | null
          processing_status?: string | null
          storage_bucket?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_path?: string | null
          id?: string
          is_deleted?: boolean | null
          is_processed?: boolean | null
          last_accessed_at?: string | null
          mime_type?: string
          original_file_name?: string
          owner_id?: string | null
          preview_url?: string | null
          processing_error?: string | null
          processing_status?: string | null
          storage_bucket?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
      activity_alert_instances: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string
          priority: string
          rule_id: string
          rule_name: string
          triggered_at: string
          updated_at: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id: string
          priority: string
          rule_id: string
          rule_name: string
          triggered_at: string
          updated_at?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string
          priority?: string
          rule_id?: string
          rule_name?: string
          triggered_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_alert_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_alert_rules: {
        Row: {
          actions: Json
          condition: Json
          created_at: string | null
          created_by: string
          description: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          priority: string
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          condition: Json
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          priority: string
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          condition?: Json
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          priority?: string
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          correlation_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          source: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          correlation_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          source?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          correlation_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          source?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_pack_permissions: {
        Row: {
          id: string
          board_pack_id: string
          granted_to_user_id: string | null
          granted_to_role: string | null
          granted_by: string
          organization_id: string
          can_view: boolean | null
          can_download: boolean | null
          granted_at: string | null
          expires_at: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          id?: string
          board_pack_id: string
          granted_to_user_id?: string | null
          granted_to_role?: string | null
          granted_by: string
          organization_id: string
          can_view?: boolean | null
          can_download?: boolean | null
          granted_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          id?: string
          board_pack_id?: string
          granted_to_user_id?: string | null
          granted_to_role?: string | null
          granted_by?: string
          organization_id?: string
          can_view?: boolean | null
          can_download?: boolean | null
          granted_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_pack_permissions_board_pack_id_fkey"
            columns: ["board_pack_id"]
            isOneToOne: false
            referencedRelation: "board_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      board_packs: {
        Row: {
          audio_summary_url: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          organization_id: string | null
          status: Database["public"]["Enums"]["pack_status"] | null
          summary: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          watermark_applied: boolean | null
        }
        Insert: {
          audio_summary_url?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["pack_status"] | null
          summary?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          watermark_applied?: boolean | null
        }
        Update: {
          audio_summary_url?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["pack_status"] | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          watermark_applied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "board_packs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_packs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_attendees: {
        Row: {
          can_edit: boolean | null
          can_invite_others: boolean | null
          email: string
          event_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string | null
          rsvp_note: string | null
          rsvp_responded_at: string | null
          rsvp_status: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_invite_others?: boolean | null
          email: string
          event_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          rsvp_note?: string | null
          rsvp_responded_at?: string | null
          rsvp_status?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_invite_others?: boolean | null
          email?: string
          event_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          rsvp_note?: string | null
          rsvp_responded_at?: string | null
          rsvp_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          category: string | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_datetime: string
          event_type: string | null
          id: string
          is_recurring: boolean | null
          location: string | null
          organization_id: string | null
          parent_event_id: string | null
          recurrence_rule: Json | null
          start_datetime: string
          status: string | null
          tags: string[] | null
          timezone: string | null
          title: string
          updated_at: string | null
          user_id: string
          virtual_meeting_url: string | null
          visibility: string | null
        }
        Insert: {
          all_day?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_datetime: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          organization_id?: string | null
          parent_event_id?: string | null
          recurrence_rule?: Json | null
          start_datetime: string
          status?: string | null
          tags?: string[] | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          virtual_meeting_url?: string | null
          visibility?: string | null
        }
        Update: {
          all_day?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_datetime?: string
          event_type?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          organization_id?: string | null
          parent_event_id?: string | null
          recurrence_rule?: Json | null
          start_datetime?: string
          status?: string | null
          tags?: string[] | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          virtual_meeting_url?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_reminders: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_sent: boolean | null
          minutes_before: number
          reminder_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_sent?: boolean | null
          minutes_before: number
          reminder_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_sent?: boolean | null
          minutes_before?: number
          reminder_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_views: {
        Row: {
          compact_view: boolean | null
          created_at: string | null
          default_view: string | null
          id: string
          show_declined_events: boolean | null
          show_weekends: boolean | null
          time_format: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          week_start_day: number | null
          work_days: number[] | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          compact_view?: boolean | null
          created_at?: string | null
          default_view?: string | null
          id?: string
          show_declined_events?: boolean | null
          show_weekends?: boolean | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          week_start_day?: number | null
          work_days?: number[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          compact_view?: boolean | null
          created_at?: string | null
          default_view?: string | null
          id?: string
          show_declined_events?: boolean | null
          show_weekends?: boolean | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          week_start_day?: number | null
          work_days?: number[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      dropdown_option_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dropdown_options: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          metadata: Json | null
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          metadata?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          metadata?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropdown_options_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dropdown_option_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fyi_context_history: {
        Row: {
          confidence_score: number | null
          context_text: string
          context_type: string | null
          created_at: string | null
          duration_seconds: number | null
          extracted_entities: string[] | null
          id: string
          page_url: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          context_text: string
          context_type?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          extracted_entities?: string[] | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          context_text?: string
          context_type?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          extracted_entities?: string[] | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fyi_insights_cache: {
        Row: {
          context_entity: string | null
          created_at: string | null
          expires_at: string
          id: string
          insight_id: string
          published_at: string
          raw_data: Json | null
          relevance_score: number | null
          source: string
          summary: string | null
          tags: string[] | null
          title: string
          type: string
          url: string
        }
        Insert: {
          context_entity?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          insight_id: string
          published_at: string
          raw_data?: Json | null
          relevance_score?: number | null
          source: string
          summary?: string | null
          tags?: string[] | null
          title: string
          type: string
          url: string
        }
        Update: {
          context_entity?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          insight_id?: string
          published_at?: string
          raw_data?: Json | null
          relevance_score?: number | null
          source?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      fyi_user_interactions: {
        Row: {
          action: string
          context_at_time: string | null
          created_at: string | null
          entities_at_time: string[] | null
          id: string
          insight_id: string
          relevance_feedback: number | null
          user_id: string
        }
        Insert: {
          action: string
          context_at_time?: string | null
          created_at?: string | null
          entities_at_time?: string[] | null
          id?: string
          insight_id: string
          relevance_feedback?: number | null
          user_id: string
        }
        Update: {
          action?: string
          context_at_time?: string | null
          created_at?: string | null
          entities_at_time?: string[] | null
          id?: string
          insight_id?: string
          relevance_feedback?: number | null
          user_id?: string
        }
        Relationships: []
      }
      fyi_user_preferences: {
        Row: {
          auto_refresh_enabled: boolean | null
          blocked_sources: string[] | null
          created_at: string | null
          default_relevance_threshold: number | null
          enabled: boolean | null
          id: string
          max_insights_displayed: number | null
          notification_enabled: boolean | null
          organization_id: string | null
          preferences: Json | null
          preferred_sources: string[] | null
          refresh_interval_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_refresh_enabled?: boolean | null
          blocked_sources?: string[] | null
          created_at?: string | null
          default_relevance_threshold?: number | null
          enabled?: boolean | null
          id?: string
          max_insights_displayed?: number | null
          notification_enabled?: boolean | null
          organization_id?: string | null
          preferences?: Json | null
          preferred_sources?: string[] | null
          refresh_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_refresh_enabled?: boolean | null
          blocked_sources?: string[] | null
          created_at?: string | null
          default_relevance_threshold?: number | null
          enabled?: boolean | null
          id?: string
          max_insights_displayed?: number | null
          notification_enabled?: boolean | null
          organization_id?: string | null
          preferences?: Json | null
          preferred_sources?: string[] | null
          refresh_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fyi_user_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          archived_at: string | null
          category: string
          color: string | null
          compliance_type: string | null
          created_at: string | null
          delivered_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          priority: string | null
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          scheduled_for: string | null
          sender_id: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          archived_at?: string | null
          category: string
          color?: string | null
          compliance_type?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          archived_at?: string | null
          category?: string
          color?: string | null
          compliance_type?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features: {
        Row: {
          advanced_permissions: boolean | null
          ai_summarization: boolean | null
          api_access: boolean | null
          audit_logs: boolean | null
          current_board_packs: number | null
          current_storage_gb: number | null
          max_board_packs: number | null
          max_file_size_mb: number | null
          max_storage_gb: number | null
          organization_id: string
          plan_type: string | null
          sso_enabled: boolean | null
          subscription_ends_at: string | null
          updated_at: string | null
          white_label: boolean | null
        }
        Insert: {
          advanced_permissions?: boolean | null
          ai_summarization?: boolean | null
          api_access?: boolean | null
          audit_logs?: boolean | null
          current_board_packs?: number | null
          current_storage_gb?: number | null
          max_board_packs?: number | null
          max_file_size_mb?: number | null
          max_storage_gb?: number | null
          organization_id: string
          plan_type?: string | null
          sso_enabled?: boolean | null
          subscription_ends_at?: string | null
          updated_at?: string | null
          white_label?: boolean | null
        }
        Update: {
          advanced_permissions?: boolean | null
          ai_summarization?: boolean | null
          api_access?: boolean | null
          audit_logs?: boolean | null
          current_board_packs?: number | null
          current_storage_gb?: number | null
          max_board_packs?: number | null
          max_file_size_mb?: number | null
          max_storage_gb?: number | null
          organization_id?: string
          plan_type?: string | null
          sso_enabled?: boolean | null
          subscription_ends_at?: string | null
          updated_at?: string | null
          white_label?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          accepted_ip: unknown | null
          attempt_count: number | null
          created_at: string | null
          created_ip: unknown | null
          device_fingerprint: string | null
          email: string
          email_verification_code: string
          id: string
          invitation_token: string
          invited_by: string
          max_attempts: number | null
          organization_id: string
          personal_message: string | null
          role: Database["public"]["Enums"]["organization_role"]
          status: Database["public"]["Enums"]["invitation_status"] | null
          token_expires_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_ip?: unknown | null
          attempt_count?: number | null
          created_at?: string | null
          created_ip?: unknown | null
          device_fingerprint?: string | null
          email: string
          email_verification_code?: string
          id?: string
          invitation_token?: string
          invited_by: string
          max_attempts?: number | null
          organization_id: string
          personal_message?: string | null
          role: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token_expires_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_ip?: unknown | null
          attempt_count?: number | null
          created_at?: string | null
          created_ip?: unknown | null
          device_fingerprint?: string | null
          email?: string
          email_verification_code?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          max_attempts?: number | null
          organization_id?: string
          personal_message?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          access_count: number | null
          approved_by: string | null
          custom_permissions: Json | null
          id: string
          invitation_accepted_ip: unknown | null
          invited_by: string | null
          is_primary: boolean | null
          joined_at: string | null
          last_accessed: string | null
          last_login_ip: unknown | null
          organization_id: string
          receive_notifications: boolean | null
          role: Database["public"]["Enums"]["organization_role"]
          status: Database["public"]["Enums"]["membership_status"] | null
          suspicious_activity_count: number | null
          user_id: string
        }
        Insert: {
          access_count?: number | null
          approved_by?: string | null
          custom_permissions?: Json | null
          id?: string
          invitation_accepted_ip?: unknown | null
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          last_accessed?: string | null
          last_login_ip?: unknown | null
          organization_id: string
          receive_notifications?: boolean | null
          role?: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["membership_status"] | null
          suspicious_activity_count?: number | null
          user_id: string
        }
        Update: {
          access_count?: number | null
          approved_by?: string | null
          custom_permissions?: Json | null
          id?: string
          invitation_accepted_ip?: unknown | null
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          last_accessed?: string | null
          last_login_ip?: unknown | null
          organization_id?: string
          receive_notifications?: boolean | null
          role?: Database["public"]["Enums"]["organization_role"]
          status?: Database["public"]["Enums"]["membership_status"] | null
          suspicious_activity_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_settings: Json | null
          compliance_settings: Json | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deletion_scheduled_for: string | null
          description: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          organization_size: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          billing_settings?: Json | null
          compliance_settings?: Json | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          organization_size?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          billing_settings?: Json | null
          compliance_settings?: Json | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          organization_size?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          approval_token: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          position: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          token_expires_at: string | null
        }
        Insert: {
          approval_token?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          position?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          token_expires_at?: string | null
        }
        Update: {
          approval_token?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          position?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          password_set: boolean | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          password_set?: boolean | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          password_set?: boolean | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vault_assets: {
        Row: {
          added_at: string | null
          added_by_user_id: string
          asset_id: string
          display_order: number | null
          download_count: number | null
          download_permissions: string | null
          folder_path: string | null
          id: string
          is_featured: boolean | null
          is_required_reading: boolean | null
          organization_id: string
          vault_id: string
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          added_at?: string | null
          added_by_user_id: string
          asset_id: string
          display_order?: number | null
          download_count?: number | null
          download_permissions?: string | null
          folder_path?: string | null
          id?: string
          is_featured?: boolean | null
          is_required_reading?: boolean | null
          organization_id: string
          vault_id: string
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          added_at?: string | null
          added_by_user_id?: string
          asset_id?: string
          display_order?: number | null
          download_count?: number | null
          download_permissions?: string | null
          folder_path?: string | null
          id?: string
          is_featured?: boolean | null
          is_required_reading?: boolean | null
          organization_id?: string
          vault_id?: string
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_assets_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string
          role: string | null
          status: string | null
          user_id: string
          vault_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id: string
          role?: string | null
          status?: string | null
          user_id: string
          vault_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          status?: string | null
          user_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_members_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      vaults: {
        Row: {
          asset_count: number | null
          category: Database["public"]["Enums"]["vault_category"] | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          location: string | null
          meeting_date: string | null
          member_count: number | null
          name: string
          organization_id: string
          priority: Database["public"]["Enums"]["vault_priority"] | null
          status: Database["public"]["Enums"]["vault_status"] | null
          updated_at: string | null
        }
        Insert: {
          asset_count?: number | null
          category?: Database["public"]["Enums"]["vault_category"] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          member_count?: number | null
          name: string
          organization_id: string
          priority?: Database["public"]["Enums"]["vault_priority"] | null
          status?: Database["public"]["Enums"]["vault_status"] | null
          updated_at?: string | null
        }
        Update: {
          asset_count?: number | null
          category?: Database["public"]["Enums"]["vault_category"] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          member_count?: number | null
          name?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["vault_priority"] | null
          status?: Database["public"]["Enums"]["vault_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      // Voice & Audio Related Tables
      voice_annotations: {
        Row: {
          id: string
          asset_id: string | null
          user_id: string
          annotation_text: string | null
          audio_url: string | null
          position_seconds: number | null
          duration_seconds: number | null
          confidence_score: number | null
          created_at: string | null
          updated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          asset_id?: string | null
          user_id: string
          annotation_text?: string | null
          audio_url?: string | null
          position_seconds?: number | null
          duration_seconds?: number | null
          confidence_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          asset_id?: string | null
          user_id?: string
          annotation_text?: string | null
          audio_url?: string | null
          position_seconds?: number | null
          duration_seconds?: number | null
          confidence_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      voice_annotation_replies: {
        Row: {
          id: string
          annotation_id: string
          user_id: string
          reply_text: string
          audio_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          annotation_id: string
          user_id: string
          reply_text: string
          audio_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string
          user_id?: string
          reply_text?: string
          audio_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_assistant_sessions: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          session_name: string | null
          start_time: string
          end_time: string | null
          voice_profile_id: string | null
          commands_processed: number | null
          insights_generated: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          session_name?: string | null
          start_time: string
          end_time?: string | null
          voice_profile_id?: string | null
          commands_processed?: number | null
          insights_generated?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          session_name?: string | null
          start_time?: string
          end_time?: string | null
          voice_profile_id?: string | null
          commands_processed?: number | null
          insights_generated?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_authentication_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          authentication_result: string
          confidence_score: number | null
          voice_sample_url: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          authentication_result: string
          confidence_score?: number | null
          voice_sample_url?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          authentication_result?: string
          confidence_score?: number | null
          voice_sample_url?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_biometric_profiles: {
        Row: {
          id: string
          user_id: string
          profile_data: Json
          enrollment_status: string
          last_updated: string | null
          samples_count: number | null
          accuracy_score: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          profile_data: Json
          enrollment_status: string
          last_updated?: string | null
          samples_count?: number | null
          accuracy_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          profile_data?: Json
          enrollment_status?: string
          last_updated?: string | null
          samples_count?: number | null
          accuracy_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_collaboration_analytics: {
        Row: {
          id: string
          session_id: string
          participant_count: number | null
          total_duration: number | null
          interaction_metrics: Json | null
          sentiment_analysis: Json | null
          key_topics: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          participant_count?: number | null
          total_duration?: number | null
          interaction_metrics?: Json | null
          sentiment_analysis?: Json | null
          key_topics?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          participant_count?: number | null
          total_duration?: number | null
          interaction_metrics?: Json | null
          sentiment_analysis?: Json | null
          key_topics?: string[] | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_collaboration_sessions: {
        Row: {
          id: string
          session_name: string
          host_user_id: string
          organization_id: string | null
          start_time: string
          end_time: string | null
          participant_count: number | null
          recording_url: string | null
          transcript_url: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_name: string
          host_user_id: string
          organization_id?: string | null
          start_time: string
          end_time?: string | null
          participant_count?: number | null
          recording_url?: string | null
          transcript_url?: string | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_name?: string
          host_user_id?: string
          organization_id?: string | null
          start_time?: string
          end_time?: string | null
          participant_count?: number | null
          recording_url?: string | null
          transcript_url?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_integrations: {
        Row: {
          id: string
          user_id: string
          integration_type: string
          config: Json
          status: string
          last_sync: string | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          integration_type: string
          config: Json
          status: string
          last_sync?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          integration_type?: string
          config?: Json
          status?: string
          last_sync?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_learning_data: {
        Row: {
          id: string
          user_id: string
          interaction_type: string
          voice_sample: string | null
          feedback_score: number | null
          improvement_suggestions: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          interaction_type: string
          voice_sample?: string | null
          feedback_score?: number | null
          improvement_suggestions?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          interaction_type?: string
          voice_sample?: string | null
          feedback_score?: number | null
          improvement_suggestions?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_session_invitations: {
        Row: {
          id: string
          session_id: string
          invitee_email: string
          invitee_user_id: string | null
          invited_by: string
          status: string
          invitation_token: string
          expires_at: string
          accepted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          invitee_email: string
          invitee_user_id?: string | null
          invited_by: string
          status: string
          invitation_token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          invited_by?: string
          status?: string
          invitation_token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_thread_messages: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          message_type: string
          content: string | null
          audio_url: string | null
          duration_seconds: number | null
          replied_to_message_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          message_type: string
          content?: string | null
          audio_url?: string | null
          duration_seconds?: number | null
          replied_to_message_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          message_type?: string
          content?: string | null
          audio_url?: string | null
          duration_seconds?: number | null
          replied_to_message_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_threads: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string
          organization_id: string | null
          participant_count: number | null
          message_count: number | null
          last_activity: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by: string
          organization_id?: string | null
          participant_count?: number | null
          message_count?: number | null
          last_activity?: string | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string
          organization_id?: string | null
          participant_count?: number | null
          message_count?: number | null
          last_activity?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_training_profiles: {
        Row: {
          id: string
          user_id: string
          profile_name: string
          training_data: Json
          accuracy_metrics: Json | null
          last_training_session: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          profile_name: string
          training_data: Json
          accuracy_metrics?: Json | null
          last_training_session?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          profile_name?: string
          training_data?: Json
          accuracy_metrics?: Json | null
          last_training_session?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_training_samples: {
        Row: {
          id: string
          profile_id: string
          sample_text: string
          audio_url: string
          quality_score: number | null
          duration_seconds: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          sample_text: string
          audio_url: string
          quality_score?: number | null
          duration_seconds?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          sample_text?: string
          audio_url?: string
          quality_score?: number | null
          duration_seconds?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_training_sessions: {
        Row: {
          id: string
          user_id: string
          session_name: string
          start_time: string
          end_time: string | null
          samples_recorded: number | null
          completion_percentage: number | null
          session_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_name: string
          start_time: string
          end_time?: string | null
          samples_recorded?: number | null
          completion_percentage?: number | null
          session_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_name?: string
          start_time?: string
          end_time?: string | null
          samples_recorded?: number | null
          completion_percentage?: number | null
          session_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_translations: {
        Row: {
          id: string
          session_id: string | null
          source_language: string
          target_language: string
          original_text: string
          translated_text: string
          confidence_score: number | null
          audio_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          source_language: string
          target_language: string
          original_text: string
          translated_text: string
          confidence_score?: number | null
          audio_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          source_language?: string
          target_language?: string
          original_text?: string
          translated_text?: string
          confidence_score?: number | null
          audio_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      voice_translation_sessions: {
        Row: {
          id: string
          user_id: string
          source_language: string
          target_language: string
          start_time: string
          end_time: string | null
          translation_count: number | null
          session_quality: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          source_language: string
          target_language: string
          start_time: string
          end_time?: string | null
          translation_count?: number | null
          session_quality?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          source_language?: string
          target_language?: string
          start_time?: string
          end_time?: string | null
          translation_count?: number | null
          session_quality?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_workflow_triggers: {
        Row: {
          id: string
          workflow_name: string
          trigger_phrase: string
          user_id: string
          organization_id: string | null
          action_config: Json
          is_active: boolean | null
          trigger_count: number | null
          last_triggered: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workflow_name: string
          trigger_phrase: string
          user_id: string
          organization_id?: string | null
          action_config: Json
          is_active?: boolean | null
          trigger_count?: number | null
          last_triggered?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workflow_name?: string
          trigger_phrase?: string
          user_id?: string
          organization_id?: string | null
          action_config?: Json
          is_active?: boolean | null
          trigger_count?: number | null
          last_triggered?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      // Activity & Analytics Tables
      activity_analytics: {
        Row: {
          id: string
          organization_id: string
          date: string
          metric_type: string
          metric_value: number
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          date: string
          metric_type: string
          metric_value: number
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          date?: string
          metric_type?: string
          metric_value?: number
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      activity_insights: {
        Row: {
          id: string
          organization_id: string
          insight_type: string
          title: string
          description: string
          data: Json
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          insight_type: string
          title: string
          description: string
          data: Json
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          insight_type?: string
          title?: string
          description?: string
          data?: Json
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      activity_search_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          search_criteria: Json
          created_by: string
          organization_id: string | null
          is_public: boolean | null
          usage_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          search_criteria: Json
          created_by: string
          organization_id?: string | null
          is_public?: boolean | null
          usage_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          search_criteria?: Json
          created_by?: string
          organization_id?: string | null
          is_public?: boolean | null
          usage_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      activity_sessions: {
        Row: {
          id: string
          user_id: string
          session_start: string
          session_end: string | null
          activity_count: number | null
          page_views: Json | null
          interactions: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_start: string
          session_end?: string | null
          activity_count?: number | null
          page_views?: Json | null
          interactions?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_start?: string
          session_end?: string | null
          activity_count?: number | null
          page_views?: Json | null
          interactions?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      activity_snapshots: {
        Row: {
          id: string
          organization_id: string
          snapshot_date: string
          total_users: number | null
          active_users: number | null
          total_assets: number | null
          total_activity: number | null
          key_metrics: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          snapshot_date: string
          total_users?: number | null
          active_users?: number | null
          total_assets?: number | null
          total_activity?: number | null
          key_metrics?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          snapshot_date?: string
          total_users?: number | null
          active_users?: number | null
          total_assets?: number | null
          total_activity?: number | null
          key_metrics?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      activity_webhooks: {
        Row: {
          id: string
          organization_id: string
          webhook_url: string
          event_types: string[]
          secret_key: string | null
          is_active: boolean | null
          last_triggered: string | null
          error_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          webhook_url: string
          event_types: string[]
          secret_key?: string | null
          is_active?: boolean | null
          last_triggered?: string | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          webhook_url?: string
          event_types?: string[]
          secret_key?: string | null
          is_active?: boolean | null
          last_triggered?: string | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cached_analytics: {
        Row: {
          id: string
          cache_key: string
          data: Json
          expires_at: string
          organization_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          cache_key: string
          data: Json
          expires_at: string
          organization_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          cache_key?: string
          data?: Json
          expires_at?: string
          organization_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_activity_feed: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          title: string
          description: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          title: string
          description?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          title?: string
          description?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      // Chat & Messaging Tables
      chat_conversations: {
        Row: {
          id: string
          title: string | null
          created_by: string
          organization_id: string | null
          participant_count: number | null
          last_message_at: string | null
          is_archived: boolean | null
          conversation_type: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          created_by: string
          organization_id?: string | null
          participant_count?: number | null
          last_message_at?: string | null
          is_archived?: boolean | null
          conversation_type: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          created_by?: string
          organization_id?: string | null
          participant_count?: number | null
          last_message_at?: string | null
          is_archived?: boolean | null
          conversation_type?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          message_type: string
          content: string | null
          attachments: Json | null
          replied_to_message_id: string | null
          is_edited: boolean | null
          is_deleted: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          message_type: string
          content?: string | null
          attachments?: Json | null
          replied_to_message_id?: string | null
          is_edited?: boolean | null
          is_deleted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          message_type?: string
          content?: string | null
          attachments?: Json | null
          replied_to_message_id?: string | null
          is_edited?: boolean | null
          is_deleted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: string
          joined_at: string | null
          last_read_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: string
          joined_at?: string | null
          last_read_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: string
          joined_at?: string | null
          last_read_at?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          message_count: number | null
          session_metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          started_at: string
          ended_at?: string | null
          message_count?: number | null
          session_metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          message_count?: number | null
          session_metadata?: Json | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          id: string
          to_email: string
          from_email: string | null
          subject: string
          template_name: string | null
          status: string
          sent_at: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          to_email: string
          from_email?: string | null
          subject: string
          template_name?: string | null
          status: string
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          to_email?: string
          from_email?: string | null
          subject?: string
          template_name?: string | null
          status?: string
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      // Meeting Related Tables
      meetings: {
        Row: {
          id: string
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          location: string | null
          virtual_meeting_url: string | null
          created_by: string
          organization_id: string | null
          status: string
          meeting_type: string | null
          agenda: Json | null
          attachments: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_time: string
          end_time?: string | null
          location?: string | null
          virtual_meeting_url?: string | null
          created_by: string
          organization_id?: string | null
          status: string
          meeting_type?: string | null
          agenda?: Json | null
          attachments?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          location?: string | null
          virtual_meeting_url?: string | null
          created_by?: string
          organization_id?: string | null
          status?: string
          meeting_type?: string | null
          agenda?: Json | null
          attachments?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_actionables: {
        Row: {
          id: string
          meeting_id: string
          title: string
          description: string | null
          assigned_to: string | null
          due_date: string | null
          priority: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          title: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: string | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_preparations: {
        Row: {
          id: string
          meeting_id: string
          preparation_type: string
          title: string
          description: string | null
          assigned_to: string | null
          due_date: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          preparation_type: string
          title: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          preparation_type?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_resolutions: {
        Row: {
          id: string
          meeting_id: string
          resolution_title: string
          resolution_text: string
          moved_by: string | null
          seconded_by: string | null
          vote_result: string | null
          vote_count: Json | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          resolution_title: string
          resolution_text: string
          moved_by?: string | null
          seconded_by?: string | null
          vote_result?: string | null
          vote_count?: Json | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          resolution_title?: string
          resolution_text?: string
          moved_by?: string | null
          seconded_by?: string | null
          vote_result?: string | null
          vote_count?: Json | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_transcriptions: {
        Row: {
          id: string
          meeting_id: string
          speaker_name: string | null
          speaker_id: string | null
          text_content: string
          start_time: number | null
          end_time: number | null
          confidence_score: number | null
          is_action_item: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          speaker_name?: string | null
          speaker_id?: string | null
          text_content: string
          start_time?: number | null
          end_time?: number | null
          confidence_score?: number | null
          is_action_item?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          speaker_name?: string | null
          speaker_id?: string | null
          text_content?: string
          start_time?: number | null
          end_time?: number | null
          confidence_score?: number | null
          is_action_item?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      // Board & Committee Tables
      boards: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string
          board_type: string | null
          status: string
          established_date: string | null
          member_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id: string
          board_type?: string | null
          status: string
          established_date?: string | null
          member_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string
          board_type?: string | null
          status?: string
          established_date?: string | null
          member_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      board_members: {
        Row: {
          id: string
          board_id: string
          user_id: string
          role: string
          appointed_date: string | null
          term_end_date: string | null
          status: string
          voting_rights: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          role: string
          appointed_date?: string | null
          term_end_date?: string | null
          status: string
          voting_rights?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          role?: string
          appointed_date?: string | null
          term_end_date?: string | null
          status?: string
          voting_rights?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      board_member_invitations: {
        Row: {
          id: string
          board_id: string
          email: string
          role: string
          invited_by: string
          invitation_token: string
          expires_at: string
          status: string
          accepted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          email: string
          role: string
          invited_by: string
          invitation_token: string
          expires_at: string
          status: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          email?: string
          role?: string
          invited_by?: string
          invitation_token?: string
          expires_at?: string
          status?: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      committees: {
        Row: {
          id: string
          name: string
          description: string | null
          board_id: string | null
          organization_id: string
          committee_type: string | null
          chair_id: string | null
          status: string
          member_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          board_id?: string | null
          organization_id: string
          committee_type?: string | null
          chair_id?: string | null
          status: string
          member_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          board_id?: string | null
          organization_id?: string
          committee_type?: string | null
          chair_id?: string | null
          status?: string
          member_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      committee_members: {
        Row: {
          id: string
          committee_id: string
          user_id: string
          role: string
          appointed_date: string | null
          term_end_date: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          committee_id: string
          user_id: string
          role: string
          appointed_date?: string | null
          term_end_date?: string | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          committee_id?: string
          user_id?: string
          role?: string
          appointed_date?: string | null
          term_end_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      boardmate_profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          profile_type: string
          profile_data: Json
          expertise_areas: string[] | null
          availability_status: string
          last_active: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          profile_type: string
          profile_data: Json
          expertise_areas?: string[] | null
          availability_status: string
          last_active?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          profile_type?: string
          profile_data?: Json
          expertise_areas?: string[] | null
          availability_status?: string
          last_active?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      board_benchmarks: {
        Row: {
          id: string
          organization_id: string
          benchmark_type: string
          metric_name: string
          baseline_value: number | null
          target_value: number | null
          current_value: number | null
          measurement_date: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          benchmark_type: string
          metric_name: string
          baseline_value?: number | null
          target_value?: number | null
          current_value?: number | null
          measurement_date: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          benchmark_type?: string
          metric_name?: string
          baseline_value?: number | null
          target_value?: number | null
          current_value?: number | null
          measurement_date?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      // Asset Related Tables  
      asset_annotations: {
        Row: {
          id: string
          asset_id: string
          user_id: string
          annotation_type: string
          content: string
          position_data: Json | null
          page_number: number | null
          highlighted_text: string | null
          color: string | null
          opacity: number | null
          is_private: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          user_id: string
          annotation_type: string
          content: string
          position_data?: Json | null
          page_number?: number | null
          highlighted_text?: string | null
          color?: string | null
          opacity?: number | null
          is_private?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          user_id?: string
          annotation_type?: string
          content?: string
          position_data?: Json | null
          page_number?: number | null
          highlighted_text?: string | null
          color?: string | null
          opacity?: number | null
          is_private?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      // Document Management Tables
      document_annotations: {
        Row: {
          id: string
          document_id: string
          user_id: string
          annotation_type: string
          content: string
          position_data: Json | null
          highlighted_text: string | null
          page_number: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          annotation_type: string
          content: string
          position_data?: Json | null
          highlighted_text?: string | null
          page_number?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          annotation_type?: string
          content?: string
          position_data?: Json | null
          highlighted_text?: string | null
          page_number?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_annotation_replies: {
        Row: {
          id: string
          annotation_id: string
          user_id: string
          content: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          annotation_id: string
          user_id: string
          content: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string
          user_id?: string
          content?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_podcasts: {
        Row: {
          id: string
          document_id: string
          title: string
          description: string | null
          audio_url: string
          duration_seconds: number | null
          transcript: string | null
          generated_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          title: string
          description?: string | null
          audio_url: string
          duration_seconds?: number | null
          transcript?: string | null
          generated_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          title?: string
          description?: string | null
          audio_url?: string
          duration_seconds?: number | null
          transcript?: string | null
          generated_by?: string
          created_at?: string | null
        }
        Relationships: []
      }
      document_search_cache: {
        Row: {
          id: string
          asset_id: string
          query: string
          results: Json
          user_id: string
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          query: string
          results: Json
          user_id: string
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          query?: string
          results?: Json
          user_id?: string
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      document_summaries: {
        Row: {
          id: string
          asset_id: string
          title: string
          key_points: string[]
          word_count: number | null
          user_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          title: string
          key_points: string[]
          word_count?: number | null
          user_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          title?: string
          key_points?: string[]
          word_count?: number | null
          user_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_table_of_contents: {
        Row: {
          id: string
          asset_id: string
          content: Json
          user_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          content: Json
          user_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          content?: Json
          user_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      annotations: {
        Row: {
          id: string
          content: string
          user_id: string
          asset_id: string | null
          annotation_type: string
          position_data: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          asset_id?: string | null
          annotation_type: string
          position_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          asset_id?: string | null
          annotation_type?: string
          position_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      // Compliance & Workflow Tables
      compliance_calendar: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          due_date: string
          frequency: string
          next_due_date: string | null
          assigned_to: string | null
          status: string
          priority: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          due_date: string
          frequency: string
          next_due_date?: string | null
          assigned_to?: string | null
          status: string
          priority: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          due_date?: string
          frequency?: string
          next_due_date?: string | null
          assigned_to?: string | null
          status?: string
          priority?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_participants: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          participant_type: string
          status: string
          assigned_at: string | null
          completed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          participant_type: string
          status: string
          assigned_at?: string | null
          completed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          participant_type?: string
          status?: string
          assigned_at?: string | null
          completed_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      compliance_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          template_type: string
          content: Json
          organization_id: string | null
          is_active: boolean | null
          created_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_type: string
          content: Json
          organization_id?: string | null
          is_active?: boolean | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_type?: string
          content?: Json
          organization_id?: string | null
          is_active?: boolean | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_workflows: {
        Row: {
          id: string
          template_id: string | null
          title: string
          description: string | null
          organization_id: string
          status: string
          started_at: string | null
          due_date: string | null
          completed_at: string | null
          workflow_data: Json | null
          created_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          title: string
          description?: string | null
          organization_id: string
          status: string
          started_at?: string | null
          due_date?: string | null
          completed_at?: string | null
          workflow_data?: Json | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          title?: string
          description?: string | null
          organization_id?: string
          status?: string
          started_at?: string | null
          due_date?: string | null
          completed_at?: string | null
          workflow_data?: Json | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_workflows: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_conditions: Json
          workflow_steps: Json
          is_active: boolean | null
          organization_id: string
          created_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_conditions: Json
          workflow_steps: Json
          is_active?: boolean | null
          organization_id: string
          created_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_conditions?: Json
          workflow_steps?: Json
          is_active?: boolean | null
          organization_id?: string
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          execution_context: Json | null
          status: string
          started_at: string
          completed_at: string | null
          error_message: string | null
          execution_log: Json | null
        }
        Insert: {
          id?: string
          workflow_id: string
          execution_context?: Json | null
          status: string
          started_at: string
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
        }
        Update: {
          id?: string
          workflow_id?: string
          execution_context?: Json | null
          status?: string
          started_at?: string
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
        }
        Relationships: []
      }
      // User & Profile Tables
      user_profiles: {
        Row: {
          id: string
          user_id: string
          bio: string | null
          expertise: string[] | null
          preferences: Json | null
          social_links: Json | null
          privacy_settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bio?: string | null
          expertise?: string[] | null
          preferences?: Json | null
          social_links?: Json | null
          privacy_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bio?: string | null
          expertise?: string[] | null
          preferences?: Json | null
          social_links?: Json | null
          privacy_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_language_preferences: {
        Row: {
          id: string
          user_id: string
          primary_language: string
          secondary_languages: string[] | null
          translation_enabled: boolean | null
          ui_language: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          primary_language: string
          secondary_languages?: string[] | null
          translation_enabled?: boolean | null
          ui_language?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          primary_language?: string
          secondary_languages?: string[] | null
          translation_enabled?: boolean | null
          ui_language?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_behavior_metrics: {
        Row: {
          id: string
          user_id: string
          metric_type: string
          metric_value: number
          context_data: Json | null
          recorded_at: string
          organization_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          metric_type: string
          metric_value: number
          context_data?: Json | null
          recorded_at: string
          organization_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          metric_type?: string
          metric_value?: number
          context_data?: Json | null
          recorded_at?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
          id: string
          user_id: string
          recommendation_type: string
          title: string
          description: string
          action_data: Json | null
          priority_score: number | null
          is_dismissed: boolean | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_type: string
          title: string
          description: string
          action_data?: Json | null
          priority_score?: number | null
          is_dismissed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          recommendation_type?: string
          title?: string
          description?: string
          action_data?: Json | null
          priority_score?: number | null
          is_dismissed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      // Prediction & AI Tables
      predicted_notifications: {
        Row: {
          id: string
          user_id: string
          prediction_type: string
          predicted_content: Json
          prediction_data: Json | null
          confidence_score: number
          trigger_conditions: Json | null
          is_sent: boolean | null
          sent_at: string | null
          feedback_received: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          prediction_type: string
          predicted_content: Json
          prediction_data?: Json | null
          confidence_score: number
          trigger_conditions?: Json | null
          is_sent?: boolean | null
          sent_at?: string | null
          feedback_received?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          prediction_type?: string
          predicted_content?: Json
          prediction_data?: Json | null
          confidence_score?: number
          trigger_conditions?: Json | null
          is_sent?: boolean | null
          sent_at?: string | null
          feedback_received?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      notification_patterns: {
        Row: {
          id: string
          pattern_name: string
          pattern_data: Json
          confidence_score: number | null
          usage_count: number | null
          last_used: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pattern_name: string
          pattern_data: Json
          confidence_score?: number | null
          usage_count?: number | null
          last_used?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pattern_name?: string
          pattern_data?: Json
          confidence_score?: number | null
          usage_count?: number | null
          last_used?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      anomaly_detections: {
        Row: {
          id: string
          organization_id: string
          anomaly_type: string
          description: string
          severity: string
          detected_at: string
          data_snapshot: Json | null
          is_resolved: boolean | null
          resolved_at: string | null
          resolution_notes: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          anomaly_type: string
          description: string
          severity: string
          detected_at: string
          data_snapshot?: Json | null
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolution_notes?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          anomaly_type?: string
          description?: string
          severity?: string
          detected_at?: string
          data_snapshot?: Json | null
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolution_notes?: string | null
        }
        Relationships: []
      }
      intelligence_insights: {
        Row: {
          id: string
          source_id: string
          insight_type: string
          title: string
          content: string
          confidence_score: number | null
          tags: string[] | null
          published_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          source_id: string
          insight_type: string
          title: string
          content: string
          confidence_score?: number | null
          tags?: string[] | null
          published_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          source_id?: string
          insight_type?: string
          title?: string
          content?: string
          confidence_score?: number | null
          tags?: string[] | null
          published_at?: string
          created_at?: string | null
        }
        Relationships: []
      }
      intelligence_sources: {
        Row: {
          id: string
          name: string
          source_type: string
          config: Json
          is_active: boolean | null
          last_sync: string | null
          error_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          source_type: string
          config: Json
          is_active?: boolean | null
          last_sync?: string | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          source_type?: string
          config?: Json
          is_active?: boolean | null
          last_sync?: string | null
          error_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proactive_insights: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          insight_type: string
          title: string
          description: string
          actionable_items: Json | null
          priority: string
          urgency: string | null
          confidence: number | null
          relevance_score: number | null
          insight_data: string | null
          scheduled_for: string | null
          is_read: boolean | null
          acknowledged_at: string | null
          dismissed_at: string | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          insight_type: string
          title: string
          description: string
          actionable_items?: Json | null
          priority: string
          urgency?: string | null
          confidence?: number | null
          relevance_score?: number | null
          insight_data?: string | null
          scheduled_for?: string | null
          is_read?: boolean | null
          acknowledged_at?: string | null
          dismissed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          insight_type?: string
          title?: string
          description?: string
          actionable_items?: Json | null
          priority?: string
          urgency?: string | null
          confidence?: number | null
          relevance_score?: number | null
          insight_data?: string | null
          scheduled_for?: string | null
          is_read?: boolean | null
          acknowledged_at?: string | null
          dismissed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proactive_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          id: string
          organization_id: string
          insight_type: string
          title: string
          content: string
          confidence_score: number | null
          data_sources: Json | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          insight_type: string
          title: string
          content: string
          confidence_score?: number | null
          data_sources?: Json | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          insight_type?: string
          title?: string
          content?: string
          confidence_score?: number | null
          data_sources?: Json | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      // Other Tables
      annotation_mentions: {
        Row: {
          id: string
          annotation_id: string
          mentioned_user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          annotation_id: string
          mentioned_user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string
          mentioned_user_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
      annotation_replies: {
        Row: {
          id: string
          annotation_id: string
          user_id: string
          content: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          annotation_id: string
          user_id: string
          content: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          annotation_id?: string
          user_id?: string
          content?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_availability: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_subscriptions: {
        Row: {
          id: string
          user_id: string
          calendar_name: string
          external_url: string | null
          sync_frequency: string
          last_synced: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          calendar_name: string
          external_url?: string | null
          sync_frequency: string
          last_synced?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          calendar_name?: string
          external_url?: string | null
          sync_frequency?: string
          last_synced?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_terminology: {
        Row: {
          id: string
          organization_id: string
          term: string
          definition: string
          category: string | null
          created_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          term: string
          definition: string
          category?: string | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          term?: string
          definition?: string
          category?: string | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_activity_summary: {
        Row: {
          id: string
          organization_id: string
          summary_date: string
          total_activities: number | null
          top_activities: Json | null
          user_engagement: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          summary_date: string
          total_activities?: number | null
          top_activities?: Json | null
          user_engagement?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          summary_date?: string
          total_activities?: number | null
          top_activities?: Json | null
          user_engagement?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          id: string
          user_id: string | null
          feedback_type: string
          content: string
          rating: number | null
          metadata: Json | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          feedback_type: string
          content: string
          rating?: number | null
          metadata?: Json | null
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          feedback_type?: string
          content?: string
          rating?: number | null
          metadata?: Json | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          flag_name: string
          description: string | null
          is_enabled: boolean
          target_audience: Json | null
          rollout_percentage: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flag_name: string
          description?: string | null
          is_enabled: boolean
          target_audience?: Json | null
          rollout_percentage?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flag_name?: string
          description?: string | null
          is_enabled?: boolean
          target_audience?: Json | null
          rollout_percentage?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_metrics: {
        Row: {
          id: string
          organization_id: string
          metric_type: string
          metric_value: number
          currency: string | null
          reporting_period: string
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          metric_type: string
          metric_value: number
          currency?: string | null
          reporting_period: string
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          metric_type?: string
          metric_value?: number
          currency?: string | null
          reporting_period?: string
          created_at?: string | null
        }
        Relationships: []
      }
      notification_audit_log: {
        Row: {
          id: string
          notification_id: string
          action: string
          performed_by: string | null
          performed_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          notification_id: string
          action: string
          performed_by?: string | null
          performed_at: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          notification_id?: string
          action?: string
          performed_by?: string | null
          performed_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          expires_at: string
          is_used: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          expires_at: string
          is_used?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          expires_at?: string
          is_used?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          id: string
          organization_id: string
          assessment_type: string
          risk_level: string
          description: string
          mitigation_plan: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          assessment_type: string
          risk_level: string
          description: string
          mitigation_plan?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          assessment_type?: string
          risk_level?: string
          description?: string
          mitigation_plan?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          id: string
          version: string
          name: string
          applied_at: string
          checksum: string | null
        }
        Insert: {
          id?: string
          version: string
          name: string
          applied_at: string
          checksum?: string | null
        }
        Update: {
          id?: string
          version?: string
          name?: string
          applied_at?: string
          checksum?: string | null
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          id: string
          user_id: string
          query_text: string
          results_count: number | null
          search_context: Json | null
          executed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query_text: string
          results_count?: number | null
          search_context?: Json | null
          executed_at: string
        }
        Update: {
          id?: string
          user_id?: string
          query_text?: string
          results_count?: number | null
          search_context?: Json | null
          executed_at?: string
        }
        Relationships: []
      }
      translation_metrics: {
        Row: {
          id: string
          session_id: string | null
          source_language: string
          target_language: string
          word_count: number | null
          accuracy_score: number | null
          processing_time_ms: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          source_language: string
          target_language: string
          word_count?: number | null
          accuracy_score?: number | null
          processing_time_ms?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          source_language?: string
          target_language?: string
          word_count?: number | null
          accuracy_score?: number | null
          processing_time_ms?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      asset_access_analytics: {
        Row: {
          id: string
          asset_id: string
          user_id: string
          access_type: string
          access_duration: number | null
          device_info: Json | null
          accessed_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          user_id: string
          access_type: string
          access_duration?: number | null
          device_info?: Json | null
          accessed_at: string
        }
        Update: {
          id?: string
          asset_id?: string
          user_id?: string
          access_type?: string
          access_duration?: number | null
          device_info?: Json | null
          accessed_at?: string
        }
        Relationships: []
      }
      asset_search_metadata: {
        Row: {
          id: string
          asset_id: string
          search_text: string
          keywords: string[] | null
          indexed_at: string
          last_updated: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          search_text: string
          keywords?: string[] | null
          indexed_at: string
          last_updated?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          search_text?: string
          keywords?: string[] | null
          indexed_at?: string
          last_updated?: string | null
        }
        Relationships: []
      }
      user_asset_presence: {
        Row: {
          id: string
          user_id: string
          asset_id: string
          presence_status: string
          last_seen: string | null
          cursor_position: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          asset_id: string
          presence_status: string
          last_seen?: string | null
          cursor_position?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          asset_id?: string
          presence_status?: string
          last_seen?: string | null
          cursor_position?: Json | null
        }
        Relationships: []
      }
      vault_activity_log: {
        Row: {
          id: string
          vault_id: string
          user_id: string
          activity_type: string
          activity_details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vault_id: string
          user_id: string
          activity_type: string
          activity_details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vault_id?: string
          user_id?: string
          activity_type?: string
          activity_details?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      vault_invitations: {
        Row: {
          id: string
          vault_id: string
          email: string
          invited_by: string
          role: string
          status: string
          invitation_token: string
          expires_at: string
          accepted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vault_id: string
          email: string
          invited_by: string
          role: string
          status: string
          invitation_token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vault_id?: string
          email?: string
          invited_by?: string
          role?: string
          status?: string
          invitation_token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never;
    }
    Functions: {
      cleanup_expired_fyi_insights: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_default_ai_scopes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_user_record: {
        Args: {
          user_email: string
          user_full_name?: string
          user_id: string
          user_password_set?: boolean
        }
        Returns: boolean
      }
      get_user_accessible_assets: {
        Args: { p_user_id: string }
        Returns: {
          asset_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          is_owner: boolean
          permission_level: string
          title: string
        }[]
      }
      get_user_fyi_preferences: {
        Args: { p_org_id?: string; p_user_id: string }
        Returns: {
          auto_refresh_enabled: boolean
          blocked_sources: string[]
          default_relevance_threshold: number
          enabled: boolean
          max_insights_displayed: number
          notification_enabled: boolean
          preferences: Json
          preferred_sources: string[]
          refresh_interval_minutes: number
        }[]
      }
      is_organization_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      log_asset_activity: {
        Args: {
          p_activity_type: string
          p_asset_id: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      user_organization_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
    }
    Enums: {
      invitation_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "expired"
        | "revoked"
      membership_status: "active" | "suspended" | "pending_activation"
      organization_role: "owner" | "admin" | "member" | "viewer"
      pack_status: "processing" | "ready" | "failed"
      user_role: "pending" | "director" | "admin" | "viewer"
      user_status: "pending" | "approved" | "rejected"
      vault_category:
        | "board_meeting"
        | "committee_meeting"
        | "strategic_planning"
        | "audit_committee"
        | "other"
      vault_priority: "low" | "medium" | "high" | "urgent"
      vault_status: "draft" | "active" | "archived" | "expired" | "cancelled"
      compliance_frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "ad_hoc"
      compliance_status: "scheduled" | "active" | "in_progress" | "completed" | "overdue" | "cancelled" | "postponed"
      workflow_status: "pending" | "in_progress" | "waiting_approval" | "completed" | "failed" | "cancelled" | "on_hold"
      participant_type: "assignee" | "approver" | "reviewer" | "observer" | "escalation_contact"
      participant_status: "assigned" | "in_progress" | "completed" | "declined" | "escalated" | "delegated" | "removed"
      deadline_type: "soft" | "hard" | "regulatory"
      acknowledgment_method: "click" | "digital_signature" | "email_reply"
      audit_outcome: "success" | "failure" | "error" | "blocked" | "warning" | "partial_success" | "timeout" | "cancelled"
      audit_event_type: "authentication" | "authorization" | "data_access" | "data_modification" | "security_breach" | "policy_violation" | "system_action" | "admin_action" | "user_action" | "api_call" | "file_upload" | "file_download" | "login" | "logout" | "password_change" | "account_creation" | "account_deletion" | "permission_change" | "compliance"
      audit_severity: "low" | "medium" | "high" | "critical"
      risk_level: "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never;
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invitation_status: [
        "pending",
        "accepted",
        "rejected",
        "expired",
        "revoked",
      ],
      membership_status: ["active", "suspended", "pending_activation"],
      organization_role: ["owner", "admin", "member", "viewer"],
      pack_status: ["processing", "ready", "failed"],
      user_role: ["pending", "director", "admin", "viewer"],
      user_status: ["pending", "approved", "rejected"],
      vault_category: [
        "board_meeting",
        "committee_meeting",
        "strategic_planning",
        "audit_committee",
        "other",
      ],
      vault_priority: ["low", "medium", "high", "urgent"],
      vault_status: ["draft", "active", "archived", "expired", "cancelled"],
      compliance_frequency: ["daily", "weekly", "monthly", "quarterly", "annual", "ad_hoc"],
      compliance_status: ["scheduled", "active", "in_progress", "completed", "overdue", "cancelled", "postponed"],
      workflow_status: ["pending", "in_progress", "waiting_approval", "completed", "failed", "cancelled", "on_hold"],
      participant_type: ["assignee", "approver", "reviewer", "observer", "escalation_contact"],
      participant_status: ["assigned", "in_progress", "completed", "declined", "escalated", "delegated", "removed"],
      deadline_type: ["soft", "hard", "regulatory"],
      acknowledgment_method: ["click", "digital_signature", "email_reply"],
      audit_outcome: ["success", "failure", "error", "blocked", "warning", "partial_success", "timeout", "cancelled"],
      audit_event_type: ["authentication", "authorization", "data_access", "data_modification", "security_breach", "policy_violation", "system_action", "admin_action", "user_action", "api_call", "file_upload", "file_download", "login", "logout", "password_change", "account_creation", "account_deletion", "permission_change", "compliance"],
      audit_severity: ["low", "medium", "high", "critical"],
      risk_level: ["low", "medium", "high", "critical"],
    },
  },
} as const

export type UserId = string
export type OrganizationId = string
export type AssetId = string
export type VaultId = string
export type BoardId = string
export type NotificationId = string
export type TemplateId = string
export type EventId = string

export type UserRole = Database['public']['Enums']['user_role']
export type UserStatus = Database['public']['Enums']['user_status']
export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
export type MemberRole = Database['public']['Enums']['organization_role']
export type MemberStatus = Database['public']['Enums']['membership_status']
export type InvitationStatus = Database['public']['Enums']['invitation_status']
export type MeetingType = string
export type MeetingStatus = string
