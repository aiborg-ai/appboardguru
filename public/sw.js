/**
 * BoardGuru Mobile Service Worker
 * Provides offline-first functionality with intelligent caching and sync
 */

const CACHE_VERSION = 'boardguru-v1.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_PAGE = '/offline';

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first', 
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/assets',
  '/organizations',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/framework.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints with specific caching strategies
const API_CACHE_RULES = [
  {
    pattern: /\/api\/assets\?.*networkOptimized=true/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  {
    pattern: /\/api\/organizations/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 10 * 60 * 1000, // 10 minutes
  },
  {
    pattern: /\/api\/me/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    ttl: 30 * 60 * 1000, // 30 minutes
  },
  {
    pattern: /\/api\/health/,
    strategy: CACHE_STRATEGIES.NETWORK_ONLY,
  },
  {
    pattern: /\/api\/sync/,
    strategy: CACHE_STRATEGIES.NETWORK_ONLY,
  },
];

// Offline operation queue
let offlineQueue = [];
let syncInProgress = false;

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Set up offline operation storage
      setupOfflineStorage(),
      // Initialize background sync registration
      self.registration.sync && self.registration.sync.register('background-sync'),
    ])
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('boardguru-') && cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event handler with intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    handleNonGetRequest(event);
    return;
  }
  
  // Handle different request types
  if (url.pathname.startsWith('/api/')) {
    handleApiRequest(event);
  } else if (isImageRequest(request)) {
    handleImageRequest(event);
  } else if (isStaticAsset(request)) {
    handleStaticAssetRequest(event);
  } else {
    handleNavigationRequest(event);
  }
});

// Handle API requests with mobile-optimized caching
function handleApiRequest(event) {
  const url = new URL(event.request.url);
  const cacheRule = findCacheRule(url.pathname + url.search);
  
  if (!cacheRule || cacheRule.strategy === CACHE_STRATEGIES.NETWORK_ONLY) {
    // Network only - queue for offline if needed
    event.respondWith(
      fetch(event.request).catch(() => {
        if (event.request.method === 'GET') {
          return queueOfflineRequest(event.request);
        }
        return new Response(JSON.stringify({
          error: 'Network unavailable',
          offline: true,
          timestamp: Date.now()
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  switch (cacheRule.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(event.request, API_CACHE, cacheRule.ttl));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(event.request, API_CACHE, cacheRule.ttl));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(event.request, API_CACHE, cacheRule.ttl));
      break;
    default:
      event.respondWith(networkFirst(event.request, API_CACHE));
  }
}

// Handle non-GET requests (POST, PUT, DELETE, etc.)
function handleNonGetRequest(event) {
  // For mutation requests, try network first, queue if offline
  event.respondWith(
    fetch(event.request).catch(() => {
      // Queue the request for later sync
      return queueOfflineOperation(event.request).then(() => {
        return new Response(JSON.stringify({
          success: true,
          queued: true,
          message: 'Operation queued for sync when online',
          timestamp: Date.now()
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    })
  );
}

// Handle image requests with compression and caching
function handleImageRequest(event) {
  event.respondWith(
    cacheFirst(event.request, IMAGE_CACHE, 24 * 60 * 60 * 1000) // 24 hours
      .catch(() => {
        // Return placeholder image for offline
        return new Response(createPlaceholderImage(), {
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      })
  );
}

// Handle static assets
function handleStaticAssetRequest(event) {
  event.respondWith(
    cacheFirst(event.request, STATIC_CACHE)
  );
}

// Handle navigation requests
function handleNavigationRequest(event) {
  event.respondWith(
    networkFirst(event.request, DYNAMIC_CACHE).catch(() => {
      // Return offline page for navigation failures
      return caches.match(OFFLINE_PAGE);
    })
  );
}

// Cache strategies implementation
async function cacheFirst(request, cacheName, ttl) {
  const cached = await getCachedResponse(request, cacheName, ttl);
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  await cacheResponse(request, response.clone(), cacheName, ttl);
  return response;
}

async function networkFirst(request, cacheName, ttl) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response.clone(), cacheName, ttl);
    return response;
  } catch (error) {
    const cached = await getCachedResponse(request, cacheName, ttl);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, ttl) {
  const cached = await getCachedResponse(request, cacheName, ttl);
  
  // Start network request in background
  const networkRequest = fetch(request).then(async (response) => {
    await cacheResponse(request, response.clone(), cacheName, ttl);
    return response;
  }).catch(() => null);
  
  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Update cache in background
    networkRequest.then(() => {
      // Notify clients of updated data
      notifyClientsOfUpdate(request.url);
    });
    return cached;
  }
  
  return networkRequest;
}

// Cache management utilities
async function getCachedResponse(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (!cached) return null;
  
  // Check TTL if specified
  if (ttl) {
    const cachedDate = new Date(cached.headers.get('sw-cached-date'));
    if (Date.now() - cachedDate.getTime() > ttl) {
      await cache.delete(request);
      return null;
    }
  }
  
  return cached;
}

async function cacheResponse(request, response, cacheName, ttl) {
  // Don't cache error responses
  if (!response.ok) return;
  
  const cache = await caches.open(cacheName);
  
  // Add caching metadata
  const responseWithMetadata = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'sw-cached-date': new Date().toISOString(),
      'sw-cache-ttl': ttl || 0,
    },
  });
  
  await cache.put(request, responseWithMetadata);
}

// Offline operation queue management
async function queueOfflineOperation(request) {
  const operation = {
    id: generateId(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  // Store in IndexedDB for persistence
  await storeOfflineOperation(operation);
  
  // Register for background sync
  if (self.registration.sync) {
    await self.registration.sync.register('offline-operation-sync');
  }
  
  return operation;
}

async function queueOfflineRequest(request) {
  // For GET requests that failed, return cached version with offline indicator
  const cached = await caches.match(request);
  if (cached) {
    const response = cached.clone();
    response.headers.set('sw-offline', 'true');
    return response;
  }
  
  // Return offline indicator response
  return new Response(JSON.stringify({
    error: 'Offline - data not available',
    offline: true,
    cached: false
  }), {
    status: 503,
    headers: { 
      'Content-Type': 'application/json',
      'sw-offline': 'true'
    }
  });
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-operation-sync' || event.tag === 'background-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  if (syncInProgress) return;
  
  syncInProgress = true;
  console.log('[SW] Processing offline queue');
  
  try {
    const operations = await getOfflineOperations();
    
    for (const operation of operations) {
      try {
        const request = new Request(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body,
        });
        
        const response = await fetch(request);
        
        if (response.ok) {
          await removeOfflineOperation(operation.id);
          console.log('[SW] Offline operation synced:', operation.id);
        } else {
          await updateOperationRetryCount(operation.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync operation:', operation.id, error);
        await updateOperationRetryCount(operation.id);
      }
    }
  } finally {
    syncInProgress = false;
  }
}

// IndexedDB operations for offline storage
async function setupOfflineStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BoardGuruOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('operations')) {
        const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
        operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('cache-metadata')) {
        db.createObjectStore('cache-metadata', { keyPath: 'key' });
      }
    };
  });
}

async function storeOfflineOperation(operation) {
  const db = await openDB();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  await store.add(operation);
}

async function getOfflineOperations() {
  const db = await openDB();
  const transaction = db.transaction(['operations'], 'readonly');
  const store = transaction.objectStore('operations');
  return await store.getAll();
}

async function removeOfflineOperation(id) {
  const db = await openDB();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  await store.delete(id);
}

async function updateOperationRetryCount(id) {
  const db = await openDB();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  
  const operation = await store.get(id);
  if (operation) {
    operation.retryCount = (operation.retryCount || 0) + 1;
    
    // Remove operations that have failed too many times
    if (operation.retryCount > 5) {
      await store.delete(id);
    } else {
      await store.put(operation);
    }
  }
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BoardGuruOffline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Utility functions
function findCacheRule(pathname) {
  return API_CACHE_RULES.find(rule => rule.pattern.test(pathname));
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(new URL(request.url).pathname);
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/_next/') || 
         url.pathname.startsWith('/static/') ||
         STATIC_ASSETS.includes(url.pathname);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createPlaceholderImage() {
  return `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">
        Offline
      </text>
    </svg>
  `;
}

// Notify clients of updates
function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        url: url,
        timestamp: Date.now()
      });
    });
  });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_OFFLINE_QUEUE':
      getOfflineOperations().then(operations => {
        event.ports[0].postMessage({ operations });
      });
      break;
      
    case 'FORCE_SYNC':
      processOfflineQueue().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(data.cacheName || DYNAMIC_CACHE).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'UPDATE_CACHE_STRATEGY':
      // Update caching strategy for specific endpoints
      updateCacheStrategy(data.pattern, data.strategy);
      event.ports[0].postMessage({ success: true });
      break;
  }
});

function updateCacheStrategy(pattern, strategy) {
  const ruleIndex = API_CACHE_RULES.findIndex(rule => 
    rule.pattern.toString() === pattern.toString()
  );
  
  if (ruleIndex >= 0) {
    API_CACHE_RULES[ruleIndex].strategy = strategy;
  } else {
    API_CACHE_RULES.push({ pattern, strategy });
  }
}

// Network status monitoring
self.addEventListener('online', () => {
  console.log('[SW] Network back online - processing offline queue');
  processOfflineQueue();
  
  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_STATUS',
        online: true,
        timestamp: Date.now()
      });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('[SW] Network offline');
  
  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_STATUS',
        online: false,
        timestamp: Date.now()
      });
    });
  });
});

console.log('[SW] Service Worker v' + CACHE_VERSION + ' loaded');