'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Dynamically import AnnotationViewer to avoid SSR issues
const AnnotationViewer = dynamic(
  () => import('@/features/annotations/AnnotationViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }
);

// Mock data for demonstration
const MOCK_ASSET = {
  id: 'demo-asset-1',
  name: 'Q4 2024 Board Report.pdf',
  url: '/sample-document.pdf',
  vault_id: 'vault-1',
  vault_name: 'Board Documents',
};

export default function AnnotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const [assetData, setAssetData] = useState(MOCK_ASSET);
  const [isReady, setIsReady] = useState(false);

  // Wait for organization context to be ready
  useEffect(() => {
    if (!orgLoading) {
      setIsReady(true);
    }
  }, [orgLoading]);

  // In production, fetch the actual asset data
  useEffect(() => {
    // This would be an API call to get asset details
    // For now, we use mock data
    console.log('Loading annotation for ID:', params.id);
    console.log('Current organization:', currentOrganization);
    console.log('User:', user);
  }, [params.id, currentOrganization, user]);

  const handleClose = () => {
    router.push('/dashboard/annotations');
  };

  // Show loading while organization context is loading
  if (orgLoading || !isReady) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading annotation viewer...</p>
        </div>
      </div>
    );
  }

  // If no organization after loading, show selection prompt
  if (!currentOrganization) {
    // For demo purposes, use a default organization
    const defaultOrgId = '39fbf63f-efd9-4c68-a91f-e8c36bc88ecc'; // TestOrg ID from previous tests
    
    return (
      <div className="h-screen flex flex-col">
        <AnnotationViewer
          assetId={assetData.id}
          assetUrl={assetData.url}
          assetName={assetData.name}
          vaultId={assetData.vault_id}
          vaultName={assetData.vault_name}
          organizationId={defaultOrgId}
          currentUserId={user?.id || 'demo-user-id'}
          onClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <AnnotationViewer
        assetId={assetData.id}
        assetUrl={assetData.url}
        assetName={assetData.name}
        vaultId={assetData.vault_id}
        vaultName={assetData.vault_name}
        organizationId={currentOrganization.id}
        currentUserId={user?.id || 'demo-user-id'}
        onClose={handleClose}
      />
    </div>
  );
}