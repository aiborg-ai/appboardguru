'use client'

/**
 * Executive Customization Panel
 * 
 * Personalization engine for executive dashboards allowing custom
 * metric builders, dashboard layouts, alert preferences, and 
 * role-specific view configurations.
 */

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Slider } from '../ui/slider'
import { 
  Settings,
  Layout,
  Bell,
  BarChart3,
  Palette,
  Save,
  RotateCcw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Move,
  Edit3,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { useToast } from '../ui/use-toast'

interface DashboardWidget {
  id: string
  title: string
  type: 'metric' | 'chart' | 'table' | 'activity' | 'heatmap'
  position: { x: number; y: number; w: number; h: number }
  visible: boolean
  refreshInterval: number // minutes
  customSettings: Record<string, any>
}

interface CustomMetric {
  id: string
  name: string
  formula: string
  dataSource: string
  aggregationType: 'sum' | 'average' | 'count' | 'max' | 'min'
  timeframe: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  threshold?: {
    warning: number
    critical: number
  }
  visualization: 'number' | 'gauge' | 'trend' | 'bar' | 'line'
}

interface AlertPreference {
  id: string
  name: string
  enabled: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  conditions: {
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'change'
    value: number
    threshold: number
  }[]
  delivery: {
    email: boolean
    push: boolean
    sms: boolean
    dashboard: boolean
  }
  schedule: {
    immediate: boolean
    digest: 'none' | 'daily' | 'weekly'
    quietHours: { start: string; end: string }
  }
}

interface ExecutiveCustomizationPanelProps {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  currentConfig: {
    widgets: DashboardWidget[]
    metrics: CustomMetric[]
    alerts: AlertPreference[]
    theme: 'light' | 'dark' | 'auto'
    layout: 'compact' | 'standard' | 'spacious'
  }
  onConfigSave: (config: any) => Promise<void>
  onConfigReset: () => Promise<void>
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'governance-health',
    title: 'Governance Health Score',
    type: 'metric',
    position: { x: 0, y: 0, w: 2, h: 1 },
    visible: true,
    refreshInterval: 15,
    customSettings: {}
  },
  {
    id: 'portfolio-overview',
    title: 'Portfolio Overview',
    type: 'chart',
    position: { x: 2, y: 0, w: 4, h: 2 },
    visible: true,
    refreshInterval: 30,
    customSettings: { chartType: 'radar' }
  },
  {
    id: 'activity-feed',
    title: 'Real-Time Activities',
    type: 'activity',
    position: { x: 0, y: 1, w: 3, h: 3 },
    visible: true,
    refreshInterval: 5,
    customSettings: { limit: 10 }
  },
  {
    id: 'performance-heatmap',
    title: 'Performance Heatmap',
    type: 'heatmap',
    position: { x: 3, y: 1, w: 3, h: 2 },
    visible: true,
    refreshInterval: 60,
    customSettings: { colorScheme: 'health' }
  }
]

export default function ExecutiveCustomizationPanel({
  userRole,
  currentConfig,
  onConfigSave,
  onConfigReset
}: ExecutiveCustomizationPanelProps) {
  const [config, setConfig] = useState(currentConfig)
  const [activeTab, setActiveTab] = useState<string>('layout')
  const [isModified, setIsModified] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const { toast } = useToast()

  const handleConfigChange = useCallback((updates: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    setIsModified(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onConfigSave(config)
      setIsModified(false)
      toast({
        title: "Configuration Saved",
        description: "Your executive dashboard preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save configuration.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [config, onConfigSave, toast])

  const handleReset = useCallback(async () => {
    try {
      await onConfigReset()
      setConfig(currentConfig)
      setIsModified(false)
      toast({
        title: "Configuration Reset",
        description: "Dashboard has been reset to default settings.",
      })
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Failed to reset configuration.",
        variant: "destructive"
      })
    }
  }, [onConfigReset, currentConfig, toast])

  const toggleWidget = useCallback((widgetId: string) => {
    const updatedWidgets = config.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    )
    handleConfigChange({ widgets: updatedWidgets })
  }, [config.widgets, handleConfigChange])

  const updateWidgetSettings = useCallback((widgetId: string, settings: Record<string, any>) => {
    const updatedWidgets = config.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, customSettings: { ...widget.customSettings, ...settings } } : widget
    )
    handleConfigChange({ widgets: updatedWidgets })
  }, [config.widgets, handleConfigChange])

  const addCustomMetric = useCallback(() => {
    const newMetric: CustomMetric = {
      id: `custom-${Date.now()}`,
      name: `Custom Metric ${config.metrics.length + 1}`,
      formula: '',
      dataSource: 'governance',
      aggregationType: 'average',
      timeframe: 'monthly',
      visualization: 'number'
    }
    handleConfigChange({ metrics: [...config.metrics, newMetric] })
  }, [config.metrics, handleConfigChange])

  const updateCustomMetric = useCallback((metricId: string, updates: Partial<CustomMetric>) => {
    const updatedMetrics = config.metrics.map(metric =>
      metric.id === metricId ? { ...metric, ...updates } : metric
    )
    handleConfigChange({ metrics: updatedMetrics })
  }, [config.metrics, handleConfigChange])

  const removeCustomMetric = useCallback((metricId: string) => {
    const updatedMetrics = config.metrics.filter(metric => metric.id !== metricId)
    handleConfigChange({ metrics: updatedMetrics })
  }, [config.metrics, handleConfigChange])

  const addAlertPreference = useCallback(() => {
    const newAlert: AlertPreference = {
      id: `alert-${Date.now()}`,
      name: `New Alert`,
      enabled: true,
      priority: 'medium',
      conditions: [],
      delivery: { email: true, push: false, sms: false, dashboard: true },
      schedule: { immediate: true, digest: 'none', quietHours: { start: '22:00', end: '08:00' } }
    }
    handleConfigChange({ alerts: [...config.alerts, newAlert] })
  }, [config.alerts, handleConfigChange])

  const updateAlertPreference = useCallback((alertId: string, updates: Partial<AlertPreference>) => {
    const updatedAlerts = config.alerts.map(alert =>
      alert.id === alertId ? { ...alert, ...updates } : alert
    )
    handleConfigChange({ alerts: updatedAlerts })
  }, [config.alerts, handleConfigChange])

  const removeAlertPreference = useCallback((alertId: string) => {
    const updatedAlerts = config.alerts.filter(alert => alert.id !== alertId)
    handleConfigChange({ alerts: updatedAlerts })
  }, [config.alerts, handleConfigChange])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Customization</h2>
          <p className="text-gray-600">Personalize your executive dashboard experience</p>
        </div>
        <div className="flex items-center gap-3">
          {isModified && (
            <Badge variant="outline" className="text-orange-600">
              <Edit3 className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isModified || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Customization Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Custom Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Layout Configuration */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>
                Configure widget visibility, positioning, and refresh intervals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Layout Style */}
              <div>
                <Label className="text-base font-medium mb-3 block">Layout Style</Label>
                <div className="grid grid-cols-3 gap-4">
                  {(['compact', 'standard', 'spacious'] as const).map(layout => (
                    <div
                      key={layout}
                      onClick={() => handleConfigChange({ layout })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.layout === layout 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium capitalize">{layout}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {layout === 'compact' && 'Dense information display'}
                          {layout === 'standard' && 'Balanced layout'}
                          {layout === 'spacious' && 'Comfortable viewing'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget Configuration */}
              <div>
                <Label className="text-base font-medium mb-3 block">Dashboard Widgets</Label>
                <div className="space-y-4">
                  {config.widgets.map(widget => (
                    <div key={widget.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={widget.visible}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                        <div>
                          <div className="font-medium">{widget.title}</div>
                          <div className="text-sm text-gray-600">
                            {widget.type} • Refreshes every {widget.refreshInterval}min
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{widget.type}</Badge>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Metrics */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Metrics</CardTitle>
                  <CardDescription>
                    Create personalized KPIs and performance indicators
                  </CardDescription>
                </div>
                <Button onClick={addCustomMetric}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.metrics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No custom metrics configured</p>
                  <p className="text-sm">Click "Add Metric" to create your first custom KPI</p>
                </div>
              ) : (
                config.metrics.map(metric => (
                  <div key={metric.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={metric.name}
                        onChange={(e) => updateCustomMetric(metric.id, { name: e.target.value })}
                        className="font-medium"
                        placeholder="Metric Name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomMetric(metric.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Data Source</Label>
                        <Select
                          value={metric.dataSource}
                          onValueChange={(value) => updateCustomMetric(metric.id, { dataSource: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="governance">Governance</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="risk">Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Aggregation</Label>
                        <Select
                          value={metric.aggregationType}
                          onValueChange={(value: any) => updateCustomMetric(metric.id, { aggregationType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Timeframe</Label>
                        <Select
                          value={metric.timeframe}
                          onValueChange={(value: any) => updateCustomMetric(metric.id, { timeframe: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Visualization</Label>
                        <Select
                          value={metric.visualization}
                          onValueChange={(value: any) => updateCustomMetric(metric.id, { visualization: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="gauge">Gauge</SelectItem>
                            <SelectItem value="trend">Trend Line</SelectItem>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Preferences */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Preferences</CardTitle>
                  <CardDescription>
                    Configure notifications and alert thresholds
                  </CardDescription>
                </div>
                <Button onClick={addAlertPreference}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Alert
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No alerts configured</p>
                  <p className="text-sm">Set up alerts to stay informed about important changes</p>
                </div>
              ) : (
                config.alerts.map(alert => (
                  <div key={alert.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={alert.enabled}
                          onCheckedChange={(enabled) => updateAlertPreference(alert.id, { enabled })}
                        />
                        <Input
                          value={alert.name}
                          onChange={(e) => updateAlertPreference(alert.id, { name: e.target.value })}
                          className="font-medium"
                          placeholder="Alert Name"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          alert.priority === 'critical' ? 'destructive' :
                          alert.priority === 'high' ? 'default' :
                          'secondary'
                        }>
                          {alert.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAlertPreference(alert.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Priority Level</Label>
                        <Select
                          value={alert.priority}
                          onValueChange={(value: any) => updateAlertPreference(alert.id, { priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Delivery Method</Label>
                        <div className="flex gap-2 pt-2">
                          {Object.entries(alert.delivery).map(([method, enabled]) => (
                            <Badge
                              key={method}
                              variant={enabled ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => updateAlertPreference(alert.id, {
                                delivery: { ...alert.delivery, [method]: !enabled }
                              })}
                            >
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the visual appearance of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div>
                <Label className="text-base font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  {(['light', 'dark', 'auto'] as const).map(theme => (
                    <div
                      key={theme}
                      onClick={() => handleConfigChange({ theme })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.theme === theme 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium capitalize">{theme}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {theme === 'light' && 'Light theme'}
                          {theme === 'dark' && 'Dark theme'}
                          {theme === 'auto' && 'System preference'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}