'use client'

import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { FileText } from 'lucide-react'

export default function InstrumentsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Instruments</h1>
            <p className="text-gray-600">Manage all your board instruments and documents</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">This section is under development and will be available soon.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}