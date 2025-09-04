'use client'

import React, { useState, useEffect } from 'react'
import { 
  Building2, 
  Package, 
  Users, 
  Check,
  X,
  Search,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Skeleton } from '@/components/ui/skeleton'

interface Document {
  id: string
  title: string
  organization_id?: string
  organization?: {
    id: string
    name: string
  }
}

interface Organization {
  id: string
  name: string
  description?: string
}

interface Vault {
  id: string
  name: string
  description?: string
  organization_id: string
}

interface BoardMate {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

interface DocumentAttributorProps {
  document: Document
  onComplete?: () => void
}

export function DocumentAttributor({ document, onComplete }: DocumentAttributorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Data
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [vaults, setVaults] = useState<Vault[]>([])
  const [boardMates, setBoardMates] = useState<BoardMate[]>([])
  
  // Selected values
  const [selectedOrganization, setSelectedOrganization] = useState<string>(document.organization_id || '')
  const [selectedVaults, setSelectedVaults] = useState<string[]>([])
  const [selectedBoardMates, setSelectedBoardMates] = useState<string[]>([])
  
  // Filters
  const [vaultSearch, setVaultSearch] = useState('')
  const [boardMateSearch, setBoardMateSearch] = useState('')
  
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Filter vaults when organization changes
    if (selectedOrganization) {
      loadVaults(selectedOrganization)
    } else {
      setVaults([])
      setSelectedVaults([])
    }
  }, [selectedOrganization])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, description')
        .order('name')
      
      if (orgs) {
        setOrganizations(orgs)
      }
      
      // Load existing associations
      await loadExistingAssociations()
      
      // Load BoardMates (all users for now)
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .order('full_name')
      
      if (users) {
        setBoardMates(users)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadVaults = async (organizationId: string) => {
    try {
      const { data: vaultData } = await supabase
        .from('vaults')
        .select('id, name, description, organization_id')
        .eq('organization_id', organizationId)
        .order('name')
      
      if (vaultData) {
        setVaults(vaultData)
      }
    } catch (error) {
      console.error('Error loading vaults:', error)
    }
  }

  const loadExistingAssociations = async () => {
    try {
      // Load existing vault associations
      const { data: vaultAssocs } = await supabase
        .from('vault_assets')
        .select('vault_id')
        .eq('asset_id', document.id)
      
      if (vaultAssocs) {
        setSelectedVaults(vaultAssocs.map(v => v.vault_id))
      }
      
      // Load existing BoardMate shares
      const { data: shares } = await supabase
        .from('asset_shares')
        .select('shared_with_user_id')
        .eq('asset_id', document.id)
      
      if (shares) {
        setSelectedBoardMates(shares.map(s => s.shared_with_user_id))
      }
    } catch (error) {
      console.error('Error loading associations:', error)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update organization
      if (selectedOrganization !== document.organization_id) {
        const { error: orgError } = await supabase
          .from('assets')
          .update({ organization_id: selectedOrganization || null })
          .eq('id', document.id)
        
        if (orgError) throw orgError
      }

      // Update vault associations
      // First, remove existing associations
      await supabase
        .from('vault_assets')
        .delete()
        .eq('asset_id', document.id)
      
      // Then add new associations
      if (selectedVaults.length > 0) {
        const vaultAssociations = selectedVaults.map(vaultId => ({
          vault_id: vaultId,
          asset_id: document.id,
          added_by_user_id: user.id
        }))
        
        const { error: vaultError } = await supabase
          .from('vault_assets')
          .insert(vaultAssociations)
        
        if (vaultError) throw vaultError
      }

      // Update BoardMate shares
      // First, remove existing shares
      await supabase
        .from('asset_shares')
        .delete()
        .eq('asset_id', document.id)
      
      // Then add new shares
      if (selectedBoardMates.length > 0) {
        const shares = selectedBoardMates.map(userId => ({
          asset_id: document.id,
          shared_by_user_id: user.id,
          shared_with_user_id: userId,
          permission_level: 'view'
        }))
        
        const { error: shareError } = await supabase
          .from('asset_shares')
          .insert(shares)
        
        if (shareError) throw shareError
      }

      // Update attribution status
      const attributionStatus = selectedOrganization && selectedVaults.length > 0 
        ? 'complete' 
        : selectedOrganization || selectedVaults.length > 0 
          ? 'partial' 
          : 'pending'
      
      await supabase
        .from('assets')
        .update({ 
          attribution_status: attributionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      toast({
        title: 'Success',
        description: 'Document attributes updated successfully'
      })
      
      onComplete?.()
    } catch (error) {
      console.error('Error saving attributes:', error)
      toast({
        title: 'Error',
        description: 'Failed to save document attributes',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleVault = (vaultId: string) => {
    setSelectedVaults(prev => 
      prev.includes(vaultId)
        ? prev.filter(id => id !== vaultId)
        : [...prev, vaultId]
    )
  }

  const toggleBoardMate = (userId: string) => {
    setSelectedBoardMates(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const filteredVaults = vaults.filter(vault =>
    vault.name.toLowerCase().includes(vaultSearch.toLowerCase())
  )

  const filteredBoardMates = boardMates.filter(user =>
    user.full_name.toLowerCase().includes(boardMateSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(boardMateSearch.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Organization Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Organization
        </Label>
        <Select 
          value={selectedOrganization} 
          onValueChange={setSelectedOrganization}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an organization" />
          </SelectTrigger>
          <SelectContent>
            <div>
              <SelectItem value="">None</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Documents can belong to only one organization
        </p>
      </div>

      {/* Vault Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Vaults
        </Label>
        
        {!selectedOrganization ? (
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
            Please select an organization first to view available vaults
          </div>
        ) : vaults.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
            No vaults available for the selected organization
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vaults..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredVaults.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No vaults found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredVaults.map(vault => (
                    <label
                      key={vault.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedVaults.includes(vault.id)}
                        onCheckedChange={() => toggleVault(vault.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{vault.name}</p>
                        {vault.description && (
                          <p className="text-xs text-gray-500">{vault.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {selectedVaults.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedVaults.map(vaultId => {
                  const vault = vaults.find(v => v.id === vaultId)
                  return vault ? (
                    <Badge key={vaultId} variant="secondary">
                      {vault.name}
                      <button
                        onClick={() => toggleVault(vaultId)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </>
        )}
        
        <p className="text-xs text-gray-500">
          Documents can be associated with multiple vaults
        </p>
      </div>

      {/* BoardMate Sharing */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Share with BoardMates
        </Label>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search BoardMates..."
            value={boardMateSearch}
            onChange={(e) => setBoardMateSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="border rounded-lg max-h-48 overflow-y-auto">
          {filteredBoardMates.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No BoardMates found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredBoardMates.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedBoardMates.includes(user.id)}
                    onCheckedChange={() => toggleBoardMate(user.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {selectedBoardMates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedBoardMates.map(userId => {
              const user = boardMates.find(u => u.id === userId)
              return user ? (
                <Badge key={userId} variant="secondary">
                  {user.full_name}
                  <button
                    onClick={() => toggleBoardMate(userId)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null
            })}
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Selected BoardMates will be able to view and annotate this document
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Attributes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}