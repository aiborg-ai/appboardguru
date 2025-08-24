'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import CreateVaultWizard, { VaultWizardData } from '@/features/vaults/CreateVaultWizard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { createTypedSupabaseClient } from '@/lib/supabase-typed';
import { 
  Vault,
  Plus,
  ArrowLeft,
  CheckCircle,
  Building2
} from 'lucide-react';
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip';

export default function CreateVaultPage() {
  const router = useRouter();
  const { refreshOrganizations } = useOrganization();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    vault?: any;
    organization?: any;
    message?: string;
  } | null>(null);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = await createTypedSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error('Authentication check failed:', error);
          setAuthError('You must be logged in to create vaults. Redirecting to login...');
          setTimeout(() => {
            router.push('/login?redirect=/dashboard/vaults/create');
          }, 2000);
          return;
        }

        // Verify user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, email, full_name, role, status')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('User profile not found:', profileError);
          setAuthError('Your user profile is incomplete. Please contact support.');
          return;
        }

        if (profile.status !== 'approved') {
          setAuthError('Your account is not yet approved. Please wait for approval or contact support.');
          return;
        }

        console.log('Authentication successful:', { user: user.email, profile: profile.full_name });
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthError('Failed to verify authentication. Please try refreshing the page.');
      }
    };

    checkAuth();
  }, [router]);

  const handleStartCreate = () => {
    setIsWizardOpen(true);
    setCreationResult(null);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
  };

  const handleVaultCreate = async (data: VaultWizardData) => {
    setIsCreating(true);
    
    try {
      console.log('Creating vault with data:', data);
      
      // Get fresh auth token before making request
      const supabase = await createTypedSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No valid session for API call:', sessionError);
        setCreationResult({
          success: false,
          message: 'Session expired. Please log in again.',
        });
        return;
      }
      
      const response = await fetch('/api/vaults/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('Vault creation result:', result);

      if (response.ok) {
        // If a new organization was created, refresh the organization list
        if (result.organization) {
          console.log('New organization created:', result.organization);
          await refreshOrganizations();
        }

        setCreationResult({
          success: true,
          vault: result.vault,
          organization: result.organization,
          message: result.organization 
            ? `Organization "${result.organization.name}" and vault "${result.vault?.name}" created successfully!`
            : 'Vault created successfully!',
        });

        // Redirect to the new vault after a short delay
        setTimeout(() => {
          router.push(`/dashboard/vaults/${result.vault.id}`);
        }, 3000); // Slightly longer delay to show success message
      } else {
        console.error('Vault creation failed:', result);
        setCreationResult({
          success: false,
          message: result.error || result.details || 'Failed to create vault',
        });
      }
    } catch (error) {
      console.error('Error creating vault:', error);
      setCreationResult({
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Authentication</h2>
            <p className="text-gray-600">Verifying your access permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show auth error if authentication failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">{authError}</p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/login')} className="w-full">
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (creationResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {creationResult.organization ? 'Organization & Vault Created!' : 'Vault Created Successfully!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {creationResult.message}
            </p>
            
            {/* Organization info if created */}
            {creationResult.organization && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">New Organization</span>
                </div>
                <p className="text-sm text-blue-800">
                  <strong>{creationResult.organization?.name}</strong> is now available in your organizations list!
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  You can invite team members and create more vaults under this organization.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                Redirecting to your new vault in 3 seconds...
              </div>
              <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto" />
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Or choose where to go:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/vaults/${creationResult.vault?.id}`)}
                    className="w-full"
                  >
                    Go to Vault
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/organizations')}
                    className="w-full"
                  >
                    View Organizations
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (creationResult?.success === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Vault className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Creation Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {creationResult.message}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setCreationResult(null)}
                className="w-full"
              >
                Try Again
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/vaults')}
                  className="w-full"
                >
                  Back to Vaults
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/organizations')}
                  className="w-full"
                >
                  View Organizations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/vaults')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Vaults</span>
              </Button>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                Create New Vault
                <InfoTooltip
                  content={
                    <InfoSection
                      title="Vault Creation Process"
                      description="Our guided wizard will help you set up your secure vault in just a few steps."
                      features={[
                        "Choose or create organization context",
                        "Configure security and access settings", 
                        "Set up initial document structure",
                        "Invite team members with appropriate roles",
                        "Automated backup and sync configuration"
                      ]}
                      tips={[
                        "Prepare your organization details beforehand",
                        "Consider your team structure for permissions",
                        "Start with essential documents and expand later"
                      ]}
                    />
                  }
                  size="sm"
                />
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Vault className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your Vault
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Set up a secure workspace for your team to collaborate on board documents, 
            share insights, and manage access with world-class organization.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 justify-center">
                Organization Setup
                <InfoTooltip
                  content="Choose an existing organization or create a new one. Organizations help you manage multiple vaults and control access across your board governance structure."
                  size="sm"
                />
              </h3>
              <p className="text-sm text-gray-600">
                Choose existing organization or create a new one with automated setup
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Vault className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 justify-center">
                Asset Management
                <InfoTooltip
                  content="Upload and organize your board documents with automatic categorization. Supports version control, digital signatures, and secure sharing."
                  size="sm"
                />
              </h3>
              <p className="text-sm text-gray-600">
                Add documents from your library with intelligent organization and search
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 justify-center">
                Team Collaboration
                <InfoTooltip
                  content="Invite board members with customizable roles and permissions. Features real-time notifications, activity tracking, and secure communication channels."
                  size="sm"
                />
              </h3>
              <p className="text-sm text-gray-600">
                Invite board mates with role-based access and instant notifications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={handleStartCreate}
            size="lg"
            className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
            disabled={isCreating}
          >
            <Plus className="w-5 h-5 mr-2" />
            Start Creating Vault
          </Button>
        </div>
      </div>

      {/* Wizard */}
      <CreateVaultWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
        onComplete={handleVaultCreate}
      />
    </div>
  );
}