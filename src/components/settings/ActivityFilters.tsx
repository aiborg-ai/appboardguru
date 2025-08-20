'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Calendar, 
  Filter, 
  X, 
  RotateCcw,
  Clock,
  Shield,
  Eye,
  Edit,
  AlertTriangle
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface ActivityFiltersProps {
  filters: {
    eventType?: string
    severity?: string
    outcome?: string
    fromDate?: string
    toDate?: string
    search?: string
  }
  onFiltersChange: (filters: any) => void
  onClose: () => void
}

export function ActivityFilters({ filters, onFiltersChange, onClose }: ActivityFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [searchInput, setSearchInput] = useState(filters.search || '')

  // Quick date range options
  const dateRangeOptions = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 }
  ]

  // Event type options
  const eventTypeOptions = [
    { value: 'authentication', label: 'Authentication', icon: Shield, color: 'text-green-600' },
    { value: 'data_access', label: 'Data Access', icon: Eye, color: 'text-blue-600' },
    { value: 'data_modification', label: 'Data Changes', icon: Edit, color: 'text-orange-600' },
    { value: 'authorization', label: 'Permissions', icon: Shield, color: 'text-purple-600' },
    { value: 'user_action', label: 'User Actions', icon: Clock, color: 'text-gray-600' }
  ]

  // Severity options
  const severityOptions = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ]

  // Outcome options
  const outcomeOptions = [
    { value: 'success', label: 'Success', color: 'bg-green-100 text-green-800' },
    { value: 'failure', label: 'Failure', color: 'bg-red-100 text-red-800' },
    { value: 'error', label: 'Error', color: 'bg-orange-100 text-orange-800' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-800' }
  ]

  // Apply filters
  const applyFilters = () => {
    onFiltersChange({
      ...localFilters,
      search: searchInput
    })
  }

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    setSearchInput('')
    onFiltersChange(clearedFilters)
  }

  // Set date range
  const setDateRange = (days: number) => {
    if (days === 0) {
      // Today
      const today = new Date()
      setLocalFilters(prev => ({
        ...prev,
        fromDate: startOfDay(today).toISOString(),
        toDate: endOfDay(today).toISOString()
      }))
    } else {
      // Last X days
      const endDate = new Date()
      const startDate = subDays(endDate, days)
      setLocalFilters(prev => ({
        ...prev,
        fromDate: startOfDay(startDate).toISOString(),
        toDate: endOfDay(endDate).toISOString()
      }))
    }
  }

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        applyFilters()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Format date for input
  const formatDateForInput = (date?: string) => {
    if (!date) return ''
    return format(new Date(date), 'yyyy-MM-dd')
  }

  // Count active filters
  const activeFilterCount = Object.keys(localFilters).filter(key => 
    localFilters[key as keyof typeof localFilters]
  ).length + (searchInput ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filter Activities</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Activities
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search descriptions, actions, or resources..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Quick Date Ranges */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Date Ranges
        </label>
        <div className="flex flex-wrap gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => setDateRange(option.days)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Calendar className="h-4 w-4 mr-1" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <input
            type="date"
            value={formatDateForInput(localFilters.fromDate)}
            onChange={(e) => setLocalFilters(prev => ({
              ...prev,
              fromDate: e.target.value ? startOfDay(new Date(e.target.value)).toISOString() : undefined
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <input
            type="date"
            value={formatDateForInput(localFilters.toDate)}
            onChange={(e) => setLocalFilters(prev => ({
              ...prev,
              toDate: e.target.value ? endOfDay(new Date(e.target.value)).toISOString() : undefined
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Event Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Activity Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {eventTypeOptions.map((option) => {
            const IconComponent = option.icon
            const isSelected = localFilters.eventType === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  eventType: isSelected ? undefined : option.value
                }))}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${isSelected ? 'text-blue-600' : option.color}`} />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Severity Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Severity Level
        </label>
        <div className="flex flex-wrap gap-2">
          {severityOptions.map((option) => {
            const isSelected = localFilters.severity === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  severity: isSelected ? undefined : option.value
                }))}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'border-blue-300 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                } ${option.color}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Outcome Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Outcome
        </label>
        <div className="flex flex-wrap gap-2">
          {outcomeOptions.map((option) => {
            const isSelected = localFilters.outcome === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  outcome: isSelected ? undefined : option.value
                }))}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'border-blue-300 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                } ${option.color}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Apply Filters Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={applyFilters}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </button>
      </div>
    </div>
  )
}