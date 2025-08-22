// Core repository exports
export { BaseRepository } from './base.repository'

// Enhanced repository exports
export { EnhancedBaseRepository } from './enhanced-base'
export { CachedRepository } from './cached-repository'
export { EnhancedUserRepository } from './enhanced-user.repository'

// Query building exports
export { 
  TypeSafeQueryBuilder, 
  createQueryBuilder,
  QueryBuilderUtils,
  QueryTemplates
} from './query-builder'

// Transaction management exports
export { 
  SagaOrchestrator, 
  SagaExecution,
  TransactionManager,
  SagaPatterns
} from './transaction-manager'

// Performance monitoring exports
export { 
  PerformanceMonitor,
  QueryAnalyzer,
  QueryOptimizer,
  RepositoryBenchmark,
  BenchmarkSuites,
  BenchmarkReporter
} from './performance/'

// Cache management exports
export { 
  CacheManager, 
  MemoryCache, 
  DatabaseCache,
  createCacheManager,
  cached,
  defaultCacheManager
} from '../cache/CacheManager'

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
export { DocumentRepository } from './document.repository'
export { WebSocketRepository } from './websocket.repository'
export { BoardRepository } from './board.repository'
export { CommitteeRepository } from './committee.repository'
export { MeetingRepository } from './meeting.repository'
export { MeetingResolutionRepository } from './meeting-resolution.repository'
export { MeetingActionableRepository } from './meeting-actionable.repository'
export { FeedbackRepository } from './feedback.repository'
export { AuthRepository } from './auth.repository'

// Document-specific exports
export * from './document-errors'

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
import { DocumentRepository } from './document.repository'
import { WebSocketRepository } from './websocket.repository'
import { BoardRepository } from './board.repository'
import { CommitteeRepository } from './committee.repository'
import { MeetingRepository } from './meeting.repository'
import { MeetingResolutionRepository } from './meeting-resolution.repository'
import { MeetingActionableRepository } from './meeting-actionable.repository'
import { FeedbackRepository } from './feedback.repository'
import { AuthRepository } from './auth.repository'
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

  get documents() {
    return new DocumentRepository(this.monitoredClient)
  }

  get websocket() {
    return new WebSocketRepository(this.monitoredClient)
  }

  get boards() {
    return new BoardRepository(this.monitoredClient)
  }

  get committees() {
    return new CommitteeRepository(this.monitoredClient)
  }

  get meetings() {
    return new MeetingRepository(this.monitoredClient)
  }

  get meetingResolutions() {
    return new MeetingResolutionRepository(this.monitoredClient)
  }

  get meetingActionables() {
    return new MeetingActionableRepository(this.monitoredClient)
  }

  get feedback() {
    return new FeedbackRepository(this.monitoredClient)
  }

  get auth() {
    return new AuthRepository(this.monitoredClient)
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