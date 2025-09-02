'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Highlighter,
  MessageSquare,
  Plus,
  FileText,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AnnotationBubble from './AnnotationBubble';
import { groupAnnotationsByPosition } from '@/utils/annotationGrouping';

interface Annotation {
  id: string;
  page_number: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: {
    text?: string;
  };
  comment_text?: string;
  selected_text?: string;
  color: string;
  opacity: number;
  created_by: string;
  created_at: string;
  is_resolved: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: any[];
}

interface DocumentPanelProps {
  assetId: string;
  assetUrl: string;
  annotations: Annotation[];
  selectedAnnotation: string | null;
  showIndicators: boolean;
  currentUserId: string;
  onAnnotationClick: (annotationId: string | null) => void;
  onAnnotationCreate: (annotation: any) => void;
}

export default function DocumentPanel({
  assetId,
  assetUrl,
  annotations,
  selectedAnnotation,
  showIndicators,
  currentUserId,
  onAnnotationClick,
  onAnnotationCreate
}: DocumentPanelProps) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [selectionRect, setSelectionRect] = useState<any>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const documentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter annotations for current page
  const pageAnnotations = annotations.filter(a => a.page_number === currentPage);
  
  // Group overlapping annotations
  const annotationGroups = groupAnnotationsByPosition(pageAnnotations);

  // Load PDF (placeholder for now)
  useEffect(() => {
    // In a real implementation, this would load the PDF using PDF.js
    setTotalPages(10); // Mock total pages
  }, [assetUrl]);

  // Handle text selection for creating annotations
  const handleMouseUp = useCallback(() => {
    if (!isCreatingAnnotation) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = documentRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    const position = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height
    };
    
    setSelectionRect({
      position,
      text: selection.toString(),
      range
    });
  }, [isCreatingAnnotation]);

  // Create new annotation
  const createAnnotation = useCallback((comment: string, color: string = '#FFFF00') => {
    if (!selectionRect) return;
    
    const newAnnotation = {
      asset_id: assetId,
      page_number: currentPage,
      position: selectionRect.position,
      selected_text: selectionRect.text,
      comment_text: comment,
      color,
      opacity: 0.3,
      annotation_type: 'highlight',
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      is_resolved: false,
      user: {
        id: currentUserId,
        full_name: 'Current User' // This would come from auth context
      }
    };
    
    onAnnotationCreate(newAnnotation);
    setIsCreatingAnnotation(false);
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionRect, assetId, currentPage, currentUserId, onAnnotationCreate]);

  // Navigate to annotation page
  const navigateToAnnotation = useCallback((annotation: Annotation) => {
    if (annotation.page_number !== currentPage) {
      setCurrentPage(annotation.page_number);
    }
    onAnnotationClick(annotation.id);
    
    // Scroll to annotation position
    setTimeout(() => {
      const element = document.querySelector(`[data-annotation-id="${annotation.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [currentPage, onAnnotationClick]);

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 50), 200));
  }, []);

  // Render annotation overlay
  const renderAnnotationOverlay = (annotation: Annotation) => {
    const isSelected = selectedAnnotation === annotation.id;
    const isHovered = hoveredAnnotation === annotation.id;
    const isOwn = annotation.created_by === currentUserId;
    
    return (
      <motion.div
        key={annotation.id}
        data-annotation-id={annotation.id}
        className={cn(
          "absolute cursor-pointer transition-all group",
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          isHovered && "ring-2 ring-blue-300"
        )}
        style={{
          left: `${annotation.position.x}px`,
          top: `${annotation.position.y}px`,
          width: `${annotation.position.width}px`,
          height: `${annotation.position.height}px`,
          backgroundColor: annotation.color,
          opacity: annotation.opacity
        }}
        onClick={() => onAnnotationClick(annotation.id)}
        onMouseEnter={() => setHoveredAnnotation(annotation.id)}
        onMouseLeave={() => setHoveredAnnotation(null)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: annotation.opacity, scale: 1 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* User indicator */}
        {showIndicators && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="w-6 h-6 rounded-full bg-white shadow-md border-2 flex items-center justify-center text-xs font-medium"
              style={{ borderColor: annotation.color }}
            >
              {annotation.user.full_name.charAt(0)}
            </div>
          </div>
        )}
        
        {/* Comment indicator */}
        {annotation.comment_text && showIndicators && (
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white rounded-full shadow-md p-1">
              <MessageSquare className="h-3 w-3 text-gray-600" />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // Render annotation groups
  const renderAnnotationGroup = (group: Annotation[]) => {
    if (group.length === 1) {
      return renderAnnotationOverlay(group[0]);
    }
    
    // For overlapping annotations, show a stacked indicator
    const mainAnnotation = group[0];
    const isSelected = group.some(a => a.id === selectedAnnotation);
    
    return (
      <motion.div
        key={`group-${mainAnnotation.id}`}
        className={cn(
          "absolute cursor-pointer",
          isSelected && "z-10"
        )}
        style={{
          left: `${mainAnnotation.position.x}px`,
          top: `${mainAnnotation.position.y}px`,
          width: `${mainAnnotation.position.width}px`,
          height: `${mainAnnotation.position.height}px`
        }}
        onClick={() => {
          // Show annotation selector for the group
          console.log('Show group selector:', group);
        }}
      >
        {/* Stacked effect */}
        {group.map((annotation, index) => (
          <div
            key={annotation.id}
            className="absolute inset-0"
            style={{
              backgroundColor: annotation.color,
              opacity: annotation.opacity / (index + 1),
              transform: `translate(${index * 2}px, ${index * 2}px)`,
              zIndex: group.length - index
            }}
          />
        ))}
        
        {/* Group indicator */}
        {showIndicators && (
          <div className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
            {group.length}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(Math.min(Math.max(1, parseInt(e.target.value) || 1), totalPages))}
              className="w-16 h-8 text-center"
              min={1}
              max={totalPages}
            />
            <span className="text-sm text-gray-500">of {totalPages}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Zoom Controls */}
          <div className="ml-4 flex items-center gap-2 border-l pl-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(-10)}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom(10)}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(100)}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-8 pl-8"
              data-annotation-search
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Create Annotation */}
          <Button
            variant={isCreatingAnnotation ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCreatingAnnotation(!isCreatingAnnotation)}
          >
            <Highlighter className="h-4 w-4 mr-1" />
            {isCreatingAnnotation ? 'Creating...' : 'Annotate'}
          </Button>
        </div>
      </div>
      
      {/* Document Viewer */}
      <div className="flex-1 overflow-auto p-8">
        <div 
          ref={documentRef}
          className="relative mx-auto bg-white shadow-xl"
          style={{
            width: `${8.5 * zoom}px`,
            minHeight: `${11 * zoom}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center'
          }}
          onMouseUp={handleMouseUp}
        >
          {/* Document Content (Placeholder) */}
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-4">Document Page {currentPage}</h1>
              <p className="text-gray-600 mb-4">
                This is a placeholder for the actual PDF content. In production, this would render the PDF using PDF.js or a similar library.
              </p>
            </div>
            
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <h2 className="text-lg font-semibold">Section {i + 1}</h2>
                  <p className="text-gray-700 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Annotation Overlays */}
          {showIndicators && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {annotationGroups.map((group) => 
                  group.length === 1 
                    ? renderAnnotationOverlay(group[0])
                    : renderAnnotationGroup(group)
                )}
              </div>
            </div>
          )}
          
          {/* Selection Overlay */}
          {isCreatingAnnotation && selectionRect && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30"
              style={{
                left: `${selectionRect.position.x}px`,
                top: `${selectionRect.position.y}px`,
                width: `${selectionRect.position.width}px`,
                height: `${selectionRect.position.height}px`
              }}
            >
              <AnnotationBubble
                position={selectionRect.position}
                onSubmit={(comment, color) => createAnnotation(comment, color)}
                onCancel={() => {
                  setSelectionRect(null);
                  window.getSelection()?.removeAllRanges();
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Page Indicator Heat Map */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="space-y-1">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              const pageAnnotationCount = annotations.filter(a => a.page_number === pageNum).length;
              const isCurrentPage = pageNum === currentPage;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-8 h-3 rounded-sm transition-all",
                    isCurrentPage && "ring-2 ring-blue-500",
                    pageAnnotationCount === 0 && "bg-gray-200",
                    pageAnnotationCount > 0 && pageAnnotationCount <= 2 && "bg-yellow-300",
                    pageAnnotationCount > 2 && pageAnnotationCount <= 5 && "bg-orange-400",
                    pageAnnotationCount > 5 && "bg-red-500"
                  )}
                  title={`Page ${pageNum} - ${pageAnnotationCount} annotations`}
                />
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {currentPage}/{totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}