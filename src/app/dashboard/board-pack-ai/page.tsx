'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { Brain } from 'lucide-react'

export default function BoardPackAIPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Board Pack AI</h1>
            <p className="text-gray-600">AI-powered analysis and insights for your board documents</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">AI-powered board pack analysis is under development.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}