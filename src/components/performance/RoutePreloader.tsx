'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface PreloadConfig {
  routes: string[]
  delay?: number
  onHover?: boolean
  priority?: 'high' | 'low'
}

interface RoutePreloaderProps {
  config: PreloadConfig
  children?: React.ReactNode
}

// Smart route preloader that preloads likely next routes
export default function RoutePreloader({ config, children }: RoutePreloaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const preloadedRoutes = useRef(new Set<string>())

  useEffect(() => {
    const preloadRoute = (route: string) => {
      if (preloadedRoutes.current.has(route)) return

      // Use Next.js router prefetch
      router.prefetch(route)
      preloadedRoutes.current.add(route)
      
      console.debug(`Preloaded route: ${route}`)
    }

    const preloadRoutes = () => {
      config.routes.forEach(route => {
        if (route !== pathname) {
          preloadRoute(route)
        }
      })
    }

    if (config.delay) {
      const timer = setTimeout(preloadRoutes, config.delay)
      return () => clearTimeout(timer)
    } else {
      preloadRoutes()
    }
  }, [config.routes, config.delay, pathname, router])

  return <>{children}</>
}

// Preloader configurations for different page types
// This MUST be defined before SmartLink and useRoutePreloadConfig to avoid "Cannot access before initialization" error
export const preloadConfigs = {
  dashboard: {
    routes: [
      '/dashboard/organizations',
      '/dashboard/assets',
      '/dashboard/meetings',
      '/dashboard/vaults',
      '/dashboard/search'
    ],
    delay: 2000,
    priority: 'high' as const
  },
  
  organizations: {
    routes: [
      '/dashboard/organizations/create',
      '/dashboard/assets',
      '/dashboard/meetings',
      '/dashboard/search'
    ],
    delay: 1000,
    priority: 'high' as const
  },
  
  assets: {
    routes: [
      '/dashboard/organizations',
      '/dashboard/vaults',
      '/dashboard/meetings',
      '/dashboard/search'
    ],
    delay: 1000,
    priority: 'high' as const
  },
  
  meetings: {
    routes: [
      '/dashboard/meetings/create',
      '/dashboard/assets',
      '/dashboard/organizations',
      '/dashboard/search'
    ],
    delay: 1000,
    priority: 'high' as const
  },
  
  search: {
    routes: [
      '/dashboard/organizations',
      '/dashboard/assets',
      '/dashboard/meetings',
      '/dashboard/vaults'
    ],
    delay: 500,
    priority: 'low' as const
  }
}

// Hook to get preload config based on current route
export function useRoutePreloadConfig() {
  const pathname = usePathname()
  
  if (pathname === '/dashboard') return preloadConfigs.dashboard
  if (pathname.startsWith('/dashboard/organizations')) return preloadConfigs.organizations
  if (pathname.startsWith('/dashboard/assets')) return preloadConfigs.assets
  if (pathname.startsWith('/dashboard/meetings')) return preloadConfigs.meetings
  if (pathname.startsWith('/dashboard/search')) return preloadConfigs.search
  
  // Default config for unknown routes
  return {
    routes: ['/dashboard'],
    delay: 3000,
    priority: 'low' as const
  }
}