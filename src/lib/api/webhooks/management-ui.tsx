/**
 * Webhook Management UI
 * React components for managing webhook endpoints and viewing delivery history
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { 
  Globe, 
  Settings, 
  Trash2, 
  Plus, 
  TestTube, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  Copy,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface WebhookEndpoint {
  id: string
  organizationId: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  description?: string
  metadata?: Record<string, any>
}

interface WebhookDelivery {
  id: string
  webhookEndpointId: string
  eventId: string
  url: string
  status: 'pending' | 'success' | 'failed' | 'retry'
  attempts: number
  maxAttempts: number
  responseStatus?: number
  responseBody?: string
  error?: string
  createdAt: string
  deliveredAt?: string
}

interface WebhookAnalytics {
  totalEvents: number
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  averageResponseTime: number
  deliverySuccessRate: number
  endpointHealthScores: Array<{ endpointId: string; url: string; healthScore: number }>
}

const AVAILABLE_EVENTS = [
  { value: 'asset.created', label: 'Asset Created' },
  { value: 'asset.updated', label: 'Asset Updated' },
  { value: 'asset.deleted', label: 'Asset Deleted' },
  { value: 'asset.shared', label: 'Asset Shared' },
  { value: 'organization.created', label: 'Organization Created' },
  { value: 'organization.updated', label: 'Organization Updated' },
  { value: 'user.joined', label: 'User Joined' },
  { value: 'meeting.scheduled', label: 'Meeting Scheduled' },
  { value: 'meeting.completed', label: 'Meeting Completed' },
  { value: 'vault.created', label: 'Vault Created' },
  { value: 'compliance.alert', label: 'Compliance Alert' }
]

export function WebhookManagementDashboard() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [analytics, setAnalytics] = useState<WebhookAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadWebhookEndpoints()
    loadAnalytics()
  }, [])

  const loadWebhookEndpoints = async () => {
    try {
      const response = await fetch('/api/webhooks/endpoints')
      const data = await response.json()
      if (data.success) {
        setEndpoints(data.data)
      }
    } catch (error) {
      console.error('Failed to load webhook endpoints:', error)
      toast({
        title: 'Error',
        description: 'Failed to load webhook endpoints',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/webhooks/analytics')
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Failed to load webhook analytics:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Management</h1>
          <p className="text-muted-foreground">Manage webhook endpoints and monitor delivery status</p>
        </div>
        <CreateWebhookDialog onCreated={loadWebhookEndpoints} />
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <WebhookEndpointsList 
            endpoints={endpoints} 
            onUpdate={loadWebhookEndpoints}
            onSelect={setSelectedEndpoint}
          />
        </TabsContent>

        <TabsContent value="deliveries">
          <DeliveryHistory selectedEndpoint={selectedEndpoint} />
        </TabsContent>

        <TabsContent value="analytics">
          <WebhookAnalyticsDashboard analytics={analytics} />
        </TabsContent>

        <TabsContent value="testing">
          <WebhookTesting endpoints={endpoints} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WebhookEndpointsList({ 
  endpoints, 
  onUpdate, 
  onSelect 
}: { 
  endpoints: WebhookEndpoint[]
  onUpdate: () => void
  onSelect: (endpoint: WebhookEndpoint) => void
}) {
  const { toast } = useToast()

  const handleDelete = async (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) {
      return
    }

    try {
      const response = await fetch(`/api/webhooks/endpoints/${endpointId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Webhook endpoint deleted successfully'
        })
        onUpdate()
      } else {
        throw new Error('Failed to delete endpoint')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook endpoint',
        variant: 'destructive'
      })
    }
  }

  const handleToggleActive = async (endpoint: WebhookEndpoint) => {
    try {
      const response = await fetch(`/api/webhooks/endpoints/${endpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !endpoint.isActive })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Webhook endpoint ${!endpoint.isActive ? 'activated' : 'deactivated'}`
        })
        onUpdate()
      } else {
        throw new Error('Failed to update endpoint')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update webhook endpoint',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {endpoints.map((endpoint) => (
        <Card key={endpoint.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <Badge variant={endpoint.isActive ? 'default' : 'secondary'}>
                  {endpoint.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelect(endpoint)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(endpoint.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardTitle className="text-sm font-medium truncate" title={endpoint.url}>
              {endpoint.url}
            </CardTitle>
            {endpoint.description && (
              <CardDescription className="text-xs">
                {endpoint.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Events</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {endpoint.events.slice(0, 3).map((event) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                  {endpoint.events.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{endpoint.events.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs text-muted-foreground">Active</Label>
                <Switch
                  checked={endpoint.isActive}
                  onCheckedChange={() => handleToggleActive(endpoint)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CreateWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    description: ''
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Webhook endpoint created successfully'
        })
        setOpen(false)
        setFormData({ url: '', events: [], description: '' })
        onCreated()
      } else {
        throw new Error(data.error || 'Failed to create webhook')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create webhook',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Webhook Endpoint</DialogTitle>
          <DialogDescription>
            Add a new webhook endpoint to receive real-time notifications
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">Endpoint URL</Label>
            <Input
              id="url"
              type="url"
              required
              placeholder="https://yourapp.com/webhooks"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            />
          </div>

          <div>
            <Label>Events to Subscribe</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        events: e.target.checked
                          ? [...prev.events, event.value]
                          : prev.events.filter(ev => ev !== event.value)
                      }))
                    }}
                  />
                  <span className="text-sm">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of this webhook"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || formData.events.length === 0}>
              {loading ? 'Creating...' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeliveryHistory({ selectedEndpoint }: { selectedEndpoint: WebhookEndpoint | null }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, hasMore: false })
  const { toast } = useToast()

  useEffect(() => {
    if (selectedEndpoint) {
      loadDeliveries()
    }
  }, [selectedEndpoint])

  const loadDeliveries = async (page = 1) => {
    if (!selectedEndpoint) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/webhooks/endpoints/${selectedEndpoint.id}/deliveries?page=${page}&limit=20`
      )
      const data = await response.json()

      if (data.success) {
        setDeliveries(data.data.deliveries)
        setPagination({
          page,
          total: data.data.total,
          hasMore: data.data.hasMore
        })
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error)
      toast({
        title: 'Error',
        description: 'Failed to load delivery history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const retryDelivery = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Delivery retry initiated'
        })
        loadDeliveries(pagination.page)
      } else {
        throw new Error('Failed to retry delivery')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry delivery',
        variant: 'destructive'
      })
    }
  }

  if (!selectedEndpoint) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Select a webhook endpoint to view delivery history</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
        <CardDescription>
          Webhook deliveries for {selectedEndpoint.url}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center p-4">Loading deliveries...</div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <DeliveryCard 
                key={delivery.id} 
                delivery={delivery} 
                onRetry={retryDelivery}
              />
            ))}

            {deliveries.length === 0 && (
              <div className="text-center p-4 text-muted-foreground">
                No deliveries found for this endpoint
              </div>
            )}

            {pagination.hasMore && (
              <Button 
                variant="outline" 
                onClick={() => loadDeliveries(pagination.page + 1)}
                className="w-full"
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeliveryCard({ 
  delivery, 
  onRetry 
}: { 
  delivery: WebhookDelivery
  onRetry: (id: string) => void 
}) {
  const [showDetails, setShowDetails] = useState(false)
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'retry':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon(delivery.status)}
          <div>
            <div className="font-medium text-sm">
              {delivery.status.toUpperCase()}
              {delivery.responseStatus && ` (${delivery.responseStatus})`}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(delivery.createdAt).toLocaleString()}
              {delivery.deliveredAt && (
                <> • Delivered at {new Date(delivery.deliveredAt).toLocaleString()}</>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {delivery.attempts}/{delivery.maxAttempts} attempts
          </Badge>
          
          {delivery.status === 'failed' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRetry(delivery.id)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3 pt-3 border-t">
          {delivery.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {delivery.error}
              </AlertDescription>
            </Alert>
          )}

          {delivery.responseBody && (
            <div>
              <Label className="text-xs text-muted-foreground">Response Body</Label>
              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                {delivery.responseBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WebhookAnalyticsDashboard({ analytics }: { analytics: WebhookAnalytics | null }) {
  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDeliveries.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.deliverySuccessRate * 100).toFixed(1)}%
            </div>
            <Progress 
              value={analytics.deliverySuccessRate * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageResponseTime.toFixed(0)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health Scores</CardTitle>
          <CardDescription>Health score based on recent delivery success rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.endpointHealthScores.map((endpoint) => (
              <div key={endpoint.endpointId} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate" title={endpoint.url}>
                    {endpoint.url}
                  </div>
                  <Progress value={endpoint.healthScore} className="mt-1 w-full max-w-xs" />
                </div>
                <Badge 
                  variant={endpoint.healthScore >= 95 ? 'default' : 
                          endpoint.healthScore >= 80 ? 'secondary' : 'destructive'}
                >
                  {endpoint.healthScore}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WebhookTesting({ endpoints }: { endpoints: WebhookEndpoint[] }) {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTest = async () => {
    if (!selectedEndpointId) return

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`/api/webhooks/endpoints/${selectedEndpointId}/test`, {
        method: 'POST'
      })

      const data = await response.json()
      setTestResult(data)

      if (data.success) {
        toast({
          title: 'Test Successful',
          description: `Webhook test completed in ${data.responseTime}ms`
        })
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Webhook test failed',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test webhook endpoint',
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Webhook Endpoints</CardTitle>
        <CardDescription>
          Send a test webhook to verify your endpoint is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="endpoint-select">Select Endpoint</Label>
          <Select value={selectedEndpointId} onValueChange={setSelectedEndpointId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an endpoint to test" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  {endpoint.url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleTest} 
          disabled={!selectedEndpointId || testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Webhook
            </>
          )}
        </Button>

        {testResult && (
          <Alert className={testResult.success ? 'border-green-200' : 'border-red-200'}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <div>
                  <strong>Status:</strong> {testResult.success ? 'Success' : 'Failed'}
                </div>
                {testResult.status && (
                  <div>
                    <strong>HTTP Status:</strong> {testResult.status}
                  </div>
                )}
                {testResult.responseTime && (
                  <div>
                    <strong>Response Time:</strong> {testResult.responseTime}ms
                  </div>
                )}
                {testResult.error && (
                  <div>
                    <strong>Error:</strong> {testResult.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}