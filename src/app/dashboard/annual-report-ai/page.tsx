'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  FileText, 
  Brain, 
  Download, 
  Upload, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Eye,
  Edit3,
  Share2,
  Settings,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Search,
  FileSearch,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  BookOpen
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrganization } from '@/contexts/OrganizationContext'

interface ReportSection {
  id: string
  name: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  content?: string
  confidence?: number
  lastGenerated?: Date
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  sections: string[]
  estimatedTime: number
  complexity: 'basic' | 'standard' | 'comprehensive'
}

interface GenerationProgress {
  currentSection: string
  totalSections: number
  completedSections: number
  estimatedTimeRemaining: number
  status: 'idle' | 'preparing' | 'analyzing' | 'generating' | 'finalizing' | 'completed'
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'annual-board',
    name: 'Annual Board Report',
    description: 'Comprehensive yearly overview for board members including financial performance, strategic initiatives, and governance metrics.',
    sections: ['Executive Summary', 'Financial Performance', 'Strategic Initiatives', 'Governance & Compliance', 'Risk Assessment', 'Future Outlook'],
    estimatedTime: 15,
    complexity: 'comprehensive'
  },
  {
    id: 'quarterly-summary',
    name: 'Quarterly Summary',
    description: 'Focused quarterly report highlighting key metrics, achievements, and challenges.',
    sections: ['Quarter Highlights', 'Financial Summary', 'Operational Metrics', 'Key Achievements', 'Challenges & Mitigation'],
    estimatedTime: 8,
    complexity: 'standard'
  },
  {
    id: 'stakeholder-update',
    name: 'Stakeholder Update',
    description: 'Streamlined report for external stakeholders focusing on performance and transparency.',
    sections: ['Performance Overview', 'Market Position', 'Sustainability Initiatives', 'Stakeholder Value'],
    estimatedTime: 5,
    complexity: 'basic'
  },
  {
    id: 'custom-report',
    name: 'Custom Report',
    description: 'Build a custom report with your selected sections and focus areas.',
    sections: [],
    estimatedTime: 10,
    complexity: 'standard'
  }
]

const samplePerformanceData = [
  { month: 'Jan', revenue: 1200000, expenses: 800000, profit: 400000 },
  { month: 'Feb', revenue: 1350000, expenses: 820000, profit: 530000 },
  { month: 'Mar', revenue: 1180000, expenses: 790000, profit: 390000 },
  { month: 'Apr', revenue: 1420000, expenses: 850000, profit: 570000 },
  { month: 'May', revenue: 1380000, expenses: 830000, profit: 550000 },
  { month: 'Jun', revenue: 1450000, expenses: 860000, profit: 590000 },
  { month: 'Jul', revenue: 1520000, expenses: 880000, profit: 640000 },
  { month: 'Aug', revenue: 1480000, expenses: 870000, profit: 610000 },
  { month: 'Sep', revenue: 1600000, expenses: 900000, profit: 700000 },
  { month: 'Oct', revenue: 1550000, expenses: 890000, profit: 660000 },
  { month: 'Nov', revenue: 1680000, expenses: 920000, profit: 760000 },
  { month: 'Dec', revenue: 1750000, expenses: 950000, profit: 800000 }
]

const departmentData = [
  { name: 'Technology', value: 35, color: '#0088FE' },
  { name: 'Sales', value: 25, color: '#00C49F' },
  { name: 'Marketing', value: 15, color: '#FFBB28' },
  { name: 'Operations', value: 20, color: '#FF8042' },
  { name: 'Admin', value: 5, color: '#8884D8' }
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnnualReportAI() {
  const { currentOrganization } = useOrganization()
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportSections, setReportSections] = useState<ReportSection[]>([])
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    currentSection: '',
    totalSections: 0,
    completedSections: 0,
    estimatedTimeRemaining: 0,
    status: 'idle'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<string>('')
  const [reportDate, setReportDate] = useState(new Date())
  
  // Analyze Report state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [analysisType, setAnalysisType] = useState<'upload' | 'asset'>('upload')

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    const sections: ReportSection[] = template.sections.map(section => ({
      id: section.toLowerCase().replace(/\s+/g, '-'),
      name: section,
      status: 'pending'
    }))
    setReportSections(sections)
  }

  const startReportGeneration = async () => {
    if (!selectedTemplate) return

    setIsGenerating(true)
    setGenerationProgress({
      currentSection: reportSections[0]?.name || '',
      totalSections: reportSections.length,
      completedSections: 0,
      estimatedTimeRemaining: selectedTemplate.estimatedTime * 60,
      status: 'preparing'
    })

    // Simulate AI report generation process
    try {
      // Preparing phase
      await new Promise(resolve => setTimeout(resolve, 2000))
      setGenerationProgress(prev => ({ ...prev, status: 'analyzing' }))

      // Analyzing data phase
      await new Promise(resolve => setTimeout(resolve, 3000))
      setGenerationProgress(prev => ({ ...prev, status: 'generating' }))

      // Generate each section
      for (let i = 0; i < reportSections.length; i++) {
        const section = reportSections[i]
        setGenerationProgress(prev => ({
          ...prev,
          currentSection: section.name,
          completedSections: i
        }))

        // Update section status
        setReportSections(prev => prev.map(s => 
          s.id === section.id 
            ? { ...s, status: 'generating' }
            : s
        ))

        // Simulate generation time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

        // Mark section as completed
        setReportSections(prev => prev.map(s => 
          s.id === section.id 
            ? { 
                ...s, 
                status: 'completed', 
                confidence: 85 + Math.random() * 10,
                lastGenerated: new Date(),
                content: generateSampleContent(section.name)
              }
            : s
        ))

        setGenerationProgress(prev => ({
          ...prev,
          completedSections: i + 1,
          estimatedTimeRemaining: Math.max(0, prev.estimatedTimeRemaining - 30)
        }))
      }

      // Finalizing phase
      setGenerationProgress(prev => ({ ...prev, status: 'finalizing' }))
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Complete
      setGenerationProgress(prev => ({ ...prev, status: 'completed', estimatedTimeRemaining: 0 }))
      setGeneratedReport(generateFullReport())

    } catch (error) {
      console.error('Report generation failed:', error)
      setReportSections(prev => prev.map(s => ({ ...s, status: 'error' })))
    } finally {
      setIsGenerating(false)
    }
  }

  const generateSampleContent = (sectionName: string): string => {
    switch (sectionName) {
      case 'Executive Summary':
        return 'This year has been marked by significant growth and strategic achievements. Our organization has demonstrated resilience and adaptability in a challenging market environment, delivering strong financial performance while maintaining our commitment to innovation and stakeholder value creation.'
      case 'Financial Performance':
        return 'Our financial performance this year exceeded expectations with revenue growth of 18% year-over-year, reaching $18.5M. Profit margins improved by 3.2 percentage points, demonstrating effective cost management and operational efficiency improvements.'
      case 'Strategic Initiatives':
        return 'We successfully launched three major strategic initiatives: digital transformation program, sustainability framework implementation, and market expansion into two new regions. Each initiative is tracking ahead of schedule with measurable impact on our key performance indicators.'
      case 'Governance & Compliance':
        return 'Our governance framework continues to evolve with enhanced board oversight, improved risk management protocols, and full compliance with regulatory requirements. We achieved 100% compliance across all applicable frameworks including SOX, GDPR, and industry-specific regulations.'
      case 'Risk Assessment':
        return 'Our comprehensive risk assessment identifies cybersecurity, supply chain disruption, and regulatory changes as primary risk factors. Mitigation strategies are in place for all identified risks with regular monitoring and review processes established.'
      case 'Future Outlook':
        return 'Looking ahead, we remain optimistic about growth prospects driven by our innovation pipeline, strategic partnerships, and strong market position. We anticipate continued growth in the 15-20% range with expanding profit margins through operational excellence initiatives.'
      default:
        return `Comprehensive analysis and insights for ${sectionName} based on organizational data, market trends, and performance metrics. This section provides detailed examination of key factors and strategic recommendations.`
    }
  }

  const generateFullReport = (): string => {
    return reportSections.map(section => 
      `## ${section.name}

${section.content}

---
`
    ).join('\n')
  }

  const handleDownloadReport = () => {
    const blob = new Blob([generatedReport], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annual-report-${reportDate.getFullYear()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setAnalysisResults(null)
    }
  }

  const handleAnalyzeReport = async () => {
    if (!selectedFile && !selectedAssetId) {
      return
    }

    setIsAnalyzing(true)
    setAnalysisResults(null)

    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResults({
        summary: {
          title: selectedFile?.name || 'Selected Annual Report',
          year: '2024',
          totalPages: 148,
          sections: 12,
          keyMetrics: 25
        },
        insights: [
          {
            type: 'positive',
            title: 'Revenue Growth',
            description: 'Company achieved 23% YoY revenue growth, exceeding industry average of 15%',
            confidence: 0.92
          },
          {
            type: 'positive',
            title: 'Market Expansion',
            description: 'Successfully entered 3 new geographic markets with positive initial traction',
            confidence: 0.88
          },
          {
            type: 'warning',
            title: 'Operating Costs',
            description: 'Operating expenses increased by 18%, requiring attention to cost optimization',
            confidence: 0.85
          },
          {
            type: 'negative',
            title: 'Customer Churn',
            description: 'Customer retention rate decreased from 92% to 87%, below target of 90%',
            confidence: 0.79
          }
        ],
        keyFindings: [
          'Strong financial performance with revenue exceeding $150M',
          'Digital transformation initiatives showing positive ROI',
          'ESG scores improved across all major rating agencies',
          'Board diversity increased to 45% representation'
        ],
        recommendations: [
          'Focus on operational efficiency to improve profit margins',
          'Invest in customer retention programs to reduce churn',
          'Accelerate digital product development initiatives',
          'Enhance sustainability reporting and transparency'
        ],
        sections: [
          { name: 'Executive Summary', pages: '3-8', sentiment: 'positive' },
          { name: 'Financial Performance', pages: '9-42', sentiment: 'positive' },
          { name: 'Operations Review', pages: '43-68', sentiment: 'neutral' },
          { name: 'Market Analysis', pages: '69-88', sentiment: 'positive' },
          { name: 'Risk Assessment', pages: '89-102', sentiment: 'warning' },
          { name: 'Governance', pages: '103-120', sentiment: 'positive' },
          { name: 'Sustainability', pages: '121-140', sentiment: 'positive' },
          { name: 'Future Outlook', pages: '141-148', sentiment: 'neutral' }
        ]
      })
      setIsAnalyzing(false)
    }, 5000)
  }

  const getStatusIcon = (status: ReportSection['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'generating':
        return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getComplexityBadge = (complexity: ReportTemplate['complexity']) => {
    const variants = {
      basic: 'bg-green-100 text-green-800',
      standard: 'bg-blue-100 text-blue-800', 
      comprehensive: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <Badge className={variants[complexity]}>
        {complexity}
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <PageHeader
            icon={Brain}
            title="Annual Report AI"
            description="Generate comprehensive annual reports using AI-powered insights and your board data"
          />
          <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          {generatedReport && (
            <Button onClick={handleDownloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analyze">Analyze Report</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="progress">Generation Progress</TabsTrigger>
          <TabsTrigger value="analytics">Data Analytics</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          {/* Analysis Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="w-5 h-5" />
                Select Report to Analyze
              </CardTitle>
              <CardDescription>
                Upload a new report or select from your existing assets to analyze with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Analysis Type Selection */}
              <div className="flex gap-4">
                <Button
                  variant={analysisType === 'upload' ? 'default' : 'outline'}
                  onClick={() => setAnalysisType('upload')}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Report
                </Button>
                <Button
                  variant={analysisType === 'asset' ? 'default' : 'outline'}
                  onClick={() => setAnalysisType('asset')}
                  className="flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Select from Assets
                </Button>
              </div>

              {/* Upload Option */}
              {analysisType === 'upload' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="report-upload"
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.txt"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="report-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile ? (
                          <>Selected: {selectedFile.name}</>
                        ) : (
                          <>Click to upload or drag and drop</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOCX, XLSX, TXT (Max 50MB)
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {/* Asset Selection Option */}
              {analysisType === 'asset' && (
                <div className="space-y-4">
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an annual report from your assets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset-1">2023 Annual Report.pdf</SelectItem>
                      <SelectItem value="asset-2">Q4 2023 Financial Statement.xlsx</SelectItem>
                      <SelectItem value="asset-3">Board Report 2023.docx</SelectItem>
                      <SelectItem value="asset-4">Sustainability Report 2023.pdf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Analyze Button */}
              <Button
                className="w-full"
                onClick={handleAnalyzeReport}
                disabled={(!selectedFile && !selectedAssetId) || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResults && (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Report Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{analysisResults.summary.year}</p>
                      <p className="text-sm text-gray-500">Report Year</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{analysisResults.summary.totalPages}</p>
                      <p className="text-sm text-gray-500">Total Pages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{analysisResults.summary.sections}</p>
                      <p className="text-sm text-gray-500">Sections</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{analysisResults.summary.keyMetrics}</p>
                      <p className="text-sm text-gray-500">Key Metrics</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">85%</p>
                      <p className="text-sm text-gray-500">Confidence Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResults.insights.map((insight: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          insight.type === 'positive' ? 'border-green-200 bg-green-50' :
                          insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {insight.type === 'positive' ? (
                            <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : insight.type === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{insight.title}</h4>
                            <p className="text-sm text-gray-600">{insight.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500">Confidence:</span>
                              <Progress value={insight.confidence * 100} className="w-20 h-2" />
                              <span className="text-xs font-medium">{Math.round(insight.confidence * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Findings & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Key Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResults.keyFindings.map((finding: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-sm">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResults.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Document Structure */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Document Structure Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResults.sections.map((section: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{section.name}</span>
                          <span className="text-xs text-gray-500">Pages {section.pages}</span>
                        </div>
                        <Badge
                          className={
                            section.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                            section.sentiment === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            section.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {section.sentiment}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Report Template
              </CardTitle>
              <CardDescription>
                Choose a template that best fits your reporting needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {reportTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {getComplexityBadge(template.complexity)}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{template.sections.length} sections</span>
                      <span>~{template.estimatedTime} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {selectedTemplate.name} Configuration
                  </span>
                  <Button 
                    onClick={startReportGeneration}
                    disabled={isGenerating}
                    className="ml-4"
                  >
                    {isGenerating ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Est. Time: {selectedTemplate.estimatedTime} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{selectedTemplate.sections.length} Sections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Complexity: {selectedTemplate.complexity}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Report Sections:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedTemplate.sections.map((section, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <span className="text-sm">{section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Generation Progress
              </CardTitle>
              <CardDescription>
                Real-time progress of your AI report generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {generationProgress.status !== 'idle' && (
                <>
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-gray-500">
                        {generationProgress.completedSections}/{generationProgress.totalSections} sections
                      </span>
                    </div>
                    <Progress 
                      value={(generationProgress.completedSections / generationProgress.totalSections) * 100} 
                      className="w-full"
                    />
                  </div>

                  {/* Current Status */}
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertTitle>Current Status: {generationProgress.status}</AlertTitle>
                    <AlertDescription>
                      {generationProgress.status === 'generating' && generationProgress.currentSection && (
                        <>Currently generating: {generationProgress.currentSection}</>
                      )}
                      {generationProgress.status === 'preparing' && 'Preparing data sources and analysis parameters...'}
                      {generationProgress.status === 'analyzing' && 'Analyzing organizational data and metrics...'}
                      {generationProgress.status === 'finalizing' && 'Finalizing report structure and formatting...'}
                      {generationProgress.status === 'completed' && 'Report generation completed successfully!'}
                    </AlertDescription>
                  </Alert>

                  {/* Time Remaining */}
                  {generationProgress.estimatedTimeRemaining > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      Estimated time remaining: {Math.ceil(generationProgress.estimatedTimeRemaining / 60)} minutes
                    </div>
                  )}
                </>
              )}

              {/* Section Status */}
              {reportSections.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Section Status</h4>
                  <div className="space-y-2">
                    {reportSections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(section.status)}
                          <span className="font-medium">{section.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {section.confidence && (
                            <Badge variant="outline">
                              {Math.round(section.confidence)}% confidence
                            </Badge>
                          )}
                          <Badge 
                            className={
                              section.status === 'completed' ? 'bg-green-100 text-green-800' :
                              section.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                              section.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {section.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Report Preview */}
              {generatedReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Generated Report Preview
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm">{generatedReport}</pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={samplePerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stackId="1" 
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Department Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">$18.5M</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-sm text-green-600 mt-1">+18% from last year</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p className="text-2xl font-bold">$7.2M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-sm text-blue-600 mt-1">39% profit margin</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold">485</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-sm text-purple-600 mt-1">+12% growth</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Customer Satisfaction</p>
                    <p className="text-2xl font-bold">94%</p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-sm text-orange-600 mt-1">+2% improvement</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Report History
              </CardTitle>
              <CardDescription>
                Previously generated reports and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample historical reports */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Q3 2024 Annual Board Report</h4>
                      <p className="text-sm text-gray-600">Generated on September 15, 2024</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Q2 2024 Stakeholder Update</h4>
                      <p className="text-sm text-gray-600">Generated on June 30, 2024</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Q1 2024 Quarterly Summary</h4>
                      <p className="text-sm text-gray-600">Generated on March 31, 2024</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  )
}