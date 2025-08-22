/**
 * Advanced Encryption Services
 * Field-level encryption with key rotation, versioning, and data masking
 */

import crypto from 'crypto'
import { env } from '@/config/environment'
import { logSecurityEvent } from './audit'

export interface EncryptionConfig {
  algorithm: string
  keySize: number
  ivSize: number
  tagSize: number
  keyRotationInterval: number // in milliseconds
  maxKeyVersions: number
  enableCompression: boolean
  enableIntegrityCheck: boolean
}

export interface EncryptionKey {
  id: string
  version: number
  algorithm: string
  key: Buffer
  createdAt: Date
  expiresAt?: Date
  status: 'active' | 'deprecated' | 'retired'
  usage: 'encrypt' | 'decrypt' | 'both'
  metadata: {
    createdBy: string
    purpose: string
    keySize: number
  }
}

export interface EncryptedData {
  data: string // Base64 encoded encrypted data
  keyId: string
  keyVersion: number
  algorithm: string
  iv: string // Base64 encoded initialization vector
  tag?: string // Base64 encoded authentication tag
  compressed: boolean
  timestamp: Date
  checksum?: string
}

export interface FieldEncryptionRule {
  fieldPath: string
  encryptionLevel: 'none' | 'basic' | 'advanced' | 'high_security'
  keyId?: string
  maskingPattern?: string
  retentionPeriod?: number
  complianceLabels: string[]
}

export interface MaskingConfig {
  email: {
    preserveDomain: boolean
    visibleChars: number
  }
  phone: {
    visibleDigits: number
    format: string
  }
  ssn: {
    visibleDigits: number
    format: string
  }
  creditCard: {
    visibleDigits: number
    format: string
  }
  custom: Record<string, {
    pattern: string
    replacement: string
  }>
}

/**
 * Advanced Encryption Service with key rotation and versioning
 */
export class EncryptionService {
  private config: EncryptionConfig
  private keys: Map<string, EncryptionKey> = new Map()
  private activeKeyId: string | null = null
  private masterKey: Buffer
  private rotationTimer?: NodeJS.Timeout

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keySize: 32, // 256 bits
      ivSize: 12, // 96 bits for GCM
      tagSize: 16, // 128 bits
      keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxKeyVersions: 10,
      enableCompression: true,
      enableIntegrityCheck: true,
      ...config
    }

    this.masterKey = this.deriveMasterKey()
    this.initializeKeys()
    this.startKeyRotation()
  }

  /**
   * Encrypt data with current active key
   */
  async encrypt(
    data: string | Buffer,
    keyId?: string,
    options?: {
      compress?: boolean
      includeTimestamp?: boolean
      customMetadata?: Record<string, unknown>
    }
  ): Promise<EncryptedData> {
    try {
      const useKeyId = keyId || this.activeKeyId
      if (!useKeyId) {
        throw new Error('No encryption key available')
      }

      const key = this.keys.get(useKeyId)
      if (!key || key.status !== 'active') {
        throw new Error(`Encryption key ${useKeyId} not available or inactive`)
      }

      // Convert data to buffer
      let dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')

      // Compress if enabled
      const shouldCompress = options?.compress ?? this.config.enableCompression
      if (shouldCompress && dataBuffer.length > 100) {
        dataBuffer = await this.compressData(dataBuffer)
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.config.ivSize)

      // Create cipher
      const cipher = crypto.createCipher(this.config.algorithm, key.key)
      cipher.setAAD(Buffer.from(useKeyId)) // Additional authenticated data

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ])

      // Get authentication tag for GCM
      const tag = cipher.getAuthTag()

      // Calculate checksum if enabled
      let checksum: string | undefined
      if (this.config.enableIntegrityCheck) {
        checksum = crypto.createHash('sha256').update(encrypted).digest('hex')
      }

      const result: EncryptedData = {
        data: encrypted.toString('base64'),
        keyId: useKeyId,
        keyVersion: key.version,
        algorithm: this.config.algorithm,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        compressed: shouldCompress,
        timestamp: new Date(),
        checksum
      }

      // Log encryption event
      await this.logEncryptionEvent('encrypt', {
        keyId: useKeyId,
        keyVersion: key.version,
        dataSize: dataBuffer.length,
        compressed: shouldCompress
      })

      return result

    } catch (error) {
      await logSecurityEvent('encryption_failed', {
        keyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt data using specified key version
   */
  async decrypt(encryptedData: EncryptedData): Promise<string | Buffer> {
    try {
      const key = this.keys.get(encryptedData.keyId)
      if (!key) {
        throw new Error(`Decryption key ${encryptedData.keyId} not found`)
      }

      // Verify checksum if present
      if (encryptedData.checksum && this.config.enableIntegrityCheck) {
        const dataBuffer = Buffer.from(encryptedData.data, 'base64')
        const calculatedChecksum = crypto.createHash('sha256').update(dataBuffer).digest('hex')
        if (calculatedChecksum !== encryptedData.checksum) {
          throw new Error('Data integrity check failed')
        }
      }

      // Create decipher
      const decipher = crypto.createDecipher(encryptedData.algorithm, key.key)
      decipher.setAAD(Buffer.from(encryptedData.keyId))

      // Set auth tag for GCM
      if (encryptedData.tag) {
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'))
      }

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData.data, 'base64')),
        decipher.final()
      ])

      // Decompress if needed
      let result = decrypted
      if (encryptedData.compressed) {
        result = await this.decompressData(result)
      }

      // Log decryption event
      await this.logEncryptionEvent('decrypt', {
        keyId: encryptedData.keyId,
        keyVersion: encryptedData.keyVersion,
        dataSize: result.length,
        compressed: encryptedData.compressed
      })

      return result

    } catch (error) {
      await logSecurityEvent('decryption_failed', {
        keyId: encryptedData.keyId,
        keyVersion: encryptedData.keyVersion,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Encrypt object fields based on rules
   */
  async encryptFields(
    obj: Record<string, any>,
    rules: FieldEncryptionRule[]
  ): Promise<{
    encrypted: Record<string, any>
    metadata: Record<string, EncryptedData>
  }> {
    const encrypted = { ...obj }
    const metadata: Record<string, EncryptedData> = {}

    for (const rule of rules) {
      if (rule.encryptionLevel === 'none') continue

      const value = this.getNestedValue(obj, rule.fieldPath)
      if (value === undefined || value === null) continue

      try {
        const encryptedData = await this.encrypt(
          typeof value === 'string' ? value : JSON.stringify(value),
          rule.keyId
        )

        this.setNestedValue(encrypted, rule.fieldPath, `[ENCRYPTED:${encryptedData.keyId}]`)
        metadata[rule.fieldPath] = encryptedData

      } catch (error) {
        await logSecurityEvent('field_encryption_failed', {
          fieldPath: rule.fieldPath,
          encryptionLevel: rule.encryptionLevel,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'medium')
      }
    }

    return { encrypted, metadata }
  }

  /**
   * Decrypt object fields using metadata
   */
  async decryptFields(
    encrypted: Record<string, any>,
    metadata: Record<string, EncryptedData>
  ): Promise<Record<string, any>> {
    const decrypted = { ...encrypted }

    for (const [fieldPath, encryptedData] of Object.entries(metadata)) {
      try {
        const decryptedValue = await this.decrypt(encryptedData)
        
        // Try to parse as JSON if it was an object
        let value: any = decryptedValue.toString()
        try {
          value = JSON.parse(value)
        } catch {
          // Keep as string if not valid JSON
        }

        this.setNestedValue(decrypted, fieldPath, value)

      } catch (error) {
        await logSecurityEvent('field_decryption_failed', {
          fieldPath,
          keyId: encryptedData.keyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'medium')
      }
    }

    return decrypted
  }

  /**
   * Generate new encryption key
   */
  async generateKey(
    purpose: string = 'general',
    createdBy: string = 'system'
  ): Promise<EncryptionKey> {
    try {
      const keyId = this.generateKeyId()
      const version = this.getNextKeyVersion(keyId)
      
      const key: EncryptionKey = {
        id: keyId,
        version,
        algorithm: this.config.algorithm,
        key: crypto.randomBytes(this.config.keySize),
        createdAt: new Date(),
        status: 'active',
        usage: 'both',
        metadata: {
          createdBy,
          purpose,
          keySize: this.config.keySize
        }
      }

      this.keys.set(keyId, key)

      // Set as active key if no active key exists
      if (!this.activeKeyId) {
        this.activeKeyId = keyId
      }

      await this.logEncryptionEvent('key_generated', {
        keyId,
        version,
        purpose,
        createdBy
      })

      return key

    } catch (error) {
      await logSecurityEvent('key_generation_failed', {
        purpose,
        createdBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    try {
      // Generate new active key
      const newKey = await this.generateKey('rotation', 'system')
      
      // Deprecate old active key
      if (this.activeKeyId && this.activeKeyId !== newKey.id) {
        const oldKey = this.keys.get(this.activeKeyId)
        if (oldKey) {
          oldKey.status = 'deprecated'
        }
      }

      // Set new key as active
      this.activeKeyId = newKey.id

      // Clean up old keys
      await this.cleanupOldKeys()

      await this.logEncryptionEvent('key_rotation', {
        newKeyId: newKey.id,
        oldKeyId: this.activeKeyId
      })

    } catch (error) {
      await logSecurityEvent('key_rotation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'critical')

      throw error
    }
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Hash password with salt
   */
  async hashPassword(password: string, saltRounds: number = 12): Promise<{
    hash: string
    salt: string
    algorithm: string
  }> {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = await this.pbkdf2(password, salt, saltRounds)
    
    return {
      hash: hash.toString('hex'),
      salt,
      algorithm: 'pbkdf2'
    }
  }

  /**
   * Verify password hash
   */
  async verifyPassword(
    password: string,
    hash: string,
    salt: string,
    saltRounds: number = 12
  ): Promise<boolean> {
    try {
      const computedHash = await this.pbkdf2(password, salt, saltRounds)
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        computedHash
      )
    } catch {
      return false
    }
  }

  /**
   * Mask sensitive data
   */
  maskData(data: string, type: 'email' | 'phone' | 'ssn' | 'creditCard' | 'custom', config?: MaskingConfig): string {
    const defaultConfig: MaskingConfig = {
      email: { preserveDomain: true, visibleChars: 2 },
      phone: { visibleDigits: 4, format: 'XXX-XXX-####' },
      ssn: { visibleDigits: 4, format: 'XXX-XX-####' },
      creditCard: { visibleDigits: 4, format: 'XXXX-XXXX-XXXX-####' },
      custom: {}
    }

    const maskConfig = { ...defaultConfig, ...config }

    switch (type) {
      case 'email':
        return this.maskEmail(data, maskConfig.email)
      case 'phone':
        return this.maskPhone(data, maskConfig.phone)
      case 'ssn':
        return this.maskSSN(data, maskConfig.ssn)
      case 'creditCard':
        return this.maskCreditCard(data, maskConfig.creditCard)
      default:
        return data.replace(/./g, '*')
    }
  }

  /**
   * Private helper methods
   */
  private deriveMasterKey(): Buffer {
    const masterKeySource = env.ENCRYPTION_MASTER_KEY || 'default-development-key-change-in-production'
    return crypto.scryptSync(masterKeySource, 'appboardguru-salt', 32)
  }

  private initializeKeys(): void {
    // Load existing keys from secure storage (in production, this would be a secure key management service)
    // For now, generate a default key
    this.generateKey('default', 'system').catch(console.error)
  }

  private startKeyRotation(): void {
    this.rotationTimer = setInterval(() => {
      this.rotateKeys().catch(console.error)
    }, this.config.keyRotationInterval)
  }

  private async cleanupOldKeys(): Promise<void> {
    const allKeys = Array.from(this.keys.values())
    const sortedKeys = allKeys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Keep only the most recent keys
    if (sortedKeys.length > this.config.maxKeyVersions) {
      const keysToRemove = sortedKeys.slice(this.config.maxKeyVersions)
      
      for (const key of keysToRemove) {
        if (key.status === 'deprecated') {
          key.status = 'retired'
          // In production, you might archive retired keys securely
        }
      }
    }
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  private getNextKeyVersion(keyId: string): number {
    const existingKey = this.keys.get(keyId)
    return existingKey ? existingKey.version + 1 : 1
  }

  private async compressData(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib')
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err: Error | null, compressed: Buffer) => {
        if (err) reject(err)
        else resolve(compressed)
      })
    })
  }

  private async decompressData(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib')
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err: Error | null, decompressed: Buffer) => {
        if (err) reject(err)
        else resolve(decompressed)
      })
    })
  }

  private async pbkdf2(password: string, salt: string, iterations: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (err, key) => {
        if (err) reject(err)
        else resolve(key)
      })
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  private maskEmail(email: string, config: MaskingConfig['email']): string {
    const [username, domain] = email.split('@')
    if (!username || !domain) return email

    const visibleStart = Math.min(config.visibleChars, username.length)
    const maskedUsername = username.substring(0, visibleStart) + 
                          '*'.repeat(Math.max(0, username.length - visibleStart))

    return config.preserveDomain ? `${maskedUsername}@${domain}` : `${maskedUsername}@***`
  }

  private maskPhone(phone: string, config: MaskingConfig['phone']): string {
    const digits = phone.replace(/\D/g, '')
    const visibleDigits = Math.min(config.visibleDigits, digits.length)
    const maskedDigits = '*'.repeat(digits.length - visibleDigits) + 
                        digits.substring(digits.length - visibleDigits)

    return config.format.replace(/#/g, () => maskedDigits.charAt(0) && maskedDigits.charAt(0) !== '*' ? 
                                        maskedDigits.charAt(0) : 'X')
  }

  private maskSSN(ssn: string, config: MaskingConfig['ssn']): string {
    const digits = ssn.replace(/\D/g, '')
    const visibleDigits = Math.min(config.visibleDigits, digits.length)
    const masked = 'X'.repeat(digits.length - visibleDigits) + digits.substring(digits.length - visibleDigits)
    
    return config.format.replace(/#/g, () => {
      const char = masked.charAt(0)
      return char || 'X'
    })
  }

  private maskCreditCard(card: string, config: MaskingConfig['creditCard']): string {
    const digits = card.replace(/\D/g, '')
    const visibleDigits = Math.min(config.visibleDigits, digits.length)
    const masked = 'X'.repeat(digits.length - visibleDigits) + digits.substring(digits.length - visibleDigits)
    
    return config.format.replace(/#/g, () => {
      const char = masked.charAt(0)
      return char || 'X'
    })
  }

  private async logEncryptionEvent(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await logSecurityEvent(`encryption_${action}`, {
      ...details,
      algorithm: this.config.algorithm,
      keySize: this.config.keySize
    }, 'low')
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
      this.rotationTimer = undefined
    }

    // Clear sensitive data from memory
    this.keys.clear()
    this.masterKey.fill(0)
  }

  /**
   * Get encryption statistics
   */
  getStats(): {
    totalKeys: number
    activeKeys: number
    deprecatedKeys: number
    retiredKeys: number
    currentKeyId: string | null
    keyRotationInterval: number
  } {
    const keys = Array.from(this.keys.values())
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      deprecatedKeys: keys.filter(k => k.status === 'deprecated').length,
      retiredKeys: keys.filter(k => k.status === 'retired').length,
      currentKeyId: this.activeKeyId,
      keyRotationInterval: this.config.keyRotationInterval
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService()

// Convenience functions
export async function encryptData(data: string | Buffer, keyId?: string): Promise<EncryptedData> {
  return encryptionService.encrypt(data, keyId)
}

export async function decryptData(encryptedData: EncryptedData): Promise<string | Buffer> {
  return encryptionService.decrypt(encryptedData)
}

export async function encryptObjectFields(
  obj: Record<string, any>,
  rules: FieldEncryptionRule[]
): Promise<{ encrypted: Record<string, any>; metadata: Record<string, EncryptedData> }> {
  return encryptionService.encryptFields(obj, rules)
}

export async function decryptObjectFields(
  encrypted: Record<string, any>,
  metadata: Record<string, EncryptedData>
): Promise<Record<string, any>> {
  return encryptionService.decryptFields(encrypted, metadata)
}

export function generateSecureToken(length?: number): string {
  return encryptionService.generateSecureToken(length)
}

export async function hashPassword(password: string, saltRounds?: number): Promise<{
  hash: string
  salt: string
  algorithm: string
}> {
  return encryptionService.hashPassword(password, saltRounds)
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  saltRounds?: number
): Promise<boolean> {
  return encryptionService.verifyPassword(password, hash, salt, saltRounds)
}

export function maskSensitiveData(
  data: string,
  type: 'email' | 'phone' | 'ssn' | 'creditCard' | 'custom',
  config?: MaskingConfig
): string {
  return encryptionService.maskData(data, type, config)
}