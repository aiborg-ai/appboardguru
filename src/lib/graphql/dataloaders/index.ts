/**
 * GraphQL DataLoaders
 * Prevents N+1 query problems with efficient batching and caching
 */

import DataLoader from 'dataloader'
import { AssetService } from '../../services/asset.service'
import { OrganizationService } from '../../services/organization.service'
import { UserService } from '../../services/user.service'
import { VaultService } from '../../services/vault.service'
import { NotificationService } from '../../services/notification.service'
import { createSupabaseClient } from '@/lib/supabase-client'

// Initialize services
const assetService = new AssetService()
const organizationService = new OrganizationService()
const userService = new UserService()
const vaultService = new VaultService()
// Initialize NotificationService with Supabase client
const notificationService = new NotificationService(createSupabaseClient())

export interface DataLoaders {
  // User loaders
  user: DataLoader<string, any>
  userOrganizations: DataLoader<string, any[]>
  
  // Organization loaders
  organization: DataLoader<string, any>
  organizationMembers: DataLoader<string, any[]>
  organizationMember: DataLoader<{ organizationId: string; userId: string }, boolean>
  
  // Asset loaders
  asset: DataLoader<string, any>
  assetsByOrganization: DataLoader<string, any[]>
  assetAnnotations: DataLoader<string, any[]>
  assetPermissions: DataLoader<string, any[]>
  assetUserPermissions: DataLoader<{ assetId: string; userId: string }, any>
  assetMetrics: DataLoader<string, any>
  assetVaults: DataLoader<string, any[]>
  
  // Vault loaders
  vault: DataLoader<string, any>
  vaultMembers: DataLoader<string, any[]>
  vaultAssets: DataLoader<string, any[]>
  
  // Notification loaders
  userNotifications: DataLoader<string, any[]>
  
  // Meeting loaders
  meeting: DataLoader<string, any>
  meetingAttendees: DataLoader<string, any[]>
  
  // Cache management
  clearAssetCaches: (organizationId: string) => void
  clearVaultAssets: (vaultId: string) => void
  clearUserCaches: (userId: string) => void
}

export function createDataLoaders(): DataLoaders {
  // User loaders
  const userLoader = new DataLoader(async (ids: readonly string[]) => {
    const users = await userService.getUsersByIds(Array.from(ids))
    const userMap = new Map(users.map(user => [user.id, user]))
    return ids.map(id => userMap.get(id) || null)
  }, {
    cacheKeyFn: (id) => `user:${id}`,
    maxBatchSize: 100
  })

  const userOrganizationsLoader = new DataLoader(async (userIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(userIds).map(userId => organizationService.getUserOrganizations(userId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `user-orgs:${id}`,
    maxBatchSize: 50
  })

  // Organization loaders
  const organizationLoader = new DataLoader(async (ids: readonly string[]) => {
    const organizations = await organizationService.getOrganizationsByIds(Array.from(ids))
    const orgMap = new Map(organizations.map(org => [org.id, org]))
    return ids.map(id => orgMap.get(id) || null)
  }, {
    cacheKeyFn: (id) => `org:${id}`,
    maxBatchSize: 100
  })

  const organizationMembersLoader = new DataLoader(async (orgIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(orgIds).map(orgId => organizationService.getOrganizationMembers(orgId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `org-members:${id}`,
    maxBatchSize: 50
  })

  const organizationMemberLoader = new DataLoader(async (keys: readonly { organizationId: string; userId: string }[]) => {
    const results = await Promise.all(
      Array.from(keys).map(({ organizationId, userId }) => 
        organizationService.isOrganizationMember(organizationId, userId)
      )
    )
    return results.map(result => result.success ? result.data || false : false)
  }, {
    cacheKeyFn: ({ organizationId, userId }) => `org-member:${organizationId}:${userId}`,
    maxBatchSize: 100
  })

  // Asset loaders
  const assetLoader = new DataLoader(async (ids: readonly string[]) => {
    const assets = await assetService.getAssetsByIds(Array.from(ids))
    const assetMap = new Map(assets.map(asset => [asset.id, asset]))
    return ids.map(id => assetMap.get(id) || null)
  }, {
    cacheKeyFn: (id) => `asset:${id}`,
    maxBatchSize: 100
  })

  const assetsByOrganizationLoader = new DataLoader(async (orgIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(orgIds).map(orgId => 
        assetService.getAssets({ organizationId: orgId }, { page: 1, limit: 1000 })
      )
    )
    return results.map(result => result.success ? result.data?.data || [] : [])
  }, {
    cacheKeyFn: (id) => `org-assets:${id}`,
    maxBatchSize: 20
  })

  const assetAnnotationsLoader = new DataLoader(async (assetIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(assetIds).map(assetId => assetService.getAssetAnnotations(assetId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `asset-annotations:${id}`,
    maxBatchSize: 50
  })

  const assetPermissionsLoader = new DataLoader(async (assetIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(assetIds).map(assetId => assetService.getAssetPermissions(assetId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `asset-permissions:${id}`,
    maxBatchSize: 50
  })

  const assetUserPermissionsLoader = new DataLoader(async (keys: readonly { assetId: string; userId: string }[]) => {
    const results = await Promise.all(
      Array.from(keys).map(({ assetId, userId }) => 
        assetService.getAssetUserPermissions(assetId, userId)
      )
    )
    return results.map(result => result.success ? result.data : null)
  }, {
    cacheKeyFn: ({ assetId, userId }) => `asset-user-perms:${assetId}:${userId}`,
    maxBatchSize: 100
  })

  const assetMetricsLoader = new DataLoader(async (assetIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(assetIds).map(assetId => assetService.getAssetMetrics(assetId))
    )
    return results.map(result => result.success ? result.data : null)
  }, {
    cacheKeyFn: (id) => `asset-metrics:${id}`,
    maxBatchSize: 100,
    cache: true
  })

  const assetVaultsLoader = new DataLoader(async (assetIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(assetIds).map(assetId => assetService.getAssetVaults(assetId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `asset-vaults:${id}`,
    maxBatchSize: 50
  })

  // Vault loaders
  const vaultLoader = new DataLoader(async (ids: readonly string[]) => {
    const vaults = await vaultService.getVaultsByIds(Array.from(ids))
    const vaultMap = new Map(vaults.map(vault => [vault.id, vault]))
    return ids.map(id => vaultMap.get(id) || null)
  }, {
    cacheKeyFn: (id) => `vault:${id}`,
    maxBatchSize: 100
  })

  const vaultMembersLoader = new DataLoader(async (vaultIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(vaultIds).map(vaultId => vaultService.getVaultMembers(vaultId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `vault-members:${id}`,
    maxBatchSize: 50
  })

  const vaultAssetsLoader = new DataLoader(async (vaultIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(vaultIds).map(vaultId => vaultService.getVaultAssets(vaultId))
    )
    return results.map(result => result.success ? result.data || [] : [])
  }, {
    cacheKeyFn: (id) => `vault-assets:${id}`,
    maxBatchSize: 50
  })

  // Notification loaders
  const userNotificationsLoader = new DataLoader(async (userIds: readonly string[]) => {
    const results = await Promise.all(
      Array.from(userIds).map(userId => 
        notificationService.getUserNotifications(userId, { page: 1, limit: 100 })
      )
    )
    return results.map(result => result.success ? result.data?.data || [] : [])
  }, {
    cacheKeyFn: (id) => `user-notifications:${id}`,
    maxBatchSize: 20
  })

  // Meeting loaders
  const meetingLoader = new DataLoader(async (ids: readonly string[]) => {
    const meetings = await Promise.all(
      Array.from(ids).map(id => {
        // Assuming we have a meeting service method
        return { id, title: 'Meeting ' + id } // Placeholder
      })
    )
    const meetingMap = new Map(meetings.map(meeting => [meeting.id, meeting]))
    return ids.map(id => meetingMap.get(id) || null)
  }, {
    cacheKeyFn: (id) => `meeting:${id}`,
    maxBatchSize: 100
  })

  const meetingAttendeesLoader = new DataLoader(async (meetingIds: readonly string[]) => {
    // Placeholder implementation
    return Array.from(meetingIds).map(() => [])
  }, {
    cacheKeyFn: (id) => `meeting-attendees:${id}`,
    maxBatchSize: 50
  })

  // Cache management functions
  const clearAssetCaches = (organizationId: string) => {
    assetsByOrganizationLoader.clear(organizationId)
    // Clear individual asset caches would require tracking which assets belong to which org
    // For now, we'll clear the entire asset loader cache
    assetLoader.clearAll()
  }

  const clearVaultAssets = (vaultId: string) => {
    vaultAssetsLoader.clear(vaultId)
  }

  const clearUserCaches = (userId: string) => {
    userLoader.clear(userId)
    userOrganizationsLoader.clear(userId)
    userNotificationsLoader.clear(userId)
  }

  return {
    user: userLoader,
    userOrganizations: userOrganizationsLoader,
    organization: organizationLoader,
    organizationMembers: organizationMembersLoader,
    organizationMember: organizationMemberLoader,
    asset: assetLoader,
    assetsByOrganization: assetsByOrganizationLoader,
    assetAnnotations: assetAnnotationsLoader,
    assetPermissions: assetPermissionsLoader,
    assetUserPermissions: assetUserPermissionsLoader,
    assetMetrics: assetMetricsLoader,
    assetVaults: assetVaultsLoader,
    vault: vaultLoader,
    vaultMembers: vaultMembersLoader,
    vaultAssets: vaultAssetsLoader,
    userNotifications: userNotificationsLoader,
    meeting: meetingLoader,
    meetingAttendees: meetingAttendeesLoader,
    clearAssetCaches,
    clearVaultAssets,
    clearUserCaches,
  }
}

// Helper function to create DataLoaders with automatic cache invalidation
export function createSmartDataLoader<K, V>(
  batchLoadFn: (keys: readonly K[]) => Promise<(V | Error)[]>,
  options: {
    cacheKeyFn: (key: K) => string
    maxBatchSize?: number
    cacheMap?: Map<string, Promise<V>>
    cacheTTL?: number // Time to live in milliseconds
  }
): DataLoader<K, V> & { invalidateCache: (key: K) => void } {
  const { cacheKeyFn, maxBatchSize = 100, cacheTTL } = options
  
  let cacheMap = options.cacheMap || new Map()
  
  // Automatic cache expiration if TTL is set
  if (cacheTTL) {
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of cacheMap.entries()) {
        // Check if promise has timestamp and is expired
        if (value && typeof value === 'object' && '_timestamp' in value) {
          if (now - (value as any)._timestamp > cacheTTL) {
            cacheMap.delete(key)
          }
        }
      }
    }, cacheTTL / 2) // Check every half TTL
  }

  const dataLoader = new DataLoader(batchLoadFn, {
    cacheKeyFn,
    maxBatchSize,
    cacheMap
  }) as DataLoader<K, V> & { invalidateCache: (key: K) => void }

  dataLoader.invalidateCache = (key: K) => {
    const cacheKey = cacheKeyFn(key)
    cacheMap.delete(cacheKey)
  }

  return dataLoader
}