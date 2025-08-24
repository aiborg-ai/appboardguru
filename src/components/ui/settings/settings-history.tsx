'use client'

import React, { memo, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { History, RotateCcw, Trash2, User, Clock } from 'lucide-react'
import { SettingsCard } from './settings-card'
import { SettingsButton } from './settings-button'
import { Avatar } from '@/features/shared/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import type { SettingsHistoryProps, SettingsHistoryEntry } from './types'

export const SettingsHistory = memo<SettingsHistoryProps>(({
  entries,
  loading = false,
  onRevert,
  onClear,
  pageSize = 10,
  className,
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(0)

  const paginatedEntries = useMemo(() => {
    const start = currentPage * pageSize
    return entries.slice(start, start + pageSize)
  }, [entries, currentPage, pageSize])

  const totalPages = Math.ceil(entries.length / pageSize)
  const hasNextPage = currentPage < totalPages - 1
  const hasPrevPage = currentPage > 0

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('create')) return 'text-green-600 bg-green-50'
    if (action.toLowerCase().includes('delete')) return 'text-red-600 bg-red-50'
    if (action.toLowerCase().includes('update')) return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <SettingsCard
      title="Settings History"
      description="View and revert previous settings changes"
      icon={History}
      loading={loading}
      className={className}
      {...props}
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {entries.length} {entries.length === 1 ? 'change' : 'changes'} recorded
          </span>
          
          {onClear && entries.length > 0 && (
            <SettingsButton
              onClick={onClear}
              variant="ghost"
              size="sm"
              icon={Trash2}
            >
              Clear History
            </SettingsButton>
          )}
        </div>

        {/* History Entries */}
        {paginatedEntries.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
            <p className="text-sm text-gray-600">
              Changes to your settings will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedEntries.map((entry) => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                onRevert={onRevert}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <SettingsButton
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!hasPrevPage}
                variant="outline"
                size="sm"
              >
                Previous
              </SettingsButton>
              
              <SettingsButton
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasNextPage}
                variant="outline"
                size="sm"
              >
                Next
              </SettingsButton>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  )
})

const HistoryEntry = memo<{
  entry: SettingsHistoryEntry
  onRevert?: (entryId: string) => void
}>(({ entry, onRevert }) => {
  const [showDetails, setShowDetails] = useState(false)

  const actionColorClass = entry.action.toLowerCase().includes('create') 
    ? 'text-green-600 bg-green-50'
    : entry.action.toLowerCase().includes('delete')
    ? 'text-red-600 bg-red-50'
    : entry.action.toLowerCase().includes('update')
    ? 'text-blue-600 bg-blue-50'
    : 'text-gray-600 bg-gray-50'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* User Avatar */}
          {entry.user && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              {entry.user.avatar ? (
                <img src={entry.user.avatar} alt={entry.user.name} />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            {/* Action and Category */}
            <div className="flex items-center space-x-2 mb-1">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                actionColorClass
              )}>
                {entry.action}
              </span>
              <span className="text-sm text-gray-600">
                in {entry.category}
              </span>
            </div>

            {/* User and Timestamp */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {entry.user && (
                <span>{entry.user.name}</span>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
              </div>
            </div>

            {/* Value Changes (if available) */}
            {(entry.oldValue !== undefined || entry.newValue !== undefined) && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showDetails ? 'Hide' : 'Show'} changes
                </button>
                
                {showDetails && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    {entry.oldValue !== undefined && (
                      <div>
                        <span className="font-medium text-red-600">From:</span>
                        <pre className="text-red-700 whitespace-pre-wrap break-all">
                          {typeof entry.oldValue === 'object' 
                            ? JSON.stringify(entry.oldValue, null, 2)
                            : String(entry.oldValue)
                          }
                        </pre>
                      </div>
                    )}
                    {entry.newValue !== undefined && (
                      <div className={entry.oldValue !== undefined ? 'mt-2' : ''}>
                        <span className="font-medium text-green-600">To:</span>
                        <pre className="text-green-700 whitespace-pre-wrap break-all">
                          {typeof entry.newValue === 'object'
                            ? JSON.stringify(entry.newValue, null, 2) 
                            : String(entry.newValue)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Revert Action */}
        {onRevert && (
          <SettingsButton
            onClick={() => onRevert(entry.id)}
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            className="ml-2 flex-shrink-0"
          >
            Revert
          </SettingsButton>
        )}
      </div>
    </div>
  )
})

HistoryEntry.displayName = 'HistoryEntry'
SettingsHistory.displayName = 'SettingsHistory'