'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function TestDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Check auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        setError(`Auth error: ${authError.message}`)
        setLoading(false)
        return
      }

      if (!authUser) {
        setError('No authenticated user found')
        router.push('/auth/signin')
        return
      }

      setUser(authUser)

      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        setError(`Profile error: ${profileError.message}`)
      } else if (!profile) {
        setError('User profile not found in database')
      }

      setLoading(false)
    } catch (err) {
      setError(`Unexpected error: ${err}`)
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Test Dashboard Page</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {user && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <p className="font-semibold text-green-700">Authentication Successful!</p>
              </div>

              <div className="border rounded p-4">
                <h2 className="font-semibold mb-2">User Information:</h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="inline font-medium">User ID:</dt>
                    <dd className="inline ml-2 text-gray-600">{user.id}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Email:</dt>
                    <dd className="inline ml-2 text-gray-600">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Created At:</dt>
                    <dd className="inline ml-2 text-gray-600">{new Date(user.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Go to Main Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {!user && !error && (
            <div className="text-gray-600">
              <p>No user data available</p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-100 rounded p-4">
          <h2 className="font-semibold mb-2">Debug Information:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({ user, error, loading }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}