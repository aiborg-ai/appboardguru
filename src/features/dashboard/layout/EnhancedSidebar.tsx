'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  FileText, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Shield, 
  Settings, 
  LogOut,
  ChevronDown,
  ChevronRight,
  Activity,
  TrendingUp,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
  Building2,
  Folder as FolderIcon,
  Package,
  Bell,
  Clock,
  Star,
  Archive,
  Plus,
  Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/features/shared/ui/collapsible'
import { cn } from '@/lib/utils'

interface MenuItem {
  id: string
  label: string
  icon: any
  href?: string
  children?: MenuItem[]
}

const baseMenuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    href: '/dashboard'
  },
  {
    id: 'organizations',
    label: 'Organizations',
    icon: Building2,
    href: '/dashboard/organizations'
  },
  {
    id: 'vaults',
    label: 'Vaults',
    icon: Package,
    href: '/dashboard/vaults'
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Calendar,
    href: '/dashboard/meetings'
  },
  {
    id: 'instruments',
    label: 'Instruments',
    icon: FileText,
    children: [
      {
        id: 'all-instruments',
        label: 'All Instruments',
        icon: FileText,
        href: '/dashboard/instruments'
      },
      {
        id: 'board-pack-ai',
        label: 'Board Pack AI',
        icon: Brain,
        href: '/dashboard/board-pack-ai'
      },
      {
        id: 'annual-report-ai',
        label: 'Annual Report AI',
        icon: FileText,
        href: '/dashboard/annual-report-ai'
      },
      {
        id: 'board-effectiveness',
        label: 'Board Effectiveness',
        icon: Target,
        href: '/dashboard/board-effectiveness'
      },
      {
        id: 'risk-dashboard',
        label: 'Risk Dashboard',
        icon: AlertTriangle,
        href: '/dashboard/risk'
      },
      {
        id: 'esg-scorecard',
        label: 'ESG Scorecard',
        icon: CheckCircle2,
        href: '/dashboard/esg'
      },
      {
        id: 'compliance-tracker',
        label: 'Compliance Tracker',
        icon: Shield,
        href: '/dashboard/compliance'
      },
      {
        id: 'performance-analytics',
        label: 'Performance Analytics',
        icon: TrendingUp,
        href: '/dashboard/performance'
      },
      {
        id: 'meeting-intelligence',
        label: 'Meeting Intelligence',
        icon: Calendar,
        href: '/dashboard/meetings'
      },
      {
        id: 'peer-benchmarking',
        label: 'Peer Benchmarking',
        icon: BarChart3,
        href: '/dashboard/benchmarking'
      },
      {
        id: 'annotations',
        label: 'Annotations',
        icon: MessageSquare,
        href: '/dashboard/annotations'
      }
    ]
  }
]

const bottomMenuItems: MenuItem[] = [
  {
    id: 'assets',
    label: 'My Assets',
    icon: FolderIcon,
    href: '/dashboard/assets'
  },
  {
    id: 'boardmates',
    label: 'BoardMates',
    icon: Users,
    href: '/dashboard/boardmates'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings'
  }
]

const getVaultStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'text-green-600'
    case 'draft': return 'text-gray-600'
    case 'archived': return 'text-gray-400'
    case 'expired': return 'text-red-600'
    case 'cancelled': return 'text-red-400'
    default: return 'text-gray-600'
  }
}

const getVaultStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return Star
    case 'draft': return Clock
    case 'archived': return Archive
    case 'expired': return AlertTriangle
    case 'cancelled': return AlertTriangle
    default: return Package
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-700'
    case 'high': return 'bg-orange-100 text-orange-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'low': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function EnhancedSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['instruments', 'organizations'])
  const [expandedVaultsByOrg, setExpandedVaultsByOrg] = useState<Record<string, boolean>>({})

  const {
    currentOrganization,
    currentVault,
    organizations,
    vaults,
    pendingInvitations,
    isLoadingVaults,
    selectOrganization,
    selectVault,
    totalPendingInvitations
  } = useOrganization()

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const toggleVaultsForOrg = (orgId: string) => {
    setExpandedVaultsByOrg(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/signin'
  }

  const handleVaultSelect = (vault: any) => {
    selectVault(vault)
    // Navigate to vault page
    window.location.href = `/dashboard/vaults/${vault.id}`
  }

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.id)
    const isActive = pathname === item.href
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id}>
        {hasChildren ? (
          <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  level > 0 ? 'ml-4' : ''
                } ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link
            href={item.href || '#'}
            className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
              level > 0 ? 'ml-4' : ''
            } ${
              isActive
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        )}
      </div>
    )
  }

  const renderOrganizationsSection = () => {
    const isExpanded = expandedItems.includes('organizations')
    
    return (
      <div className="space-y-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded('organizations')}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-700 hover:bg-gray-100">
              <Building2 className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1 text-left font-medium">Organizations</span>
              {totalPendingInvitations > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 mr-2">
                  {totalPendingInvitations}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 mt-1">
            {/* Current Organization's Vaults */}
            {currentOrganization && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Vaults
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {vaults.length > 0 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {vaults.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.location.href = '/dashboard/vaults/create'}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {isLoadingVaults ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ) : vaults.length > 0 ? (
                  <div className="space-y-1">
                    {vaults.map(vault => {
                      const StatusIcon = getVaultStatusIcon(vault.status)
                      const isSelected = currentVault?.id === vault.id
                      
                      return (
                        <button
                          key={vault.id}
                          onClick={() => handleVaultSelect(vault)}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 text-left",
                            isSelected 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <StatusIcon className={cn(
                            "h-4 w-4 mr-2 flex-shrink-0",
                            getVaultStatusColor(vault.status)
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{vault.name}</span>
                              {vault.priority !== 'medium' && (
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs px-1 py-0", getPriorityColor(vault.priority))}
                                >
                                  {vault.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {vault.memberCount} members
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-500">
                                {vault.assetCount} assets
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center">
                    <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No vaults yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/dashboard/vaults/create'}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Vault
                    </Button>
                  </div>
                )}

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                  <div className="mt-4">
                    <div className="px-3 py-2">
                      <div className="flex items-center">
                        <Bell className="h-4 w-4 mr-2 text-orange-500" />
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Pending Invitations
                        </span>
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5 ml-2">
                          {pendingInvitations.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {pendingInvitations.slice(0, 3).map(invitation => (
                        <div
                          key={invitation.id}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-lg cursor-pointer"
                          onClick={() => window.location.href = `/dashboard/invitations/${invitation.id}`}
                        >
                          <div className="font-medium truncate">{invitation.vault.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            from {invitation.vault.organization.name}
                          </div>
                        </div>
                      ))}
                      
                      {pendingInvitations.length > 3 && (
                        <Link
                          href="/dashboard/invitations"
                          className="block px-3 py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all {pendingInvitations.length} invitations →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center px-4 py-6 border-b border-gray-200">
        <div className="flex items-center">
          <img 
            src="/boardguru-logo.svg" 
            alt="BoardGuru" 
            className="h-10 w-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Base menu items */}
        {baseMenuItems.map(item => renderMenuItem(item))}
        
        {/* Separator */}
        <div className="border-t border-gray-200 my-4" />
        
        {/* Organizations Section */}
        {renderOrganizationsSection()}
        
        {/* Separator */}
        <div className="border-t border-gray-200 my-4" />
        
        {/* Bottom menu items */}
        {bottomMenuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}