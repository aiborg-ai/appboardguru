'use client'

import React, { useState } from 'react'
import { 
  Users, 
  UserPlus,
  Shield,
  Mail,
  MoreVertical,
  Search,
  Filter,
  Crown,
  User,
  Eye,
  Edit,
  UserMinus,
  MessageSquare,
  Activity,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import { cn } from '@/lib/utils'
// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

interface Member {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string
  user: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

interface VaultMembersListProps {
  vaultId: string
  members: Member[]
}

export default function VaultMembersList({ vaultId, members: initialMembers }: VaultMembersListProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  
  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'editor': return 'bg-green-100 text-green-800 border-green-200'
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'member': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Shield
      case 'editor': return Edit
      case 'viewer': return Eye
      default: return User
    }
  }
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'inactive':
        return (
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )
      default:
        return null
    }
  }
  
  // Filter members
  const filteredMembers = members.filter(member => {
    if (searchQuery && !member.user.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !member.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false
    }
    if (statusFilter !== 'all' && member.status !== statusFilter) {
      return false
    }
    return true
  })
  
  // Group members by role
  const groupedMembers = filteredMembers.reduce((acc, member) => {
    const role = member.role
    if (!acc[role]) acc[role] = []
    acc[role].push(member)
    return acc
  }, {} as Record<string, Member[]>)
  
  // Role order for display
  const roleOrder = ['owner', 'admin', 'editor', 'member', 'viewer']
  
  // Handle member actions
  const handleChangeRole = (member: Member, newRole: string) => {
    toast.info(`Changing ${member.user.full_name || member.user.email} role to ${newRole}`)
    // TODO: Implement role change
  }
  
  const handleRemoveMember = (member: Member) => {
    if (confirm(`Are you sure you want to remove ${member.user.full_name || member.user.email}?`)) {
      toast.info(`Removing ${member.user.full_name || member.user.email}`)
      // TODO: Implement member removal
    }
  }
  
  const handleSendMessage = (member: Member) => {
    toast.info(`Opening chat with ${member.user.full_name || member.user.email}`)
    // TODO: Implement messaging
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Vault Members
            <Badge variant="secondary" className="ml-2">{filteredMembers.length}</Badge>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage members and their permissions in this vault
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Members
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-500">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Invite members to collaborate on this vault'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {roleOrder.map(role => {
            if (!groupedMembers[role] || groupedMembers[role].length === 0) return null
            
            const RoleIcon = getRoleIcon(role)
            
            return (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RoleIcon className="h-4 w-4" />
                    <span className="capitalize">{role}s</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupedMembers[role].length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedMembers[role].map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {member.user.avatar_url ? (
                              <AvatarImage src={member.user.avatar_url} />
                            ) : (
                              <AvatarFallback>
                                {member.user.full_name 
                                  ? member.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                  : member.user.email[0].toUpperCase()
                                }
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.user.full_name || member.user.email}
                            </p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getRoleColor(member.role))}
                          >
                            {member.role}
                          </Badge>
                          
                          {getStatusBadge(member.status)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-4">
                            <p className="text-xs text-gray-500">Joined</p>
                            <p className="text-sm text-gray-700">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendMessage(member)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <User className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendMessage(member)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Activity className="h-4 w-4 mr-2" />
                                View Activity
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              {member.role !== 'owner' && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Remove from Vault
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
            </span>
            <Badge variant="secondary" className="text-xs">2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">jane.doe@example.com</p>
                  <p className="text-sm text-gray-500">Invited as Editor • 2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Resend</Button>
                <Button variant="ghost" size="sm" className="text-red-600">Cancel</Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>RS</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">robert.smith@example.com</p>
                  <p className="text-sm text-gray-500">Invited as Viewer • 5 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Resend</Button>
                <Button variant="ghost" size="sm" className="text-red-600">Cancel</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}