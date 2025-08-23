import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "../../atoms/Button"
import { Badge, type BadgeProps } from "../../atoms/Badge"
import { Icon, type IconName } from "../../atoms/Icon"

export interface NavItemProps {
  label: string
  icon?: IconName
  href?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  badge?: {
    content: string | number
    variant?: BadgeProps['variant']
  }
  children?: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const NavItem = React.memo<NavItemProps>(({
  label,
  icon,
  href,
  onClick,
  active = false,
  disabled = false,
  badge,
  children,
  collapsible = false,
  collapsed = false,
  onToggle,
  className,
  size = 'default',
}) => {
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }

    if (collapsible) {
      e.preventDefault()
      onToggle?.()
    } else {
      onClick?.()
    }
  }, [disabled, collapsible, onToggle, onClick])

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    default: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg',
  }

  const baseClasses = cn(
    "w-full justify-start font-normal transition-colors",
    sizeClasses[size],
    active && "bg-accent text-accent-foreground font-medium",
    disabled && "opacity-50 cursor-not-allowed",
    className
  )

  const content = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <Icon 
            name={icon} 
            size={size === 'sm' ? 'sm' : 'default'} 
            className="flex-shrink-0" 
          />
        )}
        <span className="truncate">{label}</span>
        {badge && (
          <Badge 
            variant={badge.variant} 
            size="sm"
            className="ml-auto flex-shrink-0"
          >
            {badge.content}
          </Badge>
        )}
      </div>
      {collapsible && (
        <Icon
          name={collapsed ? "ChevronRight" : "ChevronDown"}
          size="sm"
          className="flex-shrink-0 ml-2"
        />
      )}
    </>
  )

  const Component = href && !disabled && !collapsible ? 'a' : 'button'

  return (
    <div className="w-full">
      <Button
        asChild={Component === 'a'}
        variant="ghost"
        className={baseClasses}
        onClick={handleClick}
        disabled={disabled}
        aria-expanded={collapsible ? !collapsed : undefined}
        aria-current={active ? 'page' : undefined}
      >
        {Component === 'a' ? (
          <a href={href} className="flex items-center w-full">
            {content}
          </a>
        ) : (
          content
        )}
      </Button>

      {/* Collapsible children */}
      {collapsible && children && !collapsed && (
        <div
          className="ml-6 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200"
          role="region"
          aria-labelledby={`nav-${label}`}
        >
          {children}
        </div>
      )}
    </div>
  )
})

NavItem.displayName = "NavItem"

export { NavItem }