'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResponsePage } from '@/features/shared/ui/ResponsePage'

interface ResultData {
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
  details?: string
  additionalInfo?: {
    email?: string
    name?: string
    company?: string
    position?: string
  }
}

function ApprovalResultContent() {
  const searchParams = useSearchParams()
  const [resultData, setResultData] = useState<ResultData | null>(null)

  useEffect(() => {
    // Parse URL parameters to get result data
    const type = searchParams.get('type') as 'success' | 'error' | 'warning' || 'error'
    const title = searchParams.get('title') || 'Unknown Result'
    const message = searchParams.get('message') || 'An unknown result occurred'
    const details = searchParams.get('details') || undefined
    
    // Parse additional info from URL params
    const additionalInfo = {
      name: searchParams.get('name') || undefined,
      email: searchParams.get('email') || undefined,
      company: searchParams.get('company') || undefined,
      position: searchParams.get('position') || undefined,
    }

    // Remove undefined values
    Object.keys(additionalInfo).forEach(key => 
      additionalInfo[key as keyof typeof additionalInfo] === undefined && 
      delete additionalInfo[key as keyof typeof additionalInfo]
    )

    setResultData({
      type,
      title,
      message,
      details,
      additionalInfo: Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined
    })
  }, [searchParams])

  if (!resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <ResponsePage
      type={resultData.type}
      title={resultData.title}
      message={resultData.message}
      details={resultData.details}
      additionalInfo={resultData.additionalInfo}
      showBackButton={true}
      backUrl="/"
    />
  )
}

export default function ApprovalResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ApprovalResultContent />
    </Suspense>
  )
}