/**
 * Refresh Indicator Components
 * Visual feedback for real-time data updates and refresh functionality
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowDown,
  Bell,
  Settings,
  ChevronDown,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface RefreshIndicatorProps {
  isRefreshing: boolean
  lastRefresh: Date | null
  error: string | null
  onRefresh: () => void
  className?: string
}

export interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error'
  isOnline: boolean
  lastConnected: Date | null
  reconnectAttempts: number
  latency?: number
  onReconnect?: () => void
  className?: string
}

export interface NewDataBannerProps {
  hasNewData: boolean
  newDataCount: number
  onRefresh: () => void
  onDismiss: () => void
  className?: string
}

export interface PullToRefreshIndicatorProps {
  isVisible: boolean
  isPulling: boolean
  pullDistance: number
  threshold: number
  onRefresh: () => Promise<void>
  className?: string
}

export interface AutoRefreshControlsProps {
  isEnabled: boolean
  interval: number // in milliseconds
  onToggle: (enabled: boolean) => void
  onIntervalChange: (interval: number) => void
  lastRefresh: Date | null
  className?: string
}

// Basic refresh indicator
export const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isRefreshing,
  lastRefresh,
  error,
  onRefresh,
  className
}) => {
  const formatLastRefresh = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 text-sm',
              error && 'text-red-600 hover:text-red-700',
              className
            )}
          >
            <RefreshCw 
              className={cn(
                'h-4 w-4',
                isRefreshing && 'animate-spin'
              )}
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>Last refresh: {formatLastRefresh(lastRefresh)}</p>
            {error && <p className="text-red-400 mt-1">{error}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Connection status indicator
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  isOnline,
  lastConnected,
  reconnectAttempts,
  latency,
  onReconnect,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Connected',
          description: `Real-time updates active${latency ? ` (${latency}ms)` : ''}`
        }
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Connecting...',
          description: 'Establishing connection'
        }
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          label: `Reconnecting (${reconnectAttempts})`,
          description: 'Attempting to reconnect'
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Error',
          description: 'Connection failed'
        }
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          label: 'Offline',
          description: isOnline ? 'Disconnected from server' : 'No internet connection'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-2 py-1 rounded-lg text-xs',
            config.bgColor,
            config.color,
            className
          )}>
            <Icon className={cn(
              'h-3 w-3',
              (status === 'connecting' || status === 'reconnecting') && 'animate-spin'
            )} />
            <span className="font-medium">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>{config.description}</p>
            {lastConnected && (
              <p className="text-gray-400 mt-1">
                Last connected: {lastConnected.toLocaleTimeString()}
              </p>
            )}
            {status === 'error' && onReconnect && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                className="mt-2 text-xs h-6"
              >
                Try Again
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// New data notification banner
export const NewDataBanner: React.FC<NewDataBannerProps> = ({
  hasNewData,
  newDataCount,
  onRefresh,
  onDismiss,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(hasNewData)
  }, [hasNewData])

  if (!hasNewData) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed top-20 left-1/2 transform -translate-x-1/2 z-50',
            'bg-blue-600 text-white rounded-lg shadow-lg border',
            'px-4 py-3 flex items-center gap-3 min-w-80',
            className
          )}
        >
          <Bell className="h-4 w-4 flex-shrink-0" />
          
          <div className="flex-1">
            <p className="font-medium text-sm">
              {newDataCount === 1 
                ? 'New organization update available'
                : `${newDataCount} organization updates available`
              }
            </p>
            <p className="text-xs text-blue-100">
              Refresh to see the latest changes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false)
                onDismiss()
              }}
              className="h-7 w-7 p-0 hover:bg-white/20 text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Pull-to-refresh indicator
export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isVisible,
  isPulling,
  pullDistance,
  threshold,
  onRefresh,
  className
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const progress = Math.min(pullDistance / threshold, 1)
  const shouldRefresh = pullDistance >= threshold

  useEffect(() => {
    if (shouldRefresh && !isRefreshing) {
      setIsRefreshing(true)
      onRefresh().finally(() => {
        setIsRefreshing(false)
      })
    }
  }, [shouldRefresh, isRefreshing, onRefresh])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ y: -60 }}
      animate={{ y: isPulling ? 0 : -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 left-1/2 transform -translate-x-1/2 z-40',
        'bg-white rounded-b-lg shadow-lg border border-t-0',
        'px-6 py-3 flex flex-col items-center gap-2',
        className
      )}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : progress * 180 }}
          transition={{ 
            duration: isRefreshing ? 1 : 0,
            repeat: isRefreshing ? Infinity : 0,
            ease: 'linear'
          }}
        >
          <ArrowDown className={cn(
            'h-6 w-6 transition-colors duration-200',
            shouldRefresh ? 'text-green-600' : 'text-gray-400'
          )} />
        </motion.div>
        
        {/* Progress ring */}
        <svg 
          className="absolute inset-0 h-6 w-6 transform -rotate-90"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${56.5 * progress} 56.5`}
            className={cn(
              'transition-all duration-200',
              shouldRefresh ? 'text-green-600' : 'text-blue-600'
            )}
          />
        </svg>
      </div>
      
      <p className={cn(
        'text-xs font-medium transition-colors duration-200',
        shouldRefresh ? 'text-green-600' : 'text-gray-600'
      )}>
        {isRefreshing 
          ? 'Refreshing...' 
          : shouldRefresh 
            ? 'Release to refresh' 
            : 'Pull to refresh'
        }
      </p>
    </motion.div>
  )
}

// Auto-refresh controls
export const AutoRefreshControls: React.FC<AutoRefreshControlsProps> = ({
  isEnabled,
  interval,
  onToggle,
  onIntervalChange,
  lastRefresh,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const intervals = [
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
    { value: 60000, label: '1m' },
    { value: 300000, label: '5m' },
    { value: 900000, label: '15m' }
  ]

  const currentInterval = intervals.find(i => i.value === interval) || intervals[1]

  const formatLastRefresh = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <div className={cn('relative', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 text-xs"
            >
              <Settings className="h-3 w-3" />
              <span>Auto-refresh</span>
              <Badge 
                variant={isEnabled ? 'default' : 'secondary'}
                className="text-xs h-4"
              >
                {isEnabled ? currentInterval.label : 'Off'}
              </Badge>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Configure automatic data refresh</p>
            <p className="text-xs text-gray-400">
              Last refresh: {formatLastRefresh(lastRefresh)}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50 p-4"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-refresh</label>
                  <Button
                    variant={isEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onToggle(!isEnabled)}
                    className="h-6 text-xs"
                  >
                    {isEnabled ? 'On' : 'Off'}
                  </Button>
                </div>

                {isEnabled && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Refresh interval
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {intervals.map((intervalOption) => (
                        <Button
                          key={intervalOption.value}
                          variant={interval === intervalOption.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onIntervalChange(intervalOption.value)}
                          className="text-xs h-7"
                        >
                          {intervalOption.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t text-xs text-gray-500">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Real-time updates active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Last refresh: {formatLastRefresh(lastRefresh)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Combined status bar component
export interface StatusBarProps {
  connection: {
    status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error'
    isOnline: boolean
    lastConnected: Date | null
    reconnectAttempts: number
    latency?: number
  }
  refresh: {
    isRefreshing: boolean
    lastRefresh: Date | null
    error: string | null
    auto: boolean
  }
  autoRefreshInterval: number
  onRefresh: () => void
  onReconnect?: () => void
  onToggleAutoRefresh: (enabled: boolean) => void
  onChangeRefreshInterval: (interval: number) => void
  className?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connection,
  refresh,
  autoRefreshInterval,
  onRefresh,
  onReconnect,
  onToggleAutoRefresh,
  onChangeRefreshInterval,
  className
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 py-2 px-4 bg-gray-50 border-b',
      className
    )}>
      <div className="flex items-center gap-3">
        <ConnectionStatus
          status={connection.status}
          isOnline={connection.isOnline}
          lastConnected={connection.lastConnected}
          reconnectAttempts={connection.reconnectAttempts}
          latency={connection.latency}
          onReconnect={onReconnect}
        />
        
        <div className="w-px h-4 bg-gray-300" />
        
        <RefreshIndicator
          isRefreshing={refresh.isRefreshing}
          lastRefresh={refresh.lastRefresh}
          error={refresh.error}
          onRefresh={onRefresh}
        />
      </div>

      <AutoRefreshControls
        isEnabled={refresh.auto}
        interval={autoRefreshInterval}
        onToggle={onToggleAutoRefresh}
        onIntervalChange={onChangeRefreshInterval}
        lastRefresh={refresh.lastRefresh}
      />
    </div>
  )
}