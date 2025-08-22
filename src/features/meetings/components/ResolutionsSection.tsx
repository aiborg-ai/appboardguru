'use client'

import React, { useState, useMemo } from 'react'
import { ResolutionList } from './atomic/organisms'
import { CreateResolutionModal } from './CreateResolutionModal'
import { ResolutionDetailsModal } from './ResolutionDetailsModal'
import { Card, CardContent } from '@/features/shared/ui/card'
import { 
  MeetingResolution, 
  ResolutionStatus, 
  ResolutionType,
  CreateResolutionRequest 
} from '@/types/meetings'

interface ResolutionsSectionProps {
  meetingId: string
  resolutions: MeetingResolution[]
  canManage: boolean // true for superusers and meeting organizers
  onCreateResolution: (data: CreateResolutionRequest) => Promise<void>
  onUpdateResolution: (id: string, data: Partial<MeetingResolution>) => Promise<void>
  onDeleteResolution: (id: string) => Promise<void>
}

/**
 * ResolutionsSection - Refactored to use atomic design components
 * 
 * This component now uses the atomic design pattern with:
 * - ResolutionList organism for displaying resolutions
 * - Built-in filtering, sorting, and statistics
 * - Consistent styling and accessibility
 */
export function ResolutionsSection({
  meetingId,
  resolutions,
  canManage,
  onCreateResolution,
  onUpdateResolution,
  onDeleteResolution
}: ResolutionsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<MeetingResolution | null>(null)
  const [filters, setFilters] = useState<{
    status: ResolutionStatus | 'all'
    type: ResolutionType | 'all'
    search: string
  }>({
    status: 'all',
    type: 'all',
    search: ''
  })
  const [sort, setSort] = useState<{
    field: string
    order: 'asc' | 'desc'
  }>({
    field: 'createdAt',
    order: 'desc'
  })

  // Convert MeetingResolution to ResolutionCardProps format
  const resolutionCardData = useMemo(() => {
    return resolutions
      .filter(resolution => {
        const matchesStatus = filters.status === 'all' || resolution.status === filters.status
        const matchesType = filters.type === 'all' || resolution.resolutionType === filters.type
        const matchesSearch = filters.search === '' || 
          resolution.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          resolution.description.toLowerCase().includes(filters.search.toLowerCase())
        
        return matchesStatus && matchesType && matchesSearch
      })
      .map(resolution => ({
        id: resolution.id,
        resolutionNumber: resolution.resolutionNumber,
        title: resolution.title,
        description: resolution.description,
        status: resolution.status,
        type: resolution.resolutionType,
        priority: resolution.priorityLevel,
        proposedAt: resolution.proposedAt,
        votingResults: resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain > 0 ? {
          forPercentage: Math.round((resolution.votesFor / (resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain)) * 100),
          againstPercentage: Math.round((resolution.votesAgainst / (resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain)) * 100),
          abstainPercentage: Math.round((resolution.votesAbstain / (resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain)) * 100),
          participation: Math.round(((resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain) / resolution.totalEligibleVoters) * 100)
        } : undefined,
        compliance: {
          requiresBoardApproval: resolution.requiresBoardApproval,
          requiresShareholderApproval: resolution.requiresShareholderApproval,
          legalReviewRequired: resolution.legalReviewRequired
        },
        actions: {
          onView: () => setSelectedResolution(resolution),
          onEdit: canManage ? () => {
            // Handle edit action
            console.log('Edit resolution:', resolution.id)
          } : undefined,
          onDelete: canManage ? () => onDeleteResolution(resolution.id) : undefined
        },
        canManage
      }))
  }, [resolutions, filters, canManage, onDeleteResolution])

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSort({ field, order })
  }

  const handleCreateResolution = () => {
    setShowCreateModal(true)
  }

  // Statistics cards using the filtered data
  const renderStatistics = () => {
    const stats = {
      total: resolutions.length,
      passed: resolutions.filter(r => r.status === 'passed').length,
      rejected: resolutions.filter(r => r.status === 'rejected').length,
      pending: resolutions.filter(r => r.status === 'proposed').length,
      implementation: resolutions.filter(r => 
        r.status === 'passed' && r.implementationDeadline && 
        new Date(r.implementationDeadline) > new Date()
      ).length
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-blue-600">📄</div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-green-600">✅</div>
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold">{stats.passed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-red-600">❌</div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-yellow-600">⏳</div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-purple-600">⏰</div>
              <div>
                <p className="text-sm text-gray-600">Implementation</p>
                <p className="text-2xl font-bold">{stats.implementation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Simple filters component (this could be extracted as a separate molecule)
  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search resolutions..."
              value={filters.search}
              onChange={(e) => handleFiltersChange({ search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFiltersChange({ status: e.target.value as ResolutionStatus | 'all' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="proposed">Proposed</option>
            <option value="passed">Passed</option>
            <option value="rejected">Rejected</option>
            <option value="tabled">Tabled</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="amended">Amended</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => handleFiltersChange({ type: e.target.value as ResolutionType | 'all' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="motion">Motion</option>
            <option value="amendment">Amendment</option>
            <option value="policy">Policy</option>
            <option value="directive">Directive</option>
            <option value="appointment">Appointment</option>
            <option value="financial">Financial</option>
            <option value="strategic">Strategic</option>
            <option value="other">Other</option>
          </select>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {renderStatistics()}

      {/* Filters */}
      {renderFilters()}

      {/* Resolutions List using atomic design */}
      <ResolutionList
        resolutions={resolutionCardData}
        loading={false}
        emptyMessage={
          filters.status !== 'all' || filters.type !== 'all' || filters.search !== ''
            ? 'No resolutions match your filters'
            : 'No resolutions have been recorded for this meeting yet'
        }
        actions={{
          onCreate: canManage ? handleCreateResolution : undefined
        }}
        sort={{
          field: sort.field,
          order: sort.order,
          onChange: handleSortChange
        }}
        viewMode="card"
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateResolutionModal
          meetingId={meetingId}
          onSubmit={onCreateResolution}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {selectedResolution && (
        <ResolutionDetailsModal
          resolution={selectedResolution}
          canManage={canManage}
          onUpdate={onUpdateResolution}
          onClose={() => setSelectedResolution(null)}
        />
      )}
    </div>
  )
}