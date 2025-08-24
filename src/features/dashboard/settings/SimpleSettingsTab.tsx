'use client'

import React from 'react'
import { Card } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { 
  User, 
  Bell, 
  Shield, 
  Download,
  Settings
} from 'lucide-react'
import type { UserId, OrganizationId } from '@/types/branded'

interface SimpleSettingsTabProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export function SimpleSettingsTab({ accountType, userId, organizationId }: SimpleSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-semibold">Settings Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-medium">Account Information</h3>
                <p className="text-sm text-gray-600">
                  Account Type: <span className="font-medium">{accountType}</span>
                </p>
                <p className="text-sm text-gray-600">
                  User ID: <span className="font-mono text-xs">{userId}</span>
                </p>
                {organizationId && (
                  <p className="text-sm text-gray-600">
                    Organization: <span className="font-mono text-xs">{organizationId}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="font-medium">Notifications</h3>
                <p className="text-sm text-gray-600">
                  Configure notification preferences
                </p>
                <Button size="sm" className="mt-2">
                  Manage Notifications
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-medium">Security</h3>
                <p className="text-sm text-gray-600">
                  Security settings and activity
                </p>
                <Button size="sm" className="mt-2">
                  Security Settings
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Download className="h-8 w-8 text-gray-600" />
              <div>
                <h3 className="font-medium">Export & Backup</h3>
                <p className="text-sm text-gray-600">
                  Data export and backup options
                </p>
                <Button size="sm" className="mt-2">
                  Export Data
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Database Setup Status</h3>
            <p className="text-sm text-blue-700 mt-1">
              The settings system is ready to use! Make sure you've run the database setup scripts:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
              <li>Run <code className="bg-blue-100 px-1 rounded">20250823120000_create_settings_tables.sql</code></li>
              <li>Run <code className="bg-blue-100 px-1 rounded">20250823120001_seed_test_settings_data.sql</code></li>
              <li>Test with user: <code className="bg-blue-100 px-1 rounded">test.director@appboardguru.com</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}