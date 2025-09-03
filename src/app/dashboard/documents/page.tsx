'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Upload, 
  Grid3X3, 
  List, 
  Search,
  Filter,
  Plus,
  Building2,
  Package,
  Users,
  MessageSquare
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { DocumentLibrary } from '@/components/documents/DocumentLibrary'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/contexts/OrganizationContext'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'

interface Document {
  id: string
  title: string
  file_name: string
  file_type: string
  file_size: number
  organization_id?: string
  organization?: {
    id: string
    name: string
  }
  vault_associations?: {
    vault_id: string
    vault_name: string
  }[]
  shared_with_boardmates?: {
    user_id: string
    user_name: string
    permission: string
  }[]
  annotation_count?: number
  created_at: string
  updated_at: string
  attribution_status: 'pending' | 'partial' | 'complete'
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    organization: 'all',
    vault: 'all',
    boardmate: 'all',
    status: 'all'
  })
  
  const { toast } = useToast()
  const { currentOrganization } = useOrganization()
  const supabase = createSupabaseBrowserClient()

  // Fetch documents
  useEffect(() => {
    fetchDocuments()
  }, [currentOrganization])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to view documents',
          variant: 'destructive'
        })
        return
      }

      // Fetch documents where user is owner or has been granted access
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          *,
          owner:users!owner_id(id, full_name, email),
          organization:organizations!organization_id(id, name),
          asset_annotations(count)
        `)
        .or(`owner_id.eq.${user.id}`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
        toast({
          title: 'Error',
          description: 'Failed to load documents',
          variant: 'destructive'
        })
        return
      }

      // Transform assets to documents format
      const transformedDocs: Document[] = (assets || []).map(asset => ({
        id: asset.id,
        title: asset.title,
        file_name: asset.file_name,
        file_type: asset.file_type,
        file_size: asset.file_size,
        organization_id: asset.organization_id,
        organization: asset.organization,
        vault_associations: [], // Will be populated from vault_assets table
        shared_with_boardmates: [], // Will be populated from asset_shares table
        annotation_count: asset.asset_annotations?.[0]?.count || 0,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        attribution_status: asset.organization_id ? 'complete' : 'pending'
      }))

      setDocuments(transformedDocs)
      setFilteredDocuments(transformedDocs)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle document upload completion
  const handleUploadComplete = (newDocument: any) => {
    toast({
      title: 'Document uploaded',
      description: 'Now you can add organization and vault associations',
    })
    
    // Add to documents list
    const doc: Document = {
      id: newDocument.id,
      title: newDocument.title,
      file_name: newDocument.file_name,
      file_type: newDocument.file_type,
      file_size: newDocument.file_size,
      organization_id: newDocument.organization_id,
      vault_associations: [],
      shared_with_boardmates: [],
      annotation_count: 0,
      created_at: newDocument.created_at,
      updated_at: newDocument.updated_at,
      attribution_status: 'pending'
    }
    
    setDocuments(prev => [doc, ...prev])
    setFilteredDocuments(prev => [doc, ...prev])
    setActiveTab('library')
  }

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = [...documents]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Organization filter
    if (selectedFilters.organization !== 'all') {
      filtered = filtered.filter(doc => doc.organization_id === selectedFilters.organization)
    }

    // Status filter
    if (selectedFilters.status !== 'all') {
      filtered = filtered.filter(doc => doc.attribution_status === selectedFilters.status)
    }

    setFilteredDocuments(filtered)
  }, [searchQuery, selectedFilters, documents])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-gray-500 mt-1">
              Upload, manage, and collaborate on documents with annotations
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab('upload')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Documents</p>
                  <p className="text-2xl font-bold">{documents.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">With Organization</p>
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.organization_id).length}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Shared Documents</p>
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.shared_with_boardmates?.length > 0).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Annotations</p>
                  <p className="text-2xl font-bold">
                    {documents.reduce((sum, d) => sum + (d.annotation_count || 0), 0)}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger value="library">Document Library</TabsTrigger>
                  <TabsTrigger value="upload">Upload New</TabsTrigger>
                </TabsList>
                
                {activeTab === 'library' && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <TabsContent value="library">
                <DocumentLibrary
                  documents={filteredDocuments}
                  viewMode={viewMode}
                  isLoading={isLoading}
                  onDocumentUpdate={fetchDocuments}
                />
              </TabsContent>

              <TabsContent value="upload">
                <DocumentUploader
                  onUploadComplete={handleUploadComplete}
                  currentOrganization={currentOrganization}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}