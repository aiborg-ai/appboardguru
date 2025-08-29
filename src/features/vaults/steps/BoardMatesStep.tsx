'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Badge } from '@/features/shared/ui/badge';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { 
  Users, 
  Search, 
  Loader2, 
  UserPlus,
  Mail,
  Shield,
  X
} from 'lucide-react';
import { VaultWizardData } from '../CreateVaultWizard';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

interface BoardMatesStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

export default function BoardMatesStep({ data, onUpdate }: BoardMatesStepProps) {
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newMember, setNewMember] = useState({
    email: '',
    full_name: '',
    role: 'viewer' as 'viewer' | 'member' | 'admin'
  });

  useEffect(() => {
    if (data.selectedOrganization) {
      loadOrganizationMembers();
    } else {
      setLoading(false);
    }
  }, [data.selectedOrganization]);

  const loadOrganizationMembers = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !data.selectedOrganization) return;

      const { data: members } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('organization_id', data.selectedOrganization.id)
        .eq('status', 'active')
        .neq('user_id', user.id);

      if (members) {
        setExistingMembers(members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'member': return 'bg-blue-100 text-blue-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSelectMember = (member: any) => {
    const isSelected = data.selectedBoardMates.some(m => m.id === member.user?.id);
    
    if (isSelected) {
      onUpdate({
        selectedBoardMates: data.selectedBoardMates.filter(m => m.id !== member.user?.id)
      });
    } else {
      onUpdate({
        selectedBoardMates: [...data.selectedBoardMates, {
          id: member.user?.id,
          email: member.user?.email,
          full_name: member.user?.full_name || member.user?.email,
          role: member.role
        }]
      });
    }
  };

  const handleAddNewMember = () => {
    if (!newMember.email || !newMember.full_name) return;
    
    const exists = data.newBoardMates.some(m => m.email === newMember.email);
    if (!exists) {
      onUpdate({
        newBoardMates: [...data.newBoardMates, newMember]
      });
    }
    
    setNewMember({ email: '', full_name: '', role: 'viewer' });
    setShowAddForm(false);
  };

  const handleRemoveNewMember = (email: string) => {
    onUpdate({
      newBoardMates: data.newBoardMates.filter(m => m.email !== email)
    });
  };

  const filteredMembers = existingMembers.filter(member =>
    member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Invite BoardMates
        </h3>
        <p className="text-sm text-gray-600">
          Add team members who will have access to this vault
        </p>
      </div>

      {data.selectedOrganization && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search existing members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Existing Organization Members</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {filteredMembers.map((member) => {
                  const isSelected = data.selectedBoardMates.some(m => m.id === member.user?.id);
                  
                  return (
                    <Card
                      key={member.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        isSelected && "ring-2 ring-blue-500 bg-blue-50"
                      )}
                      onClick={() => handleSelectMember(member)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectMember(member)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {member.user?.full_name || member.user?.email}
                            </p>
                            <p className="text-xs text-gray-600">{member.user?.email}</p>
                          </div>
                          <Badge className={cn("text-xs", getRoleBadgeColor(member.role))}>
                            {member.role}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Invite New Members</h4>
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>

        {showAddForm && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="member-email">Email Address *</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="member@example.com"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-name">Full Name *</Label>
                  <Input
                    id="member-name"
                    placeholder="John Doe"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="member-role">Role</Label>
                  <Select
                    value={newMember.role}
                    onValueChange={(value: 'viewer' | 'member' | 'admin') => 
                      setNewMember({ ...newMember, role: value })
                    }
                  >
                    <SelectTrigger id="member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>Viewer (Read-only)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Member (Edit access)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4" />
                          <span>Admin (Full control)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddNewMember}
                    disabled={!newMember.email || !newMember.full_name}
                  >
                    Add Member
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data.newBoardMates.length > 0 && (
          <div className="space-y-2 mt-4">
            {data.newBoardMates.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                    <p className="text-xs text-gray-600">{member.email}</p>
                  </div>
                  <Badge className={cn("text-xs", getRoleBadgeColor(member.role))}>
                    {member.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveNewMember(member.email)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {(data.selectedBoardMates.length > 0 || data.newBoardMates.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            Total Members to Add: {data.selectedBoardMates.length + data.newBoardMates.length}
          </p>
          {data.selectedBoardMates.length > 0 && (
            <p className="text-xs text-blue-700">
              {data.selectedBoardMates.length} existing member(s)
            </p>
          )}
          {data.newBoardMates.length > 0 && (
            <p className="text-xs text-blue-700">
              {data.newBoardMates.length} new member(s) to invite
            </p>
          )}
        </div>
      )}
    </div>
  );
}