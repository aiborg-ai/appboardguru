// Component Library - Atomic Design System
// Export all components in a structured way

// Atoms - Basic building blocks
export * from './atoms'

// Molecules - Combinations of atoms
export * from './molecules'

// Organisms - Complex UI components  
export * from './organisms'

// Templates - Page layouts and structure
export * from './templates'

// Hooks - Custom hooks for component logic
export * from './hooks'

// Pages - Lazy loading utilities
export { LazyLoadWrapper, LazyLoadErrorBoundary, withLazyLoading, preloadComponent } from './pages/LazyLoadWrapper'

// Legacy UI components (for backward compatibility)
export { VoiceInputButton as LegacyVoiceInputButton } from './ui/VoiceInputButton'