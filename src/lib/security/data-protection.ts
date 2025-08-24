/**
 * Advanced Data Protection System
 * Implements encryption, tokenization, data masking, and compliance features
 */

import { createCipherGCM, createDecipherGCM, randomBytes } from 'crypto'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { nanoid } from 'nanoid'

// Core interfaces
export interface EncryptedData {
  data: string // Base64 encoded
  iv: string // Base64 encoded
  tag: string // Base64 encoded
  keyId: string
  algorithm: string
  timestamp: string
}

export interface EncryptionKey {
  id: string
  name: string
  algorithm: string
  keyMaterial: Buffer
  createdAt: string
  expiresAt?: string
  isActive: boolean
  metadata: Record<string, any>
}

export interface FieldEncryptionRule {
  field: string
  encryptionType: 'full' | 'partial' | 'format_preserving' | 'tokenization'
  keyId: string
  conditions?: Array<{
    path: string
    operator: 'equals' | 'contains' | 'matches'
    value: any
  }>
}

export interface DataMaskingRule {
  type: 'full' | 'partial' | 'format_preserving' | 'hashing'
  pattern?: string
  replacement?: string
  preserveLength?: boolean
  preserveFormat?: boolean
}

export interface TokenizationResult {
  token: string
  format: string
  metadata: Record<string, any>
}

/**
 * Data Protection Manager
 */
export class DataProtectionManager {
  private keys: Map<string, EncryptionKey> = new Map()
  private fieldRules: Map<string, FieldEncryptionRule[]> = new Map()
  private tokenVault: Map<string, any> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private options: {
      masterKey: string
      keyRotationInterval: number
      enableKeyEscrow: boolean
      complianceMode: 'standard' | 'fips'
    }
  ) {
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.setupDefaultKeys()
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encrypt(data: string | Buffer, keyId?: string): Promise<Result<EncryptedData, string>> {
    const span = this.tracer.startSpan('data_protection_encrypt')

    try {
      const key = this.getEncryptionKey(keyId)
      if (!key) {
        return failure('Encryption key not found')
      }

      const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
      const iv = randomBytes(16)

      const cipher = createCipherGCM('aes-256-gcm', key.keyMaterial, iv)
      
      const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ])

      const tag = cipher.getAuthTag()

      const result: EncryptedData = {
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyId: key.id,
        algorithm: 'aes-256-gcm',
        timestamp: new Date().toISOString()
      }

      this.metrics.recordEncryptionOperation('encrypt', key.id, plaintext.length)
      return success(result)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Encryption failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Decrypt encrypted data
   */
  async decrypt(encryptedData: EncryptedData): Promise<Result<Buffer, string>> {
    const span = this.tracer.startSpan('data_protection_decrypt')

    try {
      const key = this.getEncryptionKey(encryptedData.keyId)
      if (!key) {
        return failure('Decryption key not found')
      }

      const encrypted = Buffer.from(encryptedData.data, 'base64')
      const iv = Buffer.from(encryptedData.iv, 'base64')
      const tag = Buffer.from(encryptedData.tag, 'base64')

      const decipher = createDecipherGCM('aes-256-gcm', key.keyMaterial, iv)
      decipher.setAuthTag(tag)

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])

      this.metrics.recordEncryptionOperation('decrypt', key.id, decrypted.length)
      return success(decrypted)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Decryption failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Encrypt object fields based on rules
   */
  async encryptFields(
    obj: Record<string, any>,
    context: string = 'default'
  ): Promise<Result<Record<string, any>, string>> {
    try {
      const rules = this.fieldRules.get(context) || []
      const result = { ...obj }

      for (const rule of rules) {
        if (this.shouldApplyRule(rule, obj)) {
          const fieldValue = this.getFieldValue(obj, rule.field)
          
          if (fieldValue !== undefined && fieldValue !== null) {
            const encryptedValue = await this.encryptField(fieldValue, rule)
            
            if (encryptedValue.success) {
              this.setFieldValue(result, rule.field, encryptedValue.data)
            }
          }
        }
      }

      return success(result)

    } catch (error) {
      return failure(`Field encryption failed: ${(error as Error).message}`)
    }
  }

  /**
   * Decrypt object fields
   */
  async decryptFields(
    obj: Record<string, any>,
    context: string = 'default'
  ): Promise<Result<Record<string, any>, string>> {
    try {
      const rules = this.fieldRules.get(context) || []
      const result = { ...obj }

      for (const rule of rules) {
        const fieldValue = this.getFieldValue(obj, rule.field)
        
        if (this.isEncryptedValue(fieldValue)) {
          const decryptedValue = await this.decryptField(fieldValue, rule)
          
          if (decryptedValue.success) {
            this.setFieldValue(result, rule.field, decryptedValue.data)
          }
        }
      }

      return success(result)

    } catch (error) {
      return failure(`Field decryption failed: ${(error as Error).message}`)
    }
  }

  /**
   * Tokenize sensitive data
   */
  async tokenize(data: string, format?: string): Promise<Result<TokenizationResult, string>> {
    try {
      const token = this.generateToken(data, format)
      
      this.tokenVault.set(token, {
        originalData: data,
        format: format || 'default',
        createdAt: new Date().toISOString()
      })

      const result: TokenizationResult = {
        token,
        format: format || 'default',
        metadata: {
          length: data.length,
          tokenizedAt: new Date().toISOString()
        }
      }

      this.metrics.recordTokenization('tokenize', data.length)
      return success(result)

    } catch (error) {
      return failure(`Tokenization failed: ${(error as Error).message}`)
    }
  }

  /**
   * Detokenize data
   */
  async detokenize(token: string): Promise<Result<string, string>> {
    try {
      const mapping = this.tokenVault.get(token)
      if (!mapping) {
        return failure('Token not found')
      }

      this.metrics.recordTokenization('detokenize', mapping.originalData.length)
      return success(mapping.originalData)

    } catch (error) {
      return failure(`Detokenization failed: ${(error as Error).message}`)
    }
  }

  /**
   * Mask sensitive data
   */
  maskData(data: string, rule: DataMaskingRule): string {
    switch (rule.type) {
      case 'full':
        return rule.preserveLength ? '*'.repeat(data.length) : '***'
      
      case 'partial':
        if (rule.pattern) {
          return data.replace(new RegExp(rule.pattern, 'g'), rule.replacement || '*')
        }
        if (data.length <= 4) return '*'.repeat(data.length)
        return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2)
      
      case 'format_preserving':
        return this.formatPreservingMask(data)
      
      case 'hashing':
        return this.hashData(data)
      
      default:
        return data
    }
  }

  /**
   * Generate new encryption key
   */
  async generateKey(
    name: string,
    options: {
      algorithm?: string
      expiresAt?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<Result<EncryptionKey, string>> {
    try {
      const keyId = nanoid()
      const keyMaterial = randomBytes(32) // 256 bits

      const key: EncryptionKey = {
        id: keyId,
        name,
        algorithm: options.algorithm || 'aes-256-gcm',
        keyMaterial,
        createdAt: new Date().toISOString(),
        expiresAt: options.expiresAt,
        isActive: true,
        metadata: options.metadata || {}
      }

      this.keys.set(keyId, key)
      return success(key)

    } catch (error) {
      return failure(`Key generation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Add field encryption rule
   */
  addFieldEncryptionRule(context: string, rule: FieldEncryptionRule): void {
    const rules = this.fieldRules.get(context) || []
    rules.push(rule)
    this.fieldRules.set(context, rules)
  }

  /**
   * Get protection statistics
   */
  getProtectionStats(): {
    totalKeys: number
    activeKeys: number
    tokensInVault: number
    encryptionOperations: number
  } {
    const activeKeys = Array.from(this.keys.values()).filter(key => key.isActive).length

    return {
      totalKeys: this.keys.size,
      activeKeys,
      tokensInVault: this.tokenVault.size,
      encryptionOperations: 0 // Would come from metrics
    }
  }

  /**
   * Private helper methods
   */
  private getEncryptionKey(keyId?: string): EncryptionKey | null {
    if (keyId) {
      return this.keys.get(keyId) || null
    }
    
    const activeKeys = Array.from(this.keys.values()).filter(key => key.isActive)
    return activeKeys.length > 0 ? activeKeys[0] : null
  }

  private async encryptField(value: any, rule: FieldEncryptionRule): Promise<Result<any, string>> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

    switch (rule.encryptionType) {
      case 'full':
        return this.encrypt(stringValue, rule.keyId)
      
      case 'tokenization':
        const tokenResult = await this.tokenize(stringValue)
        return tokenResult.success ? success(tokenResult.data.token) : tokenResult as any
      
      default:
        return success(value)
    }
  }

  private async decryptField(value: any, rule: FieldEncryptionRule): Promise<Result<any, string>> {
    switch (rule.encryptionType) {
      case 'full':
        if (this.isEncryptedValue(value)) {
          const decryptResult = await this.decrypt(value)
          if (decryptResult.success) {
            try {
              return success(JSON.parse(decryptResult.data.toString('utf8')))
            } catch {
              return success(decryptResult.data.toString('utf8'))
            }
          }
          return decryptResult as any
        }
        return success(value)
      
      case 'tokenization':
        if (typeof value === 'string') {
          return this.detokenize(value)
        }
        return success(value)
      
      default:
        return success(value)
    }
  }

  private shouldApplyRule(rule: FieldEncryptionRule, obj: Record<string, any>): boolean {
    if (!rule.conditions) return true

    return rule.conditions.every(condition => {
      const value = this.getFieldValue(obj, condition.path)
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value
        case 'contains':
          return String(value).includes(String(condition.value))
        case 'matches':
          return new RegExp(condition.value).test(String(value))
        default:
          return false
      }
    })
  }

  private getFieldValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private setFieldValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)
    
    target[lastKey] = value
  }

  private isEncryptedValue(value: any): value is EncryptedData {
    return (
      typeof value === 'object' &&
      value !== null &&
      'data' in value &&
      'iv' in value &&
      'tag' in value &&
      'keyId' in value
    )
  }

  private generateToken(data: string, format?: string): string {
    if (format === 'email') {
      return `token${randomBytes(8).toString('hex')}@example.com`
    } else if (format === 'phone') {
      return `+1${randomBytes(5).toString('hex').substring(0, 10)}`
    }
    
    return `tok_${randomBytes(16).toString('hex')}`
  }

  private formatPreservingMask(data: string): string {
    return data.replace(/[a-zA-Z]/g, 'X').replace(/\d/g, '#')
  }

  private hashData(data: string): string {
    return `hash_${Buffer.from(data).toString('base64').substring(0, 16)}`
  }

  private setupDefaultKeys(): void {
    this.generateKey('default', {
      metadata: { purpose: 'default_encryption' }
    })
  }
}