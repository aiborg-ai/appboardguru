'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  Package, 
  Plus, 
  Settings, 
  Users, 
  Star,
  Clock,
  Archive,
  AlertTriangle,
  MoreVertical,
  Building2,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function VaultsPage() {
  const { 
    vaults, 
    currentVault,
    currentOrganization,
    selectVault,
    isLoadingVaults 
  } = useOrganization()

  const getVaultStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'draft': return 'text-gray-600'
      case 'archived': return 'text-gray-400'
      case 'expired': return 'text-red-600'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-600'
    }
  }

  const getVaultStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Star
      case 'draft': return Clock
      case 'archived': return Archive
      case 'expired': return AlertTriangle
      case 'cancelled': return AlertTriangle
      default: return Package
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleVaultSelect = (vault: any) => {
    selectVault(vault)
    window.location.href = `/dashboard/vaults/${vault.id}`
  }

  if (isLoadingVaults) {
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
              <Package className="h-7 w-7 text-blue-600" />
              Vaults
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your secure document vaults and collaborate with team members
            </p>
            {currentOrganization && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Building2 className="h-4 w-4" />
                <span>Organization: {currentOrganization.name}</span>
              </div>
            )}
          </div>
          <Button 
            onClick={() => window.location.href = '/dashboard/vaults/create'} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Vault
          </Button>
        </div>

        {/* Vaults Grid */}
        {vaults.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Vaults Yet</h3>
            <p className="text-gray-600 mb-6">
              {currentOrganization 
                ? `Create your first vault in ${currentOrganization.name} to securely store and share documents`
                : 'Select an organization first, then create your first vault to get started'
              }
            </p>
            {currentOrganization ? (
              <Button 
                onClick={() => window.location.href = '/dashboard/vaults/create'} 
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Vault
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.href = '/dashboard/organizations'} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Go to Organizations
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((vault) => {
              const StatusIcon = getVaultStatusIcon(vault.status)
              const isSelected = currentVault?.id === vault.id
              
              return (
                <Card 
                  key={vault.id} 
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                    isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
                  )}
                  onClick={() => handleVaultSelect(vault)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className={cn(
                            "h-5 w-5",
                            getVaultStatusColor(vault.status)
                          )} />
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {vault.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", 
                              vault.status === 'active' ? 'bg-green-100 text-green-800' :
                              vault.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              vault.status === 'archived' ? 'bg-gray-100 text-gray-600' :
                              'bg-red-100 text-red-800'
                            )}
                          >
                            {vault.status}
                          </Badge>
                          {vault.priority !== 'medium' && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getPriorityColor(vault.priority))}
                            >
                              {vault.priority}
                            </Badge>
                          )}
                          {isSelected && (
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
                            window.location.href = `/dashboard/vaults/${vault.id}/settings`
                          }}>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/dashboard/vaults/${vault.id}`
                          }}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Open Vault
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vault.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {vault.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {vault.memberCount || 0} members
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-4 w-4" />
                          {vault.assetCount || 0} assets
                        </span>
                      </div>
                    </div>
                    {vault.lastActivityAt && (
                      <div className="mt-2 text-xs text-gray-400">
                        Last activity: {new Date(vault.lastActivityAt).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Current Vault Info */}
        {currentVault && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Currently working in vault: {currentVault.name}
                </p>
                <p className="text-xs text-blue-700">
                  All your document activities will be associated with this vault
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}