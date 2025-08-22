'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

const signinSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const otpSigninSchema = z.object({
  email: z.string().email('Valid email is required'),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP code must be exactly 6 digits'),
})

type SigninFormData = z.infer<typeof signinSchema>
type OtpSigninFormData = z.infer<typeof otpSigninSchema>

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [magicLinkMessage, setMagicLinkMessage] = useState('')
  
  // OTP mode state
  const [otpMode, setOtpMode] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema)
  })

  const onSubmit = async (data: SigninFormData) => {
    setIsSubmitting(true)
    setError('')

    try {
      // First check if user needs OTP mode
      const needsOtp = await handleEmailCheck(data.email)
      if (needsOtp) {
        setIsSubmitting(false)
        return // User will now see OTP form
      }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        // Always check if this user needs password setup when login fails
        console.log('Auth error:', authError.message)
        
        // Check if user exists and needs password setup
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('status, password_set, email')
          .eq('email', data.email)
          .single()

        console.log('User data check:', { userData, userError })

        // If user exists in users table and needs password setup
        if (userData && userData.status === 'approved' && userData.password_set === false) {
          setError('')
          setMagicLinkEmail(data.email)
          setMagicLinkMessage('✨ This account needs password setup. Your account is approved but you need to set up your password first.')
          setShowMagicLinkForm(true)
          return
        }

        // If user not found in users table, check registration_requests as fallback
        if (!userData || userError) {
          const { data: regData, error: regError } = await supabase
            .from('registration_requests')
            .select('status, email, full_name')
            .eq('email', data.email)
            .single()

          console.log('Registration data check:', { regData, regError })

          if (regData && regData.status === 'approved') {
            // User has approved registration but no user account yet
            setError('')
            setMagicLinkEmail(data.email)
            setMagicLinkMessage('✨ Your registration is approved! You need to set up your password to access your account.')
            setShowMagicLinkForm(true)
            return
          }
        }
        
        // If not a password setup case, show the original error
        throw new Error(authError.message)
      }

      if (authData.user) {
        // Check user status and role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('status, role, password_set')
          .eq('id', authData.user.id)
          .single()

        if (userError || !userData) {
          throw new Error('User profile not found')
        }

        if (userData.status !== 'approved') {
          await supabase.auth.signOut()
          throw new Error('Your account is pending approval or has been rejected')
        }

        // Check if user needs to complete password setup
        if (!userData.password_set) {
          await supabase.auth.signOut()
          setMagicLinkEmail(data.email)
          setMagicLinkMessage('✨ Please complete your password setup. Click below to get your setup link.')
          setShowMagicLinkForm(true)
          return
        }

        // Redirect based on role
        if (userData.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if user needs OTP mode
  const checkUserForOtpMode = async (email: string) => {
    try {
      // Check if user exists and needs password setup
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('status, password_set, email')
        .eq('email', email)
        .single()

      if (userData && userData.status === 'approved' && userData.password_set === false) {
        return true
      }

      // Fallback: check registration_requests for approved status
      if (!userData || userError) {
        const { data: regData, error: regError } = await supabase
          .from('registration_requests')
          .select('status, email')
          .eq('email', email)
          .single()

        if (regData && regData.status === 'approved') {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error checking OTP mode:', error)
      return false
    }
  }

  // Handle OTP verification
  const handleOtpVerification = async () => {
    if (!otpEmail || !otpCode) {
      setOtpError('Please enter your email and OTP code')
      return
    }

    setIsSubmitting(true)
    setOtpError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: otpEmail, 
          otpCode: otpCode,
          purpose: 'first_login'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'OTP verification failed')
      }

      if (result.success && result.data.verified && result.data.setupLink) {
        console.log('OTP verified successfully, redirecting to password setup')
        // Redirect to the password setup link
        window.location.href = result.data.setupLink
        return
      }

      throw new Error('Invalid response from OTP verification')
    } catch (error) {
      console.error('OTP verification error:', error)
      setOtpError(error instanceof Error ? error.message : 'OTP verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle OTP resend
  const handleResendOtp = async () => {
    if (!otpEmail) {
      setResendMessage('Please enter your email address first')
      return
    }

    setIsResendingOtp(true)
    setResendMessage('')

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: otpEmail, 
          purpose: 'first_login'
        }),
      })

      const result = await response.json()

      if (result.success) {
        setResendMessage('✅ New OTP code sent! Check your email inbox.')
        setOtpCode('') // Clear the current OTP input
      } else {
        setResendMessage(`❌ ${result.error || 'Failed to resend OTP'}`)
      }
    } catch (error) {
      console.error('Resend OTP error:', error)
      setResendMessage('❌ Failed to resend OTP. Please try again.')
    } finally {
      setIsResendingOtp(false)
    }
  }

  // Enhanced email check that switches to OTP mode if needed
  const handleEmailCheck = async (email: string) => {
    const needsOtp = await checkUserForOtpMode(email)
    
    if (needsOtp) {
      setOtpEmail(email)
      setOtpMode(true)
      setError('')
      return true
    }
    
    return false
  }

  const handleMagicLinkRequest = async () => {
    if (!magicLinkEmail) {
      setMagicLinkMessage('Please enter your email address')
      return
    }

    setMagicLinkLoading(true)
    setMagicLinkMessage('')

    try {
      const response = await fetch('/api/request-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: magicLinkEmail }),
      })

      const result = await response.json()

      if (result.success) {
        setMagicLinkMessage('✅ Secure access link sent! Check your email inbox.')
        setMagicLinkEmail('')
        setShowMagicLinkForm(false)
      } else {
        setMagicLinkMessage(`❌ ${result.message}`)
      }
    } catch (error) {
      console.error('Magic link request error:', error)
      setMagicLinkMessage('❌ Failed to send magic link. Please try again.')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <img 
              src="/boardguru-logo.svg" 
              alt="BoardGuru" 
              className="h-12 w-auto"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your BoardGuru account
          </p>
          {magicLinkMessage && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">{magicLinkMessage}</p>
            </div>
          )}
        </div>

        {/* Sign In Form */}
        <div className="card p-8 bg-white shadow-xl">
          {otpMode ? (
            /* OTP Mode Form */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Your Sign-In Code</h3>
                <p className="text-sm text-gray-600">
                  We sent a 6-digit code to <strong>{otpEmail}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  className="input w-full bg-gray-50"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input w-full text-center text-2xl font-mono tracking-wider"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter the 6-digit code from your email
                </p>
              </div>

              {otpError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Verification Failed</h4>
                      <p className="text-sm text-red-600 mt-1">{otpError}</p>
                    </div>
                  </div>
                </div>
              )}

              {resendMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 text-center">{resendMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleOtpVerification}
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>

                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingOtp}
                    className="flex-1 btn-secondary py-2 text-sm disabled:opacity-50"
                  >
                    {isResendingOtp ? 'Sending...' : 'Resend Code'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setOtpMode(false)
                      setOtpEmail('')
                      setOtpCode('')
                      setOtpError('')
                      setResendMessage('')
                    }}
                    className="flex-1 btn-secondary py-2 text-sm"
                  >
                    Use Password
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Password Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input w-full"
                placeholder="Enter your email address"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input w-full pr-10"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Sign In Failed</h4>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          )}
        </div>

        {/* First Time User Section - Only show if not in OTP mode */}
        {!otpMode && showMagicLinkForm ? (
          <div className="card p-6 bg-white shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">First Time Access</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you&apos;ve been approved but haven&apos;t set your password yet, enter your email to receive a secure setup link.
            </p>
            <div className="space-y-4">
              <input
                type="email"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                placeholder="Enter your approved email address"
                className="input w-full"
                disabled={magicLinkLoading}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleMagicLinkRequest}
                  disabled={magicLinkLoading}
                  className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
                >
                  {magicLinkLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    'Send Setup Link'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMagicLinkForm(false)
                    setMagicLinkMessage('')
                    setMagicLinkEmail('')
                  }}
                  disabled={magicLinkLoading}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : !otpMode ? (
          <div className="text-center space-y-4">
            {/* Prominent First Time User Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">
                <strong>First time signing in?</strong> If you&apos;ve been approved but haven&apos;t set up your password yet:
              </p>
              <button
                onClick={() => setShowMagicLinkForm(true)}
                className="btn-primary py-2 px-4 text-sm font-medium"
              >
                🔐 Get Password Setup Link
              </button>
            </div>

            {/* Regular Account Actions */}
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Don&apos;t have an account?{' '}
                <Link href="/" className="font-medium text-primary-600 hover:text-primary-500">
                  Request access
                </Link>
              </p>
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        ) : (
          /* OTP Mode Active - Show different helpful text */
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>First-time sign-in detected!</strong> We&apos;ve switched to secure code verification for your account setup.
              </p>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Secure Authentication</h4>
              <p className="text-sm text-blue-600 mt-1">
                Your session is protected with enterprise-grade security. All data is encrypted end-to-end.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}