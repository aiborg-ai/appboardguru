'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { 
  Settings, 
  Users, 
  BarChart3, 
  Shield,
  List,
  Building2,
  FileText
} from 'lucide-react'

const adminModules = [
  {
    title: 'Dropdown Options',
    description: 'Manage industry, organization size, and other dropdown options',
    icon: List,
    href: '/admin/cms/dropdown-options',
    color: 'bg-blue-500',
  },
  {
    title: 'User Management',
    description: 'Manage user accounts, roles, and permissions',
    icon: Users,
    href: '/admin/users',
    color: 'bg-green-500',
    disabled: true,
  },
  {
    title: 'Organizations',
    description: 'Manage organizations and organization settings',
    icon: Building2,
    href: '/admin/organizations',
    color: 'bg-purple-500',
    disabled: true,
  },
  {
    title: 'System Settings',
    description: 'Configure system-wide settings and preferences',
    icon: Settings,
    href: '/admin/settings',
    color: 'bg-orange-500',
    disabled: true,
  },
  {
    title: 'Analytics',
    description: 'View system analytics and usage metrics',
    icon: BarChart3,
    href: '/admin/analytics',
    color: 'bg-indigo-500',
    disabled: true,
  },
  {
    title: 'Audit Logs',
    description: 'View detailed audit logs and security events',
    icon: Shield,
    href: '/admin/audit',
    color: 'bg-red-500',
    disabled: true,
  },
]

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System administration and content management</p>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => {
            const Icon = module.icon
            const content = (
              <Card className={`${module.disabled ? 'opacity-50' : 'hover:shadow-lg transition-shadow cursor-pointer'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${module.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span>{module.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{module.description}</p>
                  {module.disabled && (
                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Coming Soon
                    </div>
                  )}
                </CardContent>
              </Card>
            )

            return module.disabled ? (
              <div key={module.title}>
                {content}
              </div>
            ) : (
              <Link key={module.title} href={module.href}>
                {content}
              </Link>
            )
          })}
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Quick Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">--</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">--</div>
                <div className="text-sm text-gray-600">Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">--</div>
                <div className="text-sm text-gray-600">Board Packs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">--</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Recent Admin Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent admin activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}