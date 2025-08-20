'use client'

import React, { useState, useEffect } from 'react'
import { 
  Package, 
  Plus, 
  FolderPlus,
  Star,
  BookOpen,
  Settings,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/contexts/OrganizationContext'

interface Asset {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  thumbnailUrl?: string
}

interface Vault {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
  memberCount: number
  assetCount: number
  userRole: 'owner' | 'admin' | 'moderator' | 'contributor' | 'viewer'
  organization: {
    id: string
    name: string
    logo_url?: string
  }
}

interface AddToVaultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Asset[]
  onComplete?: (results: any) => void
}

const folderOptions = [
  { value: '/', label: 'Root Folder' },
  { value: '/agenda', label: 'Agenda' },
  { value: '/minutes', label: 'Previous Minutes' },
  { value: '/financial', label: 'Financial Reports' },
  { value: '/committee', label: 'Committee Reports' },
  { value: '/presentations', label: 'Presentations' },
  { value: '/resolutions', label: 'Resolutions' },
  { value: '/supporting', label: 'Supporting Documents' }
]

export function AddToVaultModal({
  open,
  onOpenChange,
  assets,
  onComplete
}: AddToVaultModalProps) {
  const [selectedVault, setSelectedVault] = useState<string>('')
  const [folderPath, setFolderPath] = useState<string>('/')
  const [customFolder, setCustomFolder] = useState<string>('')
  const [useCustomFolder, setUseCustomFolder] = useState<boolean>(false)
  const [displayOrder, setDisplayOrder] = useState<number>(0)
  const [isFeatured, setIsFeatured] = useState<boolean>(false)
  const [isRequiredReading, setIsRequiredReading] = useState<boolean>(false)
  const [isAdding, setIsAdding] = useState<boolean>(false)

  const { 
    currentOrganization,
    vaults,
    isLoadingVaults 
  } = useOrganization()

  // Filter vaults where user can add assets
  const availableVaults = vaults.filter(vault => 
    ['owner', 'admin', 'moderator', 'contributor'].includes(vault.userRole) &&
    ['draft', 'active'].includes(vault.status)
  )

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedVault('')
      setFolderPath('/')
      setCustomFolder('')
      setUseCustomFolder(false)
      setDisplayOrder(0)
      setIsFeatured(false)
      setIsRequiredReading(false)
    }
  }, [open])

  const handleAddToVault = async () => {
    if (!selectedVault || assets.length === 0) return

    const finalFolderPath = useCustomFolder && customFolder.trim() 
      ? `/${customFolder.trim().replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/')
      : folderPath

    setIsAdding(true)
    try {
      const response = await fetch(`/api/vaults/${selectedVault}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assetIds: assets.map(a => a.id),
          folderPath: finalFolderPath,
          displayOrder,
          isFeatured,
          isRequiredReading
        })
      })

      if (response.ok) {
        const result = await response.json()
        onComplete?.(result)
        onOpenChange(false)
      } else {
        const error = await response.json()
        console.error('Failed to add assets to vault:', error)
        alert(`Failed to add assets to vault: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding assets to vault:', error)
      alert('Error adding assets to vault. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const selectedVaultData = availableVaults.find(v => v.id === selectedVault)
  const canAddToVault = selectedVault && assets.length > 0

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Add to Vault</span>
          </DialogTitle>
          <DialogDescription>
            Add {assets.length} {assets.length === 1 ? 'asset' : 'assets'} to a vault for board meeting collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Assets Preview */}
          <div className="space-y-3">
            <Label>Selected Assets ({assets.length})</Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg">
              {assets.map(asset => (
                <div key={asset.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {asset.thumbnailUrl ? (
                      <img 
                        src={asset.thumbnailUrl} 
                        alt={asset.title}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-600">
                        {asset.fileType.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{asset.title}</p>
                    <p className="text-xs text-gray-500">
                      {asset.fileName} • {formatFileSize(asset.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vault Selection */}
          <div className="space-y-3">
            <Label>Select Vault</Label>
            {!currentOrganization ? (
              <div className="text-sm text-gray-500 p-3 border rounded-lg">
                Please select an organization first
              </div>
            ) : isLoadingVaults ? (
              <div className="text-sm text-gray-500 p-3 border rounded-lg">
                Loading vaults...
              </div>
            ) : availableVaults.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 border rounded-lg">
                No vaults available. You need contributor access or higher to add assets to vaults.
              </div>
            ) : (
              <Select value={selectedVault} onValueChange={setSelectedVault}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vault..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVaults.map(vault => (
                    <SelectItem key={vault.id} value={vault.id}>
                      <div className="flex items-center space-x-3 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={(vault as any).organization?.logo_url} 
                            alt={(vault as any).organization?.name}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {getInitials((vault as any).organization?.name || 'V')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{vault.name}</div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>{vault.memberCount} members</span>
                            <span>•</span>
                            <span>{vault.assetCount} assets</span>
                            <Badge variant="outline" className="text-xs ml-1">
                              {vault.userRole}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedVaultData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">{selectedVaultData.name}</span>
                </div>
                {selectedVaultData.description && (
                  <p className="text-sm text-blue-700 mb-2">{selectedVaultData.description}</p>
                )}
                <div className="flex items-center space-x-4 text-xs text-blue-600">
                  <span>{selectedVaultData.memberCount} members</span>
                  <span>•</span>
                  <span>{selectedVaultData.assetCount} assets</span>
                  <span>•</span>
                  <Badge variant="outline" className="bg-white text-blue-700">
                    Your role: {selectedVaultData.userRole}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Folder Organization */}
          <div className="space-y-3">
            <Label>Organization</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-custom-folder"
                  checked={useCustomFolder}
                  onCheckedChange={(checked) => setUseCustomFolder(checked as boolean)}
                />
                <Label htmlFor="use-custom-folder" className="text-sm">
                  Use custom folder
                </Label>
              </div>

              {useCustomFolder ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-folder">Custom Folder Path</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">/</span>
                    <Input
                      id="custom-folder"
                      placeholder="e.g., board-meeting-jan-2025"
                      value={customFolder}
                      onChange={(e) => setCustomFolder(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Folder</Label>
                  <Select value={folderPath} onValueChange={setFolderPath}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {folderOptions.map(folder => (
                        <SelectItem key={folder.value} value={folder.value}>
                          {folder.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Asset Settings */}
          <div className="space-y-4">
            <Label>Asset Settings</Label>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="display-order">Display Order</Label>
                <Input
                  id="display-order"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Lower numbers appear first (0 = highest priority)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-featured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
                />
                <Label htmlFor="is-featured" className="text-sm flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Mark as featured
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-required"
                  checked={isRequiredReading}
                  onCheckedChange={(checked) => setIsRequiredReading(checked as boolean)}
                />
                <Label htmlFor="is-required" className="text-sm flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Mark as required reading
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {canAddToVault ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Ready to add {assets.length} {assets.length === 1 ? 'asset' : 'assets'}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>Select a vault to continue</span>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleAddToVault}
              disabled={!canAddToVault || isAdding}
            >
              {isAdding ? (
                <>
                  <Plus className="h-4 w-4 mr-2 animate-pulse" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Vault
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}