'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Play,
  CheckCircle,
  Brain,
  BarChart3,
  Users,
  FileText,
  Shield,
  Zap
} from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  target?: string
  icon?: React.ElementType
  action?: () => void
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BoardGuru Demo',
    description: 'Experience the most advanced AI-powered board management platform. This tour will guide you through our key features using sample data.',
    icon: Brain
  },
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    description: 'Your command center for board governance. View key metrics, recent activities, and AI insights all in one place.',
    target: '[data-tour="dashboard"]',
    icon: BarChart3
  },
  {
    id: 'board-packs',
    title: 'AI-Powered Board Packs',
    description: 'Upload documents and get instant AI summaries, risk assessments, and actionable insights. Our AI analyzes complex documents in seconds.',
    target: '[data-tour="board-packs"]',
    icon: FileText
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    description: 'Work together with board members in real-time. See live presence indicators, collaborative editing, and instant messaging.',
    target: '[data-tour="collaboration"]',
    icon: Users
  },
  {
    id: 'security',
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, comprehensive audit trails, and granular access controls ensure your sensitive board data is always protected.',
    target: '[data-tour="security"]',
    icon: Shield
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    description: 'Your personal board governance assistant. Ask questions, generate reports, and get insights using natural language.',
    target: '[data-tour="ai-assistant"]',
    icon: Brain
  },
  {
    id: 'complete',
    title: 'Tour Complete!',
    description: 'You have explored the key features of BoardGuru. Continue exploring on your own or sign up to start managing your board with AI-powered efficiency.',
    icon: CheckCircle
  }
]

export default function DemoTourOverlay() {
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const demoModeActive = urlParams.get('demo') === 'true' || 
                          localStorage.getItem('boardguru_demo_mode') === 'true'
    const tourRequested = urlParams.get('tour') === 'true'
    
    setIsDemoMode(demoModeActive)
    
    // Auto-start tour if requested
    if (demoModeActive && tourRequested) {
      setIsActive(true)
      // Remove tour param from URL without refresh
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('tour')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [])
  
  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeTour()
    }
  }
  
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const skipTour = () => {
    setIsActive(false)
    localStorage.setItem('boardguru_demo_tour_completed', 'true')
  }
  
  const completeTour = () => {
    setIsActive(false)
    localStorage.setItem('boardguru_demo_tour_completed', 'true')
  }
  
  const startTour = () => {
    setIsActive(true)
    setCurrentStep(0)
  }
  
  if (!isDemoMode) return null
  
  // Show tour start button if not active
  if (!isActive) {
    return (
      <button
        onClick={startTour}
        className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      >
        <Play className="h-5 w-5" />
        <span className="font-medium">Start Tour</span>
      </button>
    )
  }
  
  const step = tourSteps[currentStep]
  const Icon = step.icon || Brain
  const progress = ((currentStep + 1) / tourSteps.length) * 100
  
  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={skipTour} />
      
      {/* Tour card */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                  <Icon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500">Step {currentStep + 1} of {tourSteps.length}</p>
                </div>
              </div>
              <button
                onClick={skipTour}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{step.description}</p>
          </div>
          
          {/* Navigation */}
          <div className="p-6 pt-0 flex items-center justify-between">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentStep === 0 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-2">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-200 ${
                    index === currentStep 
                      ? 'w-6 bg-gradient-to-r from-blue-600 to-purple-600' 
                      : index < currentStep
                      ? 'bg-purple-600'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <span>{currentStep === tourSteps.length - 1 ? 'Complete' : 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}