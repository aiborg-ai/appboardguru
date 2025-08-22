import { useState, useEffect } from 'react';

interface Asset {
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

export function useAssets(organizationId?: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
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