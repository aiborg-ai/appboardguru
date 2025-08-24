/**
 * Biometric Authentication Manager for Mobile
 * Handles fingerprint, face ID, and other biometric authentication methods
 */

export interface BiometricAuthOptions {
  promptMessage?: string;
  cancelButtonText?: string;
  fallbackButtonText?: string;
  disableDeviceFallback?: boolean;
}

export interface BiometricCapabilities {
  isSupported: boolean;
  isAvailable: boolean;
  supportedMethods: BiometricMethod[];
  hasCredentials: boolean;
  deviceSupport: {
    webAuthn: boolean;
    touchID: boolean;
    faceID: boolean;
    fingerprint: boolean;
    voicePrint: boolean;
    irisScanner: boolean;
  };
}

export interface BiometricCredential {
  id: string;
  type: BiometricMethod;
  publicKey: ArrayBuffer;
  counter: number;
  created: number;
  lastUsed: number;
}

export type BiometricMethod = 
  | 'fingerprint'
  | 'face'
  | 'voice'
  | 'iris'
  | 'palm'
  | 'behavioral';

export interface AuthenticationResult {
  success: boolean;
  credential?: BiometricCredential;
  method?: BiometricMethod;
  error?: string;
  fallbackToPassword?: boolean;
}

export class BiometricAuthManager {
  private credentials = new Map<string, BiometricCredential>();
  private isInitialized = false;
  private listeners = new Map<string, Set<Function>>();

  constructor() {
    this.init();
  }

  /**
   * Initialize biometric authentication
   */
  private async init(): Promise<void> {
    try {
      // Load stored credentials
      await this.loadStoredCredentials();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Biometric auth initialization failed:', error);
      this.emit('init-error', error);
    }
  }

  /**
   * Check biometric capabilities of the device
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    const capabilities: BiometricCapabilities = {
      isSupported: false,
      isAvailable: false,
      supportedMethods: [],
      hasCredentials: false,
      deviceSupport: {
        webAuthn: this.isWebAuthnSupported(),
        touchID: false,
        faceID: false,
        fingerprint: false,
        voicePrint: false,
        irisScanner: false,
      },
    };

    // Check Web Authentication API support
    if (capabilities.deviceSupport.webAuthn) {
      capabilities.isSupported = true;
      
      try {
        // Check if authenticator is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        capabilities.isAvailable = available;

        if (available) {
          capabilities.supportedMethods = await this.detectSupportedMethods();
        }
      } catch (error) {
        console.error('Error checking authenticator availability:', error);
      }
    }

    // Check for stored credentials
    capabilities.hasCredentials = this.credentials.size > 0;

    return capabilities;
  }

  /**
   * Register biometric credentials
   */
  async register(userId: string, options: BiometricAuthOptions = {}): Promise<BiometricCredential> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('Biometric authentication not supported');
    }

    try {
      const challengeResponse = await fetch('/api/mobile/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', userId }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get registration challenge');
      }

      const { challenge, user } = await challengeResponse.json();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.base64ToArrayBuffer(challenge),
          rp: {
            name: 'BoardGuru',
            id: window.location.hostname,
          },
          user: {
            id: this.textToArrayBuffer(user.id),
            name: user.email,
            displayName: user.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'direct',
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Store credential locally
      const biometricCredential: BiometricCredential = {
        id: credential.id,
        type: this.detectMethodFromCredential(credential),
        publicKey: (credential.response as AuthenticatorAttestationResponse).getPublicKey() || new ArrayBuffer(0),
        counter: (credential.response as AuthenticatorAttestationResponse).getAuthenticatorData ? 0 : 0,
        created: Date.now(),
        lastUsed: Date.now(),
      };

      this.credentials.set(credential.id, biometricCredential);
      await this.saveStoredCredentials();

      // Send to server for verification
      const verificationResponse = await fetch('/api/mobile/biometric/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: credential.id,
          response: {
            attestationObject: this.arrayBufferToBase64((credential.response as AuthenticatorAttestationResponse).attestationObject),
            clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON),
          },
          userId,
        }),
      });

      if (!verificationResponse.ok) {
        throw new Error('Credential verification failed');
      }

      this.emit('credential-registered', biometricCredential);
      return biometricCredential;

    } catch (error) {
      console.error('Biometric registration failed:', error);
      this.emit('registration-error', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometric credentials
   */
  async authenticate(options: BiometricAuthOptions = {}): Promise<AuthenticationResult> {
    if (!this.isWebAuthnSupported()) {
      return {
        success: false,
        error: 'Biometric authentication not supported',
        fallbackToPassword: true,
      };
    }

    if (this.credentials.size === 0) {
      return {
        success: false,
        error: 'No biometric credentials found',
        fallbackToPassword: true,
      };
    }

    try {
      const challengeResponse = await fetch('/api/mobile/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticate' }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const { challenge } = await challengeResponse.json();
      const credentialIds = Array.from(this.credentials.keys()).map(id => 
        this.base64ToArrayBuffer(id)
      );

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: this.base64ToArrayBuffer(challenge),
          allowCredentials: credentialIds.map(id => ({
            id,
            type: 'public-key',
            transports: ['internal'],
          })),
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication failed or was cancelled');
      }

      // Get stored credential
      const storedCredential = this.credentials.get(assertion.id);
      if (!storedCredential) {
        throw new Error('Credential not found locally');
      }

      // Update last used time
      storedCredential.lastUsed = Date.now();
      await this.saveStoredCredentials();

      // Verify with server
      const verificationResponse = await fetch('/api/mobile/biometric/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: assertion.id,
          response: {
            authenticatorData: this.arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).authenticatorData),
            clientDataJSON: this.arrayBufferToBase64(assertion.response.clientDataJSON),
            signature: this.arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).signature),
            userHandle: (assertion.response as AuthenticatorAssertionResponse).userHandle ? 
              this.arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).userHandle!) : null,
          },
        }),
      });

      if (!verificationResponse.ok) {
        throw new Error('Server verification failed');
      }

      const result: AuthenticationResult = {
        success: true,
        credential: storedCredential,
        method: storedCredential.type,
      };

      this.emit('authentication-success', result);
      return result;

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      const result: AuthenticationResult = {
        success: false,
        error: error.message,
        fallbackToPassword: true,
      };

      this.emit('authentication-error', result);
      return result;
    }
  }

  /**
   * Remove biometric credentials
   */
  async removeCredentials(credentialIds?: string[]): Promise<void> {
    const idsToRemove = credentialIds || Array.from(this.credentials.keys());

    for (const id of idsToRemove) {
      this.credentials.delete(id);
    }

    await this.saveStoredCredentials();

    // Notify server
    try {
      await fetch('/api/mobile/biometric/remove-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialIds: idsToRemove }),
      });
    } catch (error) {
      console.error('Failed to notify server about credential removal:', error);
    }

    this.emit('credentials-removed', idsToRemove);
  }

  /**
   * Check if user can use biometric authentication
   */
  async canAuthenticate(): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    return capabilities.isSupported && capabilities.isAvailable && capabilities.hasCredentials;
  }

  /**
   * Get all registered credentials
   */
  getCredentials(): BiometricCredential[] {
    return Array.from(this.credentials.values());
  }

  /**
   * Test biometric authentication
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const result = await this.authenticate({
        promptMessage: 'Test biometric authentication',
        cancelButtonText: 'Cancel Test',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric test failed:', error);
      return false;
    }
  }

  /**
   * Enable/disable biometric authentication
   */
  async toggleBiometricAuth(enabled: boolean, userId: string): Promise<void> {
    if (enabled) {
      // Register if not already registered
      const capabilities = await this.getCapabilities();
      if (!capabilities.hasCredentials) {
        await this.register(userId);
      }
    } else {
      // Remove all credentials
      await this.removeCredentials();
    }

    // Update user preferences
    await fetch('/api/mobile/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        setting: 'biometricAuth',
        value: enabled,
      }),
    });

    this.emit('biometric-auth-toggled', enabled);
  }

  /**
   * Private helper methods
   */
  private isWebAuthnSupported(): boolean {
    return (
      'credentials' in navigator &&
      'create' in navigator.credentials &&
      'get' in navigator.credentials &&
      'PublicKeyCredential' in window
    );
  }

  private async detectSupportedMethods(): Promise<BiometricMethod[]> {
    const methods: BiometricMethod[] = [];

    // This is a simplified detection - in reality, you'd need more sophisticated detection
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      methods.push('face', 'fingerprint'); // Face ID and Touch ID
    } else if (userAgent.includes('android')) {
      methods.push('fingerprint', 'face'); // Android biometrics
    } else {
      methods.push('fingerprint'); // Default to fingerprint for other platforms
    }

    return methods;
  }

  private detectMethodFromCredential(credential: PublicKeyCredential): BiometricMethod {
    // This is simplified - actual method detection would require more context
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'face'; // Assume Face ID on newer devices
    } else {
      return 'fingerprint'; // Default to fingerprint
    }
  }

  private async loadStoredCredentials(): Promise<void> {
    try {
      const stored = localStorage.getItem('boardguru_biometric_credentials');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.credentials.clear();
        
        for (const [id, credential] of Object.entries(parsed)) {
          this.credentials.set(id, credential as BiometricCredential);
        }
      }
    } catch (error) {
      console.error('Failed to load stored credentials:', error);
    }
  }

  private async saveStoredCredentials(): Promise<void> {
    try {
      const toStore = Object.fromEntries(this.credentials.entries());
      localStorage.setItem('boardguru_biometric_credentials', JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private textToArrayBuffer(text: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(text);
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
        console.error(`Error in biometric auth event listener for '${event}':`, error);
      }
    });
  }

  /**
   * Get authentication analytics
   */
  async getAnalytics(): Promise<{
    totalCredentials: number;
    successfulAuthentications: number;
    failedAuthentications: number;
    lastUsed?: number;
    mostUsedMethod?: BiometricMethod;
  }> {
    const credentials = this.getCredentials();
    const lastUsed = Math.max(...credentials.map(c => c.lastUsed));
    
    // Get most used method
    const methodCounts = credentials.reduce((acc, cred) => {
      acc[cred.type] = (acc[cred.type] || 0) + 1;
      return acc;
    }, {} as Record<BiometricMethod, number>);
    
    const mostUsedMethod = Object.keys(methodCounts).reduce((a, b) => 
      methodCounts[a as BiometricMethod] > methodCounts[b as BiometricMethod] ? a : b
    ) as BiometricMethod;

    return {
      totalCredentials: credentials.length,
      successfulAuthentications: 0, // Would track this in real implementation
      failedAuthentications: 0, // Would track this in real implementation
      lastUsed: lastUsed > 0 ? lastUsed : undefined,
      mostUsedMethod: credentials.length > 0 ? mostUsedMethod : undefined,
    };
  }
}

// Create singleton instance
export const biometricAuthManager = new BiometricAuthManager();
export default biometricAuthManager;