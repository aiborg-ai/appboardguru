'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Search, 
  UserPlus,
  Check,
  X,
  Mail,
  Shield,
  Eye,
  Edit,
  Crown,
  AlertCircle,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VaultWizardData } from '../CreateVaultWizard';

interface BoardMate {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  organization?: {
    id: string;
    name: string;
  };
  last_active?: string;
  joined_at: string;
}

interface NewBoardMate {
  email: string;
  full_name: string;
  role: 'viewer' | 'member' | 'admin';
}

interface BoardMatesStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Full access and management rights'
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: 'Can manage vault and invite members'
  },
  member: {
    label: 'Member',
    icon: Edit,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Can view, comment, and collaborate'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Can view and comment only'
  }
};

export default function BoardMatesStep({ data, onUpdate }: BoardMatesStepProps) {
  const [boardMates, setBoardMates] = useState<BoardMate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newMateForm, setNewMateForm] = useState<NewBoardMate>({
    email: '',
    full_name: '',
    role: 'member'
  });
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });

  // Load board mates
  useEffect(() => {
    loadBoardMates();
  }, []);

  const loadBoardMates = async () => {
    setIsLoading(true);
    try {
      // This would fetch from your API
      const response = await fetch('/api/boardmates');
      if (response.ok) {
        const result = await response.json();
        setBoardMates(result.boardmates || []);
      }
    } catch (error) {
      console.error('Failed to load board mates:', error);
      // Mock data for development
      setBoardMates([
        {
          id: '1',
          email: 'john@techflow.com',
          full_name: 'John Smith',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
          role: 'admin',
          status: 'active',
          organization: { id: 'org1', name: 'TechFlow Innovations' },
          joined_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          email: 'sarah@techflow.com',
          full_name: 'Sarah Johnson',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
          role: 'member',
          status: 'active',
          organization: { id: 'org1', name: 'TechFlow Innovations' },
          joined_at: '2024-01-20T14:30:00Z'
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter board mates
  const filteredBoardMates = boardMates.filter(mate =>
    mate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle board mate selection
  const handleBoardMateSelect = useCallback((mate: BoardMate, selected: boolean) => {
    const currentSelected = data.selectedBoardMates;
    const newSelected = selected
      ? [...currentSelected, {
          id: mate.id,
          email: mate.email,
          full_name: mate.full_name,
          role: mate.role,
        }]
      : currentSelected.filter(m => m.id !== mate.id);
    
    onUpdate({ selectedBoardMates: newSelected });
  }, [data.selectedBoardMates, onUpdate]);

  // Handle new board mate form
  const handleNewMateFormChange = (field: keyof NewBoardMate, value: string) => {
    const newForm = { ...newMateForm, [field]: value };
    setNewMateForm(newForm);

    // Email validation
    if (field === 'email') {
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isDuplicate = [...data.selectedBoardMates, ...data.newBoardMates]
        .some(mate => mate.email.toLowerCase() === value.toLowerCase());
      
      if (!value) {
        setEmailValidation({ isValid: true });
      } else if (!isValidEmail) {
        setEmailValidation({ isValid: false, message: 'Please enter a valid email address' });
      } else if (isDuplicate) {
        setEmailValidation({ isValid: false, message: 'This person is already added' });
      } else {
        setEmailValidation({ isValid: true });
      }
    }
  };

  const handleAddNewMate = () => {
    if (newMateForm.email && newMateForm.full_name && emailValidation.isValid) {
      const newBoardMates = [...data.newBoardMates, newMateForm];
      onUpdate({ newBoardMates });
      setNewMateForm({ email: '', full_name: '', role: 'member' });
      setShowInviteForm(false);
      setEmailValidation({ isValid: true });
    }
  };

  const handleRemoveNewMate = (index: number) => {
    const newBoardMates = data.newBoardMates.filter((_, i) => i !== index);
    onUpdate({ newBoardMates });
  };

  const isBoardMateSelected = useCallback((mateId: string) => {
    return data.selectedBoardMates.some(m => m.id === mateId);
  }, [data.selectedBoardMates]);

  const selectedCount = data.selectedBoardMates.length + data.newBoardMates.length;
  const canAddNewMate = newMateForm.email && newMateForm.full_name && emailValidation.isValid;

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
          Add team members who can access and collaborate in this vault
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search board mates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showInviteForm ? "default" : "outline"}
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showInviteForm ? "Cancel" : "Invite New"}</span>
        </Button>
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-800">
              {selectedCount} board mate{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ selectedBoardMates: [], newBoardMates: [] })}
            className="text-purple-600 hover:text-purple-800"
          >
            Clear all
          </Button>
        </motion.div>
      )}

      {/* Invite New BoardMate Form */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-2 border-dashed border-purple-300 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Invite New BoardMate</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mate-email">Email Address *</Label>
                    <Input
                      id="mate-email"
                      type="email"
                      placeholder="Enter email address"
                      value={newMateForm.email}
                      onChange={(e) => handleNewMateFormChange('email', e.target.value)}
                      className={cn(
                        "bg-white",
                        !emailValidation.isValid && "border-red-300 focus:ring-red-500"
                      )}
                    />
                    {!emailValidation.isValid && (
                      <div className="flex items-center space-x-1 text-red-600 text-sm">
                        <AlertCircle className="w-3 h-3" />
                        <span>{emailValidation.message}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mate-name">Full Name *</Label>
                    <Input
                      id="mate-name"
                      placeholder="Enter full name"
                      value={newMateForm.full_name}
                      onChange={(e) => handleNewMateFormChange('full_name', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mate-role">Role</Label>
                  <Select 
                    value={newMateForm.role} 
                    onValueChange={(value: 'viewer' | 'member' | 'admin') => 
                      handleNewMateFormChange('role', value)
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-green-600" />
                          <div>
                            <div>Viewer</div>
                            <div className="text-xs text-gray-500">Can view and comment only</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center space-x-2">
                          <Edit className="w-4 h-4 text-blue-600" />
                          <div>
                            <div>Member</div>
                            <div className="text-xs text-gray-500">Can view, comment, and collaborate</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <div>
                            <div>Admin</div>
                            <div className="text-xs text-gray-500">Can manage vault and invite members</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddNewMate}
                    disabled={!canAddNewMate}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add to List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing BoardMates */}
      {!showInviteForm && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Your BoardMates</h4>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBoardMates.length > 0 ? (
            <div className="space-y-3">
              {filteredBoardMates.map((mate) => {
                const selected = isBoardMateSelected(mate.id);
                const roleConfig = ROLE_CONFIG[mate.role];
                const RoleIcon = roleConfig.icon;
                
                return (
                  <motion.div
                    key={mate.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-sm",
                        selected && "ring-2 ring-purple-500 bg-purple-50"
                      )}
                      onClick={() => handleBoardMateSelect(mate, !selected)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => handleBoardMateSelect(mate, !!checked)}
                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                          
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={mate.avatar_url} alt={mate.full_name} />
                            <AvatarFallback>{mate.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="font-medium text-gray-900 truncate">
                                {mate.full_name}
                              </h5>
                              <div className={cn(
                                "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                                roleConfig.bgColor
                              )}>
                                <RoleIcon className={cn("w-3 h-3", roleConfig.color)} />
                                <span className={roleConfig.color}>{roleConfig.label}</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{mate.email}</p>
                            {mate.organization && (
                              <p className="text-xs text-gray-400 mt-1">
                                {mate.organization.name}
                              </p>
                            )}
                          </div>
                          
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            mate.status === 'active' ? "bg-green-400" : "bg-gray-300"
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">
                {searchTerm ? 'No board mates found' : 'No board mates yet'}
              </h4>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? `No board mates match "${searchTerm}"`
                  : 'Invite your first team member to get started'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* New BoardMates List */}
      {data.newBoardMates.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">New Invitations ({data.newBoardMates.length})</h4>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Will be invited
            </Badge>
          </div>
          
          <div className="space-y-3">
            {data.newBoardMates.map((mate, index) => {
              const roleConfig = ROLE_CONFIG[mate.role];
              const RoleIcon = roleConfig.icon;
              
              return (
                <motion.div
                  key={`${mate.email}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h5 className="font-medium text-gray-900 truncate">
                              {mate.full_name}
                            </h5>
                            <div className={cn(
                              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                              roleConfig.bgColor
                            )}>
                              <RoleIcon className={cn("w-3 h-3", roleConfig.color)} />
                              <span className={roleConfig.color}>{roleConfig.label}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{mate.email}</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Will receive invitation email
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNewMate(index)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">BoardMates Ready</span>
          </div>
          <p className="text-green-700">
            {data.selectedBoardMates.length} existing members and {data.newBoardMates.length} new invitations will be added to your vault.
          </p>
        </motion.div>
      )}
    </div>
  );
}