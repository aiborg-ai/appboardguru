import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "../../atoms/Button"
import { Icon } from "../../atoms/Icon"
import { Avatar } from "../../atoms/Avatar"
import { Badge } from "../../atoms/Badge"
import { NavItem } from "../../molecules/NavItem"

export interface NavItemConfig {
  id: string
  label: string
  icon?: string
  href?: string
  badge?: {
    content: string | number
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }
  children?: NavItemConfig[]
  active?: boolean
}

export interface UserInfo {
  name: string
  email: string
  avatar?: string
  role?: string
}

export interface DashboardLayoutProps {
  navigation: NavItemConfig[]
  user?: UserInfo
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
  className?: string
  headerActions?: React.ReactNode
  notifications?: {
    count: number
    onClick: () => void
  }
}

const DashboardLayout = React.memo<DashboardLayoutProps>(({
  navigation,
  user,
  title,
  subtitle,
  actions,
  children,
  sidebarCollapsed = false,
  onSidebarToggle,
  className,
  headerActions,
  notifications,
}) => {
  const [collapsedItems, setCollapsedItems] = React.useState<Set<string>>(new Set())

  const toggleNavItem = React.useCallback((itemId: string) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const renderNavItems = React.useCallback((items: NavItemConfig[]) => {
    return items.map((item) => (
      <NavItem
        key={item.id}
        label={item.label}
        icon={item.icon as any}
        href={item.href}
        active={item.active}
        badge={item.badge}
        collapsible={!!item.children?.length}
        collapsed={collapsedItems.has(item.id)}
        onToggle={() => toggleNavItem(item.id)}
        size={sidebarCollapsed ? 'sm' : 'default'}
      >
        {item.children && renderNavItems(item.children)}
      </NavItem>
    ))
  }, [collapsedItems, toggleNavItem, sidebarCollapsed])

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          {!sidebarCollapsed && (
            <>
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">B</span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm">BoardGuru</h2>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="ml-auto"
          >
            <Icon 
              name={sidebarCollapsed ? "PanelLeftOpen" : "PanelLeftClose"} 
              size="sm" 
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {renderNavItems(navigation)}
          </div>
        </nav>

        {/* User Info */}
        {user && (
          <div className="border-t p-4">
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Avatar src={user.avatar} alt={user.name} size="sm" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar} alt={user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.role || user.email}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Icon name="MoreVertical" size="sm" />
                </Button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex-1">
              {title && (
                <div>
                  <h1 className="text-xl font-semibold">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {notifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={notifications.onClick}
                  className="relative"
                >
                  <Icon name="Bell" size="sm" />
                  {notifications.count > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {notifications.count > 9 ? '9+' : notifications.count}
                    </Badge>
                  )}
                </Button>
              )}

              {headerActions}

              {actions}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
})

DashboardLayout.displayName = "DashboardLayout"

export { DashboardLayout }