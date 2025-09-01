/**
 * Hook for managing user and organization assets
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { useState, useEffect } from 'react'

type Asset = Database['public']['Tables']['assets']['Row']

interface LegacyAsset {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  status: 'processing' | 'ready' | 'failed';
  summary?: string;
  uploaded_by: string;
  organization_id: string;
}

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (userId: string) => [...assetKeys.lists(), userId] as const,
  userAssets: () => ['user-assets'] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
  organization: (orgId: string) => [...assetKeys.all, 'organization', orgId] as const,
}

async function fetchUserAssets(userId: string): Promise<Asset[]> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('owner_id', userId)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user assets:', error)
    throw error
  }

  return data || []
}

async function fetchAsset(id: string): Promise<Asset> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching asset:', error)
    throw error
  }

  return data
}

async function deleteAsset(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  
  // Soft delete - just mark as deleted
  const { error } = await supabase
    .from('assets')
    .update({ 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting asset:', error)
    throw error
  }
}

// Modern React Query hooks
export function useUserAssets() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: assetKeys.userAssets(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      return fetchUserAssets(user.id)
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => fetchAsset(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.userAssets() })
      toast({
        title: 'Asset deleted',
        description: 'The asset has been deleted successfully.',
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete asset',
        description: error instanceof Error ? error.message : 'An error occurred while deleting the asset.',
        variant: 'destructive',
      })
    },
  })
}

export function useRefreshAssets() {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.invalidateQueries({ queryKey: assetKeys.all })
    queryClient.invalidateQueries({ queryKey: assetKeys.userAssets() })
  }
}

// Legacy hook for backward compatibility
export function useAssets(organizationId?: string) {
  const [assets, setAssets] = useState<LegacyAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    const loadAssets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/assets?organization_id=${organizationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load assets');
        }
        
        const result = await response.json();
        setAssets(result.data || []);
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('Failed to load assets. Please try again.');
        setAssets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [organizationId]);

  return { assets, isLoading, error };
}