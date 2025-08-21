'use client';

import React, { useState, useEffect } from 'react';
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
import BoardMateCard, { BoardMateProfile } from '@/components/boardmates/BoardMateCard';
import AssociationManager from '@/components/boardmates/AssociationManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select';

interface AssociationUpdate {
  type: 'board' | 'committee' | 'vault';
  id: string;
  action: 'add' | 'remove' | 'update_role';
  role?: string;
  current_role?: string;
}

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

  const loadBoardmates = async () => {
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
  };

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
  const handleEdit = (boardmate: BoardMateProfile) => {
    // Navigate to edit page or open edit modal
    console.log('Edit boardmate:', boardmate.id);
  };

  const handleMessage = (boardmate: BoardMateProfile) => {
    // Open messaging interface
    console.log('Message boardmate:', boardmate.id);
  };

  const handleManageAssociations = (boardmate: BoardMateProfile) => {
    setSelectedBoardmate(boardmate);
    setIsAssociationManagerOpen(true);
  };

  const handleAssociationUpdate = async (updates: AssociationUpdate[]) => {
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
  };

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
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="p-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="p-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/dashboard/boardmates/create">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add BoardMate</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{activeCount}</p>
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
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Executive</p>
                <p className="text-2xl font-bold">{executiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Directors</p>
                <p className="text-2xl font-bold">{directorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search BoardMates by name, email, designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_activation">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
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
        </CardContent>
      </Card>

      {/* Content */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Failed to load BoardMates
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={loadBoardmates} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
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
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No BoardMates found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterStatus !== 'all' || filterRole !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first BoardMate'
                  }
                </p>
                {(!searchTerm && filterStatus === 'all' && filterRole === 'all') && (
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
  );
}