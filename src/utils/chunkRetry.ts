/**
 * Utility to handle chunk loading errors and retry
 */

let failedChunks = new Set<string>();

// Retry failed chunks with exponential backoff
export async function retryChunkLoad<T>(
  fn: () => Promise<T>,
  retriesLeft = 3,
  interval = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retriesLeft > 0 && error.name === 'ChunkLoadError') {
      console.warn(`Chunk load failed, retrying... (${retriesLeft} retries left)`);
      
      // Clear module cache if possible
      if (typeof window !== 'undefined' && 'webpackChunkName' in error) {
        const chunkName = error.webpackChunkName;
        if (!failedChunks.has(chunkName)) {
          failedChunks.add(chunkName);
          
          // Force reload the page if chunk repeatedly fails
          if (failedChunks.size > 3) {
            console.error('Multiple chunks failed to load. Reloading page...');
            window.location.reload();
            return Promise.reject(error);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      return retryChunkLoad(fn, retriesLeft - 1, interval * 2);
    }
    
    throw error;
  }
}

// Wrap dynamic import with retry logic
export function dynamicImportWithRetry<T = any>(
  importFn: () => Promise<T>
): Promise<T> {
  return retryChunkLoad(importFn);
}

// Global error handler for chunk load errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Loading chunk')) {
      console.error('Global chunk load error detected:', event.message);
      
      // Track failed chunks
      const match = event.message.match(/chunk (\d+)/);
      if (match) {
        const chunkId = match[1];
        failedChunks.add(chunkId);
        
        // If too many chunks fail, suggest reload
        if (failedChunks.size > 5) {
          console.error('Multiple chunk failures detected. Page reload recommended.');
          
          // Show user notification if possible
          if (typeof document !== 'undefined') {
            const notification = document.createElement('div');
            notification.innerHTML = `
              <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <span>Some resources failed to load.</span>
                <button onclick="window.location.reload()" style="background: white; color: #ef4444; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">
                  Reload Page
                </button>
              </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.remove();
            }, 10000);
          }
        }
      }
    }
  });
}

// Clear failed chunks periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (failedChunks.size > 0) {
      console.log('Clearing failed chunks cache');
      failedChunks.clear();
    }
  }, 60000); // Clear every minute
}