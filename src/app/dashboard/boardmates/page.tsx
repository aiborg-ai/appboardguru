'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput';
import { 
  Plus,
  Users,
  Search,
  Filter,
  Grid,
  List,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import BoardMateCard from '@/components/molecules/cards/BoardMateCard';
import AssociationManager from '@/components/features/boardmates/AssociationManager';
import type { 
  BoardMateProfile, 
  AssociationUpdate,
  BoardMateEventHandlers 
} from '@/types/boardmates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select';
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip';

// Remove interface definition as it's now imported from types

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

export default function BoardMatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Data state
  const [boardmates, setBoardmates] = useState<BoardMateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Association manager state
  const [selectedBoardmate, setSelectedBoardmate] = useState<BoardMateProfile | null>(null);
  const [isAssociationManagerOpen, setIsAssociationManagerOpen] = useState(false);

  const { currentOrganization } = useOrganization();

  // Load boardmates on mount and organization change
  useEffect(() => {
    if (currentOrganization?.id) {
      loadBoardmates();
    }
  }, [currentOrganization?.id]);

  const loadBoardmates = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/boardmates?organization_id=${currentOrganization.id}&exclude_self=true`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load boardmates');
      }
      
      const data = await response.json();
      setBoardmates(data.boardmates || []);
    } catch (err) {
      console.error('Error loading boardmates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load boardmates');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  const filteredBoardMates = boardmates.filter(boardmate => {
    const matchesSearch = 
      boardmate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boardmate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boardmate.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boardmate.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || boardmate.org_status === filterStatus;
    
    let matchesRole = filterRole === 'all';
    if (!matchesRole) {
      // Check if any board membership matches the role filter
      matchesRole = boardmate.board_memberships.some(bm => 
        bm.member_role === filterRole && bm.member_status === 'active'
      );
    }
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Event handlers
  const handleEdit = useCallback((boardmate: BoardMateProfile) => {
    // Navigate to edit page or open edit modal
    console.log('Edit boardmate:', boardmate.id);
  }, []);

  const handleMessage = useCallback((boardmate: BoardMateProfile) => {
    // Open messaging interface
    console.log('Message boardmate:', boardmate.id);
  }, []);

  const handleManageAssociations = useCallback((boardmate: BoardMateProfile) => {
    setSelectedBoardmate(boardmate);
    setIsAssociationManagerOpen(true);
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, []);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setFilterStatus(value);
  }, []);

  const handleRoleFilterChange = useCallback((value: string) => {
    setFilterRole(value);
  }, []);

  const handleAssociationUpdate = useCallback(async (updates: AssociationUpdate[]) => {
    if (!selectedBoardmate || !currentOrganization?.id) return;
    
    try {
      const response = await fetch(`/api/boardmates/${selectedBoardmate.id}/associations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: currentOrganization.id,
          updates
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update associations');
      }
      
      // Reload boardmates to get updated data
      await loadBoardmates();
      
      setIsAssociationManagerOpen(false);
      setSelectedBoardmate(null);
    } catch (err) {
      console.error('Error updating associations:', err);
      // Handle error (show toast, etc.)
    }
  }, [selectedBoardmate, currentOrganization?.id, loadBoardmates]);

  // Calculate stats
  const activeCount = boardmates.filter(b => b.org_status === 'active').length;
  const pendingCount = boardmates.filter(b => b.org_status === 'pending_activation').length;
  const executiveCount = boardmates.filter(b => 
    b.board_memberships.some(bm => 
      ['chairman', 'vice_chairman', 'ceo', 'cfo', 'cto'].includes(bm.member_role) && 
      bm.member_status === 'active'
    )
  ).length;
  const directorCount = boardmates.filter(b => 
    b.board_memberships.some(bm => 
      bm.member_role.includes('director') && 
      bm.member_status === 'active'
    )
  ).length;

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  BoardMates
                  <InfoTooltip
                    content={
                      <InfoSection
                        title="BoardMates Management"
                        description="Comprehensive board member and stakeholder management system for governance and collaboration."
                        features={[
                          "Board member profiles with roles and permissions",
                          "Contact information and communication preferences", 
                          "Meeting attendance tracking and history",
                          "Document access and sharing permissions",
                          "Association management between organizations",
                          "Status tracking and lifecycle management"
                        ]}
                        tips={[
                          "Keep contact information up to date for effective communication",
                          "Set appropriate roles to control document access",
                          "Use status tracking to manage board member lifecycle",
                          "Review associations regularly for compliance"
                        ]}
                      />
                    }
                    side="right"
                  />
                </h1>
              </div>
              <p className="text-gray-600">
                Manage your board members, directors, and key stakeholders
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                  className={cn(
                    "px-3 py-1.5 text-sm",
                    viewMode === 'grid' ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                  className={cn(
                    "px-3 py-1.5 text-sm",
                    viewMode === 'list' ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href="/dashboard/boardmates/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add BoardMate
                  </Button>
                </Link>
                <InfoTooltip
                  content="Add new board members to your organization. You can invite existing members or create new profiles with appropriate roles and permissions."
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Members</p>
                    <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Currently active
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                    <p className="text-xs text-yellow-600 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Awaiting approval
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Executive</p>
                    <p className="text-3xl font-bold text-gray-900">{executiveCount}</p>
                    <p className="text-xs text-purple-600 mt-1 flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      C-level & chairs
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Directors</p>
                    <p className="text-3xl font-bold text-gray-900">{directorCount}</p>
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      Board directors
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search by name, email, designation, or company..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onSearch={setSearchTerm}
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                      <SelectTrigger className="w-36 h-11 border-gray-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending_activation">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select value={filterRole} onValueChange={handleRoleFilterChange}>
                    <SelectTrigger className="w-40 h-11 border-gray-200">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="chairman">Chairman</SelectItem>
                      <SelectItem value="vice_chairman">Vice Chairman</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="cfo">CFO</SelectItem>
                      <SelectItem value="cto">CTO</SelectItem>
                      <SelectItem value="independent_director">Independent Director</SelectItem>
                      <SelectItem value="executive_director">Executive Director</SelectItem>
                      <SelectItem value="board_member">Board Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Active Filters */}
              {(searchTerm || filterStatus !== 'all' || filterRole !== 'all') && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                      Search: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-2 hover:text-blue-900"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                      Status: {filterStatus}
                      <button
                        onClick={() => setFilterStatus('all')}
                        className="ml-2 hover:text-green-900"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterRole !== 'all' && (
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                      Role: {filterRole.replace('_', ' ')}
                      <button
                        onClick={() => setFilterRole('all')}
                        className="ml-2 hover:text-purple-900"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterRole('all');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          {error ? (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">
                  Failed to load BoardMates
                </h3>
                <p className="text-red-700 mb-6 max-w-sm mx-auto">{error}</p>
                <Button 
                  onClick={loadBoardmates} 
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className={cn(
              "gap-6",
              viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"
            )}>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Results Count */}
              {filteredBoardMates.length > 0 && (
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-600">
                    Showing {filteredBoardMates.length} of {boardmates.length} BoardMates
                  </p>
                </div>
              )}

              {/* BoardMates Cards */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredBoardMates.map((boardmate) => (
                    <BoardMateCard
                      key={boardmate.id}
                      boardmate={boardmate}
                      onEdit={handleEdit}
                      onMessage={handleMessage}
                      onManageAssociations={handleManageAssociations}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBoardMates.map((boardmate) => (
                    <BoardMateCard
                      key={boardmate.id}
                      boardmate={boardmate}
                      onEdit={handleEdit}
                      onMessage={handleMessage}
                      onManageAssociations={handleManageAssociations}
                      className="max-w-none"
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {filteredBoardMates.length === 0 && !isLoading && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No BoardMates found
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      {searchTerm || filterStatus !== 'all' || filterRole !== 'all'
                        ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                        : 'Get started by inviting your first board member or director to join your organization.'
                      }
                    </p>
                    {(!searchTerm && filterStatus === 'all' && filterRole === 'all') && (
                      <Link href="/dashboard/boardmates/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First BoardMate
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

      {/* Association Manager Modal */}
      {selectedBoardmate && (
        <AssociationManager
          boardmate={selectedBoardmate}
          isOpen={isAssociationManagerOpen}
          onClose={() => {
            setIsAssociationManagerOpen(false);
            setSelectedBoardmate(null);
          }}
          onUpdate={handleAssociationUpdate}
        />
      )}
        </div>
      </div>
    </div>
  );
}