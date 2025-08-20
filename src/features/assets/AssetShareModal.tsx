'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  Search, 
  User, 
  Mail, 
  Shield, 
  Eye, 
  Download, 
  Edit, 
  Settings,
  UserPlus,
  Clock,
  Calendar,
  Send,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'

interface BoardMate {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department?: string
  isOnline?: boolean
}

interface Asset {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  owner: {
    id: string
    name: string
    email: string
  }
  sharedWith: Array<{
    userId: string
    userName: string
    permission: 'view' | 'download' | 'edit' | 'admin'
  }>
}

interface ShareData {
  userIds: string[]
  permission: 'view' | 'download' | 'edit' | 'admin'
  message?: string
  expiresAt?: string
  notifyUsers: boolean
}

interface AssetShareModalProps {
  asset: Asset
  onClose: () => void
  onShare: (shareData: ShareData) => void
}

// Mock BoardMates data
const mockBoardMates: BoardMate[] = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane.smith@boardguru.ai',
    role: 'Board Chair',
    department: 'Executive',
    isOnline: true
  },
  {
    id: '2',
    name: 'Robert Johnson',
    email: 'robert.johnson@boardguru.ai',
    role: 'Board Member',
    department: 'Finance',
    isOnline: false
  },
  {
    id: '3',
    name: 'Sarah Williams',
    email: 'sarah.williams@boardguru.ai',
    role: 'Secretary',
    department: 'Legal',
    isOnline: true
  },
  {
    id: '4',
    name: 'Michael Brown',
    email: 'michael.brown@boardguru.ai',
    role: 'Board Member',
    department: 'Strategy',
    isOnline: false
  },
  {
    id: '5',
    name: 'Lisa Davis',
    email: 'lisa.davis@boardguru.ai',
    role: 'Board Member',
    department: 'HR',
    isOnline: true
  }
]

export function AssetShareModal({ asset, onClose, onShare }: AssetShareModalProps) {
  const [boardMates, setBoardMates] = useState<BoardMate[]>(mockBoardMates)
  const [filteredBoardMates, setFilteredBoardMates] = useState<BoardMate[]>(mockBoardMates)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [permission, setPermission] = useState<'view' | 'download' | 'edit' | 'admin'>('view')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notifyUsers, setNotifyUsers] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Filter BoardMates based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredBoardMates(boardMates)
    } else {
      const filtered = boardMates.filter(mate =>
        mate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mate.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mate.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredBoardMates(filtered)
    }
  }, [searchQuery, boardMates])

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredBoardMates.map(mate => mate.id))
    const newSelected = new Set(selectedUsers)
    
    // Check if all filtered users are already selected
    const allSelected = filteredBoardMates.every(mate => selectedUsers.has(mate.id))
    
    if (allSelected) {
      // Deselect all filtered users
      filteredBoardMates.forEach(mate => newSelected.delete(mate.id))
    } else {
      // Select all filtered users
      filteredBoardMates.forEach(mate => newSelected.add(mate.id))
    }
    
    setSelectedUsers(newSelected)
  }

  const getPermissionIcon = (perm: string) => {
    switch (perm) {
      case 'view': return Eye
      case 'download': return Download
      case 'edit': return Edit
      case 'admin': return Settings
      default: return Eye
    }
  }

  const getPermissionColor = (perm: string) => {
    switch (perm) {
      case 'view': return 'bg-gray-100 text-gray-800'
      case 'download': return 'bg-blue-100 text-blue-800'
      case 'edit': return 'bg-green-100 text-green-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPermissionDescription = (perm: string) => {
    switch (perm) {
      case 'view': return 'Can view the asset but cannot download'
      case 'download': return 'Can view and download the asset'
      case 'edit': return 'Can view, download, and modify the asset'
      case 'admin': return 'Full access including sharing permissions'
      default: return ''
    }
  }

  const handleShare = () => {
    const shareData: ShareData = {
      userIds: Array.from(selectedUsers),
      permission,
      message: message.trim() || undefined,
      expiresAt: expiresAt || undefined,
      notifyUsers
    }
    
    onShare(shareData)
  }

  const copyShareLink = async () => {
    const shareLink = `${window.location.origin}/shared/${asset.id}/${Date.now()}`
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const currentlySharedUserIds = new Set(asset.sharedWith.map(share => share.userId))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Asset</h2>
              <p className="text-sm text-gray-600 mt-1">{asset.title}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Permission Level Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permission Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['view', 'download', 'edit', 'admin'] as const).map((perm) => {
                const Icon = getPermissionIcon(perm)
                return (
                  <button
                    key={perm}
                    onClick={() => setPermission(perm)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      permission === perm 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium capitalize">{perm}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {getPermissionDescription(perm)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* BoardMates Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select BoardMates
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllFiltered}
                className="text-xs"
              >
                {filteredBoardMates.every(mate => selectedUsers.has(mate.id)) 
                  ? 'Deselect All' 
                  : 'Select All'
                }
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search BoardMates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* BoardMates List */}
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {filteredBoardMates.map((mate) => {
                const isSelected = selectedUsers.has(mate.id)
                const isCurrentlyShared = currentlySharedUserIds.has(mate.id)
                
                return (
                  <div
                    key={mate.id}
                    className={`flex items-center space-x-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleUserSelection(mate.id)}
                  >
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUserSelection(mate.id)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                    </div>

                    <div className="flex-shrink-0">
                      {mate.avatar ? (
                        <img
                          src={mate.avatar}
                          alt={mate.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {mate.name}
                        </p>
                        {mate.isOnline && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                        {isCurrentlyShared && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Already shared
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{mate.role}</span>
                        {mate.department && (
                          <>
                            <span>•</span>
                            <span>{mate.department}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredBoardMates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No BoardMates found matching your search</p>
              </div>
            )}
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note about why you're sharing this asset..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                {/* Expiration Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="pl-10"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyUsers"
                    checked={notifyUsers}
                    onChange={(e) => setNotifyUsers(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="notifyUsers" className="text-sm text-gray-700">
                    Notify users via email
                  </label>
                </div>

                {/* Share Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direct Share Link
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      value={`${window.location.origin}/shared/${asset.id}`}
                      readOnly
                      className="flex-1 bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      disabled={copiedLink}
                    >
                      {copiedLink ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Users Summary */}
          {selectedUsers.size > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Users ({selectedUsers.size})
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedUsers).map(userId => {
                  const user = boardMates.find(mate => mate.id === userId)
                  if (!user) return null
                  
                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {user.name}
                      <button
                        onClick={() => toggleUserSelection(userId)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedUsers.size > 0 
                ? `Sharing with ${selectedUsers.size} BoardMate${selectedUsers.size > 1 ? 's' : ''}`
                : 'Select BoardMates to share with'
              }
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={selectedUsers.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Share Asset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}