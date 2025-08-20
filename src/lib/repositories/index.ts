// Repository exports
export { BaseRepository } from './base.repository'
export { UserRepository } from './user.repository'
export { VaultRepository } from './vault.repository'
export { AssetRepository } from './asset.repository'
export { OrganizationRepository } from './organization.repository'

// Repository factory for dependency injection
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class RepositoryFactory {
  constructor(private supabase: SupabaseClient<Database>) {}

  get users() {
    return new UserRepository(this.supabase)
  }

  get vaults() {
    return new VaultRepository(this.supabase)
  }

  get assets() {
    return new AssetRepository(this.supabase)
  }

  get organizations() {
    return new OrganizationRepository(this.supabase)
  }
}