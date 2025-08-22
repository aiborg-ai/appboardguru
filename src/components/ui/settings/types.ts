import { ReactNode, ComponentProps, ComponentPropsWithoutRef } from 'react'
import { LucideIcon } from 'lucide-react'

// Base interfaces
export interface BaseSettingsProps {
  id?: string
  className?: string
  children?: ReactNode
  'aria-label'?: string
  'aria-describedby'?: string
}

export interface SettingsCardProps extends BaseSettingsProps {
  title?: string
  description?: string
  icon?: LucideIcon
  variant?: 'default' | 'elevated' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  error?: boolean
  success?: boolean
}

export interface SettingsSectionProps extends BaseSettingsProps {
  title: string
  description?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  headerActions?: ReactNode
}

export interface SettingsHeaderProps extends BaseSettingsProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
    onClick?: () => void
  }>
}

export interface SettingsToggleProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
  description?: string
  loading?: boolean
  error?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  onValueChange?: (value: boolean) => void
}

export interface SettingsSelectProps extends ComponentPropsWithoutRef<'select'> {
  label: string
  description?: string
  placeholder?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
    description?: string
  }>
  loading?: boolean
  error?: string
  success?: string
  size?: 'sm' | 'md' | 'lg'
  onValueChange?: (value: string) => void
}

export interface SettingsInputProps extends ComponentPropsWithoutRef<'input'> {
  label: string
  description?: string
  error?: string
  success?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  startIcon?: LucideIcon
  endIcon?: LucideIcon
  onValueChange?: (value: string) => void
}

export interface SettingsButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export interface SettingsFormProps extends ComponentPropsWithoutRef<'form'> {
  title?: string
  description?: string
  loading?: boolean
  error?: string
  success?: string
  resetable?: boolean
  exportable?: boolean
  onReset?: () => void
  onExport?: () => void
  onImport?: (data: any) => void
}

export interface SettingsGridProps extends BaseSettingsProps {
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  responsive?: boolean
}

export interface SettingsSearchProps extends ComponentPropsWithoutRef<'input'> {
  onSearch?: (query: string) => void
  onClear?: () => void
  suggestions?: string[]
  loading?: boolean
}

export interface SettingsSkeletonProps extends BaseSettingsProps {
  variant?: 'card' | 'form' | 'list' | 'toggle' | 'input'
  count?: number
  showAvatar?: boolean
  showActions?: boolean
}

export interface SettingsErrorStateProps extends BaseSettingsProps {
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  recoverable?: boolean
}

export interface SettingsSuccessStateProps extends BaseSettingsProps {
  title?: string
  message: string
  autoHide?: boolean
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface SettingsExportImportProps extends BaseSettingsProps {
  onExport?: (format: 'json' | 'csv' | 'xml') => void
  onImport?: (data: any, format: string) => void
  supportedFormats?: Array<'json' | 'csv' | 'xml'>
  loading?: boolean
  exportLoading?: boolean
  importLoading?: boolean
}

export interface SettingsHistoryEntry {
  id: string
  timestamp: Date
  action: string
  category: string
  oldValue?: any
  newValue?: any
  user?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface SettingsHistoryProps extends BaseSettingsProps {
  entries: SettingsHistoryEntry[]
  loading?: boolean
  onRevert?: (entryId: string) => void
  onClear?: () => void
  pageSize?: number
}

export interface SettingsResetProps extends BaseSettingsProps {
  onReset?: () => void
  onResetToDefaults?: () => void
  confirmationRequired?: boolean
  resetScopes?: Array<{
    id: string
    label: string
    description: string
    selected?: boolean
  }>
  loading?: boolean
}