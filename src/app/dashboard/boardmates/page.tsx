'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { 
  Plus,
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Crown,
  Shield,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu';

// Mock BoardMates data
const MOCK_BOARDMATES = [
  {
    id: '1',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    role: 'chairman' as const,
    status: 'active' as const,
    accessLevel: 'full' as const,
    organizationName: 'TechCorp Inc.',
    joinedAt: '2023-01-15T00:00:00Z',
    lastActive: '2024-03-10T14:30:00Z',
    invitedBy: 'System',
    profileComplete: true
  },
  {
    id: '2',
    fullName: 'Michael Chen',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 234-5678',
    role: 'ceo' as const,
    status: 'active' as const,
    accessLevel: 'full' as const,
    organizationName: 'TechCorp Inc.',
    joinedAt: '2023-02-20T00:00:00Z',
    lastActive: '2024-03-11T09:15:00Z',
    invitedBy: 'Sarah Johnson',
    profileComplete: true
  },
  {
    id: '3',
    fullName: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    phone: '+1 (555) 345-6789',
    role: 'independent_director' as const,
    status: 'pending' as const,
    accessLevel: 'restricted' as const,
    organizationName: 'TechCorp Inc.',
    joinedAt: '2024-03-05T00:00:00Z',
    lastActive: null,
    invitedBy: 'Sarah Johnson',
    profileComplete: false
  },
  {
    id: '4',
    fullName: 'David Kim',
    email: 'david.kim@company.com',
    phone: '+1 (555) 456-7890',
    role: 'cfo' as const,
    status: 'active' as const,
    accessLevel: 'full' as const,
    organizationName: 'TechCorp Inc.',
    joinedAt: '2023-03-10T00:00:00Z',
    lastActive: '2024-03-09T16:45:00Z',
    invitedBy: 'Michael Chen',
    profileComplete: true
  },
  {
    id: '5',
    fullName: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    phone: '+1 (555) 567-8901',
    role: 'executive_director' as const,
    status: 'inactive' as const,
    accessLevel: 'view_only' as const,
    organizationName: 'TechCorp Inc.',
    joinedAt: '2023-06-15T00:00:00Z',
    lastActive: '2024-01-20T11:30:00Z',
    invitedBy: 'Sarah Johnson',
    profileComplete: true
  }
];

const ROLE_LABELS = {
  chairman: 'Chairman',
  ceo: 'CEO',
  cfo: 'CFO',
  cto: 'CTO',
  independent_director: 'Independent Director',
  executive_director: 'Executive Director',
  non_executive_director: 'Non-Executive Director',
  audit_committee_chair: 'Audit Committee Chair',
  compensation_committee_chair: 'Compensation Committee Chair',
  governance_committee_chair: 'Governance Committee Chair',
  risk_committee_chair: 'Risk Committee Chair',
  board_member: 'Board Member',
  company_secretary: 'Company Secretary',
  legal_counsel: 'Legal Counsel',
  external_auditor: 'External Auditor',
  board_observer: 'Board Observer'
};

const ROLE_ICONS = {
  chairman: Crown,
  ceo: Crown,
  cfo: Shield,
  cto: Shield,
  independent_director: User,
  executive_director: User,
  non_executive_director: User,
  audit_committee_chair: Shield,
  compensation_committee_chair: Shield,
  governance_committee_chair: Shield,
  risk_committee_chair: Shield,
  board_member: User,
  company_secretary: User,
  legal_counsel: User,
  external_auditor: User,
  board_observer: User
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

const ACCESS_LEVEL_CONFIG = {
  full: { label: 'Full Access', color: 'bg-blue-100 text-blue-700' },
  restricted: { label: 'Restricted', color: 'bg-orange-100 text-orange-700' },
  view_only: { label: 'View Only', color: 'bg-gray-100 text-gray-700' }
};

export default function BoardMatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAccess, setFilterAccess] = useState<string>('all');

  const { currentOrganization } = useOrganization();

  const filteredBoardMates = MOCK_BOARDMATES.filter(boardmate => {
    const matchesSearch = boardmate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         boardmate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         boardmate.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || boardmate.status === filterStatus;
    const matchesRole = filterRole === 'all' || boardmate.role === filterRole;
    const matchesAccess = filterAccess === 'all' || boardmate.accessLevel === filterAccess;
    
    return matchesSearch && matchesStatus && matchesRole && matchesAccess;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastActive = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            BoardMates
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your board members, directors, and key stakeholders
          </p>
        </div>
        <Link href="/dashboard/boardmates/create">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add BoardMate</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">
                  {MOCK_BOARDMATES.filter(b => b.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {MOCK_BOARDMATES.filter(b => b.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Executive</p>
                <p className="text-2xl font-bold">
                  {MOCK_BOARDMATES.filter(b => ['chairman', 'ceo', 'cfo', 'cto'].includes(b.role)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Directors</p>
                <p className="text-2xl font-bold">
                  {MOCK_BOARDMATES.filter(b => b.role.includes('director')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search BoardMates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              
              <select
                value={filterAccess}
                onChange={(e) => setFilterAccess(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Access</option>
                <option value="full">Full Access</option>
                <option value="restricted">Restricted</option>
                <option value="view_only">View Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BoardMates List */}
      <div className="space-y-4">
        {filteredBoardMates.map((boardmate) => {
          const statusConfig = STATUS_CONFIG[boardmate.status];
          const accessConfig = ACCESS_LEVEL_CONFIG[boardmate.accessLevel];
          const StatusIcon = statusConfig.icon;
          const RoleIcon = ROLE_ICONS[boardmate.role] || User;
          
          return (
            <Card key={boardmate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <RoleIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {boardmate.fullName}
                        </h3>
                        <p className="text-sm text-gray-600">{ROLE_LABELS[boardmate.role]}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={cn("text-xs", statusConfig.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge className={cn("text-xs", accessConfig.color)}>
                          {accessConfig.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{boardmate.email}</span>
                        </div>
                        {boardmate.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{boardmate.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{boardmate.organizationName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>Joined {formatDate(boardmate.joinedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>Invited by {boardmate.invitedBy}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-gray-400" />
                          <span>Last active {formatLastActive(boardmate.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {boardmate.status === 'pending' && !boardmate.profileComplete && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Invitation pending - user has not completed profile setup
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Access
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredBoardMates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No BoardMates found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterStatus !== 'all' || filterAccess !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first BoardMate'
                }
              </p>
              {(!searchTerm && filterStatus === 'all' && filterAccess === 'all') && (
                <Link href="/dashboard/boardmates/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add BoardMate
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}