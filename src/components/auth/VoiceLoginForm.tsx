'use client';

/**
 * Voice-Based Login System
 * Alternative authentication method using voice biometrics
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/cards/card';
import { Alert, AlertDescription } from '@/components/atoms/feedback/alert';
import { Badge } from '@/components/atoms/display/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { Input } from '@/components/atoms/form/input';
import { Label } from '@/features/shared/ui/label';
import { 
  Shield, 
  ShieldCheck, 
  Mic, 
  Key, 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Volume2,
  Users,
  Lock
} from 'lucide-react';
import VoiceBiometricAuth from '@/components/organisms/features/VoiceBiometricAuth';
import { createBrowserClient } from '@supabase/ssr';
import { 
  VoiceAuthenticationResponse, 
  BiometricEnrollmentResponse, 
  FallbackOption,
  AuthenticationContext 
} from '@/types/voice-biometric';

interface VoiceLoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  allowEnrollment?: boolean;
  showFallback?: boolean;
  className?: string;
}

interface LoginState {
  mode: 'select' | 'voice_login' | 'voice_enroll' | 'fallback' | 'success' | 'enrollment-success';
  isLoading: boolean;
  error?: string;
  userEmail?: string;
  hasVoiceProfile: boolean;
  enrollmentProgress: number;
}

export default function VoiceLoginForm({
  onSuccess,
  onCancel,
  allowEnrollment = true,
  showFallback = true,
  className = ''
}: VoiceLoginFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
  );
  
  const [loginState, setLoginState] = useState<LoginState>({
    mode: 'select',
    isLoading: false,
    hasVoiceProfile: false,
    enrollmentProgress: 0
  });

  const [authContext] = useState<AuthenticationContext>({
    purpose: 'login',
    riskLevel: 'medium',
    deviceTrust: 'untrusted',
    userLocation: 'unknown'
  });

  // Check if user already has a voice profile
  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      setLoginState(prev => ({ ...prev, isLoading: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoginState(prev => ({ ...prev, mode: 'fallback', isLoading: false }));
        return;
      }

      // Check for existing voice biometric profile
      const response = await fetch('/api/voice/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'get_profile' })
      });

      const result = await response.json();
      
      setLoginState(prev => ({
        ...prev,
        hasVoiceProfile: result.success && result.profile?.enrollmentComplete,
        userEmail: user.email || '',
        isLoading: false,
        mode: result.success && result.profile?.enrollmentComplete ? 'select' : 'voice_enroll'
      }));

    } catch (error) {
      console.error('Error checking voice profile:', error);
      setLoginState(prev => ({
        ...prev,
        hasVoiceProfile: false,
        isLoading: false,
        error: 'Unable to check voice profile status'
      }));
    }
  };

  const handleVoiceAuthSuccess = async (result: VoiceAuthenticationResponse | BiometricEnrollmentResponse) => {
    // Check if this is an authentication response
    if ('confidence' in result && 'authenticationId' in result) {
      const authResult = result as VoiceAuthenticationResponse;
      try {
        if (authResult.success && authResult.confidence >= 80) {
        // Create voice auth session
        const sessionResponse = await fetch('/api/auth/voice-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authenticationId: authResult.authenticationId,
            confidence: authResult.confidence,
            riskAssessment: authResult.securityAssessment,
            deviceFingerprint: navigator.userAgent
          })
        });

        if (sessionResponse.ok) {
          setLoginState(prev => ({ ...prev, mode: 'success' }));
          
          // Trigger success callback or redirect
          setTimeout(() => {
            onSuccess?.() || router.push('/dashboard');
          }, 2000);
        } else {
          throw new Error('Failed to create voice session');
        }
      } else {
        setLoginState(prev => ({
          ...prev,
          error: 'Voice authentication failed. Please try again or use an alternative method.',
          mode: 'select'
        }));
      }
    } catch (error) {
      console.error('Voice auth success handler error:', error);
      setLoginState(prev => ({
        ...prev,
        error: 'Authentication processing failed',
        mode: 'select'
      }));
    }
    } else {
      // Handle enrollment response
      const enrollResult = result as BiometricEnrollmentResponse;
      if (enrollResult.success) {
        setLoginState(prev => ({
          ...prev,
          mode: 'success'
        }));
      }
    }
  };

  const handleEnrollmentSuccess = (result: VoiceAuthenticationResponse | BiometricEnrollmentResponse) => {
    const enrollResult = result as BiometricEnrollmentResponse;
    if (enrollResult.success) {
      setLoginState(prev => ({
        ...prev,
        enrollmentProgress: enrollResult.progress
      }));

      if (enrollResult.enrollmentComplete) {
        setLoginState(prev => ({
          ...prev,
          hasVoiceProfile: true,
          mode: 'select'
        }));
      }
    }
  };

  const handleVoiceError = (error: string) => {
    setLoginState(prev => ({
      ...prev,
      error,
      mode: 'select'
    }));
  };

  const handleFallback = (option: FallbackOption) => {
    if (option.method === 'password') {
      setLoginState(prev => ({ ...prev, mode: 'fallback' }));
    }
    // Handle other fallback methods as needed
  };

  const handleTraditionalLogin = async (email: string, password: string) => {
    try {
      setLoginState(prev => ({ ...prev, isLoading: true }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      onSuccess?.() || router.push('/dashboard');

    } catch (error: unknown) {
      setLoginState(prev => ({
        ...prev,
        error: error.message || 'Login failed',
        isLoading: false
      }));
    }
  };

  const renderModeSelector = () => {
    if (loginState.mode !== 'select') return null;

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome to BoardGuru</h2>
          <p className="text-gray-600">Choose your preferred authentication method</p>
        </div>

        {loginState.hasVoiceProfile && (
          <Button
            onClick={() => setLoginState(prev => ({ ...prev, mode: 'voice_login' }))}
            className="w-full h-16 text-lg"
            variant="default"
          >
            <Shield className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Voice Authentication</div>
              <div className="text-sm opacity-80">Secure biometric login</div>
            </div>
          </Button>
        )}

        {!loginState.hasVoiceProfile && allowEnrollment && (
          <Button
            onClick={() => setLoginState(prev => ({ ...prev, mode: 'voice_enroll' }))}
            className="w-full h-16 text-lg"
            variant="outline"
          >
            <Mic className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Set Up Voice Login</div>
              <div className="text-sm opacity-70">Enable biometric authentication</div>
            </div>
          </Button>
        )}

        {showFallback && (
          <Button
            onClick={() => setLoginState(prev => ({ ...prev, mode: 'fallback' }))}
            className="w-full h-16 text-lg"
            variant="outline"
          >
            <Key className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Password Login</div>
              <div className="text-sm opacity-70">Traditional authentication</div>
            </div>
          </Button>
        )}

        {loginState.hasVoiceProfile && (
          <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Voice profile enrolled and active</span>
          </div>
        )}
      </div>
    );
  };

  const renderVoiceLogin = () => {
    if (loginState.mode !== 'voice_login') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLoginState(prev => ({ ...prev, mode: 'select' }))}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Secure Login
          </Badge>
        </div>

        <VoiceBiometricAuth
          mode="authentication"
          context={authContext}
          onSuccess={handleVoiceAuthSuccess}
          onError={handleVoiceError}
          onFallback={handleFallback}
          showVisualFeedback={true}
          enableFraudDetection={true}
          autoStart={true}
        />

        <div className="text-center text-sm text-gray-600">
          <p>Speak naturally to authenticate your identity</p>
          <p className="mt-2">Your voice pattern will be securely verified</p>
        </div>
      </div>
    );
  };

  const renderVoiceEnrollment = () => {
    if (loginState.mode !== 'voice_enroll') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLoginState(prev => ({ ...prev, mode: 'select' }))}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="outline">
            <Volume2 className="h-3 w-3 mr-1" />
            Voice Setup
          </Badge>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Set up voice authentication for secure, passwordless login to your BoardGuru account.
            Your voice pattern will be encrypted and stored securely.
          </AlertDescription>
        </Alert>

        <VoiceBiometricAuth
          mode="enrollment"
          onSuccess={handleEnrollmentSuccess}
          onError={handleVoiceError}
          showVisualFeedback={true}
        />

        <div className="text-center text-sm text-gray-600">
          <p>Complete voice enrollment to enable biometric authentication</p>
          <p className="mt-1">This will only take a few minutes</p>
        </div>
      </div>
    );
  };

  const renderFallbackLogin = () => {
    if (loginState.mode !== 'fallback') return null;

    return (
      <TraditionalLoginForm
        onSubmit={handleTraditionalLogin}
        onBack={() => setLoginState(prev => ({ ...prev, mode: 'select' }))}
        isLoading={loginState.isLoading}
        {...(loginState.error && { error: loginState.error })}
      />
    );
  };

  const renderSuccessState = () => {
    if (loginState.mode !== 'success') return null;

    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-green-800">Authentication Successful</h3>
          <p className="text-green-600 mt-2">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span>BoardGuru Authentication</span>
        </CardTitle>
        <CardDescription>
          Secure access to your board management platform
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loginState.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{loginState.error}</AlertDescription>
          </Alert>
        )}

        {loginState.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {renderModeSelector()}
            {renderVoiceLogin()}
            {renderVoiceEnrollment()}
            {renderFallbackLogin()}
            {renderSuccessState()}
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
          <p>Protected by enterprise-grade voice biometric security</p>
          <div className="flex justify-center items-center space-x-4 mt-2">
            <span className="flex items-center">
              <Lock className="h-3 w-3 mr-1" />
              Encrypted
            </span>
            <span className="flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              GDPR Compliant
            </span>
            <span className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              Enterprise Ready
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Traditional Login Form Component
 */
interface TraditionalLoginFormProps {
  onSubmit: (email: string, password: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}

function TraditionalLoginForm({ onSubmit, onBack, isLoading, error }: TraditionalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} type="button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Badge variant="outline">
          <Key className="h-3 w-3 mr-1" />
          Password Login
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!email || !password || isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Enter your email and password to access your account</p>
      </div>
    </form>
  );
}