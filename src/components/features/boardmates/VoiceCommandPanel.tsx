'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Command,
  Sparkles,
  Brain,
  Activity,
  Settings,
  HelpCircle
} from 'lucide-react'
import { voiceCommandService } from '@/lib/services/voice-command.service'
import { cn } from '@/lib/utils'

interface VoiceCommandPanelProps {
  userId: string
  onMemberAdd?: (memberData: { memberName: string; email?: string; role: string }) => void
  onSearch?: (searchTerm: string) => void
  onAnalyticsQuery?: (query: string) => void
  className?: string
}

interface VoiceActivity {
  id: string
  command: string
  status: 'processing' | 'completed' | 'failed'
  timestamp: Date
  confidence: number
  biometricMatch?: number
}

export function VoiceCommandPanel({
  userId,
  onMemberAdd,
  onSearch,
  onAnalyticsQuery,
  className
}: VoiceCommandPanelProps) {
  const [isListening, setIsListening] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivity[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [biometricStatus, setBiometricStatus] = useState<'none' | 'verifying' | 'verified' | 'failed'>('none')
  const [showHelp, setShowHelp] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt')

  // Check microphone permissions on component mount
  useEffect(() => {
    checkMicrophonePermissions()
  }, [])

  // Set up voice command event listeners
  useEffect(() => {
    const handleAddMember = (event: CustomEvent) => {
      const { memberName, email, role, commandId, confidence } = event.detail
      
      // Add to activity feed
      const activity: VoiceActivity = {
        id: commandId,
        command: `Add ${memberName} as ${role}`,
        status: 'completed',
        timestamp: new Date(),
        confidence
      }
      
      setVoiceActivity(prev => [activity, ...prev.slice(0, 9)]) // Keep last 10
      
      // Trigger parent callback
      onMemberAdd?.({ memberName, email, role })
    }

    const handleSearch = (event: CustomEvent) => {
      const { searchTerm, commandId } = event.detail
      
      const activity: VoiceActivity = {
        id: commandId,
        command: `Search: ${searchTerm}`,
        status: 'completed',
        timestamp: new Date(),
        confidence: 0.9
      }
      
      setVoiceActivity(prev => [activity, ...prev.slice(0, 9)])
      onSearch?.(searchTerm)
    }

    const handleAnalytics = (event: CustomEvent) => {
      const { query, commandId } = event.detail
      
      const activity: VoiceActivity = {
        id: commandId,
        command: `Analytics: ${query}`,
        status: 'completed',
        timestamp: new Date(),
        confidence: 0.9
      }
      
      setVoiceActivity(prev => [activity, ...prev.slice(0, 9)])
      onAnalyticsQuery?.(query)
    }

    // Add event listeners
    window.addEventListener('voiceCommandAddMember', handleAddMember as EventListener)
    window.addEventListener('voiceCommandSearch', handleSearch as EventListener)
    window.addEventListener('voiceCommandAnalytics', handleAnalytics as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('voiceCommandAddMember', handleAddMember as EventListener)
      window.removeEventListener('voiceCommandSearch', handleSearch as EventListener)
      window.removeEventListener('voiceCommandAnalytics', handleAnalytics as EventListener)
    }
  }, [onMemberAdd, onSearch, onAnalyticsQuery])

  const checkMicrophonePermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setPermissionStatus(result.state)
      
      result.onchange = () => {
        setPermissionStatus(result.state)
      }
    } catch (error) {
      console.warn('Permission API not supported:', error)
    }
  }

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Release immediately
      setPermissionStatus('granted')
      setIsEnabled(true)
    } catch (error) {
      console.error('Microphone access denied:', error)
      setPermissionStatus('denied')
    }
  }

  const startListening = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      await requestMicrophoneAccess()
      return
    }

    try {
      setIsListening(true)
      setBiometricStatus('verifying')
      
      await voiceCommandService.startListening(userId)
      
      // Simulate biometric verification (in real app, this would be automatic)
      setTimeout(() => {
        setBiometricStatus('verified')
      }, 2000)
      
      // Simulate audio level monitoring
      const interval = setInterval(() => {
        if (voiceCommandService.isCurrentlyListening()) {
          setAudioLevel(Math.random() * 100)
        } else {
          clearInterval(interval)
          setAudioLevel(0)
        }
      }, 100)
      
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      setIsListening(false)
      setBiometricStatus('failed')
    }
  }, [userId, permissionStatus])

  const stopListening = useCallback(() => {
    voiceCommandService.stopListening()
    setIsListening(false)
    setBiometricStatus('none')
    setAudioLevel(0)
    setCurrentTranscript('')
  }, [])

  const getStatusColor = (status: VoiceActivity['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getBiometricStatusIcon = () => {
    switch (biometricStatus) {
      case 'verifying':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Mic className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-lg font-semibold">Voice Commands</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-500 hover:text-gray-700"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permissionStatus !== 'granted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Microphone Access Required
              </span>
            </div>
            <p className="text-xs text-yellow-700 mb-3">
              Enable voice commands for hands-free board management
            </p>
            <Button
              size="sm"
              onClick={requestMicrophoneAccess}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Enable Microphone
            </Button>
          </div>
        )}

        {/* Voice Control Panel */}
        {permissionStatus === 'granted' && (
          <div className="space-y-4">
            {/* Main Control */}
            <div className="flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "h-16 w-16 rounded-full",
                    isListening
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  )}
                  disabled={!isEnabled && permissionStatus !== 'granted'}
                >
                  {isListening ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-3">
              {/* Listening Status */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isListening ? "bg-red-500 animate-pulse" : "bg-gray-300"
                  )} />
                  <span className="text-xs font-medium text-gray-700">
                    {isListening ? 'Listening' : 'Standby'}
                  </span>
                </div>
                {isListening && audioLevel > 0 && (
                  <Progress value={audioLevel} className="h-1" />
                )}
              </div>

              {/* Biometric Status */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  {getBiometricStatusIcon()}
                  <span className="text-xs font-medium text-gray-700">
                    {biometricStatus === 'verified' ? 'Verified' :
                     biometricStatus === 'verifying' ? 'Verifying' :
                     biometricStatus === 'failed' ? 'Failed' : 'Security'}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Transcript */}
            {currentTranscript && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Processing</span>
                </div>
                <p className="text-sm text-blue-700">{currentTranscript}</p>
              </div>
            )}

            <Separator />

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Commands
              </h4>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {voiceActivity.length > 0 ? (
                  voiceActivity.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {activity.command}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.timestamp.toLocaleTimeString()} 
                          {activity.confidence && ` • ${Math.round(activity.confidence * 100)}%`}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getStatusColor(activity.status))}
                      >
                        {activity.status}
                      </Badge>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Command className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs">No commands yet</p>
                    <p className="text-xs">Try saying "Add John as admin"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Voice Commands
                </h4>
                
                <div className="space-y-2">
                  {voiceCommandService.getVoiceCommandsHelp().map((help, index) => (
                    <div key={index} className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-medium text-gray-700">{help.command}</p>
                      <p className="text-xs text-gray-500 italic">"{help.example}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}