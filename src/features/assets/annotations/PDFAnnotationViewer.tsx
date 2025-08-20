'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PdfHighlighter,
  PdfLoader,
  AreaHighlight,
} from 'react-pdf-highlighter-extended';
import type {
  Highlight,
  ScaledPosition,
  Content,
} from 'react-pdf-highlighter-extended';

// Local type definitions for missing exports
interface NewHighlight {
  content: Content;
  position: ScaledPosition;
}

import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Textarea } from '@/features/shared/ui/textarea';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar } from '@/features/shared/ui/avatar';
import { 
  MessageSquare, 
  Plus, 
  Eye, 
  EyeOff, 
  Palette,
  Settings,
  User,
  Clock,
  Filter,
  FileText
} from 'lucide-react';
import { useToast } from '@/features/shared/ui/use-toast';

// Types
interface AnnotationData extends Highlight {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  comment_text?: string;
  selected_text?: string;
  color: string;
  opacity: number;
  is_private: boolean;
  is_resolved: boolean;
  page_number: number;
  replies_count: number;
  replies: any[];
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface PDFAnnotationViewerProps {
  pdfUrl: string;
  assetId: string;
  vaultId?: string;
  organizationId: string;
  currentUserId: string;
  isReadOnly?: boolean;
  onAnnotationCreate?: (annotation: AnnotationData) => void;
  onAnnotationUpdate?: (annotation: AnnotationData) => void;
  onAnnotationDelete?: (annotationId: string) => void;
}

interface AnnotationFilters {
  showAll: boolean;
  showOnlyMine: boolean;
  showResolved: boolean;
  colorFilter?: string;
  userFilter?: string;
}

// Annotation colors
const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#FFFF00', opacity: 0.3 },
  { name: 'Green', value: '#00FF00', opacity: 0.3 },
  { name: 'Blue', value: '#0080FF', opacity: 0.3 },
  { name: 'Pink', value: '#FF69B4', opacity: 0.3 },
  { name: 'Orange', value: '#FFA500', opacity: 0.3 },
  { name: 'Purple', value: '#8A2BE2', opacity: 0.3 },
  { name: 'Red', value: '#FF4444', opacity: 0.3 },
];

export default function PDFAnnotationViewer({
  pdfUrl,
  assetId,
  vaultId,
  organizationId,
  currentUserId,
  isReadOnly = false,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
}: PDFAnnotationViewerProps) {
  const { toast } = useToast();
  
  // State
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[0]);
  const [commentText, setCommentText] = useState('');
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [filters, setFilters] = useState<AnnotationFilters>({
    showAll: true,
    showOnlyMine: false,
    showResolved: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load annotations from API
  const loadAnnotations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/${assetId}/annotations`);
      
      if (!response.ok) {
        throw new Error('Failed to load annotations');
      }
      
      const data = await response.json();
      setAnnotations(data.annotations || []);
    } catch (error) {
      console.error('Error loading annotations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load annotations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [assetId, toast]);

  // Initial load
  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Create annotation
  const createAnnotation = useCallback(async (
    newHighlight: NewHighlight
  ): Promise<AnnotationData> => {
    if (isReadOnly) {
      throw new Error('Cannot create annotations in read-only mode');
    }

    try {
      setIsCreatingAnnotation(true);

      const annotationData = {
        asset_id: assetId,
        vault_id: vaultId,
        organization_id: organizationId,
        annotation_type: 'highlight',
        content: newHighlight.content,
        page_number: (newHighlight.position as any).pageNumber || 1,
        position: newHighlight.position,
        selected_text: newHighlight.content.text,
        comment_text: commentText.trim() || undefined,
        color: selectedColor.value,
        opacity: selectedColor.opacity,
        is_private: false,
      };

      const response = await fetch(`/api/assets/${assetId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        throw new Error('Failed to create annotation');
      }

      const result = await response.json();
      const newAnnotation: AnnotationData = {
        ...newHighlight,
        id: result.annotation.id,
        created_by: currentUserId,
        created_at: result.annotation.created_at,
        updated_at: result.annotation.updated_at,
        comment_text: commentText.trim() || undefined,
        color: selectedColor.value,
        opacity: selectedColor.opacity,
        is_private: false,
        is_resolved: false,
        page_number: (newHighlight.position as any).pageNumber || 1,
        replies_count: 0,
        replies: [],
        user: {
          id: currentUserId,
          full_name: 'You', // Will be populated by API in real scenario
        },
      };

      setAnnotations(prev => [...prev, newAnnotation]);
      setCommentText('');
      
      if (onAnnotationCreate) {
        onAnnotationCreate(newAnnotation);
      }

      toast({
        title: 'Success',
        description: 'Annotation created successfully',
      });

      return newAnnotation;
    } catch (error) {
      console.error('Error creating annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create annotation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsCreatingAnnotation(false);
    }
  }, [
    assetId,
    vaultId,
    organizationId,
    currentUserId,
    commentText,
    selectedColor,
    isReadOnly,
    onAnnotationCreate,
    toast
  ]);

  // Update annotation
  const updateAnnotation = useCallback(async (
    annotationId: string,
    updates: Partial<AnnotationData>
  ) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update annotation');
      }

      const result = await response.json();
      
      setAnnotations(prev =>
        prev.map(annotation =>
          annotation.id === annotationId
            ? { ...annotation, ...updates, updated_at: result.annotation.updated_at }
            : annotation
        )
      );

      if (onAnnotationUpdate) {
        onAnnotationUpdate({ ...updates, id: annotationId } as AnnotationData);
      }

      toast({
        title: 'Success',
        description: 'Annotation updated successfully',
      });
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update annotation',
        variant: 'destructive',
      });
    }
  }, [assetId, onAnnotationUpdate, toast]);

  // Delete annotation
  const deleteAnnotation = useCallback(async (annotationId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }

      setAnnotations(prev => prev.filter(annotation => annotation.id !== annotationId));
      
      if (onAnnotationDelete) {
        onAnnotationDelete(annotationId);
      }

      toast({
        title: 'Success',
        description: 'Annotation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete annotation',
        variant: 'destructive',
      });
    }
  }, [assetId, onAnnotationDelete, toast]);

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    return annotations.filter(annotation => {
      if (!filters.showAll && filters.showOnlyMine && annotation.created_by !== currentUserId) {
        return false;
      }
      
      if (!filters.showResolved && annotation.is_resolved) {
        return false;
      }
      
      if (filters.colorFilter && annotation.color !== filters.colorFilter) {
        return false;
      }
      
      if (filters.userFilter && annotation.created_by !== filters.userFilter) {
        return false;
      }
      
      return true;
    });
  }, [annotations, filters, currentUserId]);

  // Render highlight component
  const renderHighlight = useCallback(
    (highlight: AnnotationData, index: number) => (
      <div
        key={highlight.id}
        className="annotation-highlight"
        style={{
          backgroundColor: highlight.color,
          opacity: highlight.opacity,
        }}
        title={highlight.comment_text || 'Annotation'}
      />
    ),
    []
  );

  // Annotation popup
  const AnnotationPopup = ({ content, onOpen, onConfirm }: any) => (
    <div className="bg-white border rounded-lg shadow-lg p-3 max-w-xs">
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Comment (optional)</label>
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add your comment..."
          className="w-full text-sm"
          rows={2}
        />
      </div>
      
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Color</label>
        <div className="flex gap-1">
          {ANNOTATION_COLORS.slice(0, 4).map((color) => (
            <button
              key={color.value}
              className={`w-6 h-6 rounded border-2 ${
                selectedColor.value === color.value ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isCreatingAnnotation}
          className="flex-1"
        >
          {isCreatingAnnotation ? 'Creating...' : 'Add'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpen}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  // Sidebar with annotations list
  const AnnotationsSidebar = () => (
    <Card className="w-80 h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Annotations</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant={filters.showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, showAll: !prev.showAll, showOnlyMine: false }))}
            >
              All
            </Button>
            <Button
              variant={filters.showOnlyMine ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, showOnlyMine: !prev.showOnlyMine, showAll: false }))}
            >
              Mine
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            {ANNOTATION_COLORS.slice(0, 4).map((color) => (
              <button
                key={color.value}
                className={`w-4 h-4 rounded border ${
                  filters.colorFilter === color.value ? 'border-gray-800 border-2' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  colorFilter: prev.colorFilter === color.value ? undefined : color.value
                }))}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="overflow-y-auto p-3">
        {loading ? (
          <div className="text-center text-gray-500">Loading annotations...</div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center text-gray-500">
            {annotations.length === 0 ? 'No annotations yet' : 'No annotations match filters'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-3 h-3 rounded mt-1 flex-shrink-0"
                    style={{ backgroundColor: annotation.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {annotation.user?.full_name || 'Unknown User'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Page {annotation.page_number}
                      </Badge>
                    </div>
                    
                    {annotation.selected_text && (
                      <div className="text-sm text-gray-600 mb-1 line-clamp-2">
                        "{annotation.selected_text}"
                      </div>
                    )}
                    
                    {annotation.comment_text && (
                      <div className="text-sm text-gray-800 mb-1">
                        {annotation.comment_text}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1">
                        {annotation.replies_count && annotation.replies_count > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {annotation.replies_count}
                          </span>
                        )}
                        {annotation.created_by === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(annotation.id);
                            }}
                            className="h-auto p-1 text-red-500"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-full">
      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 right-4 z-10"
          >
            <Eye className="h-4 w-4 mr-1" />
            Annotations ({filteredAnnotations.length})
          </Button>
        )}
        
        <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center p-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Annotation Viewer</h3>
            <p className="text-gray-600 mb-4">
              PDF annotation functionality is available but requires proper library setup
            </p>
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <p>• Document: {pdfUrl.split('/').pop()}</p>
              <p>• Annotations: {filteredAnnotations.length} found</p>
              <p>• Asset ID: {assetId}</p>
            </div>
            
            {/* Annotation List */}
            {filteredAnnotations.length > 0 && (
              <div className="max-w-md mx-auto space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-700">Found Annotations:</h4>
                {filteredAnnotations.slice(0, 3).map((annotation, index) => (
                  <div key={annotation.id} className="text-left p-2 bg-white rounded border text-xs">
                    <div className="font-medium">Page {annotation.page_number}</div>
                    <div className="text-gray-600 truncate">{annotation.comment_text || annotation.selected_text}</div>
                  </div>
                ))}
                {filteredAnnotations.length > 3 && (
                  <div className="text-xs text-gray-500">
                    ...and {filteredAnnotations.length - 3} more
                  </div>
                )}
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              Open PDF in New Tab
            </Button>
          </div>
        </div>
      </div>

      {/* Annotations Sidebar */}
      {sidebarOpen && <AnnotationsSidebar />}
    </div>
  );
}