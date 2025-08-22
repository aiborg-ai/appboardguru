'use client'

import React from 'react'
import { Bell, Zap } from 'lucide-react'
import type { SecurityTabProps } from '@/types/security-types'

export function SecurityAlerts({ accountType, userId, organizationId }: SecurityTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Bell className="h-6 w-6 text-orange-600" />
          <span>Security Alerts</span>
        </h2>
        <p className="text-gray-600 mt-1">
          Configure security alert rules, notification routing, and escalation workflows
        </p>
      </div>
      
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
        <Zap className="h-16 w-16 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-orange-900 mb-2">Intelligent Alert Management</h3>
        <p className="text-orange-700">
          Smart alert configuration with ML-powered noise reduction and escalation workflows coming soon.
        </p>
      </div>
    </div>
  )
}