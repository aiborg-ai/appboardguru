'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Clock, 
  Users, 
  CheckSquare, 
  AlertCircle, 
  Download,
  Printer,
  Share2,
  Brain,
  Calendar,
  Target,
  MessageSquare
} from 'lucide-react'

interface ActionItem {
  id: string
  text: string
  assignedTo?: string
  dueDate?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
}

interface Decision {
  id: string
  text: string
  context: string
  finalDecision: 'approved' | 'rejected' | 'deferred'
  createdAt: string
}

interface Discussion {
  topic: string
  keyPoints: string[]
  decisions: Decision[]
}

interface MeetingMinutes {
  header: {
    title: string
    date: string
    time: string
    attendees: Array<{
      name: string
      status: 'present' | 'absent'
    }>
    chairperson?: string
  }
  agenda: Array<{
    id: string
    title: string
  }>
  discussions: Discussion[]
  actionItems: ActionItem[]
  decisions: Decision[]
  nextMeeting?: {
    date: string
    tentativeAgenda: string[]
  }
  metadata: {
    duration?: number
    wordCount?: number
    participantCount?: number
    qualityMetrics?: {
      averageConfidence: number
      languageDistribution: Record<string, number>
    }
  }
}

interface MeetingMinutesViewerProps {
  transcriptionId: string
  title: string
  onClose?: () => void
}

export function MeetingMinutesViewer({ transcriptionId, title, onClose }: MeetingMinutesViewerProps) {
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'discussions' | 'actions' | 'decisions'>('overview')
  const [extractingActionItems, setExtractingActionItems] = useState(false)
  const [extractionSuccess, setExtractionSuccess] = useState(false)

  // Fetch meeting minutes
  useEffect(() => {
    const fetchMinutes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/meetings/transcription/generate-minutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcriptionId,
            summaryStyle: 'detailed'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch meeting minutes')
        }

        const result = await response.json()
        setMinutes(result.meetingMinutes)
      } catch (error) {
        console.error('Error fetching meeting minutes:', error)
        setError(error instanceof Error ? error.message : 'Failed to load meeting minutes')
      } finally {
        setIsLoading(false)
      }
    }

    if (transcriptionId) {
      fetchMinutes()
    }
  }, [transcriptionId])

  // Export minutes
  const exportMinutes = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      const response = await fetch(`/api/meetings/export-minutes?id=${transcriptionId}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}_minutes.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Print minutes
  const printMinutes = () => {
    window.print()
  }

  // Extract enhanced action items
  const extractEnhancedActionItems = async () => {
    setExtractingActionItems(true)
    try {
      // Extract participants from the meeting minutes
      const participants = minutes?.header.attendees.map(attendee => ({
        id: attendee.name.toLowerCase().replace(/\s+/g, '-'),
        name: attendee.name,
        aliases: [attendee.name]
      })) || []

      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extract',
          transcriptionId,
          participants
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setExtractionSuccess(true)
        // Optionally redirect to action items dashboard
        setTimeout(() => {
          window.open('/dashboard/action-items', '_blank')
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to extract action items')
      }
    } catch (error) {
      console.error('Error extracting enhanced action items:', error)
      alert('Failed to extract enhanced action items. Please try again.')
    } finally {
      setExtractingActionItems(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Generating AI meeting minutes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Minutes</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!minutes) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No meeting minutes available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{minutes.header.title}</h1>
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{minutes.header.date}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{minutes.header.time}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{minutes.header.attendees.length} attendees</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="h-4 w-4" />
                <span>AI Generated</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportMinutes('pdf')}
              className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => exportMinutes('docx')}
              className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>DOCX</span>
            </button>
            <button
              onClick={printMinutes}
              className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview', icon: FileText },
            { key: 'discussions', label: 'Discussions', icon: MessageSquare },
            { key: 'actions', label: `Action Items (${minutes.actionItems.length})`, icon: CheckSquare },
            { key: 'decisions', label: `Decisions (${minutes.decisions.length})`, icon: Target }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Meeting Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
                    <dd className="text-sm text-gray-900">{minutes.header.date} at {minutes.header.time}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="text-sm text-gray-900">
                      {minutes.metadata.duration ? `${Math.round(minutes.metadata.duration / 60000)} minutes` : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Chairperson</dt>
                    <dd className="text-sm text-gray-900">{minutes.header.chairperson || 'Not specified'}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Metrics</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Transcription Confidence</dt>
                    <dd className="text-sm text-gray-900">
                      {minutes.metadata.qualityMetrics?.averageConfidence 
                        ? `${Math.round(minutes.metadata.qualityMetrics.averageConfidence * 100)}%`
                        : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Word Count</dt>
                    <dd className="text-sm text-gray-900">{minutes.metadata.wordCount || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Participants</dt>
                    <dd className="text-sm text-gray-900">{minutes.metadata.participantCount || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Attendees */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendees</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {minutes.header.attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      attendee.status === 'present' ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="text-sm text-gray-900">{attendee.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      attendee.status === 'present' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {attendee.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agenda</h3>
              <ol className="space-y-2">
                {minutes.agenda.map((item, index) => (
                  <li key={item.id} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-900">{item.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="space-y-6">
            {minutes.discussions.map((discussion, index) => (
              <div key={index} className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{discussion.topic}</h3>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                  <ul className="space-y-1">
                    {discussion.keyPoints.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                        <span className="text-sm text-gray-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {discussion.decisions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Decisions Made:</h4>
                    <div className="space-y-2">
                      {discussion.decisions.map((decision, decIndex) => (
                        <div key={decIndex} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <CheckSquare className="h-4 w-4 text-green-600" />
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              decision.finalDecision === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : decision.finalDecision === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {decision.finalDecision.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1">{decision.text}</p>
                          <p className="text-xs text-gray-600">{decision.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* AI Action Item Extraction */}
            <div className="card p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Enhanced AI Action Item Extraction</h3>
                  <p className="text-gray-700 mb-4">
                    Upgrade to our intelligent action item system for advanced features like smart assignment, 
                    due date prediction, urgency scoring, and comprehensive tracking.
                  </p>
                  <button
                    onClick={extractEnhancedActionItems}
                    disabled={extractingActionItems || extractionSuccess}
                    className={`btn-primary flex items-center space-x-2 ${
                      extractingActionItems ? 'opacity-75 cursor-not-allowed' : ''
                    } ${extractionSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {extractingActionItems ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : extractionSuccess ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    <span>
                      {extractingActionItems 
                        ? 'Extracting...' 
                        : extractionSuccess 
                        ? 'Extraction Complete!' 
                        : 'Extract Enhanced Action Items'}
                    </span>
                  </button>
                  {extractionSuccess && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Enhanced action items extracted successfully! Opening dashboard...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Action Items Display */}
            <div className="space-y-4">
              {minutes.actionItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No action items identified</p>
                  <p className="text-sm text-gray-500 mt-2">Use the enhanced AI extraction above for better results</p>
                </div>
              ) : (
                minutes.actionItems.map((item) => (
                  <div key={item.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CheckSquare className={`h-5 w-5 ${
                            item.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 'high' 
                              ? 'bg-red-100 text-red-800'
                              : item.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.priority.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            Basic
                          </span>
                        </div>
                        <p className="text-gray-900 mb-2">{item.text}</p>
                        {(item.assignedTo || item.dueDate) && (
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {item.assignedTo && (
                              <span>Assigned to: <strong>{item.assignedTo}</strong></span>
                            )}
                            {item.dueDate && (
                              <span>Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="space-y-4">
            {minutes.decisions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No formal decisions recorded</p>
              </div>
            ) : (
              minutes.decisions.map((decision) => (
                <div key={decision.id} className="card p-6">
                  <div className="flex items-start space-x-3">
                    <Target className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          decision.finalDecision === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : decision.finalDecision === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {decision.finalDecision.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(decision.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{decision.text}</h4>
                      <p className="text-gray-600">{decision.context}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Next Meeting */}
      {minutes.nextMeeting && (
        <div className="bg-blue-50 border-t border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Meeting</h3>
          <p className="text-gray-700 mb-3">
            Scheduled for: <strong>{minutes.nextMeeting.date}</strong>
          </p>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tentative Agenda:</h4>
            <ul className="space-y-1">
              {minutes.nextMeeting.tentativeAgenda.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></span>
                  <span className="text-sm text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}