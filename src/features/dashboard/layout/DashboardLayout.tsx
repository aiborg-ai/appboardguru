'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import EnhancedSidebar from './EnhancedSidebar'
import RightPanel from '@/features/shared/components/RightPanel'
import QuickAccessFAB from '@/features/shared/components/QuickAccessFAB'
import GlobalNavigationBar from '@/components/navigation/GlobalNavigationBar'
import RoutePreloader, { useRoutePreloadConfig } from '@/components/performance/RoutePreloader'
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import DemoModeBadge from '@/components/demo/DemoModeBadge'
import DemoTourOverlay from '@/components/demo/DemoTourOverlay'

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
      // Check if we're in demo mode first
      const urlParams = new URLSearchParams(window.location.search)
      const isDemoMode = urlParams.get('demo') === 'true' || 
                        localStorage.getItem('boardguru_demo_mode') === 'true' ||
                        window.location.pathname.startsWith('/demo')
      
      if (isDemoMode) {
        // Create a mock demo user for demo mode
        const demoUser = {
          id: 'demo-user-001',
          email: 'demo@boardguru.ai',
          user_metadata: {
            name: 'Alex Thompson',
            role: 'Board Director',
            organization: 'TechCorp Solutions',
            avatar: '/demo-avatar.png'
          },
          app_metadata: {
            provider: 'demo',
            providers: ['demo']
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          role: 'authenticated'
        }
        
        setUser(demoUser)
        setIsLoading(false)
        
        // Start tour if specified in URL
        if (urlParams.get('tour') === 'true') {
          // Tour will be handled by demo tour component
          console.log('Demo mode activated with tour')
        }
        
        return
      }
      
      // Normal authentication check for non-demo users
      const supabase = createSupabaseBrowserClient()
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
      
      {/* Demo Mode Badge */}
      <DemoModeBadge />
      
      {/* Demo Tour Overlay */}
      <DemoTourOverlay />
      
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Global Navigation - fixed at top */}
        <div className="fixed top-0 left-0 right-0 z-50 h-16">
          <GlobalNavigationBar />
        </div>
        
        {/* Main layout container - accounts for fixed nav height */}
        <div className="flex flex-1 pt-16">
          {/* Sidebar - height calculated to exclude navbar */}
          <div className="w-64 flex-shrink-0 h-[calc(100vh-4rem)]">
            <EnhancedSidebar />
          </div>
          
          {/* Main content - height calculated to exclude navbar */}
          <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-gray-50">
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