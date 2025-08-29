'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import ScreenshotCapture from '@/components/feedback/ScreenshotCapture'

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other'

interface FeedbackForm {
  type: FeedbackType
  title: string
  description: string
  screenshot: string | null
}

export default function FeedbackPage() {
  const [form, setForm] = useState<FeedbackForm>({
    type: 'bug',
    title: '',
    description: '',
    screenshot: null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const feedbackTypes = [
    { value: 'bug', label: '🐛 Bug Report', description: 'Report an issue or error' },
    { value: 'feature', label: '✨ Feature Request', description: 'Suggest a new feature' },
    { value: 'improvement', label: '📈 Improvement', description: 'Suggest an enhancement' },
    { value: 'other', label: '💬 Other', description: 'General feedback or question' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitStatus('success')
      // Reset form
      setForm({
        type: 'bug',
        title: '',
        description: '',
        screenshot: null
      })
    } catch (error) {
      console.error('Feedback submission error:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred while submitting your feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = form.title.trim() !== '' && form.description.trim() !== ''

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Send Feedback</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Help us improve BoardGuru by reporting bugs or suggesting new features
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="mx-6 mt-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Feedback submitted successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Thank you for your feedback. We've received your message and will get back to you soon.
                      You should also receive a confirmation email shortly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="mx-6 mt-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error submitting feedback
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="text-base font-medium text-gray-900">
                What type of feedback is this?
              </label>
              <fieldset className="mt-4">
                <div className="space-y-4">
                  {feedbackTypes.map((type) => (
                    <div key={type.value} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={type.value}
                          name="feedback-type"
                          type="radio"
                          value={type.value}
                          checked={form.type === type.value}
                          onChange={(e) => setForm({ ...form, type: e.target.value as FeedbackType })}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                      </div>
                      <div className="ml-3">
                        <label htmlFor={type.value} className="font-medium text-gray-700">
                          {type.label}
                        </label>
                        <p className="text-gray-500 text-sm">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={200}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Brief summary of your feedback..."
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {form.title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={2000}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Please provide detailed information about your feedback. For bugs, include steps to reproduce the issue..."
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {form.description.length}/2000 characters
              </p>
            </div>

            {/* Screenshot */}
            <ScreenshotCapture
              screenshot={form.screenshot}
              onScreenshotCapture={(screenshot) => setForm({ ...form, screenshot })}
            />

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info Section */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  How we handle your feedback
                </h3>
                <div className="mt-2 text-sm text-gray-600">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your feedback is sent directly to our development team</li>
                    <li>You'll receive a confirmation email within a few minutes</li>
                    <li>We typically respond to feedback within 1-2 business days</li>
                    <li>Screenshots help us understand and resolve issues faster</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}