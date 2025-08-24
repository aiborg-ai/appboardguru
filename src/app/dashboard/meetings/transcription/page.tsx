'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { MeetingTranscription } from '@/components/meeting/MeetingTranscription'
import { MeetingMinutesViewer } from '@/components/meeting/MeetingMinutesViewer'
import { 
  Brain, 
  Mic, 
  FileText, 
  Users, 
  Calendar,
  Clock,
  Plus,
  Settings,
  History,
  ChevronRight,
  Play,
  Square
} from 'lucide-react'

interface Participant {
  id: string
  name: string
  email?: string
}

interface MeetingSession {
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  participantCount: number
  duration?: number
}

export default function MeetingTranscriptionPage() {
  const [currentStep, setCurrentStep] = useState<'setup' | 'recording' | 'completed'>('setup')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newParticipantName, setNewParticipantName] = useState('')
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const [completedTranscriptionId, setCompletedTranscriptionId] = useState<string | null>(null)
  const [recentSessions, setRecentSessions] = useState<MeetingSession[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)

  // Demo organization ID (in production, get from user context)
  const organizationId = 'demo-org-123'

  // Load recent sessions
  useEffect(() => {
    loadRecentSessions()
  }, [])

  const loadRecentSessions = async () => {
    setIsLoadingRecent(true)
    try {
      // In production, this would fetch from actual API
      const mockSessions: MeetingSession[] = [
        {
          id: 'session-1',
          title: 'Q4 Board Meeting',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          participantCount: 8,
          duration: 120
        },
        {
          id: 'session-2', 
          title: 'Strategic Planning Session',
          status: 'completed',
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          participantCount: 12,
          duration: 180
        }
      ]
      setRecentSessions(mockSessions)
    } catch (error) {
      console.error('Error loading recent sessions:', error)
    } finally {
      setIsLoadingRecent(false)
    }
  }

  // Add participant
  const addParticipant = () => {
    if (newParticipantName.trim()) {
      const newParticipant: Participant = {
        id: `participant-${participants.length + 1}`,
        name: newParticipantName.trim(),
        email: newParticipantEmail.trim() || undefined
      }
      setParticipants([...participants, newParticipant])
      setNewParticipantName('')
      setNewParticipantEmail('')
    }
  }

  // Remove participant
  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  // Start meeting
  const startMeeting = () => {
    if (meetingTitle.trim() && participants.length > 0) {
      setCurrentStep('recording')
    }
  }

  // Handle transcription completion
  const handleTranscriptionComplete = (transcriptionId: string) => {
    setCompletedTranscriptionId(transcriptionId)
    setCurrentStep('completed')
  }

  // Reset to setup
  const resetToSetup = () => {
    setCurrentStep('setup')
    setMeetingTitle('')
    setParticipants([])
    setCompletedTranscriptionId(null)
  }

  // View previous session
  const viewSession = (sessionId: string) => {
    setCompletedTranscriptionId(sessionId)
    setCurrentStep('completed')
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Meeting Transcription</h1>
              <p className="text-gray-600">Real-time transcription and intelligent meeting minutes generation</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            {[
              { key: 'setup', label: 'Setup Meeting', icon: Settings },
              { key: 'recording', label: 'Record & Transcribe', icon: Mic },
              { key: 'completed', label: 'AI Minutes', icon: FileText }
            ].map(({ key, label, icon: Icon }, index) => (
              <div key={key} className="flex items-center space-x-2">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  currentStep === key
                    ? 'bg-blue-100 text-blue-700'
                    : index < ['setup', 'recording', 'completed'].indexOf(currentStep)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </div>
                {index < 2 && (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        {currentStep === 'setup' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Setup Form */}
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Meeting Setup</h2>
                
                <div className="space-y-6">
                  {/* Meeting Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Title
                    </label>
                    <input
                      type="text"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="e.g., Q4 2024 Board Meeting"
                      className="input w-full"
                    />
                  </div>

                  {/* Add Participants */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Participants
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder="Full Name"
                        className="input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      />
                      <input
                        type="email"
                        value={newParticipantEmail}
                        onChange={(e) => setNewParticipantEmail(e.target.value)}
                        placeholder="Email (optional)"
                        className="input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      />
                      <button
                        onClick={addParticipant}
                        className="btn-primary px-4 py-2"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Participants List */}
                    {participants.length > 0 && (
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div key={participant.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{participant.name}</div>
                              {participant.email && (
                                <div className="text-sm text-gray-600">{participant.email}</div>
                              )}
                            </div>
                            <button
                              onClick={() => removeParticipant(participant.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={startMeeting}
                    disabled={!meetingTitle.trim() || participants.length === 0}
                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Meeting Transcription
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div className="card p-6 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">💡 Tips for Best Results</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Ensure quiet environment with minimal background noise</li>
                  <li>• Use a quality microphone for better voice recognition</li>
                  <li>• Speak clearly and avoid talking over each other</li>
                  <li>• Add all expected participants for accurate speaker identification</li>
                  <li>• Meeting will be automatically saved and processed by AI</li>
                </ul>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="card p-6">
              <div className="flex items-center space-x-2 mb-6">
                <History className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Recent Sessions</h2>
              </div>

              {isLoadingRecent ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent transcription sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => viewSession(session.id)}
                      className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{session.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{session.participantCount} participants</span>
                            </div>
                            {session.duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{session.duration} min</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {session.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'recording' && (
          <MeetingTranscription
            organizationId={organizationId}
            meetingTitle={meetingTitle}
            participants={participants}
            onTranscriptionComplete={handleTranscriptionComplete}
          />
        )}

        {currentStep === 'completed' && completedTranscriptionId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Meeting Minutes</h2>
                  <p className="text-gray-600">Generated from your meeting transcription</p>
                </div>
              </div>
              <button
                onClick={resetToSetup}
                className="btn-secondary px-4 py-2"
              >
                New Meeting
              </button>
            </div>

            <MeetingMinutesViewer
              transcriptionId={completedTranscriptionId}
              title={meetingTitle}
              onClose={resetToSetup}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}