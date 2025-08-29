'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useNotificationEscalation } from '@/hooks/useNotificationEscalation'
import {
  Bell,
  BellRing,
  AlertTriangle,
  AlertCircle,
  Clock,
  Users,
  MessageSquare,
  Calendar,
  FileText,
  Shield,
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Settings,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Archive,
  Forward,
  Reply,
  Phone,
  Video,
  Mail,
  Smartphone,
  Check,
  X,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Repeat
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { Badge } from '@/components/atoms/display/badge'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/atoms/display/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { formatDistanceToNow, format } from 'date-fns'

interface NotificationEscalationProps {
  organizationId: string
  userId: string
  className?: string
}

interface EscalationRule {
  id: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  triggers: {
    type: 'time_based' | 'response_based' | 'status_based' | 'role_based'
    conditions: Record<string, any>
  }[]
  escalationPath: {
    step: number
    delay: number // minutes
    recipients: {
      userId?: string
      role?: string
      group?: string
      external?: string
    }[]
    methods: ('email' | 'sms' | 'push' | 'call' | 'boardchat' | 'webhook')[]
    stopOnResponse?: boolean
  }[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt?: Date
  usage: {
    triggered: number
    resolved: number
    escalated: number
    lastTriggered?: Date
  }
}

interface NotificationInstance {
  id: string
  ruleId: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  sourceId: string
  sourceType: 'meeting' | 'document' | 'risk' | 'compliance' | 'boardchat' | 'system'
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'cancelled'
  currentStep: number
  recipients: {
    userId: string
    method: string
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'acknowledged' | 'failed'
    sentAt?: Date
    acknowledgedAt?: Date
  }[]
  createdAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  escalatedAt?: Date
  metadata?: Record<string, any>
  actions?: {
    id: string
    label: string
    type: 'acknowledge' | 'resolve' | 'escalate' | 'delegate' | 'snooze' | 'custom'
    url?: string
    handler?: string
  }[]
}

interface NotificationStats {
  total: number
  pending: number
  acknowledged: number
  resolved: number
  escalated: number
  byPriority: Record<string, number>
  byCategory: Record<string, number>
  averageResponseTime: number
  escalationRate: number
}

export function NotificationEscalation({
  organizationId,
  userId,
  className = ''
}: NotificationEscalationProps) {
  const {
    rules,
    notifications,
    stats,
    createRule,
    updateRule,
    deleteRule,
    acknowledgeNotification,
    resolveNotification,
    escalateNotification,
    snoozeNotification,
    isLoading
  } = useNotificationEscalation(organizationId, userId)

  const [activeTab, setActiveTab] = useState<'notifications' | 'rules' | 'analytics'>('notifications')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [newRule, setNewRule] = useState<Partial<EscalationRule>>({
    name: '',
    description: '',
    priority: 'medium',
    triggers: [],
    escalationPath: [],
    isActive: true
  })

  // Mock data for demonstration
  const mockRules: EscalationRule[] = [
    {
      id: '1',
      name: 'Critical Risk Alert',
      description: 'Immediate escalation for critical risk notifications',
      priority: 'critical',
      triggers: [{
        type: 'status_based',
        conditions: { riskLevel: 'critical', category: 'cyber' }
      }],
      escalationPath: [
        {
          step: 1,
          delay: 0,
          recipients: [{ role: 'ciso' }, { role: 'ceo' }],
          methods: ['push', 'email', 'sms'],
          stopOnResponse: true
        },
        {
          step: 2,
          delay: 15,
          recipients: [{ group: 'board_directors' }],
          methods: ['email', 'boardchat', 'call'],
          stopOnResponse: true
        }
      ],
      isActive: true,
      createdBy: userId,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      usage: {
        triggered: 12,
        resolved: 10,
        escalated: 2,
        lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    },
    {
      id: '2',
      name: 'Meeting No-Show',
      description: 'Escalate when key participants miss important meetings',
      priority: 'high',
      triggers: [{
        type: 'time_based',
        conditions: { meetingType: 'board_meeting', absentRole: 'required' }
      }],
      escalationPath: [
        {
          step: 1,
          delay: 5,
          recipients: [{ role: 'board_secretary' }],
          methods: ['email', 'push'],
          stopOnResponse: false
        },
        {
          step: 2,
          delay: 15,
          recipients: [{ role: 'board_chair' }],
          methods: ['call', 'sms'],
          stopOnResponse: true
        }
      ],
      isActive: true,
      createdBy: userId,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      usage: {
        triggered: 5,
        resolved: 4,
        escalated: 1,
        lastTriggered: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    {
      id: '3',
      name: 'Document Review Overdue',
      description: 'Escalate overdue document reviews for compliance',
      priority: 'medium',
      triggers: [{
        type: 'time_based',
        conditions: { documentType: 'compliance', overdueDays: 3 }
      }],
      escalationPath: [
        {
          step: 1,
          delay: 0,
          recipients: [{ role: 'document_owner' }],
          methods: ['email', 'push'],
          stopOnResponse: true
        },
        {
          step: 2,
          delay: 1440, // 24 hours
          recipients: [{ role: 'compliance_officer' }],
          methods: ['email', 'boardchat'],
          stopOnResponse: true
        }
      ],
      isActive: true,
      createdBy: userId,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      usage: {
        triggered: 23,
        resolved: 20,
        escalated: 3
      }
    }
  ]

  const mockNotifications: NotificationInstance[] = [
    {
      id: '1',
      ruleId: '1',
      title: 'Critical Cybersecurity Risk Detected',
      message: 'Advanced persistent threat detected in board communication systems. Immediate action required.',
      priority: 'critical',
      category: 'security',
      sourceId: 'risk-assessment-1',
      sourceType: 'risk',
      status: 'escalated',
      currentStep: 2,
      recipients: [
        {
          userId: 'ciso-1',
          method: 'push',
          status: 'acknowledged',
          sentAt: new Date(Date.now() - 10 * 60 * 1000),
          acknowledgedAt: new Date(Date.now() - 8 * 60 * 1000)
        },
        {
          userId: 'ceo-1',
          method: 'email',
          status: 'delivered',
          sentAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      escalatedAt: new Date(Date.now() - 5 * 60 * 1000),
      actions: [
        { id: 'view-details', label: 'View Risk Assessment', type: 'custom', url: '/dashboard/risk' },
        { id: 'acknowledge', label: 'Acknowledge', type: 'acknowledge' },
        { id: 'resolve', label: 'Mark Resolved', type: 'resolve' }
      ]
    },
    {
      id: '2',
      ruleId: '2',
      title: 'Board Member Absent from Meeting',
      message: 'John Smith (Board Chair) has not joined the Q4 Strategy Meeting scheduled 10 minutes ago.',
      priority: 'high',
      category: 'meeting',
      sourceId: 'meeting-123',
      sourceType: 'meeting',
      status: 'pending',
      currentStep: 1,
      recipients: [
        {
          userId: 'secretary-1',
          method: 'email',
          status: 'delivered',
          sentAt: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          userId: 'secretary-1',
          method: 'push',
          status: 'delivered',
          sentAt: new Date(Date.now() - 5 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      actions: [
        { id: 'contact', label: 'Contact Member', type: 'custom' },
        { id: 'postpone', label: 'Postpone Meeting', type: 'custom' },
        { id: 'acknowledge', label: 'Acknowledge', type: 'acknowledge' }
      ]
    },
    {
      id: '3',
      ruleId: '3',
      title: 'Compliance Document Review Overdue',
      message: 'SOX 404 Compliance Report review is 5 days overdue. Regulatory deadline approaching.',
      priority: 'medium',
      category: 'compliance',
      sourceId: 'document-456',
      sourceType: 'document',
      status: 'acknowledged',
      currentStep: 1,
      recipients: [
        {
          userId: 'owner-1',
          method: 'email',
          status: 'acknowledged',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      actions: [
        { id: 'view-document', label: 'View Document', type: 'custom', url: '/dashboard/documents/456' },
        { id: 'assign-reviewer', label: 'Assign Reviewer', type: 'delegate' },
        { id: 'resolve', label: 'Mark Complete', type: 'resolve' }
      ]
    }
  ]

  const mockStats: NotificationStats = {
    total: 156,
    pending: 12,
    acknowledged: 45,
    resolved: 89,
    escalated: 10,
    byPriority: {
      critical: 3,
      high: 15,
      medium: 67,
      low: 71
    },
    byCategory: {
      security: 12,
      compliance: 45,
      meeting: 34,
      document: 56,
      system: 9
    },
    averageResponseTime: 24.5, // minutes
    escalationRate: 6.4 // percentage
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <Bell className="h-4 w-4" />
      case 'low': return <BellRing className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50'
      case 'acknowledged': return 'text-blue-600 bg-blue-50'
      case 'escalated': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="h-4 w-4" />
      case 'compliance': return <FileText className="h-4 w-4" />
      case 'meeting': return <Calendar className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      case 'boardchat': return <MessageSquare className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="h-3 w-3" />
      case 'sms': return <Smartphone className="h-3 w-3" />
      case 'push': return <Bell className="h-3 w-3" />
      case 'call': return <Phone className="h-3 w-3" />
      case 'boardchat': return <MessageSquare className="h-3 w-3" />
      case 'webhook': return <Zap className="h-3 w-3" />
      default: return <Bell className="h-3 w-3" />
    }
  }

  const handleAcknowledge = useCallback((notificationId: string) => {
    acknowledgeNotification(notificationId)
  }, [acknowledgeNotification])

  const handleResolve = useCallback((notificationId: string) => {
    resolveNotification(notificationId)
  }, [resolveNotification])

  const handleEscalate = useCallback((notificationId: string) => {
    escalateNotification(notificationId)
  }, [escalateNotification])

  const handleSnooze = useCallback((notificationId: string, duration: number) => {
    snoozeNotification(notificationId, duration)
  }, [snoozeNotification])

  // Filter notifications
  const filteredNotifications = mockNotifications.filter(notification => {
    const matchesPriority = selectedPriority === 'all' || notification.priority === selectedPriority
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesPriority && matchesCategory && matchesSearch
  })

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BellRing className="h-6 w-6 text-blue-600" />
              Notification & Escalation Center
            </h2>
            <p className="text-gray-600 mt-1">
              Intelligent notification management with automated escalation workflows
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.pending}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.resolved}</p>
                  <p className="text-sm text-gray-600">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.escalated}</p>
                  <p className="text-sm text-gray-600">Escalated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.escalationRate}%</p>
                  <p className="text-sm text-gray-600">Escalation Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab as any}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">
              Active Notifications
              <Badge variant="secondary" className="ml-2">
                {filteredNotifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rules">
              Escalation Rules
              <Badge variant="secondary" className="ml-2">
                {mockRules.filter(r => r.isActive).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="security">Security</option>
                <option value="compliance">Compliance</option>
                <option value="meeting">Meeting</option>
                <option value="document">Document</option>
                <option value="boardchat">BoardChat</option>
              </select>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card key={notification.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Priority & Category Icons */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          {getCategoryIcon(notification.category)}
                        </div>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(notification.status)}>
                              {notification.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-3">{notification.message}</p>

                        {/* Escalation Path Status */}
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Escalation Step {notification.currentStep} • Created {formatDistanceToNow(notification.createdAt)} ago
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {notification.recipients.map((recipient, index) => (
                              <div key={index} className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
                                {getMethodIcon(recipient.method)}
                                <span className="text-xs">{recipient.method}</span>
                                <div className={`w-2 h-2 rounded-full ${
                                  recipient.status === 'acknowledged' ? 'bg-green-500' :
                                  recipient.status === 'delivered' ? 'bg-blue-500' :
                                  recipient.status === 'sent' ? 'bg-yellow-500' :
                                  recipient.status === 'failed' ? 'bg-red-500' :
                                  'bg-gray-400'
                                }`} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {notification.actions.map((action) => (
                              <Button
                                key={action.id}
                                variant={action.type === 'resolve' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  switch (action.type) {
                                    case 'acknowledge':
                                      handleAcknowledge(notification.id)
                                      break
                                    case 'resolve':
                                      handleResolve(notification.id)
                                      break
                                    case 'escalate':
                                      handleEscalate(notification.id)
                                      break
                                    case 'custom':
                                      if (action.url) {
                                        window.open(action.url, '_blank')
                                      }
                                      break
                                  }
                                }}
                              >
                                {action.type === 'acknowledge' && <Check className="h-3 w-3 mr-1" />}
                                {action.type === 'resolve' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {action.type === 'escalate' && <TrendingUp className="h-3 w-3 mr-1" />}
                                {action.label}
                              </Button>
                            ))}
                            
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="grid gap-6">
              {mockRules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {rule.name}
                          {rule.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch checked={rule.isActive} />
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Priority & Usage Stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(rule.priority)}`}>
                          {rule.priority.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {rule.escalationPath.length} escalation steps
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {rule.usage.triggered} triggered • {rule.usage.resolved} resolved
                      </div>
                    </div>

                    {/* Escalation Path */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900">Escalation Path</h4>
                      <div className="space-y-2">
                        {rule.escalationPath.map((step, index) => (
                          <div key={step.step} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">
                              {step.step}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                {step.delay > 0 && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                                    <Clock className="h-3 w-3" />
                                    <span>After {step.delay}min</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  {step.methods.map((method, idx) => (
                                    <div key={idx} className="p-1 bg-white rounded">
                                      {getMethodIcon(method)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-600">
                                To: {step.recipients.map(r => 
                                  r.role || r.group || r.external || 'Unknown'
                                ).join(', ')}
                                {step.stopOnResponse && (
                                  <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    Stop on response
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    {rule.usage.lastTriggered && (
                      <div className="text-xs text-gray-500">
                        Last triggered {formatDistanceToNow(rule.usage.lastTriggered)} ago
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(mockStats.byPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${
                            priority === 'critical' ? 'bg-red-500' :
                            priority === 'high' ? 'bg-orange-500' :
                            priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-sm font-medium capitalize">{priority}</span>
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(mockStats.byCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(category)}
                          <span className="text-sm font-medium capitalize">{category}</span>
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Response Time</span>
                      <span className="text-sm text-gray-600">{mockStats.averageResponseTime} min</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((mockStats.averageResponseTime / 60) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Escalation Rate</span>
                      <span className="text-sm text-gray-600">{mockStats.escalationRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${mockStats.escalationRate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Delivery</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600">98.5%</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Push Notifications</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600">99.2%</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SMS Delivery</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-yellow-600">95.8%</span>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">WebSocket Connection</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600">Online</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}