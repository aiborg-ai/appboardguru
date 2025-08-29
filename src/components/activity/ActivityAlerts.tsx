'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Button } from '@/components/atoms/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/atoms/form/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/atoms/form/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Bell, 
  Plus, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail,
  Webhook,
  MessageSquare,
  Trash2,
  Edit
} from 'lucide-react'

interface AlertRule {
  id: string
  name: string
  description: string
  condition: {
    eventType?: string
    entityType?: string
    threshold?: number
    timeWindow?: string
    operator?: 'gt' | 'lt' | 'eq' | 'contains'
  }
  actions: {
    type: 'email' | 'webhook' | 'slack' | 'teams'
    config: Record<string, unknown>
  }[]
  isActive: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

interface ActiveAlert {
  id: string
  ruleId: string
  ruleName: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  message: string
  triggeredAt: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  metadata: Record<string, unknown>
}

interface ActivityAlertsProps {
  organizationId: string
}

export function ActivityAlerts({ organizationId }: ActivityAlertsProps) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'active' | 'rules'>('active')
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false)
  
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    eventType: '',
    threshold: 10,
    timeWindow: '1h',
    operator: 'gt' as const,
    priority: 'medium' as const,
    actionType: 'email' as const,
    actionConfig: {}
  })

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const [rulesResponse, alertsResponse] = await Promise.all([
        fetch(`/api/activity/alerts/rules?organizationId=${organizationId}`),
        fetch(`/api/activity/alerts?organizationId=${organizationId}`)
      ])
      
      const rulesData = await rulesResponse.json()
      const alertsData = await alertsResponse.json()
      
      if (rulesData.success) setAlertRules(rulesData.rules || [])
      if (alertsData.success) setActiveAlerts(alertsData.alerts || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [organizationId])

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/activity/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertId
        })
      })
      
      setActiveAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
          : alert
      ))
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const createAlertRule = async () => {
    try {
      const response = await fetch('/api/activity/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRule.name,
          description: newRule.description,
          condition: {
            eventType: newRule.eventType || undefined,
            threshold: newRule.threshold,
            timeWindow: newRule.timeWindow,
            operator: newRule.operator
          },
          actions: [{
            type: newRule.actionType,
            config: newRule.actionConfig
          }],
          priority: newRule.priority
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setAlertRules(prev => [...prev, data.rule])
        setIsCreateRuleOpen(false)
        setNewRule({
          name: '',
          description: '',
          eventType: '',
          threshold: 10,
          timeWindow: '1h',
          operator: 'gt',
          priority: 'medium',
          actionType: 'email',
          actionConfig: {}
        })
      }
    } catch (error) {
      console.error('Error creating alert rule:', error)
    }
  }

  const deleteAlertRule = async (ruleId: string) => {
    try {
      await fetch(`/api/activity/alerts/rules?ruleId=${ruleId}`, {
        method: 'DELETE'
      })
      
      setAlertRules(prev => prev.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Error deleting alert rule:', error)
    }
  }

  const toggleAlertRule = async (ruleId: string, isActive: boolean) => {
    try {
      await fetch('/api/activity/alerts/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          isActive
        })
      })
      
      setAlertRules(prev => prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive } : rule
      ))
    } catch (error) {
      console.error('Error toggling alert rule:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'webhook': return <Webhook className="h-4 w-4" />
      case 'slack': return <MessageSquare className="h-4 w-4" />
      case 'teams': return <MessageSquare className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const renderActiveAlerts = () => (
    <div className="space-y-3">
      {activeAlerts.filter(alert => !alert.acknowledged).map(alert => (
        <Card key={alert.id} className={`border-l-4 ${
          alert.priority === 'critical' ? 'border-l-red-500' :
          alert.priority === 'high' ? 'border-l-orange-500' :
          alert.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.priority === 'critical' ? 'text-red-500' :
                  alert.priority === 'high' ? 'text-orange-500' :
                  alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <CardTitle className="text-base">{alert.ruleName}</CardTitle>
                <Badge variant={getPriorityColor(alert.priority) as any}>
                  {alert.priority}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeAlert(alert.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-3">{alert.message}</p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(alert.triggeredAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {activeAlerts.filter(alert => alert.acknowledged).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Acknowledged Alerts</h4>
          <div className="space-y-2">
            {activeAlerts.filter(alert => alert.acknowledged).map(alert => (
              <div key={alert.id} className="p-3 rounded border bg-muted/30 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{alert.ruleName}</span>
                  <span className="text-xs text-muted-foreground">
                    Acknowledged {alert.acknowledgedAt && new Date(alert.acknowledgedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderAlertRules = () => (
    <div className="space-y-3">
      {alertRules.map(rule => (
        <Card key={rule.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle className="text-base">{rule.name}</CardTitle>
                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant={getPriorityColor(rule.priority) as any}>
                  {rule.priority}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleAlertRule(rule.id, !rule.isActive)}
                >
                  {rule.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteAlertRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{rule.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Condition</p>
                <p>
                  {rule.condition.eventType && `Event: ${rule.condition.eventType} `}
                  {rule.condition.threshold && `${rule.condition.operator} ${rule.condition.threshold} `}
                  {rule.condition.timeWindow && `in ${rule.condition.timeWindow}`}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Actions</p>
                <div className="flex gap-1">
                  {rule.actions.map((action, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {getActionIcon(action.type)}
                      <span className="text-xs">{action.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {new Date(rule.createdAt).toLocaleDateString()}
              </span>
              <span>Triggered {rule.triggerCount} times</span>
              {rule.lastTriggered && (
                <span>Last: {new Date(rule.lastTriggered).toLocaleDateString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Activity Alerts
            {activeAlerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive">
                {activeAlerts.filter(a => !a.acknowledged).length} active
              </Badge>
            )}
          </CardTitle>
          <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Rule Name</label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="High upload activity"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newRule.priority} onValueChange={(value: string) => setNewRule(prev => ({ ...prev, priority: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Alert when upload activity exceeds normal levels"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Event Type</label>
                    <Select value={newRule.eventType} onValueChange={(value) => setNewRule(prev => ({ ...prev, eventType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset_upload">Asset Upload</SelectItem>
                        <SelectItem value="asset_view">Asset View</SelectItem>
                        <SelectItem value="vault_create">Vault Create</SelectItem>
                        <SelectItem value="user_login">User Login</SelectItem>
                        <SelectItem value="annotation_create">Annotation Create</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Threshold</label>
                    <Input
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time Window</label>
                    <Select value={newRule.timeWindow} onValueChange={(value) => setNewRule(prev => ({ ...prev, timeWindow: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5m">5 minutes</SelectItem>
                        <SelectItem value="15m">15 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="24h">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notification Method</label>
                  <Select value={newRule.actionType} onValueChange={(value: string) => setNewRule(prev => ({ ...prev, actionType: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createAlertRule}
                    disabled={!newRule.name || !newRule.description}
                  >
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b">
          <Button
            size="sm"
            variant={selectedTab === 'active' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('active')}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Active Alerts
            {activeAlerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {activeAlerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant={selectedTab === 'rules' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('rules')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Rules
            <Badge variant="secondary" className="ml-1 text-xs">
              {alertRules.length}
            </Badge>
          </Button>
        </div>

        {/* Tab Content */}
        <ScrollArea className="h-96">
          {selectedTab === 'active' && renderActiveAlerts()}
          {selectedTab === 'rules' && renderAlertRules()}
        </ScrollArea>

        {/* Empty States */}
        {selectedTab === 'active' && activeAlerts.filter(a => !a.acknowledged).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
            <p className="font-medium">No active alerts</p>
            <p className="text-sm">All systems operating normally</p>
          </div>
        )}

        {selectedTab === 'rules' && alertRules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No alert rules configured</p>
            <p className="text-sm">Create rules to monitor activity patterns</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}