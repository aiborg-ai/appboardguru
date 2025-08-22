import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, type AvatarProps } from "../../atoms/Avatar"
import { Badge, type BadgeProps } from "../../atoms/Badge"
import { Icon, type IconName } from "../../atoms/Icon"

export interface UserCardProps {
  name: string
  email?: string
  avatar?: string
  role?: string
  status?: 'online' | 'offline' | 'away' | 'busy'
  badge?: {
    text: string
    variant?: BadgeProps['variant']
  }
  subtitle?: string
  actions?: React.ReactNode
  onClick?: () => void
  className?: string
  size?: AvatarProps['size']
  showStatus?: boolean
  rightIcon?: IconName
}

const UserCard = React.memo<UserCardProps>(({
  name,
  email,
  avatar,
  role,
  status = 'offline',
  badge,
  subtitle,
  actions,
  onClick,
  className,
  size = 'default',
  showStatus = true,
  rightIcon,
}) => {
  const statusConfig = React.useMemo(() => {
    const configs = {
      online: { color: 'bg-green-500', label: 'Online' },
      away: { color: 'bg-yellow-500', label: 'Away' },
      busy: { color: 'bg-red-500', label: 'Busy' },
      offline: { color: 'bg-gray-400', label: 'Offline' },
    }
    return configs[status]
  }, [status])

  const isClickable = Boolean(onClick)

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isClickable && "cursor-pointer hover:bg-accent/50",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      } : undefined}
    >
      {/* Avatar with status indicator */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={avatar}
          alt={name}
          size={size}
          fallback={name}
        />
        {showStatus && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              statusConfig.color
            )}
            title={statusConfig.label}
            aria-label={`Status: ${statusConfig.label}`}
          />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-foreground truncate">
            {name}
          </h4>
          {badge && (
            <Badge variant={badge.variant} size="sm">
              {badge.text}
            </Badge>
          )}
        </div>

        <div className="space-y-0.5">
          {email && (
            <p className="text-xs text-muted-foreground truncate">
              {email}
            </p>
          )}
          {role && (
            <p className="text-xs text-muted-foreground truncate">
              {role}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side content */}
      {(rightIcon || actions) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightIcon && (
            <Icon name={rightIcon} size="sm" className="text-muted-foreground" />
          )}
          {actions}
        </div>
      )}
    </div>
  )
})

UserCard.displayName = "UserCard"

export { UserCard }