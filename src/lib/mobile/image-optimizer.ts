/**
 * Image Optimizer for Mobile Performance
 * Handles responsive images, lazy loading, and format optimization
 */

export interface ImageOptimizationOptions {
  quality: number;
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  width?: number;
  height?: number;
  devicePixelRatio: number;
  lazyLoading: boolean;
  progressive: boolean;
  blur: boolean;
  placeholder: 'blur' | 'empty' | 'custom';
  customPlaceholder?: string;
}

export interface ResponsiveImageConfig {
  breakpoints: { [key: string]: number };
  sizes: string;
  srcSet: string[];
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  aspectRatio: number;
  dominant_color?: string;
}

export class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache = new Map<string, HTMLImageElement>();
  private metadataCache = new Map<string, ImageMetadata>();
  private intersectionObserver: IntersectionObserver | null = null;
  private lazyImages = new Set<HTMLImageElement>();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.initLazyLoading();
  }

  /**
   * Initialize lazy loading with Intersection Observer
   */
  private initLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              this.loadLazyImage(img);
              this.intersectionObserver?.unobserve(img);
            }
          });
        },
        {
          rootMargin: '50px 0px', // Start loading 50px before image comes into view
          threshold: 0.01,
        }
      );
    }
  }

  /**
   * Optimize image for mobile display
   */
  async optimizeImage(
    src: string, 
    options: Partial<ImageOptimizationOptions> = {}
  ): Promise<string> {
    const config = this.getDefaultOptions(options);
    
    // Check cache first
    const cacheKey = this.generateCacheKey(src, config);
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!.src;
    }

    try {
      const img = await this.loadImage(src);
      const optimized = await this.processImage(img, config);
      
      // Cache the result
      this.imageCache.set(cacheKey, optimized);
      
      return optimized.src;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return src; // Return original on failure
    }
  }

  /**
   * Create responsive image configuration
   */
  createResponsiveConfig(
    src: string,
    options: Partial<ImageOptimizationOptions> = {}
  ): ResponsiveImageConfig {
    const config = this.getDefaultOptions(options);
    
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };

    const srcSet = Object.entries(breakpoints).map(([key, width]) => {
      const optimizedSrc = this.generateOptimizedUrl(src, {
        ...config,
        width: Math.min(width, config.width || width),
      });
      return `${optimizedSrc} ${width}w`;
    });

    const sizes = Object.entries(breakpoints)
      .map(([key, width]) => `(max-width: ${width}px) ${width}px`)
      .join(', ');

    return {
      breakpoints,
      sizes,
      srcSet,
    };
  }

  /**
   * Generate optimized image URL with parameters
   */
  generateOptimizedUrl(
    src: string, 
    options: Partial<ImageOptimizationOptions>
  ): string {
    const url = new URL(src, window.location.origin);
    const params = new URLSearchParams();

    if (options.quality !== undefined) {
      params.set('q', options.quality.toString());
    }

    if (options.format && options.format !== 'auto') {
      params.set('fm', options.format);
    }

    if (options.width) {
      params.set('w', options.width.toString());
    }

    if (options.height) {
      params.set('h', options.height.toString());
    }

    if (options.devicePixelRatio && options.devicePixelRatio > 1) {
      params.set('dpr', options.devicePixelRatio.toString());
    }

    if (options.progressive) {
      params.set('fm', 'jpg');
      params.set('fl', 'progressive');
    }

    // Add mobile optimization flag
    params.set('mobile', '1');

    url.search = params.toString();
    return url.toString();
  }

  /**
   * Create lazy loading image element
   */
  createLazyImage(
    src: string,
    options: Partial<ImageOptimizationOptions> = {}
  ): HTMLImageElement {
    const config = this.getDefaultOptions(options);
    const img = document.createElement('img');
    
    // Set data attributes for lazy loading
    img.dataset.src = src;
    img.dataset.lazy = 'true';
    
    // Add placeholder
    if (config.placeholder !== 'empty') {
      img.src = this.createPlaceholder(config);
    }

    // Add responsive attributes
    const responsive = this.createResponsiveConfig(src, config);
    img.dataset.srcset = responsive.srcSet.join(', ');
    img.sizes = responsive.sizes;

    // Add loading attribute for native lazy loading
    img.loading = 'lazy';
    img.decoding = 'async';

    // Add intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(img);
      this.lazyImages.add(img);
    }

    return img;
  }

  /**
   * Create image placeholder
   */
  private createPlaceholder(options: ImageOptimizationOptions): string {
    switch (options.placeholder) {
      case 'blur':
        return this.createBlurPlaceholder(options);
      case 'custom':
        return options.customPlaceholder || this.createEmptyPlaceholder();
      default:
        return this.createEmptyPlaceholder();
    }
  }

  /**
   * Create blur placeholder
   */
  private createBlurPlaceholder(options: ImageOptimizationOptions): string {
    const width = 40;
    const height = Math.round(width / (options.width || 1) * (options.height || 1));
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Create a simple gradient as blur effect
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    return this.canvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Create empty placeholder
   */
  private createEmptyPlaceholder(): string {
    return 'data:image/svg+xml,' + encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12">
          Loading...
        </text>
      </svg>
    `);
  }

  /**
   * Load lazy image when it comes into view
   */
  private async loadLazyImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (!src) return;

    try {
      // Preload the image
      const preloadImg = new Image();
      preloadImg.src = src;
      if (srcset) preloadImg.srcset = srcset;
      
      await new Promise((resolve, reject) => {
        preloadImg.onload = resolve;
        preloadImg.onerror = reject;
      });

      // Apply the image with fade-in effect
      img.style.transition = 'opacity 0.3s ease-in-out';
      img.style.opacity = '0';
      
      img.src = src;
      if (srcset) img.srcset = srcset;
      
      img.onload = () => {
        img.style.opacity = '1';
        img.dataset.loaded = 'true';
        this.lazyImages.delete(img);
      };

    } catch (error) {
      console.error('Lazy image load failed:', error);
      // Show error placeholder
      img.src = this.createErrorPlaceholder();
    }
  }

  /**
   * Create error placeholder
   */
  private createErrorPlaceholder(): string {
    return 'data:image/svg+xml,' + encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fef2f2"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#dc2626" font-size="10">
          Failed to load
        </text>
      </svg>
    `);
  }

  /**
   * Load image and return promise
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Process image through canvas for optimization
   */
  private async processImage(
    img: HTMLImageElement, 
    options: ImageOptimizationOptions
  ): Promise<HTMLImageElement> {
    // Calculate dimensions
    const { width, height } = this.calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      options.width,
      options.height
    );

    // Set canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Apply image smoothing
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Draw image
    this.ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob and create new image
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to blob conversion failed'));
            return;
          }

          const optimizedImg = new Image();
          const url = URL.createObjectURL(blob);
          
          optimizedImg.onload = () => {
            URL.revokeObjectURL(url);
            resolve(optimizedImg);
          };
          
          optimizedImg.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Optimized image load failed'));
          };
          
          optimizedImg.src = url;
        },
        `image/${options.format === 'auto' ? 'webp' : options.format}`,
        options.quality / 100
      );
    });
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (targetWidth && !targetHeight) {
      width = targetWidth;
      height = width / aspectRatio;
    } else if (!targetWidth && targetHeight) {
      height = targetHeight;
      width = height * aspectRatio;
    } else if (targetWidth && targetHeight) {
      // Fit within bounds while maintaining aspect ratio
      const targetAspectRatio = targetWidth / targetHeight;
      
      if (aspectRatio > targetAspectRatio) {
        width = targetWidth;
        height = width / aspectRatio;
      } else {
        height = targetHeight;
        width = height * aspectRatio;
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Extract image metadata
   */
  async getImageMetadata(src: string): Promise<ImageMetadata> {
    if (this.metadataCache.has(src)) {
      return this.metadataCache.get(src)!;
    }

    try {
      const img = await this.loadImage(src);
      
      const metadata: ImageMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: this.detectImageFormat(src),
        size: 0, // Would need server-side info for actual file size
        aspectRatio: img.naturalWidth / img.naturalHeight,
        dominant_color: await this.extractDominantColor(img),
      };

      this.metadataCache.set(src, metadata);
      return metadata;
    } catch (error) {
      console.error('Failed to extract image metadata:', error);
      throw error;
    }
  }

  /**
   * Extract dominant color from image
   */
  private async extractDominantColor(img: HTMLImageElement): Promise<string> {
    // Use small canvas for performance
    const smallCanvas = document.createElement('canvas');
    const smallCtx = smallCanvas.getContext('2d')!;
    
    smallCanvas.width = 1;
    smallCanvas.height = 1;
    
    smallCtx.drawImage(img, 0, 0, 1, 1);
    const imageData = smallCtx.getImageData(0, 0, 1, 1);
    const [r, g, b] = imageData.data;
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Detect image format from URL
   */
  private detectImageFormat(src: string): string {
    const extension = src.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      case 'avif':
        return 'avif';
      case 'gif':
        return 'gif';
      default:
        return 'unknown';
    }
  }

  /**
   * Get default optimization options
   */
  private getDefaultOptions(
    options: Partial<ImageOptimizationOptions>
  ): ImageOptimizationOptions {
    return {
      quality: 80,
      format: 'auto',
      devicePixelRatio: window.devicePixelRatio || 1,
      lazyLoading: true,
      progressive: true,
      blur: false,
      placeholder: 'blur',
      ...options,
    };
  }

  /**
   * Generate cache key for optimization settings
   */
  private generateCacheKey(
    src: string, 
    options: ImageOptimizationOptions
  ): string {
    return `${src}-${JSON.stringify(options)}`;
  }

  /**
   * Preload critical images
   */
  async preloadImages(srcs: string[]): Promise<void> {
    const promises = srcs.map(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      
      return this.loadImage(src).catch(error => {
        console.warn(`Failed to preload image ${src}:`, error);
      });
    });

    await Promise.allSettled(promises);
  }

  /**
   * Check if WebP is supported
   */
  isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('webp') > -1;
  }

  /**
   * Check if AVIF is supported
   */
  isAVIFSupported(): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/avif').indexOf('avif') > -1;
  }

  /**
   * Get best supported format
   */
  getBestSupportedFormat(): 'avif' | 'webp' | 'jpeg' {
    if (this.isAVIFSupported()) return 'avif';
    if (this.isWebPSupported()) return 'webp';
    return 'jpeg';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.lazyImages.forEach(img => {
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(img);
      }
    });
    
    this.lazyImages.clear();
    this.imageCache.clear();
    this.metadataCache.clear();
  }
}

// Create singleton instance
export const imageOptimizer = new ImageOptimizer();
export default imageOptimizer;