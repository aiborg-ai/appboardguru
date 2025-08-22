/**
 * Enhanced Telemetry Configuration
 * Advanced telemetry with business metrics, performance monitoring, and debugging
 */

// Core telemetry
export * from './server'
export * from './client'

// Business metrics system
export * from './business-metrics'

// Enhanced performance monitoring
export * from './performance'

// Initialize telemetry on import
if (typeof window === 'undefined') {
  // Server-side initialization
  import('./server').then(({ initializeServerTelemetry }) => {
    initializeServerTelemetry()
  }).catch(console.warn)
  
  // Initialize business metrics
  import('./business-metrics').then(({ initializeBusinessMetrics }) => {
    initializeBusinessMetrics()
  }).catch(console.warn)
}