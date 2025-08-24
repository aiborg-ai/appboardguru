'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/cards/card';
import { Button } from '@/components/atoms/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Badge } from '@/components/atoms/display/badge';
import { Progress } from '@/components/atoms/display/progress';
import { Separator } from '@/components/atoms/display/separator';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Zap, 
  Brain,
  AlertCircle,
  CheckCircle,
  Activity,
  Mic,
  Volume2,
  MessageSquare,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  MoreVertical
} from 'lucide-react';
import {
  VoiceAnalyticsDashboard as VoiceAnalyticsData,
  AnalyticsTimeRange,
  PerformanceInsight,
  VoiceUsageMetrics,
  ParticipationMetrics,
  CommandAnalytics
} from '@/types/voice-analytics';

interface VoiceAnalyticsDashboardProps {
  userId?: string;
  organizationId: string;
  className?: string;
}

export function VoiceAnalyticsDashboard({ 
  userId, 
  organizationId, 
  className = '' 
}: VoiceAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<VoiceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>({
    period: 'monthly',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voice/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          timeRange,
          metrics: ['usage', 'effectiveness', 'participation', 'commands', 'insights']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voice analytics');
      }

      const result = await response.json();
      setAnalyticsData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userId, organizationId, timeRange]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading voice analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading analytics</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="mt-4 border-red-200 text-red-600 hover:bg-red-100"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into voice feature usage and effectiveness
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange.period} onValueChange={(value) => 
            setTimeRange(prev => ({ ...prev, period: value as any }))
          }>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Last 24 Hours</SelectItem>
              <SelectItem value="weekly">Last Week</SelectItem>
              <SelectItem value="monthly">Last Month</SelectItem>
              <SelectItem value="quarterly">Last Quarter</SelectItem>
              <SelectItem value="yearly">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(analyticsData.usageMetrics.totalUsageTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.usageMetrics.sessionsCount} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Effectiveness</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analyticsData.effectivenessMetrics.overallEffectiveness)}
            </div>
            <Progress 
              value={analyticsData.effectivenessMetrics.overallEffectiveness} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Command Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analyticsData.commandAnalytics.commandSuccessRates.reduce(
                (avg, cmd) => avg + cmd.successRate, 0
              ) / analyticsData.commandAnalytics.commandSuccessRates.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.commandAnalytics.commandUsageStats.totalCommands} total commands
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.effectivenessMetrics.userSatisfaction.overallSatisfaction.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              NPS: {analyticsData.effectivenessMetrics.userSatisfaction.npsScore}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="participation">Participation</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Breakdown</CardTitle>
                <CardDescription>How different voice features are being utilized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analyticsData.usageMetrics.featureUsage).map(([feature, data]) => (
                  <div key={feature} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={data.successRate > 90 ? 'default' : data.successRate > 75 ? 'secondary' : 'destructive'}>
                          {formatPercentage(data.successRate)}
                        </Badge>
                        <span className="text-sm text-gray-600">{data.totalUses} uses</span>
                      </div>
                    </div>
                    <Progress value={data.successRate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Performance Insights Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Top performance insights and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.performanceInsights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 rounded-full p-1 ${
                        insight.significance === 'critical' ? 'bg-red-100 text-red-600' :
                        insight.significance === 'high' ? 'bg-orange-100 text-orange-600' :
                        insight.significance === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {insight.significance === 'critical' ? <AlertCircle className="h-4 w-4" /> :
                         insight.significance === 'high' ? <TrendingUp className="h-4 w-4" /> :
                         <Brain className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        {insight.recommendations.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Top Recommendation:</span>
                            <p className="text-xs text-gray-700 mt-1">
                              {insight.recommendations[0]?.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Pattern */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
              <CardDescription>Voice feature usage throughout the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-gray-200 rounded-lg">
                <p className="text-gray-500">
                  Usage pattern chart would be rendered here with a charting library
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <UsageAnalyticsTab usageMetrics={analyticsData.usageMetrics} />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-6">
          <EffectivenessAnalyticsTab effectivenessMetrics={analyticsData.effectivenessMetrics} />
        </TabsContent>

        <TabsContent value="participation" className="space-y-6">
          <ParticipationAnalyticsTab participationMetrics={analyticsData.participationMetrics} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <InsightsAnalyticsTab insights={analyticsData.performanceInsights} />
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export & Reports
          </CardTitle>
          <CardDescription>Generate and download detailed analytics reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components for different analytics tabs
function UsageAnalyticsTab({ usageMetrics }: { usageMetrics: VoiceUsageMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {usageMetrics.deviceUsageBreakdown.map((device, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Mic className="h-4 w-4 text-gray-500" />
                <span className="capitalize">{device.deviceType}</span>
                {device.browser && <span className="text-sm text-gray-500">({device.browser})</span>}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{device.usageCount}</span>
                <Badge variant={device.successRate > 90 ? 'default' : 'secondary'}>
                  {device.successRate}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Recording Quality</span>
              <span>{usageMetrics.qualityMetrics.averageRecordingQuality.toFixed(1)}/5</span>
            </div>
            <Progress value={usageMetrics.qualityMetrics.averageRecordingQuality * 20} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Signal Clarity</span>
              <span>{usageMetrics.qualityMetrics.clarityScore.toFixed(1)}/5</span>
            </div>
            <Progress value={usageMetrics.qualityMetrics.clarityScore * 20} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Noise Level</span>
              <span className="text-sm text-gray-600">
                {usageMetrics.qualityMetrics.backgroundNoiseLevel > 0.7 ? 'High' : 
                 usageMetrics.qualityMetrics.backgroundNoiseLevel > 0.4 ? 'Medium' : 'Low'}
              </span>
            </div>
            <Progress value={100 - (usageMetrics.qualityMetrics.backgroundNoiseLevel * 100)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EffectivenessAnalyticsTab({ effectivenessMetrics }: { effectivenessMetrics: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {effectivenessMetrics.taskCompletionRate.toFixed(1)}%
            </div>
            <Progress value={effectivenessMetrics.taskCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {effectivenessMetrics.accuracyMetrics.speechRecognitionAccuracy.toFixed(1)}%
            </div>
            <Progress value={effectivenessMetrics.accuracyMetrics.speechRecognitionAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {effectivenessMetrics.userSatisfaction.overallSatisfaction.toFixed(1)}/5
            </div>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className={`h-4 w-4 ${
                    star <= effectivenessMetrics.userSatisfaction.overallSatisfaction
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROI Calculation</CardTitle>
          <CardDescription>Return on investment from voice feature adoption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {effectivenessMetrics.productivityMetrics.roiEstimate.timeSaved}h
              </div>
              <div className="text-sm text-gray-600">Time Saved/Month</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ${effectivenessMetrics.productivityMetrics.roiEstimate.costSavings}
              </div>
              <div className="text-sm text-gray-600">Cost Savings</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {effectivenessMetrics.productivityMetrics.roiEstimate.productivityGain}%
              </div>
              <div className="text-sm text-gray-600">Productivity Gain</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {effectivenessMetrics.productivityMetrics.roiEstimate.paybackPeriod}
              </div>
              <div className="text-sm text-gray-600">Payback (Months)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParticipationAnalyticsTab({ participationMetrics }: { participationMetrics: ParticipationMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Participation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Average Speaking Time</span>
            <span className="font-medium">
              {participationMetrics.meetingParticipation.averageSpeakingTime.toFixed(1)} min
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Participation Ratio</span>
            <span className="font-medium">
              {participationMetrics.meetingParticipation.participationRatio.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Questions Asked</span>
            <span className="font-medium">
              {participationMetrics.meetingParticipation.questionFrequency}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Speaking Dynamics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Speech Rate</span>
            <span className="font-medium">
              {participationMetrics.speakingDynamics.speechRate.averageWordsPerMinute} WPM
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Emotional Range</span>
            <span className="font-medium">
              {participationMetrics.speakingDynamics.emotionalDynamics.emotionalRange.toFixed(1)}/5
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Pause Effectiveness</span>
            <span className="font-medium">
              {participationMetrics.speakingDynamics.pauseAnalysis.pauseEffectiveness.toFixed(1)}/5
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsAnalyticsTab({ insights }: { insights: PerformanceInsight[] }) {
  return (
    <div className="space-y-6">
      {insights.map((insight) => (
        <Card key={insight.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Badge variant={
                    insight.significance === 'critical' ? 'destructive' :
                    insight.significance === 'high' ? 'default' :
                    'secondary'
                  }>
                    {insight.significance}
                  </Badge>
                  <span>{insight.title}</span>
                </CardTitle>
                <CardDescription className="mt-2">{insight.description}</CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">
                {insight.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insight.metrics.map((metric, index) => (
                <div key={index} className="text-center p-3 border rounded-lg">
                  <div className="text-xl font-bold">{metric.value} {metric.unit}</div>
                  <div className="text-sm text-gray-600">{metric.name}</div>
                  <Badge 
                    variant={metric.trend === 'improving' ? 'default' : 
                             metric.trend === 'declining' ? 'destructive' : 'secondary'} 
                    className="mt-1"
                  >
                    {metric.trend}
                  </Badge>
                </div>
              ))}
            </div>

            {insight.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {insight.recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{rec.title}</div>
                        <div className="text-xs text-gray-600">{rec.description}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default VoiceAnalyticsDashboard;