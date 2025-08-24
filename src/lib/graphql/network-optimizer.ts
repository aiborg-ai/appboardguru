/**
 * Network Optimizer for Mobile Performance
 * Handles compression, image optimization, and network-aware data fetching
 */

export interface CompressionOptions {
  level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  imageQuality: number;
  textCompression: boolean;
  removeMetadata: boolean;
}

export interface ImageOptimization {
  width?: number;
  height?: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  progressive: boolean;
  lossless: boolean;
}

export interface NetworkConditions {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export class NetworkOptimizer {
  private compressionWorker: Worker | null = null;
  private imageCache = new Map<string, Blob>();
  private networkConditions: NetworkConditions | null = null;

  constructor() {
    this.initCompressionWorker();
    this.monitorNetworkConditions();
  }

  /**
   * Initialize compression worker for background processing
   */
  private initCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      const workerCode = `
        // Compression worker code
        self.onmessage = function(e) {
          const { data, options, id } = e.data;
          
          try {
            const compressed = compressData(data, options);
            self.postMessage({ id, result: compressed, success: true });
          } catch (error) {
            self.postMessage({ id, error: error.message, success: false });
          }
        };
        
        function compressData(data, options) {
          if (typeof data === 'string') {
            return compressText(data, options);
          } else if (data instanceof ArrayBuffer) {
            return compressBuffer(data, options);
          }
          return data;
        }
        
        function compressText(text, options) {
          if (!options.textCompression) return text;
          
          // Simple text compression - remove extra whitespace
          let compressed = text.replace(/\\s+/g, ' ').trim();
          
          if (options.removeMetadata) {
            // Remove metadata fields
            try {
              const obj = JSON.parse(compressed);
              delete obj.metadata;
              delete obj.auditLog;
              delete obj.fullDescription;
              compressed = JSON.stringify(obj);
            } catch (e) {
              // Not JSON, skip
            }
          }
          
          return compressed;
        }
        
        function compressBuffer(buffer, options) {
          // In a real implementation, would use compression libraries
          return buffer;
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    }
  }

  /**
   * Monitor network conditions
   */
  private monitorNetworkConditions(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.networkConditions = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };

      connection.addEventListener('change', () => {
        this.networkConditions = {
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
      });
    }
  }

  /**
   * Compress response data based on network conditions
   */
  async compressResponse(data: any, level: string = 'MEDIUM'): Promise<any> {
    const options = this.getCompressionOptions(level);
    
    if (!options.textCompression && level === 'NONE') {
      return data;
    }

    try {
      if (this.compressionWorker) {
        return await this.compressWithWorker(data, options);
      } else {
        return this.compressSync(data, options);
      }
    } catch (error) {
      console.error('Compression failed:', error);
      return data; // Return original data if compression fails
    }
  }

  /**
   * Compress file for upload
   */
  async compressFile(file: File, level: string = 'MEDIUM'): Promise<File> {
    if (file.type.startsWith('image/')) {
      return this.compressImage(file, level);
    } else if (file.type.startsWith('text/') || file.type === 'application/json') {
      return this.compressTextFile(file, level);
    } else {
      return file; // Don't compress other file types
    }
  }

  /**
   * Compress image file
   */
  private async compressImage(file: File, level: string): Promise<File> {
    const cacheKey = `${file.name}-${file.size}-${level}`;
    
    if (this.imageCache.has(cacheKey)) {
      const cachedBlob = this.imageCache.get(cacheKey)!;
      return new File([cachedBlob], file.name, { type: file.type });
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const optimization = this.getImageOptimization(level);
        
        // Calculate dimensions
        let { width, height } = this.calculateImageDimensions(
          img.width,
          img.height,
          optimization.width,
          optimization.height
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              this.imageCache.set(cacheKey, blob);
              const compressedFile = new File([blob], file.name, { 
                type: `image/${optimization.format}` 
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          `image/${optimization.format}`,
          optimization.quality / 100
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compress text file
   */
  private async compressTextFile(file: File, level: string): Promise<File> {
    const text = await file.text();
    const options = this.getCompressionOptions(level);
    const compressed = this.compressSync(text, options);
    
    return new File([compressed], file.name, { type: file.type });
  }

  /**
   * Compress data using web worker
   */
  private async compressWithWorker(data: any, options: CompressionOptions): Promise<any> {
    if (!this.compressionWorker) {
      throw new Error('Compression worker not available');
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ data, options, id });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        reject(new Error('Compression timeout'));
      }, 10000);
    });
  }

  /**
   * Synchronous compression fallback
   */
  private compressSync(data: any, options: CompressionOptions): any {
    if (typeof data === 'string') {
      if (!options.textCompression) return data;
      
      // Remove extra whitespace
      let compressed = data.replace(/\s+/g, ' ').trim();
      
      if (options.removeMetadata) {
        try {
          const obj = JSON.parse(compressed);
          delete obj.metadata;
          delete obj.auditLog;
          delete obj.fullDescription;
          delete obj.detailedAnalysis;
          compressed = JSON.stringify(obj);
        } catch (e) {
          // Not JSON, continue
        }
      }
      
      return compressed;
    } else if (typeof data === 'object') {
      const compressed = { ...data };
      
      if (options.removeMetadata) {
        delete compressed.metadata;
        delete compressed.auditLog;
        delete compressed.fullDescription;
        delete compressed.detailedAnalysis;
        
        // Compress arrays
        if (Array.isArray(compressed.items) && compressed.items.length > 20) {
          compressed.items = compressed.items.slice(0, 20);
          compressed.hasMore = true;
          compressed.totalCount = data.items?.length || 0;
        }
      }
      
      return compressed;
    }
    
    return data;
  }

  /**
   * Get compression options based on level
   */
  private getCompressionOptions(level: string): CompressionOptions {
    switch (level) {
      case 'NONE':
        return {
          level: 'NONE',
          imageQuality: 100,
          textCompression: false,
          removeMetadata: false,
        };
      case 'LOW':
        return {
          level: 'LOW',
          imageQuality: 90,
          textCompression: true,
          removeMetadata: false,
        };
      case 'MEDIUM':
        return {
          level: 'MEDIUM',
          imageQuality: 80,
          textCompression: true,
          removeMetadata: true,
        };
      case 'HIGH':
        return {
          level: 'HIGH',
          imageQuality: 70,
          textCompression: true,
          removeMetadata: true,
        };
      case 'MAXIMUM':
        return {
          level: 'MAXIMUM',
          imageQuality: 50,
          textCompression: true,
          removeMetadata: true,
        };
      default:
        return this.getCompressionOptions('MEDIUM');
    }
  }

  /**
   * Get image optimization settings based on compression level
   */
  private getImageOptimization(level: string): ImageOptimization {
    switch (level) {
      case 'NONE':
        return {
          quality: 100,
          format: 'png',
          progressive: false,
          lossless: true,
        };
      case 'LOW':
        return {
          quality: 90,
          format: 'jpeg',
          progressive: true,
          lossless: false,
        };
      case 'MEDIUM':
        return {
          width: 1920,
          height: 1920,
          quality: 80,
          format: 'webp',
          progressive: true,
          lossless: false,
        };
      case 'HIGH':
        return {
          width: 1280,
          height: 1280,
          quality: 70,
          format: 'webp',
          progressive: true,
          lossless: false,
        };
      case 'MAXIMUM':
        return {
          width: 800,
          height: 800,
          quality: 50,
          format: 'webp',
          progressive: true,
          lossless: false,
        };
      default:
        return this.getImageOptimization('MEDIUM');
    }
  }

  /**
   * Calculate optimal image dimensions
   */
  private calculateImageDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Optimize fetch request based on network conditions
   */
  optimizeFetchRequest(url: string, options: RequestInit = {}): RequestInit {
    const conditions = this.networkConditions;
    const optimized = { ...options };

    // Add compression headers
    optimized.headers = {
      ...optimized.headers,
      'Accept-Encoding': 'gzip, deflate, br',
    };

    if (conditions) {
      // Add network condition headers
      optimized.headers = {
        ...optimized.headers,
        'Connection-Type': conditions.connectionType,
        'Effective-Type': conditions.effectiveType,
        'Downlink': conditions.downlink.toString(),
        'RTT': conditions.rtt.toString(),
        'Save-Data': conditions.saveData ? 'on' : 'off',
      };

      // Adjust timeout based on network conditions
      if (conditions.effectiveType === '2g' || conditions.effectiveType === 'slow-2g') {
        // Longer timeout for slow connections
        optimized.signal = AbortSignal.timeout(30000); // 30 seconds
      } else if (conditions.effectiveType === '3g') {
        optimized.signal = AbortSignal.timeout(15000); // 15 seconds
      } else {
        optimized.signal = AbortSignal.timeout(10000); // 10 seconds
      }

      // Request minimal data for slow connections
      if (conditions.saveData || conditions.effectiveType === '2g') {
        if (url.includes('?')) {
          url += '&minimal=true&compress=true';
        } else {
          url += '?minimal=true&compress=true';
        }
      }
    }

    return optimized;
  }

  /**
   * Batch multiple requests for efficiency
   */
  async batchRequests(requests: Array<{ url: string; options?: RequestInit }>): Promise<Response[]> {
    const conditions = this.networkConditions;
    let batchSize = 5; // Default batch size

    // Adjust batch size based on network conditions
    if (conditions) {
      if (conditions.effectiveType === '2g' || conditions.effectiveType === 'slow-2g') {
        batchSize = 2;
      } else if (conditions.effectiveType === '3g') {
        batchSize = 3;
      } else if (conditions.effectiveType === '4g') {
        batchSize = 8;
      } else if (conditions.effectiveType === '5g') {
        batchSize = 12;
      }
    }

    const results: Response[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const promises = batch.map(({ url, options }) =>
        fetch(url, this.optimizeFetchRequest(url, options))
      );

      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } catch (error) {
        console.error('Batch request failed:', error);
        // Add error responses for failed batch
        batch.forEach(() => {
          results.push(new Response(null, { status: 500, statusText: 'Batch failed' }));
        });
      }

      // Add delay between batches for slow connections
      if (conditions && (conditions.effectiveType === '2g' || conditions.effectiveType === '3g')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Prefetch resources intelligently
   */
  async prefetchResources(urls: string[], priority: 'low' | 'high' = 'low'): Promise<void> {
    const conditions = this.networkConditions;
    
    // Skip prefetching on slow connections unless high priority
    if (conditions && priority === 'low') {
      if (conditions.effectiveType === '2g' || conditions.effectiveType === 'slow-2g' || conditions.saveData) {
        return;
      }
    }

    // Prefetch with low priority
    const prefetchPromises = urls.map(url =>
      fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'force-cache',
        priority: 'low',
        ...this.optimizeFetchRequest(url),
      }).catch(error => {
        console.warn(`Prefetch failed for ${url}:`, error);
      })
    );

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions | null {
    return this.networkConditions;
  }

  /**
   * Check if on metered connection
   */
  isMeteredConnection(): boolean {
    return this.networkConditions?.connectionType === 'cellular' || 
           this.networkConditions?.saveData === true;
  }

  /**
   * Get recommended optimization level based on network
   */
  getRecommendedCompressionLevel(): string {
    if (!this.networkConditions) return 'MEDIUM';

    const { effectiveType, saveData, connectionType } = this.networkConditions;

    if (saveData) return 'MAXIMUM';
    if (connectionType === 'cellular' && effectiveType === '2g') return 'MAXIMUM';
    if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'HIGH';
    if (effectiveType === '3g') return 'MEDIUM';
    if (effectiveType === '4g') return 'LOW';
    if (effectiveType === '5g') return 'NONE';

    return 'MEDIUM';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
    this.imageCache.clear();
  }
}

export default NetworkOptimizer;