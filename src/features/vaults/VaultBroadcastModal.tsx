'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  UserPlus, 
  Mail, 
  Send, 
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  Minus
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Textarea } from '@/features/shared/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Checkbox } from '@/features/shared/ui/checkbox'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

interface VaultBroadcastModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vault: {
    id: string
    name: string
    description?: string
    organizationId: string
  }
  onInviteComplete?: (results: any) => void
}

interface InvitationEntry {
  id: string
  type: 'user' | 'email'
  user?: User
  email?: string
  permissionLevel: 'viewer' | 'contributor' | 'moderator' | 'admin'
  customMessage?: string
}

const permissionLevels = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Can view vault contents and download files'
  },
  {
    value: 'contributor',
    label: 'Contributor', 
    description: 'Can view, download, upload files and add comments'
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Can manage content and invite new members'
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to vault settings and member management'
  }
]

export function VaultBroadcastModal({
  open,
  onOpenChange,
  vault,
  onInviteComplete
}: VaultBroadcastModalProps) {
  const [invitations, setInvitations] = useState<InvitationEntry[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Bulk settings
  const [bulkPermissionLevel, setBulkPermissionLevel] = useState<string>('viewer')
  const [bulkMessage, setBulkMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  
  // Input states
  const [emailInput, setEmailInput] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')

  // Load available users (organization members)
  useEffect(() => {
    if (open && vault.organizationId) {
      loadAvailableUsers()
    }
  }, [open, vault.organizationId])

  // Initialize with empty invitation
  useEffect(() => {
    if (open && invitations.length === 0) {
      addInvitation()
    }
  }, [open])

  const loadAvailableUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch(`/api/organizations/${vault.organizationId}/members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.members?.map((member: any) => ({
          id: member.user.id,
          email: member.user.email,
          name: member.user.name,
          avatar_url: member.user.avatar_url
        })) || [])
      } else {
        console.error('Failed to load organization members')
        setAvailableUsers([])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setAvailableUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const addInvitation = () => {
    const newInvitation: InvitationEntry = {
      id: Date.now().toString(),
      type: 'email',
      permissionLevel: bulkPermissionLevel as any,
      customMessage: bulkMessage
    }
    setInvitations(prev => [...prev, newInvitation])
  }

  const removeInvitation = (id: string) => {
    setInvitations(prev => prev.filter(inv => inv.id !== id))
  }

  const updateInvitation = (id: string, updates: Partial<InvitationEntry>) => {
    setInvitations(prev => prev.map(inv => 
      inv.id === id ? { ...inv, ...updates } : inv
    ))
  }

  const addUserInvitation = (user: User) => {
    // Check if user is already invited
    const existingInvitation = invitations.find(inv => 
      (inv.type === 'user' && inv.user?.id === user.id) ||
      (inv.type === 'email' && inv.email === user.email)
    )
    
    if (existingInvitation) {
      return
    }

    const newInvitation: InvitationEntry = {
      id: Date.now().toString(),
      type: 'user',
      user,
      permissionLevel: bulkPermissionLevel as any,
      customMessage: bulkMessage
    }
    
    setInvitations(prev => [...prev, newInvitation])
    setUserSearchTerm('')
  }

  const addEmailInvitation = () => {
    if (!emailInput.trim() || !emailInput.includes('@')) return

    // Check if email is already invited
    const existingInvitation = invitations.find(inv => 
      (inv.type === 'email' && inv.email === emailInput.trim()) ||
      (inv.type === 'user' && inv.user?.email === emailInput.trim())
    )
    
    if (existingInvitation) {
      setEmailInput('')
      return
    }

    const newInvitation: InvitationEntry = {
      id: Date.now().toString(),
      type: 'email',
      email: emailInput.trim(),
      permissionLevel: bulkPermissionLevel as any,
      customMessage: bulkMessage
    }
    
    setInvitations(prev => [...prev, newInvitation])
    setEmailInput('')
  }

  const applyBulkSettings = () => {
    setInvitations(prev => prev.map(inv => ({
      ...inv,
      permissionLevel: bulkPermissionLevel as any,
      customMessage: bulkMessage
    })))
  }

  const handleSendInvitations = async () => {
    const validInvitations = invitations.filter(inv => 
      (inv.type === 'user' && inv.user) || 
      (inv.type === 'email' && inv.email && inv.email.includes('@'))
    )

    if (validInvitations.length === 0) {
      return
    }

    setIsSending(true)
    try {
      const requestData = {
        userIds: validInvitations
          .filter(inv => inv.type === 'user')
          .map(inv => inv.user!.id),
        emails: validInvitations
          .filter(inv => inv.type === 'email')
          .map(inv => inv.email!),
        permissionLevel: bulkPermissionLevel,
        personalMessage: bulkMessage || undefined,
        expiresAt: expiresAt || undefined,
        sendNotification
      }

      const response = await fetch(`/api/vaults/${vault.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const results = await response.json()
        onInviteComplete?.(results)
        onOpenChange(false)
        
        // Reset form
        setInvitations([])
        setBulkMessage('')
        setEmailInput('')
        setUserSearchTerm('')
        setExpiresAt('')
      } else {
        const error = await response.json()
        console.error('Failed to send invitations:', error)
        alert('Failed to send invitations. Please try again.')
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      alert('Error sending invitations. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const filteredUsers = availableUsers.filter(user => 
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Invite to {vault.name}</span>
          </DialogTitle>
          <DialogDescription>
            Broadcast this vault to multiple users at once. Set permissions and send personalized invitations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          {/* Left Column - User Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Users Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Add Invitees</h3>
                <Badge variant="outline">
                  {invitations.filter(inv => inv.user || inv.email).length} selected
                </Badge>
              </div>

              {/* User Search */}
              <div className="space-y-2">
                <Label htmlFor="user-search">Search Organization Members</Label>
                <div className="relative">
                  <Input
                    id="user-search"
                    placeholder="Search by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <Users className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                </div>
                
                {userSearchTerm && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.slice(0, 5).map(user => (
                        <button
                          key={user.id}
                          onClick={() => addUserInvitation(user)}
                          className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 text-left"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} alt={user.name || user.email} />
                            <AvatarFallback>
                              {getInitials(user.name || user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name || user.email}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email-input">Or invite by email</Label>
                <div className="flex space-x-2">
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="Enter email address..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addEmailInvitation()
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addEmailInvitation}
                    disabled={!emailInput.trim() || !emailInput.includes('@')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Selected Invitations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Selected Invitees</h3>
                {invitations.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyBulkSettings}
                  >
                    Apply Bulk Settings
                  </Button>
                )}
              </div>

              {invitations.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {invitations.map(invitation => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {invitation.type === 'user' && invitation.user ? (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={invitation.user.avatar_url} alt={invitation.user.name || invitation.user.email} />
                              <AvatarFallback>
                                {getInitials(invitation.user.name || invitation.user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{invitation.user.name || invitation.user.email}</p>
                              <p className="text-xs text-gray-500">{invitation.user.email}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Mail className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{invitation.email}</p>
                              <p className="text-xs text-gray-500">External invitation</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Select
                          value={invitation.permissionLevel}
                          onValueChange={(value) => updateInvitation(invitation.id, { permissionLevel: value as any })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {permissionLevels.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvitation(invitation.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No invitees selected</p>
                  <p className="text-sm text-gray-400 mt-1">Search for users or enter email addresses above</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6 lg:border-l lg:pl-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Invitation Settings</h3>

              {/* Bulk Permission Level */}
              <div className="space-y-2">
                <Label>Default Permission Level</Label>
                <Select value={bulkPermissionLevel} onValueChange={setBulkPermissionLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {bulkMessage.length}/500 characters
                </p>
              </div>

              {/* Expiration Date */}
              <div className="space-y-2">
                <Label htmlFor="expires">Expires At (Optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              {/* Notification Settings */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-notification"
                    checked={sendNotification}
                    onCheckedChange={(checked) => setSendNotification(checked as boolean)}
                  />
                  <Label htmlFor="send-notification" className="text-sm">
                    Send email notifications
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Invitees will receive an email with invitation details
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>
              {invitations.filter(inv => inv.user || inv.email).length} invitations will be sent
            </span>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSendInvitations}
              disabled={isSending || invitations.filter(inv => inv.user || inv.email).length === 0}
            >
              {isSending ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitations
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}