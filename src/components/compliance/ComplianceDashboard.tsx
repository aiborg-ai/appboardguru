'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComplianceMetricsChart } from './ComplianceMetricsChart'
import { ComplianceAlerts } from './ComplianceAlerts'
import { RecentActivity } from './RecentActivity'
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  Activity,
  Clock,
  CheckCircle
} from 'lucide-react'
import { ComplianceDashboardData, ComplianceAlert, ComplianceFramework } from '@/types/compliance'

interface ComplianceDashboardProps {
  organizationId: string
  initialData?: ComplianceDashboardData
}

export function ComplianceDashboard({ organizationId, initialData }: ComplianceDashboardProps) {
  const [data, setData] = useState<ComplianceDashboardData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) {
      fetchDashboardData()
    }
  }, [organizationId, initialData])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/compliance/tracker?organizationId=${organizationId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to load compliance data')
      }
    } catch (err) {
      console.error('Error fetching compliance dashboard data:', err)
      setError('Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  const handleAlertDismiss = async (alertId: string) => {
    if (!data) return
    
    // Optimistically update UI
    const updatedAlerts = data.alerts.filter(alert => alert.id !== alertId)
    setData({ ...data, alerts: updatedAlerts })
    
    // TODO: Make API call to dismiss alert
    console.log('Dismissing alert:', alertId)
  }

  const handleViewAlertDetails = (alert: ComplianceAlert) => {
    // TODO: Navigate to alert details or open modal
    console.log('Viewing alert details:', alert)
  }

  const generateReport = async (reportType: string) => {
    try {
      const response = await fetch('/api/compliance/tracker/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          reportType,
          generatedBy: 'user'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // TODO: Handle successful report generation
        console.log('Report generation initiated:', result.data)
      }
    } catch (err) {
      console.error('Error generating report:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load compliance dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No compliance data available</h3>
          <p className="text-gray-600">Get started by setting up compliance frameworks</p>
        </CardContent>
      </Card>
    )
  }

  const { metrics, alerts, recentActivity, frameworks } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
          <p className="text-gray-600">Monitor and manage your compliance posture</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateReport('executive-summary')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.overallComplianceScore)}%
                </p>
              </div>
              <Shield className={`h-8 w-8 ${
                metrics.overallComplianceScore >= 90 ? 'text-green-500' :
                metrics.overallComplianceScore >= 70 ? 'text-yellow-500' :
                'text-red-500'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${
                alerts.length === 0 ? 'text-green-500' :
                alerts.some(a => a.priority === 'critical') ? 'text-red-500' :
                'text-yellow-500'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Deadlines</p>
                <p className="text-2xl font-bold">{metrics.upcomingDeadlines.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Frameworks</p>
                <p className="text-2xl font-bold">{Object.keys(metrics.frameworkScores).length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search compliance items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Frameworks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworks.map((framework) => (
              <SelectItem key={framework.id} value={framework.id}>
                {framework.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Framework Scores Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Compliance Metrics
                </CardTitle>
                <CardDescription>
                  Framework compliance scores and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplianceMetricsChart
                  frameworkScores={metrics.frameworkScores}
                  trends={[]} // TODO: Add actual trend data
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest compliance activities across your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity activities={recentActivity} />
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Alerts
                  <Badge variant="destructive" className="ml-2">
                    {alerts.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Issues requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplianceAlerts
                  alerts={alerts}
                  onDismiss={handleAlertDismiss}
                  onViewDetails={handleViewAlertDetails}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assessments">
          <Card>
            <CardHeader>
              <CardTitle>Assessments</CardTitle>
              <CardDescription>
                Manage compliance assessments and evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Assessment management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle>Findings & Remediation</CardTitle>
              <CardDescription>
                Track compliance findings and remediation efforts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Findings management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>
                Generate and download compliance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => generateReport('executive-summary')}
                  >
                    <FileText className="h-6 w-6" />
                    Executive Summary
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => generateReport('detailed-assessment')}
                  >
                    <Shield className="h-6 w-6" />
                    Detailed Assessment
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => generateReport('remediation-status')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    Remediation Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}