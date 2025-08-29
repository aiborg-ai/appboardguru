'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DemoTourStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for element to highlight
  action?: () => void
}

interface DemoContextType {
  isDemoMode: boolean
  setDemoMode: (enabled: boolean) => void
  demoUser: DemoUser | null
  tourActive: boolean
  startTour: () => void
  endTour: () => void
  currentTourStep: number
  nextTourStep: () => void
  previousTourStep: () => void
  tourSteps: DemoTourStep[]
  featuresExplored: string[]
  markFeatureExplored: (featureId: string) => void
  demoProgress: number
}

interface DemoUser {
  id: string
  email: string
  name: string
  role: string
  organization: string
  avatar?: string
}

const defaultDemoUser: DemoUser = {
  id: 'demo-user-001',
  email: 'demo@boardguru.ai',
  name: 'Alex Thompson',
  role: 'Board Director',
  organization: 'TechCorp Solutions',
  avatar: '/demo-avatar.png'
}

const defaultTourSteps: DemoTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BoardGuru',
    description: 'Experience the most advanced board management platform. This interactive demo showcases our key features with sample data.',
  },
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    description: 'Get a comprehensive overview of all board activities, upcoming meetings, and key metrics at a glance.',
    target: '[data-tour="dashboard"]'
  },
  {
    id: 'board-pack-ai',
    title: 'AI-Powered Board Pack Analysis',
    description: 'Upload documents and get instant AI-generated summaries, risk assessments, and actionable insights.',
    target: '[data-tour="board-pack-ai"]'
  },
  {
    id: 'voice-search',
    title: 'Voice Commands & Search',
    description: 'Use natural language to search documents, create tasks, or navigate the platform.',
    target: '[data-tour="voice-search"]'
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    description: 'See how board members can collaborate in real-time with presence indicators and live editing.',
    target: '[data-tour="collaboration"]'
  },
  {
    id: 'analytics',
    title: 'Advanced Analytics',
    description: 'Explore comprehensive analytics including risk heat maps, compliance tracking, and ESG metrics.',
    target: '[data-tour="analytics"]'
  },
  {
    id: 'complete',
    title: 'Ready to Get Started?',
    description: 'You\'ve explored the key features of BoardGuru. Sign up now to start managing your board with AI-powered efficiency.',
  }
]

export const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [tourActive, setTourActive] = useState(false)
  const [currentTourStep, setCurrentTourStep] = useState(0)
  const [featuresExplored, setFeaturesExplored] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  // Check if we're in demo mode based on URL or localStorage
  useEffect(() => {
    setMounted(true)
    
    // Only access window/localStorage after mount to prevent hydration issues
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const demoParam = urlParams.get('demo')
      const storedDemoMode = localStorage.getItem('boardguru_demo_mode')
      
      if (demoParam === 'true' || storedDemoMode === 'true') {
        setIsDemoMode(true)
      }

      // Check if we're on /demo path
      if (window.location.pathname.startsWith('/demo')) {
        setIsDemoMode(true)
        localStorage.setItem('boardguru_demo_mode', 'true')
      }
    }
  }, [])

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled)
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.setItem('boardguru_demo_mode', 'true')
      } else {
        localStorage.removeItem('boardguru_demo_mode')
        setFeaturesExplored([])
        setCurrentTourStep(0)
        setTourActive(false)
      }
    }
  }

  const startTour = () => {
    setTourActive(true)
    setCurrentTourStep(0)
  }

  const endTour = () => {
    setTourActive(false)
    markFeatureExplored('tour_completed')
  }

  const nextTourStep = () => {
    if (currentTourStep < defaultTourSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1)
      const step = defaultTourSteps[currentTourStep]
      if (step.id !== 'welcome' && step.id !== 'complete') {
        markFeatureExplored(step.id)
      }
    } else {
      endTour()
    }
  }

  const previousTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1)
    }
  }

  const markFeatureExplored = (featureId: string) => {
    setFeaturesExplored(prev => {
      if (!prev.includes(featureId)) {
        const updated = [...prev, featureId]
        if (typeof window !== 'undefined') {
          localStorage.setItem('boardguru_demo_features_explored', JSON.stringify(updated))
        }
        return updated
      }
      return prev
    })
  }

  // Load explored features from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('boardguru_demo_features_explored')
      if (stored) {
        try {
          setFeaturesExplored(JSON.parse(stored))
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [])

  // Calculate demo progress
  const demoProgress = Math.round((featuresExplored.length / (defaultTourSteps.length - 2)) * 100)

  const value: DemoContextType = {
    isDemoMode,
    setDemoMode,
    demoUser: isDemoMode ? defaultDemoUser : null,
    tourActive,
    startTour,
    endTour,
    currentTourStep,
    nextTourStep,
    previousTourStep,
    tourSteps: defaultTourSteps,
    featuresExplored,
    markFeatureExplored,
    demoProgress
  }

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider')
  }
  return context
}

// Helper hook to check if we're in demo mode
export function useDemoMode() {
  try {
    const context = useContext(DemoContext)
    return context?.isDemoMode ?? false
  } catch {
    // Context not available, return false
    return false
  }
}

// Safe hook to get demo context without throwing errors
export function useDemoSafe() {
  try {
    const context = useContext(DemoContext)
    return {
      isDemoMode: context?.isDemoMode ?? false,
      demoUser: context?.demoUser ?? null,
      tourActive: context?.tourActive ?? false,
      startTour: context?.startTour ?? (() => {}),
      endTour: context?.endTour ?? (() => {}),
      currentTourStep: context?.currentTourStep ?? 0,
      nextTourStep: context?.nextTourStep ?? (() => {}),
      previousTourStep: context?.previousTourStep ?? (() => {}),
      tourSteps: context?.tourSteps ?? [],
      featuresExplored: context?.featuresExplored ?? [],
      markFeatureExplored: context?.markFeatureExplored ?? (() => {}),
      demoProgress: context?.demoProgress ?? 0,
      setDemoMode: context?.setDemoMode ?? (() => {})
    }
  } catch {
    // Return safe defaults when context is not available
    return {
      isDemoMode: false,
      demoUser: null,
      tourActive: false,
      startTour: () => {},
      endTour: () => {},
      currentTourStep: 0,
      nextTourStep: () => {},
      previousTourStep: () => {},
      tourSteps: [],
      featuresExplored: [],
      markFeatureExplored: () => {},
      demoProgress: 0,
      setDemoMode: () => {}
    }
  }
}

// Helper hook for demo tour
export function useDemoTour() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoTour must be used within a DemoProvider')
  }
  
  return {
    active: context.tourActive,
    currentStep: context.currentTourStep,
    steps: context.tourSteps,
    start: context.startTour,
    end: context.endTour,
    next: context.nextTourStep,
    previous: context.previousTourStep,
    progress: (context.currentTourStep / (context.tourSteps.length - 1)) * 100
  }
}