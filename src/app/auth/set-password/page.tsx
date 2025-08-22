'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase-client'
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react'
import Link from 'next/link'

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^A-Za-z\d]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

function SetPasswordPageContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isVerifyingLink, setIsVerifyingLink] = useState(true)
  const [linkVerified, setLinkVerified] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  const password = watch('password')

  // Verify magic link on component mount
  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setError('Invalid or expired magic link. Please request a new one.')
          setIsVerifyingLink(false)
          return
        }

        if (data.session?.user) {
          // Check if user needs to set password
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, email, password_set')
            .eq('id', data.session.user.id)
            .single()

          if (userError) {
            console.error('User data error:', userError)
            setError('Unable to verify user account. Please contact support.')
            setIsVerifyingLink(false)
            return
          }

          if (userData.password_set) {
            // User has already set password, redirect to sign in
            router.push('/auth/signin?message=Password already set')
            return
          }

          setUserInfo({
            name: userData.full_name || 'User',
            email: userData.email
          })
          setLinkVerified(true)
        } else {
          setError('Invalid or expired magic link. Please request a new one.')
        }
      } catch (error) {
        console.error('Magic link verification error:', error)
        setError('Unable to verify magic link. Please try again or contact support.')
      } finally {
        setIsVerifyingLink(false)
      }
    }

    verifyMagicLink()
  }, [router])

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true)
    setError('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData.session?.user) {
        throw new Error('Session expired. Please request a new magic link.')
      }

      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      })

      if (updateError) {
        throw updateError
      }

      // Update the users table to mark password as set
      const { error: dbError } = await supabase
        .from('users')
        .update({ password_set: true })
        .eq('id', sessionData.session.user.id)

      if (dbError) {
        console.error('Error updating users table:', dbError)
        // Don't throw here as password was set successfully
      }

      setSuccess(true)
      
      // Redirect to dashboard after successful password setup
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Password setup error:', error)
      setError(error instanceof Error ? error.message : 'Failed to set password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^A-Za-z\d]/.test(password)) strength++
    return strength
  }

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return 'Very Weak'
      case 2:
        return 'Weak'
      case 3:
        return 'Fair'
      case 4:
        return 'Good'
      case 5:
        return 'Strong'
      default:
        return 'Very Weak'
    }
  }

  const getPasswordStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return 'text-red-600 bg-red-100'
      case 2:
        return 'text-orange-600 bg-orange-100'
      case 3:
        return 'text-yellow-600 bg-yellow-100'
      case 4:
        return 'text-blue-600 bg-blue-100'
      case 5:
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (isVerifyingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600">Verifying your secure access link...</p>
        </div>
      </div>
    )
  }

  if (!linkVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <img 
                src="/boardguru-logo.svg" 
                alt="BoardGuru" 
                className="h-12 w-auto"
              />
            </Link>
          </div>

          <div className="card p-8 bg-white shadow-xl">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Access Link Invalid</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link 
                href="/auth/signin"
                className="inline-flex items-center px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <img 
                src="/boardguru-logo.svg" 
                alt="BoardGuru" 
                className="h-12 w-auto"
              />
            </Link>
          </div>

          <div className="card p-8 bg-white shadow-xl text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Set Successfully!</h2>
              <p className="text-gray-600">
                Welcome to BoardGuru, {userInfo?.name}! You&apos;ll be redirected to your dashboard shortly.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const passwordStrength = getPasswordStrength(password || '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <img 
              src="/boardguru-logo.svg" 
              alt="BoardGuru" 
              className="h-12 w-auto"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Set Your Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome {userInfo?.name}! 
            {searchParams?.get('source') === 'otp' ? 
              ' Your sign-in code was verified successfully. Now create a secure password to complete your account setup.' :
              ' Create a secure password to complete your account setup.'
            }
          </p>
        </div>

        {/* OTP Success Message */}
        {searchParams?.get('source') === 'otp' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Code Verified Successfully! ✅</h4>
                <p className="text-sm text-green-600">
                  Your 6-digit sign-in code has been verified. Complete your setup by creating a secure password below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-8 bg-white shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input w-full pr-10"
                  placeholder="Create a secure password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-4 rounded ${
                            level <= passwordStrength
                              ? passwordStrength >= 4
                                ? 'bg-green-500'
                                : passwordStrength >= 3
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getPasswordStrengthColor(passwordStrength)}`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input w-full pr-10"
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Password Setup Failed</h4>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || passwordStrength < 4}
              className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Setting Password...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Set Password</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Secure Password Requirements</h4>
              <ul className="text-sm text-blue-600 mt-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SetPasswordPageContent />
    </Suspense>
  )
}