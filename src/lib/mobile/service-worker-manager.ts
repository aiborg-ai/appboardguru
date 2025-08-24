/**
 * Service Worker Manager for Mobile App
 * Handles registration, updates, and communication with service worker
 */

export interface OfflineOperation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
}

export interface CacheUpdateEvent {
  type: 'CACHE_UPDATED';
  url: string;
  timestamp: number;
}

export interface NetworkStatusEvent {
  type: 'NETWORK_STATUS';
  online: boolean;
  timestamp: number;
}

export type ServiceWorkerMessage = CacheUpdateEvent | NetworkStatusEvent;

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private listeners = new Map<string, Set<Function>>();

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.init();
    }
  }

  /**
   * Initialize service worker
   */
  async init(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('Service Worker registered:', this.registration);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.emit('update-available', newWorker);
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      // Check for existing controller
      if (navigator.serviceWorker.controller) {
        console.log('Service Worker is controlling the page');
      }

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        this.emit('controller-changed');
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    switch (message.type) {
      case 'CACHE_UPDATED':
        this.emit('cache-updated', message.url);
        break;
      case 'NETWORK_STATUS':
        this.emit('network-status-changed', message.online);
        break;
      default:
        console.log('Unknown service worker message:', message);
    }
  }

  /**
   * Check if service worker is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Check if an update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Apply pending update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.updateAvailable) {
      throw new Error('No update available');
    }

    const waitingWorker = this.registration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    // Wait for the new service worker to take control
    return new Promise((resolve) => {
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        this.updateAvailable = false;
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    });
  }

  /**
   * Get offline operation queue
   */
  async getOfflineQueue(): Promise<OfflineOperation[]> {
    return this.sendMessage({ type: 'GET_OFFLINE_QUEUE' });
  }

  /**
   * Force sync of offline operations
   */
  async forceSync(): Promise<void> {
    return this.sendMessage({ type: 'FORCE_SYNC' });
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName?: string): Promise<void> {
    return this.sendMessage({ 
      type: 'CLEAR_CACHE',
      data: { cacheName }
    });
  }

  /**
   * Update cache strategy for specific endpoint pattern
   */
  async updateCacheStrategy(pattern: RegExp, strategy: string): Promise<void> {
    return this.sendMessage({
      type: 'UPDATE_CACHE_STRATEGY',
      data: { pattern, strategy }
    });
  }

  /**
   * Send message to service worker
   */
  private async sendMessage(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No service worker controller available');
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 10000);
    });
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in service worker event listener for '${event}':`, error);
      }
    });
  }

  /**
   * Get cache storage estimate
   */
  async getCacheStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    usageDetails?: any;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageDetails: estimate.usageDetails,
      };
    }
    
    return { usage: 0, quota: 0 };
  }

  /**
   * Check if persistent storage is available
   */
  async isPersistentStorageAvailable(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persisted();
    }
    return false;
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persist();
    }
    return false;
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(urls: string[]): Promise<void> {
    const cache = await caches.open('boardguru-critical');
    
    const requests = urls.map(url => {
      return fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(error => {
        console.warn(`Failed to preload ${url}:`, error);
      });
    });

    await Promise.allSettled(requests);
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    online: boolean;
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } {
    const navigator = window.navigator as any;
    
    return {
      online: navigator.onLine,
      connectionType: navigator.connection?.type,
      effectiveType: navigator.connection?.effectiveType,
      downlink: navigator.connection?.downlink,
      rtt: navigator.connection?.rtt,
      saveData: navigator.connection?.saveData,
    };
  }

  /**
   * Monitor network changes
   */
  monitorNetworkChanges(): void {
    window.addEventListener('online', () => {
      this.emit('network-online');
    });

    window.addEventListener('offline', () => {
      this.emit('network-offline');
    });

    // Monitor connection changes if available
    const navigator = window.navigator as any;
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.emit('connection-changed', this.getNetworkStatus());
      });
    }
  }

  /**
   * Configure mobile-specific optimizations
   */
  async configureMobileOptimizations(options: {
    lowDataMode?: boolean;
    aggressiveCaching?: boolean;
    preloadCritical?: boolean;
    maxCacheSize?: number;
  }): Promise<void> {
    const { lowDataMode, aggressiveCaching, preloadCritical } = options;

    // Update cache strategies based on mobile context
    if (lowDataMode) {
      await this.updateCacheStrategy(/\/api\/assets/, 'cache-first');
      await this.updateCacheStrategy(/\.(jpg|png|gif)/, 'cache-first');
    }

    if (aggressiveCaching) {
      await this.updateCacheStrategy(/\/api\/organizations/, 'stale-while-revalidate');
      await this.updateCacheStrategy(/\/api\/me/, 'cache-first');
    }

    if (preloadCritical) {
      await this.preloadCriticalResources([
        '/dashboard',
        '/api/me',
        '/api/organizations',
        '/_next/static/css/app.css'
      ]);
    }
  }

  /**
   * Clean up old caches and data
   */
  async cleanup(): Promise<void> {
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      const currentVersion = 'boardguru-v1.2.0';
      
      // Delete old versions
      const deletePromises = cacheNames
        .filter(name => name.startsWith('boardguru-') && !name.includes(currentVersion))
        .map(name => caches.delete(name));
      
      await Promise.all(deletePromises);
      
      // Clean up IndexedDB if needed
      await this.cleanupIndexedDB();
      
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Clean up IndexedDB entries
   */
  private async cleanupIndexedDB(): Promise<void> {
    // This would clean up old offline operations, expired data, etc.
    // Implementation depends on your specific IndexedDB schema
  }

  /**
   * Get service worker metrics
   */
  async getMetrics(): Promise<{
    cacheHitRate: number;
    offlineOperations: number;
    cacheSize: number;
    lastSyncTime?: number;
  }> {
    try {
      const [offlineQueue, storage] = await Promise.all([
        this.getOfflineQueue(),
        this.getCacheStorageEstimate()
      ]);

      return {
        cacheHitRate: 0, // Would be tracked by service worker
        offlineOperations: offlineQueue.length,
        cacheSize: storage.usage,
        lastSyncTime: Date.now(), // Would be actual last sync time
      };
    } catch (error) {
      console.error('Failed to get service worker metrics:', error);
      return {
        cacheHitRate: 0,
        offlineOperations: 0,
        cacheSize: 0,
      };
    }
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();
export default serviceWorkerManager;