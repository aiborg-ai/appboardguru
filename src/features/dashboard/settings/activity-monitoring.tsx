'use client'

import React from 'react'
import { Activity, TrendingUp } from 'lucide-react'
import type { SecurityTabProps } from '@/types/security-types'

export function ActivityMonitoring({ accountType, userId, organizationId }: SecurityTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Activity className="h-6 w-6 text-purple-600" />
          <span>Activity Monitoring</span>
        </h2>
        <p className="text-gray-600 mt-1">
          Comprehensive activity logs, user behavior analytics, and pattern detection
        </p>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
        <TrendingUp className="h-16 w-16 text-purple-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-purple-900 mb-2">Advanced Activity Monitoring</h3>
        <p className="text-purple-700">
          Enhanced activity tracking with behavioral analytics and anomaly detection coming soon.
        </p>
      </div>
    </div>
  )
}