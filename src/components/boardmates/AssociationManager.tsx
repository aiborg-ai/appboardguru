'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Separator } from '@/features/shared/ui/separator';
import { 
  Users,
  Shield,
  FolderOpen,
  X,
  Plus,
  Save,
  Loader2,
  Search,
  Crown,
  User,
  Edit,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardMateProfile } from './BoardMateCard';

interface Board {
  id: string;
  name: string;
  board_type: 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board';
  status: 'active' | 'inactive' | 'dissolved';
}

interface Committee {
  id: string;
  name: string;
  committee_type: 'audit' | 'compensation' | 'governance' | 'risk' | 'nomination' | 'strategy' | 'technology' | 'investment' | 'ethics' | 'executive' | 'other';
  board_id: string;
  board_name: string;
  status: 'active' | 'inactive' | 'dissolved' | 'temporary';
}

interface Vault {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled';
  description?: string;
}

interface AssociationUpdate {
  type: 'board' | 'committee' | 'vault';
  id: string;
  action: 'add' | 'remove' | 'update_role';
  role?: string;
  current_role?: string;
}

interface AssociationManagerProps {
  boardmate: BoardMateProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: AssociationUpdate[]) => Promise<void>;
}

const BOARD_ROLES = [
  { value: 'chairman', label: 'Chairman' },
  { value: 'vice_chairman', label: 'Vice Chairman' },
  { value: 'ceo', label: 'CEO' },
  { value: 'cfo', label: 'CFO' },
  { value: 'cto', label: 'CTO' },
  { value: 'independent_director', label: 'Independent Director' },
  { value: 'executive_director', label: 'Executive Director' },
  { value: 'non_executive_director', label: 'Non-Executive Director' },
  { value: 'board_member', label: 'Board Member' },
  { value: 'board_observer', label: 'Board Observer' }
];

const COMMITTEE_ROLES = [
  { value: 'chair', label: 'Chair' },
  { value: 'vice_chair', label: 'Vice Chair' },
  { value: 'member', label: 'Member' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'observer', label: 'Observer' }
];

const VAULT_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'viewer', label: 'Viewer' }
];

const COMMITTEE_TYPE_LABELS = {
  audit: 'Audit',
  compensation: 'Compensation',
  governance: 'Governance',
  risk: 'Risk Management',
  nomination: 'Nomination',
  strategy: 'Strategy',
  technology: 'Technology',
  investment: 'Investment',
  ethics: 'Ethics',
  executive: 'Executive',
  other: 'Other'
};

export default function AssociationManager({ 
  boardmate, 
  isOpen, 
  onClose, 
  onUpdate 
}: AssociationManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Available associations
  const [boards, setBoards] = useState<Board[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  
  // Current associations (working copy)
  const [currentBoards, setCurrentBoards] = useState<Map<string, string>>(new Map());
  const [currentCommittees, setCurrentCommittees] = useState<Map<string, string>>(new Map());
  const [currentVaults, setCurrentVaults] = useState<Map<string, string>>(new Map());
  
  // Search terms
  const [boardSearch, setBoardSearch] = useState('');
  const [committeeSearch, setCommitteeSearch] = useState('');
  const [vaultSearch, setVaultSearch] = useState('');
  
  // Track changes
  const [pendingUpdates, setPendingUpdates] = useState<AssociationUpdate[]>([]);

  // Load available associations when opened
  useEffect(() => {
    if (isOpen) {
      loadAssociations();
      initializeCurrentAssociations();
    }
  }, [isOpen, boardmate]);

  const loadAssociations = async () => {
    setIsLoading(true);
    try {
      const [boardsRes, committeesRes, vaultsRes] = await Promise.all([
        fetch('/api/boards'),
        fetch('/api/committees'),
        fetch('/api/vaults')
      ]);
      
      const [boardsData, committeesData, vaultsData] = await Promise.all([
        boardsRes.json(),
        committeesRes.json(),
        vaultsRes.json()
      ]);
      
      setBoards(boardsData.boards || []);
      setCommittees(committeesData.committees || []);
      setVaults(vaultsData.vaults || []);
    } catch (error) {
      console.error('Failed to load associations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeCurrentAssociations = () => {
    // Initialize current board memberships
    const boardsMap = new Map();
    boardmate.board_memberships
      .filter(bm => bm.member_status === 'active')
      .forEach(bm => boardsMap.set(bm.board_id, bm.member_role));
    setCurrentBoards(boardsMap);
    
    // Initialize current committee memberships
    const committeesMap = new Map();
    boardmate.committee_memberships
      .filter(cm => cm.member_status === 'active')
      .forEach(cm => committeesMap.set(cm.committee_id, cm.member_role));
    setCurrentCommittees(committeesMap);
    
    // Initialize current vault memberships
    const vaultsMap = new Map();
    boardmate.vault_memberships
      .filter(vm => vm.member_status === 'active')
      .forEach(vm => vaultsMap.set(vm.vault_id, vm.member_role));
    setCurrentVaults(vaultsMap);
    
    setPendingUpdates([]);
  };

  const handleBoardToggle = (boardId: string, checked: boolean) => {
    const newMap = new Map(currentBoards);
    const updates = [...pendingUpdates];
    
    if (checked) {
      newMap.set(boardId, 'board_member');
      // Check if this board was originally associated
      const originalRole = boardmate.board_memberships.find(bm => bm.board_id === boardId && bm.member_status === 'active')?.member_role;
      if (!originalRole) {
        updates.push({ type: 'board', id: boardId, action: 'add', role: 'board_member' });
      }
    } else {
      const currentRole = newMap.get(boardId);
      newMap.delete(boardId);
      // Check if this board was originally associated
      const originalRole = boardmate.board_memberships.find(bm => bm.board_id === boardId && bm.member_status === 'active')?.member_role;
      if (originalRole) {
        updates.push({ type: 'board', id: boardId, action: 'remove', current_role: originalRole });
      }
    }
    
    setCurrentBoards(newMap);
    setPendingUpdates(updates.filter((update, index, self) => 
      index === self.findIndex(u => u.type === update.type && u.id === update.id)
    ));
  };

  const handleBoardRoleChange = (boardId: string, newRole: string) => {
    const newMap = new Map(currentBoards);
    const currentRole = newMap.get(boardId);
    newMap.set(boardId, newRole);
    setCurrentBoards(newMap);
    
    const updates = [...pendingUpdates];
    const originalRole = boardmate.board_memberships.find(bm => bm.board_id === boardId && bm.member_status === 'active')?.member_role;
    
    if (originalRole && originalRole !== newRole) {
      const existingUpdate = updates.find(u => u.type === 'board' && u.id === boardId);
      if (existingUpdate) {
        existingUpdate.action = 'update_role';
        existingUpdate.role = newRole;
        existingUpdate.current_role = originalRole;
      } else {
        updates.push({ type: 'board', id: boardId, action: 'update_role', role: newRole, current_role: originalRole });
      }
    }
    
    setPendingUpdates(updates.filter((update, index, self) => 
      index === self.findIndex(u => u.type === update.type && u.id === update.id)
    ));
  };

  // Similar functions for committees and vaults
  const handleCommitteeToggle = (committeeId: string, checked: boolean) => {
    const newMap = new Map(currentCommittees);
    const updates = [...pendingUpdates];
    
    if (checked) {
      newMap.set(committeeId, 'member');
      const originalRole = boardmate.committee_memberships.find(cm => cm.committee_id === committeeId && cm.member_status === 'active')?.member_role;
      if (!originalRole) {
        updates.push({ type: 'committee', id: committeeId, action: 'add', role: 'member' });
      }
    } else {
      const currentRole = newMap.get(committeeId);
      newMap.delete(committeeId);
      const originalRole = boardmate.committee_memberships.find(cm => cm.committee_id === committeeId && cm.member_status === 'active')?.member_role;
      if (originalRole) {
        updates.push({ type: 'committee', id: committeeId, action: 'remove', current_role: originalRole });
      }
    }
    
    setCurrentCommittees(newMap);
    setPendingUpdates(updates.filter((update, index, self) => 
      index === self.findIndex(u => u.type === update.type && u.id === update.id)
    ));
  };

  const handleVaultToggle = (vaultId: string, checked: boolean) => {
    const newMap = new Map(currentVaults);
    const updates = [...pendingUpdates];
    
    if (checked) {
      newMap.set(vaultId, 'contributor');
      const originalRole = boardmate.vault_memberships.find(vm => vm.vault_id === vaultId && vm.member_status === 'active')?.member_role;
      if (!originalRole) {
        updates.push({ type: 'vault', id: vaultId, action: 'add', role: 'contributor' });
      }
    } else {
      const currentRole = newMap.get(vaultId);
      newMap.delete(vaultId);
      const originalRole = boardmate.vault_memberships.find(vm => vm.vault_id === vaultId && vm.member_status === 'active')?.member_role;
      if (originalRole) {
        updates.push({ type: 'vault', id: vaultId, action: 'remove', current_role: originalRole });
      }
    }
    
    setCurrentVaults(newMap);
    setPendingUpdates(updates.filter((update, index, self) => 
      index === self.findIndex(u => u.type === update.type && u.id === update.id)
    ));
  };

  const handleSave = async () => {
    if (pendingUpdates.length === 0) return;
    
    setIsSaving(true);
    try {
      await onUpdate(pendingUpdates);
      onClose();
    } catch (error) {
      console.error('Failed to save associations:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(boardSearch.toLowerCase()) &&
    board.status === 'active'
  );
  
  const filteredCommittees = committees.filter(committee =>
    (committee.name.toLowerCase().includes(committeeSearch.toLowerCase()) ||
     COMMITTEE_TYPE_LABELS[committee.committee_type].toLowerCase().includes(committeeSearch.toLowerCase())) &&
    committee.status === 'active'
  );
  
  const filteredVaults = vaults.filter(vault =>
    vault.name.toLowerCase().includes(vaultSearch.toLowerCase()) &&
    vault.status === 'active'
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={boardmate.avatar_url} alt={boardmate.full_name} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {boardmate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Manage Associations
                </h2>
                <p className="text-sm text-gray-600">{boardmate.full_name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading associations...</span>
                </div>
              ) : (
                <>
                  {/* Board Associations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span>Board Memberships</span>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search boards..."
                          value={boardSearch}
                          onChange={(e) => setBoardSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredBoards.map((board) => {
                        const isSelected = currentBoards.has(board.id);
                        const currentRole = currentBoards.get(board.id);
                        
                        return (
                          <div
                            key={board.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleBoardToggle(board.id, !!checked)}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{board.name}</h4>
                                <p className="text-sm text-gray-500 capitalize">
                                  {board.board_type.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Select
                                value={currentRole}
                                onValueChange={(value) => handleBoardRoleChange(board.id, value)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BOARD_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                      
                      {filteredBoards.length === 0 && (
                        <p className="text-center text-gray-500 py-6">
                          {boardSearch ? 'No boards found matching your search' : 'No active boards available'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Committee Associations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span>Committee Memberships</span>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search committees..."
                          value={committeeSearch}
                          onChange={(e) => setCommitteeSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredCommittees.map((committee) => {
                        const isSelected = currentCommittees.has(committee.id);
                        const currentRole = currentCommittees.get(committee.id);
                        
                        return (
                          <div
                            key={committee.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isSelected ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleCommitteeToggle(committee.id, !!checked)}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{committee.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {COMMITTEE_TYPE_LABELS[committee.committee_type]} • {committee.board_name}
                                </p>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Select
                                value={currentRole}
                                onValueChange={(value) => {
                                  const newMap = new Map(currentCommittees);
                                  newMap.set(committee.id, value);
                                  setCurrentCommittees(newMap);
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMITTEE_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                      
                      {filteredCommittees.length === 0 && (
                        <p className="text-center text-gray-500 py-6">
                          {committeeSearch ? 'No committees found matching your search' : 'No active committees available'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vault Associations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FolderOpen className="h-5 w-5 text-green-600" />
                        <span>Vault Access</span>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search vaults..."
                          value={vaultSearch}
                          onChange={(e) => setVaultSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredVaults.map((vault) => {
                        const isSelected = currentVaults.has(vault.id);
                        const currentRole = currentVaults.get(vault.id);
                        
                        return (
                          <div
                            key={vault.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isSelected ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleVaultToggle(vault.id, !!checked)}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{vault.name}</h4>
                                {vault.description && (
                                  <p className="text-sm text-gray-500 truncate">
                                    {vault.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Select
                                value={currentRole}
                                onValueChange={(value) => {
                                  const newMap = new Map(currentVaults);
                                  newMap.set(vault.id, value);
                                  setCurrentVaults(newMap);
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {VAULT_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                      
                      {filteredVaults.length === 0 && (
                        <p className="text-center text-gray-500 py-6">
                          {vaultSearch ? 'No vaults found matching your search' : 'No active vaults available'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending Changes Summary */}
                  {pendingUpdates.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-amber-800">
                          <AlertTriangle className="h-5 w-5" />
                          <span>Pending Changes ({pendingUpdates.length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {pendingUpdates.map((update, index) => (
                            <li key={index} className="text-sm text-amber-700">
                              {update.action === 'add' && `Add to ${update.type} with role: ${update.role}`}
                              {update.action === 'remove' && `Remove from ${update.type}`}
                              {update.action === 'update_role' && `Change ${update.type} role from ${update.current_role} to ${update.role}`}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {pendingUpdates.length === 0 ? 'No changes made' : `${pendingUpdates.length} change(s) pending`}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={pendingUpdates.length === 0 || isSaving}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Changes</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}