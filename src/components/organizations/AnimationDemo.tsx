'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Import our animation components
import { 
  OrganizationCardSkeleton, 
  OrganizationCardSkeletonGrid,
  EnhancedOrganizationsGrid,
  AnimatedCard,
  StaggeredContainer,
  ShimmerOverlay,
  TransitionWrapper
} from './index'

// Mock data for demonstration
const mockOrganizations = [
  {
    id: '1',
    name: 'Tech Innovations Inc.',
    description: 'Leading technology company focused on AI and machine learning solutions for enterprise clients.',
    logo_url: null,
    website: 'https://techinnovations.com',
    industry: 'Technology',
    organization_size: 'large',
    userRole: 'owner',
    memberCount: 45,
    created_at: '2023-01-15T08:00:00Z',
    status: 'active' as const
  },
  {
    id: '2',
    name: 'Green Energy Solutions',
    description: 'Sustainable energy solutions for a better tomorrow. We specialize in solar and wind power systems.',
    logo_url: null,
    website: 'https://greenenergy.com',
    industry: 'Energy',
    organization_size: 'medium',
    userRole: 'admin',
    memberCount: 23,
    created_at: '2023-03-22T10:30:00Z',
    status: 'active' as const
  },
  {
    id: '3',
    name: 'Healthcare Connect',
    description: 'Connecting patients with healthcare providers through innovative digital platforms.',
    logo_url: null,
    website: null,
    industry: 'Healthcare',
    organization_size: 'small',
    userRole: 'member',
    memberCount: 12,
    created_at: '2023-06-10T14:15:00Z',
    status: 'active' as const
  }
]

interface AnimationDemoProps {
  className?: string
}

/**
 * Interactive demo component showing all loading states and animations
 * Perfect for testing and demonstrating the animation system
 */
export function AnimationDemo({ className }: AnimationDemoProps) {
  const [demoState, setDemoState] = useState<'loading' | 'loaded' | 'refreshing'>('loaded')
  const [showSkeletons, setShowSkeletons] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [selectedDemo, setSelectedDemo] = useState<'grid' | 'individual' | 'transitions'>('grid')

  // Auto-cycle demo states
  const [isAutoCycling, setIsAutoCycling] = useState(false)

  useEffect(() => {
    if (!isAutoCycling) return

    const interval = setInterval(() => {
      setDemoState(current => {
        if (current === 'loaded') return 'loading'
        if (current === 'loading') return 'refreshing'
        return 'loaded'
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isAutoCycling])

  const handleLoadingDemo = () => {
    setDemoState('loading')
    setTimeout(() => setDemoState('loaded'), 2000)
  }

  const handleRefreshDemo = () => {
    setDemoState('refreshing')
    setTimeout(() => setDemoState('loaded'), 1500)
  }

  const mockHandlers = {
    onSelectOrganization: (org: any) => console.log('Selected:', org.name),
    onViewDetails: (org: any) => console.log('View details:', org.name),
    onOpenSettings: (orgId: string) => console.log('Open settings:', orgId)
  }

  return (
    <div className={className}>
      {/* Demo Controls */}
      <div className="mb-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Animation Demo Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* State Controls */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Demo States</h3>
            <div className="space-y-2">
              <Button
                onClick={handleLoadingDemo}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={demoState === 'loading'}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${demoState === 'loading' ? 'animate-spin' : ''}`} />
                Loading Demo
              </Button>
              
              <Button
                onClick={handleRefreshDemo}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={demoState === 'refreshing'}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh Demo
              </Button>
              
              <Button
                onClick={() => setIsAutoCycling(!isAutoCycling)}
                variant={isAutoCycling ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
              >
                {isAutoCycling ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Auto Cycle
              </Button>
            </div>
          </div>

          {/* Demo Types */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Demo Type</h3>
            <div className="space-y-2">
              {[
                { key: 'grid', label: 'Full Grid Animation' },
                { key: 'individual', label: 'Individual Cards' },
                { key: 'transitions', label: 'Transitions Only' }
              ].map(option => (
                <Button
                  key={option.key}
                  onClick={() => setSelectedDemo(option.key as any)}
                  variant={selectedDemo === option.key ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Settings</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-600">Animation Speed: {animationSpeed}x</span>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  className="slider mt-1 w-full"
                />
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSkeletons}
                  onChange={(e) => setShowSkeletons(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-xs text-gray-600">Show Skeleton Details</span>
              </label>
            </div>
          </div>
        </div>

        {/* Current State Indicator */}
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current State:</span>
            <motion.span
              key={demoState}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`px-2 py-1 rounded text-xs font-medium ${
                demoState === 'loading' ? 'bg-blue-100 text-blue-800' :
                demoState === 'refreshing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}
            >
              {demoState.toUpperCase()}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <motion.div
        style={{ 
          animationDuration: `${1/animationSpeed}s`,
          transition: `all ${0.3/animationSpeed}s ease-in-out`
        }}
        className="relative"
      >
        {selectedDemo === 'grid' && (
          <EnhancedOrganizationsGrid
            organizations={mockOrganizations}
            isLoading={demoState === 'loading'}
            isRefreshing={demoState === 'refreshing'}
            currentOrganizationId={mockOrganizations[0].id}
            {...mockHandlers}
          />
        )}

        {selectedDemo === 'individual' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Individual Component Demos</h3>
            
            {/* Skeleton Demo */}
            {(showSkeletons || demoState === 'loading') && (
              <div>
                <h4 className="text-md font-medium mb-4">Skeleton Components</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <OrganizationCardSkeleton withShimmer={true} />
                  <OrganizationCardSkeleton withShimmer={false} />
                  <OrganizationCardSkeleton compact={true} withShimmer={true} />
                </div>
              </div>
            )}

            {/* Individual Animated Cards */}
            <div>
              <h4 className="text-md font-medium mb-4">Animated Cards</h4>
              <StaggeredContainer staggerDelay={0.1 / animationSpeed}>
                {mockOrganizations.map((org, index) => (
                  <AnimatedCard
                    key={org.id}
                    delay={index * 0.1 / animationSpeed}
                    enableHover={true}
                    className="mb-4"
                  >
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="font-semibold">{org.name}</h5>
                      <p className="text-sm text-gray-600">{org.description}</p>
                    </div>
                  </AnimatedCard>
                ))}
              </StaggeredContainer>
            </div>
          </div>
        )}

        {selectedDemo === 'transitions' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Transition Demos</h3>
            
            <TransitionWrapper 
              key={demoState} 
              mode="fade"
              duration={0.5 / animationSpeed}
            >
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 / animationSpeed }}
                >
                  <h4 className="text-xl font-semibold mb-2">
                    {demoState === 'loading' && 'Loading Content...'}
                    {demoState === 'refreshing' && 'Refreshing Data...'}
                    {demoState === 'loaded' && 'Content Loaded Successfully!'}
                  </h4>
                  <p className="text-gray-600">
                    This demonstrates smooth transitions between different states.
                  </p>
                  
                  {demoState === 'loading' && (
                    <div className="mt-4">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    </div>
                  )}
                  
                  {demoState === 'refreshing' && (
                    <div className="mt-4 relative">
                      <ShimmerOverlay />
                      <div className="bg-gray-100 h-20 rounded animate-pulse" />
                    </div>
                  )}
                </motion.div>
              </div>
            </TransitionWrapper>
          </div>
        )}
      </motion.div>

      {/* Performance Stats */}
      <div className="mt-8 bg-gray-900 text-white rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Performance Notes:</h4>
        <ul className="text-xs space-y-1 text-gray-300">
          <li>• All animations use GPU-accelerated transforms</li>
          <li>• Intersection Observer prevents off-screen animations</li>
          <li>• Skeleton components use CSS animations for 60fps performance</li>
          <li>• Staggered animations reduce perceived loading time</li>
          <li>• Motion respects user's reduced-motion preferences</li>
        </ul>
      </div>
    </div>
  )
}

export default AnimationDemo