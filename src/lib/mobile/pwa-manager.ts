/**
 * PWA Manager for Mobile Optimization
 * Handles installation, updates, and PWA-specific features
 */

export interface InstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallationStatus {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: string;
  installPromptAvailable: boolean;
}

export interface PWACapabilities {
  serviceWorker: boolean;
  webAppManifest: boolean;
  pushNotifications: boolean;
  backgroundSync: boolean;
  fileSystemAccess: boolean;
  sharing: boolean;
  badging: boolean;
  persistentStorage: boolean;
}

export class PWAManager {
  private installPrompt: InstallPromptEvent | null = null;
  private isInstalled = false;
  private capabilities: PWACapabilities;
  private listeners = new Map<string, Set<Function>>();

  constructor() {
    this.capabilities = this.checkCapabilities();
    this.init();
  }

  /**
   * Initialize PWA manager
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // Check if app is installed
    this.checkInstallationStatus();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
      this.emit('install-prompt-available', this.installPrompt);
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.installPrompt = null;
      this.emit('app-installed');
    });

    // Monitor display mode changes
    this.monitorDisplayModeChanges();

    // Handle file sharing if supported
    this.handleFileSharing();
  }

  /**
   * Check PWA capabilities
   */
  private checkCapabilities(): PWACapabilities {
    const capabilities: PWACapabilities = {
      serviceWorker: 'serviceWorker' in navigator,
      webAppManifest: 'manifest' in document.createElement('link'),
      pushNotifications: 'PushManager' in window && 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      fileSystemAccess: 'showOpenFilePicker' in window,
      sharing: 'share' in navigator || 'canShare' in navigator,
      badging: 'setAppBadge' in navigator,
      persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    };

    return capabilities;
  }

  /**
   * Check if app is installed
   */
  private checkInstallationStatus(): void {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    this.isInstalled = isStandalone;
  }

  /**
   * Get installation status
   */
  getInstallationStatus(): PWAInstallationStatus {
    const platform = this.getPlatform();
    
    return {
      canInstall: !!this.installPrompt,
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone(),
      platform,
      installPromptAvailable: !!this.installPrompt,
    };
  }

  /**
   * Check if app is running in standalone mode
   */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Get platform information
   */
  getPlatform(): string {
    const userAgent = navigator.userAgent;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 'ios';
    } else if (/Android/.test(userAgent)) {
      return 'android';
    } else if (/Windows/.test(userAgent)) {
      return 'windows';
    } else if (/Mac/.test(userAgent)) {
      return 'macos';
    } else {
      return 'unknown';
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        this.emit('install-accepted');
        return true;
      } else {
        this.emit('install-dismissed');
        return false;
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
      this.emit('install-error', error);
      return false;
    }
  }

  /**
   * Show platform-specific install instructions
   */
  getInstallInstructions(): {
    platform: string;
    instructions: string[];
    canAutoInstall: boolean;
  } {
    const platform = this.getPlatform();
    
    const instructions: Record<string, string[]> = {
      ios: [
        'Tap the Share button at the bottom of the screen',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install BoardGuru'
      ],
      android: [
        'Tap the three dots menu in Chrome',
        'Select "Add to Home screen" or "Install app"',
        'Tap "Install" to add BoardGuru to your device'
      ],
      windows: [
        'Click the install icon in the address bar',
        'Or go to Settings → Apps → Install this site as an app',
        'Click "Install" to add BoardGuru to your Start menu'
      ],
      macos: [
        'Click Safari menu → Add to Dock',
        'Or drag the URL to your Dock',
        'BoardGuru will open like a native app'
      ],
      unknown: [
        'Look for an install or "Add to Home Screen" option',
        'Check your browser menu for app installation',
        'BoardGuru works great as a bookmark too!'
      ]
    };

    return {
      platform,
      instructions: instructions[platform] || instructions.unknown,
      canAutoInstall: !!this.installPrompt,
    };
  }

  /**
   * Monitor display mode changes
   */
  private monitorDisplayModeChanges(): void {
    const standalone = window.matchMedia('(display-mode: standalone)');
    standalone.addEventListener('change', (e) => {
      this.isInstalled = e.matches;
      this.emit('display-mode-changed', e.matches ? 'standalone' : 'browser');
    });

    const fullscreen = window.matchMedia('(display-mode: fullscreen)');
    fullscreen.addEventListener('change', (e) => {
      this.emit('display-mode-changed', e.matches ? 'fullscreen' : 'standalone');
    });
  }

  /**
   * Handle file sharing
   */
  private handleFileSharing(): void {
    // Handle shared files on app startup
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('share-target')) {
      this.emit('files-shared', {
        title: urlParams.get('title'),
        text: urlParams.get('text'),
        url: urlParams.get('url'),
      });
    }
  }

  /**
   * Share content using Web Share API
   */
  async share(data: {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }): Promise<boolean> {
    if (!this.capabilities.sharing) {
      // Fallback to copying to clipboard
      await this.copyToClipboard(data);
      return false;
    }

    try {
      if (data.files && data.files.length > 0) {
        // Check if files can be shared
        if ('canShare' in navigator && !navigator.canShare(data)) {
          throw new Error('Files cannot be shared on this platform');
        }
      }

      await (navigator as any).share(data);
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled sharing
        return false;
      }
      
      console.error('Sharing failed:', error);
      await this.copyToClipboard(data);
      return false;
    }
  }

  /**
   * Fallback: copy to clipboard
   */
  private async copyToClipboard(data: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<void> {
    const text = [data.title, data.text, data.url].filter(Boolean).join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      this.emit('copied-to-clipboard', text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  /**
   * Set app badge (notification count)
   */
  async setAppBadge(count?: number): Promise<boolean> {
    if (!this.capabilities.badging) {
      return false;
    }

    try {
      if (count === undefined || count === 0) {
        await (navigator as any).clearAppBadge();
      } else {
        await (navigator as any).setAppBadge(count);
      }
      return true;
    } catch (error) {
      console.error('Failed to set app badge:', error);
      return false;
    }
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!this.capabilities.persistentStorage) {
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();
      if (persistent) {
        this.emit('persistent-storage-granted');
      }
      return persistent;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  }> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return { usage: 0, quota: 0, percentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return { usage, quota, percentage };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return { usage: 0, quota: 0, percentage: 0 };
    }
  }

  /**
   * Get PWA capabilities
   */
  getCapabilities(): PWACapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature: keyof PWACapabilities): boolean {
    return this.capabilities[feature];
  }

  /**
   * Handle app shortcuts
   */
  handleShortcuts(): void {
    // This would handle PWA shortcuts from manifest
    const shortcutActions = [
      { action: 'dashboard', url: '/dashboard' },
      { action: 'assets', url: '/dashboard/assets' },
      { action: 'organizations', url: '/dashboard/organizations' },
      { action: 'meetings', url: '/dashboard/meetings' },
    ];

    shortcutActions.forEach(shortcut => {
      if (window.location.search.includes(`shortcut=${shortcut.action}`)) {
        this.emit('shortcut-activated', shortcut.action);
      }
    });
  }

  /**
   * Show offline banner
   */
  showOfflineBanner(): void {
    if (!navigator.onLine) {
      this.emit('show-offline-banner');
    }
  }

  /**
   * Hide offline banner
   */
  hideOfflineBanner(): void {
    this.emit('hide-offline-banner');
  }

  /**
   * Check for app updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      return new Promise((resolve) => {
        const handleUpdateFound = () => {
          registration.removeEventListener('updatefound', handleUpdateFound);
          resolve(true);
        };
        
        registration.addEventListener('updatefound', handleUpdateFound);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          registration.removeEventListener('updatefound', handleUpdateFound);
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }

  /**
   * Get app installation metrics
   */
  getInstallationMetrics(): {
    installPromptShown: boolean;
    installPromptAccepted: boolean;
    timeToInstall?: number;
    platform: string;
    installSource: string;
  } {
    // This would track installation metrics
    return {
      installPromptShown: !!this.installPrompt,
      installPromptAccepted: this.isInstalled,
      platform: this.getPlatform(),
      installSource: this.isStandalone() ? 'pwa' : 'web',
    };
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
        console.error(`Error in PWA event listener for '${event}':`, error);
      }
    });
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();
export default pwaManager;