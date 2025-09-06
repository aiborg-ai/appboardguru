/**
 * User Management Page
 * Complete example of the new architecture in action
 */

'use client';

import React, { useState } from 'react';
import { UserRole } from '@/domain/entities/user.entity';
import { useUsers } from '../hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Filter, Download, Trash2 } from 'lucide-react';

export function UserManagementPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const {
    users,
    isLoading,
    isCreating,
    createUser,
    deleteUser,
    bulkDeleteUsers,
    bulkUpdateRole,
    checkEmailExists,
  } = useUsers({
    searchTerm: searchTerm || undefined,
    role: selectedRole !== 'all' ? selectedRole : undefined,
  });

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as UserRole;

    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      alert('A user with this email already exists');
      return;
    }

    createUser(
      {
        email,
        firstName,
        lastName,
        role,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          (event.target as HTMLFormElement).reset();
        },
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
      bulkDeleteUsers(selectedUsers);
      setSelectedUsers([]);
    }
  };

  const handleBulkRoleChange = (role: UserRole) => {
    if (selectedUsers.length === 0) return;
    
    bulkUpdateRole(selectedUsers, role);
    setSelectedUsers([]);
  };

  const handleExport = () => {
    // In real implementation, trigger export command
    console.log('Exporting users...');
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'destructive';
      case UserRole.DIRECTOR:
        return 'default';
      case UserRole.MEMBER:
        return 'secondary';
      case UserRole.VIEWER:
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions using the new hexagonal architecture
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.DIRECTOR}>Director</SelectItem>
                <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>

            {selectedUsers.length > 0 && (
              <>
                <Select onValueChange={(value) => handleBulkRoleChange(value as UserRole)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMIN}>Set as Admin</SelectItem>
                    <SelectItem value={UserRole.DIRECTOR}>Set as Director</SelectItem>
                    <SelectItem value={UserRole.MEMBER}>Set as Member</SelectItem>
                    <SelectItem value={UserRole.VIEWER}>Set as Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedUsers.length})
                </Button>
              </>
            )}

            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {users?.total || 0} total users • Powered by CQRS and Event-Driven Architecture
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users?.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Create your first user to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(users?.items.map(u => u.id) || []);
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={selectedUsers.length === users?.items.length}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.items.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system using the CreateUserCommand
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={UserRole.MEMBER}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.DIRECTOR}>Director</SelectItem>
                    <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                    <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}