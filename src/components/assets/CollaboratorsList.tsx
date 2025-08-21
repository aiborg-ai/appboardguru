'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  User, 
  Clock, 
  Eye, 
  Edit, 
  MessageSquare,
  X,
  Crown,
  Shield,
  UserCheck
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CollaboratorsListProps {
  assetId: string
  onClose: () => void
}

interface Collaborator {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  lastAccessed?: string
  annotationCount: number
  isOnline: boolean
  permissions: {
    canView: boolean
    canComment: boolean
    canEdit: boolean
    canShare: boolean
  }
}

export function CollaboratorsList({ assetId, onClose }: CollaboratorsListProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch collaborators
  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/collaborators`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch collaborators')
      }
      
      setCollaborators(result.data || [])
    } catch (error) {
      console.error('Error fetching collaborators:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get role icon and color
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner':
        return { icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Owner' }
      case 'admin':
        return { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', label: 'Admin' }
      case 'member':
        return { icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Member' }
      case 'viewer':
        return { icon: Eye, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Viewer' }
      default:
        return { icon: User, color: 'text-gray-600', bg: 'bg-gray-100', label: 'User' }
    }
  }

  useEffect(() => {
    fetchCollaborators()
  }, [assetId])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Collaborators</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mt-1">
          {collaborators.length} people have access to this document
        </p>
      </div>

      {/* Collaborators List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : collaborators.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Collaborators</h4>
            <p className="text-gray-600 text-sm">
              This document hasn't been shared with anyone yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {collaborators.map((collaborator) => {
              const roleDisplay = getRoleDisplay(collaborator.role)
              const RoleIcon = roleDisplay.icon

              return (
                <div key={collaborator.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {collaborator.avatarUrl ? (
                        <img
                          src={collaborator.avatarUrl}
                          alt={collaborator.fullName}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Online indicator */}
                      {collaborator.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {collaborator.fullName}
                        </p>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleDisplay.bg} ${roleDisplay.color}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleDisplay.label}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 truncate">
                        {collaborator.email}
                      </p>

                      {/* Activity Stats */}
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{collaborator.annotationCount} annotations</span>
                        </div>
                        
                        {collaborator.lastAccessed && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(collaborator.lastAccessed))} ago
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Permissions */}
                      <div className="mt-2 flex items-center space-x-2">
                        {collaborator.permissions.canView && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </span>
                        )}
                        {collaborator.permissions.canComment && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Comment
                          </span>
                        )}
                        {collaborator.permissions.canEdit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{collaborators.filter(c => c.isOnline).length} online</span>
          <span>{collaborators.length} total collaborators</span>
        </div>
      </div>
    </div>
  )
}