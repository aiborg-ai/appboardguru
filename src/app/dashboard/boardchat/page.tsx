'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import BoardChatTab from '@/features/boardchat/BoardChatTab'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Separate component to handle search params (needed for Suspense)
function BoardChatContent() {
  const searchParams = useSearchParams()
  const [selectedMember, setSelectedMember] = useState<{
    id: string
    name: string
    email: string
    avatar?: string
    designation?: string
    company?: string
  } | null>(null)

  useEffect(() => {
    // Check for member selection from URL params
    const memberId = searchParams.get('memberId')
    const memberName = searchParams.get('memberName')
    
    if (memberId) {
      // First try to get full member info from sessionStorage
      const storedMember = sessionStorage.getItem('boardchat_selected_member')
      if (storedMember) {
        try {
          const member = JSON.parse(storedMember)
          if (member.id === memberId) {
            setSelectedMember(member)
            // Clear the storage after use
            sessionStorage.removeItem('boardchat_selected_member')
            return
          }
        } catch (error) {
          console.error('Failed to parse stored member info:', error)
        }
      }
      
      // Fallback to basic info from URL params
      if (memberName) {
        setSelectedMember({
          id: memberId,
          name: decodeURIComponent(memberName),
          email: `${memberId}@board.com` // Fallback email
        })
      }
    }
  }, [searchParams])

  return <BoardChatTab initialSelectedMember={selectedMember} />
}

export default function BoardChatPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  BoardChat
                </h1>
                <p className="text-sm text-gray-600">
                  Secure messaging for board members
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface with Suspense boundary */}
        <div className="flex-1 overflow-hidden">
          <Suspense 
            fallback={
              <div className="h-full flex items-center justify-center">
                <Card className="p-8">
                  <CardContent className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">Loading BoardChat...</p>
                  </CardContent>
                </Card>
              </div>
            }
          >
            <BoardChatContent />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}