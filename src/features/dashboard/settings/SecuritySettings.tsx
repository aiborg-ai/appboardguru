'use client'

import React, { useState } from 'react'
import {
  Shield,
  Key,
  Smartphone,
  Laptop,
  Globe,
  AlertTriangle,
  Check,
  X,
  QrCode,
  Fingerprint,
  CreditCard,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

interface AuthMethod {
  id: string
  name: string
  description: string
  enabled: boolean
  icon: React.ComponentType<any>
  status: 'active' | 'inactive' | 'pending'
}

interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
  trusted: boolean
}

export function SecuritySettings() {
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([
    {
      id: 'password',
      name: 'Password',
      description: 'Strong password with complexity requirements',
      enabled: true,
      icon: Key,
      status: 'active'
    },
    {
      id: 'sms',
      name: 'SMS Authentication',
      description: 'Text message verification codes',
      enabled: true,
      icon: Smartphone,
      status: 'active'
    },
    {
      id: 'authenticator',
      name: 'Authenticator App',
      description: 'Google Authenticator, Microsoft Authenticator',
      enabled: true,
      icon: QrCode,
      status: 'active'
    },
    {
      id: 'biometric',
      name: 'Biometric Authentication',
      description: 'Fingerprint or facial recognition',
      enabled: false,
      icon: Fingerprint,
      status: 'inactive'
    },
    {
      id: 'hardware',
      name: 'Hardware Security Key',
      description: 'FIDO2/WebAuthn compatible security keys',
      enabled: false,
      icon: CreditCard,
      status: 'inactive'
    }
  ])

  const [activeSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      device: 'Chrome on Windows (Current)',
      location: 'New York, NY, USA',
      lastActive: '2 minutes ago',
      current: true,
      trusted: true
    },
    {
      id: '2',
      device: 'iPhone 14 Pro',
      location: 'New York, NY, USA',
      lastActive: '1 hour ago',
      current: false,
      trusted: true
    },
    {
      id: '3',
      device: 'Safari on MacBook Pro',
      location: 'New York, NY, USA',
      lastActive: '3 hours ago',
      current: false,
      trusted: true
    },
    {
      id: '4',
      device: 'Chrome on Android',
      location: 'Boston, MA, USA',
      lastActive: '2 days ago',
      current: false,
      trusted: false
    }
  ])

  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  const backupCodes = [
    '1a2b-3c4d-5e6f',
    '7g8h-9i0j-1k2l',
    '3m4n-5o6p-7q8r',
    '9s0t-1u2v-3w4x',
    '5y6z-7a8b-9c0d'
  ]

  const toggleAuthMethod = (methodId: string) => {
    setAuthMethods(prev => 
      prev.map(method => 
        method.id === methodId 
          ? { ...method, enabled: !method.enabled, status: !method.enabled ? 'active' : 'inactive' }
          : method
      )
    )
  }

  const revokeSession = (sessionId: string) => {
    // Handle session revocation
    console.log('Revoking session:', sessionId)
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Security Status</h3>
              <p className="text-green-700">Your account has excellent security</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">98%</div>
            <div className="text-sm text-green-700">Security Score</div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="text-sm">Multi-factor authentication enabled</span>
          </div>
          <div className="flex items-center space-x-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="text-sm">Strong password policy</span>
          </div>
          <div className="flex items-center space-x-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="text-sm">Trusted devices registered</span>
          </div>
        </div>
      </div>

      {/* Password Security */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Password Security</h3>
            </div>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Change Password
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Last Password Change</div>
                <div className="text-sm text-gray-600">3 months ago</div>
              </div>
              <div className="text-green-600">
                <Check className="h-5 w-5" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-1">Password Strength</div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                  <span className="text-sm text-green-600 font-medium">Strong</span>
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-1">Password Policy</div>
                <div className="text-sm text-gray-600">
                  ✓ 12+ characters ✓ Mixed case ✓ Numbers ✓ Symbols
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Factor Authentication */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Multi-Factor Authentication</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {authMethods.map(method => {
              const Icon = method.icon
              return (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      method.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{method.name}</div>
                      <div className="text-sm text-gray-600">{method.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      method.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {method.status}
                    </div>
                    <button
                      onClick={() => toggleAuthMethod(method.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        method.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          method.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Backup Codes */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="font-medium text-amber-900">Backup Codes</h4>
              </div>
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="text-amber-700 hover:text-amber-800"
              >
                {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-sm text-amber-800 mb-3">
              Use these codes if you lose access to your authentication methods
            </p>
            
            {showBackupCodes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    {code}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-3 flex space-x-2">
              <button className="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200">
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Generate New Codes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Laptop className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
            </div>
            <button className="text-red-600 hover:text-red-700 text-sm font-medium">
              Sign Out All Sessions
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {activeSessions.map(session => (
              <div key={session.id} className={`p-4 border rounded-lg ${
                session.current ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      session.current ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {session.device.includes('iPhone') || session.device.includes('Android') ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Laptop className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{session.device}</div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{session.lastActive}</span>
                        </div>
                        {session.trusted && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <Check className="h-3 w-3" />
                            <span>Trusted</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!session.current && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Preferences */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Security Preferences</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Session Timeout</div>
                <div className="text-sm text-gray-600">Automatically sign out after inactivity</div>
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg">
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Login Notifications</div>
                <div className="text-sm text-gray-600">Email alerts for new sign-ins</div>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Suspicious Activity Alerts</div>
                <div className="text-sm text-gray-600">Immediate notifications for unusual access</div>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}