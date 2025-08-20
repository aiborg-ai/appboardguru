'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import CreateVaultWizard, { VaultWizardData } from '@/features/vaults/CreateVaultWizard';
import { 
  Vault,
  Plus,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

export default function CreateVaultPage() {
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    vault?: any;
    message?: string;
  } | null>(null);

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
      const response = await fetch('/api/vaults/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setCreationResult({
          success: true,
          vault: result.vault,
          message: 'Vault created successfully!',
        });

        // Redirect to the new vault after a short delay
        setTimeout(() => {
          router.push(`/dashboard/vaults/${result.vault.id}`);
        }, 2000);
      } else {
        setCreationResult({
          success: false,
          message: result.error || 'Failed to create vault',
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

  if (creationResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Vault Created Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your vault "{creationResult.vault?.name}" has been created and is ready for collaboration.
            </p>
            <div className="text-sm text-gray-500">
              Redirecting to your new vault...
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
              <Button 
                variant="outline"
                onClick={() => router.push('/dashboard/vaults')}
                className="w-full"
              >
                Back to Vaults
              </Button>
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
              <h1 className="text-xl font-semibold text-gray-900">Create New Vault</h1>
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
              <h3 className="font-semibold text-gray-900 mb-2">
                Organization Setup
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
              <h3 className="font-semibold text-gray-900 mb-2">
                Asset Management
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
              <h3 className="font-semibold text-gray-900 mb-2">
                Team Collaboration
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