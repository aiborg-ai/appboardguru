// Service exports
export { BaseService } from './base.service'
export { VaultService } from './vault.service'
export { NotificationService } from './notification.service'

// Legacy service exports (keep existing services working)
export * from './email-templates'
// Note: invitations, organization, membership, and permissions have conflicting OrganizationRole type exports
// These should be imported directly from their respective modules when needed

// Service factory for dependency injection
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types'
import { VaultService } from './vault.service'
import { NotificationService } from './notification.service'

export class ServiceFactory {
  constructor(private supabase: SupabaseClient<Database>) {}

  get vaults() {
    return new VaultService(this.supabase)
  }

  get notifications() {
    return new NotificationService(this.supabase)
  }

  // Add other services as they are created
  // get assets() { return new AssetService(this.supabase) }
  // get organizations() { return new OrganizationService(this.supabase) }
  // get users() { return new UserService(this.supabase) }
}

// Singleton service instances for client-side usage
let serviceFactory: ServiceFactory | null = null

export const getServiceFactory = (supabase?: SupabaseClient<Database>): ServiceFactory => {
  if (!serviceFactory && supabase) {
    serviceFactory = new ServiceFactory(supabase)
  }
  
  if (!serviceFactory) {
    throw new Error('ServiceFactory not initialized. Provide a Supabase client.')
  }
  
  return serviceFactory
}

// Service hooks for React components
export const useServices = (supabase: SupabaseClient<Database>) => {
  return getServiceFactory(supabase)
}

// Helper to create services with proper error handling
export const createServices = (supabase: SupabaseClient<Database>) => {
  try {
    return new ServiceFactory(supabase)
  } catch (error) {
    console.error('Failed to create services:', error)
    throw new Error('Service initialization failed')
  }
}