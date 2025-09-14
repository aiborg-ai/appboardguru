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
import { useDocumentService } from '@/hooks/use-document-service'
import { useAuth } from '@/contexts/AuthContext'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { DocumentLibrary } from '@/components/documents/DocumentLibrary'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/contexts/OrganizationContext'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { Document as DomainDocument } from '@/domain/entities/document.entity'
import { DocumentFilters, DocumentSortOptions } from '@/application/interfaces/repositories/document.repository.interface'

interface Document {
  id: string
  title: string
  file_name: string
  file_type: string
  file_size: number
  file_path?: string
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
  const documentService = useDocumentService()
  const { user } = useAuth()
  
  // Safely use organization context with defensive checks
  let currentOrganization = null
  try {
    const orgContext = useOrganization()
    currentOrganization = orgContext?.currentOrganization || null
  } catch (error) {
    console.error('Organization context error:', error)
  }

  // Fetch documents
  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [currentOrganization, user])

  const fetchDocuments = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to view documents',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Build filters
      const filters: DocumentFilters = {}
      if (currentOrganization) {
        filters.organizationId = currentOrganization.id
      }

      // Use CQRS to fetch documents
      const result = await documentService.getUserDocuments(
        user.id,
        filters,
        { field: 'createdAt', direction: 'desc' },
        { page: 1, limit: 100 },
        true // includeShared
      )

      if (!result.success) {
        console.error('Error fetching documents:', result.error)
        toast({
          title: 'Error',
          description: 'Failed to load documents',
          variant: 'destructive'
        })
        return
      }

      // Transform domain documents to UI format
      const transformedDocs: Document[] = result.data.items.map(doc => {
        const props = doc.toPersistence()
        return {
          id: props.id,
          title: props.title,
          file_name: props.title, // Using title as file_name for now
          file_type: props.type,
          file_size: props.metadata?.fileSize || 0,
          file_path: props.metadata?.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          organization_id: props.organizationId || undefined,
          organization: props.organizationId ? { 
            id: props.organizationId, 
            name: 'Organization' 
          } : undefined,
          vault_associations: props.metadata?.vaultIds?.map((vaultId: string) => ({
            vault_id: vaultId,
            vault_name: 'Vault'
          })) || [],
          shared_with_boardmates: props.collaborators?.map(collab => ({
            user_id: collab.userId,
            user_name: 'User',
            permission: collab.accessLevel
          })) || [],
          annotation_count: props.comments?.length || 0,
          created_at: props.createdAt.toISOString(),
          updated_at: props.updatedAt.toISOString(),
          attribution_status: props.organizationId ? 'complete' : 'pending'
        }
      })

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
  const handleUploadComplete = async (newAsset: any) => {
    if (!user) return

    try {
      // Create document using CQRS
      const result = await documentService.createDocument(
        {
          title: newAsset.title || newAsset.file_name || 'Untitled',
          type: newAsset.file_type || 'other',
          assetId: newAsset.id,
          organizationId: currentOrganization?.id,
          metadata: {
            fileName: newAsset.file_name,
            fileSize: newAsset.file_size,
            mimeType: newAsset.file_type,
            fileUrl: newAsset.file_url || newAsset.file_path
          }
        },
        user.id
      )

      if (result.success) {
        toast({
          title: 'Document created',
          description: 'Document has been successfully created in the system',
        })
        
        // Refresh the documents list
        await fetchDocuments()
        setActiveTab('library')
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create document record',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating document:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    }
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
// Force rebuild: Documents feature v3 - Cache refresh
