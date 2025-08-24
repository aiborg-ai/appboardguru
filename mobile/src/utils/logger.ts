/**
 * Mobile Logger Utilities
 * Enterprise-grade logging system for mobile governance workflows
 * Provides structured logging with offline support and privacy protection
 */

import { Platform } from 'react-native';
import { Environment } from '@/config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly message: string;
  readonly data?: any;
  readonly error?: any;
  readonly userId?: string;
  readonly organizationId?: string;
  readonly sessionId?: string;
  readonly deviceInfo?: Record<string, any>;
  readonly networkInfo?: Record<string, any>;
}

// Logger configuration
interface LoggerConfig {
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStoredEntries: number;
  sensitiveDataKeys: string[];
  remoteEndpoint?: string;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  enableConsole: __DEV__,
  enableStorage: true,
  enableRemote: !__DEV__,
  maxStoredEntries: 1000,
  sensitiveDataKeys: [
    'password',
    'token',
    'apiKey',
    'secret',
    'auth',
    'credential',
    'ssn',
    'email',
    'phone',
    'address',
  ],
};

// Global logger state
let config = { ...DEFAULT_CONFIG };
let storedLogs: LogEntry[] = [];
let sessionId = generateSessionId();

class Logger {
  private readonly service: string;
  private readonly isDebugEnabled: boolean;

  constructor(service: string) {
    this.service = service;
    this.isDebugEnabled = Environment.isDebugMode;
  }

  debug(message: string, data?: any): void {
    if (this.isDebugEnabled) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any, error?: Error): void {
    this.log('error', message, data, error);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      data: data ? sanitizeData(data) : undefined,
      error,
      sessionId,
      deviceInfo: getDeviceInfo(),
      networkInfo: getNetworkInfo(),
    };

    // Console output
    if (config.enableConsole) {
      logToConsole(entry);
    }

    // Storage logging
    if (config.enableStorage) {
      addToStoredLogs(entry);
    }

    // Store for crash reporting if available
    if (level === 'error' && Environment.crashlyticsEnabled) {
      // TODO: Send to crash reporting service
    }
  }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Configure the global logger settings
 */
export const configureLogger = (newConfig: Partial<LoggerConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Get stored log entries
 */
export const getStoredLogs = (
  level?: LogLevel,
  service?: string,
  limit?: number
): LogEntry[] => {
  let filtered = [...storedLogs];

  if (level) {
    filtered = filtered.filter(entry => entry.level === level);
  }

  if (service) {
    filtered = filtered.filter(entry => entry.service === service);
  }

  if (limit) {
    filtered = filtered.slice(-limit);
  }

  return filtered.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Clear stored logs
 */
export const clearStoredLogs = (): void => {
  storedLogs = [];
};

// Helper functions
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  for (const key of config.sensitiveDataKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

function getDeviceInfo(): Record<string, any> {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    model: Platform.select({
      ios: 'iOS Device',
      android: 'Android Device',
    }),
  };
}

function getNetworkInfo(): Record<string, any> {
  // Basic network info - would use @react-native-community/netinfo in production
  return {
    type: 'unknown',
    isConnected: true,
  };
}

function logToConsole(entry: LogEntry): void {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]`;
  
  const consoleMethod = entry.level === 'error' ? 'error' : 
                       entry.level === 'warn' ? 'warn' : 
                       entry.level === 'info' ? 'info' : 'log';
  
  if (entry.data) {
    console[consoleMethod](prefix, entry.message, entry.data);
  } else {
    console[consoleMethod](prefix, entry.message);
  }
}

function addToStoredLogs(entry: LogEntry): void {
  storedLogs.push(entry);
  
  // Trim logs if exceeding max entries
  if (storedLogs.length > config.maxStoredEntries) {
    storedLogs = storedLogs.slice(-config.maxStoredEntries);
  }
}