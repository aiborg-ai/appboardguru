// Component Library - Atomic Design System
// Export all components in a structured way following CLAUDE.md guidelines

// Atoms - Basic building blocks
export * from './atoms'

// Molecules - Combinations of atoms
export * from './molecules'

// Organisms - Complex UI components  
export * from './organisms'

// Templates - Page layouts and structure
export * from './templates'

// Features - Domain-specific components
export * from './features'

// Hooks - Custom hooks for component logic
export * from './hooks'

// Pages - Lazy loading utilities
export { LazyLoadWrapper, LazyLoadErrorBoundary, withLazyLoading, preloadComponent } from './pages/LazyLoadWrapper'

// Error Boundary
export { ErrorBoundary } from './ErrorBoundary'

// Legacy UI components (for backward compatibility - to be phased out)
export { VoiceInputButton as LegacyVoiceInputButton } from './ui/VoiceInputButton'