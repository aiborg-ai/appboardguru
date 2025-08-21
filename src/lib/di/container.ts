/**
 * Dependency Injection Container
 * Provides service lifecycle management and dependency resolution
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Service lifecycle options
export type ServiceLifecycle = 'singleton' | 'scoped' | 'transient'

// Service factory function
export type ServiceFactory<T = any> = (container: Container) => T

// Service registration
export interface ServiceRegistration<T = any> {
  factory: ServiceFactory<T>
  lifecycle: ServiceLifecycle
  dependencies?: string[]
}

// Service scope for request-level instances
export class ServiceScope {
  private instances = new Map<string, any>()
  
  get<T>(key: string): T | undefined {
    return this.instances.get(key)
  }
  
  set<T>(key: string, instance: T): void {
    this.instances.set(key, instance)
  }
  
  clear(): void {
    this.instances.clear()
  }
}

// Main DI Container
export class Container {
  private registrations = new Map<string, ServiceRegistration>()
  private singletons = new Map<string, any>()
  private scope?: ServiceScope
  
  constructor(scope?: ServiceScope) {
    this.scope = scope
  }
  
  /**
   * Register a service with the container
   */
  register<T>(
    key: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle = 'transient',
    dependencies: string[] = []
  ): Container {
    this.registrations.set(key, {
      factory,
      lifecycle,
      dependencies
    })
    return this
  }
  
  /**
   * Register a singleton service
   */
  singleton<T>(key: string, factory: ServiceFactory<T>, dependencies: string[] = []): Container {
    return this.register(key, factory, 'singleton', dependencies)
  }
  
  /**
   * Register a scoped service (per request)
   */
  scoped<T>(key: string, factory: ServiceFactory<T>, dependencies: string[] = []): Container {
    return this.register(key, factory, 'scoped', dependencies)
  }
  
  /**
   * Register a transient service (new instance every time)
   */
  transient<T>(key: string, factory: ServiceFactory<T>, dependencies: string[] = []): Container {
    return this.register(key, factory, 'transient', dependencies)
  }
  
  /**
   * Resolve a service instance
   */
  resolve<T>(key: string): T {
    const registration = this.registrations.get(key)
    if (!registration) {
      throw new Error(`Service '${key}' not registered`)
    }
    
    switch (registration.lifecycle) {
      case 'singleton':
        if (!this.singletons.has(key)) {
          this.singletons.set(key, registration.factory(this))
        }
        return this.singletons.get(key)
        
      case 'scoped':
        if (!this.scope) {
          throw new Error('Scoped services require a service scope')
        }
        if (!this.scope.get(key)) {
          this.scope.set(key, registration.factory(this))
        }
        return this.scope.get(key)!
        
      case 'transient':
      default:
        return registration.factory(this)
    }
  }
  
  /**
   * Create a scoped container for request-level services
   */
  createScope(): Container {
    return new Container(new ServiceScope())
  }
  
  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.registrations.has(key)
  }
  
  /**
   * Get all registered service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.registrations.keys())
  }
}

// Create the root container
export const container = new Container()

// Service registration helper
export function registerServices(supabase?: SupabaseClient<Database>) {
  // Register Supabase client
  if (supabase) {
    container.singleton('supabase', () => supabase)
  }
  
  // Register repositories
  container.scoped('OrganizationRepository', (c) => {
    const { OrganizationRepository } = require('@/domains/organizations/repository/organization.repository')
    return new OrganizationRepository(c.resolve('supabase'))
  }, ['supabase'])
  
  // Register services
  container.scoped('OrganizationService', (c) => {
    const { OrganizationService } = require('@/domains/organizations/services/organization.service')
    return new OrganizationService(c.resolve('supabase'))
  }, ['supabase'])
  
  return container
}

// Service registration decorator (for future use)
export function Service(lifecycle: ServiceLifecycle = 'transient') {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const serviceName = constructor.name
    container.register(serviceName, (c) => {
      // Auto-resolve constructor dependencies
      const instance = new constructor()
      return instance
    }, lifecycle)
    
    return constructor
  }
}

// Inject decorator for properties (for future use)
export function Inject(serviceKey: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return container.resolve(serviceKey)
      },
      enumerable: true,
      configurable: true
    })
  }
}

// Type-safe service resolution
export interface ServiceMap {
  supabase: SupabaseClient<Database>
  OrganizationRepository: any
  OrganizationService: any
}

// Type-safe resolver
export function resolve<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
  return container.resolve(key)
}