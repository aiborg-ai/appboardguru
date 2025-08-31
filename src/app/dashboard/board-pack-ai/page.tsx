'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import InstrumentPlayWizard, { InstrumentPlayWizardData } from '@/features/instruments/InstrumentPlayWizard'
import { getInstrumentConfig } from '@/lib/instruments/instrument-configs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { Brain, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BoardPackAIPage() {
  const router = useRouter()
  const instrumentId = 'board-pack-ai'
  
  const [isWizardOpen, setIsWizardOpen] = useState(true)
  const [completionResult, setCompletionResult] = useState<{
    success: boolean
    message?: string
    results?: any
  } | null>(null)

  // Get instrument configuration
  const instrumentConfig = getInstrumentConfig(instrumentId)

  const handleWizardClose = useCallback(() => {
    setIsWizardOpen(false)
    router.push('/dashboard/instruments')
  }, [router])

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
      })

      const result = await response.json()

      if (response.ok) {
        setCompletionResult({
          success: true,
          message: 'Board Pack analysis completed and results saved successfully!',
          results: result
        })

        // Auto-redirect after showing success
        setTimeout(() => {
          router.push('/dashboard/instruments')
        }, 3000)
      } else {
        setCompletionResult({
          success: false,
          message: result.error || 'Failed to complete Board Pack analysis'
        })
      }
    } catch (error) {
      console.error('Error completing Board Pack analysis:', error)
      setCompletionResult({
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      })
    }
  }, [router])

  // Handle invalid instrument configuration
  if (!instrumentConfig) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <PageHeader
            icon={Brain}
            title="Board Pack AI"
            description="Configuration Error"
          />
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Configuration Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                The Board Pack AI instrument configuration could not be loaded.
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
    )
  }

  // Show completion result
  if (completionResult) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <PageHeader
            icon={Brain}
            title="Board Pack AI"
            description={completionResult.success ? "Analysis Complete" : "Analysis Failed"}
          />
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="p-8 text-center">
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
                    onClick={() => {
                      setCompletionResult(null)
                      setIsWizardOpen(true)
                    }}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard/instruments')}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Instruments
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Render wizard
  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {!isWizardOpen && (
          <div className="p-6">
            <PageHeader
              icon={Brain}
              title="Board Pack AI"
              description="AI-powered analysis and insights for your board documents"
            />
            <div className="mt-8 text-center">
              <Button 
                onClick={() => setIsWizardOpen(true)}
                size="lg"
              >
                Start Board Pack Analysis
              </Button>
            </div>
          </div>
        )}
        
        {isWizardOpen && (
          <InstrumentPlayWizard
            isOpen={isWizardOpen}
            onClose={handleWizardClose}
            onComplete={handleWizardComplete}
            instrumentConfig={instrumentConfig}
          />
        )}
      </div>
    </DashboardLayout>
  )
}