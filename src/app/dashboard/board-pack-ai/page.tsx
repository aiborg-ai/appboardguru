'use client'

import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import InstrumentPlayWizard from '@/features/instruments/InstrumentPlayWizard'
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
        
        <InstrumentPlayWizard instrumentId="board-pack-ai" />
      </div>
    </DashboardLayout>
  )
}