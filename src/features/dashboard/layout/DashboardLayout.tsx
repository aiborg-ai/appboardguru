'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useDemoSafe } from '@/contexts/DemoContext'
import { useAuth } from '@/contexts/AuthContext'
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
  const [localUser, setLocalUser] = useState<any>(null)
  
  // Get auth context - but handle case where it might not be available
  let authUser = null
  let authLoading = false
  try {
    const auth = useAuth()
    authUser = auth.user
    authLoading = auth.loading
  } catch (e) {
    // Auth context not available, will fall back to direct check
  }
  
  // Safely get demo context using the safe hook
  const { isDemoMode, demoUser } = useDemoSafe()
  
  // Right panel state - ensure panel is closed by default
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai-chat' | 'logs' | 'fyi'>('ai-chat')
  
  // Get route preload configuration
  const preloadConfig = useRoutePreloadConfig()

  useEffect(() => {
    // If we have auth context and a user, use that
    if (authUser) {
      setLocalUser(authUser)
      setIsLoading(false)
      return
    }
    
    // If auth is still loading, wait
    if (authLoading) {
      return
    }
    
    // Otherwise do manual check
    checkUser()
  }, [isDemoMode, authUser, authLoading])

  const checkUser = async () => {
    try {
      // Check URL params directly as a fallback
      const urlParams = new URLSearchParams(window.location.search)
      const isDemoParam = urlParams.get('demo') === 'true'
      const isInDemoMode = isDemoMode || isDemoParam
      
      console.log('[DashboardLayout] Demo mode check:', {
        isDemoMode,
        isDemoParam,
        isInDemoMode,
        demoUser,
        pathname: window.location.pathname
      })
      
      if (isInDemoMode) {
        console.log('[DashboardLayout] Demo mode activated, creating demo user')
        // Create a demo user even if demoUser from context is not available yet
        const mockUser = {
          id: demoUser?.id || 'demo-user-001',
          email: demoUser?.email || 'demo@boardguru.ai',
          user_metadata: {
            name: demoUser?.name || 'Alex Thompson',
            role: demoUser?.role || 'Board Director',
            organization: demoUser?.organization || 'TechCorp Solutions',
            avatar: demoUser?.avatar || '/demo-avatar.png'
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
        
        setLocalUser(mockUser)
        setIsLoading(false)
        return
      }
      
      // Normal authentication check for non-demo users
      console.log('[DashboardLayout] Not in demo mode, checking authentication')
      const supabase = createSupabaseBrowserClient()
      
      // First try to get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[DashboardLayout] Session error:', sessionError)
      }
      
      if (session?.user) {
        console.log('[DashboardLayout] Session found:', {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        })
        setLocalUser(session.user)
        setIsLoading(false)
        return
      }
      
      // If no session, try getUser as fallback
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('[DashboardLayout] User error:', userError)
      }
      
      if (user) {
        console.log('[DashboardLayout] User found via getUser:', {
          userId: user.id,
          email: user.email
        })
        setLocalUser(user)
        setIsLoading(false)
        return
      }
      
      // No user found, wait a bit and retry once (in case of race condition)
      console.log('[DashboardLayout] No user found, retrying in 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: { session: retrySession } } = await supabase.auth.getSession()
      if (retrySession?.user) {
        console.log('[DashboardLayout] User found on retry')
        setLocalUser(retrySession.user)
        setIsLoading(false)
        return
      }
      
      console.log('[DashboardLayout] No authenticated user after retry, redirecting to signin')
      // Prevent redirect if already on signin page to avoid loops
      if (!window.location.pathname.includes('/auth/signin')) {
        router.push('/auth/signin')
      }
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

  // Use combined loading state
  const user = authUser || localUser
  const loading = isLoading || authLoading
  
  if (loading) {
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