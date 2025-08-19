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
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          details: any | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          details?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
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
    }
  }
}