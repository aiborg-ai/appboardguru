// Core repository exports
export { BaseRepository } from './base.repository'

// Type exports
export * from './types'
export * from './result'

// Repository exports
export { UserRepository } from './user.repository'
export { OrganizationRepository } from './organization.repository'
export { AssetRepository } from './asset.repository.enhanced'
export { VaultRepository } from './vault.repository.enhanced'
export { NotificationRepository } from './notification.repository'
export { CalendarRepository } from './calendar.repository'
export { ComplianceRepository } from './compliance.repository'
export { ActivityRepository } from './activity.repository'

// Database utilities
export * from './database'

// Repository factory for dependency injection
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { UserRepository } from './user.repository'
import { OrganizationRepository } from './organization.repository'
import { AssetRepository } from './asset.repository.enhanced'
import { VaultRepository } from './vault.repository.enhanced'
import { NotificationRepository } from './notification.repository'
import { CalendarRepository } from './calendar.repository'
import { ComplianceRepository } from './compliance.repository'
import { ActivityRepository } from './activity.repository'
import { createMonitoredClient } from './database'

export class RepositoryFactory {
  private monitoredClient: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>, enableMonitoring: boolean = true) {
    this.monitoredClient = enableMonitoring ? createMonitoredClient(supabase) : supabase
  }

  get users() {
    return new UserRepository(this.monitoredClient)
  }

  get organizations() {
    return new OrganizationRepository(this.monitoredClient)
  }

  get assets() {
    return new AssetRepository(this.monitoredClient)
  }

  get vaults() {
    return new VaultRepository(this.monitoredClient)
  }

  get notifications() {
    return new NotificationRepository(this.monitoredClient)
  }

  get calendar() {
    return new CalendarRepository(this.monitoredClient)
  }

  get compliance() {
    return new ComplianceRepository(this.monitoredClient)
  }

  get activity() {
    return new ActivityRepository(this.monitoredClient)
  }
}

// Helper function to create repository factory with server client
export async function createServerRepositoryFactory(): Promise<RepositoryFactory> {
  const { createServerConnection } = await import('./database')
  const client = await createServerConnection()
  return new RepositoryFactory(client)
}

// Helper function to create repository factory with client
export function createClientRepositoryFactory(): RepositoryFactory {
  const { createClientConnection } = require('./database')
  const client = createClientConnection()
  return new RepositoryFactory(client)
}

// Helper function to create repository factory with admin client
export function createAdminRepositoryFactory(): RepositoryFactory {
  const { createAdminConnection } = require('./database')
  const client = createAdminConnection()
  return new RepositoryFactory(client)
}