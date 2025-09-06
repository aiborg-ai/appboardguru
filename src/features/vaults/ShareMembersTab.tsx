'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, 
  User, 
  Crown, 
  Shield, 
  Eye, 
  Edit, 
  UserCheck,
  Check,
  ChevronDown 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface BoardMate {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
  department?: string
  is_online?: boolean
  current_access?: 'owner' | 'admin' | 'member' | 'viewer' | null
}

interface ShareMembersTabProps {
  vaultId: string
  organizationId?: string
  onShare: () => void
  isSharing: boolean
  setIsSharing: (value: boolean) => void
}

const PERMISSION_LEVELS = [
  { 
    value: 'viewer', 
    label: 'Viewer', 
    description: 'Can view vault contents only',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800'
  },
  { 
    value: 'member', 
    label: 'Member', 
    description: 'Can view and download assets',
    icon: UserCheck,
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Can manage vault and invite others',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    value: 'owner', 
    label: 'Owner', 
    description: 'Full control and transfer ownership',
    icon: Crown,
    color: 'bg-yellow-100 text-yellow-800'
  }
]

// Mock data - replace with actual API call
const mockBoardMates: BoardMate[] = [
  {
    id: '1',
    email: 'jane.smith@company.com',
    full_name: 'Jane Smith',
    role: 'Board Chair',
    department: 'Executive',
    is_online: true,
    current_access: null
  },
  {
    id: '2',
    email: 'john.doe@company.com',
    full_name: 'John Doe',
    role: 'CFO',
    department: 'Finance',
    is_online: false,
    current_access: 'viewer'
  },
  {
    id: '3',
    email: 'sarah.wilson@company.com',
    full_name: 'Sarah Wilson',
    role: 'Board Secretary',
    department: 'Legal',
    is_online: true,
    current_access: null
  },
  {
    id: '4',
    email: 'mike.brown@company.com',
    full_name: 'Mike Brown',
    role: 'Board Member',
    department: 'Operations',
    is_online: false,
    current_access: 'member'
  }
]

export function ShareMembersTab({ 
  vaultId, 
  organizationId, 
  onShare, 
  isSharing, 
  setIsSharing 
}: ShareMembersTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [permission, setPermission] = useState<string>('viewer')
  const [message, setMessage] = useState('')
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [boardMates, setBoardMates] = useState<BoardMate[]>(mockBoardMates)

  // Filter board mates based on search
  const filteredBoardMates = useMemo(() => {
    if (!searchQuery) return boardMates
    
    const query = searchQuery.toLowerCase()
    return boardMates.filter(mate => 
      mate.full_name?.toLowerCase().includes(query) ||
      mate.email.toLowerCase().includes(query) ||
      mate.role?.toLowerCase().includes(query) ||
      mate.department?.toLowerCase().includes(query)
    )
  }, [searchQuery, boardMates])

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Select all filtered users
  const toggleSelectAll = () => {
    const filteredIds = filteredBoardMates
      .filter(m => !m.current_access) // Only select users without access
      .map(m => m.id)
    
    const allSelected = filteredIds.every(id => selectedUsers.has(id))
    
    if (allSelected) {
      // Deselect all
      setSelectedUsers(new Set())
    } else {
      // Select all filtered
      setSelectedUsers(new Set(filteredIds))
    }
  }

  // Handle share action
  const handleShare = async () => {
    if (selectedUsers.size === 0) return
    
    setIsSharing(true)
    
    try {
      // TODO: Call API to share vault
      const shareData = {
        vault_id: vaultId,
        user_ids: Array.from(selectedUsers),
        permission,
        message: message.trim() || undefined,
        expires_in: expiresIn === 'never' ? null : expiresIn
      }
      
      console.log('Sharing vault with:', shareData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Clear selections
      setSelectedUsers(new Set())
      setMessage('')
      
      onShare()
    } catch (error) {
      console.error('Failed to share vault:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const getPermissionIcon = (perm: string) => {
    const level = PERMISSION_LEVELS.find(p => p.value === perm)
    return level?.icon || Eye
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label>Search Members</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Permission Level */}
      <div className="space-y-2">
        <Label>Permission Level</Label>
        <Select value={permission} onValueChange={setPermission}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_LEVELS.map((level) => {
              const Icon = level.icon
              return (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-gray-500">{level.description}</div>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Members</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="text-xs"
          >
            {filteredBoardMates.filter(m => !m.current_access).every(m => selectedUsers.has(m.id)) 
              ? 'Deselect All' 
              : 'Select All'}
          </Button>
        </div>
        
        <ScrollArea className="h-[240px] border rounded-lg p-2">
          <div className="space-y-2">
            {filteredBoardMates.map((mate) => (
              <div
                key={mate.id}
                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  mate.current_access ? 'opacity-60' : 'cursor-pointer'
                }`}
                onClick={() => !mate.current_access && toggleUserSelection(mate.id)}
              >
                <Checkbox
                  checked={selectedUsers.has(mate.id)}
                  disabled={!!mate.current_access}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleUserSelection(mate.id)}
                />
                
                <Avatar className="h-8 w-8">
                  <AvatarImage src={mate.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(mate.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{mate.full_name || mate.email}</span>
                    {mate.is_online && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {mate.role} {mate.department && `• ${mate.department}`}
                  </div>
                </div>
                
                {mate.current_access && (
                  <Badge variant="secondary" className="text-xs">
                    {mate.current_access}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {selectedUsers.size > 0 && (
          <div className="text-sm text-gray-600">
            {selectedUsers.size} member{selectedUsers.size !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Optional Message */}
      <div className="space-y-2">
        <Label>Message (Optional)</Label>
        <Textarea
          placeholder="Add a message for the invitees..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <Label>Access Expiration</Label>
        <Select value={expiresIn} onValueChange={setExpiresIn}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="1y">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Share Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="default"
          onClick={handleShare}
          disabled={selectedUsers.size === 0 || isSharing}
        >
          {isSharing ? 'Sharing...' : `Share with ${selectedUsers.size} Member${selectedUsers.size !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}