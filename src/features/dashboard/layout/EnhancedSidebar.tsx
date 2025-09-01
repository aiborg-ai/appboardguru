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
  MessageCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
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
    id: 'assets',
    label: 'My Assets',
    icon: FolderIcon,
    href: '/dashboard/assets'
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Calendar,
    href: '/dashboard/meetings'
  },
  {
    id: 'boardmates',
    label: 'BoardMates',
    icon: Users,
    href: '/dashboard/boardmates'
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
        id: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        href: '/dashboard/calendar'
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
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings'
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: MessageCircle,
    href: '/dashboard/feedback'
  }
]


export default function EnhancedSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['instruments'])


  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }


  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/signin'
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


  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Navigation - removed duplicate logo since it's in GlobalNavigationBar */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Base menu items */}
        {baseMenuItems.map(item => renderMenuItem(item))}
        
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