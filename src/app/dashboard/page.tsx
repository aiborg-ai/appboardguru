'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Brain, 
  MessageSquare, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BoardPack {
  id: string
  title: string
  description: string | null
  file_name: string
  file_size: number
  status: 'processing' | 'ready' | 'failed'
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [boardPacks, setBoardPacks] = useState<BoardPack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkUser()
    fetchBoardPacks()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/signin')
      return
    }

    setUser(user)
  }

  const fetchBoardPacks = async () => {
    try {
      // For now, we'll use mock data since the tables don't exist yet
      setBoardPacks([])
    } catch (error) {
      console.error('Error fetching board packs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Board Pack Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Manage and analyze your board materials with AI-powered insights
              </p>
            </div>
            <button className="btn-primary px-6 py-3 flex items-center space-x-2 mt-4 lg:mt-0">
              <Plus className="h-5 w-5" />
              <span>Upload Board Pack</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Packs</p>
                  <p className="text-2xl font-bold text-blue-900">0</p>
                </div>
              </div>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Ready</p>
                  <p className="text-2xl font-bold text-green-900">0</p>
                </div>
              </div>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600">Processing</p>
                  <p className="text-2xl font-bold text-yellow-900">0</p>
                </div>
              </div>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">AI Analyzed</p>
                  <p className="text-2xl font-bold text-purple-900">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No board packs yet
            </h3>
            <p className="text-gray-600 mb-4">
              Upload your first board pack to get started with AI-powered analysis.
            </p>
            <button className="btn-primary px-6 py-3">
              Upload Board Pack
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}