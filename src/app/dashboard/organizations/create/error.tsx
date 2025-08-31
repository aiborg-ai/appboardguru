'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Create Organization Page Error:', error)
    console.error('Error stack:', error.stack)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6 max-w-md">
              There was an error loading the Create Organization page. This might be a temporary issue.
            </p>

            {/* Error details in development */}
            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
              <div className="w-full mb-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-700 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-500 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={reset}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
              
              <Link href="/dashboard/organizations">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Organizations
                </Button>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 w-full">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support or try:
              </p>
              <ul className="mt-3 text-sm text-gray-600 text-left list-disc list-inside">
                <li>Refreshing the page</li>
                <li>Clearing your browser cache</li>
                <li>Checking your internet connection</li>
                <li>Signing out and signing back in</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}