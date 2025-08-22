import { BaseRepository } from './base.repository'
import type { Database } from '../../types/database'
import type { TypedSupabaseClient } from '../../types/api'

type BoardPack = Database['public']['Tables']['board_packs']['Row']
type BoardPackInsert = Database['public']['Tables']['board_packs']['Insert']
type BoardPackUpdate = Database['public']['Tables']['board_packs']['Update']

export class AssetRepository extends BaseRepository {
  async findById(id: string): Promise<BoardPack | null> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return data || null
    } catch (error: unknown) {
      this.handleError(error, 'findById')
    }
  }

  async findByOrganization(organizationId: string, filters?: {
    status?: Database['public']['Enums']['pack_status']
    limit?: number
    offset?: number
  }): Promise<BoardPack[]> {
    try {
      let query = this.supabase
        .from('board_packs')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByOrganization')
      }

      return (data || []) as BoardPack[]
    } catch (error: unknown) {
      this.handleError(error, 'findByOrganization')
    }
  }

  async findByUploader(uploaderId: string): Promise<BoardPack[]> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select('*')
        .eq('uploaded_by', uploaderId)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByUploader')
      }

      return (data || []) as BoardPack[]
    } catch (error: unknown) {
      this.handleError(error, 'findByUploader')
    }
  }

  async create(asset: BoardPackInsert): Promise<BoardPack> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .insert(asset)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return data!
    } catch (error: unknown) {
      this.handleError(error, 'create')
    }
  }

  async update(id: string, updates: BoardPackUpdate): Promise<BoardPack> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'update')
      }

      return data!
    } catch (error: unknown) {
      this.handleError(error, 'update')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // First delete from storage if file exists
      const asset = await this.findById(id)
      if ((asset as any)?.file_path) {
        await this.supabase.storage
          .from('board-packs')
          .remove([(asset as any).file_path])
      }

      // Then delete from database
      const { error } = await this.supabase
        .from('board_packs')
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error: unknown) {
      this.handleError(error, 'delete')
    }
  }

  async updateStatus(id: string, status: 'processing' | 'ready' | 'failed'): Promise<BoardPack> {
    return this.update(id, { status: status as any })
  }

  async addSummary(id: string, summary: string, audioUrl?: string): Promise<BoardPack> {
    return this.update(id, {
      summary,
      audio_summary_url: audioUrl,
      status: 'ready' as any
    })
  }

  async search(organizationId: string, query: string): Promise<BoardPack[]> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'search')
      }

      return (data || []) as BoardPack[]
    } catch (error: unknown) {
      this.handleError(error, 'search')
    }
  }

  async findByVault(vaultId: string): Promise<BoardPack[]> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select(`
          *,
          vault_assets!inner(
            vault_id,
            added_at
          )
        `)
        .eq('vault_assets.vault_id', vaultId)
        .order('vault_assets.added_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByVault')
      }

      return (data || []) as BoardPack[]
    } catch (error: unknown) {
      this.handleError(error, 'findByVault')
    }
  }

  async addToVault(assetId: string, vaultId: string, addedBy: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vault_assets')
        .insert({
          asset_id: assetId,
          vault_id: vaultId,
          added_by_user_id: addedBy,
          organization_id: '', // TODO: Pass organization_id as parameter
          added_at: new Date().toISOString()
        })

      if (error) {
        this.handleError(error, 'addToVault')
      }
    } catch (error: unknown) {
      this.handleError(error, 'addToVault')
    }
  }

  async removeFromVault(assetId: string, vaultId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vault_assets')
        .delete()
        .eq('asset_id', assetId)
        .eq('vault_id', vaultId)

      if (error) {
        this.handleError(error, 'removeFromVault')
      }
    } catch (error: unknown) {
      this.handleError(error, 'removeFromVault')
    }
  }
}