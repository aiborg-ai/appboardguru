'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, Globe, Building, Calendar, FileText, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ChatScope } from './ScopeSelectorTypes'

export type { ChatScope }

interface ScopeSelectorProps {
  selectedScope: ChatScope
  onScopeChange: (scope: ChatScope) => void
  className?: string
}

const defaultScopes: ChatScope[] = [
  {
    id: 'global',
    type: 'global',
    label: 'Global Knowledge',
    description: 'Access to general knowledge and web search'
  }
]

export function ScopeSelector({ selectedScope, onScopeChange, className = '' }: ScopeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [availableScopes, setAvailableScopes] = useState<ChatScope[]>(defaultScopes)

  useEffect(() => {
    loadAvailableScopes()
  }, [])

  const loadAvailableScopes = async () => {
    try {
      // Load organization scopes
      const orgScopes: ChatScope[] = [
        {
          id: 'boardguru-org',
          type: 'organization',
          label: 'BoardGuru Organization',
          description: 'All organizational documents and data'
        }
      ]

      // Load recent meetings
      const meetingScopes: ChatScope[] = [
        {
          id: 'meeting-q4-2024',
          type: 'meeting',
          label: 'Q4 2024 Board Meeting',
          description: 'December 15, 2024 - Strategic Planning Session'
        },
        {
          id: 'meeting-audit-2024',
          type: 'meeting',
          label: 'Audit Committee Meeting',
          description: 'November 28, 2024 - Financial Review'
        }
      ]

      // Load recent documents
      const documentScopes: ChatScope[] = [
        {
          id: 'doc-annual-report-2024',
          type: 'document',
          label: 'Annual Report 2024',
          description: 'Comprehensive annual financial and strategic report'
        },
        {
          id: 'doc-strategic-plan-2025',
          type: 'document',
          label: 'Strategic Plan 2025',
          description: '5-year strategic roadmap and initiatives'
        }
      ]

      // Load team scopes
      const teamScopes: ChatScope[] = [
        {
          id: 'team-executive',
          type: 'team',
          label: 'Executive Team',
          description: 'C-suite and senior leadership team scope'
        },
        {
          id: 'team-board',
          type: 'team',
          label: 'Board Members',
          description: 'Board of directors and advisory members'
        }
      ]

      setAvailableScopes([
        ...defaultScopes,
        ...orgScopes,
        ...meetingScopes,
        ...documentScopes,
        ...teamScopes
      ])
    } catch (error) {
      console.error('Failed to load scopes:', error)
    }
  }

  const getScopeIcon = (type: ChatScope['type']) => {
    switch (type) {
      case 'global': return Globe
      case 'organization': return Building
      case 'meeting': return Calendar
      case 'document': return FileText
      case 'team': return Users
      default: return Globe
    }
  }

  const getScopeColor = (type: ChatScope['type']) => {
    switch (type) {
      case 'global': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'organization': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'meeting': return 'bg-green-50 text-green-700 border-green-200'
      case 'document': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'team': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const groupedScopes = availableScopes.reduce((acc, scope) => {
    if (!acc[scope.type]) {
      acc[scope.type] = []
    }
    acc[scope.type]!.push(scope)
    return acc
  }, {} as Record<string, ChatScope[]>)

  const typeLabels = {
    global: 'Global',
    organization: 'Organization',
    meeting: 'Meetings',
    document: 'Documents',
    team: 'Teams'
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full justify-between text-left ${getScopeColor(selectedScope.type)} border-2`}
      >
        <div className="flex items-center space-x-2">
          {React.createElement(getScopeIcon(selectedScope.type), { className: 'h-4 w-4' })}
          <div>
            <div className="font-medium">{selectedScope.label}</div>
            {selectedScope.description && (
              <div className="text-xs opacity-75">{selectedScope.description}</div>
            )}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 px-2 py-1">
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">Select Chat Scope</span>
              </div>
            </div>
            
            {Object.entries(groupedScopes).map(([type, scopes]) => (
              <div key={type} className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                  {typeLabels[type as keyof typeof typeLabels]}
                </div>
                <div className="space-y-1">
                  {scopes.map(scope => {
                    const Icon = getScopeIcon(scope.type)
                    const isSelected = selectedScope.id === scope.id
                    
                    return (
                      <button
                        key={scope.id}
                        onClick={() => {
                          onScopeChange(scope)
                          setIsOpen(false)
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                          isSelected
                            ? `${getScopeColor(scope.type)} font-medium`
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{scope.label}</div>
                          {scope.description && (
                            <div className="text-xs text-gray-500 truncate">{scope.description}</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}