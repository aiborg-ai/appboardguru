'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EnhancedSidebar from './EnhancedSidebar'
import RightPanel from '@/features/shared/components/RightPanel'
import QuickAccessFAB from '@/features/shared/components/QuickAccessFAB'
import GlobalNavigationBar from '@/components/navigation/GlobalNavigationBar'
import RoutePreloader, { useRoutePreloadConfig } from '@/components/performance/RoutePreloader'
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Right panel state - ensure panel is closed by default
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai-chat' | 'logs' | 'fyi'>('ai-chat')
  
  // Get route preload configuration
  const preloadConfig = useRoutePreloadConfig()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Prevent redirect if already on signin page to avoid loops
        if (!window.location.pathname.includes('/auth/signin')) {
          router.push('/auth/signin')
        }
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      // Prevent redirect if already on signin page to avoid loops
      if (!window.location.pathname.includes('/auth/signin')) {
        router.push('/auth/signin')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenPanel = (tab: 'ai-chat' | 'logs' | 'fyi') => {
    setActiveTab(tab)
    setIsPanelOpen(true)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...KEYBOARD_SHORTCUTS.OPEN_AI_CHAT,
      callback: () => handleOpenPanel('ai-chat')
    },
    {
      ...KEYBOARD_SHORTCUTS.OPEN_FYI,
      callback: () => handleOpenPanel('fyi')
    },
    {
      ...KEYBOARD_SHORTCUTS.OPEN_LOGS,
      callback: () => handleOpenPanel('logs')
    },
    {
      ...KEYBOARD_SHORTCUTS.CLOSE_PANEL,
      callback: () => setIsPanelOpen(false)
    },
    {
      ...KEYBOARD_SHORTCUTS.TOGGLE_PANEL,
      callback: () => setIsPanelOpen(!isPanelOpen)
    }
  ])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      {/* Route Preloader */}
      <RoutePreloader config={preloadConfig} />
      
      <div className="flex h-screen bg-gray-50 relative">
        {/* Global Navigation - spans full width at top */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <GlobalNavigationBar />
        </div>
        
        {/* Main layout container with top padding for fixed navigation */}
        <div className="flex w-full pt-16">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 h-screen">
            <EnhancedSidebar />
          </div>
          
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden h-screen">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>

          {/* Right Panel */}
          <RightPanel 
            externalControl={{
              isOpen: isPanelOpen,
              activeTab: activeTab,
              onOpenChange: setIsPanelOpen,
              onTabChange: setActiveTab
            }}
          />
        </div>

        {/* Quick Access FAB */}
        <QuickAccessFAB onOpenPanel={handleOpenPanel} />
      </div>
    </>
  )
}