'use client'

import React, { useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown, 
  Settings,
  LogOut,
  Home,
  Building2,
  FileText,
  Calendar,
  Package,
  Users,
  Menu,
  X,
  BookOpen,
  Star,
  Clock,
  ArrowLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/stores'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'
import { supabase } from '@/lib/supabase-client'
import { Logo } from '@/components/ui/logo'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  description: string
  color: string
}

interface RecentItem {
  id: string
  type: 'asset' | 'organization' | 'meeting' | 'vault'
  title: string
  subtitle: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  timestamp: string
}

const quickActions: QuickAction[] = [
  {
    id: 'upload-asset',
    label: 'Upload Asset',
    icon: FileText,
    href: '/dashboard/assets',
    description: 'Upload documents and files',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  },
  {
    id: 'create-meeting',
    label: 'Create Meeting',
    icon: Calendar,
    href: '/dashboard/meetings/create',
    description: 'Schedule a new meeting',
    color: 'bg-green-50 text-green-700 hover:bg-green-100'
  },
  {
    id: 'create-organization',
    label: 'New Organization',
    icon: Building2,
    href: '/dashboard/organizations/create',
    description: 'Create new organization',
    color: 'bg-purple-50 text-purple-700 hover:bg-purple-100'
  },
  {
    id: 'create-vault',
    label: 'Create Vault',
    icon: Package,
    href: '/dashboard/vaults/create',
    description: 'Create secure vault',
    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  }
]

export default function GlobalNavigationBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  const { user } = useAuth()
  const { currentOrganization, organizations } = useOrganization()
  
  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts()

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard', icon: Home }
    ]

    if (segments.length <= 1) return breadcrumbs

    // Map path segments to breadcrumbs
    let currentPath = ''
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`
      
      switch (segment) {
        case 'organizations':
          breadcrumbs.push({ 
            label: 'Organizations', 
            href: '/dashboard/organizations',
            icon: Building2 
          })
          break
        case 'assets':
          breadcrumbs.push({ 
            label: 'Assets', 
            href: '/dashboard/assets',
            icon: FileText 
          })
          break
        case 'meetings':
          breadcrumbs.push({ 
            label: 'Meetings', 
            href: '/dashboard/meetings',
            icon: Calendar 
          })
          break
        case 'vaults':
          breadcrumbs.push({ 
            label: 'Vaults', 
            href: '/dashboard/vaults',
            icon: Package 
          })
          break
        case 'boardmates':
          breadcrumbs.push({ 
            label: 'BoardMates', 
            href: '/dashboard/boardmates',
            icon: Users 
          })
          break
        case 'create':
          breadcrumbs.push({ label: 'Create' })
          break
        case 'settings':
          breadcrumbs.push({ 
            label: 'Settings', 
            href: '/dashboard/settings',
            icon: Settings 
          })
          break
        default:
          // For dynamic segments like [id], show the segment as is
          if (segment.length > 20) {
            breadcrumbs.push({ label: `${segment.substring(0, 20)}...` })
          } else {
            breadcrumbs.push({ label: segment })
          }
      }
    }

    return breadcrumbs
  }, [pathname])

  const breadcrumbs = generateBreadcrumbs()

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      // Navigate to universal search with query
      router.push(`/dashboard/search?q=${encodeURIComponent(query)}`)
    }
  }, [router])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }, [router])

  // Mock recent items - in real app this would come from a store
  React.useEffect(() => {
    setRecentItems([
      {
        id: '1',
        type: 'asset',
        title: 'Q4 Financial Report',
        subtitle: 'TechVision Solutions',
        href: '/dashboard/assets/1',
        icon: FileText,
        timestamp: '2 hours ago'
      },
      {
        id: '2',
        type: 'meeting',
        title: 'Board Meeting - January',
        subtitle: 'GreenLeaf Financial',
        href: '/dashboard/meetings/2',
        icon: Calendar,
        timestamp: '1 day ago'
      },
      {
        id: '3',
        type: 'organization',
        title: 'TechVision Solutions',
        subtitle: 'Organization Dashboard',
        href: '/dashboard/organizations/techvision',
        icon: Building2,
        timestamp: '2 days ago'
      }
    ])
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 h-16">
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left Section - Logo and Breadcrumbs */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Logo */}
            <div className="flex items-center mr-6">
              <Logo 
                size="sm" 
                showText={false}
                variant="default"
              />
            </div>

            {/* Breadcrumbs */}
            <nav className="hidden md:flex items-center space-x-2 min-w-0">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="flex items-center space-x-1">
                    {item.icon && (
                      <item.icon className="h-4 w-4 text-gray-500" />
                    )}
                    {item.href ? (
                      <button
                        onClick={() => router.push(item.href!)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors truncate"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.label}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </nav>

            {/* Mobile breadcrumb */}
            <div className="flex md:hidden items-center">
              {breadcrumbs.length > 1 && (
                <button
                  onClick={() => router.back()}
                  className="mr-2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-medium text-gray-900 truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.label}
              </span>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search organizations, assets, meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery)
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {isSearchFocused && (
                <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Recent
                  </div>
                  {recentItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => router.push(item.href)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <item.icon className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.subtitle}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.timestamp}
                      </div>
                    </button>
                  ))}
                  {searchQuery && (
                    <>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => handleSearch(searchQuery)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <Search className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-900">
                            Search for "{searchQuery}"
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Actions and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <DropdownMenu open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2">
                  <h4 className="text-sm font-medium text-gray-900">Quick Actions</h4>
                </div>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        router.push(action.href)
                        setIsQuickActionsOpen(false)
                      }}
                      className={`p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${action.color}`}
                    >
                      <action.icon className="h-5 w-5 mb-2" />
                      <div className="text-xs font-medium">{action.label}</div>
                      <div className="text-xs opacity-75">{action.description}</div>
                    </button>
                  ))}
                </div>
                {recentItems.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <h4 className="text-sm font-medium text-gray-900">Recently Accessed</h4>
                    </div>
                    {recentItems.slice(0, 3).map((item) => (
                      <DropdownMenuItem 
                        key={item.id}
                        onClick={() => router.push(item.href)}
                        className="flex items-center space-x-3 px-3 py-2"
                      >
                        <item.icon className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.subtitle} • {item.timestamp}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
              <Bell className="h-4 w-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                3
              </Badge>
            </Button>

            {/* Organization Switcher */}
            {currentOrganization && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 max-w-[200px] justify-start">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span className="truncate">{currentOrganization.name}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2">
                    <h4 className="text-sm font-medium text-gray-900">Switch Organization</h4>
                  </div>
                  <DropdownMenuSeparator />
                  {organizations.map((org) => (
                    <DropdownMenuItem 
                      key={org.id}
                      onClick={() => router.push(`/dashboard/organizations/${org.slug || org.id}`)}
                      className={`flex items-center space-x-3 px-3 py-2 ${
                        currentOrganization.id === org.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {org.name}
                        </div>
                        {currentOrganization.id === org.id && (
                          <div className="text-xs text-blue-600">Current</div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/organizations/create')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Create New Organization
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || 'Board Member'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentOrganization?.name || 'No organization selected'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/feedback')}>
                  <Star className="h-4 w-4 mr-2" />
                  Feedback
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}