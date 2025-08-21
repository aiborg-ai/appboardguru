'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'
import { Camera, Trash2, RefreshCw, Check } from 'lucide-react'

interface ScreenshotCaptureProps {
  onScreenshotCapture: (screenshot: string | null) => void
  screenshot?: string | null
}

export default function ScreenshotCapture({ 
  onScreenshotCapture, 
  screenshot 
}: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const captureScreenshot = async () => {
    setIsCapturing(true)
    setError(null)

    try {
      // Wait a brief moment to allow any UI updates
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await html2canvas(document.body, {
        height: window.innerHeight,
        width: window.innerWidth,
        useCORS: true,
        allowTaint: true,
        background: '#ffffff',
        logging: false
      })

      const dataUrl = canvas.toDataURL('image/png', 0.8)
      onScreenshotCapture(dataUrl)
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      setError('Failed to capture screenshot. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  const clearScreenshot = () => {
    onScreenshotCapture(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Screenshot (Optional)</h3>
        {!screenshot && (
          <button
            type="button"
            onClick={captureScreenshot}
            disabled={isCapturing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Capture Screen
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Screenshot Error
              </h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {screenshot && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center text-sm font-medium text-green-700">
              <Check className="h-4 w-4 mr-2" />
              Screenshot captured
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retake
              </button>
              <button
                type="button"
                onClick={clearScreenshot}
                className="inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </button>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src={screenshot} 
              alt="Captured screenshot" 
              className="w-full h-48 object-cover rounded-md border border-gray-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-md flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-sm font-medium">Click retake to capture again</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Screenshots help us better understand your feedback and resolve issues more quickly.
      </p>
    </div>
  )
}