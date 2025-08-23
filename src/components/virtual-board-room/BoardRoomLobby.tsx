/**
 * Board Room Lobby Component
 * Pre-meeting security verification and device setup
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, VideoOff, Mic, MicOff, Camera, Settings,
  Shield, CheckCircle, XCircle, AlertTriangle,
  Smartphone, Phone, Laptop, User, Crown,
  Clock, Users, Lock, Unlock, Eye, EyeOff,
  Loader2, ArrowRight, Info
} from 'lucide-react';

interface MFAChallenge {
  id: string;
  method: 'sms' | 'email' | 'totp' | 'push' | 'biometric' | 'hardware_key';
  challengeCode?: string;
  expiresAt: Date;
}

interface DeviceAttestation {
  trustLevel: 'basic' | 'verified' | 'high_trust' | 'enterprise';
  securityFeatures: {
    secureBootEnabled: boolean;
    tpmAvailable: boolean;
    biometricCapable: boolean;
    hardwareKeystore: boolean;
  };
  riskAssessment: {
    isJailbroken: boolean;
    hasRootAccess: boolean;
    developmentModeEnabled: boolean;
  };
}

interface NetworkSecurity {
  riskScore: number;
  vpnDetected: boolean;
  proxyDetected: boolean;
  threatIntelligence: {
    isMalicious: boolean;
    reputationScore: number;
  };
  geolocation: {
    country: string;
    region: string;
    city: string;
  };
}

interface BoardRoomLobbyProps {
  sessionId: string;
  sessionName: string;
  scheduledStart: Date;
  securityLevel: 'standard' | 'high' | 'maximum';
  requireMFA: boolean;
  requireDeviceAttestation: boolean;
  onJoinSuccess: (sessionData: any) => void;
  onCancel: () => void;
}

const BoardRoomLobby: React.FC<BoardRoomLobbyProps> = ({
  sessionId,
  sessionName,
  scheduledStart,
  securityLevel,
  requireMFA,
  requireDeviceAttestation,
  onJoinSuccess,
  onCancel
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<'setup' | 'security' | 'verification' | 'joining'>('setup');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  
  // Security state
  const [mfaChallenge, setMfaChallenge] = useState<MFAChallenge | null>(null);
  const [mfaResponse, setMfaResponse] = useState('');
  const [deviceAttestation, setDeviceAttestation] = useState<DeviceAttestation | null>(null);
  const [networkSecurity, setNetworkSecurity] = useState<NetworkSecurity | null>(null);
  const [securityChecks, setSecurityChecks] = useState({
    deviceTrust: false,
    networkSecurity: false,
    mfaVerified: false,
    identityVerified: false
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canJoinEarly, setCanJoinEarly] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize component
  useEffect(() => {
    initializeDevices();
    checkEarlyJoinEligibility();
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = scheduledStart.getTime() - now.getTime();
      setTimeUntilStart(Math.max(0, difference));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scheduledStart]);

  const initializeDevices = async () => {
    try {
      // Get device permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDeviceList = devices.filter(device => device.kind === 'videoinput');
      const audioDeviceList = devices.filter(device => device.kind === 'audioinput');
      
      setVideoDevices(videoDeviceList);
      setAudioDevices(audioDeviceList);
      
      if (videoDeviceList.length > 0) {
        setSelectedVideoDevice(videoDeviceList[0].deviceId);
      }
      
      if (audioDeviceList.length > 0) {
        setSelectedAudioDevice(audioDeviceList[0].deviceId);
      }

    } catch (error) {
      console.error('Failed to initialize devices:', error);
      setError('Unable to access camera and microphone. Please check permissions.');
    }
  };

  const checkEarlyJoinEligibility = () => {
    const now = new Date();
    const earlyJoinWindow = 15 * 60 * 1000; // 15 minutes
    const canJoin = (scheduledStart.getTime() - now.getTime()) <= earlyJoinWindow;
    setCanJoinEarly(canJoin);
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const switchVideoDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: { deviceId: { exact: selectedAudioDevice } }
      });

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      setLocalStream(newStream);
      setSelectedVideoDevice(deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Failed to switch video device:', error);
      setError('Failed to switch camera. Please try again.');
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedVideoDevice } },
        audio: { deviceId: { exact: deviceId } }
      });

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      setLocalStream(newStream);
      setSelectedAudioDevice(deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Failed to switch audio device:', error);
      setError('Failed to switch microphone. Please try again.');
    }
  };

  const runSecurityChecks = async () => {
    setCurrentStep('security');
    setIsLoading(true);

    try {
      // Generate device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();
      
      // Collect device information
      const deviceInfo = {
        deviceName: `${navigator.platform} Device`,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' as const,
        operatingSystem: navigator.platform,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled
        }
      };

      // Check device trust if required
      if (requireDeviceAttestation) {
        const attestResponse = await fetch(`/api/virtual-board-room/${sessionId}/attest-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            deviceInfo,
            deviceFingerprint
          })
        });

        if (attestResponse.ok) {
          const attestData = await attestResponse.json();
          setDeviceAttestation(attestData.deviceAttestation);
          setSecurityChecks(prev => ({ ...prev, deviceTrust: true }));
        } else {
          throw new Error('Device attestation failed');
        }
      } else {
        setSecurityChecks(prev => ({ ...prev, deviceTrust: true }));
      }

      // Network security check
      const networkResponse = await fetch(`/api/virtual-board-room/${sessionId}/network-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        setNetworkSecurity(networkData.networkSecurity);
        setSecurityChecks(prev => ({ 
          ...prev, 
          networkSecurity: networkData.networkSecurity.riskScore < 50 
        }));
      }

      // MFA check if required
      if (requireMFA) {
        const mfaResponse = await fetch(`/api/virtual-board-room/${sessionId}/initiate-mfa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ deviceFingerprint })
        });

        if (mfaResponse.ok) {
          const mfaData = await mfaResponse.json();
          if (mfaData.requiresMFA) {
            setMfaChallenge(mfaData);
            setCurrentStep('verification');
          } else {
            setSecurityChecks(prev => ({ ...prev, mfaVerified: true }));
          }
        }
      } else {
        setSecurityChecks(prev => ({ ...prev, mfaVerified: true }));
      }

      setSecurityChecks(prev => ({ ...prev, identityVerified: true }));

    } catch (error) {
      console.error('Security checks failed:', error);
      setError('Security verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!mfaChallenge || !mfaResponse) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/virtual-board-room/verify-mfa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          challengeId: mfaChallenge.id,
          response: mfaResponse
        })
      });

      if (response.ok) {
        setSecurityChecks(prev => ({ ...prev, mfaVerified: true }));
        setMfaChallenge(null);
        setCurrentStep('security');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'MFA verification failed');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      setError('MFA verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = async () => {
    if (!canJoinEarly && timeUntilStart > 0) {
      setError('Session has not started yet');
      return;
    }

    const allChecksPass = Object.values(securityChecks).every(check => check);
    if (!allChecksPass) {
      setError('Please complete all security checks');
      return;
    }

    setCurrentStep('joining');
    setIsLoading(true);

    try {
      const deviceFingerprint = await generateDeviceFingerprint();
      
      const response = await fetch(`/api/virtual-board-room/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          deviceFingerprint,
          mfaChallengeId: mfaChallenge?.id,
          mfaResponse: mfaResponse || undefined,
          deviceInfo: {
            deviceName: `${navigator.platform} Device`,
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            operatingSystem: navigator.platform,
            browserInfo: {
              userAgent: navigator.userAgent,
              language: navigator.language
            }
          }
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        onJoinSuccess(sessionData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join session');
        setCurrentStep('security');
      }
    } catch (error) {
      console.error('Join session error:', error);
      setError('Failed to join session. Please try again.');
      setCurrentStep('security');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDeviceFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device fingerprint', 10, 50);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      timestamp: Date.now()
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fingerprint));
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      {/* Video preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-full ${
                isVideoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-full ${
                isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>

          <div className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
            Preview
          </div>
        </div>
      </div>

      {/* Device selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Camera
          </label>
          <select
            value={selectedVideoDevice}
            onChange={(e) => switchVideoDevice(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {videoDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Microphone
          </label>
          <select
            value={selectedAudioDevice}
            onChange={(e) => switchAudioDevice(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {audioDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecurityStep = () => (
    <div className="space-y-6">
      {/* Security level indicator */}
      <div className={`p-4 rounded-lg border ${
        securityLevel === 'maximum' ? 'bg-red-50 border-red-200' :
        securityLevel === 'high' ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-2">
          <Shield className={`h-5 w-5 ${
            securityLevel === 'maximum' ? 'text-red-600' :
            securityLevel === 'high' ? 'text-yellow-600' :
            'text-green-600'
          }`} />
          <span className={`font-medium ${
            securityLevel === 'maximum' ? 'text-red-800' :
            securityLevel === 'high' ? 'text-yellow-800' :
            'text-green-800'
          }`}>
            {securityLevel.charAt(0).toUpperCase() + securityLevel.slice(1)} Security Level
          </span>
        </div>
      </div>

      {/* Security checks */}
      <div className="space-y-4">
        <SecurityCheck
          title="Identity Verification"
          description="Verify your identity and access credentials"
          status={securityChecks.identityVerified}
          icon={<User className="h-5 w-5" />}
        />

        <SecurityCheck
          title="Device Trust"
          description="Verify your device meets security requirements"
          status={securityChecks.deviceTrust}
          icon={<Smartphone className="h-5 w-5" />}
          details={deviceAttestation && (
            <div className="mt-2 text-sm text-gray-600">
              <div>Trust Level: <span className="font-medium">{deviceAttestation.trustLevel}</span></div>
              <div>Security Score: {Math.round((
                (deviceAttestation.securityFeatures.secureBootEnabled ? 25 : 0) +
                (deviceAttestation.securityFeatures.tpmAvailable ? 25 : 0) +
                (deviceAttestation.securityFeatures.biometricCapable ? 25 : 0) +
                (deviceAttestation.securityFeatures.hardwareKeystore ? 25 : 0)
              ))}/100</div>
            </div>
          )}
        />

        <SecurityCheck
          title="Network Security"
          description="Verify network connection and location"
          status={securityChecks.networkSecurity}
          icon={<Lock className="h-5 w-5" />}
          details={networkSecurity && (
            <div className="mt-2 text-sm text-gray-600">
              <div>Risk Score: <span className="font-medium">{networkSecurity.riskScore}/100</span></div>
              <div>Location: {networkSecurity.geolocation.city}, {networkSecurity.geolocation.country}</div>
              {networkSecurity.vpnDetected && (
                <div className="text-yellow-600">⚠️ VPN detected</div>
              )}
            </div>
          )}
        />

        {requireMFA && (
          <SecurityCheck
            title="Multi-Factor Authentication"
            description="Complete additional security verification"
            status={securityChecks.mfaVerified}
            icon={<Shield className="h-5 w-5" />}
          />
        )}
      </div>

      {!isLoading && !Object.values(securityChecks).every(check => check) && (
        <button
          onClick={runSecurityChecks}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Shield className="h-5 w-5" />
          <span>Run Security Checks</span>
        </button>
      )}
    </div>
  );

  const renderVerificationStep = () => (
    <div className="space-y-6">
      {mfaChallenge && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-medium text-blue-900">Multi-Factor Authentication Required</h3>
              <p className="text-blue-700 text-sm mt-1">
                Please complete the {mfaChallenge.method} verification to continue.
              </p>
              
              {mfaChallenge.method === 'totp' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Enter your authenticator code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={mfaResponse}
                      onChange={(e) => setMfaResponse(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                    />
                    <button
                      onClick={verifyMFA}
                      disabled={mfaResponse.length !== 6 || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              )}

              {mfaChallenge.challengeCode && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-600">Challenge code:</p>
                  <p className="font-mono text-lg font-bold">{mfaChallenge.challengeCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderJoiningStep = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Joining Board Room</h3>
        <p className="text-gray-600">Please wait while we connect you to the session...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{sessionName}</h1>
              <p className="text-blue-100 text-sm">
                {scheduledStart.toLocaleDateString()} at {scheduledStart.toLocaleTimeString()}
              </p>
            </div>
            
            {timeUntilStart > 0 && (
              <div className="text-right">
                <div className="text-2xl font-mono font-bold">
                  {formatTimeRemaining(timeUntilStart)}
                </div>
                <div className="text-blue-100 text-sm">until start</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress indicators */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            {['setup', 'security', 'joining'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step ? 'bg-blue-600 text-white' :
                  ['setup', 'security'].slice(0, index).includes(currentStep) || 
                  (currentStep === 'joining' && index < 2) ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {['setup', 'security'].slice(0, index).includes(currentStep) || 
                   (currentStep === 'joining' && index < 2) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep === step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
                
                {index < 2 && (
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 'setup' && renderSetupStep()}
              {currentStep === 'security' && renderSecurityStep()}
              {currentStep === 'verification' && renderVerificationStep()}
              {currentStep === 'joining' && renderJoiningStep()}
            </motion.div>
          </AnimatePresence>

          {/* Error display */}
          {error && (
            <motion.div
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {currentStep === 'setup' && (
              <button
                onClick={() => setCurrentStep('security')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 'security' && Object.values(securityChecks).every(check => check) && (
              <button
                onClick={joinSession}
                disabled={!canJoinEarly && timeUntilStart > 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>Join Session</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper component for security checks
const SecurityCheck: React.FC<{
  title: string;
  description: string;
  status: boolean;
  icon: React.ReactNode;
  details?: React.ReactNode;
}> = ({ title, description, status, icon, details }) => (
  <div className={`p-4 rounded-lg border ${
    status ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
  }`}>
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-full ${
        status ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">{title}</h4>
          {status ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
        {details}
      </div>
    </div>
  </div>
);

export default BoardRoomLobby;