// ============================================================================
// ATOMIC DESIGN COMPONENTS - MAIN EXPORTS
// Complete atomic design system for meetings functionality
// ============================================================================

// Atoms - Basic building blocks
export * from './atoms'

// Molecules - Simple combinations of atoms  
export * from './molecules'

// Organisms - Complex components made of molecules
export * from './organisms'

// Types - Shared interfaces and types
export * from './types'

// ============================================================================
// CONVENIENCE EXPORTS FOR COMMON PATTERNS
// ============================================================================

import { 
  VoteIndicator, 
  StatusBadge, 
  ProgressBar, 
  PriorityIndicator, 
  QuorumMeter 
} from './atoms'

import { 
  ResolutionCard, 
  ActionableItem, 
  VotingControls, 
  ProgressUpdate, 
  AssignmentBadge 
} from './molecules'

import { 
  ResolutionList, 
  ActionableBoard, 
  VotingPanel, 
  ProgressTracker 
} from './organisms'

// Grouped exports for easier importing
export const Atoms = {
  VoteIndicator,
  StatusBadge,
  ProgressBar,
  PriorityIndicator,
  QuorumMeter
}

export const Molecules = {
  ResolutionCard,
  ActionableItem,
  VotingControls,
  ProgressUpdate,
  AssignmentBadge
}

export const Organisms = {
  ResolutionList,
  ActionableBoard,
  VotingPanel,
  ProgressTracker
}