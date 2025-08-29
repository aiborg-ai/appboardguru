'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, LogOut } from 'lucide-react'

export default function DemoModeBadge() {
  const router = useRouter()
  
  // Check if we're in demo mode
  const [isDemoMode, setIsDemoMode] = React.useState(false)
  
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const demoActive = urlParams.get('demo') === 'true' || 
                      localStorage.getItem('boardguru_demo_mode') === 'true' ||
                      window.location.pathname.startsWith('/demo')
    setIsDemoMode(demoActive)
  }, [])
  
  const exitDemoMode = () => {
    // Clear demo mode from localStorage
    localStorage.removeItem('boardguru_demo_mode')
    localStorage.removeItem('boardguru_demo_features_explored')
    
    // Redirect to home page
    router.push('/')
  }
  
  if (!isDemoMode) return null
  
  return (
    <div className="fixed top-20 right-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="font-semibold text-sm">Demo Mode</span>
        </div>
        
        <div className="h-4 w-px bg-white/30" />
        
        <span className="text-xs opacity-90">
          Exploring with sample data
        </span>
        
        <button
          onClick={exitDemoMode}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors duration-200"
          title="Exit Demo Mode"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Additional demo info tooltip */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-white text-gray-700 rounded-lg shadow-xl p-4 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none hover:pointer-events-auto">
        <div className="space-y-2">
          <p className="text-sm font-medium">You're in Demo Mode</p>
          <p className="text-xs text-gray-600">
            You're exploring BoardGuru with sample data. All features are fully functional but no data will be saved.
          </p>
          <button
            onClick={exitDemoMode}
            className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200"
          >
            <LogOut className="h-3 w-3" />
            <span>Exit Demo & Sign In</span>
          </button>
        </div>
      </div>
    </div>
  )
}