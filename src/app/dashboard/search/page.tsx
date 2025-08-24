'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import UniversalSearch from '@/components/search/UniversalSearch'
import { Search } from 'lucide-react'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

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
          <UniversalSearch 
            query={initialQuery}
            autoFocus={!initialQuery}
            placeholder="Search across all content..."
          />
        </div>
      </div>
    </DashboardLayout>
  )
}