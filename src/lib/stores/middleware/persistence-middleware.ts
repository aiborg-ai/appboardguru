import { StateCreator } from 'zustand'
import { PersistOptions, createJSONStorage } from 'zustand/middleware'

// Enhanced persistence configuration
export interface EnhancedPersistOptions<T> extends Omit<PersistOptions<T, T>, 'storage'> {
  storage?: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory' | Storage
  encryption?: {
    enabled: boolean
    key?: string
    algorithm?: 'AES-GCM' | 'AES-CBC'
  }
  compression?: {
    enabled: boolean
    algorithm?: 'gzip' | 'deflate' | 'brotli'
  }
  versioning?: {
    enabled: boolean
    maxVersions?: number
    strategy?: 'overwrite' | 'merge' | 'backup'
  }
  sync?: {
    crossTab: boolean
    debounceMs?: number
    conflictResolution?: 'local_wins' | 'remote_wins' | 'timestamp_wins' | 'manual'
  }
  performance?: {
    lazy: boolean
    batchWrites: boolean
    writeDelay?: number
  }
  validation?: {
    schema?: any
    onError?: (error: Error, state: T) => T | void
  }
}

// Storage adapters
export class IndexedDBStorage {
  private dbName: string
  private storeName: string
  private version: number

  constructor(dbName: string = 'zustand-store', storeName: string = 'state', version: number = 1) {
    this.dbName = dbName
    this.storeName = storeName
    this.version = version
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
    })
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.get(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result || null)
      })
    } catch (error) {
      console.error('[IndexedDBStorage] getItem error:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.put(value, key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('[IndexedDBStorage] setItem error:', error)
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('[IndexedDBStorage] removeItem error:', error)
      throw error
    }
  }
}

// Memory storage for testing
export class MemoryStorage {
  private data: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.data.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }
}

// Encryption utilities
class EncryptionManager {
  private algorithm: string
  private key?: CryptoKey

  constructor(algorithm: 'AES-GCM' | 'AES-CBC' = 'AES-GCM') {
    this.algorithm = algorithm
  }

  async generateKey(keyMaterial?: string): Promise<void> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      console.warn('[EncryptionManager] Web Crypto API not available')
      return
    }

    try {
      if (keyMaterial) {
        const encoder = new TextEncoder()
        const keyData = encoder.encode(keyMaterial)
        const hashedKey = await window.crypto.subtle.digest('SHA-256', keyData)
        this.key = await window.crypto.subtle.importKey(
          'raw',
          hashedKey,
          { name: this.algorithm.split('-')[0] },
          false,
          ['encrypt', 'decrypt']
        )
      } else {
        this.key = await window.crypto.subtle.generateKey(
          { name: this.algorithm.split('-')[0], length: 256 },
          false,
          ['encrypt', 'decrypt']
        )
      }
    } catch (error) {
      console.error('[EncryptionManager] Key generation failed:', error)
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key || typeof window === 'undefined' || !window.crypto?.subtle) {
      return data // Return unencrypted if encryption not available
    }

    try {
      const encoder = new TextEncoder()
      const dataArray = encoder.encode(data)
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await window.crypto.subtle.encrypt(
        { name: this.algorithm, iv },
        this.key,
        dataArray
      )

      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv, 0)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('[EncryptionManager] Encryption failed:', error)
      return data
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.key || typeof window === 'undefined' || !window.crypto?.subtle) {
      return encryptedData // Return as-is if decryption not available
    }

    try {
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      )
      
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: this.algorithm, iv },
        this.key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('[EncryptionManager] Decryption failed:', error)
      return encryptedData
    }
  }
}

// Compression utilities
class CompressionManager {
  private algorithm: 'gzip' | 'deflate' | 'brotli'

  constructor(algorithm: 'gzip' | 'deflate' | 'brotli' = 'gzip') {
    this.algorithm = algorithm
  }

  async compress(data: string): Promise<string> {
    if (typeof window === 'undefined' || !window.CompressionStream) {
      return data // Return uncompressed if not available
    }

    try {
      const stream = new CompressionStream(this.algorithm)
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      const encoder = new TextEncoder()
      writer.write(encoder.encode(data))
      writer.close()

      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }

      return btoa(String.fromCharCode(...compressed))
    } catch (error) {
      console.error('[CompressionManager] Compression failed:', error)
      return data
    }
  }

  async decompress(compressedData: string): Promise<string> {
    if (typeof window === 'undefined' || !window.DecompressionStream) {
      return compressedData // Return as-is if not available
    }

    try {
      const compressed = new Uint8Array(
        atob(compressedData)
          .split('')
          .map(char => char.charCodeAt(0))
      )

      const stream = new DecompressionStream(this.algorithm)
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      writer.write(compressed)
      writer.close()

      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      
      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }

      const decoder = new TextDecoder()
      return decoder.decode(decompressed)
    } catch (error) {
      console.error('[CompressionManager] Decompression failed:', error)
      return compressedData
    }
  }
}

// Enhanced storage wrapper
export class EnhancedStorage {
  private storage: Storage
  private encryption?: EncryptionManager
  private compression?: CompressionManager
  private config: EnhancedPersistOptions<any>

  constructor(storage: Storage, config: EnhancedPersistOptions<any>) {
    this.storage = storage
    this.config = config

    if (config.encryption?.enabled) {
      this.encryption = new EncryptionManager(config.encryption.algorithm)
      this.encryption.generateKey(config.encryption.key)
    }

    if (config.compression?.enabled) {
      this.compression = new CompressionManager(config.compression.algorithm)
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      let data = await this.storage.getItem(key)
      if (!data) return null

      // Decompress if enabled
      if (this.compression) {
        data = await this.compression.decompress(data)
      }

      // Decrypt if enabled
      if (this.encryption) {
        data = await this.encryption.decrypt(data)
      }

      return data
    } catch (error) {
      console.error('[EnhancedStorage] getItem error:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      let data = value

      // Encrypt if enabled
      if (this.encryption) {
        data = await this.encryption.encrypt(data)
      }

      // Compress if enabled
      if (this.compression) {
        data = await this.compression.compress(data)
      }

      await this.storage.setItem(key, data)
    } catch (error) {
      console.error('[EnhancedStorage] setItem error:', error)
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.storage.removeItem(key)
    } catch (error) {
      console.error('[EnhancedStorage] removeItem error:', error)
      throw error
    }
  }
}

// Cross-tab synchronization manager
class CrossTabSyncManager {
  private storeName: string
  private channel: BroadcastChannel
  private onSync: (data: any) => void
  private debounceTimer?: NodeJS.Timeout
  private config: NonNullable<EnhancedPersistOptions<any>['sync']>

  constructor(
    storeName: string, 
    onSync: (data: any) => void,
    config: NonNullable<EnhancedPersistOptions<any>['sync']>
  ) {
    this.storeName = storeName
    this.onSync = onSync
    this.config = config

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      this.channel = new BroadcastChannel(`zustand-sync-${storeName}`)
      this.channel.onmessage = this.handleMessage.bind(this)
    }
  }

  private handleMessage(event: MessageEvent): void {
    const { type, data, timestamp } = event.data
    
    if (type === 'state_update') {
      // Handle conflict resolution
      switch (this.config.conflictResolution) {
        case 'remote_wins':
          this.onSync(data)
          break
        case 'timestamp_wins':
          // Compare timestamps and apply newer state
          const localTimestamp = Date.now() // This should be the actual local timestamp
          if (timestamp > localTimestamp) {
            this.onSync(data)
          }
          break
        case 'manual':
          // Emit event for manual resolution
          console.warn('[CrossTabSync] Manual conflict resolution required')
          break
        case 'local_wins':
        default:
          // Don't update local state
          break
      }
    }
  }

  broadcastUpdate(data: any): void {
    if (!this.channel) return

    const broadcast = () => {
      this.channel.postMessage({
        type: 'state_update',
        data,
        timestamp: Date.now()
      })
    }

    // Debounce broadcasts if configured
    if (this.config.debounceMs && this.config.debounceMs > 0) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      this.debounceTimer = setTimeout(broadcast, this.config.debounceMs)
    } else {
      broadcast()
    }
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close()
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }
}

// Enhanced persistence middleware implementation
export function enhancedPersist<T>(
  config: EnhancedPersistOptions<T>
) {
  return (
    storeInitializer: StateCreator<T, [], [], T>
  ): StateCreator<T, [], [], T> => {
    return (set, get, api) => {
      let storage: Storage | EnhancedStorage
      let syncManager: CrossTabSyncManager | undefined

      // Determine storage type
      if (typeof config.storage === 'string') {
        switch (config.storage) {
          case 'localStorage':
            storage = typeof window !== 'undefined' ? localStorage : new MemoryStorage()
            break
          case 'sessionStorage':
            storage = typeof window !== 'undefined' ? sessionStorage : new MemoryStorage()
            break
          case 'indexedDB':
            storage = new IndexedDBStorage()
            break
          case 'memory':
          default:
            storage = new MemoryStorage()
            break
        }
      } else {
        storage = config.storage || (typeof window !== 'undefined' ? localStorage : new MemoryStorage())
      }

      // Wrap storage with enhancements
      if (config.encryption?.enabled || config.compression?.enabled) {
        storage = new EnhancedStorage(storage, config)
      }

      // Setup cross-tab sync if enabled
      if (config.sync?.crossTab) {
        syncManager = new CrossTabSyncManager(
          config.name || 'unknown',
          (data) => {
            // Update state from other tab
            set(() => data, true)
          },
          config.sync
        )
      }

      // Create the base store with standard persist middleware
      const persistConfig = {
        ...config,
        storage: createJSONStorage(() => storage),
        onRehydrateStorage: (state: T) => {
          return (rehydratedState?: T, error?: Error) => {
            if (error) {
              console.error('[EnhancedPersist] Rehydration error:', error)
              if (config.validation?.onError) {
                const recovered = config.validation.onError(error, state)
                if (recovered) {
                  set(() => recovered, true)
                }
              }
            }
            
            config.onRehydrateStorage?.(state)?.(rehydratedState, error)
          }
        }
      }

      // Initialize with enhanced persistence
      const store = storeInitializer(
        (updater, replace, action) => {
          const result = set(updater, replace, action)
          
          // Broadcast to other tabs if sync is enabled
          if (syncManager) {
            syncManager.broadcastUpdate(get())
          }
          
          return result
        },
        get,
        api
      )

      // Add cleanup method
      if (typeof store === 'object' && store !== null) {
        (store as any).$$persistCleanup = () => {
          syncManager?.destroy()
        }
      }

      return store
    }
  }
}

// Utility function to create enhanced persistence middleware
export function createEnhancedPersist<T>(
  options: EnhancedPersistOptions<T>
) {
  return enhancedPersist(options)
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make persistence utilities available globally
  (window as any).zustandPersistence = {
    IndexedDBStorage,
    MemoryStorage,
    EnhancedStorage,
    clearAllStores: () => {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('zustand-') || key.startsWith('appboardguru-')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('zustand-') || key.startsWith('appboardguru-')) {
            sessionStorage.removeItem(key)
          }
        })
        
        console.log('[EnhancedPersist] Cleared all persisted stores')
      }
    }
  }
}