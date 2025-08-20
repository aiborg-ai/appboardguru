'use client'

import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Download, 
  Search, 
  Filter, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Shield,
  Eye,
  Edit,
  Users,
  RefreshCw
} from 'lucide-react'
import { ActivityTimelineItem } from './ActivityTimelineItem'
import { ActivityFilters } from './ActivityFilters'
import { ActivityStatsWidget } from './ActivityStatsWidget'
import { translateActivityLog, getActivityStats, type ActivityLog } from '@/lib/activity-translator'

interface ActivityFiltersType {
  eventType?: string
  severity?: string
  outcome?: string
  fromDate?: string
  toDate?: string
  search?: string
}

export function ActivityLogsTab() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<ActivityFiltersType>({})
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  })
  const [exporting, setExporting] = useState(false)

  // Fetch user activities
  const fetchActivities = async (newFilters?: ActivityFiltersType, offset = 0) => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
        ...filters,
        ...newFilters
      })

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (!params.get(key)) {
          params.delete(key)
        }
      })

      const response = await fetch(`/api/user/activity?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch activities')
      }

      if (offset === 0) {
        setActivities(result.data.activities)
      } else {
        setActivities(prev => [...prev, ...result.data.activities])
      }

      setPagination(result.data.pagination)

    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: ActivityFiltersType) => {
    setFilters(newFilters)
    fetchActivities(newFilters, 0)
  }

  // Load more activities
  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchActivities(filters, pagination.offset + pagination.limit)
    }
  }

  // Export activities
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      setExporting(true)
      
      const params = new URLSearchParams({
        format,
        ...filters
      })

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (!params.get(key)) {
          params.delete(key)
        }
      })

      const response = await fetch(`/api/user/activity/export?${params}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `activity-export.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Refresh activities
  const refresh = () => {
    fetchActivities(filters, 0)
  }

  // Initial load
  useEffect(() => {
    fetchActivities()
  }, [])

  // Get activity statistics
  const stats = getActivityStats(activities)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <span>Activity Log</span>
          </h2>
          <p className="text-gray-600 mt-1">
            View and manage your account activity history
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <div className="relative">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || activities.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <ActivityStatsWidget stats={stats} />

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-4">
          <ActivityFilters 
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total > 0 ? (
              <>Showing {activities.length} of {pagination.total} activities</>
            ) : (
              'No activities found'
            )}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {loading && activities.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading your activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
              <p className="text-gray-600">
                {Object.keys(filters).length > 0 
                  ? 'Try adjusting your filters to see more activities.'
                  : 'Your activities will appear here as you use BoardGuru.'
                }
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityTimelineItem
                key={activity.id}
                activity={activity}
                translation={translateActivityLog(activity)}
              />
            ))
          )}
        </div>

        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More ({pagination.total - activities.length} remaining)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}