/**
 * Mobile-optimized GraphQL resolvers with intelligent caching and data fetching
 */

import { GraphQLScalarType } from 'graphql';
import { GraphQLUpload } from 'graphql-upload';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MobileQueryComplexityAnalyzer } from './query-complexity-analyzer';
import { MobileCacheManager } from './mobile-cache-manager';
import { OfflineSyncEngine } from './offline-sync-engine';
import { DataUsageTracker } from './data-usage-tracker';
import { NetworkOptimizer } from './network-optimizer';

// Initialize mobile-specific services
const pubsub = new PubSub();
const complexityAnalyzer = new MobileQueryComplexityAnalyzer();
const cacheManager = new MobileCacheManager();
const syncEngine = new OfflineSyncEngine();
const dataTracker = new DataUsageTracker();
const networkOptimizer = new NetworkOptimizer();

// Custom scalars
const DateTimeType = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value: Date) => value.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast: any) => new Date(ast.value),
});

const JSONType = new GraphQLScalarType({
  name: 'JSON',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => JSON.parse(ast.value),
});

// Helper functions for mobile optimization
const optimizeForMobile = (data: any, context: any) => {
  const { networkType, dataUsageMode, compressionLevel } = context.mobileContext || {};
  
  if (compressionLevel && compressionLevel !== 'NONE') {
    return networkOptimizer.compressResponse(data, compressionLevel);
  }
  
  return data;
};

const checkNetworkRequirements = (operation: string, context: any) => {
  const { networkType, connectionSpeed } = context.mobileContext || {};
  
  if (networkType === 'cellular' && connectionSpeed === 'slow') {
    // Return cached or simplified data for slow connections
    return cacheManager.getCachedOrSimplified(operation);
  }
  
  return null;
};

// Main resolvers
export const mobileResolvers = {
  // Custom scalars
  Upload: GraphQLUpload,
  DateTime: DateTimeType,
  JSON: JSONType,

  // Query resolvers with mobile optimization
  Query: {
    assets: async (parent: any, args: any, context: any) => {
      const { filter, connection, networkOptimized } = args;
      const { user, mobileContext } = context;
      
      // Track query complexity
      const complexity = complexityAnalyzer.calculateComplexity('assets', args);
      if (complexity > 50) {
        throw new Error('Query too complex for mobile device');
      }
      
      // Check for cached results
      const cacheKey = cacheManager.generateCacheKey('assets', args, user.id);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached && networkOptimized) {
        dataTracker.recordCacheHit('assets', cached.size);
        return cached.data;
      }
      
      const supabase = createSupabaseServerClient();
      
      // Build optimized query based on mobile context
      let query = supabase
        .from('assets')
        .select(`
          id,
          title,
          type,
          size,
          thumbnail:thumbnail_url,
          created_at,
          updated_at,
          sync_status,
          last_synced_at,
          compression_ratio,
          network_requirement,
          organizations!inner(id, name, slug),
          users!creator_id(id, email, first_name, last_name)
        `);
      
      // Apply mobile-specific filters
      if (filter) {
        if (filter.types) {
          query = query.in('type', filter.types);
        }
        if (filter.syncStatus) {
          query = query.in('sync_status', filter.syncStatus);
        }
        if (filter.networkTier && mobileContext?.networkType === 'cellular') {
          query = query.in('network_requirement', ['CELLULAR_ALLOWED', 'LOW_BANDWIDTH_OK']);
        }
        if (filter.sizeRange && mobileContext?.dataUsageMode === 'MINIMAL') {
          query = query.lte('size', filter.sizeRange.max || 10 * 1024 * 1024); // 10MB limit
        }
      }
      
      // Apply pagination
      if (connection) {
        const limit = Math.min(connection.first || 20, 50); // Max 50 items for mobile
        query = query.limit(limit);
        
        if (connection.after) {
          const cursor = Buffer.from(connection.after, 'base64').toString();
          query = query.gt('created_at', cursor);
        }
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch assets: ${error.message}`);
      }
      
      // Transform data for mobile optimization
      const optimizedData = data?.map((asset: any) => ({
        ...asset,
        previewUrl: networkOptimized ? undefined : asset.preview_url, // Lazy load
        downloadUrl: networkOptimized ? undefined : asset.download_url, // Lazy load
        metadata: mobileContext?.dataUsageMode === 'MINIMAL' ? {} : asset.metadata,
      }));
      
      const edges = optimizedData?.map((asset: any, index: number) => ({
        cursor: Buffer.from(asset.created_at).toString('base64'),
        node: asset,
      }));
      
      const result = {
        edges,
        pageInfo: {
          hasNextPage: (edges?.length || 0) === (connection?.first || 20),
          hasPreviousPage: !!connection?.after,
          startCursor: edges?.[0]?.cursor,
          endCursor: edges?.[edges.length - 1]?.cursor,
          totalCount: count,
        },
        totalCount: count,
        filters: filter,
      };
      
      // Cache result for mobile optimization
      if (networkOptimized) {
        await cacheManager.set(cacheKey, result, {
          ttl: 5 * 60 * 1000, // 5 minutes
          tags: ['assets', `user:${user.id}`],
        });
      }
      
      // Track data usage
      dataTracker.recordDataUsage('assets_query', JSON.stringify(result).length, user.id);
      
      return optimizeForMobile(result, context);
    },

    asset: async (parent: any, args: any, context: any) => {
      const { id } = args;
      const { user, mobileContext } = context;
      
      const cacheKey = cacheManager.generateCacheKey('asset', { id }, user.id);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        return cached.data;
      }
      
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          title,
          type,
          size,
          thumbnail:thumbnail_url,
          preview_url,
          download_url,
          metadata,
          created_at,
          updated_at,
          sync_status,
          last_synced_at,
          compression_ratio,
          network_requirement,
          organizations!inner(id, name, slug, settings),
          users!creator_id(id, email, first_name, last_name, avatar_url)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch asset: ${error.message}`);
      }
      
      // Apply mobile optimizations
      const optimizedAsset = {
        ...data,
        previewUrl: mobileContext?.networkType === 'cellular' ? undefined : data.preview_url,
        metadata: mobileContext?.dataUsageMode === 'MINIMAL' ? {} : data.metadata,
      };
      
      // Cache the result
      await cacheManager.set(cacheKey, optimizedAsset, {
        ttl: 10 * 60 * 1000, // 10 minutes
        tags: ['asset', `asset:${id}`],
      });
      
      dataTracker.recordDataUsage('asset_query', JSON.stringify(optimizedAsset).length, user.id);
      
      return optimizedAsset;
    },

    organizations: async (parent: any, args: any, context: any) => {
      const { connection, includeOfflineData } = args;
      const { user, mobileContext } = context;
      
      const supabase = createSupabaseServerClient();
      
      let query = supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          logo_url,
          settings,
          sync_status,
          member_count:organization_members(count),
          offline_capabilities,
          data_usage_estimate
        `)
        .eq('organization_members.user_id', user.id);
      
      // Apply mobile-specific optimizations
      if (!includeOfflineData && mobileContext?.networkType === 'cellular') {
        query = query.neq('sync_status', 'OFFLINE_ONLY');
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }
      
      const edges = data?.map((org: any) => ({
        cursor: Buffer.from(org.id).toString('base64'),
        node: {
          ...org,
          logoUrl: org.logo_url,
          memberCount: org.member_count?.[0]?.count || 0,
          syncStatus: org.sync_status || 'SYNCED',
          offlineCapabilities: org.offline_capabilities || {
            maxOfflineDays: 7,
            supportedOperations: ['VIEW', 'COMMENT'],
            requiredStorageSpace: 100 * 1024 * 1024, // 100MB
          },
          dataUsageEstimate: org.data_usage_estimate || {
            dailyAverage: 5 * 1024 * 1024, // 5MB
            monthlyProjection: 150 * 1024 * 1024, // 150MB
            compressionSavings: 30, // 30% savings
          },
        },
      }));
      
      return {
        edges,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: edges?.[0]?.cursor,
          endCursor: edges?.[edges?.length - 1]?.cursor,
          totalCount: edges?.length || 0,
        },
        totalCount: edges?.length || 0,
      };
    },

    me: async (parent: any, args: any, context: any) => {
      const { user, mobileContext } = context;
      
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          last_active_at,
          mobile_preferences,
          sync_status
        `)
        .eq('id', user.id)
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
      
      return {
        ...data,
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.avatar_url,
        lastActiveAt: data.last_active_at,
        deviceInfo: mobileContext?.deviceInfo,
        preferences: data.mobile_preferences || {
          dataUsageMode: 'BALANCED',
          syncFrequency: 'EVERY_15_MINUTES',
          offlineMode: false,
          compressionLevel: 'MEDIUM',
          autoDownloadThreshold: 10 * 1024 * 1024, // 10MB
        },
        syncStatus: data.sync_status || 'SYNCED',
      };
    },

    syncStatus: async (parent: any, args: any, context: any) => {
      const { user } = context;
      return syncEngine.getGlobalSyncStatus(user.id);
    },

    offlineQueue: async (parent: any, args: any, context: any) => {
      const { user } = context;
      return syncEngine.getOfflineQueue(user.id);
    },

    dataUsageStats: async (parent: any, args: any, context: any) => {
      const { user } = context;
      return dataTracker.getUsageStats(user.id);
    },

    networkStatus: async (parent: any, args: any, context: any) => {
      const { mobileContext } = context;
      return {
        isOnline: mobileContext?.isOnline || true,
        connectionType: mobileContext?.networkType || 'unknown',
        effectiveType: mobileContext?.effectiveType || '4g',
        downlink: mobileContext?.downlink || 10,
        rtt: mobileContext?.rtt || 100,
        saveData: mobileContext?.saveData || false,
      };
    },

    batchAssets: async (parent: any, args: any, context: any) => {
      const { ids } = args;
      const { user } = context;
      
      if (ids.length > 50) {
        throw new Error('Batch size too large for mobile device (max 50)');
      }
      
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          title,
          type,
          size,
          thumbnail:thumbnail_url,
          created_at,
          updated_at,
          sync_status
        `)
        .in('id', ids);
      
      if (error) {
        throw new Error(`Failed to fetch batch assets: ${error.message}`);
      }
      
      return data || [];
    },
  },

  // Mutation resolvers with offline queue support
  Mutation: {
    uploadAsset: async (parent: any, args: any, context: any) => {
      const { input, options } = args;
      const { user, mobileContext } = context;
      
      // Check network requirements for upload
      if (options?.networkTier === 'WIFI_ONLY' && mobileContext?.networkType === 'cellular') {
        // Queue for offline upload
        const operation = await syncEngine.queueOfflineOperation({
          type: 'ASSET_UPLOAD',
          payload: { input, options },
          userId: user.id,
        });
        
        return {
          asset: null,
          uploadProgress: { bytesUploaded: 0, totalBytes: 0, percentage: 0 },
          estimatedTimeRemaining: null,
          queuedForOffline: true,
          operation,
        };
      }
      
      // Proceed with immediate upload
      const supabase = createSupabaseServerClient();
      
      // Upload file with compression if specified
      const file = await input.file;
      let processedFile = file;
      
      if (options?.compressionLevel && options.compressionLevel !== 'NONE') {
        processedFile = await networkOptimizer.compressFile(file, options.compressionLevel);
      }
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(`${user.id}/${Date.now()}-${processedFile.name}`, processedFile);
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Create asset record
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert({
          title: input.title,
          type: input.type,
          size: processedFile.size,
          file_path: uploadData.path,
          organization_id: input.organizationId,
          creator_id: user.id,
          metadata: input.metadata,
          sync_status: 'SYNCED',
          network_requirement: options?.networkTier || 'CELLULAR_ALLOWED',
        })
        .select()
        .single();
      
      if (assetError) {
        throw new Error(`Failed to create asset: ${assetError.message}`);
      }
      
      // Track upload data usage
      dataTracker.recordDataUsage('asset_upload', processedFile.size, user.id);
      
      // Publish upload completion
      pubsub.publish('ASSET_SYNC_UPDATE', {
        assetSyncUpdates: {
          assetId: assetData.id,
          status: 'SYNCED',
          progress: 100,
        },
      });
      
      return {
        asset: assetData,
        uploadProgress: {
          bytesUploaded: processedFile.size,
          totalBytes: processedFile.size,
          percentage: 100,
        },
        estimatedTimeRemaining: 0,
      };
    },

    requestSync: async (parent: any, args: any, context: any) => {
      const { scope, priority } = args;
      const { user } = context;
      
      const operation = await syncEngine.requestSync(user.id, scope, priority);
      
      return {
        operationId: operation.id,
        estimatedDuration: operation.estimatedDuration,
        priority: priority || 'NORMAL',
        queuePosition: operation.queuePosition,
      };
    },

    updateMobilePreferences: async (parent: any, args: any, context: any) => {
      const { input } = args;
      const { user } = context;
      
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('users')
        .update({
          mobile_preferences: input,
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }
      
      // Clear user cache
      cacheManager.invalidateByTags([`user:${user.id}`]);
      
      return {
        ...data,
        firstName: data.first_name,
        lastName: data.last_name,
        preferences: input,
      };
    },
  },

  // Subscription resolvers with mobile-optimized connection management
  Subscription: {
    assetSyncUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ASSET_SYNC_UPDATE']),
        (payload, variables, context) => {
          // Filter updates by organization membership
          return context.user?.organizationIds?.includes(variables.organizationId);
        }
      ),
    },

    offlineQueueUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['OFFLINE_QUEUE_UPDATE']),
        (payload, variables, context) => {
          return payload.userId === context.user?.id;
        }
      ),
    },

    networkStatusChanges: {
      subscribe: () => pubsub.asyncIterator(['NETWORK_STATUS_CHANGE']),
    },

    dataUsageAlerts: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['DATA_USAGE_ALERT']),
        (payload, variables, context) => {
          return payload.userId === context.user?.id;
        }
      ),
    },
  },

  // Field resolvers with lazy loading
  MobileAsset: {
    previewUrl: async (parent: any, args: any, context: any) => {
      if (context.mobileContext?.dataUsageMode === 'MINIMAL') {
        return null;
      }
      
      // Generate signed URL on demand
      const supabase = createSupabaseServerClient();
      const { data } = await supabase.storage
        .from('assets')
        .createSignedUrl(parent.file_path, 3600); // 1 hour
      
      return data?.signedUrl;
    },

    downloadUrl: async (parent: any, args: any, context: any) => {
      // Only generate download URLs when explicitly requested
      const supabase = createSupabaseServerClient();
      const { data } = await supabase.storage
        .from('assets')
        .createSignedUrl(parent.file_path, 3600);
      
      return data?.signedUrl;
    },

    organization: async (parent: any, args: any, context: any) => {
      if (parent.organizations) {
        return parent.organizations;
      }
      
      const supabase = createSupabaseServerClient();
      const { data } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', parent.organization_id)
        .single();
      
      return data;
    },

    creator: async (parent: any, args: any, context: any) => {
      if (parent.users) {
        return parent.users;
      }
      
      const supabase = createSupabaseServerClient();
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', parent.creator_id)
        .single();
      
      return data;
    },
  },
};

export default mobileResolvers;