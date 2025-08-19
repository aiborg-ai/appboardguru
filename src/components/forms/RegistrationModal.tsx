'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().min(2, 'Company name is required'),
  position: z.string().min(2, 'Position is required'),
  message: z.string().optional(),
})

type RegistrationFormData = z.infer<typeof registrationSchema>

interface RegistrationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema)
  })

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Insert registration request into database and get the ID
      const { data: insertData, error: dbError } = await supabase
        .from('registration_requests')
        .insert([
          {
            email: data.email,
            full_name: data.fullName,
            company: data.company,
            position: data.position,
            message: data.message || null,
            status: 'pending'
          }
        ])
        .select()

      if (dbError || !insertData || insertData.length === 0) {
        throw new Error(dbError?.message || 'Failed to create registration request')
      }

      const registrationId = insertData[0].id

      // Send email notification to admin
      const emailResponse = await fetch('/api/send-registration-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          registrationId
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json()
        throw new Error(errorData.error || 'Failed to send notification email')
      }

      setSubmitStatus('success')
      reset()
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose()
        setSubmitStatus('idle')
      }, 3000)

    } catch (error) {
      console.error('Registration error:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setSubmitStatus('idle')
      setErrorMessage('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Request Access</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {submitStatus === 'success' ? (
            /* Success Message */
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-600 mb-4">
                Your access request has been sent to our team. You'll receive an email notification once it's reviewed.
              </p>
              <p className="text-sm text-gray-500">
                This window will close automatically...
              </p>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  className="input w-full"
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email')}
                  type="email"
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
                  Company *
                </label>
                <input
                  {...register('company')}
                  type="text"
                  className="input w-full"
                  placeholder="Enter your company name"
                  disabled={isSubmitting}
                />
                {errors.company && (
                  <p className="text-red-600 text-sm mt-1">{errors.company.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position/Title *
                </label>
                <input
                  {...register('position')}
                  type="text"
                  className="input w-full"
                  placeholder="e.g., Board Director, CEO, CFO"
                  disabled={isSubmitting}
                />
                {errors.position && (
                  <p className="text-red-600 text-sm mt-1">{errors.position.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Message (Optional)
                </label>
                <textarea
                  {...register('message')}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="Tell us about your board management needs..."
                  disabled={isSubmitting}
                />
              </div>

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Request Failed</h4>
                      <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="btn-secondary flex-1 py-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-3 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                By submitting this request, you agree to our terms of service and privacy policy. 
                We'll review your request and respond within 1-2 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}