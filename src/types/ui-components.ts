/**
 * UI Components Type Definitions
 * Type definitions for shared UI components
 */

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, HTMLAttributes } from 'react'
import { VariantProps } from 'class-variance-authority'

// Button Component Types
export interface ButtonVariantProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>, 
          ButtonVariantProps {
  asChild?: boolean
  loading?: boolean
}

// Input Component Types
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
}

// Select Component Types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  name?: string
  required?: boolean
  placeholder?: string
  children: ReactNode
}

export interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  className?: string
  disabled?: boolean
  children: ReactNode
}

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

export interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  className?: string
  children: ReactNode
}

// Textarea Component Types
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  helperText?: string
}

// Label Component Types
export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string
  required?: boolean
  className?: string
  children: ReactNode
}

// Checkbox Component Types
export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
  'aria-label'?: string
}

// Radio Component Types
export interface RadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  name?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export interface RadioGroupItemProps {
  value: string
  disabled?: boolean
  id?: string
  className?: string
}

// Switch Component Types
export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  'aria-label'?: string
}

// Slider Component Types
export interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

// Card Component Types
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
  children: ReactNode
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children: ReactNode
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Badge Component Types
export interface BadgeVariantProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export interface BadgeProps 
  extends HTMLAttributes<HTMLDivElement>, 
          BadgeVariantProps {
  className?: string
  children: ReactNode
}

// Avatar Component Types
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string
  children: ReactNode
}

export interface AvatarImageProps extends HTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  className?: string
}

export interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string
  children: ReactNode
}

// Dialog/Modal Component Types
export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  children: ReactNode
}

export interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  className?: string
  children: ReactNode
}

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
  children: ReactNode
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children: ReactNode
}

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Dropdown Menu Component Types
export interface DropdownMenuProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  dir?: 'ltr' | 'rtl'
  children: ReactNode
}

export interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  className?: string
  children: ReactNode
}

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

export interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Popover Component Types
export interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  children: ReactNode
}

export interface PopoverTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  className?: string
  children: ReactNode
}

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

// Tooltip Component Types
export interface TooltipProps {
  children: ReactNode
  delayDuration?: number
  skipDelayDuration?: number
  disableHoverableContent?: boolean
}

export interface TooltipTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  className?: string
  children: ReactNode
}

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

// Toast Component Types
export interface ToastProps {
  id: string
  title?: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'destructive'
  duration?: number
}

export interface ToastActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  altText: string
  className?: string
  children: ReactNode
}

// Progress Component Types
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  className?: string
}

// Separator Component Types
export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  className?: string
}

// Skeleton Component Types
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

// Alert Component Types
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
  className?: string
  children: ReactNode
}

export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
  children: ReactNode
}

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children: ReactNode
}

// Sheet/Drawer Component Types
export interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  children: ReactNode
}

export interface SheetTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  className?: string
  children: ReactNode
}

export interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}

export interface SheetHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface SheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string
  children: ReactNode
}

export interface SheetDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children: ReactNode
}

export interface SheetFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Accordion Component Types
export interface AccordionProps {
  type: 'single' | 'multiple'
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
  orientation?: 'horizontal' | 'vertical'
  className?: string
  children: ReactNode
}

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: ReactNode
}

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Tabs Component Types
export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  activationMode?: 'automatic' | 'manual'
  className?: string
  children: ReactNode
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  className?: string
  children: ReactNode
}

// Table Component Types
export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  className?: string
  children: ReactNode
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string
  children: ReactNode
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string
  children: ReactNode
}

export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string
  children: ReactNode
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string
  children: ReactNode
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  className?: string
  children: ReactNode
}

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  className?: string
  children: ReactNode
}

export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  className?: string
  children: ReactNode
}

// Navigation Menu Component Types
export interface NavigationMenuProps extends HTMLAttributes<HTMLElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  dir?: 'ltr' | 'rtl'
  orientation?: 'horizontal' | 'vertical'
  className?: string
  children: ReactNode
}

export interface NavigationMenuListProps extends HTMLAttributes<HTMLUListElement> {
  className?: string
  children: ReactNode
}

export interface NavigationMenuItemProps extends HTMLAttributes<HTMLLIElement> {
  value?: string
  className?: string
  children: ReactNode
}

export interface NavigationMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: ReactNode
}

export interface NavigationMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface NavigationMenuLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  href?: string
  active?: boolean
  className?: string
  children: ReactNode
}

// Command Component Types
export interface CommandProps extends HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (search: string) => void
  filter?: (value: string, search: string) => number
  shouldFilter?: boolean
  loop?: boolean
  className?: string
  children: ReactNode
}

export interface CommandInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export interface CommandListProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface CommandEmptyProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface CommandGroupProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode
  className?: string
  children: ReactNode
}

export interface CommandItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value?: string
  disabled?: boolean
  onSelect?: (value: string) => void
  className?: string
  children: ReactNode
}

export interface CommandSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

// Calendar Component Types
export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range'
  selected?: Date | Date[] | { from: Date; to?: Date }
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void
  disabled?: boolean | ((date: Date) => boolean)
  defaultMonth?: Date
  fromYear?: number
  toYear?: number
  captionLayout?: 'buttons' | 'dropdown' | 'dropdown-buttons'
  numberOfMonths?: number
  pagedNavigation?: boolean
  showOutsideDays?: boolean
  showWeekNumber?: boolean
  fixedWeeks?: boolean
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

// Context Menu Component Types
export interface ContextMenuProps {
  children: ReactNode
  modal?: boolean
}

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface ContextMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface ContextMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface ContextMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface ContextMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

// Menubar Component Types
export interface MenubarProps extends HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  dir?: 'ltr' | 'rtl'
  loop?: boolean
  className?: string
  children: ReactNode
}

export interface MenubarMenuProps {
  value?: string
  children: ReactNode
}

export interface MenubarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: ReactNode
}

export interface MenubarContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

export interface MenubarItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface MenubarSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface MenubarLabelProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}