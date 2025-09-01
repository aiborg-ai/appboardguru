/**
 * ActionButton Component
 * DESIGN_SPEC compliant button with enhanced features for actions
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'
import { LucideIcon, Loader2, ChevronDown, ExternalLink } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  // Content
  label: string
  icon?: LucideIcon | React.ReactNode
  iconPosition?: 'left' | 'right'
  
  // States
  loading?: boolean
  loadingText?: string
  success?: boolean
  successText?: string
  error?: boolean
  errorText?: string
  
  // Badge
  badge?: string | number
  badgeVariant?: 'default' | 'success' | 'warning' | 'error'
  
  // Tooltip
  tooltip?: string
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  
  // External link
  external?: boolean
  href?: string
  target?: string
  
  // Keyboard shortcut
  shortcut?: string
  
  // Dropdown menu (for split buttons)
  dropdownItems?: Array<{
    label: string
    icon?: LucideIcon
    onClick: () => void
    disabled?: boolean
    destructive?: boolean
    separator?: boolean
  }>
  
  // Custom content
  children?: React.ReactNode
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ 
    className,
    label,
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    loadingText,
    success = false,
    successText,
    error = false,
    errorText,
    badge,
    badgeVariant = 'default',
    tooltip,
    tooltipSide = 'top',
    external = false,
    href,
    target,
    shortcut,
    dropdownItems,
    disabled,
    onClick,
    variant = 'default',
    size = 'default',
    children,
    ...props 
  }, ref) => {
    // Determine current state and text
    const isDisabled = disabled || loading
    const displayText = loading && loadingText ? loadingText :
                       success && successText ? successText :
                       error && errorText ? errorText :
                       label

    // Badge colors
    const badgeColors = {
      default: "bg-gray-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      error: "bg-error-500",
    }

    // Icon component
    const iconElement = loading ? (
      <Loader2 className={cn(
        "animate-spin",
        size === 'sm' ? "h-3 w-3" :
        size === 'lg' ? "h-5 w-5" :
        "h-4 w-4"
      )} />
    ) : React.isValidElement(Icon) ? (
      Icon
    ) : Icon ? (
      <Icon className={cn(
        size === 'sm' ? "h-3 w-3" :
        size === 'lg' ? "h-5 w-5" :
        "h-4 w-4"
      )} />
    ) : external && !Icon ? (
      <ExternalLink className={cn(
        size === 'sm' ? "h-3 w-3" :
        size === 'lg' ? "h-5 w-5" :
        "h-4 w-4"
      )} />
    ) : null

    // Button content
    const buttonContent = (
      <>
        {iconPosition === 'left' && iconElement && (
          <span className={displayText ? "mr-2" : ""}>{iconElement}</span>
        )}
        
        {children || (
          <>
            <span>{displayText}</span>
            
            {badge !== undefined && (
              <span className={cn(
                "ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full text-white",
                badgeColors[badgeVariant]
              )}>
                {badge}
              </span>
            )}
            
            {shortcut && (
              <kbd className="ml-2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded border border-gray-200">
                {shortcut}
              </kbd>
            )}
          </>
        )}
        
        {iconPosition === 'right' && iconElement && (
          <span className={displayText ? "ml-2" : ""}>{iconElement}</span>
        )}
        
        {dropdownItems && dropdownItems.length > 0 && (
          <>
            <span className="mx-2 h-4 w-px bg-current opacity-20" />
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </>
    )

    // Handle dropdown menu
    if (dropdownItems && dropdownItems.length > 0) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={ref}
              variant={variant}
              size={size}
              disabled={isDisabled}
              className={cn("gap-1", className)}
              onClick={onClick}
              {...props}
            >
              {buttonContent}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dropdownItems.map((item, index) => (
              item.separator ? (
                <DropdownMenuSeparator key={index} />
              ) : (
                <DropdownMenuItem
                  key={index}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={item.destructive ? "text-error-600" : ""}
                >
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.label}
                </DropdownMenuItem>
              )
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    // Handle external link
    if (href && !loading) {
      const linkButton = (
        <Button
          ref={ref}
          variant={variant}
          size={size}
          disabled={isDisabled}
          className={cn("gap-2", className)}
          asChild
          {...props}
        >
          <a href={href} target={target || (external ? "_blank" : undefined)}>
            {buttonContent}
          </a>
        </Button>
      )

      if (tooltip) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {linkButton}
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      return linkButton
    }

    // Regular button
    const regularButton = (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={isDisabled}
        className={cn("gap-2", className)}
        onClick={onClick}
        {...props}
      >
        {buttonContent}
      </Button>
    )

    // Add tooltip if provided
    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {regularButton}
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return regularButton
  }
)

ActionButton.displayName = "ActionButton"

// Button Group component
export interface ActionButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  }

  return (
    <div className={cn(
      "flex",
      orientation === 'vertical' ? "flex-col" : "flex-row items-center",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  )
}

// Floating Action Button
export interface FloatingActionButtonProps extends ActionButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  offset?: 'sm' | 'md' | 'lg'
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  position = 'bottom-right',
  offset = 'md',
  className,
  ...props
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
  }

  const offsetClasses = {
    sm: 'm-4',
    md: 'm-6',
    lg: 'm-8',
  }

  return (
    <div className={cn(
      "fixed z-50",
      positionClasses[position],
      offsetClasses[offset]
    )}>
      <ActionButton
        className={cn(
          "shadow-lg hover:shadow-xl transition-shadow",
          className
        )}
        {...props}
      />
    </div>
  )
}

// Icon Button (for icon-only actions)
export interface IconButtonProps extends Omit<ActionButtonProps, 'label'> {
  label: string // Still required for accessibility but won't be shown
  srOnly?: boolean
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    label,
    srOnly = true,
    size = 'default',
    className,
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      default: 'h-10 w-10',
      lg: 'h-12 w-12',
    }

    return (
      <ActionButton
        ref={ref}
        label=""
        size={size}
        className={cn(
          "p-0",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {props.icon && (
          <>
            {React.isValidElement(props.icon) ? (
              props.icon
            ) : (
              <props.icon className={cn(
                size === 'sm' ? "h-4 w-4" :
                size === 'lg' ? "h-6 w-6" :
                "h-5 w-5"
              )} />
            )}
            {srOnly && (
              <span className="sr-only">{label}</span>
            )}
          </>
        )}
      </ActionButton>
    )
  }
)

IconButton.displayName = "IconButton"

export { ActionButton }