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
    const details = searchParams.get('details') ?? undefined
    
    // Parse additional info from URL params
    const additionalInfo: { email?: string; name?: string; company?: string; position?: string } = {}
    
    const name = searchParams.get('name')
    const email = searchParams.get('email')
    const company = searchParams.get('company')
    const position = searchParams.get('position')
    
    if (name) additionalInfo.name = name
    if (email) additionalInfo.email = email
    if (company) additionalInfo.company = company
    if (position) additionalInfo.position = position

    setResultData({
      type,
      title,
      message,
      ...(details && { details }),
      ...(Object.keys(additionalInfo).length > 0 && { additionalInfo })
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
      {...(resultData.details && { details: resultData.details })}
      {...(resultData.additionalInfo && { additionalInfo: resultData.additionalInfo })}
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