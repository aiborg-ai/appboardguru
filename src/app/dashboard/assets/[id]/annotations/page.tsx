'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PDFAnnotationViewer from '@/features/assets/annotations/PDFAnnotationViewer';
import AnnotationComments from '@/features/assets/annotations/AnnotationComments';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Skeleton } from '@/features/shared/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  FileText,
  Share2,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAnnotationSync } from '@/hooks/useAnnotationSync';
import { useToast } from '@/features/shared/ui/use-toast';
import Link from 'next/link';

interface Asset {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  vault_id: string;
  organization_id: string;
  owner_id: string;
  created_at: string;
  vault: {
    id: string;
    name: string;
    organization_id: string;
  };
}

interface AnnotationData {
  id: string;
  selected_text?: string;
  comment_text?: string;
  color: string;
  page_number: number;
  created_by: string;
  created_at: string;
  is_resolved: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies: any[];
  replies_count: number;
}

export default function AssetAnnotationsPage() {
  const params = useParams();
  const { toast } = useToast();
  const assetId = params.id as string;

  // State
  const [asset, setAsset] = useState<Asset | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Real-time sync
  const { isConnected, activeUsers, syncAnnotations } = useAnnotationSync({
    assetId,
    organizationId: asset?.organization_id || '',
    currentUserId,
    onAnnotationChange: (annotation, action) => {
      if (action === 'created') {
        setAnnotations(prev => [...prev, annotation as any]);
      } else if (action === 'updated') {
        setAnnotations(prev => 
          prev.map(a => a.id === annotation.id ? annotation as any : a)
        );
      } else if (action === 'deleted') {
        setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
      }
    },
    onReplyChange: (reply, action) => {
      if (action === 'created') {
        setAnnotations(prev => 
          prev.map(annotation => 
            annotation.id === reply.annotation_id
              ? { 
                  ...annotation, 
                  replies: [...annotation.replies, reply],
                  replies_count: annotation.replies_count + 1
                }
              : annotation
          )
        );
      }
    },
  });

  // Load asset data
  useEffect(() => {
    const loadAsset = async () => {
      try {
        setLoading(true);

        // Load asset details
        const assetResponse = await fetch(`/api/assets/${assetId}`);
        if (!assetResponse.ok) {
          throw new Error('Failed to load asset');
        }

        const assetData = await assetResponse.json();
        setAsset(assetData.asset);
        
        // Generate PDF URL (assuming Supabase storage)
        const pdfUrl = `/api/assets/${assetId}/download`;
        setPdfUrl(pdfUrl);

        // Load annotations
        const annotationsResponse = await fetch(`/api/assets/${assetId}/annotations`);
        if (!annotationsResponse.ok) {
          throw new Error('Failed to load annotations');
        }

        const annotationsData = await annotationsResponse.json();
        setAnnotations(annotationsData.annotations || []);

        // Get current user (this would come from auth context in real app)
        setCurrentUserId('current-user-id'); // Placeholder

      } catch (error) {
        console.error('Error loading asset:', error);
        toast({
          title: 'Error',
          description: 'Failed to load asset',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      loadAsset();
    }
  }, [assetId, toast]);

  // Handle annotation creation
  const handleAnnotationCreate = (annotation: AnnotationData) => {
    setAnnotations(prev => [...prev, annotation]);
  };

  // Handle annotation updates
  const handleAnnotationUpdate = (annotation: AnnotationData) => {
    setAnnotations(prev => 
      prev.map(a => a.id === annotation.id ? annotation : a)
    );
    
    if (selectedAnnotation?.id === annotation.id) {
      setSelectedAnnotation(annotation);
    }
  };

  // Handle annotation deletion
  const handleAnnotationDelete = (annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    
    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Asset Not Found</h1>
          <p className="text-gray-600 mb-4">The requested asset could not be found.</p>
          <Link href="/dashboard/assets">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/vaults/${asset.vault_id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vault
            </Button>
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{asset.file_name}</span>
              <Badge variant="secondary">{asset.file_type.toUpperCase()}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Active users */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user, index) => (
                  <Avatar key={user.user_id} className="w-6 h-6 border-2 border-white">
                    <AvatarFallback className="text-xs">
                      {user.user_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 3 && (
                  <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      +{activeUsers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer */}
        <div className="lg:col-span-2">
          <Card className="h-[800px]">
            <CardContent className="p-0 h-full">
              {asset.file_type === 'pdf' ? (
                <PDFAnnotationViewer
                  pdfUrl={pdfUrl}
                  assetId={assetId}
                  vaultId={asset.vault_id}
                  organizationId={asset.organization_id}
                  currentUserId={currentUserId}
                  onAnnotationCreate={handleAnnotationCreate}
                  onAnnotationUpdate={handleAnnotationUpdate}
                  onAnnotationDelete={handleAnnotationDelete}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>PDF annotation is only available for PDF files</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Annotations Panel */}
        <div className="space-y-4">
          {/* Annotations summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Annotations ({annotations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total annotations:</span>
                  <span className="font-medium">{annotations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolved:</span>
                  <span className="font-medium">
                    {annotations.filter(a => a.is_resolved).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active discussions:</span>
                  <span className="font-medium">
                    {annotations.filter(a => !a.is_resolved && a.replies_count > 0).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Annotations list */}
          {annotations.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {annotations
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((annotation) => (
                  <AnnotationComments
                    key={annotation.id}
                    annotation={annotation}
                    currentUserId={currentUserId}
                    assetId={assetId}
                    onAnnotationUpdate={handleAnnotationUpdate}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No annotations yet</p>
                <p className="text-sm">
                  {asset.file_type === 'pdf' 
                    ? 'Select text in the PDF to add your first annotation'
                    : 'Annotations are only available for PDF files'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}