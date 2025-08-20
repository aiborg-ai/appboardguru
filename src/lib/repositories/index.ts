// Repository exports
export { BaseRepository } from './base.repository'
export { UserRepository } from './user.repository'
export { VaultRepository } from './vault.repository'
export { AssetRepository } from './asset.repository'
export { OrganizationRepository } from './organization.repository'

// Repository factory for dependency injection
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { UserRepository } from './user.repository'
import { VaultRepository } from './vault.repository'
import { AssetRepository } from './asset.repository'
import { OrganizationRepository } from './organization.repository'

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