'use client'

import React, { useState } from 'react'
import {
  Eye,
  Smartphone,
  Key,
  Shield,
  MapPin,
  Clock,
  Laptop,
  Monitor,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Fingerprint,
  CreditCard,
  Globe,
  Zap
} from 'lucide-react'
import type { 
  SecurityTabProps,
  UserSession,
  AuthenticationMethod,
  LoginAttempt,
  SecurityLoadingState 
} from '@/types/security-types'

interface AuthMethodCardProps {
  method: AuthenticationMethod
  onToggle: (methodId: string) => void
  onSetup: (methodId: string) => void
}

function AuthMethodCard({ method, onToggle, onSetup }: AuthMethodCardProps) {
  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'password':
        return Key
      case 'sms':
        return Smartphone
      case 'totp':
        return QrCode
      case 'webauthn':
        return CreditCard
      case 'biometric':
        return Fingerprint
      default:
        return Shield
    }
  }

  const Icon = getMethodIcon(method.type)

  return (
    <div className={`p-4 rounded-lg border ${
      method.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            method.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">{method.name}</h4>
            <p className="text-xs text-gray-600">{method.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {method.is_primary && (
            <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
              Primary
            </span>
          )}
          <button
            onClick={() => onToggle(method.id)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              method.enabled ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                method.enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <div>Setup: {new Date(method.setup_date).toLocaleDateString()}</div>
        {method.last_used && (
          <div>Last used: {new Date(method.last_used).toLocaleDateString()}</div>
        )}
        {method.backup_codes_count && (
          <div>Backup codes: {method.backup_codes_count} available</div>
        )}
      </div>
      
      {!method.enabled && (
        <button
          onClick={() => onSetup(method.id)}
          className="mt-3 w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Set Up {method.name}
        </button>
      )}
    </div>
  )
}

interface SessionCardProps {
  session: UserSession
  onTerminate: (sessionId: string) => void
}

function SessionCard({ session, onTerminate }: SessionCardProps) {
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone
      case 'tablet':
        return Smartphone
      case 'desktop':
        return Monitor
      default:
        return Laptop
    }
  }

  const Icon = getDeviceIcon(session.device_info.device_type)

  return (
    <div className={`p-4 rounded-lg border ${
      session.is_current ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            session.is_current ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {session.device_info.device_name}
              </h4>
              {session.is_current && (
                <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                  Current
                </span>
              )}
              {session.is_trusted && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              <div>{session.device_info.browser} on {session.device_info.os}</div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{session.location.city}, {session.location.country}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(session.last_activity).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-gray-500">
                IP: {session.ip_address} • {session.login_method}
              </div>
            </div>
          </div>
        </div>
        
        {!session.is_current && (
          <button
            onClick={() => onTerminate(session.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface LoginAttemptItemProps {
  attempt: LoginAttempt
}

function LoginAttemptItem({ attempt }: LoginAttemptItemProps) {
  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'text-red-600 bg-red-50 border-red-200'
    if (riskScore >= 60) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (riskScore >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${attempt.success ? 'bg-green-100' : 'bg-red-100'}`}>
          {attempt.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
        </div>
        
        <div>
          <div className="text-sm font-medium text-gray-900">
            {attempt.success ? 'Successful Login' : 'Failed Login'}
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>{new Date(attempt.timestamp).toLocaleString()}</div>
            <div className="flex items-center space-x-3">
              <span>{attempt.location.city}, {attempt.location.country}</span>
              <span>IP: {attempt.ip_address}</span>
              {attempt.attempt_number > 1 && (
                <span>Attempt #{attempt.attempt_number}</span>
              )}
            </div>
            {!attempt.success && attempt.failure_reason && (
              <div className="text-red-600">Reason: {attempt.failure_reason}</div>
            )}
          </div>
        </div>
      </div>
      
      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(attempt.risk_score)}`}>
        Risk: {attempt.risk_score}
      </div>
    </div>
  )
}

export function AccessManagement({ accountType, userId, organizationId }: SecurityTabProps) {
  const [authMethods, setAuthMethods] = useState<SecurityLoadingState<AuthenticationMethod[]>>({
    status: 'idle'
  })
  const [sessions, setSessions] = useState<SecurityLoadingState<UserSession[]>>({
    status: 'idle'
  })
  const [loginAttempts, setLoginAttempts] = useState<SecurityLoadingState<LoginAttempt[]>>({
    status: 'idle'
  })

  // Mock data - in production these would come from API calls
  const mockAuthMethods: AuthenticationMethod[] = [
    {
      id: '1',
      type: 'password',
      name: 'Password',
      description: 'Strong password with complexity requirements',
      enabled: true,
      is_primary: true,
      setup_date: '2024-01-15',
      last_used: '2024-01-22'
    },
    {
      id: '2',
      type: 'totp',
      name: 'Authenticator App',
      description: 'Time-based one-time passwords (TOTP)',
      enabled: true,
      is_primary: false,
      setup_date: '2024-01-16',
      last_used: '2024-01-22',
      backup_codes_count: 8
    },
    {
      id: '3',
      type: 'sms',
      name: 'SMS Verification',
      description: 'Text message verification codes',
      enabled: false,
      is_primary: false,
      setup_date: '2024-01-15'
    },
    {
      id: '4',
      type: 'webauthn',
      name: 'Security Key',
      description: 'Hardware security key (WebAuthn/FIDO2)',
      enabled: false,
      is_primary: false,
      setup_date: '2024-01-15'
    }
  ]

  const mockSessions: UserSession[] = [
    {
      id: 'session1' as any,
      user_id: userId,
      device_info: {
        device_id: 'device1',
        device_name: 'MacBook Pro',
        device_type: 'desktop',
        os: 'macOS 14.2',
        os_version: '14.2',
        browser: 'Chrome',
        browser_version: '120.0',
        is_trusted: true
      },
      location: {
        country: 'United States',
        region: 'New York',
        city: 'New York',
        timezone: 'America/New_York'
      },
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      last_activity: new Date().toISOString(),
      is_current: true,
      is_trusted: true,
      session_duration: 7200,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      login_method: 'password + totp'
    },
    {
      id: 'session2' as any,
      user_id: userId,
      device_info: {
        device_id: 'device2',
        device_name: 'iPhone 15 Pro',
        device_type: 'mobile',
        os: 'iOS 17.2',
        os_version: '17.2',
        browser: 'Safari',
        browser_version: '17.2',
        is_trusted: true
      },
      location: {
        country: 'United States',
        region: 'New York',
        city: 'New York',
        timezone: 'America/New_York'
      },
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      is_current: false,
      is_trusted: true,
      session_duration: 18000,
      ip_address: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
      login_method: 'biometric'
    }
  ]

  const mockLoginAttempts: LoginAttempt[] = [
    {
      id: '1',
      email: 'user@example.com',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      location: {
        country: 'United States',
        region: 'New York',
        city: 'New York'
      },
      success: true,
      timestamp: new Date().toISOString(),
      risk_score: 15,
      is_blocked: false,
      attempt_number: 1
    },
    {
      id: '2',
      email: 'user@example.com',
      ip_address: '203.0.113.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: {
        country: 'Russia',
        region: 'Moscow',
        city: 'Moscow',
        is_suspicious: true
      },
      success: false,
      failure_reason: 'Invalid password',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      risk_score: 85,
      is_blocked: true,
      attempt_number: 3
    }
  ]

  React.useEffect(() => {
    // Simulate loading
    setAuthMethods({ status: 'loading' })
    setSessions({ status: 'loading' })
    setLoginAttempts({ status: 'loading' })

    setTimeout(() => {
      setAuthMethods({ status: 'success', data: mockAuthMethods })
      setSessions({ status: 'success', data: mockSessions })
      setLoginAttempts({ status: 'success', data: mockLoginAttempts })
    }, 1000)
  }, [userId])

  const handleToggleAuthMethod = (methodId: string) => {
    if (authMethods.status === 'success') {
      const updated = authMethods.data.map(method =>
        method.id === methodId ? { ...method, enabled: !method.enabled } : method
      )
      setAuthMethods({ status: 'success', data: updated })
    }
  }

  const handleSetupAuthMethod = (methodId: string) => {
    console.log('Setup auth method:', methodId)
    // In production, this would redirect to setup flow
  }

  const handleTerminateSession = (sessionId: string) => {
    if (sessions.status === 'success') {
      const updated = sessions.data.filter(session => session.id !== sessionId)
      setSessions({ status: 'success', data: updated })
    }
  }

  const handleTerminateAllSessions = () => {
    if (sessions.status === 'success') {
      const currentSession = sessions.data.find(s => s.is_current)
      setSessions({ status: 'success', data: currentSession ? [currentSession] : [] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Eye className="h-6 w-6 text-green-600" />
            <span>Access Management</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Authentication methods, active sessions, and login security
          </p>
        </div>
      </div>

      {/* Authentication Methods */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Authentication Methods</h3>
          {authMethods.status === 'success' && (
            <span className="text-sm text-gray-500">
              {authMethods.data.filter(m => m.enabled).length} of {authMethods.data.length} enabled
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authMethods.status === 'loading' && (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-300 rounded w-3/4" />
                      <div className="h-3 bg-gray-300 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {authMethods.status === 'success' && authMethods.data.map(method => (
            <AuthMethodCard
              key={method.id}
              method={method}
              onToggle={handleToggleAuthMethod}
              onSetup={handleSetupAuthMethod}
            />
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
          <div className="flex items-center space-x-2">
            {sessions.status === 'success' && (
              <span className="text-sm text-gray-500">
                {sessions.data.length} active session{sessions.data.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleTerminateAllSessions}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              Terminate All
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {sessions.status === 'loading' && (
            <>
              {[1, 2].map(i => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/2" />
                      <div className="h-3 bg-gray-300 rounded w-3/4" />
                      <div className="h-3 bg-gray-300 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {sessions.status === 'success' && sessions.data.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onTerminate={handleTerminateSession}
            />
          ))}
        </div>
      </div>

      {/* Recent Login Attempts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Login Attempts</h3>
          {loginAttempts.status === 'success' && (
            <span className="text-sm text-gray-500">
              Last 24 hours
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {loginAttempts.status === 'loading' && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/3" />
                      <div className="h-3 bg-gray-300 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {loginAttempts.status === 'success' && loginAttempts.data.map(attempt => (
            <LoginAttemptItem key={attempt.id} attempt={attempt} />
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Security Recommendations</h4>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              {authMethods.status === 'success' && !authMethods.data.find(m => m.type === 'totp' && m.enabled) && (
                <li>• Enable authenticator app for stronger two-factor authentication</li>
              )}
              {authMethods.status === 'success' && !authMethods.data.find(m => m.type === 'webauthn' && m.enabled) && (
                <li>• Consider setting up a hardware security key for maximum protection</li>
              )}
              <li>• Regularly review and terminate unused sessions</li>
              <li>• Monitor login attempts from unfamiliar locations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}