'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamically import AnnotationViewer to avoid SSR issues
const AnnotationViewer = dynamic(
  () => import('@/features/annotations/AnnotationViewer').catch((err) => {
    console.error('Failed to load AnnotationViewer:', err);
    // Return a fallback component
    return {
      default: () => (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Viewer</h3>
            <p className="text-gray-600 mb-4">The annotation viewer failed to load. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    };
  }),
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
  const [error, setError] = useState<string | null>(null);

  // Wait for organization context to be ready
  useEffect(() => {
    if (!orgLoading) {
      setIsReady(true);
    }
  }, [orgLoading]);

  // In production, fetch the actual asset data
  useEffect(() => {
    try {
      // This would be an API call to get asset details
      // For now, we use mock data
      console.log('Loading annotation for ID:', params.id);
      console.log('Current organization:', currentOrganization);
      console.log('User:', user);
      
      // Validate required data
      if (!params.id) {
        setError('Invalid annotation ID');
        return;
      }
    } catch (err) {
      console.error('Error loading annotation:', err);
      setError('Failed to load annotation');
    }
  }, [params.id, currentOrganization, user]);

  const handleClose = () => {
    router.push('/dashboard/annotations');
  };

  // Show error if any
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Annotation</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleClose} variant="outline">
            Back to Annotations
          </Button>
        </div>
      </div>
    );
  }

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
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('AnnotationViewer Error (No Org):', error);
          console.error('Error Info:', errorInfo);
          setError('Failed to load annotation viewer. Please try again.');
        }}
      >
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('AnnotationViewer Error:', error);
        console.error('Error Info:', errorInfo);
        setError('Failed to load annotation viewer. Please try again.');
      }}
    >
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
    </ErrorBoundary>
  );
}