'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function MagicLinkHandlerPage() {
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    handleMagicLink()
  }, [])

  const handleMagicLink = async () => {
    try {
      // Check if we have the token in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      
      if (!accessToken) {
        // Check URL search params as fallback
        const searchParams = new URLSearchParams(window.location.search)
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          setErrorMessage(errorDescription || 'Authentication failed')
          setStatus('error')
          return
        }
        
        setErrorMessage('No authentication token found. Please request a new magic link.')
        setStatus('error')
        return
      }

      // Set the session with the tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })

      if (error) {
        console.error('Session error:', error)
        setErrorMessage('Failed to authenticate. Please request a new magic link.')
        setStatus('error')
        return
      }

      if (data.session) {
        setStatus('success')
        // Redirect to password setup page
        setTimeout(() => {
          router.push('/auth/set-password')
        }, 1000)
      }
    } catch (error) {
      console.error('Magic link handler error:', error)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setStatus('error')
    }
  }

  const handleRequestNewLink = () => {
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            {status === 'processing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Processing Magic Link
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your authentication...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Authentication Successful
                </h2>
                <p className="text-gray-600">
                  Redirecting to password setup...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Authentication Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {errorMessage}
                </p>
                <button
                  onClick={handleRequestNewLink}
                  className="btn-primary w-full"
                >
                  Request New Magic Link
                </button>
              </>
            )}
          </div>
        </div>

        {status === 'processing' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              If this takes too long, you may need to{' '}
              <button
                onClick={handleRequestNewLink}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                request a new link
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}