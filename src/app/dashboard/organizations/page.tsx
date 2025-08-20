'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { CreateOrganizationModal } from '@/components/organizations/CreateOrganizationModal'
import { OrganizationSettings } from '@/components/organizations/OrganizationSettings'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  Crown,
  Calendar,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function OrganizationsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  const { 
    organizations, 
    currentOrganization,
    selectOrganization,
    isLoadingOrganizations 
  } = useOrganization()

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    // Organization list will be updated automatically through context
  }

  const handleSettingsOpen = (orgId: string) => {
    setSelectedOrgId(orgId)
    setShowSettings(true)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    setSelectedOrgId(null)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3" />
      case 'admin': return <Settings className="h-3 w-3" />
      default: return <Users className="h-3 w-3" />
    }
  }

  if (isLoadingOrganizations) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-7 w-7 text-blue-600" />
              Organizations
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your organizations and switch between different workspaces
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Organization
          </Button>
        </div>

        {/* Organizations Grid */}
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first organization to get started with BoardGuru
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Organization
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card 
                key={org.id} 
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  currentOrganization?.id === org.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                }`}
                onClick={() => selectOrganization(org)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {org.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={`${getRoleColor((org as any).role)} text-xs`}
                        >
                          {getRoleIcon((org as any).role)}
                          <span className="ml-1 capitalize">{(org as any).role}</span>
                        </Badge>
                        {currentOrganization?.id === org.id && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleSettingsOpen(org.id)
                        }}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {org.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {org.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {(org as any).memberCount || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Current Organization Info */}
        {currentOrganization && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Currently working in: {currentOrganization.name}
                </p>
                <p className="text-xs text-blue-700">
                  All your activities and data will be associated with this organization
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Organization Modal */}
        <CreateOrganizationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Organization Settings Modal */}
        {showSettings && selectedOrgId && (
          <OrganizationSettings
            organizationId={selectedOrgId}
            onClose={handleSettingsClose}
          />
        )}
      </div>
    </DashboardLayout>
  )
}