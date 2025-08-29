'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  BarChart3, 
  Settings, 
  Eye, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  XCircle, 
  Bell,
  Zap,
  Target,
  FileText,
  Camera,
  Mic,
  Video,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react'

// Types for the command center
interface CrisisIncident {
  id: string
  title: string
  description: string
  category: 'operational' | 'financial' | 'regulatory' | 'reputational' | 'cybersecurity' | 'legal' | 'environmental' | 'strategic'
  level: 'low' | 'medium' | 'high' | 'critical'
  status: 'monitoring' | 'active' | 'escalated' | 'resolving' | 'resolved' | 'post_incident'
  created_at: string
  updated_at: string
  assigned_team: string[]
  impact_assessment: {
    financial_impact?: number
    operational_impact?: string
    reputational_risk?: string
  }
}

interface SituationAlert {
  id: string
  title: string
  description: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  status: 'active' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive' | 'escalated'
  source: string
  created_at: string
  analysis: {
    relevance_score: number
    sentiment_score: number
    urgency_score: number
    credibility_score: number
  }
}

interface EmergencyMeeting {
  id: string
  title: string
  urgency: 'immediate' | 'urgent' | 'high' | 'standard'
  scheduled_at: string
  status: 'scheduling' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  attendees: { name: string; role: string; status: string }[]
  meeting_link?: string
}

interface CommunicationMessage {
  id: string
  title: string
  type: 'internal_alert' | 'stakeholder_update' | 'media_statement' | 'board_notification'
  status: 'draft' | 'pending_approval' | 'approved' | 'sent'
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  created_at: string
  target_audiences: string[]
  approval_progress: number
}

const CrisisCommandCenter: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [incidents, setIncidents] = useState<CrisisIncident[]>([])
  const [alerts, setAlerts] = useState<SituationAlert[]>([])
  const [meetings, setMeetings] = useState<EmergencyMeeting[]>([])
  const [communications, setCommunications] = useState<CommunicationMessage[]>([])
  const [isSecureMode, setIsSecureMode] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [selectedIncident, setSelectedIncident] = useState<CrisisIncident | null>(null)
  const [loading, setLoading] = useState(false)

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would fetch fresh data
      refreshData()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      // Simulate API calls - in real app, these would be actual API calls
      await Promise.all([
        loadIncidents(),
        loadAlerts(),
        loadMeetings(),
        loadCommunications()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadIncidents = async () => {
    // Simulate loading incidents
    const mockIncidents: CrisisIncident[] = [
      {
        id: '1',
        title: 'Cybersecurity Breach - Customer Data',
        description: 'Potential unauthorized access to customer database detected',
        category: 'cybersecurity',
        level: 'critical',
        status: 'active',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        assigned_team: ['security_team', 'crisis_manager'],
        impact_assessment: {
          financial_impact: 2500000,
          operational_impact: 'Major system disruption',
          reputational_risk: 'Severe damage to customer trust'
        }
      },
      {
        id: '2',
        title: 'Regulatory Investigation Notice',
        description: 'SEC inquiry regarding financial reporting practices',
        category: 'regulatory',
        level: 'high',
        status: 'monitoring',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        assigned_team: ['legal_team', 'compliance_officer'],
        impact_assessment: {
          financial_impact: 500000,
          operational_impact: 'Increased compliance workload',
          reputational_risk: 'Potential regulatory sanctions'
        }
      }
    ]
    setIncidents(mockIncidents)
  }

  const loadAlerts = async () => {
    const mockAlerts: SituationAlert[] = [
      {
        id: '1',
        title: 'Social Media Sentiment Spike',
        description: 'Negative sentiment spike detected across social media platforms',
        severity: 'medium',
        status: 'active',
        source: 'social_media_monitor',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        analysis: {
          relevance_score: 0.8,
          sentiment_score: -0.6,
          urgency_score: 0.7,
          credibility_score: 0.5
        }
      },
      {
        id: '2',
        title: 'Market Volatility Alert',
        description: 'Unusual trading volume and price movement detected',
        severity: 'high',
        status: 'acknowledged',
        source: 'market_monitor',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        analysis: {
          relevance_score: 0.9,
          sentiment_score: -0.3,
          urgency_score: 0.8,
          credibility_score: 0.9
        }
      }
    ]
    setAlerts(mockAlerts)
  }

  const loadMeetings = async () => {
    const mockMeetings: EmergencyMeeting[] = [
      {
        id: '1',
        title: 'Emergency Board Meeting - Cybersecurity Incident',
        urgency: 'immediate',
        scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'confirmed',
        attendees: [
          { name: 'Board Chair', role: 'board_chair', status: 'confirmed' },
          { name: 'CEO', role: 'ceo', status: 'confirmed' },
          { name: 'CTO', role: 'cto', status: 'tentative' },
          { name: 'Legal Counsel', role: 'legal_counsel', status: 'confirmed' }
        ],
        meeting_link: 'https://meet.boardguru.com/emergency-123'
      }
    ]
    setMeetings(mockMeetings)
  }

  const loadCommunications = async () => {
    const mockCommunications: CommunicationMessage[] = [
      {
        id: '1',
        title: 'Customer Data Security Notice',
        type: 'stakeholder_update',
        status: 'pending_approval',
        priority: 'critical',
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        target_audiences: ['customers', 'partners', 'media'],
        approval_progress: 60
      }
    ]
    setCommunications(mockCommunications)
  }

  // Initialize data on mount
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Utility functions
  const getSeverityColor = (level: string) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      emergency: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white',
      info: 'bg-gray-500 text-white'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-red-100 text-red-800 border-red-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      monitoring: 'bg-blue-100 text-blue-800 border-blue-200',
      escalated: 'bg-purple-100 text-purple-800 border-purple-200',
      acknowledged: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return <Zap className="h-4 w-4 text-red-600" />
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'high': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Crisis Command Center</h1>
          </div>
          <Badge variant="outline" className={isSecureMode ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
            {isSecureMode ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
            {isSecureMode ? 'Secure Mode' : 'Standard Mode'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1m</SelectItem>
              <SelectItem value="300">5m</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'emergency').length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Alerts Active</AlertTitle>
          <AlertDescription className="text-red-700">
            {alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'emergency').length} critical alerts require immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Incidents</span>
            {incidents.filter(i => i.status === 'active' || i.status === 'escalated').length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {incidents.filter(i => i.status === 'active' || i.status === 'escalated').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Monitoring</span>
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Meetings</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Communications</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {incidents.filter(i => i.status === 'active' || i.status === 'escalated').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {incidents.filter(i => i.level === 'critical').length} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Situation Alerts</CardTitle>
                <Bell className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {alerts.filter(a => a.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emergency Meetings</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {meetings.filter(m => m.status === 'confirmed' || m.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {meetings.filter(m => m.urgency === 'immediate').length} immediate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Communications</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {communications.filter(c => c.status === 'pending_approval' || c.status === 'approved').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {communications.filter(c => c.priority === 'critical' || c.priority === 'urgent').length} urgent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {[...incidents, ...alerts, ...meetings, ...communications]
                    .sort((a, b) => new Date(b.created_at || b.scheduled_at || '').getTime() - new Date(a.created_at || a.scheduled_at || '').getTime())
                    .slice(0, 10)
                    .map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 border-l-2 border-gray-200 pl-4">
                        <div className="mt-1">
                          {'level' in item ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                           'severity' in item ? <Bell className="h-4 w-4 text-orange-500" /> :
                           'urgency' in item ? <Users className="h-4 w-4 text-blue-500" /> :
                           <MessageSquare className="h-4 w-4 text-green-500" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {'title' in item ? item.title : 'Unknown Item'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(item.created_at || item.scheduled_at || '')}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Crisis Incidents</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Create Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Crisis Incident</DialogTitle>
                  <DialogDescription>
                    Create a new crisis incident to track and manage the response.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input placeholder="Incident title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea placeholder="Detailed description of the incident" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="regulatory">Regulatory</SelectItem>
                          <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                          <SelectItem value="reputational">Reputational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Severity Level</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
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
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Incident</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {incidents.map((incident) => (
              <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedIncident(incident)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {incident.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getSeverityColor(incident.level)}>
                        {incident.level.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(incident.status)}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Created {formatTimeAgo(incident.created_at)}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {incident.assigned_team.length} team members
                      </span>
                    </div>
                    {incident.impact_assessment.financial_impact && (
                      <span className="font-medium text-red-600">
                        ${incident.impact_assessment.financial_impact.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Situation Monitoring</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="h-3 w-3 mr-1" />
                Monitoring Active
              </Badge>
              <Button variant="outline" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Configure Monitors
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {alert.title}
                        <Badge className={`ml-2 ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(alert.status)}>
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Source:</span> {alert.source.replace('_', ' ')}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Detected:</span> {formatTimeAgo(alert.created_at)}
                    </div>
                    
                    {/* Analysis Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Relevance:</span>
                          <span>{Math.round(alert.analysis.relevance_score * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Urgency:</span>
                          <span>{Math.round(alert.analysis.urgency_score * 100)}%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Sentiment:</span>
                          <span className={alert.analysis.sentiment_score < 0 ? 'text-red-600' : 'text-green-600'}>
                            {alert.analysis.sentiment_score > 0 ? '+' : ''}{Math.round(alert.analysis.sentiment_score * 100)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credibility:</span>
                          <span>{Math.round(alert.analysis.credibility_score * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      {alert.status === 'active' && (
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Escalate
                      </Button>
                      <Button size="sm" variant="outline">
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Emergency Meetings</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule Emergency Meeting</DialogTitle>
                  <DialogDescription>
                    Schedule an emergency meeting for crisis response coordination.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meeting Title</label>
                    <Input placeholder="Emergency meeting title" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Urgency Level</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate (Within 1 hour)</SelectItem>
                          <SelectItem value="urgent">Urgent (Within 4 hours)</SelectItem>
                          <SelectItem value="high">High (Within 24 hours)</SelectItem>
                          <SelectItem value="standard">Standard (Within 48 hours)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meeting Format</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video_conference">Video Conference</SelectItem>
                          <SelectItem value="conference_call">Conference Call</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date & Time</label>
                    <Input type="datetime-local" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Schedule Meeting</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {getUrgencyIcon(meeting.urgency)}
                        <span className="ml-2">{meeting.title}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(meeting.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(meeting.status)}>
                      {meeting.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Attendees:</span>
                      <span className="text-sm text-muted-foreground">
                        {meeting.attendees.filter(a => a.status === 'confirmed').length} / {meeting.attendees.length} confirmed
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {meeting.attendees.slice(0, 4).map((attendee, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{attendee.name} ({attendee.role})</span>
                          <Badge variant="outline" className="text-xs">
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                      {meeting.attendees.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{meeting.attendees.length - 4} more attendees
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      {meeting.meeting_link && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 mr-1" />
                            Join Meeting
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        View Agenda
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Crisis Communications</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Create Communication
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Crisis Communication</DialogTitle>
                  <DialogDescription>
                    Create a new crisis communication message for stakeholders.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Communication Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal_alert">Internal Alert</SelectItem>
                        <SelectItem value="stakeholder_update">Stakeholder Update</SelectItem>
                        <SelectItem value="media_statement">Media Statement</SelectItem>
                        <SelectItem value="board_notification">Board Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input placeholder="Communication subject" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea placeholder="Communication content" className="min-h-32" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Save Draft</Button>
                  <Button>Submit for Approval</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {communications.map((comm) => (
              <Card key={comm.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{comm.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {comm.type.replace('_', ' ').toUpperCase()} • {comm.target_audiences.join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getSeverityColor(comm.priority)}>
                        {comm.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(comm.status)}>
                        {comm.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Created {formatTimeAgo(comm.created_at)}
                    </div>
                    
                    {comm.status === 'pending_approval' && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Approval Progress:</span>
                          <span>{comm.approval_progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${comm.approval_progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      {comm.status === 'draft' && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {comm.status === 'approved' && (
                        <Button size="sm">
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Send Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-2xl font-bold">Crisis Analytics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Time Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2 min</div>
                <p className="text-xs text-muted-foreground">Average detection to response</p>
                <div className="mt-2">
                  <div className="text-sm">Target: 5.0 min</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resolution Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">Incidents resolved within SLA</p>
                <div className="mt-2">
                  <div className="text-sm">Target: 90%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Communication Speed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-muted-foreground">Communications sent on time</p>
                <div className="mt-2">
                  <div className="text-sm">Target: 95%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Incident Trends (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="h-16 w-16 mb-2" />
                <p>Analytics dashboard will be implemented with real data visualization</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl">{selectedIncident.title}</DialogTitle>
                  <DialogDescription className="mt-2">
                    {selectedIncident.description}
                  </DialogDescription>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge className={getSeverityColor(selectedIncident.level)}>
                    {selectedIncident.level.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(selectedIncident.status)}>
                    {selectedIncident.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="py-4">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <p className="text-sm text-muted-foreground capitalize">{selectedIncident.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Created</label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedIncident.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {selectedIncident.impact_assessment && (
                      <div>
                        <label className="text-sm font-medium">Impact Assessment</label>
                        <div className="mt-2 space-y-2">
                          {selectedIncident.impact_assessment.financial_impact && (
                            <div className="flex justify-between">
                              <span className="text-sm">Financial Impact:</span>
                              <span className="text-sm font-medium text-red-600">
                                ${selectedIncident.impact_assessment.financial_impact.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {selectedIncident.impact_assessment.operational_impact && (
                            <div>
                              <span className="text-sm">Operational Impact:</span>
                              <p className="text-sm text-muted-foreground">
                                {selectedIncident.impact_assessment.operational_impact}
                              </p>
                            </div>
                          )}
                          {selectedIncident.impact_assessment.reputational_risk && (
                            <div>
                              <span className="text-sm">Reputational Risk:</span>
                              <p className="text-sm text-muted-foreground">
                                {selectedIncident.impact_assessment.reputational_risk}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="mt-4">
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-16 w-16 mx-auto mb-4" />
                    <p>Timeline view will show incident progression and key events</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="team" className="mt-4">
                  <div className="text-center text-muted-foreground py-8">
                    <Users className="h-16 w-16 mx-auto mb-4" />
                    <p>Team management interface for assigned response team</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="mt-4">
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-16 w-16 mx-auto mb-4" />
                    <p>Action items and response workflow management</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default CrisisCommandCenter