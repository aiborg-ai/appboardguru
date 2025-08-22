// Service exports
export { BaseService } from './base.service'
export { VaultService } from './vault.service'
export { NotificationService } from './notification.service'
export { AssetService } from './asset.service'
export { UserService } from './user.service'
export { DocumentService } from './document.service'
export { CalendarService } from './calendar.service'
export { SearchService } from './search.service'
export { WorkflowService } from './workflow.service'
export { ComplianceService } from './compliance.service'
export { BoardService } from './board.service'
export { VoiceService } from './voice.service'
export { EventBus } from './event-bus.service'
export { ServiceOrchestrator } from './service-orchestrator'
export { ServiceMonitor } from './service-monitor'

// Legacy service exports (keep existing services working)
export * from './email-templates'
// Note: invitations, organization, membership, and permissions have conflicting OrganizationRole type exports
// These should be imported directly from their respective modules when needed

// Service factory for dependency injection
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types'
import { VaultService } from './vault.service'
import { NotificationService } from './notification.service'
import { AssetService } from './asset.service'
import { UserService } from './user.service'
import { DocumentService } from './document.service'
import { CalendarService } from './calendar.service'
import { SearchService } from './search.service'
import { EventBus } from './event-bus.service'
import { ServiceOrchestrator } from './service-orchestrator'
import { ServiceMonitor } from './service-monitor'
import { WorkflowService } from './workflow.service'
import { ComplianceService } from './compliance.service'
import { BoardService } from './board.service'
import { VoiceService } from './voice.service'

// Import existing organization service
export { OrganizationService } from '../../../domains/organizations/services/organization.service'

export class ServiceFactory {
  private _eventBus: EventBus
  private _orchestrator: ServiceOrchestrator
  private _monitor: ServiceMonitor
  private serviceInstances: Map<string, any> = new Map()
  
  constructor(private supabase: SupabaseClient<Database>) {
    this._eventBus = new EventBus()
    this._orchestrator = new ServiceOrchestrator(this._eventBus)
    this._monitor = new ServiceMonitor(this._eventBus)
  }

  // Core domain services
  get users() {
    return this.getOrCreateService('users', () => new UserService(this.supabase))
  }

  get assets() {
    return this.getOrCreateService('assets', () => new AssetService(this.supabase))
  }

  get vaults() {
    return this.getOrCreateService('vaults', () => new VaultService(this.supabase))
  }

  get notifications() {
    return this.getOrCreateService('notifications', () => new NotificationService(this.supabase))
  }

  get documents() {
    return this.getOrCreateService('documents', () => new DocumentService(this.supabase))
  }

  get calendar() {
    return this.getOrCreateService('calendar', () => new CalendarService(this.supabase))
  }

  get search() {
    return this.getOrCreateService('search', () => new SearchService(this.supabase))
  }

  // Workflow and business logic services
  get workflow() {
    return this.getOrCreateService('workflow', () => new WorkflowService(this.supabase, this._eventBus))
  }

  get compliance() {
    return this.getOrCreateService('compliance', () => new ComplianceService(this.supabase))
  }

  get board() {
    return this.getOrCreateService('board', () => new BoardService(this.supabase))
  }

  get voice() {
    return this.getOrCreateService('voice', () => new VoiceService(this.supabase))
  }

  // Infrastructure services
  get eventBus() {
    return this._eventBus
  }

  get orchestrator() {
    return this._orchestrator
  }

  get monitor() {
    return this._monitor
  }

  // Service instance management
  private getOrCreateService<T>(key: string, factory: () => T): T {
    if (!this.serviceInstances.has(key)) {
      const service = factory()
      this.serviceInstances.set(key, service)
      this._monitor.registerService(key, service)
    }
    return this.serviceInstances.get(key)
  }

  // Service health check
  async healthCheck(): Promise<{[serviceName: string]: { status: 'healthy' | 'unhealthy', details?: any }}>  {
    return this._monitor.checkAllServices()
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    await this._orchestrator.shutdown()
    await this._monitor.shutdown()
    this.serviceInstances.clear()
  }
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

// Service dependency injection helpers
export const injectServices = (fn: (services: ServiceFactory) => any) => {
  return (supabase: SupabaseClient<Database>) => {
    const services = getServiceFactory(supabase)
    return fn(services)
  }
}

// Service composition helper
export const composeServices = (...serviceFactories: Array<(services: ServiceFactory) => any>) => {
  return (supabase: SupabaseClient<Database>) => {
    const services = getServiceFactory(supabase)
    return serviceFactories.map(factory => factory(services))
  }
}

// Service lifecycle management
export class ServiceLifecycleManager {
  private factories: Map<string, ServiceFactory> = new Map()
  
  register(key: string, supabase: SupabaseClient<Database>): void {
    this.factories.set(key, new ServiceFactory(supabase))
  }
  
  get(key: string): ServiceFactory | undefined {
    return this.factories.get(key)
  }
  
  async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.factories.values()).map(
      factory => factory.shutdown()
    )
    await Promise.all(shutdownPromises)
    this.factories.clear()
  }
  
  async healthCheck(): Promise<{[key: string]: any}> {
    const results: {[key: string]: any} = {}
    
    for (const [key, factory] of this.factories) {
      try {
        results[key] = await factory.healthCheck()
      } catch (error) {
        results[key] = { error: error instanceof Error ? error.message : String(error) }
      }
    }
    
    return results
  }
}

// Global service lifecycle manager
export const serviceLifecycleManager = new ServiceLifecycleManager()