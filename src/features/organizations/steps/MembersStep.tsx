'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Search, 
  Plus,
  Mail,
  UserPlus,
  Check,
  X,
  Crown,
  Shield,
  Eye,
  Edit,
  FileText,
  Import,
  Send,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrganizationWizardData, 
  MemberInvitation,
  ExistingMember,
  OrganizationRole
} from '../types';

interface MembersStepProps {
  data: OrganizationWizardData;
  onUpdate: (updates: Partial<OrganizationWizardData>) => void;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  department?: string;
  last_active?: string;
}

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Full administrative access and billing control'
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Manage organization settings and members'
  },
  member: {
    label: 'Member',
    icon: Edit,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Create and manage content'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'View and comment on content'
  }
};

const DEPARTMENTS = [
  'Board of Directors',
  'Executive Leadership',
  'Finance',
  'Legal',
  'Operations',
  'Human Resources',
  'Marketing',
  'Technology',
  'Compliance',
  'Other'
];

export default function MembersStep({ data, onUpdate }: MembersStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newInvitation, setNewInvitation] = useState<MemberInvitation>({
    email: '',
    fullName: '',
    role: 'member',
    department: '',
    personalMessage: ''
  });
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Load existing users for search
  useEffect(() => {
    const loadUsers = async () => {
      if (searchTerm.length < 2) {
        setExistingUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
          const result = await response.json();
          setExistingUsers(result.users || []);
        }
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Add existing user to selection
  const handleAddExistingUser = (user: User, role: OrganizationRole = 'member') => {
    const existingMember: ExistingMember = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      role,
      department: user.department
    };

    if (!data.selectedMembers.find(m => m.id === user.id)) {
      onUpdate({
        selectedMembers: [...data.selectedMembers, existingMember]
      });
    }
    setSearchTerm('');
    setExistingUsers([]);
  };

  // Remove existing user from selection
  const handleRemoveExistingUser = (userId: string) => {
    onUpdate({
      selectedMembers: data.selectedMembers.filter(m => m.id !== userId)
    });
  };

  // Update existing user role
  const handleUpdateExistingUserRole = (userId: string, role: OrganizationRole) => {
    onUpdate({
      selectedMembers: data.selectedMembers.map(m => 
        m.id === userId ? { ...m, role } : m
      )
    });
  };

  // Add new invitation
  const handleAddInvitation = () => {
    if (newInvitation.email && newInvitation.fullName) {
      const exists = data.newInvitations.find(inv => inv.email === newInvitation.email) ||
                   data.selectedMembers.find(m => m.email === newInvitation.email);
      
      if (!exists) {
        onUpdate({
          newInvitations: [...data.newInvitations, newInvitation]
        });
        setNewInvitation({
          email: '',
          fullName: '',
          role: 'member',
          department: '',
          personalMessage: ''
        });
        setShowInviteForm(false);
      }
    }
  };

  // Remove invitation
  const handleRemoveInvitation = (email: string) => {
    onUpdate({
      newInvitations: data.newInvitations.filter(inv => inv.email !== email)
    });
  };

  // Update invitation role
  const handleUpdateInvitationRole = (email: string, role: OrganizationRole) => {
    onUpdate({
      newInvitations: data.newInvitations.map(inv => 
        inv.email === email ? { ...inv, role } : inv
      )
    });
  };

  // Handle bulk email import
  const handleBulkImport = () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    const newInvitations = emails.map(email => ({
      email,
      fullName: (email.split('@')[0] || email).replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role: 'member' as OrganizationRole,
      department: '',
      personalMessage: newInvitation.personalMessage
    })).filter(inv => 
      !data.newInvitations.find(existing => existing.email === inv.email) &&
      !data.selectedMembers.find(existing => existing.email === inv.email)
    );

    if (newInvitations.length > 0) {
      onUpdate({
        newInvitations: [...data.newInvitations, ...newInvitations]
      });
    }

    setBulkEmails('');
    setShowBulkImport(false);
  };

  const totalMembers = data.selectedMembers.length + data.newInvitations.length;
  const filteredUsers = existingUsers.filter(user => 
    !data.selectedMembers.find(m => m.email === user.email) &&
    !data.newInvitations.find(inv => inv.email === user.email)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Invite BoardMates
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Add team members and board members to your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Existing Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Add Existing Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoading && (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
                </div>
              )}

              {filteredUsers.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddExistingUser(user)}
                        className="flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invite New Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Invite New Users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="flex items-center space-x-1"
                  >
                    <Import className="w-3 h-3" />
                    <span>Bulk Import</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Individual</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {showBulkImport && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 p-4 border rounded-lg bg-blue-50"
                  >
                    <Label>Bulk Email Import</Label>
                    <Textarea
                      placeholder="Enter email addresses separated by commas, semicolons, or new lines..."
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      rows={4}
                      className="bg-white"
                    />
                    <div className="flex items-center space-x-2">
                      <Button onClick={handleBulkImport} size="sm">
                        Import Emails
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowBulkImport(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}

                {showInviteForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 p-4 border rounded-lg bg-green-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={newInvitation.email}
                          onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Full Name *</Label>
                        <Input
                          placeholder="John Doe"
                          value={newInvitation.fullName}
                          onChange={(e) => setNewInvitation(prev => ({ ...prev, fullName: e.target.value }))}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Select 
                          value={newInvitation.role} 
                          onValueChange={(value: OrganizationRole) => 
                            setNewInvitation(prev => ({ ...prev, role: value }))
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <config.icon className={cn("w-4 h-4", config.color)} />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Department</Label>
                        <Select 
                          value={newInvitation.department} 
                          onValueChange={(value) => setNewInvitation(prev => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Personal Message (Optional)</Label>
                      <Textarea
                        placeholder="Add a personal note to the invitation..."
                        value={newInvitation.personalMessage}
                        onChange={(e) => setNewInvitation(prev => ({ ...prev, personalMessage: e.target.value }))}
                        rows={2}
                        className="bg-white"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={handleAddInvitation}
                        size="sm"
                        disabled={!newInvitation.email || !newInvitation.fullName}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Add Invitation
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowInviteForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Selected Members & Invitations */}
          {(data.selectedMembers.length > 0 || data.newInvitations.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Team Members ({totalMembers})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Members */}
                {data.selectedMembers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Existing Users</h4>
                    {data.selectedMembers.map((member) => {
                      const roleConfig = ROLE_CONFIG[member.role];
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback>
                                {member.fullName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{member.fullName}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                              {member.department && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {member.department}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={member.role} 
                              onValueChange={(value: OrganizationRole) => 
                                handleUpdateExistingUserRole(member.id, value)
                              }
                            >
                              <SelectTrigger className="w-32 h-8">
                                <div className="flex items-center space-x-1">
                                  <roleConfig.icon className={cn("w-3 h-3", roleConfig.color)} />
                                  <span className="text-xs">{roleConfig.label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center space-x-2">
                                      <config.icon className={cn("w-3 h-3", config.color)} />
                                      <span>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveExistingUser(member.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {data.selectedMembers.length > 0 && data.newInvitations.length > 0 && (
                  <Separator />
                )}

                {/* New Invitations */}
                {data.newInvitations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">New Invitations</h4>
                    {data.newInvitations.map((invitation) => {
                      const roleConfig = ROLE_CONFIG[invitation.role];
                      return (
                        <div key={invitation.email} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                {invitation.fullName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{invitation.fullName}</p>
                              <p className="text-xs text-gray-500">{invitation.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Invitation Pending
                                </Badge>
                                {invitation.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {invitation.department}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={invitation.role} 
                              onValueChange={(value: OrganizationRole) => 
                                handleUpdateInvitationRole(invitation.email, value)
                              }
                            >
                              <SelectTrigger className="w-32 h-8">
                                <div className="flex items-center space-x-1">
                                  <roleConfig.icon className={cn("w-3 h-3", roleConfig.color)} />
                                  <span className="text-xs">{roleConfig.label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center space-x-2">
                                      <config.icon className={cn("w-3 h-3", config.color)} />
                                      <span>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveInvitation(invitation.email)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>Team Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Member Count */}
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{totalMembers}</div>
                <div className="text-sm text-gray-500">Total Members</div>
              </div>

              {/* Role Distribution */}
              {totalMembers > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Role Distribution</h4>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                    const count = [
                      ...data.selectedMembers.filter(m => m.role === role),
                      ...data.newInvitations.filter(i => i.role === role)
                    ].length;

                    if (count === 0) return null;

                    return (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <config.icon className={cn("w-3 h-3", config.color)} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Invitation Status */}
              {data.newInvitations.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {data.newInvitations.length} invitation{data.newInvitations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Will be sent when organization is created
                  </p>
                </div>
              )}

              {/* Requirements Check */}
              <div className={cn(
                "p-3 rounded-lg border",
                totalMembers > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center space-x-2">
                  {totalMembers > 0 ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Users className="w-4 h-4 text-amber-600" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    totalMembers > 0 ? "text-green-800" : "text-amber-800"
                  )}>
                    {totalMembers > 0 ? "Team configured" : "Add team members"}
                  </span>
                </div>
                <p className={cn(
                  "text-xs mt-1",
                  totalMembers > 0 ? "text-green-600" : "text-amber-600"
                )}>
                  {totalMembers > 0 
                    ? "Your organization team is ready"
                    : "Add at least one team member to continue"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}