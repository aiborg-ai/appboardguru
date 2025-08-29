'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import DocumentSummaryViewer from '@/components/documents/DocumentSummaryViewer'
import BatchSummarizer from '@/components/documents/BatchSummarizer'
import { 
  Brain,
  FileText,
  Zap,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  Users,
  Search,
  Filter
} from 'lucide-react'

interface Document {
  id: string
  name: string
  file_type: string
  file_size: number
  description?: string
  created_at: string
  vault?: {
    name: string
    organization_id: string
  }
}

export default function DocumentSummarizePage() {
  const [currentView, setCurrentView] = useState<'single' | 'batch' | 'analytics'>('single')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Mock analytics data - in production, fetch from API
  const [analytics] = useState({
    totalSummaries: 147,
    documentsProcessed: 89,
    avgConfidence: 0.92,
    avgProcessingTime: 2340,
    summariesThisWeek: 23,
    topCategories: [
      { name: 'Board Packs', count: 42 },
      { name: 'Financial Reports', count: 38 },
      { name: 'Legal Contracts', count: 29 },
      { name: 'Meeting Minutes', count: 25 },
      { name: 'Strategic Plans', count: 13 }
    ]
  })

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      // In production, this would be a real API call
      const mockDocuments: Document[] = [
        {
          id: 'doc-1',
          name: 'Q4 2024 Board Pack.pdf',
          file_type: 'application/pdf',
          file_size: 2450000,
          description: 'Quarterly board meeting materials',
          created_at: '2024-12-15T10:00:00Z',
          vault: { name: 'Board Materials', organization_id: 'org-1' }
        },
        {
          id: 'doc-2',
          name: 'Financial Report December 2024.pdf',
          file_type: 'application/pdf',
          file_size: 1890000,
          description: 'Monthly financial statements and analysis',
          created_at: '2024-12-20T14:30:00Z',
          vault: { name: 'Financial Reports', organization_id: 'org-1' }
        },
        {
          id: 'doc-3',
          name: 'Strategic Plan 2025-2027.docx',
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size: 1230000,
          description: 'Three-year strategic planning document',
          created_at: '2024-12-18T09:15:00Z',
          vault: { name: 'Strategy', organization_id: 'org-1' }
        },
        {
          id: 'doc-4',
          name: 'Compliance Audit Report.pdf',
          file_type: 'application/pdf',
          file_size: 3400000,
          description: 'Annual compliance and regulatory audit',
          created_at: '2024-12-12T16:45:00Z',
          vault: { name: 'Compliance', organization_id: 'org-1' }
        }
      ]
      
      setDocuments(mockDocuments)
      if (mockDocuments.length > 0 && !selectedDocument) {
        setSelectedDocument(mockDocuments[0])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'pdf' && doc.file_type.includes('pdf')) ||
                         (filterType === 'word' && doc.file_type.includes('word')) ||
                         (filterType === 'excel' && doc.file_type.includes('excel'))
    
    return matchesSearch && matchesFilter
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋'
    return '📄'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Document Summarization</h1>
                <p className="text-gray-600">AI-powered document analysis and intelligent summaries</p>
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8">
              {[
                { key: 'single', label: 'Single Document', icon: FileText },
                { key: 'batch', label: 'Batch Processing', icon: Zap },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                    currentView === key
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Features Banner */}
        <div className="card p-6 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Document Intelligence</h3>
              <p className="text-gray-700 mb-4">
                Advanced AI analysis extracts key insights, action items, risks, and strategic information from your documents.
                Choose from multiple summary types tailored to different use cases and audiences.
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span>Executive Summaries</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>Detailed Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>Action-Oriented Insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span>Compliance Focus</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {currentView === 'single' && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Document List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Select Document</h3>
                
                {/* Search and Filter */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search documents..."
                      className="input pl-10 text-sm"
                    />
                  </div>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="pdf">PDF Files</option>
                    <option value="word">Word Documents</option>
                    <option value="excel">Excel Files</option>
                  </select>
                </div>

                {/* Document List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDocument?.id === document.id
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDocument(document)}
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">{getFileTypeIcon(document.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{document.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(document.file_size)} • {document.vault?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredDocuments.length === 0 && (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No documents found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Viewer */}
            <div className="lg:col-span-3">
              {selectedDocument ? (
                <DocumentSummaryViewer
                  documentId={selectedDocument.id}
                  documentName={selectedDocument.name}
                  summaryType="executive"
                />
              ) : (
                <div className="card p-8 text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Document</h3>
                  <p className="text-gray-600">
                    Choose a document from the list to generate an AI-powered summary with insights and analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'batch' && (
          <BatchSummarizer
            documents={documents}
            organizationId="org-1"
            onBatchComplete={(results) => {
              console.log('Batch processing completed:', results)
            }}
          />
        )}

        {currentView === 'analytics' && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card p-6 text-center">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">{analytics.totalSummaries}</div>
                <div className="text-sm text-gray-600">Total Summaries</div>
              </div>

              <div className="card p-6 text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">{analytics.documentsProcessed}</div>
                <div className="text-sm text-gray-600">Documents Processed</div>
              </div>

              <div className="card p-6 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">{Math.round(analytics.avgConfidence * 100)}%</div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>

              <div className="card p-6 text-center">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">{(analytics.avgProcessingTime / 1000).toFixed(1)}s</div>
                <div className="text-sm text-gray-600">Avg Processing Time</div>
              </div>

              <div className="card p-6 text-center">
                <TrendingUp className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900">{analytics.summariesThisWeek}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Categories</h3>
                <div className="space-y-3">
                  {analytics.topCategories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{category.name}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${(category.count / Math.max(...analytics.topCategories.map(c => c.count))) * 100}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{category.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Performance Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">High Confidence Summaries</span>
                    <span className="text-2xl font-bold text-green-600">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Action Items Extracted</span>
                    <span className="text-2xl font-bold text-blue-600">342</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Risks Identified</span>
                    <span className="text-2xl font-bold text-red-600">28</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Key Insights Generated</span>
                    <span className="text-2xl font-bold text-purple-600">756</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Trends */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">67%</div>
                  <div className="text-sm text-gray-600">Executive Summaries</div>
                  <div className="text-xs text-green-600 mt-1">↑ 15% from last month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">23%</div>
                  <div className="text-sm text-gray-600">Action-Oriented</div>
                  <div className="text-xs text-blue-600 mt-1">↑ 8% from last month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">10%</div>
                  <div className="text-sm text-gray-600">Compliance-Focused</div>
                  <div className="text-xs text-red-600 mt-1">↓ 3% from last month</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights Footer */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Intelligent Analysis</h3>
            <p className="text-gray-600 text-sm">
              Advanced AI extracts insights, action items, risks, and strategic information from any document type.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Batch Processing</h3>
            <p className="text-gray-600 text-sm">
              Process multiple documents simultaneously with smart prioritization and efficient resource management.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Collaborative Insights</h3>
            <p className="text-gray-600 text-sm">
              Share summaries with team members and track organizational document analysis trends and patterns.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}