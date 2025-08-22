/**
 * Navigation Component Types
 * Type definitions for navigation and button components
 */

import { ReactNode, MouseEventHandler, KeyboardEventHandler, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

// Base Navigation Types
export interface NavigationItem {
  id: string
  label: string
  href?: string
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
  active?: boolean
  children?: NavigationItem[]
  onClick?: () => void
  external?: boolean
}

export interface NavigationSection {
  title?: string
  items: NavigationItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}

// Button Types
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface ButtonProps extends Omit<BaseButtonProps, 'children'>, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  asChild?: boolean
  children?: ReactNode
}

export interface LinkButtonProps extends Omit<BaseButtonProps, 'children'>, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  href: string
  external?: boolean
  prefetch?: boolean
  children?: ReactNode
}

// Icon Button Types
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode
  'aria-label': string
  tooltip?: string
}

// Button Group Types
export interface ButtonGroupProps {
  orientation?: 'horizontal' | 'vertical'
  size?: ButtonSize
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}

// Floating Action Button Types
export interface FABProps extends Omit<ButtonProps, 'size' | 'variant'> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size?: 'sm' | 'md' | 'lg'
  icon: ReactNode
  tooltip?: string
  extended?: boolean
}

// Menu Button Types
export interface MenuButtonProps extends ButtonProps {
  menu: ReactNode
  placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end'
  trigger?: 'click' | 'hover'
  closeOnSelect?: boolean
}

// Toggle Button Types
export interface ToggleButtonProps extends Omit<ButtonProps, 'onClick'> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  'aria-label': string
}

// Navigation Menu Types
export interface NavigationMenuProps {
  items: NavigationSection[]
  orientation?: 'horizontal' | 'vertical'
  trigger?: 'click' | 'hover'
  className?: string
  onItemClick?: (item: NavigationItem) => void
}

// Sidebar Navigation Types
export interface SidebarProps {
  navigation: NavigationSection[]
  collapsed?: boolean
  collapsible?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  width?: number
  collapsedWidth?: number
  position?: 'left' | 'right'
  overlay?: boolean
  className?: string
  header?: ReactNode
  footer?: ReactNode
}

export interface SidebarItemProps {
  item: NavigationItem
  level?: number
  collapsed?: boolean
  onClick?: (item: NavigationItem) => void
  className?: string
}

// Top Navigation Types
export interface TopNavProps {
  brand?: {
    name: string
    logo?: ReactNode
    href?: string
    onClick?: () => void
  }
  navigation?: NavigationItem[]
  actions?: ReactNode
  className?: string
  sticky?: boolean
  transparent?: boolean
}

// Breadcrumb Types
export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  active?: boolean
  icon?: ReactNode
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: ReactNode
  maxItems?: number
  className?: string
  onItemClick?: (item: BreadcrumbItem) => void
}

// Pagination Types
export interface PaginationProps {
  current: number
  total: number
  pageSize?: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode)
  size?: 'sm' | 'md' | 'lg'
  simple?: boolean
  hideOnSinglePage?: boolean
  onChange?: (page: number, pageSize?: number) => void
  className?: string
}

// Tab Navigation Types
export interface TabItem {
  id: string
  label: string
  content?: ReactNode
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
  closable?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeTab?: string
  defaultActiveTab?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  orientation?: 'horizontal' | 'vertical'
  variant?: 'line' | 'card' | 'pill'
  size?: 'sm' | 'md' | 'lg'
  addable?: boolean
  onTabAdd?: () => void
  className?: string
}

export interface TabPanelProps {
  tabId: string
  active: boolean
  children: ReactNode
  className?: string
}

// Steps/Wizard Navigation Types
export interface StepItem {
  id: string
  title: string
  description?: string
  icon?: ReactNode
  status?: 'wait' | 'process' | 'finish' | 'error'
  optional?: boolean
}

export interface StepsProps {
  items: StepItem[]
  current?: number
  direction?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  clickable?: boolean
  onStepClick?: (step: number, item: StepItem) => void
  className?: string
}

// Mobile Navigation Types
export interface MobileNavProps {
  navigation: NavigationItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  className?: string
}

// Context Menu Types
export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
  children?: ContextMenuItem[]
  onClick?: () => void
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  children: ReactNode
  className?: string
  onItemClick?: (item: ContextMenuItem) => void
}

// Command Palette Types
export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon?: ReactNode
  keywords?: string[]
  shortcut?: string
  category?: string
  action: () => void
}

export interface CommandPaletteProps {
  items: CommandItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  emptyText?: string
  className?: string
  onItemSelect?: (item: CommandItem) => void
}

// Dock Navigation Types
export interface DockItem {
  id: string
  label: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  badge?: string | number
  active?: boolean
}

export interface DockProps {
  items: DockItem[]
  position?: 'bottom' | 'top' | 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'floating' | 'solid'
  className?: string
  onItemClick?: (item: DockItem) => void
}

// Tree Navigation Types
export interface TreeNode {
  id: string
  label: string
  icon?: ReactNode
  href?: string
  expandable?: boolean
  expanded?: boolean
  selected?: boolean
  children?: TreeNode[]
  metadata?: any
}

export interface TreeNavigationProps {
  nodes: TreeNode[]
  onNodeClick?: (node: TreeNode) => void
  onNodeExpand?: (node: TreeNode, expanded: boolean) => void
  selectable?: boolean
  multiSelect?: boolean
  expandAll?: boolean
  collapseAll?: boolean
  className?: string
}

// Carousel Navigation Types
export interface CarouselProps {
  items: ReactNode[]
  autoPlay?: boolean
  autoPlayInterval?: number
  showDots?: boolean
  showArrows?: boolean
  infinite?: boolean
  slidesToShow?: number
  slidesToScroll?: number
  responsive?: Array<{
    breakpoint: number
    settings: Partial<CarouselProps>
  }>
  onSlideChange?: (index: number) => void
  className?: string
}

// Speed Dial Types
export interface SpeedDialAction {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

export interface SpeedDialProps {
  actions: SpeedDialAction[]
  icon?: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

// Navigation Events
export interface NavigationEventHandlers {
  onNavigate?: (item: NavigationItem) => void
  onItemClick?: (item: NavigationItem, event: MouseEvent) => void
  onItemKeyDown?: (item: NavigationItem, event: KeyboardEvent) => void
  onItemHover?: (item: NavigationItem) => void
  onItemFocus?: (item: NavigationItem) => void
  onItemBlur?: (item: NavigationItem) => void
}

// Navigation State
export interface NavigationState {
  currentRoute: string
  history: string[]
  canGoBack: boolean
  canGoForward: boolean
}

export interface NavigationContextValue extends NavigationState {
  navigate: (href: string) => void
  goBack: () => void
  goForward: () => void
  push: (href: string) => void
  replace: (href: string) => void
}

// Accessibility Props
export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-selected'?: boolean
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'
  role?: string
  tabIndex?: number
}