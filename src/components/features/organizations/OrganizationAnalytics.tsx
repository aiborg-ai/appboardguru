'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  Bell,
  Vault,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Settings
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useOrganizationAnalytics, type OrganizationAnalytics } from '@/hooks/useOrganizationAnalytics'
import { ActivityIndicator, MemberActivityList } from './ActivityIndicator'

// Types
interface OrganizationAnalyticsProps {
  organizationId: string
  className?: string
  mode?: 'card' | 'modal' | 'expanded'
  onClose?: () => void
}

interface QuickStatCardProps {
  title: string
  value: number
  icon: React.ElementType
  trend?: number
  trendLabel?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  className?: string
}

interface MiniSparklineProps {
  data: number[]
  color?: string
  height?: number
  className?: string
}

// Mini Sparkline Component (lightweight SVG chart)
function MiniSparkline({ 
  data, 
  color = '#3B82F6', 
  height = 40,
  className 
}: MiniSparklineProps) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = ((maxValue - value) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className={cn('w-full', className)}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <motion.polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <motion.polygon
          fill={`url(#gradient-${color})`}
          points={`0,100 ${points} 100,100`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </svg>
    </div>
  )
}

// Quick Stats Card Component
function QuickStatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendLabel,
  color = 'blue',
  className 
}: QuickStatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  }

  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600'
  }

  return (
    <motion.div
      className={cn(
        'relative p-4 rounded-lg border bg-white hover:shadow-md transition-all duration-200',
        colorClasses[color],
        className
      )}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
          {trend !== undefined && (
            <div className="flex items-center mt-1">
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
              )}
              <span className={cn(
                'text-xs font-medium',
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {Math.abs(trend)}% {trendLabel || 'from last week'}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          iconBgClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}

// Main Analytics Component
export function OrganizationAnalytics({
  organizationId,
  className,
  mode = 'card',
  onClose
}: OrganizationAnalyticsProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'expanded')
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview')

  const { 
    analytics, 
    isLoading, 
    error, 
    refresh, 
    lastUpdated 
  } = useOrganizationAnalytics({
    organizationId,
    autoRefresh: true,
    refreshInterval: 30000,
    enabled: true
  })

  if (isLoading && !analytics) {
    return (
      <motion.div 
        className={cn('p-6 bg-white rounded-lg border shadow-sm', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-100 rounded-lg"></div>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div 
        className={cn('p-6 bg-red-50 rounded-lg border border-red-200', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <Activity className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">Unable to Load Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    )
  }

  if (!analytics) return null

  const weeklyActivityData = analytics.weeklyStats.map(stat => stat.totalActivities)
  const hasRecentActivity = analytics.lastActivity && 
    new Date(analytics.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return (
    <motion.div
      className={cn(
        'bg-white rounded-lg border shadow-sm overflow-hidden',
        mode === 'modal' && 'max-w-4xl mx-auto',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Organization Analytics</h3>
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasRecentActivity && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
            
            {mode === 'card' && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
            
            {mode === 'modal' && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="mt-4">
          <ActivityIndicator
            activityScore={analytics.activityScore}
            memberCount={analytics.memberCount}
            activeMembers={analytics.activeMembers}
            lastActivity={analytics.lastActivity}
            showDetails={true}
          />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {(isExpanded || mode !== 'card') && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Tabs */}
            {(mode === 'modal' || mode === 'expanded') && (
              <div className="border-b">
                <nav className="flex px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'members', label: 'Members', icon: Users },
                    { id: 'activity', label: 'Activity', icon: Activity }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickStatCard
                      title="Documents"
                      value={analytics.quickStats.totalDocuments}
                      icon={FileText}
                      color="blue"
                      trend={5}
                    />
                    <QuickStatCard
                      title="Vaults"
                      value={analytics.quickStats.totalVaults}
                      icon={Vault}
                      color="purple"
                      trend={-2}
                    />
                    <QuickStatCard
                      title="Meetings"
                      value={analytics.recentMeetings}
                      icon={Calendar}
                      color="green"
                      trend={12}
                      trendLabel="this month"
                    />
                    <QuickStatCard
                      title="Notifications"
                      value={analytics.quickStats.totalNotifications}
                      icon={Bell}
                      color="orange"
                      trend={8}
                    />
                  </div>

                  {/* Activity Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Weekly Activity</h4>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        Last 7 days
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {analytics.weeklyStats.map((stat, index) => {
                        const date = new Date(stat.date)
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                        
                        return (
                          <div key={stat.date} className="text-center">
                            <div className="text-xs text-gray-500 mb-2">{dayName}</div>
                            <motion.div
                              className="bg-blue-500 rounded-sm mx-auto"
                              style={{ 
                                width: '20px',
                                height: `${Math.max(4, (stat.totalActivities / Math.max(...weeklyActivityData)) * 60)}px`
                              }}
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(4, (stat.totalActivities / Math.max(...weeklyActivityData)) * 60)}px` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              title={`${stat.totalActivities} activities`}
                            />
                            <div className="text-xs font-medium text-gray-700 mt-2">
                              {stat.totalActivities}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <MiniSparkline
                      data={weeklyActivityData}
                      color="#3B82F6"
                      height={60}
                      className="mt-4"
                    />
                  </div>
                </motion.div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Member Activity ({analytics.memberActivity.length})
                    </h4>
                    <span className="text-sm text-gray-500">
                      {analytics.activeMembers} currently active
                    </span>
                  </div>

                  <MemberActivityList
                    members={analytics.memberActivity}
                    maxDisplay={10}
                  />
                </motion.div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h4 className="text-lg font-semibold text-gray-900">Activity Breakdown</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analytics.weeklyStats.map((stat, index) => (
                      <div key={stat.date} className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-2">
                          {new Date(stat.date).toLocaleDateString()}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Assets uploaded:</span>
                            <span className="font-medium">{stat.assetUploads}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Meetings created:</span>
                            <span className="font-medium">{stat.meetingsCreated}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Board packs:</span>
                            <span className="font-medium">{stat.boardPacksCreated}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default OrganizationAnalytics