'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateOrganizationWizard from '@/features/organizations/CreateOrganizationWizard';
import { CreateOrganizationRequest, OrganizationCreationResponse } from '@/features/organizations/types';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState<OrganizationCreationResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Redirect to sign in if not authenticated
        router.push('/auth/signin');
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

      const response = await fetch('/api/organizations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          createdBy: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create organization');
      }

      const result: { data: OrganizationCreationResponse } = await response.json();
      
      setCreatedOrganization(result.data);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error; // Re-throw to let the wizard handle the error display
    }
  };

  // Show loading screen while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGoToOrganization = () => {
    if (createdOrganization?.organization) {
      // TODO: Navigate to the organization dashboard
      router.push(`/dashboard/organizations/${createdOrganization.organization.slug}`);
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
                Back to Organizations
              </Button>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200">
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
      <CreateOrganizationWizard
        isOpen={true}
        onClose={() => router.push('/dashboard/organizations')}
        onComplete={handleCreateOrganization}
        className="border-none shadow-none bg-transparent max-w-none max-h-none overflow-visible"
      />
    </div>
  );
}