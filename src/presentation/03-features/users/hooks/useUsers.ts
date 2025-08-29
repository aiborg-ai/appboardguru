/**
 * useUsers Hook
 * Custom hook for user management operations
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commandBus } from '@/application/cqrs/command-bus';
import { CreateUserCommand } from '@/application/cqrs/commands/create-user.command';
import { GetUserByIdQuery, GetUserByEmailQuery } from '@/application/cqrs/queries/get-user.query';
import { Result } from '@/01-shared/lib/result';
import { UserRole } from '@/domain/entities/user.entity';
import { toast } from 'sonner';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  organizationId?: string;
}

export interface UserListFilters {
  role?: UserRole;
  status?: string;
  searchTerm?: string;
  organizationId?: string;
}

export function useUsers(filters?: UserListFilters) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch users list
  const {
    data: users,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      // In a real implementation, create a GetUsersQuery
      // For now, return mock data
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch single user
  const { data: selectedUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      
      const query = new GetUserByIdQuery({ userId: selectedUserId });
      const result = await commandBus.executeQuery(query);
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    enabled: !!selectedUserId,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const command = new CreateUserCommand({
        ...data,
        sendWelcomeEmail: true
      });
      
      const result = await commandBus.executeCommand(command);
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${data.fullName} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserData> }) => {
      // In real implementation, create UpdateUserCommand
      // For now, return mock
      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // In real implementation, create DeleteUserCommand
      // For now, return mock
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
      setSelectedUserId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  });

  // Check if email exists
  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    const query = new GetUserByEmailQuery({ email });
    const result = await commandBus.executeQuery(query);
    
    if (!result.success) {
      console.error('Failed to check email:', result.error);
      return false;
    }
    
    return result.data !== null;
  }, []);

  // Bulk operations
  const bulkDeleteUsers = useCallback(async (userIds: string[]) => {
    try {
      // In real implementation, create BulkDeleteUsersCommand
      await Promise.all(userIds.map(id => deleteUserMutation.mutateAsync(id)));
      toast.success(`Deleted ${userIds.length} users`);
    } catch (error) {
      toast.error('Failed to delete some users');
    }
  }, [deleteUserMutation]);

  const bulkUpdateRole = useCallback(async (userIds: string[], role: UserRole) => {
    try {
      // In real implementation, create BulkUpdateRoleCommand
      toast.success(`Updated role for ${userIds.length} users`);
    } catch (error) {
      toast.error('Failed to update roles');
    }
  }, []);

  return {
    // Data
    users,
    selectedUser,
    
    // Loading states
    isLoading,
    isLoadingUser,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    
    // Errors
    error,
    
    // Actions
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    selectUser: setSelectedUserId,
    refetchUsers: refetch,
    checkEmailExists,
    bulkDeleteUsers,
    bulkUpdateRole,
  };
}