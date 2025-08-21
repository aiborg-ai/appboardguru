/**
 * Dashboard Component Types
 * Comprehensive type definitions for dashboard pages and components
 */

import { ReactNode, MouseEventHandler, ChangeEventHandler } from 'react'

// Base Types
export type StatusType = 'active' | 'pending' | 'inactive' | 'suspended'
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
export type ViewMode = 'grid' | 'list'

// Dashboard Layout Types
export interface DashboardLayoutProps {
  children: ReactNode
  className?: string
  showSidebar?: boolean
  sidebarProps?: SidebarProps
}

export interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  className?: string
}

// Dashboard Page Types
export interface DashboardPageProps {
  className?: string
}

export interface DashboardMetrics {
  boardPacks: number
  secureFiles: number
  activeUsers: number
  aiInsights: number
}

export interface DashboardActivity {
  id: string
  type: 'search' | 'report' | 'update' | 'review'
  title: string
  description?: string
  timestamp: string
  icon: 'search' | 'file' | 'brain' | 'users'
  color: 'blue' | 'green' | 'purple' | 'orange'
}

// Quick Actions Types
export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  href?: string
  onClick?: () => void
}

export interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
}

// Activity Feed Types
export interface ActivityFeedProps {
  activities: DashboardActivity[]
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

// Statistics Card Types
export interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string | number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon: ReactNode
  className?: string
  onClick?: () => void
}

export interface StatsGridProps {
  stats: StatCardProps[]
  className?: string
}

// Filter and Search Types
export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface SearchAndFilterProps {
  searchValue: string
  onSearchChange: ChangeEventHandler<HTMLInputElement>
  searchPlaceholder?: string
  filters?: {
    [key: string]: {
      value: string
      options: FilterOption[]
      onChange: (value: string) => void
    }
  }
  activeFilters?: string[]
  onClearFilters?: () => void
  className?: string
}

// Data Table Types
export interface TableColumn<T = any> {
  key: string
  title: string
  render?: (value: any, record: T, index: number) => ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  emptyState?: ReactNode
  pagination?: {
    page: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  selection?: {
    selectedKeys: string[]
    onChange: (keys: string[]) => void
    getRowKey: (record: T) => string
  }
  className?: string
}

// Common UI Component Types
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
  loading?: boolean
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
}

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode
  'aria-label': string
}

// Modal and Dialog Types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
}

// Loading States
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    text: string
    onClick: () => void
  }
  className?: string
}

// Error States
export interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  className?: string
}

// Form Types
export interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  help?: string
  className?: string
  children: ReactNode
}

export interface InputProps {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  placeholder?: string
  disabled?: boolean
  className?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  required?: boolean
  maxLength?: number
  minLength?: number
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  options: FilterOption[]
}

// Badge and Status Types
export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'default'
  className?: string
  children: ReactNode
}

export interface StatusBadgeProps extends Omit<BadgeProps, 'children'> {
  status: StatusType
}

// Card Component Types
export interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
}

export interface CardHeaderProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export interface CardContentProps {
  children: ReactNode
  className?: string
}

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

// Navigation Types
export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  current?: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export interface TabItem {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
  badge?: string | number
}

export interface TabsProps {
  items: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

// Generic Action Types
export interface Action {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ActionMenuProps {
  actions: Action[]
  trigger: ReactNode
  className?: string
}

// Async Action Types
export interface AsyncActionState {
  loading: boolean
  error?: string
  success?: boolean
}

export interface AsyncActionProps {
  onExecute: () => Promise<void>
  children: (state: AsyncActionState & { execute: () => void }) => ReactNode
}

// Dashboard Layout Context Types
export interface DashboardContextType {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  currentPage: string
  setCurrentPage: (page: string) => void
}

// Theme Types
export interface ThemeContextType {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  resolvedTheme: 'light' | 'dark'
}