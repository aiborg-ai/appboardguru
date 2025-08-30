/**
 * Secure ID Generation Service
 * Provides cryptographically secure unique identifiers
 */

import { customAlphabet } from 'nanoid';

// Custom alphabet for readable IDs (no ambiguous characters)
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz';

// Different ID generators for different purposes
const generators = {
  // Standard ID: 21 characters (similar entropy to UUID v4)
  standard: customAlphabet(ALPHABET, 21),
  
  // Short ID: 12 characters (for user-facing IDs)
  short: customAlphabet(ALPHABET, 12),
  
  // Long ID: 32 characters (for high security)
  long: customAlphabet(ALPHABET, 32),
  
  // Numeric ID: 16 digits (for legacy systems)
  numeric: customAlphabet('0123456789', 16)
};

/**
 * ID Generator class
 */
export class IdGenerator {
  /**
   * Generate a standard ID with prefix
   */
  static generate(prefix?: string): string {
    const id = generators.standard();
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Generate a short ID
   */
  static generateShort(prefix?: string): string {
    const id = generators.short();
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Generate a long ID for high security
   */
  static generateSecure(prefix?: string): string {
    const id = generators.long();
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Generate a numeric ID
   */
  static generateNumeric(): string {
    return generators.numeric();
  }

  /**
   * Generate a timestamped ID
   */
  static generateTimestamped(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = generators.short();
    const id = `${timestamp}_${random}`;
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Generate a UUID v4 compatible ID
   */
  static generateUUID(): string {
    // Use crypto.randomUUID if available, otherwise use nanoid
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback to nanoid-based UUID-like format
    const segments = [
      generators.standard().slice(0, 8),
      generators.standard().slice(0, 4),
      '4' + generators.standard().slice(0, 3), // Version 4
      generators.standard().slice(0, 4),
      generators.standard().slice(0, 12)
    ];
    
    return segments.join('-').toLowerCase();
  }

  /**
   * Generate ID for specific entity types
   */
  static forEntity(entityType: EntityType): string {
    const prefixes: Record<EntityType, string> = {
      user: 'usr',
      board: 'brd',
      meeting: 'mtg',
      document: 'doc',
      event: 'evt',
      organization: 'org',
      transaction: 'txn',
      session: 'ses',
      api_key: 'key',
      token: 'tkn'
    };

    const prefix = prefixes[entityType] || 'id';
    
    // Use different lengths for different entity types
    switch (entityType) {
      case 'api_key':
      case 'token':
        return this.generateSecure(prefix);
      case 'transaction':
      case 'event':
        return this.generateTimestamped(prefix);
      default:
        return this.generate(prefix);
    }
  }

  /**
   * Validate an ID format
   */
  static isValid(id: string, prefix?: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    if (prefix) {
      const pattern = new RegExp(`^${prefix}_[${ALPHABET}]+$`);
      return pattern.test(id);
    }

    // Basic validation: contains only valid characters
    const pattern = new RegExp(`^[${ALPHABET}_-]+$`);
    return pattern.test(id);
  }

  /**
   * Extract prefix from ID
   */
  static extractPrefix(id: string): string | null {
    if (!id || !id.includes('_')) {
      return null;
    }
    return id.split('_')[0];
  }

  /**
   * Batch generate IDs
   */
  static generateBatch(count: number, prefix?: string): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();

    while (ids.length < count) {
      const id = this.generate(prefix);
      
      // Ensure uniqueness within batch
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }

    return ids;
  }
}

/**
 * Entity types for ID generation
 */
export type EntityType = 
  | 'user'
  | 'board'
  | 'meeting'
  | 'document'
  | 'event'
  | 'organization'
  | 'transaction'
  | 'session'
  | 'api_key'
  | 'token';

/**
 * Global ID generator instance
 */
export const idGenerator = IdGenerator;

/**
 * Convenience functions
 */
export const generateId = (prefix?: string) => IdGenerator.generate(prefix);
export const generateShortId = (prefix?: string) => IdGenerator.generateShort(prefix);
export const generateSecureId = (prefix?: string) => IdGenerator.generateSecure(prefix);
export const generateUUID = () => IdGenerator.generateUUID();
export const generateEntityId = (entityType: EntityType) => IdGenerator.forEntity(entityType);

/**
 * Legacy support - replace crypto.randomUUID fallback pattern
 */
export function generateEventId(): string {
  return IdGenerator.forEntity('event');
}

export function generateTransactionId(): string {
  return IdGenerator.forEntity('transaction');
}

export function generateUserId(): string {
  return IdGenerator.forEntity('user');
}

export function generateBoardId(): string {
  return IdGenerator.forEntity('board');
}

// Default export
export default IdGenerator;