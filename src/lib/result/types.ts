/**
 * Result Pattern Types
 * Functional error handling without exceptions
 */

// Result type representing success or failure
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Option type representing presence or absence of a value
export type Option<T> = 
  | { some: true; value: T }
  | { some: false }

// Error types for structured error handling
export interface AppError {
  code: string
  message: string
  details?: any
  cause?: Error
  timestamp: Date
  context?: Record<string, unknown>
}

// Common error codes
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // External service errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED'
}

// Result transformer function type
export type ResultTransformer<T, U, E = Error> = (value: T) => Result<U, E>

// Async result transformer
export type AsyncResultTransformer<T, U, E = Error> = (value: T) => Promise<Result<U, E>>