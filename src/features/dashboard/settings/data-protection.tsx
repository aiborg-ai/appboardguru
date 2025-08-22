'use client'

import React from 'react'
import { Lock, Database } from 'lucide-react'
import type { SecurityTabProps } from '@/types/security-types'

export function DataProtection({ accountType, userId, organizationId }: SecurityTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Lock className="h-6 w-6 text-teal-600" />
          <span>Data Protection</span>
        </h2>
        <p className="text-gray-600 mt-1">
          Data loss prevention, encryption management, and privacy controls
        </p>
      </div>
      
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-8 text-center">
        <Database className="h-16 w-16 text-teal-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-teal-900 mb-2">Enterprise Data Protection</h3>
        <p className="text-teal-700">
          Advanced DLP, encryption management, and GDPR compliance tools coming soon.
        </p>
      </div>
    </div>
  )
}