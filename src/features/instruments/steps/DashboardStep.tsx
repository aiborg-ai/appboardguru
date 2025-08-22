'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Progress } from '@/features/shared/ui/progress';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  FileText,
  Activity,
  Zap,
  Target,
  Download,
  Share2,
  Eye,
  RefreshCw,
  Info,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstrumentPlayWizardData } from '../InstrumentPlayWizard';

interface DashboardStepProps {
  data: InstrumentPlayWizardData;
  onUpdate: (updates: Partial<InstrumentPlayWizardData>) => void;
  onProcessAnalysis: () => Promise<void>;
}

const MOCK_INSIGHTS = [
  {
    id: '1',
    title: 'Strong Financial Performance',
    description: 'Revenue growth of 23% compared to last quarter, exceeding industry benchmarks.',
    type: 'positive' as const,
    confidence: 0.92,
    details: {
      metric: 'Revenue Growth',
      value: '23%',
      benchmark: '18%',
      trend: 'up'
    }
  },
  {
    id: '2', 
    title: 'Risk Exposure Identified',
    description: 'Elevated credit risk in the commercial lending portfolio requires attention.',
    type: 'warning' as const,
    confidence: 0.85,
    details: {
      metric: 'Credit Risk Score',
      value: '7.2',
      threshold: '6.0',
      trend: 'up'
    }
  },
  {
    id: '3',
    title: 'Regulatory Compliance',
    description: 'All regulatory requirements met for the current reporting period.',
    type: 'positive' as const,
    confidence: 0.98,
    details: {
      metric: 'Compliance Score',
      value: '98%',
      target: '95%',
      trend: 'stable'
    }
  }
];

const MOCK_RECOMMENDATIONS = [
  {
    id: '1',
    title: 'Optimize Investment Portfolio',
    description: 'Consider rebalancing the investment portfolio to reduce exposure to high-risk assets.',
    priority: 'high' as const,
    actionItems: [
      'Review current asset allocation',
      'Identify overexposed sectors',
      'Develop rebalancing strategy',
      'Implement gradual transition plan'
    ]
  },
  {
    id: '2',
    title: 'Enhance Risk Monitoring',
    description: 'Implement additional monitoring controls for the commercial lending portfolio.',
    priority: 'medium' as const,
    actionItems: [
      'Set up automated risk alerts',
      'Increase reporting frequency',
      'Review lending criteria'
    ]
  }
];

const PROCESSING_STAGES = [
  { label: 'Loading documents', duration: 1000 },
  { label: 'Extracting content', duration: 2000 },
  { label: 'AI analysis in progress', duration: 3000 },
  { label: 'Generating insights', duration: 2000 },
  { label: 'Finalizing results', duration: 1000 }
];

export default function DashboardStep({ 
  data, 
  onUpdate, 
  onProcessAnalysis 
}: DashboardStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  // Start analysis when step is accessed and hasn't been done yet
  useEffect(() => {
    if (!hasStartedAnalysis && !data.analysisResults && data.selectedAssets.length > 0) {
      handleStartAnalysis();
    }
  }, [hasStartedAnalysis, data.analysisResults, data.selectedAssets]);

  const handleStartAnalysis = useCallback(async () => {
    setHasStartedAnalysis(true);
    setIsProcessing(true);
    setProcessingStage(0);
    setProcessingProgress(0);

    try {
      // Simulate processing stages
      for (let stage = 0; stage < PROCESSING_STAGES.length; stage++) {
        setProcessingStage(stage);
        
        const stageDuration = PROCESSING_STAGES[stage].duration;
        const steps = 20; // Number of progress updates per stage
        const stepDuration = stageDuration / steps;
        
        for (let step = 0; step < steps; step++) {
          const stageProgress = (step + 1) / steps;
          const totalProgress = ((stage + stageProgress) / PROCESSING_STAGES.length) * 100;
          
          setProcessingProgress(totalProgress);
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
      }

      // Generate mock results based on instrument type and selected goal
      const mockResults = {
        insights: MOCK_INSIGHTS,
        charts: [
          {
            id: '1',
            type: 'line' as const,
            title: 'Revenue Trend',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4'],
              datasets: [{
                label: 'Revenue',
                data: [120, 145, 168, 195],
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F6'
              }]
            }
          },
          {
            id: '2',
            type: 'bar' as const,
            title: 'Risk Distribution',
            data: {
              labels: ['Low', 'Medium', 'High', 'Critical'],
              datasets: [{
                label: 'Number of Risks',
                data: [12, 8, 4, 1],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#7C2D12']
              }]
            }
          }
        ],
        recommendations: MOCK_RECOMMENDATIONS,
        metadata: {
          processingTime: 8500,
          documentsProcessed: data.selectedAssets.length,
          confidence: 0.89,
          timestamp: new Date().toISOString()
        }
      };

      onUpdate({ analysisResults: mockResults });
      await onProcessAnalysis();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [data.selectedAssets, onUpdate, onProcessAnalysis]);

  const handleReprocessAnalysis = useCallback(() => {
    onUpdate({ analysisResults: null });
    setHasStartedAnalysis(false);
    setProcessingProgress(0);
    setProcessingStage(0);
  }, [onUpdate]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'negative':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'positive':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'negative':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedGoal = data.selectedGoal;
  const analysisResults = data.analysisResults;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Analysis Dashboard
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          AI-powered insights from your {selectedGoal?.title || 'analysis'}
        </p>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <motion.div 
                className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">
                AI Analysis in Progress
              </h4>
              <p className="text-sm text-blue-700">
                {PROCESSING_STAGES[processingStage]?.label}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-blue-700">
              <span>Processing {data.selectedAssets.length} assets</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
            <Progress 
              value={processingProgress} 
              className="h-2 bg-blue-100" 
            />
          </div>

          {/* Processing Stats */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-900">
                  {data.selectedAssets.length}
                </div>
                <div className="text-xs text-blue-600">Assets</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900">
                  {Math.round(processingProgress / 20)}
                </div>
                <div className="text-xs text-blue-600">Processing Stage</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-900">
                  AI
                </div>
                <div className="text-xs text-blue-600">Powered</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysisResults && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Analysis Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">Analysis Complete</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReprocessAnalysis}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reprocess</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {analysisResults.metadata.documentsProcessed}
                  </div>
                  <div className="text-sm text-green-600">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.round((analysisResults.metadata.processingTime || 0) / 1000)}s
                  </div>
                  <div className="text-sm text-green-600">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {analysisResults.insights.length}
                  </div>
                  <div className="text-sm text-green-600">Insights</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.round((analysisResults.metadata.confidence || 0) * 100)}%
                  </div>
                  <div className="text-sm text-green-600">Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span>Key Insights</span>
              </h4>
              <Badge variant="secondary">
                {analysisResults.insights.length} insights found
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analysisResults.insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * parseInt(insight.id) }}
                >
                  <Card className={cn('transition-all duration-200 hover:shadow-md', getInsightColors(insight.type))}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">
                            {insight.title}
                          </h5>
                          <p className="text-sm text-gray-600 mb-3">
                            {insight.description}
                          </p>
                          
                          {/* Insight Details */}
                          {insight.details && (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                                <span className="text-gray-600">Confidence:</span>
                                <span className="font-medium">
                                  {Math.round(insight.confidence * 100)}%
                                </span>
                              </div>
                              {insight.details.metric && (
                                <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                                  <span className="text-gray-600">{insight.details.metric}:</span>
                                  <div className="flex items-center space-x-1">
                                    <span className="font-medium">{insight.details.value}</span>
                                    {insight.details.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                                    {insight.details.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                                    {insight.details.trend === 'stable' && <Minus className="w-3 h-3 text-gray-500" />}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Data Visualizations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>Data Visualizations</span>
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysisResults.charts.map((chart) => (
                <Card key={chart.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{chart.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Mock Chart Placeholder */}
                    <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {chart.type.toUpperCase()} Chart
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Interactive visualization would appear here
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-500" />
              <span>Recommendations</span>
            </h4>

            <div className="space-y-4">
              {analysisResults.recommendations.map((rec) => (
                <Card key={rec.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="font-medium text-gray-900">{rec.title}</h5>
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', getPriorityColor(rec.priority))}
                      >
                        {rec.priority} priority
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      {rec.description}
                    </p>

                    {rec.actionItems && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Action Items:</p>
                        <ul className="space-y-1">
                          {rec.actionItems.map((item, index) => (
                            <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Download className="w-4 h-4" />
              <span>Export Results</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Share2 className="w-4 h-4" />
              <span>Share Insights</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>Full Report</span>
            </Button>
          </div>
        </motion.div>
      )}

      {/* No Analysis State */}
      {!analysisResults && !isProcessing && !hasStartedAnalysis && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-600 mb-2">
            Ready to Analyze
          </h4>
          <p className="text-gray-500 mb-6">
            Your {data.selectedAssets.length} selected assets are ready for AI analysis
          </p>
          <Button 
            onClick={handleStartAnalysis}
            className="flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Start Analysis</span>
          </Button>
        </div>
      )}
    </div>
  );
}