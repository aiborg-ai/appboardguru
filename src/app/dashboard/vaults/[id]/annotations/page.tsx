'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  FileText, 
  Calendar,
  User,
  Filter,
  Search,
  CheckCircle,
  Circle,
  ArrowLeft,
  Loader2,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/auth-store'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface AnnotationSummary {
  id: string
  asset_id: string
  asset_name: string
  page_number: number
  selected_text?: string
  comment_text?: string
  color: string
  created_by: string
  created_at: string
  is_resolved: boolean
  creator: {
    id: string
    full_name: string
    avatar_url?: string
  }
  replies_count: number
  last_activity_at?: string
}

interface VaultDetails {
  id: string
  name: string
  description?: string
  organization_id: string
  member_count: number
  asset_count: number
}

export default function VaultAnnotationsSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const vaultId = params.id as string
  const { user } = useAuthStore()

  const [vault, setVault] = useState<VaultDetails | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationSummary[]>([])
  const [filteredAnnotations, setFilteredAnnotations] = useState<AnnotationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'resolved' | 'unresolved'>('all')
  const [filterAsset, setFilterAsset] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'most-replies'>('recent')
  const [uniqueAssets, setUniqueAssets] = useState<{ id: string; name: string }[]>([])
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; name: string }[]>([])

  // Fetch vault details and annotations
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !vaultId) return

      try {
        setLoading(true)

        // Fetch vault details
        const vaultResponse = await fetch(`/api/vaults/${vaultId}`)
        if (!vaultResponse.ok) {
          throw new Error('Failed to fetch vault details')
        }
        const vaultData = await vaultResponse.json()
        setVault(vaultData.vault)

        // Fetch all annotations for assets in this vault
        const annotationsResponse = await fetch(`/api/vaults/${vaultId}/annotations`)
        if (!annotationsResponse.ok) {
          throw new Error('Failed to fetch annotations')
        }
        const annotationsData = await annotationsResponse.json()
        setAnnotations(annotationsData.annotations || [])

        // Extract unique assets and users for filters
        const assets = new Map<string, string>()
        const users = new Map<string, string>()
        
        annotationsData.annotations?.forEach((ann: AnnotationSummary) => {
          assets.set(ann.asset_id, ann.asset_name)
          users.set(ann.creator.id, ann.creator.full_name)
        })

        setUniqueAssets(Array.from(assets, ([id, name]) => ({ id, name })))
        setUniqueUsers(Array.from(users, ([id, name]) => ({ id, name })))

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vaultId, user?.id])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...annotations]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(ann => 
        ann.comment_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.selected_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.asset_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus === 'resolved') {
      filtered = filtered.filter(ann => ann.is_resolved)
    } else if (filterStatus === 'unresolved') {
      filtered = filtered.filter(ann => !ann.is_resolved)
    }

    // Apply asset filter
    if (filterAsset !== 'all') {
      filtered = filtered.filter(ann => ann.asset_id === filterAsset)
    }

    // Apply user filter
    if (filterUser !== 'all') {
      filtered = filtered.filter(ann => ann.creator.id === filterUser)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'most-replies':
          return b.replies_count - a.replies_count
        default:
          return 0
      }
    })

    setFilteredAnnotations(filtered)
  }, [annotations, searchQuery, filterStatus, filterAsset, filterUser, sortBy])

  const handleViewAnnotation = (annotation: AnnotationSummary) => {
    router.push(`/dashboard/assets/${annotation.asset_id}/annotations#annotation-${annotation.id}`)
  }

  const stats = {
    total: annotations.length,
    resolved: annotations.filter(a => a.is_resolved).length,
    unresolved: annotations.filter(a => !a.is_resolved).length,
    withReplies: annotations.filter(a => a.replies_count > 0).length,
    totalReplies: annotations.reduce((sum, a) => sum + a.replies_count, 0),
    activeUsers: uniqueUsers.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Loading annotations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/vaults/${vaultId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vault
            </Button>
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vault Annotations</h1>
            {vault && (
              <p className="text-sm text-gray-600">{vault.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Annotations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.resolved}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Resolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Circle className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.unresolved}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Unresolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{stats.totalReplies}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Replies</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span className="text-2xl font-bold">{uniqueAssets.length}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Annotated Assets</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <User className="h-5 w-5 text-pink-600" />
              <span className="text-2xl font-bold">{stats.activeUsers}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Active Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search annotations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Asset Filter */}
            <Select value={filterAsset} onValueChange={setFilterAsset}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {uniqueAssets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* User Filter */}
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most-replies">Most Replies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Annotations List */}
      <div className="space-y-4">
        {filteredAnnotations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations found</h3>
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'all' || filterAsset !== 'all' || filterUser !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No annotations have been created in this vault yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAnnotations.map((annotation) => (
            <Card 
              key={annotation.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewAnnotation(annotation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={annotation.creator.avatar_url} />
                        <AvatarFallback>
                          {annotation.creator.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{annotation.creator.full_name}</span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FileText className="h-3 w-3" />
                          <span>{annotation.asset_name}</span>
                          <span className="text-gray-400">•</span>
                          <span>Page {annotation.page_number}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {annotation.is_resolved ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            <Circle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        )}
                        
                        {annotation.replies_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {annotation.replies_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="ml-11">
                      {annotation.selected_text && (
                        <div className="bg-yellow-50 p-2 rounded mb-2 border-l-4 border-yellow-400">
                          <p className="text-sm text-gray-700 italic">"{annotation.selected_text}"</p>
                        </div>
                      )}
                      
                      {annotation.comment_text && (
                        <p className="text-sm text-gray-800">{annotation.comment_text}</p>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}