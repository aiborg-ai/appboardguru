'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import UniversalSearch from '@/components/search/UniversalSearch'
import { Search } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  return (
    <UniversalSearch 
      query={initialQuery}
      autoFocus={!initialQuery}
      placeholder="Search across all content..."
    />
  )
}

export default function SearchPage() {

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Search className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Universal Search</h1>
            </div>
            <p className="text-gray-600">
              Search across all your organizations, assets, meetings, vaults, and more
            </p>
          </div>

          {/* Search Component */}
          <Suspense fallback={<div className="animate-pulse">Loading search...</div>}>
            <SearchContent />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}