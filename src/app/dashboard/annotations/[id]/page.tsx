'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnnotationViewer from '@/features/annotations/AnnotationViewer';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

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
  const { currentOrganization } = useOrganization();
  const [assetData, setAssetData] = useState(MOCK_ASSET);

  // In production, fetch the actual asset data
  useEffect(() => {
    // This would be an API call to get asset details
    // For now, we use mock data
    console.log('Loading annotation for ID:', params.id);
  }, [params.id]);

  const handleClose = () => {
    router.push('/dashboard/annotations');
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
          <p className="text-gray-600 mb-4">Please select an organization to view annotations</p>
          <Button onClick={() => router.push('/dashboard/organizations')}>
            Select Organization
          </Button>
        </div>
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
        currentUserId="current-user-id" // In production, get from auth context
        onClose={handleClose}
      />
    </div>
  );
}