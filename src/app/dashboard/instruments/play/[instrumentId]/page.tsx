'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout';
import InstrumentPlayWizard, { InstrumentPlayWizardData } from '@/features/instruments/InstrumentPlayWizard';
import { getInstrumentConfig } from '@/lib/instruments/instrument-configs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function InstrumentPlayPage() {
  const router = useRouter();
  const params = useParams();
  const instrumentId = params.instrumentId as string;
  
  const [isWizardOpen, setIsWizardOpen] = useState(true);
  const [completionResult, setCompletionResult] = useState<{
    success: boolean;
    message?: string;
    results?: any;
  } | null>(null);

  // Get instrument configuration
  const instrumentConfig = getInstrumentConfig(instrumentId);

  const handleWizardClose = useCallback(() => {
    setIsWizardOpen(false);
    router.push('/dashboard/instruments');
  }, [router]);

  const handleWizardComplete = useCallback(async (data: InstrumentPlayWizardData) => {
    try {
      // In a real implementation, this would call your analysis API
      const response = await fetch('/api/instruments/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instrumentId: data.instrumentId,
          goal: data.selectedGoal,
          assets: data.selectedAssets,
          saveOptions: data.saveOptions,
          results: data.analysisResults
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setCompletionResult({
          success: true,
          message: 'Analysis completed and results saved successfully!',
          results: result
        });

        // Auto-redirect after showing success
        setTimeout(() => {
          router.push('/dashboard/instruments');
        }, 3000);
      } else {
        setCompletionResult({
          success: false,
          message: result.error || 'Failed to complete analysis'
        });
      }
    } catch (error) {
      console.error('Error completing analysis:', error);
      setCompletionResult({
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  }, [router]);

  // Handle invalid instrument ID
  if (!instrumentConfig) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Instrument Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                The requested instrument "{instrumentId}" could not be found or is not available.
              </p>
              <Button 
                onClick={() => router.push('/dashboard/instruments')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Instruments
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show completion result
  if (completionResult) {
    return (
      <DashboardLayout>
        <div className={cn(
          "min-h-screen flex items-center justify-center p-4",
          completionResult.success 
            ? "bg-gradient-to-br from-green-50 to-blue-50" 
            : "bg-gradient-to-br from-red-50 to-orange-50"
        )}>
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
                completionResult.success ? "bg-green-100" : "bg-red-100"
              )}>
                {completionResult.success ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {completionResult.success ? 'Analysis Complete!' : 'Analysis Failed'}
              </h2>
              <p className="text-gray-600 mb-6">
                {completionResult.message}
              </p>
              {completionResult.success ? (
                <div className="text-sm text-gray-500 mb-6">
                  Redirecting to instruments page...
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setCompletionResult(null)}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard/instruments')}
                    className="w-full"
                  >
                    Back to Instruments
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <InstrumentPlayWizard
          isOpen={isWizardOpen}
          onClose={handleWizardClose}
          onComplete={handleWizardComplete}
          instrumentConfig={instrumentConfig}
        />
      </div>
    </DashboardLayout>
  );
}

// Helper function for classnames
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}