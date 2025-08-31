'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { CreateOrganizationRequest, OrganizationCreationResponse } from '@/features/organizations/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

// Lazy load the wizard and hook to prevent SSR issues
const CreateOrganizationWizard = dynamicImport(
  () => import('@/features/organizations/CreateOrganizationWizard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
);

// Import the hook directly - we'll handle SSR with the dynamic component
import { useCreateOrganization } from '@/hooks/useOrganizations';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState<OrganizationCreationResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const createOrganizationMutation = useCreateOrganization();

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Prevent redirect if already on signin page to avoid loops
        if (!window.location.pathname.includes('/auth/signin')) {
          router.push('/auth/signin');
        }
        return;
      }
      
      setCurrentUser({ id: user.id });
      setIsLoadingAuth(false);
    };

    getUser();
  }, [router]);

  const handleCreateOrganization = async (data: CreateOrganizationRequest): Promise<void> => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('Creating organization with data:', {
        name: data.organizationDetails.name,
        slug: data.organizationDetails.slug,
        description: data.organizationDetails.description,
        industry: data.organizationDetails.industry,
        organizationSize: data.organizationDetails.organizationSize,
      });

      // Check if mutation is available
      if (!createOrganizationMutation) {
        console.error('Create organization mutation not loaded yet');
        throw new Error('Organization creation service is initializing. Please try again.');
      }

      // Use the authenticated hook instead of raw fetch
      const result = await createOrganizationMutation.mutateAsync({
        name: data.organizationDetails.name,
        slug: data.organizationDetails.slug,
        description: data.organizationDetails.description,
        website: data.organizationDetails.website,
        industry: data.organizationDetails.industry,
        organizationSize: data.organizationDetails.organizationSize,
      });

      console.log('Organization creation API response:', result);

      // Validate the result has required fields
      if (!result.id || !result.name || !result.slug) {
        console.error('Invalid API response - missing required fields:', {
          hasId: !!result.id,
          hasName: !!result.name,
          hasSlug: !!result.slug,
          result
        });
        throw new Error('Organization created but response is missing required fields');
      }

      // Transform the result to match expected response format
      const response: OrganizationCreationResponse = {
        success: true,
        organization: {
          id: result.id,
          name: result.name,
          slug: result.slug,
        },
        invitationsSent: data.members?.invitations?.length || 0,
      };
      
      console.log('Setting created organization:', response);
      setCreatedOrganization(response);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error; // Re-throw to let the wizard handle the error display
    }
  };

  // Show loading screen while checking authentication or mutation not ready
  if (isLoadingAuth || !CreateOrganizationWizard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {isLoadingAuth ? 'Checking authentication...' : 'Loading organization wizard...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGoToOrganization = () => {
    if (createdOrganization?.organization) {
      const slug = createdOrganization.organization.slug;
      
      // Debug logging
      console.log('Navigating to organization:', {
        name: createdOrganization.organization.name,
        slug: slug,
        id: createdOrganization.organization.id,
        fullUrl: `/dashboard/organizations/${slug}`
      });
      
      if (!slug) {
        console.error('Organization slug is missing, falling back to organizations list');
        router.push('/dashboard/organizations');
        return;
      }
      
      // Navigate to the organization dashboard
      router.push(`/dashboard/organizations/${slug}`);
    } else {
      console.error('Created organization data is missing, redirecting to organizations list');
      router.push('/dashboard/organizations');
    }
  };

  const handleBackToOrganizations = () => {
    router.push('/dashboard/organizations');
  };

  if (isCompleted && createdOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Organization Created Successfully!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Welcome to <strong>{createdOrganization.organization?.name}</strong>! 
              Your organization has been set up and is ready to use.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">
                    {createdOrganization.organization?.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    boardguru.ai/{createdOrganization.organization?.slug}
                  </p>
                </div>
              </div>
            </div>

            {createdOrganization.invitationsSent && createdOrganization.invitationsSent > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>{createdOrganization.invitationsSent}</strong> invitation(s) have been sent to your team members.
                  They will receive emails with instructions to join your organization.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleGoToOrganization}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Go to Organization Dashboard
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleBackToOrganizations}
                className="w-full"
              >
                View All Organizations
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-2">
                Having trouble? Use "View All Organizations" to return to the main page.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>✓ Set up your organization profile and branding</p>
                <p>✓ Invite additional team members</p>
                <p>✓ Upload your first board pack</p>
                <p>✓ Configure governance settings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Header with back button */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/dashboard/organizations"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Organizations</span>
            </Link>
            
            <h1 className="text-xl font-semibold text-gray-900">
              Create New Organization
            </h1>
            
            <div className="w-32"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="flex-1 overflow-hidden">
        <CreateOrganizationWizard
          isOpen={true}
          onClose={() => router.push('/dashboard/organizations')}
          onComplete={handleCreateOrganization}
          className="h-full"
        />
      </div>
    </div>
  );
}