/**
 * Enterprise-grade Key Vault for LLM API Keys
 * Provides encryption, decryption, and secure key management
 */

import crypto from 'crypto';

export class KeyVault {
  private static instance: KeyVault;
  private readonly algorithm = 'aes-256-gcm';
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly ivLength = 16;
  private readonly iterations = 100000;
  private readonly keyLength = 32;
  
  private masterKey: Buffer | null = null;

  private constructor() {
    this.initializeMasterKey();
  }

  public static getInstance(): KeyVault {
    if (!KeyVault.instance) {
      KeyVault.instance = new KeyVault();
    }
    return KeyVault.instance;
  }

  private initializeMasterKey(): void {
    // In production, this should come from a secure key management service
    // For now, we'll use environment variable
    const masterKeyBase = process.env.LLM_MASTER_KEY || process.env.NEXTAUTH_SECRET || 'default-dev-key';
    const salt = process.env.LLM_SALT || 'boardguru-llm-salt';
    
    this.masterKey = crypto.pbkdf2Sync(
      masterKeyBase,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Encrypt an API key or sensitive string
   */
  public async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Encrypt the plaintext
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);
      
      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted API key
   */
  public async decrypt(encryptedData: string): Promise<string> {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty string');
    }

    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract IV, auth tag, and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate a secure random API key
   */
  public generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a value for comparison (e.g., for checking if key changed)
   */
  public hash(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Validate if an encrypted string is valid
   */
  public async isValidEncrypted(encryptedData: string): Promise<boolean> {
    try {
      await this.decrypt(encryptedData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rotate encryption for a key (re-encrypt with new IV)
   */
  public async rotateEncryption(encryptedData: string): Promise<string> {
    const decrypted = await this.decrypt(encryptedData);
    return await this.encrypt(decrypted);
  }

  /**
   * Securely compare two values (timing-attack safe)
   */
  public secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b)
    );
  }

  /**
   * Create a secure token for temporary access
   */
  public createSecureToken(data: any, expiresInMinutes: number = 5): string {
    const payload = {
      data,
      expires: Date.now() + (expiresInMinutes * 60 * 1000)
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.masterKey!)
      .update(token)
      .digest('hex');
    
    return `${token}.${signature}`;
  }

  /**
   * Verify and decode a secure token
   */
  public verifySecureToken(token: string): any | null {
    try {
      const [payloadBase64, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.masterKey!)
        .update(payloadBase64)
        .digest('hex');
      
      if (!this.secureCompare(signature, expectedSignature)) {
        return null;
      }
      
      // Decode and check expiration
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      
      if (payload.expires < Date.now()) {
        return null;
      }
      
      return payload.data;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const keyVault = KeyVault.getInstance();