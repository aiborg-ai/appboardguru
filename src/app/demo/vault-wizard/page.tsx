'use client';

import React, { useState } from 'react';
import CreateVaultWizard, { VaultWizardData } from '@/features/vaults/CreateVaultWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vault, Play, CheckCircle, AlertCircle } from 'lucide-react';

export default function VaultWizardDemo() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    data?: VaultWizardData;
    error?: string;
  } | null>(null);

  const handleStartDemo = () => {
    setIsWizardOpen(true);
    setLastResult(null);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
  };

  const handleVaultCreate = async (data: VaultWizardData) => {
    // Simulate API call
    console.log('Demo: Vault creation data:', data);
    
    // Mock successful creation
    setTimeout(() => {
      setLastResult({
        success: true,
        data,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Vault Creation Wizard Demo
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
            World-Class Vault Creation Experience
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Experience our beautiful, step-by-step vault creation workflow with organization setup,
            asset management, and team collaboration features.
          </p>
        </div>

        {/* Demo Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🏢</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Smart Organization
              </h3>
              <p className="text-sm text-gray-600">
                Select existing or create new organizations with auto-setup
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">📄</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Asset Selection
              </h3>
              <p className="text-sm text-gray-600">
                Intelligent asset filtering with drag-and-drop interface
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Team Invitations
              </h3>
              <p className="text-sm text-gray-600">
                Role-based access with automated invitation system
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Real-time Updates
              </h3>
              <p className="text-sm text-gray-600">
                Live notifications and instant vault availability
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Start Demo Button */}
        <div className="text-center mb-8">
          <Button
            onClick={handleStartDemo}
            size="lg"
            className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Demo
          </Button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {lastResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Demo Completed Successfully!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>Demo Failed</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastResult.success && lastResult.data ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Vault Configuration:</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <p><strong>Name:</strong> {lastResult.data.vaultName || 'Not specified'}</p>
                      <p><strong>Type:</strong> {lastResult.data.vaultType}</p>
                      <p><strong>Access Level:</strong> {lastResult.data.accessLevel}</p>
                      <p><strong>Organization:</strong> {
                        lastResult.data.selectedOrganization?.name || 
                        lastResult.data.createNewOrganization?.name || 
                        'None'
                      }</p>
                      <p><strong>Assets:</strong> {lastResult.data.selectedAssets.length} selected</p>
                      <p><strong>Board Mates:</strong> {
                        lastResult.data.selectedBoardMates.length + lastResult.data.newBoardMates.length
                      } total ({lastResult.data.newBoardMates.length} new invitations)</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setLastResult(null)}
                    >
                      Clear Results
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-red-600">{lastResult.error}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Technical Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">UI/UX</h4>
              <ul className="text-gray-600 space-y-1">
                <li>✓ Framer Motion animations</li>
                <li>✓ Progressive form validation</li>
                <li>✓ Responsive design</li>
                <li>✓ Accessibility compliant</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Backend</h4>
              <ul className="text-gray-600 space-y-1">
                <li>✓ Supabase integration</li>
                <li>✓ Real-time subscriptions</li>
                <li>✓ Row-level security</li>
                <li>✓ Automated invitations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
              <ul className="text-gray-600 space-y-1">
                <li>✓ Auto organization creation</li>
                <li>✓ Asset management</li>
                <li>✓ Role-based permissions</li>
                <li>✓ Audit logging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Wizard */}
      <CreateVaultWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
        onComplete={handleVaultCreate}
      />
    </div>
  );
}