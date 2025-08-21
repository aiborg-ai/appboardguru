'use client'

import React, { useState } from 'react'
import { X, Filter } from 'lucide-react'

interface FYIFiltersType {
  type?: string
  relevanceThreshold?: number
  fromDate?: string
  toDate?: string
  search?: string
}

interface FYIFiltersProps {
  filters: FYIFiltersType
  onFiltersChange: (filters: FYIFiltersType) => void
  onClose: () => void
}

export function FYIFilters({ filters, onFiltersChange, onClose }: FYIFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FYIFiltersType>(filters)

  const insightTypes = [
    { value: '', label: 'All Types' },
    { value: 'news', label: 'News' },
    { value: 'competitor', label: 'Competitors' },
    { value: 'industry', label: 'Industry' },
    { value: 'regulation', label: 'Regulations' },
    { value: 'market', label: 'Market' }
  ]

  const handleFilterChange = (key: keyof FYIFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const resetFilters = () => {
    const resetFilters: FYIFiltersType = {
      relevanceThreshold: 0.6
    }
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filter Insights</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Insight Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insight Type
          </label>
          <select
            value={localFilters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {insightTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Relevance Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relevance Threshold
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localFilters.relevanceThreshold || 0.6}
              onChange={(e) => handleFilterChange('relevanceThreshold', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span className="font-medium">
                {Math.round((localFilters.relevanceThreshold || 0.6) * 100)}%
              </span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Date
          </label>
          <input
            type="date"
            value={localFilters.fromDate || ''}
            onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Date
          </label>
          <input
            type="date"
            value={localFilters.toDate || ''}
            onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Keywords
        </label>
        <input
          type="text"
          placeholder="Search in titles, summaries, and tags..."
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          onClick={applyFilters}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}