/**
 * Mobile Cache Manager with Intelligent Caching Strategies
 * Optimizes data storage and retrieval for mobile devices
 */

import { DataUsageTracker } from './data-usage-tracker';

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  tags: string[];
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  size: number;
  entryCount: number;
  evictionCount: number;
  compressionRatio: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export class MobileCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private indexedDBCache: IDBDatabase | null = null;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private maxStorageSize = 200 * 1024 * 1024; // 200MB
  private currentMemorySize = 0;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0,
  };
  private dataTracker = new DataUsageTracker();

  constructor() {
    this.initIndexedDB();
    this.startCleanupRoutine();
    this.monitorMemoryPressure();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BoardGuruCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('cache_entries')) {
          const store = db.createObjectStore('cache_entries', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        if (!db.objectStoreNames.contains('cache_metadata')) {
          db.createObjectStore('cache_metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Generate cache key with context
   */
  generateCacheKey(operation: string, args: any, userId: string): string {
    const normalized = this.normalizeArgs(args);
    const hash = this.simpleHash(JSON.stringify(normalized));
    return `${operation}:${userId}:${hash}`;
  }

  /**
   * Set cache entry with intelligent storage strategy
   */
  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = 10 * 60 * 1000, // 10 minutes default
      tags = [],
      compress = false,
      priority = 'NORMAL'
    } = options;

    let processedData = data;
    let size = this.estimateSize(data);
    
    // Compress large data if requested or if size exceeds threshold
    if (compress || size > 100 * 1024) { // 100KB threshold
      processedData = await this.compressData(data);
      size = this.estimateSize(processedData);
      this.stats.compressions++;
    }

    const entry: CacheEntry = {
      key,
      data: processedData,
      timestamp: Date.now(),
      ttl,
      tags,
      size,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Store in memory cache for fast access
    if (this.shouldStoreInMemory(size, priority)) {
      await this.setMemoryCache(entry);
    }

    // Store in IndexedDB for persistence
    if (this.shouldStoreInStorage(size, priority)) {
      await this.setStorageCache(entry);
    }

    // Track data usage
    this.dataTracker.recordCacheWrite(key, size);
  }

  /**
   * Get cache entry with fallback strategy
   */
  async get(key: string): Promise<any> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      this.updateAccessStats(memoryEntry);
      this.stats.hits++;
      this.dataTracker.recordCacheHit(key, memoryEntry.size);
      return memoryEntry.data;
    }

    // Check IndexedDB cache
    const storageEntry = await this.getStorageCache(key);
    if (storageEntry && this.isValidEntry(storageEntry)) {
      this.updateAccessStats(storageEntry);
      
      // Promote to memory cache if frequently accessed
      if (storageEntry.accessCount > 5) {
        await this.setMemoryCache(storageEntry);
      }
      
      this.stats.hits++;
      this.dataTracker.recordCacheHit(key, storageEntry.size);
      return storageEntry.data;
    }

    // Cache miss
    this.stats.misses++;
    this.dataTracker.recordCacheMiss(key);
    return null;
  }

  /**
   * Get cached response or simplified version
   */
  async getCachedOrSimplified(operation: string): Promise<any> {
    // Try to get full cached version first
    const fullKey = `${operation}:full`;
    const fullData = await this.get(fullKey);
    if (fullData) {
      return fullData;
    }

    // Try to get simplified version
    const simplifiedKey = `${operation}:simplified`;
    const simplifiedData = await this.get(simplifiedKey);
    if (simplifiedData) {
      return simplifiedData;
    }

    return null;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // Clear from memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.delete(key);
        this.currentMemorySize -= entry.size;
      }
    }

    // Clear from IndexedDB cache
    if (this.indexedDBCache) {
      const transaction = this.indexedDBCache.transaction(['cache_entries'], 'readwrite');
      const store = transaction.objectStore('cache_entries');
      const index = store.index('tags');

      for (const tag of tags) {
        const request = index.openCursor(IDBKeyRange.only(tag));
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      }
    }
  }

  /**
   * Clear specific cache entry
   */
  async delete(key: string): Promise<void> {
    // Remove from memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      this.memoryCache.delete(key);
      this.currentMemorySize -= memoryEntry.size;
    }

    // Remove from IndexedDB cache
    if (this.indexedDBCache) {
      const transaction = this.indexedDBCache.transaction(['cache_entries'], 'readwrite');
      const store = transaction.objectStore('cache_entries');
      store.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;
    
    const compressionRatio = this.stats.compressions > 0 
      ? (this.stats.compressions / totalRequests) * 100 
      : 0;

    return {
      hitRate: hitRate * 100,
      missRate: missRate * 100,
      size: this.currentMemorySize,
      entryCount: this.memoryCache.size,
      evictionCount: this.stats.evictions,
      compressionRatio,
    };
  }

  /**
   * Optimize cache for mobile constraints
   */
  async optimizeForMobile(constraints: {
    lowMemory?: boolean;
    cellularConnection?: boolean;
    lowBattery?: boolean;
  }): Promise<void> {
    const { lowMemory, cellularConnection, lowBattery } = constraints;

    if (lowMemory) {
      // Reduce memory cache size
      this.maxMemorySize = 20 * 1024 * 1024; // 20MB
      await this.evictLeastUsed(0.5); // Evict 50% of entries
    }

    if (cellularConnection) {
      // Increase compression for cellular connections
      await this.recompressEntries('HIGH');
    }

    if (lowBattery) {
      // Reduce background processing
      this.maxMemorySize = 10 * 1024 * 1024; // 10MB
      await this.evictExpired();
    }
  }

  /**
   * Preload critical data
   */
  async preloadCritical(entries: Array<{ key: string; data: any; options?: CacheOptions }>): Promise<void> {
    const promises = entries.map(({ key, data, options }) => 
      this.set(key, data, { ...options, priority: 'HIGH' })
    );
    
    await Promise.all(promises);
  }

  /**
   * Private helper methods
   */
  private shouldStoreInMemory(size: number, priority: string): boolean {
    if (priority === 'HIGH') return true;
    if (priority === 'LOW' && this.currentMemorySize > this.maxMemorySize * 0.8) return false;
    return this.currentMemorySize + size <= this.maxMemorySize;
  }

  private shouldStoreInStorage(size: number, priority: string): boolean {
    return size < this.maxStorageSize * 0.1; // Don't store entries larger than 10% of max storage
  }

  private async setMemoryCache(entry: CacheEntry): Promise<void> {
    // Check if we need to evict entries
    if (this.currentMemorySize + entry.size > this.maxMemorySize) {
      await this.evictLeastUsed();
    }

    this.memoryCache.set(entry.key, entry);
    this.currentMemorySize += entry.size;
  }

  private async setStorageCache(entry: CacheEntry): Promise<void> {
    if (!this.indexedDBCache) return;

    const transaction = this.indexedDBCache.transaction(['cache_entries'], 'readwrite');
    const store = transaction.objectStore('cache_entries');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getStorageCache(key: string): Promise<CacheEntry | null> {
    if (!this.indexedDBCache) return null;

    const transaction = this.indexedDBCache.transaction(['cache_entries'], 'readonly');
    const store = transaction.objectStore('cache_entries');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update in memory cache
    if (this.memoryCache.has(entry.key)) {
      this.memoryCache.set(entry.key, entry);
    }
  }

  private async evictLeastUsed(ratio: number = 0.3): Promise<void> {
    const entries = Array.from(this.memoryCache.values());
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    const evictCount = Math.floor(entries.length * ratio);
    
    for (let i = 0; i < evictCount; i++) {
      const entry = entries[i];
      this.memoryCache.delete(entry.key);
      this.currentMemorySize -= entry.size;
      this.stats.evictions++;
    }
  }

  private async evictExpired(): Promise<void> {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        this.currentMemorySize -= entry.size;
        this.stats.evictions++;
      }
    }
  }

  private async compressData(data: any): Promise<any> {
    // Simple compression by removing unnecessary fields for mobile
    if (typeof data === 'object' && data !== null) {
      const compressed = { ...data };
      
      // Remove heavy fields for mobile
      delete compressed.fullDescription;
      delete compressed.detailedMetadata;
      delete compressed.auditLog;
      
      // Compress arrays
      if (Array.isArray(compressed.items)) {
        compressed.items = compressed.items.slice(0, 20); // Limit to 20 items
      }
      
      return compressed;
    }
    
    return data;
  }

  private async recompressEntries(level: 'LOW' | 'MEDIUM' | 'HIGH'): Promise<void> {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.size > 10 * 1024) { // Recompress entries > 10KB
        const compressed = await this.compressData(entry.data);
        const newSize = this.estimateSize(compressed);
        
        if (newSize < entry.size) {
          entry.data = compressed;
          this.currentMemorySize -= (entry.size - newSize);
          entry.size = newSize;
          this.memoryCache.set(key, entry);
        }
      }
    }
  }

  private estimateSize(data: any): number {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  }

  private normalizeArgs(args: any): any {
    if (!args) return {};
    
    // Sort object keys to ensure consistent cache keys
    const normalized: any = {};
    Object.keys(args).sort().forEach(key => {
      if (args[key] !== undefined && args[key] !== null) {
        normalized[key] = args[key];
      }
    });
    
    return normalized;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private startCleanupRoutine(): void {
    // Run cleanup every 10 minutes
    setInterval(async () => {
      await this.evictExpired();
    }, 10 * 60 * 1000);
  }

  private monitorMemoryPressure(): void {
    // Monitor memory pressure and adjust cache size
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const usedRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
        
        if (usedRatio > 0.8) {
          // High memory pressure - reduce cache size
          this.maxMemorySize = Math.max(10 * 1024 * 1024, this.maxMemorySize * 0.8);
          this.evictLeastUsed(0.5);
        }
      }, 30000); // Check every 30 seconds
    }
  }
}

export default MobileCacheManager;