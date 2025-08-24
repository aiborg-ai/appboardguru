'use client'

/**
 * Executive Actions Panel
 * 
 * Quick actions dashboard for executive-level governance tasks including
 * bulk operations, emergency response tools, and strategic management
 * functions across multiple organizations.
 */

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { 
  Zap,
  Users,
  FileText,
  Calendar,
  Shield,
  AlertTriangle,
  Send,
  Download,
  Upload,
  Settings,
  Target,
  MessageSquare,
  BarChart3,
  Clipboard,
  CheckCircle2,
  Clock,
  Building,
  Globe,
  Phone,
  Mail
} from 'lucide-react'
import { useToast } from '../ui/use-toast'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'governance' | 'communication' | 'reporting' | 'emergency' | 'operations'
  priority: 'low' | 'medium' | 'high' | 'critical'
  permissions: string[]
  organizationScope: 'single' | 'multiple' | 'all'
  estimatedTime: string
  frequentlyUsed?: boolean
}

interface BulkOperation {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  targetType: 'members' | 'documents' | 'meetings' | 'organizations'
  operationType: 'create' | 'update' | 'delete' | 'notify'
  requiresConfirmation: boolean
}

interface EmergencyAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  severity: 'low' | 'medium' | 'high' | 'critical'
  automated: boolean
  requiresApproval: boolean
}

interface ExecutiveActionsPanelProps {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  organizationIds: string[]
  permissions: string[]
  onActionExecute?: (actionId: string, parameters?: any) => Promise<void>
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'schedule-board-meeting',
    title: 'Schedule Board Meeting',
    description: 'Schedule a board meeting across selected organizations',
    icon: Calendar,
    category: 'governance',
    priority: 'high',
    permissions: ['schedule_meetings'],
    organizationScope: 'multiple',
    estimatedTime: '5 minutes',
    frequentlyUsed: true
  },
  {
    id: 'send-governance-update',
    title: 'Send Governance Update',
    description: 'Broadcast governance updates to board members',
    icon: Send,
    category: 'communication',
    priority: 'medium',
    permissions: ['send_communications'],
    organizationScope: 'all',
    estimatedTime: '10 minutes',
    frequentlyUsed: true
  },
  {
    id: 'generate-performance-report',
    title: 'Generate Performance Report',
    description: 'Create comprehensive performance analytics report',
    icon: BarChart3,
    category: 'reporting',
    priority: 'medium',
    permissions: ['generate_reports'],
    organizationScope: 'multiple',
    estimatedTime: '15 minutes'
  },
  {
    id: 'bulk-document-approval',
    title: 'Bulk Document Approval',
    description: 'Approve multiple documents across organizations',
    icon: CheckCircle2,
    category: 'governance',
    priority: 'high',
    permissions: ['approve_documents'],
    organizationScope: 'multiple',
    estimatedTime: '20 minutes'
  },
  {
    id: 'create-compliance-checklist',
    title: 'Create Compliance Checklist',
    description: 'Generate compliance checklist for all organizations',
    icon: Clipboard,
    category: 'operations',
    priority: 'medium',
    permissions: ['manage_compliance'],
    organizationScope: 'all',
    estimatedTime: '30 minutes'
  },
  {
    id: 'emergency-communication',
    title: 'Emergency Communication',
    description: 'Send urgent communications to all stakeholders',
    icon: AlertTriangle,
    category: 'emergency',
    priority: 'critical',
    permissions: ['emergency_communications'],
    organizationScope: 'all',
    estimatedTime: '5 minutes',
    frequentlyUsed: false
  }
]

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'bulk-invite-members',
    title: 'Bulk Member Invitations',
    description: 'Invite multiple members across organizations',
    icon: Users,
    targetType: 'members',
    operationType: 'create',
    requiresConfirmation: true
  },
  {
    id: 'bulk-update-permissions',
    title: 'Update Member Permissions',
    description: 'Update permissions for multiple members',
    icon: Shield,
    targetType: 'members',
    operationType: 'update',
    requiresConfirmation: true
  },
  {
    id: 'bulk-document-distribution',
    title: 'Document Distribution',
    description: 'Distribute documents to multiple organizations',
    icon: FileText,
    targetType: 'documents',
    operationType: 'create',
    requiresConfirmation: true
  },
  {
    id: 'bulk-meeting-scheduling',
    title: 'Bulk Meeting Scheduling',
    description: 'Schedule meetings across multiple organizations',
    icon: Calendar,
    targetType: 'meetings',
    operationType: 'create',
    requiresConfirmation: true
  }
]

const EMERGENCY_ACTIONS: EmergencyAction[] = [
  {
    id: 'crisis-communication',
    title: 'Activate Crisis Communication',
    description: 'Activate crisis communication protocols',
    icon: Phone,
    severity: 'critical',
    automated: false,
    requiresApproval: false
  },
  {
    id: 'security-lockdown',
    title: 'Security Lockdown',
    description: 'Initiate security lockdown procedures',
    icon: Shield,
    severity: 'critical',
    automated: true,
    requiresApproval: true
  },
  {
    id: 'emergency-board-meeting',
    title: 'Emergency Board Meeting',
    description: 'Call emergency board meeting',
    icon: AlertTriangle,
    severity: 'high',
    automated: false,
    requiresApproval: false
  },
  {
    id: 'stakeholder-alert',
    title: 'Stakeholder Alert',
    description: 'Send alerts to key stakeholders',
    icon: Mail,
    severity: 'medium',
    automated: false,
    requiresApproval: false
  }
]

export default function ExecutiveActionsPanel({
  userRole,
  organizationIds,
  permissions,
  onActionExecute
}: ExecutiveActionsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null)
  const [selectedBulkOperation, setSelectedBulkOperation] = useState<BulkOperation | null>(null)
  const [selectedEmergencyAction, setSelectedEmergencyAction] = useState<EmergencyAction | null>(null)
  const [actionParameters, setActionParameters] = useState<Record<string, any>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  
  const { toast } = useToast()

  const filteredActions = QUICK_ACTIONS.filter(action => {
    // Filter by category
    if (activeCategory !== 'all' && action.category !== activeCategory) {
      return false
    }
    
    // Filter by permissions
    if (!action.permissions.every(perm => permissions.includes(perm))) {
      return false
    }
    
    // Filter by organization scope
    if (action.organizationScope === 'multiple' && organizationIds.length < 2) {
      return false
    }
    
    return true
  })

  const handleActionExecute = useCallback(async (actionId: string, parameters: any = {}) => {
    setIsExecuting(true)
    
    try {
      if (onActionExecute) {
        await onActionExecute(actionId, parameters)
      }
      
      toast({
        title: "Action Completed",
        description: "The executive action has been completed successfully.",
      })
      
      // Reset dialog state
      setSelectedAction(null)
      setSelectedBulkOperation(null)
      setSelectedEmergencyAction(null)
      setActionParameters({})
      
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "The action could not be completed.",
        variant: "destructive"
      })
    } finally {
      setIsExecuting(false)
    }
  }, [onActionExecute, toast])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'governance': return Target
      case 'communication': return MessageSquare
      case 'reporting': return BarChart3
      case 'emergency': return AlertTriangle
      case 'operations': return Settings
      default: return Zap
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory('all')}
        >
          All Actions
        </Button>
        {['governance', 'communication', 'reporting', 'emergency', 'operations'].map(category => {
          const Icon = getCategoryIcon(category)
          return (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          )
        })}
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Frequently used executive actions and governance tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActions.map(action => {
              const Icon = action.icon
              return (
                <Dialog key={action.id}>
                  <DialogTrigger asChild>
                    <div 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => setSelectedAction(action)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getPriorityColor(action.priority)} text-white group-hover:scale-110 transition-transform`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">{action.title}</h4>
                          <p className="text-xs text-gray-600 mb-2">{action.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {action.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {action.estimatedTime}
                            </Badge>
                            {action.frequentlyUsed && (
                              <Badge variant="default" className="text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {action.title}
                      </DialogTitle>
                      <DialogDescription>{action.description}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="font-medium">Category</label>
                          <div>{action.category}</div>
                        </div>
                        <div>
                          <label className="font-medium">Estimated Time</label>
                          <div>{action.estimatedTime}</div>
                        </div>
                      </div>
                      
                      {action.organizationScope === 'multiple' && (
                        <div>
                          <label className="font-medium text-sm">Organizations</label>
                          <div className="text-sm text-gray-600 mt-1">
                            Will apply to {organizationIds.length} selected organizations
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleActionExecute(action.id)}
                          disabled={isExecuting}
                          className="flex-1"
                        >
                          {isExecuting ? 'Executing...' : 'Execute Action'}
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedAction(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            Perform operations across multiple organizations or entities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BULK_OPERATIONS.map(operation => {
              const Icon = operation.icon
              return (
                <Dialog key={operation.id}>
                  <DialogTrigger asChild>
                    <div 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => setSelectedBulkOperation(operation)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500 text-white group-hover:scale-110 transition-transform">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{operation.title}</h4>
                          <p className="text-xs text-gray-600 mb-2">{operation.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {operation.targetType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {operation.operationType}
                            </Badge>
                            {operation.requiresConfirmation && (
                              <Badge variant="destructive" className="text-xs">
                                Confirmation Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {operation.title}
                      </DialogTitle>
                      <DialogDescription>{operation.description}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium text-sm">Target Organizations</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organizations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            <SelectItem value="selected">Selected Organizations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {operation.requiresConfirmation && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-yellow-800">Confirmation Required</div>
                              <div className="text-yellow-700 mt-1">
                                This operation will affect multiple entities and cannot be undone.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleActionExecute(operation.id)}
                          disabled={isExecuting}
                          className="flex-1"
                        >
                          {isExecuting ? 'Processing...' : 'Execute Operation'}
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedBulkOperation(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Emergency Actions
          </CardTitle>
          <CardDescription className="text-red-700">
            Critical response tools for emergency situations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMERGENCY_ACTIONS.map(emergency => {
              const Icon = emergency.icon
              return (
                <Dialog key={emergency.id}>
                  <DialogTrigger asChild>
                    <div 
                      className="p-4 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors group bg-white"
                      onClick={() => setSelectedEmergencyAction(emergency)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500 text-white group-hover:scale-110 transition-transform">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1 text-red-900">{emergency.title}</h4>
                          <p className="text-xs text-red-700 mb-2">{emergency.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {emergency.severity}
                            </Badge>
                            {emergency.automated && (
                              <Badge variant="outline" className="text-xs">
                                Automated
                              </Badge>
                            )}
                            {emergency.requiresApproval && (
                              <Badge variant="outline" className="text-xs">
                                Approval Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-800">
                        <Icon className="h-5 w-5" />
                        {emergency.title}
                      </DialogTitle>
                      <DialogDescription className="text-red-700">
                        {emergency.description}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-red-800 mb-2">Emergency Action Warning</div>
                            <div className="text-red-700">
                              This is an emergency action that will have immediate effects across all selected organizations. 
                              Use only in genuine emergency situations.
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="font-medium text-sm">Emergency Description</label>
                        <Textarea 
                          placeholder="Describe the emergency situation..."
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="emergency-confirm" />
                        <label 
                          htmlFor="emergency-confirm" 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I confirm this is a genuine emergency requiring immediate action
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleActionExecute(emergency.id)}
                          disabled={isExecuting}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {isExecuting ? 'Activating...' : 'Activate Emergency Response'}
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedEmergencyAction(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}