'use client'

import React, { useState } from 'react'
import { 
  FileText, 
  Eye, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  Building2,
  Package,
  Users,
  MessageSquare,
  MoreVertical,
  Clock,
  Filter,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentAttributor } from './DocumentAttributor'
import { PDFViewerWithAnnotations } from '@/components/features/assets/PDFViewerWithAnnotations'

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

interface DocumentLibraryProps {
  documents: Document[]
  viewMode: 'grid' | 'list'
  isLoading: boolean
  onDocumentUpdate?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 30) {
    return `${diffDays} days ago`
  }
  
  return date.toLocaleDateString()
}

export function DocumentLibrary({ 
  documents, 
  viewMode, 
  isLoading,
  onDocumentUpdate 
}: DocumentLibraryProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false)
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false)

  const handleAttributeDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setAttributeDialogOpen(true)
  }

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setViewerDialogOpen(true)
  }

  const handleDownload = async (doc: Document) => {
    if (!doc.file_path) return
    
    // Open download link in new tab
    window.open(doc.file_path, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    // TODO: Implement delete functionality
    console.log('Delete document:', doc.id)
    onDocumentUpdate?.()
  }

  const renderDocumentCard = (doc: Document) => {
    const isPdf = doc.file_type === 'application/pdf'
    const isImage = doc.file_type.startsWith('image/')
    const hasAnnotations = (doc.annotation_count || 0) > 0
    
    return (
      <Card key={doc.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-sm mb-1">{doc.title}</h3>
              <p className="text-xs text-gray-500">
                {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAttributeDocument(doc)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Attributes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Document Type Icon */}
          <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg mb-3">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>

          {/* Attribution Status */}
          <div className="mb-3">
            {doc.attribution_status === 'pending' && (
              <Badge variant="secondary" className="w-full justify-center">
                <Clock className="h-3 w-3 mr-1" />
                Attribution Pending
              </Badge>
            )}
            {doc.attribution_status === 'partial' && (
              <Badge variant="outline" className="w-full justify-center">
                Partially Attributed
              </Badge>
            )}
            {doc.attribution_status === 'complete' && (
              <Badge variant="default" className="w-full justify-center bg-green-600">
                Fully Attributed
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            {/* Organization */}
            {doc.organization && (
              <div className="flex items-center text-xs text-gray-600">
                <Building2 className="h-3 w-3 mr-1" />
                <span className="truncate">{doc.organization.name}</span>
              </div>
            )}

            {/* Vaults */}
            {doc.vault_associations && doc.vault_associations.length > 0 && (
              <div className="flex items-center text-xs text-gray-600">
                <Package className="h-3 w-3 mr-1" />
                <span className="truncate">
                  {doc.vault_associations.length} vault{doc.vault_associations.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Shared With */}
            {doc.shared_with_boardmates && doc.shared_with_boardmates.length > 0 && (
              <div className="flex items-center text-xs text-gray-600">
                <Users className="h-3 w-3 mr-1" />
                <span className="truncate">
                  Shared with {doc.shared_with_boardmates.length} BoardMate{doc.shared_with_boardmates.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Annotations */}
            {hasAnnotations && (
              <div className="flex items-center text-xs text-blue-600">
                <MessageSquare className="h-3 w-3 mr-1" />
                <span>
                  {doc.annotation_count} annotation{doc.annotation_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleViewDocument(doc)}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            {doc.attribution_status !== 'complete' && (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => handleAttributeDocument(doc)}
              >
                <Tag className="h-3 w-3 mr-1" />
                Attribute
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderDocumentRow = (doc: Document) => {
    const hasAnnotations = (doc.annotation_count || 0) > 0
    
    return (
      <tr key={doc.id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <p className="font-medium text-sm">{doc.title}</p>
              <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {doc.attribution_status === 'pending' && (
            <Badge variant="secondary">Pending</Badge>
          )}
          {doc.attribution_status === 'partial' && (
            <Badge variant="outline">Partial</Badge>
          )}
          {doc.attribution_status === 'complete' && (
            <Badge variant="default" className="bg-green-600">Complete</Badge>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {doc.organization?.name || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {doc.vault_associations?.length || 0}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {doc.shared_with_boardmates?.length || 0}
        </td>
        <td className="px-4 py-3">
          {hasAnnotations && (
            <Badge variant="outline" className="text-blue-600">
              {doc.annotation_count}
            </Badge>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {formatDate(doc.created_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewDocument(doc)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(doc)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAttributeDocument(doc)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Attributes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    )
  }

  if (isLoading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents yet</h3>
        <p className="text-gray-500">
          Upload your first document to get started
        </p>
      </div>
    )
  }

  return (
    <>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map(renderDocumentCard)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vaults
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shared
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Annotations
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map(renderDocumentRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* Attribute Dialog */}
      <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Document Attributes</DialogTitle>
            <DialogDescription>
              Associate this document with an organization, vaults, and BoardMates
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <DocumentAttributor
              document={selectedDocument}
              onComplete={() => {
                setAttributeDialogOpen(false)
                onDocumentUpdate?.()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Viewer Dialog for PDFs with Annotations */}
      <Dialog open={viewerDialogOpen} onOpenChange={setViewerDialogOpen}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          {selectedDocument && selectedDocument.file_type === 'application/pdf' && (
            <PDFViewerWithAnnotations
              assetId={selectedDocument.id}
              filePath={selectedDocument.file_path || ''}
              className="h-full"
            />
          )}
          {selectedDocument && selectedDocument.file_type !== 'application/pdf' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Document Preview</h3>
                <p className="text-gray-500 mb-4">
                  Preview is available for PDF documents only
                </p>
                <Button onClick={() => handleDownload(selectedDocument)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}