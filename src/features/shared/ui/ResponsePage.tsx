import React from 'react'
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'

interface ResponsePageProps {
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
  details?: string
  showBackButton?: boolean
  backUrl?: string
  additionalInfo?: {
    email?: string
    name?: string
    company?: string
    position?: string
  }
}

export function ResponsePage({ 
  type, 
  title, 
  message, 
  details, 
  showBackButton = false, 
  backUrl = '/',
  additionalInfo 
}: ResponsePageProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-16 w-16 text-yellow-500" />
    }
  }

  const getGradient = () => {
    switch (type) {
      case 'success':
        return 'from-green-500 to-emerald-600'
      case 'error':
        return 'from-red-500 to-red-600'
      case 'warning':
        return 'from-yellow-500 to-orange-600'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getGradient()} p-6 text-white text-center`}>
            <div className="mb-4 flex justify-center">
              {getIcon()}
            </div>
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className={`text-lg font-medium ${getTextColor()} mb-4 text-center`}>
              {message}
            </p>

            {details && (
              <p className="text-gray-600 text-center mb-6 text-sm">
                {details}
              </p>
            )}

            {/* Additional Info */}
            {additionalInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                  Registration Details
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {additionalInfo.name && (
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{additionalInfo.name}</span>
                    </div>
                  )}
                  {additionalInfo.email && (
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span className="break-all">{additionalInfo.email}</span>
                    </div>
                  )}
                  {additionalInfo.company && (
                    <div className="flex justify-between">
                      <span className="font-medium">Company:</span>
                      <span>{additionalInfo.company}</span>
                    </div>
                  )}
                  {additionalInfo.position && (
                    <div className="flex justify-between">
                      <span className="font-medium">Position:</span>
                      <span>{additionalInfo.position}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            {showBackButton && (
              <div className="text-center">
                <a
                  href={backUrl}
                  className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Home</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 BoardGuru - Enterprise Board Management Platform</p>
        </div>
      </div>
    </div>
  )
}