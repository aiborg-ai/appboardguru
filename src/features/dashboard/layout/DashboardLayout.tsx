'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EnhancedSidebar from './EnhancedSidebar'
import RightPanel from '@/features/shared/components/RightPanel'
import QuickAccessFAB from '@/features/shared/components/QuickAccessFAB'
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
  const [activeTab, setActiveTab] = useState<'ai-chat' | 'logs'>('ai-chat')

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

  const handleOpenPanel = (tab: 'ai-chat' | 'logs') => {
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
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <EnhancedSidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

      {/* Quick Access FAB */}
      <QuickAccessFAB onOpenPanel={handleOpenPanel} />
    </div>
  )
}