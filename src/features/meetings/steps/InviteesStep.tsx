'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Badge } from '@/features/shared/ui/badge';
import { Switch } from '@/features/shared/ui/switch';
import { 
  Users,
  Plus,
  Mail,
  Trash2,
  Crown,
  UserCheck,
  Presentation,
  Eye,
  Edit3,
  Shield,
  Search,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingWizardData, AttendeeRole } from '../CreateMeetingWizard';

interface InviteesStepProps {
  data: MeetingWizardData;
  onUpdate: (updates: Partial<MeetingWizardData>) => void;
}

const ATTENDEE_ROLES = [
  { 
    value: 'board_member', 
    label: 'Board Member', 
    icon: Crown,
    color: 'bg-purple-500',
    description: 'Voting member with full access'
  },
  { 
    value: 'guest', 
    label: 'Guest', 
    icon: UserCheck,
    color: 'bg-blue-500',
    description: 'Invited attendee with viewing access'
  },
  { 
    value: 'presenter', 
    label: 'Presenter', 
    icon: Presentation,
    color: 'bg-green-500',
    description: 'Speaker or presenter for agenda items'
  },
  { 
    value: 'observer', 
    label: 'Observer', 
    icon: Eye,
    color: 'bg-gray-500',
    description: 'Non-participating observer'
  },
  { 
    value: 'secretary', 
    label: 'Secretary', 
    icon: Edit3,
    color: 'bg-orange-500',
    description: 'Meeting secretary or minute taker'
  },
  { 
    value: 'facilitator', 
    label: 'Facilitator', 
    icon: Shield,
    color: 'bg-red-500',
    description: 'Meeting facilitator or moderator'
  },
] as const;

// Mock data for existing organization members
const MOCK_ORG_MEMBERS = [
  { id: '1', email: 'john.doe@company.com', fullName: 'John Doe', role: 'CEO' },
  { id: '2', email: 'jane.smith@company.com', fullName: 'Jane Smith', role: 'CFO' },
  { id: '3', email: 'mike.wilson@company.com', fullName: 'Mike Wilson', role: 'CTO' },
  { id: '4', email: 'sarah.johnson@company.com', fullName: 'Sarah Johnson', role: 'Director' },
  { id: '5', email: 'david.brown@company.com', fullName: 'David Brown', role: 'Board Member' },
];

export default function InviteesStep({ data, onUpdate }: InviteesStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newInvitee, setNewInvitee] = useState({
    email: '',
    fullName: '',
    role: 'guest' as AttendeeRole,
    isRequired: true,
    isOrganizer: false,
  });

  const filteredMembers = MOCK_ORG_MEMBERS.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddExistingMember = (member: typeof MOCK_ORG_MEMBERS[0]) => {
    const existingInvitee = data.invitees.find(inv => inv.email === member.email);
    if (existingInvitee) return; // Already invited

    const newInvitee = {
      userId: member.id,
      email: member.email,
      fullName: member.fullName,
      role: member.role.toLowerCase().includes('board') ? 'board_member' as AttendeeRole : 'guest' as AttendeeRole,
      isRequired: true,
      isOrganizer: false,
    };

    onUpdate({
      invitees: [...data.invitees, newInvitee],
    });
  };

  const handleAddManualInvitee = () => {
    if (!newInvitee.email || !newInvitee.fullName) return;

    const existingInvitee = data.invitees.find(inv => inv.email === newInvitee.email);
    if (existingInvitee) return; // Already invited

    onUpdate({
      invitees: [...data.invitees, newInvitee],
    });

    setNewInvitee({
      email: '',
      fullName: '',
      role: 'guest',
      isRequired: true,
      isOrganizer: false,
    });
    setIsAddingManual(false);
  };

  const handleUpdateInvitee = (email: string, updates: Partial<typeof newInvitee>) => {
    const updatedInvitees = data.invitees.map(invitee =>
      invitee.email === email ? { ...invitee, ...updates } : invitee
    );
    onUpdate({ invitees: updatedInvitees });
  };

  const handleRemoveInvitee = (email: string) => {
    const updatedInvitees = data.invitees.filter(invitee => invitee.email !== email);
    onUpdate({ invitees: updatedInvitees });
  };

  const getRoleConfig = (role: AttendeeRole) => {
    return ATTENDEE_ROLES.find(r => r.value === role) || ATTENDEE_ROLES[1];
  };

  const roleStats = React.useMemo(() => {
    const stats = data.invitees.reduce((acc, invitee) => {
      acc[invitee.role] = (acc[invitee.role] || 0) + 1;
      return acc;
    }, {} as Record<AttendeeRole, number>);
    
    return stats;
  }, [data.invitees]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Invite Attendees & Assign Roles
        </h3>
        <p className="text-gray-600">
          Select attendees and assign their roles for the meeting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Invitees */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Add Attendees</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingManual(true)}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Manual Add</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Organization Members */}
              <div>
                <Label htmlFor="search-members">Search Organization Members</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-members"
                    placeholder="Search by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Organization Members List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredMembers.map((member) => {
                  const isInvited = data.invitees.some(inv => inv.email === member.email);
                  
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        isInvited ? "bg-green-50 border-green-200" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {member.fullName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.fullName}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      
                      {isInvited ? (
                        <Badge variant="default" className="bg-green-600">
                          Invited
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddExistingMember(member)}
                          className="flex items-center space-x-1"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Invite</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manual Add Form */}
              {isAddingManual && (
                <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                  <h4 className="font-medium mb-3">Add External Attendee</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="manual-email">Email Address *</Label>
                      <Input
                        id="manual-email"
                        type="email"
                        placeholder="email@example.com"
                        value={newInvitee.email}
                        onChange={(e) => setNewInvitee({ ...newInvitee, email: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="manual-name">Full Name *</Label>
                      <Input
                        id="manual-name"
                        placeholder="John Doe"
                        value={newInvitee.fullName}
                        onChange={(e) => setNewInvitee({ ...newInvitee, fullName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-role">Role</Label>
                      <select
                        id="manual-role"
                        value={newInvitee.role}
                        onChange={(e) => setNewInvitee({ ...newInvitee, role: e.target.value as AttendeeRole })}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ATTENDEE_ROLES.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="manual-required"
                        checked={newInvitee.isRequired}
                        onCheckedChange={(checked) => setNewInvitee({ ...newInvitee, isRequired: checked })}
                      />
                      <Label htmlFor="manual-required">Required attendee</Label>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleAddManualInvitee}
                        disabled={!newInvitee.email || !newInvitee.fullName}
                      >
                        Add Attendee
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingManual(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Role Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ATTENDEE_ROLES.map((role) => {
                  const count = roleStats[role.value] || 0;
                  const Icon = role.icon;
                  
                  return (
                    <div key={role.value} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={cn("p-1 rounded text-white", role.color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium">{role.label}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Attendees:</span>
                    <Badge className="bg-blue-600">
                      {data.invitees.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invited Attendees List */}
      {data.invitees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Invited Attendees ({data.invitees.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.invitees.map((invitee) => {
                const roleConfig = getRoleConfig(invitee.role);
                const Icon = roleConfig.icon;
                
                return (
                  <div
                    key={invitee.email}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {invitee.fullName.charAt(0)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm truncate">{invitee.fullName}</p>
                          {invitee.isOrganizer && (
                            <Badge variant="default" className="text-xs bg-purple-600">
                              Organizer
                            </Badge>
                          )}
                          {!invitee.isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Optional
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{invitee.email}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={cn("p-1 rounded text-white", roleConfig.color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium">{roleConfig.label}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <select
                        value={invitee.role}
                        onChange={(e) => handleUpdateInvitee(invitee.email, { role: e.target.value as AttendeeRole })}
                        className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ATTENDEE_ROLES.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInvitee(invitee.email)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}