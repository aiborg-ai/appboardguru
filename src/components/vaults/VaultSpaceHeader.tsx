import React from 'react'
import { 
  Package, 
  Users, 
  FolderOpen, 
  Calendar,
  Shield,
  ChevronRight,
  Upload,
  UserPlus,
  Share2,
  Download,
  Settings,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

interface VaultSpaceHeaderProps {
  vault: {
    id: string
    name: string
    description?: string
    status: string
    priority: string
    is_public: boolean
    created_at: string
    member_count?: number
    asset_count?: number
    organization?: {
      name: string
    }
  }
  onBack: () => void
  onUpload: () => void
  onInvite: () => void
  onShare: () => void
  onSettings: () => void
}

export default function VaultSpaceHeader({
  vault,
  onBack,
  onUpload,
  onInvite,
  onShare,
  onSettings
}: VaultSpaceHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'archived': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'expired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  return (
    <div className="bg-white border-b">
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <button
            onClick={onBack}
            className="hover:text-blue-600 flex items-center gap-1"
          >
            <Package className="h-4 w-4" />
            Vaults
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">{vault.name}</span>
        </div>
        
        {/* Vault Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{vault.name}</h1>
              <Badge className={cn("text-xs", getStatusColor(vault.status))}>
                {vault.status}
              </Badge>
              {vault.priority !== 'medium' && (
                <Badge variant="outline" className={cn("text-xs", getPriorityColor(vault.priority))}>
                  {vault.priority} priority
                </Badge>
              )}
              {vault.is_public && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            
            {vault.description && (
              <p className="text-gray-600 mb-4 max-w-3xl">{vault.description}</p>
            )}
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  <strong>{vault.member_count || 0}</strong> Members
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  <strong>{vault.asset_count || 0}</strong> Assets
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  Created {new Date(vault.created_at).toLocaleDateString()}
                </span>
              </div>
              {vault.organization && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{vault.organization.name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={onUpload}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={onInvite}
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export Vault
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Archive Vault
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}