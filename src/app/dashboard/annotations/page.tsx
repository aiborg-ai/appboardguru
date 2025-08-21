'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  MessageSquare, 
  FileText,
  Calendar,
  User,
  Building2,
  Package,
  Filter,
  Search,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/features/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { useToast } from '@/features/shared/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface AnnotationData {
  id: string
  asset_id: string
  asset_name: string
  vault_id: string
  vault_name: string
  organization_id: string
  organization_name: string
  selected_text?: string
  comment_text?: string
  color: string
  page_number: number
  annotation_type: string
  created_by: string
  created_at: string
  updated_at: string
  is_resolved: boolean
  is_private: boolean
  user: {
    id: string
    full_name: string
    avatar_url?: string
  }
  replies_count: number
}

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [filteredAnnotations, setFilteredAnnotations] = useState<AnnotationData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'highlight' | 'area' | 'textbox'>('all')
  
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()

  // Load annotations
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!currentOrganization) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // In a real implementation, this would fetch from /api/annotations
        // For now, we'll create some sample data
        const sampleAnnotations: AnnotationData[] = [
          {
            id: '1',
            asset_id: 'asset1',
            asset_name: 'Q4 Board Pack.pdf',
            vault_id: 'vault1',
            vault_name: 'Board Documents',
            organization_id: currentOrganization.id,
            organization_name: currentOrganization.name,
            selected_text: 'Revenue increased by 15% year over year',
            comment_text: 'Great performance! Need to highlight this in the presentation.',
            color: '#FFFF00',
            page_number: 3,
            annotation_type: 'highlight',
            created_by: 'user1',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString(),
            is_resolved: false,
            is_private: false,
            user: {
              id: 'user1',
              full_name: 'John Doe'
            },
            replies_count: 2
          },
          {
            id: '2',
            asset_id: 'asset2',
            asset_name: 'Risk Assessment Report.pdf',
            vault_id: 'vault1',
            vault_name: 'Board Documents',
            organization_id: currentOrganization.id,
            organization_name: currentOrganization.name,
            selected_text: 'High risk identified in cybersecurity',
            comment_text: 'We need to address this immediately. Schedule a security review.',
            color: '#FF6B6B',
            page_number: 7,
            annotation_type: 'highlight',
            created_by: 'user2',
            created_at: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
            updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
            is_resolved: true,
            is_private: false,
            user: {
              id: 'user2',
              full_name: 'Jane Smith'
            },
            replies_count: 0
          },
          {
            id: '3',
            asset_id: 'asset1',
            asset_name: 'Q4 Board Pack.pdf',
            vault_id: 'vault1',
            vault_name: 'Board Documents',
            organization_id: currentOrganization.id,
            organization_name: currentOrganization.name,
            selected_text: 'Market share expanded to 23%',
            comment_text: 'Excellent progress on our growth strategy.',
            color: '#4ECDC4',
            page_number: 5,
            annotation_type: 'highlight',
            created_by: 'user3',
            created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            updated_at: new Date(Date.now() - 7200000).toISOString(),
            is_resolved: false,
            is_private: true,
            user: {
              id: 'user3',
              full_name: 'Mike Johnson'
            },
            replies_count: 1
          }
        ]

        setAnnotations(sampleAnnotations)
      } catch (error) {
        console.error('Error loading annotations:', error)
        toast({
          title: 'Error',
          description: 'Failed to load annotations',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadAnnotations()
  }, [currentOrganization, toast])

  // Filter annotations based on search and filters
  useEffect(() => {
    let filtered = annotations

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(annotation => 
        annotation.comment_text?.toLowerCase().includes(query) ||
        annotation.selected_text?.toLowerCase().includes(query) ||
        annotation.asset_name.toLowerCase().includes(query) ||
        annotation.vault_name.toLowerCase().includes(query) ||
        annotation.user.full_name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(annotation => 
        statusFilter === 'resolved' ? annotation.is_resolved : !annotation.is_resolved
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(annotation => annotation.annotation_type === typeFilter)
    }

    setFilteredAnnotations(filtered)
  }, [annotations, searchQuery, statusFilter, typeFilter])

  const handleViewAnnotation = (annotation: AnnotationData) => {
    window.location.href = `/dashboard/assets/${annotation.asset_id}/annotations`
  }

  const handleMarkResolved = async (annotationId: string) => {
    // In real implementation, this would call the API
    setAnnotations(prev => 
      prev.map(annotation => 
        annotation.id === annotationId 
          ? { ...annotation, is_resolved: !annotation.is_resolved }
          : annotation
      )
    )
    
    toast({
      title: 'Success',
      description: 'Annotation status updated',
    })
  }

  const getStatusIcon = (isResolved: boolean) => {
    return isResolved ? CheckCircle : Clock
  }

  const getStatusColor = (isResolved: boolean) => {
    return isResolved ? 'text-green-600' : 'text-orange-600'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-blue-600" />
              Annotations
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and review all annotations across your documents
            </p>
            {currentOrganization && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Building2 className="h-4 w-4" />
                <span>Organization: {currentOrganization.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredAnnotations.length} annotations
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {annotations.filter(a => !a.is_resolved).length} active
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search annotations, documents, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="highlight">Highlights</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="textbox">Text Box</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Annotations List */}
        {!currentOrganization ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
            <p className="text-gray-600 mb-6">
              Please select an organization to view annotations
            </p>
            <Button 
              onClick={() => window.location.href = '/dashboard/organizations'} 
              variant="outline"
            >
              Go to Organizations
            </Button>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'No Matching Annotations' 
                : 'No Annotations Yet'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start annotating documents to see them here'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => window.location.href = '/dashboard/assets'}>
                Browse Documents
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnotations.map((annotation) => {
              const StatusIcon = getStatusIcon(annotation.is_resolved)
              
              return (
                <Card key={annotation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className={`h-4 w-4 ${getStatusColor(annotation.is_resolved)}`} />
                          <Badge 
                            variant="outline" 
                            className="text-xs capitalize"
                          >
                            {annotation.annotation_type}
                          </Badge>
                          {annotation.is_private && (
                            <Badge variant="secondary" className="text-xs">
                              Private
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            Page {annotation.page_number}
                          </span>
                        </div>
                        
                        {/* Content */}
                        <div className="mb-3">
                          {annotation.selected_text && (
                            <div className="mb-2">
                              <div 
                                className="inline-block px-2 py-1 rounded text-sm"
                                style={{ backgroundColor: annotation.color + '40' }}
                              >
                                "{annotation.selected_text}"
                              </div>
                            </div>
                          )}
                          
                          {annotation.comment_text && (
                            <p className="text-gray-700 text-sm">
                              {annotation.comment_text}
                            </p>
                          )}
                        </div>
                        
                        {/* Document & Vault Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{annotation.asset_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>{annotation.vault_name}</span>
                          </div>
                        </div>
                        
                        {/* User & Time Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={annotation.user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {annotation.user.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-600">
                              {annotation.user.full_name}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          {annotation.replies_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {annotation.replies_count} {annotation.replies_count === 1 ? 'reply' : 'replies'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="ml-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAnnotation(annotation)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View in Document
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkResolved(annotation.id)}>
                              {annotation.is_resolved ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark as Active
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Resolved
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}