/**
 * Performance Dashboard Page
 * Main dashboard for monitoring application performance
 */

'use client'

import { Suspense } from 'react'
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { Card } from '@/components/ui/card'

export default function PerformanceDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Performance Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Real-time application performance metrics and optimization recommendations
        </p>
      </div>

      <Suspense fallback={<PerformanceDashboardSkeleton />}>
        <PerformanceDashboard 
          showAdvanced={true}
          autoRefresh={true}
          refreshInterval={30000}
        />
      </Suspense>
    </div>
  )
}

function PerformanceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="flex gap-4">
          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}