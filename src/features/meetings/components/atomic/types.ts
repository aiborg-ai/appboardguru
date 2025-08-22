// ============================================================================
// ATOMIC DESIGN COMPONENT TYPES
// Shared types and interfaces for meetings atomic components
// ============================================================================

import { ReactNode, HTMLAttributes } from 'react'
import { 
  ResolutionStatus, 
  ResolutionType,
  ActionableStatus, 
  ActionablePriority,
  ActionableCategory,
  VotingMethod,
  VoteChoice
} from '@/types/meetings'

// ============================================================================
// BASE COMPONENT TYPES
// ============================================================================

export interface BaseComponentProps extends HTMLAttributes<HTMLElement> {
  /** Custom CSS class name */
  className?: string
  /** Children elements */
  children?: ReactNode
  /** Test ID for automated testing */
  'data-testid'?: string
}

export interface BaseInteractiveProps extends BaseComponentProps {
  /** Whether the component is disabled */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Click handler */
  onClick?: () => void
  /** Keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent) => void
}

// ============================================================================
// SIZE AND VARIANT TYPES
// ============================================================================

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ComponentVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
export type ComponentColorScheme = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange'

// ============================================================================
// ATOMIC COMPONENT TYPES (ATOMS)
// ============================================================================

export interface VoteIndicatorProps extends BaseComponentProps {
  /** Vote count */
  count: number
  /** Total eligible voters */
  total: number
  /** Type of vote */
  voteType: 'for' | 'against' | 'abstain'
  /** Size of the indicator */
  size?: ComponentSize
  /** Show percentage instead of count */
  showPercentage?: boolean
  /** Animate the indicator */
  animated?: boolean
}

export interface StatusBadgeProps extends BaseComponentProps {
  /** Status value */
  status: ResolutionStatus | ActionableStatus
  /** Badge size */
  size?: ComponentSize
  /** Show status icon */
  showIcon?: boolean
  /** Custom status label */
  label?: string
  /** Interactive badge (clickable) */
  interactive?: boolean
  /** Click handler for interactive badges */
  onStatusClick?: (status: ResolutionStatus | ActionableStatus) => void
}

export interface ProgressBarProps extends BaseComponentProps {
  /** Progress value (0-100) */
  value: number
  /** Maximum value (default: 100) */
  max?: number
  /** Progress bar size */
  size?: ComponentSize
  /** Color scheme based on status */
  status?: ActionableStatus
  /** Show percentage label */
  showLabel?: boolean
  /** Animate progress changes */
  animated?: boolean
  /** Custom label */
  label?: string
}

export interface PriorityIndicatorProps extends BaseComponentProps {
  /** Priority level */
  priority: ActionablePriority | 1 | 2 | 3 | 4 | 5
  /** Indicator size */
  size?: ComponentSize
  /** Show priority label */
  showLabel?: boolean
  /** Indicator style */
  variant?: 'badge' | 'dot' | 'bar' | 'flag'
}

export interface QuorumMeterProps extends BaseComponentProps {
  /** Current participation count */
  current: number
  /** Required quorum count */
  required: number
  /** Total eligible participants */
  total: number
  /** Meter size */
  size?: ComponentSize
  /** Show detailed labels */
  showDetails?: boolean
  /** Animate the meter */
  animated?: boolean
}

// ============================================================================
// MOLECULAR COMPONENT TYPES (MOLECULES)
// ============================================================================

export interface ResolutionCardProps extends BaseComponentProps {
  /** Resolution ID */
  id: string
  /** Resolution number (e.g., "R2024-001") */
  resolutionNumber?: string
  /** Resolution title */
  title: string
  /** Resolution description */
  description: string
  /** Resolution status */
  status: ResolutionStatus
  /** Resolution type */
  type: ResolutionType
  /** Priority level */
  priority: 1 | 2 | 3 | 4 | 5
  /** Proposed date */
  proposedAt: string
  /** Voting results */
  votingResults?: {
    forPercentage: number
    againstPercentage: number
    abstainPercentage: number
    participation: number
  }
  /** Compliance indicators */
  compliance?: {
    requiresBoardApproval?: boolean
    requiresShareholderApproval?: boolean
    legalReviewRequired?: boolean
  }
  /** Card actions */
  actions?: {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }
  /** Whether user can manage this resolution */
  canManage?: boolean
  /** Compact view */
  compact?: boolean
}

export interface ActionableItemProps extends BaseComponentProps {
  /** Actionable ID */
  id: string
  /** Action number (e.g., "A2024-001") */
  actionNumber?: string
  /** Actionable title */
  title: string
  /** Actionable description */
  description: string
  /** Current status */
  status: ActionableStatus
  /** Priority level */
  priority: ActionablePriority
  /** Category */
  category: ActionableCategory
  /** Due date */
  dueDate: string
  /** Progress percentage */
  progress: number
  /** Assigned to user info */
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  /** Effort tracking */
  effort?: {
    estimated?: number
    actual?: number
  }
  /** Dependencies */
  dependencies?: {
    dependsOn: number
    blocks: number
  }
  /** Item actions */
  actions?: {
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
    onUpdateProgress?: (progress: number) => void
  }
  /** Whether user can manage this actionable */
  canManage?: boolean
  /** View mode */
  viewMode?: 'card' | 'list' | 'board'
}

export interface VotingControlsProps extends BaseComponentProps {
  /** Resolution ID */
  resolutionId: string
  /** Whether voting is active */
  isActive: boolean
  /** Voting method */
  method?: VotingMethod
  /** User's current vote */
  userVote?: VoteChoice
  /** Whether user can vote */
  canVote?: boolean
  /** Vote handlers */
  onVote?: (choice: VoteChoice) => void
  /** Start voting handler */
  onStartVoting?: (method: VotingMethod) => void
  /** End voting handler */
  onEndVoting?: () => void
  /** Whether user can manage voting */
  canManage?: boolean
  /** Compact view */
  compact?: boolean
}

export interface ProgressUpdateProps extends BaseComponentProps {
  /** Current progress value */
  value: number
  /** Maximum progress value */
  max?: number
  /** Whether progress can be edited */
  editable?: boolean
  /** Update handler */
  onUpdate?: (newValue: number) => void
  /** Status for color coding */
  status?: ActionableStatus
  /** Show input controls */
  showControls?: boolean
  /** Update notes */
  notes?: string
  /** Notes change handler */
  onNotesChange?: (notes: string) => void
}

export interface AssignmentBadgeProps extends BaseComponentProps {
  /** Assignee information */
  assignee: {
    id: string
    name: string
    avatar?: string
    email?: string
  }
  /** Assignment date */
  assignedAt?: string
  /** Badge size */
  size?: ComponentSize
  /** Show detailed info on hover */
  showDetails?: boolean
  /** Click handler */
  onAssigneeClick?: (assigneeId: string) => void
  /** Whether assignment can be changed */
  editable?: boolean
  /** Change assignee handler */
  onReassign?: () => void
}

// ============================================================================
// ORGANISM COMPONENT TYPES (ORGANISMS)
// ============================================================================

export interface ResolutionListProps extends BaseComponentProps {
  /** List of resolutions */
  resolutions: Array<ResolutionCardProps>
  /** Loading state */
  loading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** List actions */
  actions?: {
    onCreate?: () => void
    onBulkAction?: (action: string, resolutionIds: string[]) => void
  }
  /** Selection mode */
  selectable?: boolean
  /** Selected resolution IDs */
  selectedIds?: string[]
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Sort configuration */
  sort?: {
    field: string
    order: 'asc' | 'desc'
    onChange: (field: string, order: 'asc' | 'desc') => void
  }
  /** Pagination */
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
  }
  /** View mode */
  viewMode?: 'card' | 'list' | 'table'
}

export interface ActionableBoardProps extends BaseComponentProps {
  /** Actionables grouped by status */
  actionables: Record<ActionableStatus, ActionableItemProps[]>
  /** Loading state */
  loading?: boolean
  /** Board actions */
  actions?: {
    onCreate?: () => void
    onStatusChange?: (actionableId: string, newStatus: ActionableStatus) => void
    onReorder?: (actionableId: string, newIndex: number, newStatus: ActionableStatus) => void
  }
  /** Column configuration */
  columns?: {
    visible: ActionableStatus[]
    customOrder?: ActionableStatus[]
  }
  /** Whether drag and drop is enabled */
  dragEnabled?: boolean
  /** Board layout */
  layout?: 'horizontal' | 'vertical'
}

export interface VotingPanelProps extends BaseComponentProps {
  /** Resolution being voted on */
  resolution: {
    id: string
    title: string
    description: string
    resolutionText: string
    proposedBy: string
    proposedAt: string
  }
  /** Current voting state */
  votingState: {
    isActive: boolean
    method?: VotingMethod
    startedAt?: string
    totalEligible: number
    votedCount: number
    results: {
      for: number
      against: number
      abstain: number
    }
  }
  /** User's voting status */
  userVoting: {
    canVote: boolean
    hasVoted: boolean
    voteChoice?: VoteChoice
  }
  /** Voting actions */
  actions: {
    onStartVoting: (method: VotingMethod) => void
    onCastVote: (choice: VoteChoice) => void
    onConcludeVoting: () => void
  }
  /** Real-time updates */
  realTime?: boolean
  /** Panel size */
  size?: ComponentSize
}

export interface ProgressTrackerProps extends BaseComponentProps {
  /** Actionable being tracked */
  actionable: {
    id: string
    title: string
    description: string
    status: ActionableStatus
    priority: ActionablePriority
    progress: number
    dueDate: string
    assignee: {
      id: string
      name: string
      avatar?: string
    }
  }
  /** Progress history */
  history?: Array<{
    id: string
    progress: number
    notes?: string
    updatedAt: string
    updatedBy: string
  }>
  /** Update actions */
  actions: {
    onUpdateProgress: (progress: number, notes?: string) => void
    onUpdateStatus: (status: ActionableStatus) => void
  }
  /** Whether user can update */
  canUpdate?: boolean
  /** Show history */
  showHistory?: boolean
  /** Tracker layout */
  layout?: 'vertical' | 'horizontal'
}

// ============================================================================
// FILTER AND SORT TYPES
// ============================================================================

export interface FilterOption<T = string> {
  value: T
  label: string
  count?: number
  disabled?: boolean
}

export interface SortOption {
  field: string
  label: string
  direction?: 'asc' | 'desc'
}

export interface FilterPanelProps extends BaseComponentProps {
  /** Available filters */
  filters: {
    status?: FilterOption<ResolutionStatus | ActionableStatus>[]
    priority?: FilterOption<ActionablePriority>[]
    type?: FilterOption<ResolutionType | ActionableCategory>[]
    assignee?: FilterOption<string>[]
    dateRange?: {
      from?: string
      to?: string
    }
  }
  /** Current filter values */
  activeFilters: Record<string, any>
  /** Filter change handler */
  onFiltersChange: (filters: Record<string, any>) => void
  /** Sort options */
  sortOptions?: SortOption[]
  /** Current sort */
  activeSort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  /** Sort change handler */
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void
  /** Reset all filters */
  onReset?: () => void
  /** Collapsible panel */
  collapsible?: boolean
}

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

export interface AccessibilityProps {
  /** ARIA label */
  'aria-label'?: string
  /** ARIA labelledby */
  'aria-labelledby'?: string
  /** ARIA describedby */
  'aria-describedby'?: string
  /** ARIA expanded (for collapsible elements) */
  'aria-expanded'?: boolean
  /** ARIA selected (for selectable elements) */
  'aria-selected'?: boolean
  /** ARIA checked (for checkable elements) */
  'aria-checked'?: boolean
  /** ARIA disabled */
  'aria-disabled'?: boolean
  /** ARIA hidden */
  'aria-hidden'?: boolean
  /** Tab index */
  tabIndex?: number
  /** Role */
  role?: string
}

// ============================================================================
// ANIMATION AND INTERACTION TYPES
// ============================================================================

export interface AnimationProps {
  /** Enable animations */
  animated?: boolean
  /** Animation duration */
  duration?: number
  /** Animation delay */
  delay?: number
  /** Animation easing */
  easing?: string
  /** Reduced motion preference */
  respectReducedMotion?: boolean
}

export interface InteractionProps {
  /** Hover effects */
  hoverable?: boolean
  /** Focus effects */
  focusable?: boolean
  /** Ripple effect on click */
  ripple?: boolean
  /** Haptic feedback on mobile */
  hapticFeedback?: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ComponentPropsWithRef<T extends React.ElementType> = React.ComponentPropsWithRef<T>

export type PolymorphicComponentProps<T extends React.ElementType, P = {}> = P & {
  as?: T
} & Omit<React.ComponentPropsWithRef<T>, keyof P | 'as'>

// ============================================================================
// ERROR BOUNDARY TYPES
// ============================================================================

export interface ErrorBoundaryProps extends BaseComponentProps {
  /** Fallback component */
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  /** Error handler */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Reset callback */
  onReset?: () => void
}