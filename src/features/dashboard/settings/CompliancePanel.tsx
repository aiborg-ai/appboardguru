'use client'

import React, { useState } from 'react'
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  FileCheck,
  GraduationCap,
  Scale,
  Eye,
  Calendar,
  TrendingUp,
  Award,
  AlertTriangle,
  Download,
  ExternalLink
} from 'lucide-react'

interface ComplianceItem {
  id: string
  title: string
  type: 'training' | 'policy' | 'certification' | 'declaration'
  status: 'completed' | 'pending' | 'overdue' | 'upcoming'
  dueDate?: string
  completedDate?: string
  expiryDate?: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

interface AuditEvent {
  id: string
  timestamp: string
  action: string
  resource: string
  outcome: 'success' | 'warning' | 'failure'
  details: string
}

export function CompliancePanel() {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([
    {
      id: '1',
      title: 'SOX Compliance Training',
      type: 'training',
      status: 'completed',
      completedDate: '2024-01-15',
      expiryDate: '2025-01-15',
      description: 'Annual Sarbanes-Oxley Act compliance training for executives',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Data Privacy Policy Acknowledgment',
      type: 'policy',
      status: 'pending',
      dueDate: '2024-02-01',
      description: 'Review and acknowledge updated GDPR data privacy policies',
      priority: 'high'
    },
    {
      id: '3',
      title: 'CPA License Renewal',
      type: 'certification',
      status: 'upcoming',
      dueDate: '2024-06-30',
      description: 'Renew Certified Public Accountant professional license',
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Conflict of Interest Declaration',
      type: 'declaration',
      status: 'completed',
      completedDate: '2024-01-01',
      expiryDate: '2025-01-01',
      description: 'Annual conflict of interest disclosure for board members',
      priority: 'high'
    },
    {
      id: '5',
      title: 'Cybersecurity Awareness Training',
      type: 'training',
      status: 'overdue',
      dueDate: '2024-01-10',
      description: 'Mandatory cybersecurity training for all employees',
      priority: 'high'
    }
  ])

  const [auditEvents] = useState<AuditEvent[]>([
    {
      id: '1',
      timestamp: '2024-01-20 14:30:00',
      action: 'Document Access',
      resource: 'Financial Report Q4 2023',
      outcome: 'success',
      details: 'Accessed quarterly financial report for board review'
    },
    {
      id: '2',
      timestamp: '2024-01-20 09:15:00',
      action: 'Policy Acknowledgment',
      resource: 'IT Security Policy v2.1',
      outcome: 'success',
      details: 'Acknowledged updated IT security policy'
    },
    {
      id: '3',
      timestamp: '2024-01-19 16:45:00',
      action: 'Data Export',
      resource: 'Employee Directory',
      outcome: 'warning',
      details: 'Exported employee directory with manager approval'
    },
    {
      id: '4',
      timestamp: '2024-01-19 11:20:00',
      action: 'Login Attempt',
      resource: 'Compliance Dashboard',
      outcome: 'failure',
      details: 'Failed login attempt from unrecognized location'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'upcoming':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training':
        return <GraduationCap className="h-4 w-4" />
      case 'policy':
        return <FileCheck className="h-4 w-4" />
      case 'certification':
        return <Award className="h-4 w-4" />
      case 'declaration':
        return <Scale className="h-4 w-4" />
      default:
        return <FileCheck className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const completedCount = complianceItems.filter(item => item.status === 'completed').length
  const totalCount = complianceItems.length
  const complianceScore = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Compliance Status</h3>
              <p className="text-green-700">Your compliance posture is strong</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{complianceScore}%</div>
            <div className="text-sm text-green-700">Compliance Score</div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {complianceItems.filter(item => item.status === 'completed').length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {complianceItems.filter(item => item.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {complianceItems.filter(item => item.status === 'overdue').length}
            </div>
            <div className="text-sm text-red-700">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {complianceItems.filter(item => item.status === 'upcoming').length}
            </div>
            <div className="text-sm text-blue-700">Upcoming</div>
          </div>
        </div>
      </div>

      {/* Compliance Items */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Compliance Requirements</h3>
              <p className="text-sm text-gray-600 mt-1">Training, policies, and certifications</p>
            </div>
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {complianceItems.map(item => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-600">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span>{item.status}</span>
                    </div>
                    <div className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority} priority
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {item.dueDate && (
                    <div>
                      <span className="text-gray-600">Due Date:</span>
                      <span className="ml-1 text-gray-900">{item.dueDate}</span>
                    </div>
                  )}
                  {item.completedDate && (
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="ml-1 text-gray-900">{item.completedDate}</span>
                    </div>
                  )}
                  {item.expiryDate && (
                    <div>
                      <span className="text-gray-600">Expires:</span>
                      <span className="ml-1 text-gray-900">{item.expiryDate}</span>
                    </div>
                  )}
                </div>
                
                {item.status === 'pending' && (
                  <div className="mt-3 flex space-x-2">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Complete Now
                    </button>
                    <button className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50">
                      View Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Audit Trail */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
            </div>
            <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
              <ExternalLink className="h-4 w-4" />
              <span>View Full Log</span>
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {auditEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getOutcomeIcon(event.outcome)}
                  <div>
                    <div className="font-medium text-gray-900">{event.action}</div>
                    <div className="text-sm text-gray-600">{event.resource}</div>
                    <div className="text-xs text-gray-500">{event.details}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">
                    {new Date(event.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regulatory Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Scale className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-gray-900">Regulatory Framework</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">SOX Compliance:</span>
              <span className="text-green-600 font-medium">Current</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GDPR Status:</span>
              <span className="text-green-600 font-medium">Compliant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SEC Filings:</span>
              <span className="text-green-600 font-medium">Up to Date</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Industry Standards:</span>
              <span className="text-yellow-600 font-medium">Pending Review</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Compliance Metrics</h4>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Score</span>
                <span className="font-medium">{complianceScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${complianceScore}%` }}
                ></div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">Quick Actions</h4>
              <p className="text-sm text-blue-800">Common compliance tasks</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Submit Declaration
            </button>
            <button className="px-3 py-2 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-100">
              Request Extension
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}